/**
 * The content checker: one walk over a game's content that resolves
 * everything it names, runs each feature's own checks, and lists the files it
 * names. `loadGame` runs it on the game it merges; a hand-built game calls
 * `checkGame` itself.
 */
import { amountProblems, amountReferences } from './amount.ts'
import { commandOf, customCall, customValue, hasCustomEffect, customCondition, shortFormProblem, type CommandRef, type EffectRef } from './custom.ts'
import type { Game } from './game.ts'
import { argReferences, callShape } from './pluginCalls.ts'
import { absentPartner, missingCall, pluginOf, pluginCommand, pluginName, pluginsOf, type CallTable, type Plugin } from './plugin.ts'
import { commandReferences, conditionReferences, effectReferences, type Reference } from './references.ts'
import { wordClashes } from './words.ts'
import { artSrc } from './sceneBody.ts'
import { stringOf } from './strings.ts'
import { carryChecks, featureChecks, markupChecks, probeChecks, resolverSteps, type FeatureList } from './features/registry.ts'
import type { FeatureCheckTools, ResolveTools } from './features/feature.ts'
import { COMMAND_TYPES, conditionKeys, effectKeys, featureContext } from './core.ts'
import type { Condition, GameState } from './types.ts'

/** Something wrong with a game's content: the pack it came from (`game` for a hand-built game), where, and what. */
export type Problem = {
  pack: string
  where: string
  what: string
}

/** A file the game names, as the page asks for it (after `artSrc` or `audioSrc`), with where it is named. */
export type FileRef = { path: string; type: 'picture' | 'video' | 'audio'; where: string }

/** A state to render every scene against, named for the problems it finds. */
export type Probe = { name: string; state: GameState }

/** What `checkGame` finds. */
export type Checked = {
  problems: Problem[]
  /** What may go wrong in play but isn't a problem, such as a token that may be unset with no fallback. A warning fails no check. */
  warnings: Problem[]
  files: FileRef[]
}

/**
 * What a problem is about, for `loadGame` to name the pack it came from.
 * Undefined is the game itself.
 */
export type Source = { list: CoreList; id: string } | { list: FeatureList; id?: string } | { plugin: string; list: string; id: string } | undefined

/** The lists the core keeps itself. The features' lists are their own (`FeatureList`). */
export type CoreList = 'prose'

/** A problem as a line: `pack · where · what`. */
export function describeProblem(problem: Problem): string {
  return `${problem.pack} · ${problem.where} · ${problem.what}`
}

/**
 * Everything wrong with a game's content, and every file it names. Runs on
 * any `Game`, hand-built or loaded. Give `probes` to also render every scene
 * against each state, so a scene that throws for one (through the game's own
 * conditions or values) is reported. A hand-built game's problems name the
 * pack `game`.
 */
export function checkGame(game: Game, options: { probes?: readonly Probe[] } = {}): Checked {
  return checkContent(game, options.probes ?? [], () => 'game')
}

/**
 * What is wrong with a condition's shape: it needs exactly one kind key. One
 * with none, or several, holds nowhere, since the engine wouldn't know which
 * to ask.
 */
function shapeProblems(condition: Condition): string[] {
  const short = shortFormProblem(condition)
  if (short) return [short]
  const kinds = conditionKeys(condition)
  if (kinds.length === 1) return []
  const keys = Object.keys(condition)
  if (!kinds.length && customCall(condition)) return []
  if (!kinds.length && typeof (condition as { custom?: unknown }).custom === 'string') return [oldCustom((condition as { custom: string }).custom)]
  if (!kinds.length)
    return [
      `a condition needs one key that says what it asks, such as kv or stat, or a call by name; this one has ${keys.length ? `only ${keys.map((key) => `"${key}"`).join(', ')}` : 'nothing in it'}`,
    ]
  return [`a condition asks one thing, but this one has ${kinds.length} keys that each say what it asks: ${kinds.join(', ')}`]
}

/** How a call written `{ custom: name }`, as content did before schema 18, is written now. */
function oldCustom(name: string): string {
  const full = name.includes('/') ? name : `game/${name}`
  return `{ custom: "${name}" } is written in short now, as { "${full}": { … } }, or true for no arguments`
}

/**
 * What is wrong with an effect's shape: it needs exactly one key that says
 * what it does (`stat`, `kv`, `scene`…), or to be a call in short. One with
 * none does nothing, and one with several does nothing either, since the
 * engine wouldn't know which to do.
 */
function keyProblem(effect: EffectRef): string[] {
  const short = shortFormProblem(effect)
  if (short) return [short]
  const raw = effect as Record<string, unknown>
  if (typeof raw.custom === 'string') return [oldCustom(raw.custom)]
  // No effect has a `kind` field, so one is the old form, even where the rest happens to read.
  if (typeof raw.kind === 'string') return [`effects are told apart by their key now, as { ${raw.kind}: … }, not { kind: "${raw.kind}" }`]
  const keys = effectKeys(effect)
  if (keys.length === 1) return []
  if (keys.length > 1) return [`an effect does one thing, but this one has ${keys.length} keys that each say what it does: ${keys.join(', ')}`]
  if (customCall(effect)) return []
  const given = Object.keys(raw)
  return [
    `an effect needs one key that says what it does, such as stat or kv, or a call by name; this one has ${given.length ? `only ${given.map((key) => `"${key}"`).join(', ')}` : 'nothing in it'}`,
  ]
}

/** What is wrong with a command's type: one the engine doesn't have is refused. A plugin's short form is read as `custom`. */
function typeProblem(ref: CommandRef): string[] {
  const short = shortFormProblem(ref)
  if (short) return [short]
  const command = commandOf(ref)
  if (typeof command.type !== 'string') return ['a command needs a type, or a plugin command in short']
  return (COMMAND_TYPES as string[]).includes(command.type) ? [] : [`unknown command type "${String(command.type)}"`]
}

/** A page path as written (`art/photo/ava.svg`), or null for a URL or nothing. */
function pagePath(path: string): string | null {
  if (!path.trim() || /^(?:[a-z]+:|\/\/)/i.test(path)) return null
  return path.replace(/^\.?\//, '')
}

/** The content checker, with how to name the pack a problem came from. `loadGame` passes its own. */
export function checkContent(game: Game, probes: readonly Probe[], packOf: (source: Source) => string): Checked {
  const problems: Problem[] = []
  const files: FileRef[] = []
  const fileSeen = new Set<string>()
  const say = (source: Source, where: string, what: string) => problems.push({ pack: packOf(source), where, what })
  const file = (where: string, type: FileRef['type'], path: string | null) => {
    if (!path) return
    const key = `${type} ${path} ${where}`
    if (fileSeen.has(key)) return
    fileSeen.add(key)
    files.push({ path, type, where })
  }

  const plugins = game.plugins ?? []
  /** Every prose key something names, with what named it first, for the markup scan. */
  const proseNamed = new Set<string>()

  // Resolving references.

  const resolve = (refs: readonly Reference[], where: string): string[] => refs.flatMap((ref) => one(ref, where))
  const warnings: Problem[] = []
  const warned = new Set<string>()
  const warn = (where: string, what: string) => {
    const key = `${where}\n${what}`
    if (warned.has(key)) return
    warned.add(key)
    warnings.push({ pack: packOf(undefined), where, what })
  }
  const resolveTools: ResolveTools = { resolve, file, warn }
  // The references each feature answers for, by the key that tells each apart.
  const leaves: Record<string, (ref: never, where: string) => string[]> = {}
  for (const step of resolverSteps) {
    for (const [key, leaf] of Object.entries(step.resolve(game, resolveTools) as Record<string, unknown>)) {
      if (Object.hasOwn(leaves, key)) throw new Error(`The reference "${key}" is resolved by two features.`)
      leaves[key] = leaf as (ref: never, where: string) => string[]
    }
  }

  // Prose with markup: what each feature reads in it (sounds, pools, files).
  const markup = (text: string, where: string, shownWhen?: Condition): string[] =>
    markupChecks.flatMap((check) => check(game, text, where, resolveTools, shownWhen))

  const call = (table: CallTable, name: string, args: Record<string, unknown>, where: string): string[] => {
    const known =
      table === 'conditions' ? Boolean(customCondition(game, name)) : table === 'commands' ? Boolean(pluginCommand(game, name)) : hasCustomEffect(game, name)
    if (!known) {
      // A cooperating partner the game doesn't have: content may name it, and it is simply not there.
      if (absentPartner(game, name)) return []
      return [missingCall(game, table === 'conditions' ? 'condition' : table === 'commands' ? 'command' : 'effect', name)]
    }
    const parts = pluginName(name)
    const plugin = parts && pluginOf(game, parts.plugin)
    if (!plugin || !parts) return []
    // What its declaration says of the arguments and what they name, then any rule of the plugin's own.
    const shape = callShape(plugin.calls, table, parts.name)
    return resolve([...(shape ? argReferences(shape, args, game, name) : []), ...(plugin.references?.calls?.(table, parts.name, args, game) ?? [])], where)
  }

  /**
   * Words written in place that are a prose key the game has, as content
   * wrote them before schema 25, and a choice with no label whose old prose
   * key has words: how to write them now.
   */
  const oldWords = (words: string | undefined, field: string, oldKey: string | undefined): string[] => {
    if (words === undefined)
      return oldKey !== undefined && game.prose?.line(oldKey) !== undefined
        ? [`no ${field}: its words are no longer read from the prose "${oldKey}" (schema 25), so give it ${field}: "${game.prose.line(oldKey)}"`]
        : []
    if (/\s/.test(words) || game.prose?.line(words) === undefined) return []
    if (field === 'block')
      return [
        `{ text: "${words}" } names the prose "${words}", but a { text } block is words written in place now (schema 25): write the words, or { prose: "${words}" } to read that prose`,
      ]
    return [`${field} "${words}" names the prose "${words}", but a ${field} is words written in place now (schema 25): write the words`]
  }

  const one = (ref: Reference, where: string): string[] => {
    if ('within' in ref) {
      return resolve(ref.refs, where).map((what) => (ref.within.startsWith('in each ') && what.startsWith('in each ') ? what : `${ref.within}: ${what}`))
    }
    if ('amount' in ref) return [...amountProblems(ref.amount), ...resolve(amountReferences(ref.amount), where)]
    if ('when' in ref) return ref.when ? [...shapeProblems(ref.when), ...resolve(conditionReferences(ref.when), where)] : []
    if ('effects' in ref) return [...(ref.effects ?? []).flatMap(keyProblem), ...resolve((ref.effects ?? []).flatMap(effectReferences), where)]
    if ('command' in ref) return ref.command ? [...typeProblem(ref.command), ...resolve(commandReferences(ref.command), where)] : []
    if ('markup' in ref) return markup(ref.markup, where, ref.shownWhen)
    if ('call' in ref) return call(ref.call, ref.name, ref.with ?? {}, where)
    if ('entry' in ref) {
      if (!pluginOf(game, ref.plugin)) return []
      const have = game.data?.[ref.plugin]?.[ref.list] ?? []
      return have.some((entry) => entry.id === ref.entry) ? [] : [`unknown ${ref.noun} "${ref.entry}"`]
    }
    if ('words' in ref) return oldWords(ref.words, ref.field, ref.oldKey)
    if ('outdated' in ref) return [ref.outdated]
    if ('problem' in ref) return [ref.problem]
    if ('prose' in ref) {
      proseNamed.add(ref.prose)
      return game.prose?.line(ref.prose) === undefined ? [`no prose for "${ref.prose}"`] : []
    }
    if ('variants' in ref) {
      const members = game.prose?.variants(ref.variants) ?? []
      for (const key of members) proseNamed.add(key)
      return members.length ? [] : [`variants "${ref.variants}" has no lines`]
    }
    if ('value' in ref) return customValue(game, ref.value) ? [] : [missingCall(game, 'value', ref.value)]
    if ('reason' in ref) {
      const key = typeof ref.reason === 'object' && ref.reason !== null ? ref.reason.string : undefined
      return key === undefined || stringOf(game, key) !== key ? [] : [`no string named "${key}"`]
    }
    if ('picture' in ref) {
      file(where, 'picture', pagePath(artSrc(ref.picture)))
      return []
    }
    if ('video' in ref) {
      file(where, 'video', pagePath(artSrc(ref.video, 'video')))
      return []
    }
    // A feature's: the first key of the reference that a feature resolves.
    for (const key of Object.keys(ref)) if (Object.hasOwn(leaves, key)) return leaves[key](ref as never, where)
    return []
  }

  /** Report everything these references name that the game doesn't have, at `where`. */
  const check = (source: Source, where: string, refs: readonly Reference[]) => {
    for (const what of resolve(refs, where)) say(source, where, what)
  }

  // The game as a whole.

  const pluginIds = new Set<string>()
  for (const plugin of plugins) {
    if (!/^[a-z0-9-]+$/i.test(plugin.id)) say(undefined, `plugin ${plugin.id}`, 'a plugin id is letters, digits and "-" only')
    // The profile's `core:` and `ui:` namespaces belong to the engine and the UI.
    if (/^(core|ui)(:|$)/i.test(plugin.id)) say(undefined, `plugin ${plugin.id}`, '"core" and "ui" are reserved for the engine and the UI')
    // Content calls the game's own code as `game/…`.
    if (plugin.id === 'game') say(undefined, `plugin ${plugin.id}`, '"game" is reserved for the game\'s own rules')
    if (pluginIds.has(plugin.id)) say(undefined, `plugin ${plugin.id}`, 'two plugins share this id')
    pluginIds.add(plugin.id)
  }
  for (const plugin of Object.keys(game.data ?? {})) {
    if (!pluginIds.has(plugin)) say(undefined, `data ${plugin}`, `the game has no plugin named "${plugin}"`)
  }
  if (game.version !== undefined && !(Number.isInteger(game.version) && game.version >= 1)) {
    say(undefined, 'version', 'version must be a whole number, 1 or more')
  }
  for (const key of Object.keys(game.rules?.migrations ?? {})) {
    const n = Number(key)
    if (!Number.isInteger(n) || n < 1 || n >= (game.version ?? 1)) {
      say(undefined, `migration ${key}`, `a step is keyed by the version it upgrades from, 1 to ${(game.version ?? 1) - 1}`)
    }
  }

  // Two of anything with one id. A loaded game can't have these: its packs are merged by id.
  const twice = (list: string, plural: string, ids: readonly string[]) => {
    const seen = new Set<string>()
    const reported = new Set<string>()
    for (const id of ids) {
      if (seen.has(id) && !reported.has(id)) {
        reported.add(id)
        say({ list, id } as Source, `${list} ${id}`, `two ${plural} share this id`)
      }
      seen.add(id)
    }
  }
  // Each feature's own checks, in the features' order: its lists, what they name, its rules.
  const tools: FeatureCheckTools = {
    problem: (source, where, what) => say(source as Source, where, what),
    check: (source, where, refs) => check(source as Source, where, refs),
    file,
    twice,
  }
  const cx = featureContext()
  for (const featureCheck of featureChecks) featureCheck(game, tools, cx)

  // What a New Game+ carries, in the order the game lists it, each key checked by the feature that carries it.
  for (const key of Object.keys(game.carryOver ?? {})) carryChecks[key as keyof typeof carryChecks]?.(game, tools)

  // Plugins, the game's own rules first: what their content names, then their own rules.
  for (const plugin of pluginsOf(game)) checkPlugin(plugin)

  function checkPlugin(plugin: Plugin) {
    // A call by name finds one function: an effect or a macro, never both.
    for (const name of Object.keys(plugin.macros ?? {})) {
      if (plugin.effects && Object.hasOwn(plugin.effects, name)) {
        say(undefined, `plugin ${plugin.id}`, `"${plugin.id}/${name}" is both an effect and a macro; give one of them another name`)
      }
    }
    for (const entry of plugin.references?.content?.(game) ?? []) {
      check({ plugin: plugin.id, list: entry.list, id: entry.id }, `${entry.list} ${entry.id}`, entry.refs)
    }
    const tools = { problems: (refs: readonly Reference[]) => resolve(refs, plugin.id) }
    for (const problem of plugin.check?.(game, tools) ?? []) {
      say({ plugin: plugin.id, list: problem.list, id: problem.id }, `${problem.list} ${problem.id}`, problem.what)
    }
  }

  // Prose: the sounds, pools and files its markup names. Every line the store lists, and every one content named.
  const proseKeys = new Set([...(game.prose?.keys?.() ?? []), ...proseNamed])
  for (const key of proseKeys) {
    const text = game.prose?.line(key)
    if (text === undefined) continue
    for (const what of markup(text, `prose ${key}`)) say({ list: 'prose', id: key }, `prose ${key}`, what)
  }

  // Two fields one words key names, with different words: a translation could give them only one.
  for (const clash of wordClashes(game)) {
    say(clash.source as Source, clash.where, `two fields with different words share the words key "${clash.key}"; give a block of words an id, or rename one`)
  }

  // Each probe state, as the features check against it: every scene rendered.
  for (const probe of probes) for (const probeCheck of probeChecks) probeCheck(game, probe, tools, cx)

  return { problems, warnings, files }
}
