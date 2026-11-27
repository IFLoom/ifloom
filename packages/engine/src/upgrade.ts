/**
 * Content migrations, which carry a pack written for an older `SCHEMA` forward one step at a time, as `STEPS` carries
 * a save. `loadGame` calls `upgradePack`, so an old pack or mod file still loads.
 *
 * The engine's steps reshape only the fields the engine reads. Each plugin carries its own `data`, call arguments,
 * strings and traits forward with its `contentMigrations`, and a pack records in `plugins` the version of each
 * plugin's content it was written for. The engine's `COMMAND_STEPS` and each plugin's `commandMigrations` carry a
 * command log's commands forward the same way.
 */
import { fail, ok, type Result } from './result.ts'
import type { Pack } from './loader.ts'
import type { Plugin } from './plugin.ts'
import { carryChain, type Chain } from './chain.ts'

/** The content schema this engine reads. `PACK_STEPS` upgrade a pack of an older schema, and a newer one is refused. */
export const SCHEMA = 1

/** A pack as it arrived, in the shape of the schema it records, which may be older than `SCHEMA`. */
export type RawPack = Record<string, unknown> & {
  /** The content schema the pack was written for. */
  schema: number
}

/**
 * The parts of the game under a pack that an upgrade step may read beside the pack. `loadGame` passes it, and a step
 * without it reads only the pack.
 */
export type PackContext = {
  /** The prose keys' lines under the pack, from the content and earlier packs. */
  prose?: Readonly<Record<string, string>>
}

/**
 * The engine's steps that reshape a pack, keyed by the schema each upgrades from. The lowest key is the oldest schema
 * the engine reads, and there are none yet.
 *
 * A schema above it with no step changed nothing the engine reads, so a pack goes on unchanged, though a plugin's own
 * steps may run there.
 *
 * When the content format changes, bump `SCHEMA` and add the step from the previous schema in the same change. A step
 * returns a new pack and never changes the one it was given, and the runner sets the schema number for it.
 */
export const PACK_STEPS: Record<number, (pack: RawPack, context: PackContext) => RawPack> = {}

/** Keys of a pack's `words` table renamed, the words kept. */
function wordKeys(pack: RawPack, rename: (key: string) => string): RawPack {
  if (!isRecord(pack.words)) return pack
  return { ...pack, words: Object.fromEntries(Object.entries(pack.words).map(([key, text]) => [rename(key), text])) }
}

/** The pack keys that hold words or code, not content a step rewrites. */
const WORDS = new Set(['prose', 'strings', 'variants', 'custom'])

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/** Every object in a value rewritten by `rewrite`, from the innermost out. */
function deep(value: unknown, rewrite: (value: Record<string, unknown>) => Record<string, unknown>): unknown {
  if (Array.isArray(value)) return value.map((inner) => deep(inner, rewrite))
  if (!isRecord(value)) return value
  return rewrite(Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, deep(inner, rewrite)])))
}

/** The form a plugin call is written in, `short`, `long` or `command`. See `ContentTools.calls`. */
export type CallForm = 'short' | 'long' | 'command'

/** A plugin call passed to a `ContentTools.calls` rewrite. */
export type RawCall = {
  /** The call's full name, such as `'places/at'`. */
  name: string
  /** The call's arguments, unchanged from the pack. */
  with: unknown
  /** The call's form in the pack. */
  form: CallForm
}

/**
 * The tools a plugin's content step gets beside the pack, which rewrite a pack without walking it by hand. Each returns
 * a new pack.
 *
 * `objects` and `calls` leave words and code (`prose`, `strings`, `variants`, `custom`) unchanged, and `words` rewrites
 * only those words.
 */
export type ContentTools = {
  /** Returns the pack with every object in its content rewritten by `rewrite`, from the innermost out. */
  objects: (pack: RawPack, rewrite: (value: Record<string, unknown>) => Record<string, unknown>) => RawPack
  /**
   * Returns the pack with every call to a condition, effect or command by name rewritten by `rewrite`. A call returned
   * with the same name and arguments stays as it was.
   *
   * The forms are `short` (`{ 'places/at': { location } }`, any key with a `/`, so check the name), `long`
   * (`{ custom: 'places/at', with }` or `{ kind: 'custom', name, with }`) and `command`
   * (`{ type: 'custom', name, with }`). A value (`{ value, with }`) is not a call, so reach it with `objects`.
   */
  calls: (pack: RawPack, rewrite: (call: RawCall) => { name: string; with: unknown }) => RawPack
  /** Returns the pack with every line of its `prose` and `strings` rewritten by `rewrite`, which gets each line's key. */
  words: (pack: RawPack, rewrite: (text: string, key: string) => string) => RawPack
  /**
   * Returns the pack with every key of its words table (`quests/quests.settle.title`) renamed by `rename`, keeping the
   * words. A step that renames a field uses it.
   */
  wordKeys: (pack: RawPack, rename: (key: string) => string) => RawPack
  /**
   * Returns the pack with each entry of one plugin `data` list rewritten by `rewrite`. The list is named
   * `<plugin>/<list>` (`'quests/quests'` is `data.quests.quests`), and a pack without it comes back unchanged.
   */
  entries: (pack: RawPack, list: string, rewrite: (entry: Record<string, unknown>) => Record<string, unknown>) => RawPack
  /**
   * Returns a prose key's line, the pack's own or else the game's under it, or undefined when neither has it. A step
   * that turns a prose key into words in place uses it.
   */
  prose: (key: string) => string | undefined
}

/**
 * A step of a plugin's `contentMigrations`, which returns the whole pack reshaped from one content version to the
 * next. It returns a new pack and never changes the one it was given.
 *
 * A step changes only the plugin's own `data`, calls, strings and traits as a rule.
 */
export type ContentStep = (pack: RawPack, tools: ContentTools) => RawPack

/** A command from a command log, in the shape of the engine or plugin version that wrote it. */
export type RawCommand = Record<string, unknown> & {
  /** The command's type, such as `choose` or a plugin's `quests/track`. */
  type: string
}

/**
 * A step of a plugin's `commandMigrations`, which returns a log's command reshaped from one command version to the
 * next. It gets every command, so it returns the ones that aren't its own unchanged.
 */
export type CommandStep = (command: RawCommand) => RawCommand

/** One plugin call in one object, rewritten. */
function callsIn(value: Record<string, unknown>, rewrite: (call: RawCall) => { name: string; with: unknown }): Record<string, unknown> {
  let out = value
  const long = (field: 'name' | 'custom', form: CallForm) => {
    const next = rewrite({ name: out[field] as string, with: out.with, form })
    if (next.name === out[field] && next.with === out.with) return
    const { with: _with, ...rest } = out
    out = { ...rest, [field]: next.name, ...(next.with !== undefined ? { with: next.with } : {}) }
  }
  if (out.kind === 'custom' && typeof out.name === 'string') long('name', 'long')
  else if (out.type === 'custom' && typeof out.name === 'string') long('name', 'command')
  if (typeof out.custom === 'string') long('custom', 'long')
  if (Object.keys(out).some((key) => key.includes('/'))) {
    let changed = false
    const entries = Object.entries(out).map(([key, inner]): [string, unknown] => {
      if (!key.includes('/')) return [key, inner]
      const next = rewrite({ name: key, with: inner, form: 'short' })
      if (next.name !== key || next.with !== inner) changed = true
      return [next.name, next.with]
    })
    if (changed) out = Object.fromEntries(entries)
  }
  return out
}

/** The tools every plugin's content step is given, but `prose`, which reads the pack being upgraded. */
const TOOLS: Omit<ContentTools, 'prose'> = {
  objects: (pack, rewrite) => Object.fromEntries(Object.entries(pack).map(([key, value]) => [key, WORDS.has(key) ? value : deep(value, rewrite)])) as RawPack,
  calls: (pack, rewrite) => TOOLS.objects(pack, (value) => callsIn(value, rewrite)),
  words: (pack, rewrite) =>
    Object.fromEntries(
      Object.entries(pack).map(([key, value]) => [
        key,
        (key === 'prose' || key === 'strings') && isRecord(value)
          ? Object.fromEntries(Object.entries(value).map(([id, text]) => [id, typeof text === 'string' ? rewrite(text, id) : text]))
          : value,
      ]),
    ) as RawPack,
  wordKeys,
  entries: (pack, list, rewrite) => {
    const [plugin, name] = list.split('/')
    const data = pack.data
    if (!isRecord(data) || !isRecord(data[plugin]) || !Array.isArray(data[plugin][name])) return pack
    const own = data[plugin]
    return { ...pack, data: { ...data, [plugin]: { ...own, [name]: (own[name] as unknown[]).map((entry) => (isRecord(entry) ? rewrite(entry) : entry)) } } }
  },
}

/**
 * The engine's steps that reshape a command from a command log, keyed by the schema each upgrades from. A schema with
 * no step changed no command.
 *
 * Each plugin carries its own commands forward with its `commandMigrations`.
 */
export const COMMAND_STEPS: Record<number, (command: RawCommand) => RawCommand> = {}

/**
 * Each plugin's version as a pack or a log records it, or `unrecorded`'s where it records none; or why one can't be
 * read.
 */
function startingVersions(
  plugins: readonly Plugin[],
  recorded: Record<string, unknown>,
  unrecorded: (plugin: Plugin) => number,
  current: (plugin: Plugin) => number,
  what: string,
): Result<Record<string, number>> {
  const out: Record<string, number> = {}
  for (const plugin of plugins) {
    const target = current(plugin)
    const given = recorded[plugin.id]
    if (given === undefined) {
      out[plugin.id] = unrecorded(plugin)
      continue
    }
    if (typeof given !== 'number' || !Number.isInteger(given) || given < 1)
      return fail(`records "${String(given)}" as the ${plugin.id} plugin's ${what} version`)
    if (given > target) return fail(`written for version ${given} of the ${plugin.id} plugin's ${what}, this game's reads ${target}`)
    out[plugin.id] = given
  }
  return ok(out)
}

/**
 * Each plugin's own chain, from the version in `at` to its current one, for
 * `runChain` to run beside the engine's, the game's plugins in their order.
 * A version a plugin has no step from changed nothing of its.
 */
function pluginChains<T>(
  plugins: readonly Plugin[],
  at: Record<string, number>,
  current: (plugin: Plugin) => number,
  stepOf: (plugin: Plugin, version: number) => ((value: T) => T) | undefined,
): Omit<Chain<T>, 'gap'>[] {
  return plugins.map((plugin) => ({ from: at[plugin.id], to: current(plugin), step: (version) => stepOf(plugin, version) }))
}

/** The oldest schema a pack can be upgraded from: the first `PACK_STEPS` key, or `SCHEMA` with none. */
function oldestSchema(): number {
  return Math.min(SCHEMA, ...Object.keys(PACK_STEPS).map(Number))
}

const contentVersion = (plugin: Plugin) => plugin.contentVersion ?? 1
const commandVersion = (plugin: Plugin) => plugin.commandVersion ?? 1

/**
 * Returns the pack upgraded to `SCHEMA` and to each plugin's content version. Returns a failed `Result` when the pack
 * was written for a newer engine or plugin, or for a schema older than any step.
 *
 * Pass the game's plugins (`game.plugins`, or the base's), so each one's content is carried forward too. The engine's
 * step from each schema runs after every plugin step keyed by that schema or below. Each plugin's later steps run
 * after.
 *
 * A pack that records no version for a plugin is read as written for the plugin's current version. The result records every plugin's version in `plugins`, and a pack with nothing to upgrade comes back
 * unchanged. `loadGame` passes `context` (see `PackContext`).
 */
export function upgradePack(pack: { schema: number; plugins?: Record<string, number> }, plugins: readonly Plugin[], context: PackContext = {}): Result<Pack> {
  const from = pack.schema
  if (!Number.isInteger(from)) return fail(`has no schema number`)
  if (from > SCHEMA) return fail(`written for schema ${from}, this engine reads ${SCHEMA}`)
  if (from < oldestSchema()) return fail(`written for schema ${from}, too old for this engine to read (it reads ${SCHEMA})`)
  const recorded = isRecord(pack.plugins) ? pack.plugins : {}
  const versions = startingVersions(plugins, recorded, contentVersion, contentVersion, 'content')
  if (!versions.ok) return versions
  const at = versions.value
  const toolsFor = (value: RawPack): ContentTools => ({
    ...TOOLS,
    prose: (key) => {
      const own = isRecord(value.prose) ? value.prose : {}
      const found = Object.hasOwn(own, key) ? own[key] : context.prose && Object.hasOwn(context.prose, key) ? context.prose[key] : undefined
      return typeof found === 'string' ? found : undefined
    },
  })
  const stepOf = (plugin: Plugin, version: number) => {
    const step = plugin.contentMigrations?.[version]
    return step ? (value: RawPack): RawPack => ({ ...step(value, toolsFor(value)), schema: value.schema }) : undefined
  }
  // A schema with no engine step changed nothing the engine reads; the pack's schema number moves on all the same.
  const run = carryChain(
    pack as RawPack,
    {
      from,
      to: SCHEMA,
      step: (version) => PACK_STEPS[version] && ((value: RawPack) => PACK_STEPS[version](value, context)),
      stamp: (value, schema) => ({ ...value, schema }),
    },
    pluginChains(plugins, at, contentVersion, stepOf),
  )
  if (!run.moved) return ok(pack as unknown as Pack)
  const out: RawPack = { ...run.value }
  if (plugins.length || pack.plugins !== undefined)
    out.plugins = { ...recorded, ...Object.fromEntries(plugins.map((plugin) => [plugin.id, contentVersion(plugin)])) }
  return ok(out as unknown as Pack)
}

/** The versions a command log records, the engine's `SCHEMA` and each plugin's command version. */
export type CommandVersions = {
  /** The engine's `SCHEMA` when the log was written. */
  schema: number
  /** Each plugin's command version when the log was written, by plugin id. */
  plugins: Record<string, number>
}

/** Returns the versions a command log written now records, for a game with these plugins. */
export function commandVersions(plugins: readonly Plugin[]): CommandVersions {
  return { schema: SCHEMA, plugins: Object.fromEntries(plugins.map((plugin) => [plugin.id, commandVersion(plugin)])) }
}

/**
 * Returns a function that upgrades a log's commands to this engine and these plugins, from the versions the log
 * records. Returns a failed `Result` when the log was written for a newer engine or plugin.
 *
 * A log that records no versions is read as the oldest, so every step runs. Each command goes through the engine's
 * `COMMAND_STEPS` from the log's schema and each plugin's `commandMigrations` from its version, interleaved as
 * `upgradePack` interleaves content. A command already in this shape comes back unchanged.
 */
export function commandUpgrade(plugins: readonly Plugin[], from: Partial<CommandVersions> = {}): Result<<C>(command: C) => C> {
  const schema = from.schema ?? 1
  if (!Number.isInteger(schema)) return fail(`has no schema number`)
  if (schema > SCHEMA) return fail(`written for schema ${schema}, this engine reads ${SCHEMA}`)
  const versions = startingVersions(plugins, isRecord(from.plugins) ? from.plugins : {}, () => 1, commandVersion, 'commands')
  if (!versions.ok) return versions
  const stepOf = (plugin: Plugin, version: number) => plugin.commandMigrations?.[version]
  return ok(<C>(command: C): C => {
    if (!isRecord(command) || typeof command.type !== 'string') return command
    // A schema with no step changed no command.
    const chains = pluginChains(plugins, versions.value, commandVersion, stepOf)
    return carryChain(command as RawCommand, { from: schema, to: SCHEMA, step: (version) => COMMAND_STEPS[version] }, chains).value as C
  })
}
