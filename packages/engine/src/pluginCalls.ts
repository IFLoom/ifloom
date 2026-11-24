/**
 * A plugin's calls, declared once: each condition, effect and command it
 * offers, by name, with the arguments content writes for it. From that one
 * declaration the plugin gets the type content is checked against (its
 * registries extend `ConditionsOf`, `EffectsOf` and `CommandsOf`), typed
 * arguments in its implementations, read from untrusted content by each
 * argument's default reading, a typed writer for each call to build its
 * helpers from, and the references the content checker resolves.
 *
 * And its data lists, declared once (`defineData`): each list of its pack
 * `data` by name, with the entry's type, the noun a problem names one by and
 * which of its fields are words. From that the plugin gets the typed lookups,
 * the entry reference an argument or a check names one by, and the word
 * shapes a translation reaches.
 *
 * Imports only types, so `calls.ts` and the plugin machinery can read it.
 */
import type { Game } from './game.ts'
import type { Reference } from './references.ts'
import type { WordPart, WordShape } from './words.ts'
import type { EntityRef, Holder } from './entities.ts'
import type { Amount, KvValue, Range } from './types.ts'
import type { ContentReferences, PluginEntry, PluginProblem } from './plugin.ts'

/**
 * One argument of a call: what content writes for it (`In`), what the
 * implementation is handed (`Out`, read from whatever content wrote), whether
 * it may be left out, what the checker says of a value of the wrong shape, and
 * what a value names. Made with `arg`.
 */
export type Arg<In = unknown, Out = In, Optional extends boolean = boolean> = {
  /** What a value must be, for the checker's problem: `'text'`, `'a number'`. */
  readonly kind: string
  /** May content leave it out? */
  readonly isOptional: Optional
  /** Content's value is words a player reads, which a translation can replace. */
  readonly words?: WordPart
  /** What the implementation is handed for content's value, whatever content wrote. */
  read(value: unknown): Out
  /** Is content's value of the right shape? Asked only of a value content wrote. */
  fits(value: unknown): boolean
  /** What a value names, for the checker: a place, an entry, a `{ problem }`. */
  refs(value: Out, game: Game): readonly Reference[]
  /**
   * The same argument, which content may leave out: the implementation is
   * handed `undefined` then, or `fallback` when one is given.
   */
  optional(): Arg<In, Out | undefined, true>
  optional<F extends Out>(fallback: F): Arg<In, Out, true>
  /**
   * The same argument, naming these references too: `arg.string().naming(placeRefs)`.
   * Inside `defineCalls`, give an inline function its return type,
   * `(id): Reference[] => [...]`, or the registries built from the calls refer
   * to themselves.
   */
  naming(refs: (value: Exclude<Out, undefined>, game: Game) => readonly Reference[]): Arg<In, Out, Optional>
  /**
   * The same argument, with a rule of the plugin's own about its value: what
   * is wrong with it, in the checker's words, or undefined when nothing is.
   * `arg.number().rule((n) => (n >= 1 ? undefined : 'count must be 1 or more'))`.
   */
  rule(problem: (value: Exclude<Out, undefined>) => string | undefined): Arg<In, Out, Optional>
  /** Phantom: what content writes. Never set. */
  readonly _in?: In
}

/** What one call takes: its arguments by name. `{}` for a call with none, written `true`. */
export type ArgShape = Readonly<Record<string, Arg<any, any, boolean>>>

/** What content writes for an argument. */
export type ArgIn<A> = A extends Arg<infer In, any, any> ? In : never
/** What the implementation is handed for an argument. */
export type ArgOut<A> = A extends Arg<any, infer Out, any> ? Out : never

type Flatten<T> = { [K in keyof T]: T[K] } & {}
type RequiredKeys<S> = { [K in keyof S]: S[K] extends Arg<any, any, true> ? never : K }[keyof S]
type OptionalKeys<S> = { [K in keyof S]: S[K] extends Arg<any, any, true> ? K : never }[keyof S]

/** The arguments content writes for a call of this shape, as an object. */
export type ArgsIn<S extends ArgShape> = Flatten<{ [K in RequiredKeys<S>]: ArgIn<S[K]> } & { [K in OptionalKeys<S>]?: ArgIn<S[K]> }>

/**
 * What content writes as a call's value: its arguments; `true` for a call
 * with none (or `{}`); and either for a call whose arguments may all be left out.
 */
export type WrittenAs<S extends ArgShape> = [keyof S] extends [never]
  ? true | Record<string, never>
  : [RequiredKeys<S>] extends [never]
    ? ArgsIn<S> | true
    : ArgsIn<S>

/** What the implementation of a call of this shape is handed: every argument, read. */
export type ArgsOut<S extends ArgShape> = Flatten<{ [K in keyof S]: ArgOut<S[K]> }>

/** What a plugin's calls take, by table and name. */
export type CallShapes = {
  conditions?: Readonly<Record<string, ArgShape>>
  effects?: Readonly<Record<string, ArgShape>>
  commands?: Readonly<Record<string, ArgShape>>
}

/** A call's writer: its arguments in, the call in short out, `{ 'places/at': { location } }`. */
export type CallWriter<Name extends string, S extends ArgShape> = ([RequiredKeys<S>] extends [never]
  ? (args?: ArgsIn<S>) => { [N in Name]: WrittenAs<S> }
  : (args: ArgsIn<S>) => { [N in Name]: WrittenAs<S> }) & {
  /** The call's full name: `'places/at'`. */
  readonly call: Name
  /** What it takes. */
  readonly args: S
  /**
   * Arguments as content wrote them, read as the implementation is handed
   * them: for a guard or a price that looks at a list of effects, say.
   */
  read(args: unknown): ArgsOut<S>
}

type Table<D extends CallShapes, T extends keyof CallShapes> = NonNullable<D[T]>

type Writers<Id extends string, T> = { readonly [K in keyof T & string]: T[K] extends ArgShape ? CallWriter<`${Id}/${K}`, T[K]> : never }

/**
 * A plugin's calls, as `defineCalls` declares them: its id, what each call
 * takes, and a writer for each, by table: `calls.conditions.at({ location })`.
 * Give it to `definePlugin` as `calls`, and derive the registries from it.
 */
export type PluginCalls<Id extends string = string, D extends CallShapes = CallShapes> = {
  readonly id: Id
  readonly conditions: Writers<Id, Table<D, 'conditions'>>
  readonly effects: Writers<Id, Table<D, 'effects'>>
  readonly commands: Writers<Id, Table<D, 'commands'>>
}

/** What a plugin's calls' declaration says, by table, for any plugin. */
export type AnyCalls = {
  readonly id: string
  readonly conditions: Readonly<Record<string, { readonly call: string; readonly args: ArgShape }>>
  readonly effects: Readonly<Record<string, { readonly call: string; readonly args: ArgShape }>>
  readonly commands: Readonly<Record<string, { readonly call: string; readonly args: ArgShape }>>
}

type ShapesOf<C, T extends keyof CallShapes> = C extends PluginCalls<string, infer D> ? Table<D, T> : {}

type RegistryOf<C, T extends keyof CallShapes> =
  C extends PluginCalls<infer Id, infer D>
    ? { [K in keyof Table<D, T> & string as `${Id}/${K}`]: Table<D, T>[K] extends ArgShape ? WrittenAs<Table<D, T>[K]> : never }
    : never

/**
 * What a plugin's conditions take, by full name, for its `ConditionRegistry`:
 *
 * ```ts
 * declare module '@ifloom/engine' {
 *   interface ConditionRegistry extends ConditionsOf<typeof CALLS> {}
 * }
 * ```
 */
export type ConditionsOf<C> = RegistryOf<C, 'conditions'>
/** What a plugin's effects take, by full name, for its `EffectRegistry`. As `ConditionsOf`. */
export type EffectsOf<C> = RegistryOf<C, 'effects'>
/** What a plugin's commands take, by full name, for its `CommandRegistry`. As `ConditionsOf`. */
export type CommandsOf<C> = RegistryOf<C, 'commands'>

/** What the implementation of each call in a table is handed, by name. */
export type CallArgs<C, T extends keyof CallShapes> = { [K in keyof ShapesOf<C, T>]: ShapesOf<C, T>[K] extends ArgShape ? ArgsOut<ShapesOf<C, T>[K]> : never }

/**
 * Declare a plugin's calls once: each condition, effect and command by name,
 * with what it takes, built from `arg`.
 *
 * ```ts
 * const CALLS = defineCalls('places', {
 *   conditions: { at: { location: arg.strings() } },
 *   commands: { go: { id: arg.string() } },
 * })
 * ```
 *
 * Give it to `definePlugin` as `calls`, so each implementation is handed its
 * arguments typed and read; build the helpers from its writers
 * (`CALLS.conditions.at({ location })`); and extend the registries from it
 * (`ConditionsOf<typeof CALLS>`), so content is checked against the same
 * declaration. The content checker reports an argument content left out, one
 * of the wrong shape and one the call doesn't take, and resolves what each
 * names.
 */
export function defineCalls<Id extends string, const D extends CallShapes>(id: Id, shapes: D): PluginCalls<Id, D> {
  const writers = (table: keyof CallShapes) =>
    Object.fromEntries(
      Object.entries(shapes[table] ?? {}).map(([name, shape]) => {
        const call = `${id}/${name}`
        const write = (args?: Record<string, unknown>) => ({ [call]: args === undefined && optionalOnly(shape) ? true : (args ?? true) })
        return [name, Object.assign(write, { call, args: shape, read: (args: unknown) => readArgs(shape, args) })]
      }),
    )
  return { id, conditions: writers('conditions'), effects: writers('effects'), commands: writers('commands') } as unknown as PluginCalls<Id, D>
}

/** Does every argument of this shape let content leave it out? */
const optionalOnly = (shape: ArgShape) => Object.values(shape).every((one) => one.isOptional)

/** The shape a declared call takes, if the calls declare it. */
export function callShape(calls: AnyCalls | undefined, table: keyof CallShapes, name: string): ArgShape | undefined {
  const writers = calls?.[table]
  return writers && Object.hasOwn(writers, name) ? writers[name].args : undefined
}

/** The names a plugin's calls declare in one table. */
export function callNames(calls: AnyCalls | undefined, table: keyof CallShapes): string[] {
  return Object.keys(calls?.[table] ?? {})
}

const isArgs = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)

/** Content's arguments for a call of this shape, as its implementation is handed them: each declared argument, read. */
export function readArgs(shape: ArgShape, args: unknown): Record<string, unknown> {
  const given = isArgs(args) ? args : {}
  const out: Record<string, unknown> = {}
  for (const [key, one] of Object.entries(shape)) out[key] = one.read(given[key])
  return out
}

/**
 * What the checker says of content's arguments for a call of this shape: an
 * argument it needs and left out, one of the wrong shape, one the call
 * doesn't take; then what each argument names.
 */
export function argReferences(shape: ArgShape, args: unknown, game: Game, call: string): Reference[] {
  const given = isArgs(args) ? args : {}
  const name = `"${call}"`
  const out: Reference[] = []
  const names = Object.keys(shape)
  for (const key of Object.keys(given)) {
    if (Object.hasOwn(shape, key) || given[key] === undefined) continue
    out.push({
      problem: names.length
        ? `${name} takes no "${key}"; it takes ${names.map((one) => `"${one}"`).join(', ')}`
        : `${name} takes no arguments, so not "${key}"`,
    })
  }
  for (const [key, one] of Object.entries(shape)) {
    const value = given[key]
    if (value === undefined) {
      if (!one.isOptional) out.push({ problem: `${name} needs "${key}"` })
      continue
    }
    if (!one.fits(value)) {
      out.push({ problem: `${name}'s "${key}" must be ${one.kind}; this one is ${JSON.stringify(value)}` })
      continue
    }
    out.push(...one.refs(one.read(value), game))
  }
  return out
}

/** The first argument content wrote for a call of this shape that doesn't fit it, with what it must be; undefined when they all do. */
export function unfitArg(shape: ArgShape, args: unknown): { arg: string; kind: string } | undefined {
  const given = isArgs(args) ? args : {}
  for (const [key, one] of Object.entries(shape)) {
    const value = given[key]
    if (value !== undefined && value !== null && !one.fits(value)) return { arg: key, kind: one.kind }
  }
  return undefined
}

/** The words in a call's arguments, as a translation reaches them: `{ text: true }`. Undefined when it has none. */
export function argWords(shape: ArgShape): WordShape | undefined {
  const words = Object.entries(shape).filter(([, one]) => one.words !== undefined)
  return words.length ? (Object.fromEntries(words.map(([key, one]) => [key, one.words!])) as WordShape) : undefined
}

type ArgParts<In, Out> = {
  kind: string
  read: (value: unknown) => Out
  fits: (value: unknown) => boolean
  refs?: (value: Out, game: Game) => readonly Reference[]
  words?: WordPart
  _in?: In
}

function makeArg<In, Out, O extends boolean>(parts: ArgParts<In, Out>, optional: O): Arg<In, Out, O> {
  const refs = parts.refs ?? (() => [])
  const made: Arg<In, Out, O> = {
    kind: parts.kind,
    isOptional: optional,
    ...(parts.words !== undefined ? { words: parts.words } : {}),
    read: parts.read,
    fits: parts.fits,
    refs,
    optional: ((...fallback: [Out?]) =>
      makeArg<In, Out | undefined, true>(
        {
          ...parts,
          read: (value) => (value === undefined || value === null ? (fallback.length ? fallback[0] : undefined) : parts.read(value)),
          refs: (value, game) => (value === undefined ? [] : refs(value as Out, game)),
        },
        true,
      )) as Arg<In, Out, O>['optional'],
    // Asked only of a value content wrote, so never of a missing one.
    naming: (more) =>
      makeArg<In, Out, O>({ ...parts, refs: (value, game) => [...refs(value, game), ...more(value as Exclude<Out, undefined>, game)] }, optional),
    rule: (problem) =>
      makeArg<In, Out, O>(
        {
          ...parts,
          refs: (value, game) => {
            const what = problem(value as Exclude<Out, undefined>)
            return [...(what === undefined ? [] : [{ problem: what }]), ...refs(value, game)]
          },
        },
        optional,
      ),
  }
  return made
}

/** A list of one or more: content may write one, or a list. */
const listOf = (value: unknown): unknown[] => (Array.isArray(value) ? value : value === undefined || value === null ? [] : [value])

const isAmount = (value: unknown) => typeof value === 'number' || typeof value === 'string' || isArgs(value)
const isKv = (value: unknown) => typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'

/**
 * The arguments a call can take, for `defineCalls`. Each reads what content
 * wrote into what the implementation is handed, whatever it was (a missing
 * text is `''`, a list of one is a list); the checker reports a value of the
 * wrong shape. `.optional()` lets content leave one out, `.optional(1)` with
 * what the implementation is handed then; `.naming(fn)` adds what a value
 * names, for the checker: `arg.string().naming((id) => [{ scene: id }])`.
 */
export const arg = {
  /** Text: `'cafe'`. Read as text; `''` when missing. */
  string: (): Arg<string, string, false> =>
    makeArg({ kind: 'text', fits: (value) => typeof value === 'string', read: (value) => (value === undefined || value === null ? '' : String(value)) }, false),
  /** Words a player reads, which a translation can replace: a post's text. */
  words: (): Arg<string, string, false> =>
    makeArg(
      { kind: 'text', words: true, fits: (value) => typeof value === 'string', read: (value) => (value === undefined || value === null ? '' : String(value)) },
      false,
    ),
  /** A number: `2`. Read as a number; `0` when missing or not one. */
  number: (): Arg<number, number, false> =>
    makeArg(
      {
        kind: 'a number',
        fits: (value) => typeof value === 'number' && Number.isFinite(value),
        read: (value) => (typeof value === 'number' ? value : Number.isFinite(Number(value)) ? Number(value) : 0),
      },
      false,
    ),
  /** True or false. */
  boolean: (): Arg<boolean, boolean, false> =>
    makeArg({ kind: 'true or false', fits: (value) => typeof value === 'boolean', read: (value) => value === true }, false),
  /** One text or a list of them, `'cafe'` or `['cafe', 'park']`, handed as a list. */
  strings: (): Arg<string | readonly string[], string[], false> =>
    makeArg(
      {
        kind: 'text or a list of text',
        fits: (value) => listOf(value).every((one) => typeof one === 'string'),
        read: (value) => listOf(value).map(String),
      },
      false,
    ),
  /** One number or a list of them, handed as a list. */
  numbers: (): Arg<number | readonly number[], number[], false> =>
    makeArg(
      {
        kind: 'a number or a list of numbers',
        fits: (value) => listOf(value).every((one) => typeof one === 'number'),
        read: (value) => listOf(value).map(Number),
      },
      false,
    ),
  /** An entity, by reference: `'food:bun'`. Named to the checker, which must find it, carrying `trait` when one is given. */
  entity: (trait?: string): Arg<EntityRef, EntityRef, false> =>
    makeArg(
      {
        kind: 'an entity reference, kind:id',
        fits: (value) => typeof value === 'string',
        read: (value) => (value === undefined || value === null ? '' : String(value)) as EntityRef,
        refs: (value) => (value ? [trait ? { entity: value, carrying: trait } : { entity: value }] : []),
      },
      false,
    ),
  /** Who has things: `'player'`, `'you'` or a unique entity. Named to the checker. */
  holder: (): Arg<Holder, Holder, false> =>
    makeArg(
      {
        kind: 'a holder',
        fits: (value) => typeof value === 'string',
        read: (value) => (value === undefined || value === null ? '' : String(value)) as Holder,
        refs: (value) => (value ? [{ holder: value }] : []),
      },
      false,
    ),
  /** A kv value: true or false, a number or text. */
  kv: (): Arg<KvValue, KvValue, false> =>
    makeArg({ kind: 'true or false, a number or text', fits: isKv, read: (value) => (isKv(value) ? value : String(value ?? '')) }, false),
  /** An `Amount`, worked out when it's read: read it with `amountOf`. Named to the checker. */
  amount: (): Arg<Amount, Amount, false> =>
    makeArg({ kind: 'an amount', fits: isAmount, read: (value) => (isAmount(value) ? value : 0) as Amount, refs: (value) => [{ amount: value }] }, false),
  /** A range, `{ gte: 2 }`, as an argument of its own: `stacks: { gte: 2 }`. Its bounds are amounts, named to the checker. */
  range: (): Arg<Range, Range, false> =>
    makeArg(
      {
        kind: 'a range, such as { gte: 2 }',
        fits: isArgs,
        read: (value) => (isArgs(value) ? value : {}) as Range,
        // A bound can be an amount: `{ gte: { stat: 'resolve' } }`.
        refs: (value) =>
          Object.values(value)
            .filter((bound) => typeof bound !== 'number')
            .map((amount) => ({ amount })),
      },
      false,
    ),
  /**
   * An entry of one of the plugin's data lists, by id: `arg.entry(DATA.jobs)`.
   * Named to the checker, which reports one the list doesn't have.
   */
  entry: (list: DataList<any>): Arg<string, string, false> =>
    makeArg(
      {
        kind: `a ${list.noun}'s id`,
        fits: (value) => typeof value === 'string',
        read: (value) => (value === undefined || value === null ? '' : String(value)),
        refs: (value) => [list.ref(value)],
      },
      false,
    ),
  /** One entry of a data list or several, handed as a list. As `entry`. */
  entries: (list: DataList<any>): Arg<string | readonly string[], string[], false> =>
    makeArg(
      {
        kind: `a ${list.noun}'s id or a list of them`,
        fits: (value) => listOf(value).every((one) => typeof one === 'string'),
        read: (value) => listOf(value).map(String),
        refs: (value) => value.map((id) => list.ref(id)),
      },
      false,
    ),
  /**
   * A range's bounds as the call's own arguments, `{ job: 'cafe', gte: 3 }`:
   * spread them into a shape, `{ job: arg.entry(DATA.jobs), ...arg.bounds }`.
   * The core checks a call's bounds itself.
   */
  get bounds() {
    const bound = () =>
      makeArg<Amount, Amount, false>({ kind: 'an amount', fits: isAmount, read: (value) => (isAmount(value) ? value : 0) as Amount }, false).optional()
    return { gte: bound(), gt: bound(), lte: bound(), lt: bound() }
  },
}

/**
 * One list of a plugin's data, declared: `list<JobDef>({ noun: 'job', words:
 * { name: true } })`. The type of an entry is the type argument.
 */
export type ListSpec<T extends { id: string } = PluginEntry> = {
  /** What one entry is called in a problem: `unknown job "cafe"`. */
  noun: string
  /** Which fields of an entry are words a player reads, for a translation's `words` table. See `WordShape`. */
  words?: WordShape
  /** Phantom: an entry's type. Never set. */
  readonly _entry?: T
}

/** Declare one of a plugin's data lists, for `defineData`: the entry's type, its noun and its words. */
export function list<T extends { id: string }>(spec: { noun: string; words?: WordShape }): ListSpec<T> {
  return spec
}

/**
 * One of a plugin's data lists, as `defineData` declares it: where it is
 * (`data.<plugin>.<list>`), its noun and words, and its lookups.
 */
export type DataList<T extends { id: string } = PluginEntry> = {
  /** The plugin it is the data of. */
  readonly plugin: string
  /** Its name in the plugin's data: `'jobs'` for `data.jobs.jobs`. */
  readonly list: string
  /** What one entry is called in a problem. */
  readonly noun: string
  /** Which fields of an entry are words. */
  readonly words?: WordShape
  /** Every entry the game has, in order: each an object with an id; anything else in the list is left out. */
  all(game: Game): T[]
  /** One entry by id, which may be anything content wrote; undefined when the game has none. */
  get(game: Game, id: unknown): T | undefined
  /** The reference to one entry by id, for the checker: `unknown job "cafe"` when the game has none. */
  ref(id: string): Reference
  /** What each entry names, for `references.content`, each at `<list> <id>`. */
  content(game: Game, refs: (entry: T) => readonly Reference[]): ContentReferences[]
  /** A problem with one entry, for `check`, at `<list> <id>`. */
  problem(id: string, what: string): PluginProblem
}

type EntryOf<L> = L extends ListSpec<infer T> ? T : PluginEntry

/** A plugin's data lists, as `defineData` declares them, by name. Give them to `definePlugin` as `data`. */
export type PluginData<L extends Readonly<Record<string, ListSpec<any>>> = Readonly<Record<string, ListSpec<any>>>> = {
  readonly [K in keyof L & string]: DataList<EntryOf<L[K]>>
}

/**
 * Declare a plugin's data lists once: each list of its pack `data` by name,
 * with its entry's type, the noun a problem names an entry by, and which
 * fields are words.
 *
 * ```ts
 * const DATA = defineData('jobs', { jobs: list<JobDef>({ noun: 'job', words: { name: true } }) })
 * DATA.jobs.all(game)         // JobDef[]
 * DATA.jobs.get(game, 'cafe') // JobDef | undefined
 * arg.entry(DATA.jobs)        // an argument naming a job, checked
 * ```
 *
 * Give it to `definePlugin` as `data`, and the loader reaches each list's
 * words for a translation.
 */
export function defineData<const L extends Readonly<Record<string, ListSpec<any>>>>(plugin: string, lists: L): PluginData<L> {
  const out: Record<string, DataList> = {}
  for (const [name, spec] of Object.entries(lists)) out[name] = dataList(plugin, name, spec)
  return out as PluginData<L>
}

function dataList<T extends { id: string }>(plugin: string, name: string, spec: ListSpec<T>): DataList<T> {
  const cache = new WeakMap<Game, T[]>()
  const all = (game: Game): T[] => {
    let found = cache.get(game)
    if (!found) {
      found = (game.data?.[plugin]?.[name] ?? []).filter((entry): entry is T => isArgs(entry) && typeof entry.id === 'string')
      cache.set(game, found)
    }
    return found
  }
  return {
    plugin,
    list: name,
    noun: spec.noun,
    ...(spec.words !== undefined ? { words: spec.words } : {}),
    all,
    get: (game, id) => (typeof id === 'string' ? all(game).find((entry) => entry.id === id) : undefined),
    ref: (id) => ({ entry: id, plugin, list: name, noun: spec.noun }),
    content: (game, refs) => all(game).map((entry) => ({ list: name, id: entry.id, refs: refs(entry) })),
    problem: (id, what) => ({ list: name, id, what }),
  }
}
