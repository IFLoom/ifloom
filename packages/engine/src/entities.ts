import type { Condition } from './condition.ts'
import type { EffectRef } from './custom.ts'
import type { Game } from './game.ts'
import type { Reference } from './references.ts'
import type { KvValue, GameState, Stats } from './types.ts'

/**
 * The traits plugins give meaning to, by trait id, with the data each one
 * takes. Empty here: a plugin adds its own by augmenting it, which types
 * `traitOf` and the `traits` an entity, a kind or content writes.
 *
 * ```ts
 * declare module '@ifloom/engine' {
 *   interface Traits {
 *     'laundry/washable': { temp: number; gentle?: boolean }
 *   }
 * }
 * ```
 */
// oxlint-disable-next-line typescript/no-empty-interface, typescript/no-empty-object-type -- plugins augment it; a type alias can't be
export interface Traits {}

/** The data a trait takes: what `Traits` says for an id a plugin declared, and `unknown` for any other. */
export type TraitData<K extends string> = K extends keyof Traits ? Traits[K] : unknown

/**
 * A trait's data on the entities that have it, by trait id and then entity:
 * `{ 'laundry/washable': { 'clothing:scarf': { temp: 30 } } }`. In
 * content, rows that give an entity a trait, over what it declares itself;
 * on a loaded game, every entity's traits, worked out.
 */
export type TraitTable = { [K in keyof Traits]?: Record<EntityRef, Traits[K]> } & Record<string, Record<EntityRef, unknown>>

/** What a trait's `check` is handed beside the data: the game, and the entity the data is on. */
export type TraitTools = { game: Game; ref: EntityRef }

/**
 * A trait a plugin declares, in its `traits`: a named piece of data entities
 * carry, which the plugin gives meaning. Its id is the plugin's own id, `/`
 * and a name. Name `K` to have the data typed, as `Traits` says for it:
 * `const washable: TraitDef<'laundry/washable'> = { id: 'laundry/washable', ... }`.
 */
export type TraitDef<K extends string = string, S = unknown> = {
  id: K
  /** What is wrong with the data on one entity, by a rule of the plugin's own: `['a slot needs a name']`. Asked by the content checker. */
  check?(data: TraitData<K>, tools: TraitTools): readonly string[]
  /** What the data names, for the content checker to resolve: a slot, a scene, a prose key. */
  references?(data: TraitData<K>): readonly Reference[]
  /**
   * For the rare trait that keeps state of its own on each entity, such as
   * the uses left in a torch: where it starts, from the entity's data. Read
   * with `traitState` and written with `setTraitState`; the save keeps it
   * only once it is written.
   */
  state?: { start(data: TraitData<K>): S }
}

/**
 * A kind of thing the game keeps several of, each with its own stats and
 * kv keys: the staff of a café, the dishes on its menu, the rooms of a
 * house. A stat declared with `of: 'staff'` belongs to every member of staff
 * rather than to the player.
 */
export type KindDef = {
  id: string
  /** What the player reads for one: "Member of staff". */
  label: string
  /** For more than one: "Staff". The label if left out. */
  plural?: string
  /** Each one is one particular thing, such as a person, rather than a sort of thing, such as a dish. */
  unique?: boolean
  /**
   * Whether the view lists the kind's entities: `true`, `false`, or a
   * condition asked for each, with `'$'` as that one. A game's own kinds are
   * listed if left out; a plugin's are not, unless the plugin says.
   */
  listed?: boolean | Condition
  /** Words every one of the kind has, before its own `tags`. */
  tags?: string[]
  /**
   * Named conditions asked for each listed entity, with `'$'` as that one,
   * for the view's `marks`: `{ met: { 'cast/met': { character: '$' } } }`.
   */
  marks?: Record<string, Condition>
  /**
   * Traits every one of the kind has, by trait id: defaults its entities
   * start from. Where an entity gives the same trait, an object here is laid
   * under the entity's, field by field; anything else is replaced whole.
   */
  traits?: { [K in keyof Traits]?: Partial<Traits[K]> } & Record<string, unknown>
}

/** One thing of a kind, as content declares it: there from the start of the game. */
export type EntityDef = {
  /** Unique within its kind. */
  id: string
  /** Its kind's id. */
  of: string
  /** What the player reads: "Ana". Prose tokens are filled in when it is read. */
  name: string
  /** A line or two about it, tokens filled in as for the name. */
  desc?: string
  /** Its picture, through `artSrc`. */
  image?: string
  /** Words a UI or a plugin can sort or pick it by, after its kind's. */
  tags?: string[]
  /** Whether the view lists it, asked with `'$'` as it. Always, if left out. */
  visible?: Condition
  /** Where its stats start, where they differ from each stat's `start`. */
  stats?: Record<string, number>
  /** Its kv keys at the start. */
  kv?: Record<string, KvValue>
  /**
   * Who holds it at the start: a holder (`'player'`, or a unique entity such
   * as `'character:ava'`) for one, or how many each holds:
   * `{ player: 2, 'place:larder': 6 }`. Held by nobody if left out.
   */
  at?: Placement
  /**
   * Its traits, by trait id: `{ 'laundry/washable': { temp: 30 } }`.
   * Over its kind's, and under a row for it in content's `traits` table.
   */
  traits?: { [K in keyof Traits]?: Traits[K] } & Record<string, unknown>
}

/**
 * What play has changed about one entity, as the save keeps it. A declared
 * entity has no record until something changes it, and reads the rest from
 * its declaration; one created in play keeps the name it was given.
 */
export type EntityState = {
  /** The name it was created with. A declared entity's name is read from content. */
  name?: string
  /** The description it was created with, as written. */
  desc?: string
  /** The picture it was created with, as written. */
  image?: string
  /**
   * The entity it was created like: what it doesn't have itself (its name,
   * description, picture, tags, stats, kv and traits) is read from that one.
   */
  like?: EntityRef
  /** Tags it was created with, after its kind's and its `like`'s. */
  tags?: string[]
  /** Trait data it was created with, by trait id, over its `like`'s or its kind's. Its traits' state is in `traits`. */
  traitData?: Record<string, unknown>
  /** Stats changed in play, by id. Others read from the declaration, then the stat's `start`. */
  stats?: Stats
  /** kv keys set in play. Others read from the declaration. */
  kv?: Record<string, KvValue>
  /** The state of its traits that keep one, by trait id, once play changed it. See `traitState`. */
  traits?: Record<string, unknown>
}

/**
 * Which entity, as content names it: `'staff:ana'`, its kind and its id. Inside
 * an `each` or a `count`'s `where`, `'$'` is the one being looked at.
 */
export type EntityRef = string

/**
 * Who holds things: `'player'`, a unique entity (`'character:ava'`), or
 * `'you'`, whoever the player is playing now (the player, unless a `you`
 * effect switched to a protagonist).
 */
export type Holder = string

/** Where a thing is placed: one holder for one of it, or how many each holder has. */
export type Placement = Holder | Record<Holder, number>

/** The player as a holder: what is theirs whoever they are playing. */
export const PLAYER = 'player'

/** Whoever the player is playing now: the protagonist the `you` effect last chose, or the player. */
export const YOU = 'you'

/** The current entity inside `each` and `where`. */
export const CURRENT = '$'

/** Split `'staff:ana'` into its kind and id; undefined if it is not one. */
export function parseRef(ref: EntityRef): { kind: string; id: string } | undefined {
  const at = ref.indexOf(':')
  if (at <= 0 || at === ref.length - 1) return undefined
  return { kind: ref.slice(0, at), id: ref.slice(at + 1) }
}

export function kindById(game: Game, id: string): KindDef | undefined {
  return game.kinds?.find((kind) => kind.id === id)
}

/** A kind the game or one of its plugins declares: a game that isn't loaded yet has its plugins' kinds only on them. */
export function kindOf(game: Pick<Game, 'kinds' | 'plugins'> | undefined, id: string): KindDef | undefined {
  return game?.kinds?.find((kind) => kind.id === id) ?? game?.plugins?.flatMap((plugin) => plugin.kinds ?? []).find((kind) => kind.id === id)
}

/** Whether an entity's kind is `unique`: each one is one particular thing, which can hold others. */
export function isUnique(game: Pick<Game, 'kinds' | 'plugins'> | undefined, ref: EntityRef): boolean {
  const kind = parseRef(ref)?.kind
  return kind !== undefined && kindOf(game, kind)?.unique === true
}

/** Who `'you'` is now: the protagonist the `you` effect chose, or `'player'` when none was. */
export function protagonist(state: GameState): Holder {
  return state.you ?? PLAYER
}

/** A holder as content writes it, made real: `'you'` is the protagonist, or the player. */
export function resolveHolder(state: GameState, holder: Holder): Holder {
  return holder === YOU ? protagonist(state) : holder
}

/**
 * Whose stat or kv key an `of` names: an entity's reference, or undefined
 * for the player's. `'you'` is the protagonist, or the player when there is
 * none; `'player'` is the player.
 */
export function ownerOf(state: GameState, of: string | undefined): EntityRef | undefined {
  const who = of === undefined ? PLAYER : resolveHolder(state, of)
  return who === PLAYER ? undefined : who
}

/** The declared entities, by reference and by kind in content order, worked out once per list. */
type Declared = { byRef: Map<string, EntityDef>; byKind: Map<string, EntityDef[]> }
const declaredCache = new WeakMap<readonly EntityDef[], Declared>()
const NONE: Declared = { byRef: new Map(), byKind: new Map() }

function declared(game: Game | undefined): Declared {
  const list = game?.entities
  if (!list) return NONE
  let found = declaredCache.get(list)
  if (!found) {
    found = { byRef: new Map(), byKind: new Map() }
    for (const entity of list) {
      found.byRef.set(`${entity.of}:${entity.id}`, entity)
      found.byKind.set(entity.of, [...(found.byKind.get(entity.of) ?? []), entity])
    }
    declaredCache.set(list, found)
  }
  return found
}

/** The declaration of an entity the game has, if it declares it. */
export function entityDef(game: Game | undefined, ref: EntityRef): EntityDef | undefined {
  return declared(game).byRef.get(ref)
}

/** The record the save keeps for an entity, if any. */
function recordOf(state: GameState, ref: EntityRef): EntityState | undefined {
  const parts = parseRef(ref)
  return parts ? state.entities?.[parts.kind]?.[parts.id] : undefined
}

/**
 * Whether an entity is in the game: one created in play while the save keeps
 * its record, one declared unless it was removed.
 */
export function hasEntity(state: GameState, game: Game | undefined, ref: EntityRef): boolean {
  if (recordOf(state, ref)) return true
  return entityDef(game, ref) !== undefined && !(state.removed ?? []).includes(ref)
}

/**
 * What play has changed about an entity: the save's record of it, `{}` for
 * a declared one nothing has changed. Undefined when it isn't in the game.
 */
export function entityOf(state: GameState, game: Game | undefined, ref: EntityRef): EntityState | undefined {
  if (!hasEntity(state, game, ref)) return undefined
  return recordOf(state, ref) ?? {}
}

/**
 * Every entity of a kind in the game, as references: the declared ones in
 * the order content gives them, then the ones created in play, in the order
 * they came.
 */
export function entitiesOf(state: GameState, game: Game | undefined, kind: string): EntityRef[] {
  const removed = state.removed ?? []
  const own = declared(game).byKind.get(kind) ?? []
  const first = own.map((entity) => `${kind}:${entity.id}`).filter((ref) => !removed.includes(ref))
  const shown = new Set(first)
  const created = Object.keys(state.entities?.[kind] ?? {})
    .map((id) => `${kind}:${id}`)
    .filter((ref) => !shown.has(ref) && !entityDef(game, ref))
  return [...first, ...created]
}

/** How far a chain of `like`s is followed: further is a loop, read as the end of it. */
const LIKE_DEPTH = 16

/** The entity one was created like, if it was, while the chain is short enough to follow. */
function likeOf(state: GameState, ref: EntityRef, depth: number): EntityRef | undefined {
  return depth < LIKE_DEPTH ? recordOf(state, ref)?.like : undefined
}

/**
 * An entity's kept stat, as play left it, else as the one it was created
 * `like` reads it, else as its declaration starts it. Undefined when none has
 * it: the stat's `start` then.
 */
export function entityStat(state: GameState, game: Game | undefined, ref: EntityRef, stat: string): number | undefined {
  return entityStatThrough(state, game, ref, stat, 0)
}

function entityStatThrough(state: GameState, game: Game | undefined, ref: EntityRef, stat: string, depth: number): number | undefined {
  const own = recordOf(state, ref)?.stats?.[stat]
  if (own !== undefined) return own
  const like = likeOf(state, ref, depth)
  return (like !== undefined ? entityStatThrough(state, game, like, stat, depth + 1) : undefined) ?? entityDef(game, ref)?.stats?.[stat]
}

/**
 * An entity's kv store as it reads: the keys of the one it was created
 * `like`, then its declaration's, with what play set laid over them.
 */
export function entityKv(state: GameState, game: Game | undefined, ref: EntityRef): Record<string, KvValue> {
  return entityKvThrough(state, game, ref, 0)
}

function entityKvThrough(state: GameState, game: Game | undefined, ref: EntityRef, depth: number): Record<string, KvValue> {
  const like = likeOf(state, ref, depth)
  return { ...(like !== undefined ? entityKvThrough(state, game, like, depth + 1) : undefined), ...entityDef(game, ref)?.kv, ...recordOf(state, ref)?.kv }
}

/** An entity's tags: its kind's, then those of the one it was created `like`, then its own, each once. */
export function entityTags(state: GameState, game: Game, ref: EntityRef): string[] {
  return entityTagsThrough(state, game, ref, 0)
}

function entityTagsThrough(state: GameState, game: Game, ref: EntityRef, depth: number): string[] {
  const kind = parseRef(ref)?.kind
  const like = likeOf(state, ref, depth)
  const own = [
    ...((kind !== undefined ? kindOf(game, kind)?.tags : undefined) ?? []),
    ...(like !== undefined ? entityTagsThrough(state, game, like, depth + 1) : []),
    ...(entityDef(game, ref)?.tags ?? []),
    ...(recordOf(state, ref)?.tags ?? []),
  ]
  return [...new Set(own)]
}

/**
 * An entity's name or description as written, before its tokens are filled:
 * what it was created with, then what the one it was created `like`
 * has, then its declaration's. `entityName` and `entityDesc` fill them.
 */
export function entityText(state: GameState, game: Game | undefined, ref: EntityRef, field: 'name' | 'desc'): string | undefined {
  return textThrough(state, game, ref, field, 0)
}

function textThrough(state: GameState, game: Game | undefined, ref: EntityRef, field: 'name' | 'desc', depth: number): string | undefined {
  const given = recordOf(state, ref)?.[field]
  if (given !== undefined) return given
  const like = likeOf(state, ref, depth)
  return (like !== undefined ? textThrough(state, game, like, field, depth + 1) : undefined) ?? entityDef(game, ref)?.[field]
}

/** An entity's picture as written (before `artSrc`): the one it was created with, its declaration's, else that of the one it was created `like`. */
export function entityImage(state: GameState, game: Game | undefined, ref: EntityRef): string | undefined {
  return entityImageThrough(state, game, ref, 0)
}

function entityImageThrough(state: GameState, game: Game | undefined, ref: EntityRef, depth: number): string | undefined {
  const like = likeOf(state, ref, depth)
  return recordOf(state, ref)?.image ?? entityDef(game, ref)?.image ?? (like !== undefined ? entityImageThrough(state, game, like, depth + 1) : undefined)
}

/** What an entity is created with: a name or a `like` to read it from, and its own tags, traits, stats and kv. */
export type CreatedFields = {
  name?: string
  desc?: string
  image?: string
  like?: EntityRef
  tags?: string[]
  traits?: Record<string, unknown>
  stats?: Record<string, number>
  kv?: Record<string, KvValue>
}

/** A new record for an entity created in play: what it was given, and nothing it reads through its `like`. */
export function createdRecord(given: CreatedFields): EntityState {
  const record: EntityState = {}
  if (given.name !== undefined) record.name = given.name
  if (given.desc !== undefined) record.desc = given.desc
  if (given.image !== undefined) record.image = given.image
  if (given.like !== undefined) record.like = given.like
  if (given.tags?.length) record.tags = [...given.tags]
  if (given.traits && Object.keys(given.traits).length) record.traitData = { ...given.traits }
  if (given.stats && Object.keys(given.stats).length) record.stats = { ...given.stats }
  if (given.kv && Object.keys(given.kv).length) record.kv = { ...given.kv }
  return record
}

/** The state with one entity's record replaced. A record for an entity not there adds it, after the rest of its kind. */
export function writeEntity(state: GameState, ref: EntityRef, next: EntityState): GameState {
  const parts = parseRef(ref)
  if (!parts) return state
  return {
    ...state,
    entities: { ...state.entities, [parts.kind]: { ...state.entities?.[parts.kind], [parts.id]: next } },
  }
}

/** The state without the record of one entity. */
export function dropRecord(state: GameState, ref: EntityRef): GameState {
  const parts = parseRef(ref)
  if (!parts || !state.entities?.[parts.kind]?.[parts.id]) return state
  const { [parts.id]: _gone, ...rest } = state.entities[parts.kind]
  const { [parts.kind]: _kind, ...kinds } = state.entities
  return { ...state, entities: Object.keys(rest).length ? { ...kinds, [parts.kind]: rest } : kinds }
}

/**
 * What is wrong with naming this stat on this owner, for the loader: a
 * kind's stat with no `of`, the player's stat with one, or another kind's.
 * `ref` may be `'kind:*'`, standing for any one of the kind.
 */
export function statOwnerProblem(owner: string | undefined, stat: string, ref: string | undefined): string | undefined {
  // Whoever is played: the player or a protagonist of any kind, so either owner can be meant.
  if (ref === YOU) return undefined
  if (ref === PLAYER) ref = undefined
  if (ref === undefined) return owner === undefined ? undefined : `stat "${stat}" belongs to ${owner}: say whose with "of"`
  if (owner === undefined) return `stat "${stat}" is the player's, not ${ref}'s`
  const kind = parseRef(ref)?.kind
  return kind !== undefined && kind !== owner ? `stat "${stat}" belongs to ${owner}, not ${kind}` : undefined
}

/** The kind an `of` names, as a reference, when it names one rather than `'$'`. */
export function ofKind(ref: string | undefined): Reference[] {
  const parts = ref === undefined ? undefined : parseRef(ref)
  return parts ? [{ kind: parts.kind }] : []
}

/** Any one of a kind, for checking content written with `'$'` before it runs. */
export function anyOf(kind: string): EntityRef {
  return `${kind}:*`
}

/** An `each` effect or a `count` condition: it binds `'$'` for what it holds. */
function ownsCurrent(node: object): boolean {
  return 'count' in node || ('kind' in node && node.kind === 'each')
}

/** Where a call's arguments are: a short call's `{ 'cast/met': { … } }`, or a long call's or a value's `with`. */
function holdsArgs(key: string): boolean {
  return key === 'with' || key.includes('/')
}

/** The fields that name an entity or a holder, where `'$'` is bound: `of`, `entity`, `at` and `like`, and a `move`'s or a `you` effect's `from` and `to`. */
function namesOne(node: object, key: string): boolean {
  if (key === 'of' || key === 'entity' || key === 'at' || key === 'like') return true
  return (key === 'from' || key === 'to') && 'kind' in node && (node.kind === 'move' || node.kind === 'you')
}

/**
 * Put a real reference where content wrote `'$'`: in every `of`, `entity`,
 * `at` and `like` of a condition or an effect list, a `move`'s `from` and
 * `to`, and anywhere in a plugin or custom call's arguments
 * (`{ 'cast/met': { character: '$' } }`). A nested `each`'s effects and a
 * nested `count`'s `where` are left alone: their `'$'` is their own.
 */
export function bindCurrent<T extends Condition | EffectRef | readonly EffectRef[] | undefined>(value: T, ref: EntityRef): T {
  const walk = (node: unknown, inArgs: boolean): unknown => {
    if (inArgs && node === CURRENT) return ref
    if (Array.isArray(node)) return node.map((child) => walk(child, inArgs))
    if (node === null || typeof node !== 'object') return node
    const out: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(node)) {
      if (namesOne(node, key) && child === CURRENT) out[key] = ref
      else if (ownsCurrent(node) && (key === 'effects' || key === 'where')) out[key] = child
      // A `count`'s selection: what it names is bound, its `where` is its own.
      else if (key === 'count' && isRecord(child)) {
        const { where, ...picked } = child
        out[key] = { ...(walk(picked, inArgs) as object), ...(where !== undefined ? { where } : {}) }
      } else out[key] = walk(child, inArgs || holdsArgs(key))
    }
    return out
  }
  return walk(value, false) as T
}

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)

/** A trait's data laid over a kind's default: field by field when both are objects, otherwise the one on top. */
function layTrait(under: unknown, over: unknown): unknown {
  if (over === undefined) return under
  return isRecord(under) && isRecord(over) ? { ...under, ...over } : over
}

/** What a game's traits are worked out from: its kinds, its entities and its `traits` table. */
type TraitSource = Pick<Game, 'kinds' | 'entities' | 'traits'>

/** A kind's default for a trait, for an entity of that kind. */
function kindTrait(game: TraitSource, ref: EntityRef, id: string): unknown {
  const kind = parseRef(ref)?.kind
  return kind === undefined ? undefined : game.kinds?.find((entry) => entry.id === kind)?.traits?.[id]
}

const traitCache = new WeakMap<object, Record<string, Record<EntityRef, unknown>>>()

/**
 * Every trait on every entity that has it, by trait id and then entity: a
 * row in the `traits` table, or else the entity's own, laid over its kind's
 * default. Declared entities first, in content order, then table rows for
 * entities nobody declares, which the checker reports. Working it out again
 * from its own result gives the same, so a loaded game, whose `traits`
 * already holds it, reads the same through here.
 */
export function resolveTraits(game: TraitSource): Record<string, Record<EntityRef, unknown>> {
  let out = traitCache.get(game)
  if (out) return out
  out = {}
  const rows = (game.traits ?? {}) as Record<string, Record<EntityRef, unknown>>
  const put = (id: string, ref: EntityRef, value: unknown) => {
    if (value !== undefined) (out![id] ??= {})[ref] = value
  }
  const rowFor = (id: string, ref: EntityRef) => (rows[id] && Object.hasOwn(rows[id], ref) ? rows[id][ref] : undefined)
  for (const entity of game.entities ?? []) {
    const ref = `${entity.of}:${entity.id}`
    const kind = game.kinds?.find((entry) => entry.id === entity.of)
    const ids = new Set([
      ...Object.keys(kind?.traits ?? {}),
      ...Object.keys(entity.traits ?? {}),
      ...Object.keys(rows).filter((id) => rowFor(id, ref) !== undefined),
    ])
    for (const id of ids) put(id, ref, layTrait(kind?.traits?.[id], rowFor(id, ref) ?? entity.traits?.[id]))
  }
  for (const [id, byRef] of Object.entries(rows)) {
    for (const [ref, value] of Object.entries(byRef ?? {})) {
      if (!out[id] || !Object.hasOwn(out[id], ref)) put(id, ref, layTrait(kindTrait(game, ref, id), value))
    }
  }
  traitCache.set(game, out)
  return out
}

/**
 * The data of one trait on one entity, as content gives it, typed as
 * `Traits` says for the id; undefined when it doesn't have it. A row in
 * content's `traits` table wins, then the entity's own `traits`, each laid
 * over its kind's default. It reads content only: an entity created in play
 * has its kind's here, and `entityTrait` adds what it was created with. It
 * doesn't ask whether the entity is still in the game.
 */
export function traitOf<K extends string>(game: TraitSource | undefined, ref: EntityRef, id: K): TraitData<K> | undefined {
  if (!game) return undefined
  const table = resolveTraits(game)[id]
  if (table && Object.hasOwn(table, ref)) return table[ref] as TraitData<K>
  return kindTrait(game, ref, id) as TraitData<K> | undefined
}

/**
 * The data of one trait on one entity as play reads it: `traitOf` for a
 * declared entity; for one created in play, the trait data it was created
 * with laid over that of the one it was created `like` (or else its kind's
 * default). Undefined when it doesn't have the trait.
 */
export function entityTrait<K extends string>(state: GameState, game: Game | undefined, ref: EntityRef, id: K): TraitData<K> | undefined {
  return traitThrough(state, game, ref, id, 0) as TraitData<K> | undefined
}

function traitThrough(state: GameState, game: Game | undefined, ref: EntityRef, id: string, depth: number): unknown {
  if (!game) return undefined
  const record = recordOf(state, ref)
  if (!record || entityDef(game, ref)) return traitOf(game, ref, id)
  const like = likeOf(state, ref, depth)
  const under = like !== undefined ? traitThrough(state, game, like, id, depth + 1) : kindTrait(game, ref, id)
  return layTrait(under, record.traitData?.[id])
}

/**
 * Every entity that has a trait, as references. Given only the game, the
 * declared ones, in content order. Given a state too, every one in the game
 * as play reads it: declared ones not removed, then those created in play
 * (with their kind's trait, their `like`'s or their own).
 */
export function withTrait(game: TraitSource | undefined, id: string, state?: GameState): EntityRef[] {
  if (!game) return []
  const declaredRefs = declared(game as Game).byRef
  const own = Object.keys(resolveTraits(game)[id] ?? {}).filter((ref) => declaredRefs.has(ref))
  if (!state) return own
  return everyEntity(state, game as Game).filter((ref) => (declaredRefs.has(ref) ? own.includes(ref) : entityTrait(state, game as Game, ref, id) !== undefined))
}

/**
 * Every entity in the game, as references: the declared ones in content
 * order (but those removed), then those created in play, kind by kind in the
 * order each kind first had one, each kind's in the order they came.
 */
export function everyEntity(state: GameState, game: Game | undefined): EntityRef[] {
  const removed = new Set(state.removed ?? [])
  const first = (game?.entities ?? []).map((entity) => `${entity.of}:${entity.id}`).filter((ref) => !removed.has(ref))
  const created = Object.entries(state.entities ?? {}).flatMap(([kind, byId]) =>
    Object.keys(byId ?? {})
      .map((id) => `${kind}:${id}`)
      .filter((ref) => !entityDef(game, ref)),
  )
  return [...first, ...created]
}

/** The trait a plugin of the game declares by this id, if any. */
export function traitDef(game: Pick<Game, 'plugins'> | undefined, id: string): TraitDef<string, unknown> | undefined {
  const at = id.indexOf('/')
  if (at <= 0) return undefined
  const plugin = game?.plugins?.find((entry) => entry.id === id.slice(0, at))
  return plugin?.traits?.find((trait) => trait.id === id)
}

/**
 * The state one entity keeps for one of its traits: what play last wrote,
 * or else where the trait's `state.start` says it starts. Undefined when the
 * entity isn't in the game, lacks the trait, or the trait keeps no state.
 */
export function traitState<S = unknown>(state: GameState, game: Game, ref: EntityRef, id: string): S | undefined {
  if (!hasEntity(state, game, ref)) return undefined
  const kept = recordOf(state, ref)?.traits
  if (kept && Object.hasOwn(kept, id)) return kept[id] as S
  const data = entityTrait(state, game, ref, id)
  if (data === undefined) return undefined
  return traitDef(game, id)?.state?.start(data) as S | undefined
}

/** The state with one entity's state for one trait replaced. An entity not in the game is left alone. */
export function setTraitState(state: GameState, game: Game, ref: EntityRef, id: string, next: unknown): GameState {
  if (!hasEntity(state, game, ref)) return state
  const record = recordOf(state, ref) ?? {}
  return writeEntity(state, ref, { ...record, traits: { ...record.traits, [id]: next } })
}
