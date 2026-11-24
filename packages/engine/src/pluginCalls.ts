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
 * One argument of a plugin's call, made with `arg`. `In` is the type content writes, and `Out` the type the
 * implementation gets, read from whatever content wrote.
 *
 * It also says whether content may leave it out, how the checker describes the right shape, and what a value names.
 */
export type Arg<In = unknown, Out = In, Optional extends boolean = boolean> = {
  /** The shape a value must have, in the checker's words, such as `'text'` or `'a number'`. */
  readonly kind: string
  /** True when content may leave the argument out. */
  readonly isOptional: Optional
  /** The argument's word shape, set when its value is words a player reads that a translation can replace. */
  readonly words?: WordPart
  /** Returns the value the implementation gets for content's value, whatever content wrote. */
  read(value: unknown): Out
  /** Returns true when content's value has the right shape. The checker asks it only of a value content wrote. */
  fits(value: unknown): boolean
  /** Returns the references a value makes for the checker, such as a location, an entry or a `{ problem }`. */
  refs(value: Out, game: Game): readonly Reference[]
  /**
   * Returns the same argument, which content may leave out. The implementation then gets `undefined`, or `fallback`
   * when one is given.
   */
  optional(): Arg<In, Out | undefined, true>
  optional<F extends Out>(fallback: F): Arg<In, Out, true>
  /**
   * Returns the same argument, making these references too, as in `arg.string().naming(placeRefs)`.
   *
   * Inside `defineCalls`, give an inline function its return type, `(id): Reference[] => [...]`, or the registries built
   * from the calls refer to themselves.
   */
  naming(refs: (value: Exclude<Out, undefined>, game: Game) => readonly Reference[]): Arg<In, Out, Optional>
  /**
   * Returns the same argument with a rule of the plugin's own about its value. The rule returns the problem in the
   * checker's words, or undefined when there is none.
   *
   * `arg.number().rule((n) => (n >= 1 ? undefined : 'count must be 1 or more'))`.
   */
  rule(problem: (value: Exclude<Out, undefined>) => string | undefined): Arg<In, Out, Optional>
  /** The type content writes, for type inference only. It is never set. */
  readonly _in?: In
}

/** The arguments one call takes, by name. It is `{}` for a call with none, which content writes as `true`. */
export type ArgShape = Readonly<Record<string, Arg<any, any, boolean>>>

/** The type content writes for an {@link Arg}. */
export type ArgIn<A> = A extends Arg<infer In, any, any> ? In : never
/** The type the implementation gets for an {@link Arg}. */
export type ArgOut<A> = A extends Arg<any, infer Out, any> ? Out : never

type Flatten<T> = { [K in keyof T]: T[K] } & {}
type RequiredKeys<S> = { [K in keyof S]: S[K] extends Arg<any, any, true> ? never : K }[keyof S]
type OptionalKeys<S> = { [K in keyof S]: S[K] extends Arg<any, any, true> ? K : never }[keyof S]

/** The arguments content writes for a call of an {@link ArgShape}, as an object. */
export type ArgsIn<S extends ArgShape> = Flatten<{ [K in RequiredKeys<S>]: ArgIn<S[K]> } & { [K in OptionalKeys<S>]?: ArgIn<S[K]> }>

/**
 * The value content writes for a call of an {@link ArgShape}. It is the arguments, `true` or `{}` for a call with none,
 * and either for a call whose arguments may all be left out.
 */
export type WrittenAs<S extends ArgShape> = [keyof S] extends [never]
  ? true | Record<string, never>
  : [RequiredKeys<S>] extends [never]
    ? ArgsIn<S> | true
    : ArgsIn<S>

/** The arguments the implementation of a call of an {@link ArgShape} gets, every one read. */
export type ArgsOut<S extends ArgShape> = Flatten<{ [K in keyof S]: ArgOut<S[K]> }>

/** The arguments a plugin's calls take, by table and name, as `defineCalls` is given them. */
export type CallShapes = {
  /** The arguments of each of the plugin's conditions, by name. */
  conditions?: Readonly<Record<string, ArgShape>>
  /** The arguments of each of the plugin's effects, by name. */
  effects?: Readonly<Record<string, ArgShape>>
  /** The arguments of each of the plugin's commands, by name. */
  commands?: Readonly<Record<string, ArgShape>>
}

/** A function that writes one call in the short form from its arguments, such as `{ 'places/at': { location } }`. */
export type CallWriter<Name extends string, S extends ArgShape> = ([RequiredKeys<S>] extends [never]
  ? (args?: ArgsIn<S>) => { [N in Name]: WrittenAs<S> }
  : (args: ArgsIn<S>) => { [N in Name]: WrittenAs<S> }) & {
  /** The call's full name, such as `'places/at'`. */
  readonly call: Name
  /** The call's {@link ArgShape}. */
  readonly args: S
  /**
   * Returns arguments as content wrote them, read as the implementation gets them. A guard or a price that looks at a
   * list of effects uses it.
   */
  read(args: unknown): ArgsOut<S>
}

type Table<D extends CallShapes, T extends keyof CallShapes> = NonNullable<D[T]>

type Writers<Id extends string, T> = { readonly [K in keyof T & string]: T[K] extends ArgShape ? CallWriter<`${Id}/${K}`, T[K]> : never }

/**
 * A plugin's calls as `defineCalls` declares them, with a {@link CallWriter} for each, by table, such as
 * `calls.conditions.at({ location })`. Give it to `definePlugin` as `calls`, and derive the registries from it.
 */
export type PluginCalls<Id extends string = string, D extends CallShapes = CallShapes> = {
  /** The plugin's id. */
  readonly id: Id
  /** The writers of the plugin's conditions, by name. */
  readonly conditions: Writers<Id, Table<D, 'conditions'>>
  /** The writers of the plugin's effects, by name. */
  readonly effects: Writers<Id, Table<D, 'effects'>>
  /** The writers of the plugin's commands, by name. */
  readonly commands: Writers<Id, Table<D, 'commands'>>
}

/** Any plugin's {@link PluginCalls}, with each call's full name and arguments, by table. */
export type AnyCalls = {
  /** The plugin's id. */
  readonly id: string
  /** The plugin's conditions, by name. */
  readonly conditions: Readonly<Record<string, { readonly call: string; readonly args: ArgShape }>>
  /** The plugin's effects, by name. */
  readonly effects: Readonly<Record<string, { readonly call: string; readonly args: ArgShape }>>
  /** The plugin's commands, by name. */
  readonly commands: Readonly<Record<string, { readonly call: string; readonly args: ArgShape }>>
}

type ShapesOf<C, T extends keyof CallShapes> = C extends PluginCalls<string, infer D> ? Table<D, T> : {}

type RegistryOf<C, T extends keyof CallShapes> =
  C extends PluginCalls<infer Id, infer D>
    ? { [K in keyof Table<D, T> & string as `${Id}/${K}`]: Table<D, T>[K] extends ArgShape ? WrittenAs<Table<D, T>[K]> : never }
    : never

/**
 * The arguments a plugin's conditions take, by full name, for its `ConditionRegistry`. Extend the registry from it.
 *
 * ```ts
 * declare module '@ifloom/engine' {
 *   interface ConditionRegistry extends ConditionsOf<typeof CALLS> {}
 * }
 * ```
 */
export type ConditionsOf<C> = RegistryOf<C, 'conditions'>
/** The arguments a plugin's effects take, by full name, for its `EffectRegistry`. Use it as `ConditionsOf` is used. */
export type EffectsOf<C> = RegistryOf<C, 'effects'>
/** The arguments a plugin's commands take, by full name, for its `CommandRegistry`. Use it as `ConditionsOf` is used. */
export type CommandsOf<C> = RegistryOf<C, 'commands'>

/** The arguments the implementation of each call in a table gets, by name. */
export type CallArgs<C, T extends keyof CallShapes> = { [K in keyof ShapesOf<C, T>]: ShapesOf<C, T>[K] extends ArgShape ? ArgsOut<ShapesOf<C, T>[K]> : never }

/**
 * Returns the {@link PluginCalls} declaration of a plugin's conditions, effects and commands, each by name with its
 * arguments built from `arg`.
 *
 * A plugin calls it once, and its helpers, the content checker and its registries read that one declaration.
 *
 * ```ts
 * const CALLS = defineCalls('places', {
 *   conditions: { at: { location: arg.strings() } },
 *   commands: { go: { id: arg.string() } },
 * })
 * ```
 *
 * Give it to `definePlugin` as `calls`, so each implementation gets its arguments typed and read. Build the helpers
 * from its writers (`CALLS.conditions.at({ location })`), and extend the registries from it
 * (`ConditionsOf<typeof CALLS>`), so content is checked against the same declaration.
 *
 * The content checker reports an argument content left out, one of the wrong shape and one the call doesn't take, and
 * resolves the references each makes.
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

/** Returns the {@link ArgShape} of a declared call, or undefined when the calls don't declare it. */
export function callShape(calls: AnyCalls | undefined, table: keyof CallShapes, name: string): ArgShape | undefined {
  const writers = calls?.[table]
  return writers && Object.hasOwn(writers, name) ? writers[name].args : undefined
}

/** Returns the names a plugin's calls declare in one table. */
export function callNames(calls: AnyCalls | undefined, table: keyof CallShapes): string[] {
  return Object.keys(calls?.[table] ?? {})
}

const isArgs = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)

/** Returns content's arguments for a call of a shape as its implementation gets them, each declared argument read. */
export function readArgs(shape: ArgShape, args: unknown): Record<string, unknown> {
  const given = isArgs(args) ? args : {}
  const out: Record<string, unknown> = {}
  for (const [key, one] of Object.entries(shape)) out[key] = one.read(given[key])
  return out
}

/**
 * Returns the checker's references for content's arguments to a call of a shape. They report an argument left out,
 * one of the wrong shape and one the call doesn't take, then the references each argument makes.
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

/** Returns the first argument content wrote for a call of a shape that doesn't fit, with the shape it must have, or undefined when all fit. */
export function unfitArg(shape: ArgShape, args: unknown): { arg: string; kind: string } | undefined {
  const given = isArgs(args) ? args : {}
  for (const [key, one] of Object.entries(shape)) {
    const value = given[key]
    if (value !== undefined && value !== null && !one.fits(value)) return { arg: key, kind: one.kind }
  }
  return undefined
}

/** Returns the word shape of a call's arguments, such as `{ text: true }`, or undefined when it has no words. */
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
 * The makers of the {@link Arg}s a call can take, for `defineCalls`. Each reads content's value into the value the
 * implementation gets, whatever content wrote, and the checker reports a value of the wrong shape.
 *
 * A missing text reads as `''`, and a single value as a list of one. `.optional()` lets content leave an argument out,
 * `.optional(1)` with the value the implementation then gets. `.naming(fn)` adds the references a value makes, as in
 * `arg.string().naming((id) => [{ scene: id }])`.
 */
export const arg = {
  /** Returns a text argument, such as `'cafe'`. It reads as `''` when missing. */
  string: (): Arg<string, string, false> =>
    makeArg({ kind: 'text', fits: (value) => typeof value === 'string', read: (value) => (value === undefined || value === null ? '' : String(value)) }, false),
  /** Returns a text argument of words a player reads, such as a post's text, which a translation can replace. */
  words: (): Arg<string, string, false> =>
    makeArg(
      { kind: 'text', words: true, fits: (value) => typeof value === 'string', read: (value) => (value === undefined || value === null ? '' : String(value)) },
      false,
    ),
  /** Returns a number argument, such as `2`. It reads as `0` when missing or not a number. */
  number: (): Arg<number, number, false> =>
    makeArg(
      {
        kind: 'a number',
        fits: (value) => typeof value === 'number' && Number.isFinite(value),
        read: (value) => (typeof value === 'number' ? value : Number.isFinite(Number(value)) ? Number(value) : 0),
      },
      false,
    ),
  /** Returns a true or false argument. It reads as false unless content wrote `true`. */
  boolean: (): Arg<boolean, boolean, false> =>
    makeArg({ kind: 'true or false', fits: (value) => typeof value === 'boolean', read: (value) => value === true }, false),
  /** Returns an argument of one text or a list, `'cafe'` or `['cafe', 'park']`, which the implementation gets as a list. */
  strings: (): Arg<string | readonly string[], string[], false> =>
    makeArg(
      {
        kind: 'text or a list of text',
        fits: (value) => listOf(value).every((one) => typeof one === 'string'),
        read: (value) => listOf(value).map(String),
      },
      false,
    ),
  /** Returns an argument of one number or a list, which the implementation gets as a list. */
  numbers: (): Arg<number | readonly number[], number[], false> =>
    makeArg(
      {
        kind: 'a number or a list of numbers',
        fits: (value) => listOf(value).every((one) => typeof one === 'number'),
        read: (value) => listOf(value).map(Number),
      },
      false,
    ),
  /** Returns an entity reference argument, such as `'food:bun'`. The checker must find the entity, carrying `trait` when one is given. */
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
  /** Returns a holder argument, `'player'`, `'you'` or a unique entity. The checker must find the holder. */
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
  /** Returns a kv value argument, true or false, a number or text. */
  kv: (): Arg<KvValue, KvValue, false> =>
    makeArg({ kind: 'true or false, a number or text', fits: isKv, read: (value) => (isKv(value) ? value : String(value ?? '')) }, false),
  /** Returns an `Amount` argument, worked out when the implementation reads it with `amountOf`. The checker resolves the references it makes. */
  amount: (): Arg<Amount, Amount, false> =>
    makeArg({ kind: 'an amount', fits: isAmount, read: (value) => (isAmount(value) ? value : 0) as Amount, refs: (value) => [{ amount: value }] }, false),
  /** Returns a range argument, such as `stacks: { gte: 2 }`. Its bounds are amounts, and the checker resolves the references they make. */
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
   * Returns an argument naming an entry of one of the plugin's data lists by id, as in `arg.entry(DATA.jobs)`. The
   * checker reports an id the list doesn't have.
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
  /** Returns an argument naming one entry of a data list or several, which the implementation gets as a list. The checker reports each as `entry` does. */
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
   * The optional `gte`, `gt`, `lte` and `lt` arguments of a range, as the call's own arguments (`{ job: 'cafe', gte: 3 }`).
   * Spread them into a shape, as in `{ job: arg.entry(DATA.jobs), ...arg.bounds }`.
   *
   * The core checks a call's bounds itself.
   */
  get bounds() {
    const bound = () =>
      makeArg<Amount, Amount, false>({ kind: 'an amount', fits: isAmount, read: (value) => (isAmount(value) ? value : 0) as Amount }, false).optional()
    return { gte: bound(), gt: bound(), lte: bound(), lt: bound() }
  },
}

/**
 * One list of a plugin's data as `list` declares it, such as `list<JobDef>({ noun: 'job', words: { name: true } })`. The
 * type argument is an entry's type.
 */
export type ListSpec<T extends { id: string } = PluginEntry> = {
  /** The noun a problem calls one entry by, as in `unknown job "cafe"`. */
  noun: string
  /** The fields of an entry that are words a player reads, for a translation's `words` table. See `WordShape`. */
  words?: WordShape
  /** An entry's type, for type inference only. It is never set. */
  readonly _entry?: T
}

/** Returns the {@link ListSpec} of one of a plugin's data lists, for `defineData`, with the entry's type, its noun and its words. */
export function list<T extends { id: string }>(spec: { noun: string; words?: WordShape }): ListSpec<T> {
  return spec
}

/**
 * One of a plugin's data lists as `defineData` declares it, kept at `data.<plugin>.<list>`, with its noun, its words and
 * its lookups.
 */
export type DataList<T extends { id: string } = PluginEntry> = {
  /** The id of the plugin whose data the list is. */
  readonly plugin: string
  /** The list's name in the plugin's data, such as `'jobs'` for `data.jobs.jobs`. */
  readonly list: string
  /** The noun a problem calls one entry by. */
  readonly noun: string
  /** The fields of an entry that are words a player reads. */
  readonly words?: WordShape
  /** Returns the game's entries in order. An entry that isn't an object with an id is left out. */
  all(game: Game): T[]
  /** Returns one entry by id, or undefined when the game has none. The id may be anything content wrote. */
  get(game: Game, id: unknown): T | undefined
  /** Returns the reference to one entry by id, which the checker reports as `unknown job "cafe"` when the game has none. */
  ref(id: string): Reference
  /** Returns the references each entry makes, for `references.content`, each reported at `<list> <id>`. */
  content(game: Game, refs: (entry: T) => readonly Reference[]): ContentReferences[]
  /** Returns a problem with one entry, for `check`, reported at `<list> <id>`. */
  problem(id: string, what: string): PluginProblem
}

type EntryOf<L> = L extends ListSpec<infer T> ? T : PluginEntry

/** A plugin's {@link DataList}s as `defineData` declares them, by name. Give them to `definePlugin` as `data`. */
export type PluginData<L extends Readonly<Record<string, ListSpec<any>>> = Readonly<Record<string, ListSpec<any>>>> = {
  readonly [K in keyof L & string]: DataList<EntryOf<L[K]>>
}

/**
 * Returns the {@link PluginData} declaration of a plugin's data lists, each by name with its entry's type, its noun and
 * its word fields.
 *
 * A plugin calls it once, and its lookups, the content checker and the words table read that one declaration.
 *
 * ```ts
 * const DATA = defineData('jobs', { jobs: list<JobDef>({ noun: 'job', words: { name: true } }) })
 * DATA.jobs.all(game)         // JobDef[]
 * DATA.jobs.get(game, 'cafe') // JobDef | undefined
 * arg.entry(DATA.jobs)        // an argument naming a job, checked
 * ```
 *
 * Give it to `definePlugin` as `data`, so the loader reaches each list's words for a translation.
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
