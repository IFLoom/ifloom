/**
 * Phrases: words for the middle of a sentence that change with the state.
 * Content declares them in `phrases`, each a list of rows tried in order,
 * the first whose `when` holds giving the words, and nested objects are
 * groups: `{ outfit: { verdict: [...] } }` is the phrase `outfit.verdict`.
 * Prose prints one as a bare token, `{{outfit.verdict}}`, which is looked up
 * as a phrase, then the game's own value, then a kv key.
 *
 * This module also holds the token grammar `fillTokens` reads, so the
 * checker and the filler read tokens the same way.
 */
import type { Game } from '../game.ts'
import type { Condition } from '../types.ts'
import { defineFeature, type PackMerge } from './feature.ts'
import type { WordWalk } from '../words.ts'

/** One row of a phrase: its words, shown while `when` holds (always, without one). Tokens in the words are filled. */
export type PhraseRow = { when?: Condition; text: string }

/**
 * A phrase that takes arguments: their names in `args`, and its rows. In a
 * row's `when`, a string that is exactly `$<arg>` becomes what the token
 * passed, as an entity reference when it names one; in its `text`, `$<arg>`
 * becomes that entity's name, or the value as passed.
 */
export type PhraseWithArgs = { args: string[]; rows: PhraseRow[] }

/** A phrase as content writes it: its rows, tried in order, a plain string (a phrase with one row), or rows with the arguments they take. */
export type Phrase = string | PhraseRow[] | PhraseWithArgs

/**
 * Phrases as content writes them, by name: a phrase, or a group of more by
 * name, as deep as you like. `{ outfit: { verdict: [...] }, weather: 'grey' }`
 * declares `outfit.verdict` and `weather`.
 */
export type Phrases = { [name: string]: Phrase | Phrases }

/** What the phrases feature adds, as types. */
export type PhrasesShape = {
  game: {
    /** The game's phrases, by their full dotted name (`outfit.verdict`), each as its rows, or its rows with the arguments it takes. None if left out. */
    phrases?: Record<string, PhraseRow[] | PhraseWithArgs>
  }
  pack: {
    /**
     * Words for mid-sentence that change with the state, printed as
     * `{{name}}`: each phrase a list of `{ when?, text }` rows tried in
     * order (or a plain string), and a nested object a group, named with a
     * `.`. A later pack's phrase replaces an earlier one's by its full name,
     * and a pack can add phrases to a group.
     */
    phrases?: Phrases
  }
  lists: 'phrase'
}

/**
 * A token in a line of prose: `{{name}}`, `{{plugin/name}}`, `{{kv:key …}}` or
 * `{{v:plugin/name …}}`, with any arguments as `key=value` after the name,
 * and after a `|`, the words shown while it is unset: `{{name|Your flatmate}}`.
 * The first group is the `kv` or `v` in front, the second the name, the third
 * the arguments, the fourth the fallback.
 */
export const TOKEN = /\{\{(?:(kv|v):)?([A-Za-z0-9_][A-Za-z0-9_.:/-]*)((?:\s+[A-Za-z_][A-Za-z0-9_]*=[^\s}|]+)*)\s*(?:\|([^}]*))?\}\}/g

/** A name of the game's own, as a bare token prints it: a phrase, a value or a kv key, with `.` between groups and no `/`. */
export const BARE_NAME = /^[A-Za-z_][A-Za-z0-9_-]*(?:\.[A-Za-z0-9_-]+)*$/
/** A plugin's value, as a bare token prints it: the plugin's id, a `/` and the value's name. */
export const PLUGIN_NAME = /^[A-Za-z0-9-]+\/[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/
/** A key, as a `{{kv:…}}` token prints it. */
export const KV_NAME = /^[A-Za-z_][A-Za-z0-9_.:-]*$/
/** A value, as an older `{{v:…}}` token prints it: the plugin's id (or `game`), a `/` and the name. */
export const V_NAME = /^(?:[A-Za-z0-9-]+\/)?[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/** Is this a phrase with arguments, `{ args, rows }`, rather than a group? Its `rows` say so. */
export const isPhraseWithArgs = (value: unknown): value is PhraseWithArgs => isRecord(value) && Array.isArray(value.rows)

const asRows = (rows: readonly unknown[]): PhraseRow[] => rows.map((row) => (typeof row === 'string' ? { text: row } : row)) as PhraseRow[]

/** Phrases as content writes them, flattened to full dotted names: a plain string is one row, and a phrase with arguments keeps them. */
export function flatPhrases(tree: Phrases | undefined, prefix = ''): [string, PhraseRow[] | PhraseWithArgs][] {
  const out: [string, PhraseRow[] | PhraseWithArgs][] = []
  for (const [key, value] of Object.entries(tree ?? {})) {
    const name = `${prefix}${key}`
    if (typeof value === 'string') out.push([name, [{ text: value }]])
    else if (Array.isArray(value)) out.push([name, asRows(value)])
    else if (isPhraseWithArgs(value)) out.push([name, { ...value, rows: asRows(value.rows) }])
    else if (isRecord(value)) out.push(...flatPhrases(value as Phrases, `${name}.`))
  }
  return out
}

/** The game's phrase by its full name, as written in `game.phrases`, or undefined when it has none. */
function phraseOf(game: Game | undefined, name: string): PhraseRow[] | PhraseWithArgs | undefined {
  const phrases = game?.phrases
  return phrases && Object.hasOwn(phrases, name) ? phrases[name] : undefined
}

/** The rows of the game's phrase by its full name, or undefined when it has none. */
export function phraseRows(game: Game | undefined, name: string): readonly PhraseRow[] | undefined {
  const phrase = phraseOf(game, name)
  return phrase === undefined ? undefined : isPhraseWithArgs(phrase) ? phrase.rows : phrase
}

/** The arguments the game's phrase by its full name takes: none for a phrase without `args`. */
export function phraseArgs(game: Game | undefined, name: string): readonly string[] {
  const phrase = phraseOf(game, name)
  return isPhraseWithArgs(phrase) && Array.isArray(phrase.args) ? phrase.args : []
}

/** `$` and a name that could be an argument's: a letter, then letters, digits or `_`. A price such as `$5` isn't one. */
export const ARG_USE = /\$([A-Za-z][A-Za-z0-9_]*)/g

/** Where the declared arguments are used in a row's words: `$who`, not followed by more of a name. */
export function argPattern(args: readonly string[]): RegExp | undefined {
  const names = args.filter((arg) => /^[A-Za-z][A-Za-z0-9_]*$/.test(arg))
  return names.length ? new RegExp(`\\$(${names.join('|')})(?![A-Za-z0-9_])`, 'g') : undefined
}

/**
 * A condition with each string that is exactly `$<arg>` put back as `to`
 * says: the argument's value, as the token passed it or the entity it names.
 * Strings that aren't one, `'$'` included, are left as written.
 */
export function bindArgs<T>(value: T, args: readonly string[], to: (arg: string) => unknown): T {
  if (!args.length) return value
  const names = new Set(args)
  const walk = (node: unknown): unknown => {
    if (typeof node === 'string') return node.startsWith('$') && names.has(node.slice(1)) ? to(node.slice(1)) : node
    if (Array.isArray(node)) return node.map(walk)
    if (!isRecord(node)) return node
    return Object.fromEntries(Object.entries(node).map(([key, inner]) => [key, walk(inner)]))
  }
  return walk(value) as T
}

/** Does the game have a value of its own, in `rules.values`, by this name? */
function hasGameValue(game: Game, name: string): boolean {
  const values = game.rules?.values
  return Boolean(values && Object.hasOwn(values, name))
}

/** Does a plugin, or the game, have the value `plugin/name`? */
function hasValue(game: Game, full: string): boolean {
  const at = full.indexOf('/')
  const plugin = full.slice(0, at)
  const name = full.slice(at + 1)
  if (plugin === 'game') return hasGameValue(game, name) || phraseRows(game, name) !== undefined
  const values = game.plugins?.find((entry) => entry.id === plugin)?.values
  return Boolean(values && Object.hasOwn(values, name))
}

/** The kv keys the game's content ever starts or sets, by game: what a bare token can be known to read. */
const knownKeys = new WeakMap<Game, Set<string>>()

/**
 * Every kv key of the player's that content starts (`kv`, `resets`), an input
 * writes, or an effect sets (`{ kv }` with no `of`, and a roll's key), as far
 * as a walk of the content can see. Keys set only by code aren't seen.
 */
function keysOf(game: Game): Set<string> {
  const known = knownKeys.get(game)
  if (known) return known
  const keys = new Set<string>([...Object.keys(game.kv ?? {}), ...Object.keys(game.resets ?? {})])
  for (const input of game.inputs ?? []) if (typeof input.key === 'string') keys.add(input.key)
  const seen = new WeakSet<object>()
  const walk = (value: unknown): void => {
    if (typeof value !== 'object' || value === null || seen.has(value)) return
    seen.add(value)
    if (Array.isArray(value)) {
      for (const inner of value) walk(inner)
      return
    }
    const record = value as Record<string, unknown>
    const whose = record.of
    if (typeof record.kv === 'string' && ('to' in record || 'by' in record || 'random' in record) && (whose === undefined || whose === 'player'))
      keys.add(record.kv)
    if (typeof record.roll === 'string' && 'dice' in record) keys.add(record.roll)
    // A minigame's final state copies its keys to the player's.
    if (isRecord(record.copy)) for (const key of Object.values(record.copy)) if (typeof key === 'string') keys.add(key)
    for (const inner of Object.values(record)) walk(inner)
  }
  for (const [key, value] of Object.entries(game)) if (key !== 'plugins' && key !== 'rules' && key !== 'prose') walk(value)
  knownKeys.set(game, keys)
  return keys
}

/** Does a condition a line shows under read this key of the player's, as a `kv` or `roll` condition, so the line shows only once it is set? */
function guards(condition: unknown, key: string): boolean {
  if (typeof condition !== 'object' || condition === null) return false
  if (Array.isArray(condition)) return condition.some((inner) => guards(inner, key))
  const record = condition as Record<string, unknown>
  if ('not' in record) return false
  if ((record.kv === key && (record.of === undefined || record.of === 'player')) || record.roll === key) return true
  return guards(record.all, key)
}

/** Can a phrase print nothing: has it no row without a `when`? */
const canBeEmpty = (rows: readonly PhraseRow[]) => !rows.some((row) => row.when === undefined)

/**
 * What is wrong with the tokens in one line of prose, and a warning, through
 * `warn`, for a bare token with no fallback that may print nothing: a phrase
 * with no otherwise row, or a kv key the game doesn't start.
 */
function tokenProblems(game: Game, text: string, warn?: (what: string) => void, shownWhen?: Condition): string[] {
  if (!text.includes('{{')) return []
  const out: string[] = []
  for (const match of text.matchAll(TOKEN)) {
    const [written, prefix, name, args, fallback] = match
    const phrase = prefix !== 'kv' ? phraseNamed(game, prefix === undefined || name.startsWith(`${GAME}/`) ? name : '') : undefined
    if (phrase !== undefined) {
      const wrong = argProblem(game, phrase, args)
      if (wrong) out.push(wrong)
    }
    if (prefix === undefined && fallback === undefined && BARE_NAME.test(name) && warn) {
      const rows = phraseRows(game, name)
      // A name with groups that nothing sets is a problem below, not a warning.
      const unknown = !rows && !hasGameValue(game, name) && name.includes('.') && !keysOf(game).has(name)
      if (!unknown && !guards(shownWhen, name) && (rows ? canBeEmpty(rows) : !hasGameValue(game, name) && !Object.hasOwn(game.kv ?? {}, name)))
        warn(`${written} may be unset, and then prints nothing; give it words to show until then, as {{${name}|…}}`)
    }
    if (prefix === 'kv') continue
    if (prefix === 'v') {
      if (!V_NAME.test(name) || !name.includes('/')) continue
      const short = name.startsWith('game/') ? name.slice('game/'.length) : name
      if (BARE_NAME.test(short) || PLUGIN_NAME.test(short))
        out.push(`${written} is written ${written.replace(`v:${name}`, short)} now: a bare name is the game's own, and a plugin's has its id and a "/"`)
      continue
    }
    if (name.includes('/')) {
      if (PLUGIN_NAME.test(name) && !hasValue(game, name)) out.push(`${written} names no value "${name}"`)
      continue
    }
    // Only a name with groups: a plain one can be a key a start command or the game's code sets, which no walk sees.
    if (!BARE_NAME.test(name) || !name.includes('.')) continue
    if (phraseRows(game, name) !== undefined || hasGameValue(game, name) || keysOf(game).has(name)) continue
    out.push(`${written} names no phrase, no value in rules.values and no kv key the content starts or sets; is the phrase's name right?`)
  }
  return [...new Set(out)]
}

const GAME = 'game'

/** The phrase a token's name prints, as a bare name or with `game/` in front; undefined when it names none. */
function phraseNamed(game: Game, name: string): string | undefined {
  const short = name.startsWith(`${GAME}/`) ? name.slice(GAME.length + 1) : name
  return BARE_NAME.test(short) && phraseRows(game, short) !== undefined ? short : undefined
}

/** What is wrong with the arguments a token passes a phrase: one it takes left out, or one it doesn't take. */
function argProblem(game: Game, name: string, written: string | undefined): string | undefined {
  const takes = phraseArgs(game, name)
  const given = (written ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((pair) => pair.slice(0, pair.indexOf('=')))
  const unknown = given.filter((arg) => !takes.includes(arg))
  const missing = takes.filter((arg) => !given.includes(arg))
  if (!unknown.length && !missing.length) return undefined
  const wants = takes.length ? `${name} takes ${takes.join(', ')}` : `${name} takes no arguments`
  return unknown.length ? `${wants}, not ${unknown.join(', ')}` : wants
}

/** The `$names` a row uses, in its words and as a whole string in its `when`, that look like arguments. */
function argsUsed(row: PhraseRow): string[] {
  const used = new Set<string>()
  if (typeof row.text === 'string') for (const match of row.text.matchAll(ARG_USE)) used.add(match[1])
  const walk = (node: unknown): void => {
    if (typeof node === 'string') {
      if (/^\$[A-Za-z][A-Za-z0-9_]*$/.test(node)) used.add(node.slice(1))
    } else if (Array.isArray(node)) node.forEach(walk)
    else if (isRecord(node)) Object.values(node).forEach(walk)
  }
  walk(row.when)
  return [...used]
}

/** Phrases merged by full name: a later pack's replaces an earlier one's, and new names, a group's included, are added. */
function merge(): PackMerge<PhrasesShape['game'], PhrasesShape['pack']> {
  const merged = new Map<string, { value: PhraseRow[] | PhraseWithArgs; from: string }>()
  return {
    base: () => {},
    add: (pack, from) => {
      for (const [name, phrase] of flatPhrases(pack.phrases)) merged.set(name, { value: phrase, from })
    },
    finish: (game) => {
      if (merged.size) game.phrases = Object.fromEntries([...merged].map(([name, entry]) => [name, entry.value]))
    },
    from: (list, name) => (list === 'phrase' && name !== undefined ? merged.get(name)?.from : undefined),
  }
}

/** Each phrase's words: each row's, by the phrase's full name and the row's place, `phrase.<name>.<n>`. */
function phraseWords(game: Game, walk: WordWalk) {
  for (const [name, phrase] of Object.entries(game.phrases ?? {})) {
    // A phrase with arguments keeps its rows in `rows`; its key in the table is the same.
    const withArgs = isPhraseWithArgs(phrase)
    const rows: unknown = withArgs ? phrase.rows : phrase
    if (!Array.isArray(rows)) continue
    walk.source = { list: 'phrase', id: name }
    const at = withArgs ? ['phrases', name, 'rows'] : ['phrases', name]
    rows.forEach((row, index) =>
      walk.field(
        `phrase.${name}.${index}`,
        typeof row === 'object' && row !== null ? (row as { text?: unknown }).text : undefined,
        [...at, index, 'text'],
        `phrase ${name}`,
      ),
    )
  }
}

export const phrases = defineFeature<PhrasesShape>({
  name: 'phrases',
  pack: { merge },
  content: { phrases: { declares: (phrases) => flatPhrases(phrases).map(([name]) => `phrase "${name}"`), words: phraseWords } },
  lists: ['phrase'],
  check: (game, tools) => {
    const all = Object.entries(game.phrases ?? {})
    const names = new Set(all.map(([name]) => name))
    for (const [name, phrase] of all) {
      const source = { list: 'phrase', id: name }
      const where = `phrase ${name}`
      const rows = isPhraseWithArgs(phrase) ? phrase.rows : phrase
      const args: unknown = isPhraseWithArgs(phrase) ? phrase.args : []
      if (!Array.isArray(args) || args.some((arg) => typeof arg !== 'string' || !/^[A-Za-z][A-Za-z0-9_]*$/.test(arg)))
        tools.problem(source, where, 'args must be a list of names, each a letter then letters, digits or _')
      else {
        if (isPhraseWithArgs(phrase) && !args.length) tools.problem(source, where, 'args is empty; leave args out of a phrase that takes none')
        for (const arg of new Set(args.filter((arg, at) => args.indexOf(arg) !== at))) tools.problem(source, where, `args names ${arg} twice`)
      }
      const declared = Array.isArray(args) ? args.filter((arg): arg is string => typeof arg === 'string') : []
      if (hasGameValue(game, name)) tools.problem(source, where, `rules.values has a value "${name}" too; {{${name}}} prints the phrase, so rename one`)
      const group = name.split('.').some((_, at, parts) => at > 0 && names.has(parts.slice(0, at).join('.')))
      if (group) tools.problem(source, where, `"${name}" is in a group that is also a phrase; a name is either a phrase or a group`)
      if (!Array.isArray(rows) || !rows.length) {
        tools.problem(source, where, 'a phrase needs at least one row')
        continue
      }
      const otherwise = rows.findIndex((row) => row.when === undefined)
      if (otherwise >= 0 && otherwise < rows.length - 1) tools.problem(source, where, `row ${otherwise + 1} has no when, so the rows after it are never shown`)
      rows.forEach((row, index) => {
        if (typeof row?.text !== 'string') tools.problem(source, where, `row ${index + 1} needs its text`)
        else {
          for (const arg of argsUsed(row).filter((used) => !declared.includes(used)))
            tools.problem(
              source,
              where,
              declared.length
                ? `row ${index + 1} uses $${arg}, which isn't one of its args (${declared.join(', ')})`
                : `row ${index + 1} uses $${arg}, but the phrase takes no args`,
            )
          // An argument stands for whatever a token passes, so it is checked as `'$'`, an entity named by the caller.
          const when = bindArgs(row.when, declared, () => '$')
          tools.check(source, `${where} row ${index + 1}`, [{ when }, { markup: row.text }])
        }
      })
    }
  },
  markup: (game, text, where, tools, shownWhen) => tokenProblems(game, text, (what) => tools.warn(where, what), shownWhen),
})
