import type { Condition } from './condition.ts'
import type { EffectRef } from './custom.ts'
import type { Game } from './game.ts'
import type { Reference } from './references.ts'
import type { KvValue, GameState, Stats } from './types.ts'
import type { EntityUi, Ui } from './features/ui.ts'
import type { WordShape } from './words.ts'

/**
 * The registry of the traits plugins declare, by trait id, with the data each takes. A plugin augments it to type
 * `declaredTrait` and the `traits` field of entities, kinds and `traits` tables.
 *
 * ```ts
 * declare module '@ifloom/engine' {
 *   interface TraitRegistry {
 *     'laundry/washable': { temp: number; gentle?: boolean }
 *   }
 * }
 * ```
 */
// oxlint-disable-next-line typescript/no-empty-interface, typescript/no-empty-object-type -- plugins augment it; a type alias can't be
export interface TraitRegistry {}

/** The data trait `K` takes, as `TraitRegistry` declares it, or `unknown` for an undeclared id. */
export type TraitData<K extends string> = K extends keyof TraitRegistry ? TraitRegistry[K] : unknown

/**
 * A table of trait data by trait id and then entity, such as `{ 'laundry/washable': { 'clothing:scarf': { temp: 30 } } }`.
 *
 * In content, its rows give entities a trait over the entity's own. On a loaded game, it holds every entity's traits,
 * worked out.
 */
export type TraitTable = { [K in keyof TraitRegistry]?: Record<EntityRef, TraitRegistry[K]> } & Record<string, Record<EntityRef, unknown>>

/** The tools a trait's `check` and `references` get beside the data. */
export type TraitTools = {
  /** The loaded game. */
  game: Game
  /** The entity the data is on. */
  ref: EntityRef
}

/**
 * A trait a plugin declares in its `traits`, a named piece of data entities carry that the plugin gives meaning. The
 * game declares its own in `rules.traits`, with ids that have no `/`.
 *
 * Name `K` to type the data as `TraitRegistry` declares it, as in
 * `const washable: TraitDef<'laundry/washable'> = { id: 'laundry/washable', ... }`.
 */
export type TraitDef<K extends string = string, S = unknown> = {
  /** The trait's id, the plugin's id, `/` and a name, such as `'laundry/washable'`. */
  id: K
  /** Returns the problems with the data on one entity by the plugin's own rules, such as `['a slot needs a name']`. The content checker calls it. */
  check?(data: TraitData<K>, tools: TraitTools): readonly string[]
  /**
   * Returns the references the trait's data makes, such as a slot, a scene or a prose key, for the content checker to
   * resolve.
   *
   * `tools.ref` is the entity the data is on, for a condition that names it as `'$'`.
   */
  references?(data: TraitData<K>, tools: TraitTools): readonly Reference[]
  /**
   * The fields of the data a player reads, for a translation's words table, such as `{ closed: true, body: 'blocks' }`.
   * Each is keyed `entity.<ref>.traits.<id>.<field>`, or under the kind for a kind's default. See `WordShape`.
   */
  words?: WordShape
  /**
   * The trait's own state on each entity, such as the uses left in a torch, with `start` giving its value from the
   * data. The save keeps it only once play writes it.
   *
   * Read it with `traitState` and write it with `setTraitState`.
   */
  state?: { start(data: TraitData<K>): S }
}

/**
 * A kind of entity the game declares in `kinds`, such as the staff of a café or the dishes on its menu. Each entity of
 * the kind has its own stats and kv keys.
 *
 * So a stat declared with `of: 'staff'` belongs to each member of staff, not to the player.
 */
export type KindDef = {
  /** The kind's id, the part before the `:` in each of its entity references. */
  id: string
  /** The kind's label for one entity, as the player reads it, such as "Member of staff". */
  label: string
  /** The kind's label for more than one, such as "Staff". The `label` if left out. */
  plural?: string
  /**
   * The kind's unique mark. True when each entity is one particular thing that can hold others, such as a person, and
   * false when its things stack, such as dishes.
   */
  unique?: boolean
  /**
   * The kind's listing rule for the view, `true`, `false` or a condition asked of each entity with `'$'` as it. A
   * game's kinds are listed if left out, and a plugin's are not.
   */
  listed?: boolean | Condition
  /** The tags every entity of the kind has, before its own `tags`. */
  tags?: string[]
  /**
   * The kind's flags, named conditions asked of each listed entity with `'$'` as it, such as
   * `{ met: { 'cast/met': { character: '$' } } }`. The view answers them in each entity's `flags`.
   */
  flags?: Record<string, Condition>
  /**
   * The default traits of every entity of the kind, by trait id. An entity's own object for a trait is laid over this
   * one field by field, and any other value replaces it whole.
   */
  traits?: { [K in keyof TraitRegistry]?: Partial<TraitRegistry[K]> } & Record<string, unknown>
  /** The ui hints of every entity of the kind, under each entity's own. See `EntityUi`. */
  ui?: Ui<EntityUi>
}

/** An entity the game declares in `entities`, there from the start of the game. Its id is unique within its kind. */
export type EntityDef = {
  /** The entity's id, unique within its kind. */
  id: string
  /** The id of the entity's kind. */
  of: string
  /** The entity's name, as the player reads it, such as "Ana". The engine fills its tokens when it reads it. */
  name: string
  /** The entity's description, a line or two the player reads, with its tokens filled as the name's are. */
  description?: string
  /** The entity's picture, a path in the game's `art/` folder or a URL, read through `artSrc`. */
  image?: string
  /** The entity's tags, after its kind's, which a UI or a plugin can sort or filter it by. */
  tags?: string[]
  /** The entity's visibility condition, asked with `'$'` as it, which narrows its kind's `listed`. Always visible if left out. */
  visible?: Condition
  /** The entity's starting stats, where they differ from each stat's `start`. */
  stats?: Record<string, number>
  /** The entity's starting kv keys. */
  kv?: Record<string, KvValue>
  /**
   * The entity's traits, by trait id, such as `{ 'laundry/washable': { temp: 30 } }`. They go over its kind's and
   * under a content `traits` row for the entity, and an object merges with its kind's field by field.
   */
  traits?: { [K in keyof TraitRegistry]?: Partial<TraitRegistry[K]> } & Record<string, unknown>
  /** The entity's ui hints, laid over its kind's field by field and carried to the view. See `EntityUi`. */
  ui?: Ui<EntityUi>
}

/**
 * The state a save keeps for one entity, only the fields play changed. A declared entity has no record until play
 * changes it, and reads every other field from content.
 */
export type EntityState = {
  /** The name the entity was made with in play. The engine reads a declared entity's name from content. */
  name?: string
  /** The description the entity was made with in play. */
  description?: string
  /** The picture the entity was made with in play. */
  image?: string
  /**
   * The entity the entity was made like. The fields it doesn't have itself (name, description, picture, tags, stats,
   * kv and traits), the engine reads from that one.
   */
  like?: EntityRef
  /** The tags the entity was made with, after its kind's and its `like`'s. */
  tags?: string[]
  /** The trait data the entity was made with, by trait id, over its `like`'s or its kind's. Its traits' state is in `traits`. */
  traitData?: Record<string, unknown>
  /** The entity's stats changed in play, by id. The engine reads the others from its definition, then from the stat's `start`. */
  stats?: Stats
  /** The entity's kv keys set in play. The engine reads the others from its definition. */
  kv?: Record<string, KvValue>
  /** The state of the entity's traits that keep one, by trait id, once play changed it. See `traitState`. */
  traits?: Record<string, unknown>
}

/**
 * A reference to an entity, its kind and its id joined by `:`, such as `'staff:ana'`. A bare id or a typo with no `:`
 * fails to compile where a reference is wanted.
 *
 * Inside an `each` or a `count`'s `where`, content writes `'$'` for the entity being looked at, in fields typed as
 * plain strings.
 */
export type EntityRef = `${string}:${string}`

/**
 * Someone, `'player'`, a unique entity (`'character:ava'`) or `'you'`. `'you'` is whoever the player is playing now,
 * the player unless a `you` effect switched to a protagonist. It's who a `receive` gives a thing to.
 */
export type Someone = EntityRef | typeof PLAYER | typeof YOU

/** The one the player is playing, a protagonist or `'player'`. */
export type Played = EntityRef | typeof PLAYER

/** The id of the player themselves, whoever they are playing. */
export const PLAYER = 'player'

/** The id of whoever the player is playing now, the protagonist the `you` effect last chose or else the player. */
export const YOU = 'you'

/** The reference content writes for the current entity inside an `each` or a `count`'s `where`. */
export const CURRENT = '$'

/** The kind a bare speaker id is read as first: the cast's. */
const SPEAKER_KIND = 'character'

/**
 * Returns the entity a speaker id names, or undefined when it names none. A phrase's arguments are read the same way.
 *
 * A reference (`'character:ava'`, or `'you'` for whoever the player is playing) names itself. A bare id names
 * `character:<id>`, else the one entity the game declares with that id.
 */
export function speakerRef(state: GameState, game: Game, id: string): EntityRef | undefined {
  if (id === YOU) {
    const who = protagonist(state)
    return who === PLAYER ? undefined : (who as EntityRef)
  }
  if (id.includes(':')) return hasEntity(state, game, id) ? (id as EntityRef) : undefined
  const ref = `${SPEAKER_KIND}:${id}` as EntityRef
  if (hasEntity(state, game, ref)) return ref
  const named = (game.entities ?? []).filter((entity) => entity.id === id)
  if (named.length !== 1) return undefined
  const only = `${named[0].of}:${id}` as EntityRef
  return hasEntity(state, game, only) ? only : undefined
}

/** Returns an entity reference such as `'staff:ana'` split into its kind and id, or undefined when the string isn't one. */
export function parseRef(ref: string): { kind: string; id: string } | undefined {
  const at = ref.indexOf(':')
  if (at <= 0 || at === ref.length - 1) return undefined
  return { kind: ref.slice(0, at), id: ref.slice(at + 1) }
}

/** Returns the kind with this id from the game or its plugins, or undefined when none declares it. It also reads a game not yet loaded. */
export function kindOf(game: Pick<Game, 'kinds' | 'plugins'>, id: string): KindDef | undefined {
  return game?.kinds?.find((kind) => kind.id === id) ?? game?.plugins?.flatMap((plugin) => plugin.content?.kinds ?? []).find((kind) => kind.id === id)
}

/** Returns true when the entity's kind is `unique`, so each entity is one particular someone or something. */
export function isUnique(game: Pick<Game, 'kinds' | 'plugins'>, ref: string): boolean {
  const kind = parseRef(ref)?.kind
  return kind !== undefined && kindOf(game, kind)?.unique === true
}

/** Returns whom `'you'` stands for now, the protagonist the `you` effect chose or else `'player'`. */
export function protagonist(state: GameState): Played {
  return state.you ?? PLAYER
}

/** Returns whom an id stands for now, so `'you'` becomes the protagonist or the player. Any other id is returned unchanged. */
export function resolveYou(state: GameState, who: string): string {
  return who === YOU ? protagonist(state) : who
}

/**
 * Returns the entity whose stat or kv key an `of` names, or undefined for the player's. `'you'` is the protagonist, or
 * the player when there is none.
 */
export function ownerOf(state: GameState, of: string | undefined): EntityRef | undefined {
  const who = of === undefined ? PLAYER : of === YOU ? protagonist(state) : of
  return who === PLAYER ? undefined : (who as EntityRef)
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

/** Returns the entity's definition from content, or undefined when the game doesn't declare it. */
export function entityDef(game: Game | undefined, ref: string): EntityDef | undefined {
  return declared(game).byRef.get(ref)
}

/** Returns the record the save keeps for an entity, or undefined when it keeps none. */
function recordOf(state: GameState, ref: string): EntityState | undefined {
  const parts = parseRef(ref)
  return parts ? state.entities?.[parts.kind]?.[parts.id] : undefined
}

/**
 * Returns true when an entity is in the game. A declared entity is in until it is removed, and one made in play is in
 * while the save keeps its record.
 */
export function hasEntity(state: GameState, game: Game | undefined, ref: string): boolean {
  if (recordOf(state, ref)) return true
  return entityDef(game, ref) !== undefined && !(state.removed ?? []).includes(ref)
}

/**
 * Returns the save's record of an entity, or `{}` for a declared one play hasn't changed. Returns undefined when the
 * entity isn't in the game.
 */
export function entityOf(state: GameState, game: Game, ref: string): EntityState | undefined {
  if (!hasEntity(state, game, ref)) return undefined
  return recordOf(state, ref) ?? {}
}

/**
 * Returns every entity of a kind in the game, as references. Declared ones come first in content order, then those
 * made in play in the order they were made.
 */
export function entitiesOf(state: GameState, game: Game, kind: string): EntityRef[] {
  const removed = state.removed ?? []
  const own = declared(game).byKind.get(kind) ?? []
  const first = own.map((entity) => `${kind}:${entity.id}` as EntityRef).filter((ref) => !removed.includes(ref))
  const shown = new Set(first)
  const created = Object.keys(state.entities?.[kind] ?? {})
    .map((id) => `${kind}:${id}` as EntityRef)
    .filter((ref) => !shown.has(ref) && !entityDef(game, ref))
  return [...first, ...created]
}

/** How far a chain of `like`s is followed: further is a loop, read as the end of it. */
const LIKE_DEPTH = 16

/** The entity one was created like, if it was, while the chain is short enough to follow. */
function likeOf(state: GameState, ref: string, depth: number): EntityRef | undefined {
  return depth < LIKE_DEPTH ? recordOf(state, ref)?.like : undefined
}

/**
 * Returns an entity's kept stat as play left it, else as its definition starts it, else as its `like` reads it.
 * Returns undefined when none has it, so the stat's `start` applies.
 */
export function entityStat(state: GameState, game: Game | undefined, ref: string, stat: string): number | undefined {
  return entityStatThrough(state, game, ref, stat, 0)
}

function entityStatThrough(state: GameState, game: Game | undefined, ref: string, stat: string, depth: number): number | undefined {
  const own = recordOf(state, ref)?.stats?.[stat]
  if (own !== undefined) return own
  const declared = entityDef(game, ref)?.stats?.[stat]
  if (declared !== undefined) return declared
  const like = likeOf(state, ref, depth)
  return like !== undefined ? entityStatThrough(state, game, like, stat, depth + 1) : undefined
}

/**
 * Returns an entity's kv store, the keys of its `like` and then its definition's, with the keys play set laid over
 * them.
 */
export function entityKv(state: GameState, game: Game, ref: string): Record<string, KvValue> {
  return entityKvThrough(state, game, ref, 0)
}

function entityKvThrough(state: GameState, game: Game | undefined, ref: string, depth: number): Record<string, KvValue> {
  const like = likeOf(state, ref, depth)
  return { ...(like !== undefined ? entityKvThrough(state, game, like, depth + 1) : undefined), ...entityDef(game, ref)?.kv, ...recordOf(state, ref)?.kv }
}

/** Returns an entity's tags, its kind's, then its `like`'s, then its own, each once. */
export function entityTags(state: GameState, game: Game, ref: string): string[] {
  return entityTagsThrough(state, game, ref, 0)
}

function entityTagsThrough(state: GameState, game: Game, ref: string, depth: number): string[] {
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
 * Returns an entity's name or description before its tokens are filled. It reads the one the entity was made with,
 * then its definition's, then its `like`'s, as `entityImage` does.
 *
 * `entityName` and `entityDescription` return them filled.
 */
export function entityText(state: GameState, game: Game | undefined, ref: string, field: 'name' | 'description'): string | undefined {
  return textThrough(state, game, ref, field, 0)
}

function textThrough(state: GameState, game: Game | undefined, ref: string, field: 'name' | 'description', depth: number): string | undefined {
  const given = recordOf(state, ref)?.[field]
  if (given !== undefined) return given
  const declared = entityDef(game, ref)?.[field]
  if (declared !== undefined) return declared
  const like = likeOf(state, ref, depth)
  return like !== undefined ? textThrough(state, game, like, field, depth + 1) : undefined
}

/** Returns an entity's picture before `artSrc`, the one it was made with, else its definition's, else its `like`'s. */
export function entityImage(state: GameState, game: Game, ref: string): string | undefined {
  return entityImageThrough(state, game, ref, 0)
}

function entityImageThrough(state: GameState, game: Game | undefined, ref: string, depth: number): string | undefined {
  const like = likeOf(state, ref, depth)
  return recordOf(state, ref)?.image ?? entityDef(game, ref)?.image ?? (like !== undefined ? entityImageThrough(state, game, like, depth + 1) : undefined)
}

/**
 * Returns an entity's ui hints, its kind's with its `like`'s and then its definition's laid over them field by field.
 * Returns undefined when none has any.
 */
export function entityUi(state: GameState, game: Game, ref: string): Ui<EntityUi> | undefined {
  const kind = parseRef(ref)?.kind
  const fromKind = kind !== undefined ? kindOf(game, kind)?.ui : undefined
  const own = entityUiThrough(state, game, ref, 0)
  return fromKind && own ? { ...fromKind, ...own } : (own ?? fromKind)
}

function entityUiThrough(state: GameState, game: Game | undefined, ref: string, depth: number): Ui<EntityUi> | undefined {
  const like = likeOf(state, ref, depth)
  const under = like !== undefined ? entityUiThrough(state, game, like, depth + 1) : undefined
  const own = entityDef(game, ref)?.ui
  return under && own ? { ...under, ...own } : (own ?? under)
}

/** The fields an entity is made with in play, a name or a `like` to read it from, and its own tags, traits, stats and kv. */
export type CreatedFields = {
  /** The new entity's name. */
  name?: string
  /** The new entity's description. */
  description?: string
  /** The new entity's picture. */
  image?: string
  /** The entity the new one is made like, which it reads its other fields from. */
  like?: EntityRef
  /** The new entity's own tags. */
  tags?: string[]
  /** The new entity's own trait data, by trait id. */
  traits?: Record<string, unknown>
  /** The new entity's starting stats, by id. */
  stats?: Record<string, number>
  /** The new entity's starting kv keys. */
  kv?: Record<string, KvValue>
}

/** Returns the save's record for an entity made in play, with the fields it was given and none it reads through its `like`. */
export function createdRecord(given: CreatedFields): EntityState {
  const record: EntityState = {}
  if (given.name !== undefined) record.name = given.name
  if (given.description !== undefined) record.description = given.description
  if (given.image !== undefined) record.image = given.image
  if (given.like !== undefined) record.like = given.like
  if (given.tags?.length) record.tags = [...given.tags]
  if (given.traits && Object.keys(given.traits).length) record.traitData = { ...given.traits }
  if (given.stats && Object.keys(given.stats).length) record.stats = { ...given.stats }
  if (given.kv && Object.keys(given.kv).length) record.kv = { ...given.kv }
  return record
}

/** Returns the state with one entity's record replaced. A record for an entity not yet there is added after the rest of its kind. */
export function writeEntity(state: GameState, ref: string, next: EntityState): GameState {
  const parts = parseRef(ref)
  if (!parts) return state
  return {
    ...state,
    entities: { ...state.entities, [parts.kind]: { ...state.entities?.[parts.kind], [parts.id]: next } },
  }
}

/** Returns the state without the record of one entity. */
export function dropRecord(state: GameState, ref: string): GameState {
  const parts = parseRef(ref)
  if (!parts || !state.entities?.[parts.kind]?.[parts.id]) return state
  const { [parts.id]: _gone, ...rest } = state.entities[parts.kind]
  const { [parts.kind]: _kind, ...kinds } = state.entities
  return { ...state, entities: Object.keys(rest).length ? { ...kinds, [parts.kind]: rest } : kinds }
}

/**
 * Returns the problem with naming this stat on this owner, or undefined when there is none. The problems are a kind's
 * stat with no `of`, the player's stat with one, or another kind's stat.
 *
 * `ref` may be `'kind:*'`, standing for any entity of the kind.
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

/** Returns the kind reference an `of` makes, for the content checker, or an empty list when `of` is missing or `'$'`. */
export function ofKind(ref: string | undefined): Reference[] {
  const parts = ref === undefined ? undefined : parseRef(ref)
  return parts ? [{ kind: parts.kind }] : []
}

/** Returns a stand-in reference for any entity of a kind, for checking content written with `'$'` before it runs. */
export function anyOf(kind: string): EntityRef {
  return `${kind}:*`
}

/** An `each` effect, a `count` condition or a `create`'s effects: each binds `'$'` for itself. */
function ownsCurrent(node: object): boolean {
  return 'count' in node || 'each' in node || 'create' in node
}

/** Where a call's arguments are: a short call's `{ 'cast/met': { … } }`, or a long call's or a value's `with`. */
function holdsArgs(key: string): boolean {
  return key === 'with' || key.includes('/')
}

/** The fields that name an entity or someone, where `'$'` is bound: `of`, `entity` and `like`, the `remove`, `you`, `receive`, `release` and `owned` calls' own, and their `to` and `from`. */
function namesOne(node: object, key: string): boolean {
  if (key === 'of' || key === 'entity' || key === 'like' || key === 'remove' || key === 'you') return true
  if (key === 'receive' || key === 'release' || key === 'owned') return true
  return (key === 'from' || key === 'to') && ('receive' in node || 'release' in node)
}

/**
 * Returns a condition or effects with `ref` in place of each `'$'`. A nested `each`'s effects and a nested `count`'s
 * `where` keep their own `'$'`.
 *
 * It replaces `'$'` in every `of`, `entity` and `like`, in a `remove`, `you`, `receive`, `release` or `owned`'s
 * target, in a `receive`'s `to` and a `release`'s `from`, and anywhere in a call's arguments or a `create`'s `with`
 * (`{ 'cast/met': { character: '$' } }`).
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

/** The parts of a game its traits are worked out from, its kinds, its entities and its `traits` table. */
export type TraitSource = Pick<Game, 'kinds' | 'entities' | 'traits'>

/** A kind's default for a trait, for an entity of that kind. */
function kindTrait(game: TraitSource, ref: string, id: string): unknown {
  const kind = parseRef(ref)?.kind
  return kind === undefined ? undefined : game.kinds?.find((entry) => entry.id === kind)?.traits?.[id]
}

const traitCache = new WeakMap<object, Record<string, Record<EntityRef, unknown>>>()

/**
 * Returns every trait on every entity that has it, by trait id and then entity. Each is a `traits` table row, or else
 * the entity's own, laid over its kind's default.
 *
 * Declared entities come first in content order, then table rows for entities no one declares, which the checker
 * reports. Working it out again from its own result gives the same, so a loaded game reads the same through here.
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
    const ref = `${entity.of}:${entity.id}` as EntityRef
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
      if (!out[id] || !Object.hasOwn(out[id], ref)) put(id, ref as EntityRef, layTrait(kindTrait(game, ref as EntityRef, id), value))
    }
  }
  traitCache.set(game, out)
  return out
}

/**
 * Returns the data of one trait on one entity from content alone, typed by `TraitRegistry`, or undefined when it lacks
 * the trait. Use it for a check, or anywhere with no state.
 *
 * A row in a content `traits` table wins, then the entity's own `traits`, each laid over its kind's default. An entity
 * made in play gets its kind's default here, and `traitOf` adds the data it was made with. It doesn't ask whether the
 * entity is still in the game.
 */
export function declaredTrait<K extends string>(game: TraitSource, ref: string, id: K): TraitData<K> | undefined {
  const table = resolveTraits(game)[id]
  if (table && Object.hasOwn(table, ref)) return (table as Record<string, unknown>)[ref] as TraitData<K>
  return kindTrait(game, ref, id) as TraitData<K> | undefined
}

/**
 * Returns the data of one trait on one entity in play, typed by `TraitRegistry`, or undefined when it lacks the trait.
 *
 * A declared entity reads as `declaredTrait` does. An entity made in play reads the trait data it was made with, laid
 * over its `like`'s, or else over its kind's default.
 */
export function traitOf<K extends string>(state: GameState, game: Game, ref: string, id: K): TraitData<K> | undefined {
  return traitThrough(state, game, ref, id, 0) as TraitData<K> | undefined
}

function traitThrough(state: GameState, game: Game | undefined, ref: string, id: string, depth: number): unknown {
  if (!game) return undefined
  const record = recordOf(state, ref)
  if (!record || entityDef(game, ref)) return declaredTrait(game, ref, id)
  const like = likeOf(state, ref, depth)
  const under = like !== undefined ? traitThrough(state, game, like, id, depth + 1) : kindTrait(game, ref, id)
  return layTrait(under, record.traitData?.[id])
}

/** Returns every declared entity that has a trait, as references in content order. It reads content alone, as `declaredTrait` does. */
export function declaredWithTrait(game: TraitSource, id: string): EntityRef[] {
  const declaredRefs = declared(game as Game).byRef
  return Object.keys(resolveTraits(game)[id] ?? {}).filter((ref) => declaredRefs.has(ref)) as EntityRef[]
}

/**
 * Returns every entity in the game that has a trait, as references. Declared ones not removed come first in content
 * order, then those made in play with their kind's, their `like`'s or their own trait.
 */
export function withTrait(state: GameState, game: Game, id: string): EntityRef[] {
  const declaredRefs = declared(game).byRef
  const own = declaredWithTrait(game, id)
  return everyEntity(state, game).filter((ref) => (declaredRefs.has(ref) ? own.includes(ref) : traitOf(state, game, ref, id) !== undefined))
}

/**
 * Returns every entity in the game, as references. Declared ones not removed come first in content order, then those
 * made in play, kind by kind in the order each kind first had one.
 */
export function everyEntity(state: GameState, game: Game | undefined): EntityRef[] {
  const removed = new Set(state.removed ?? [])
  const first = (game?.entities ?? []).map((entity) => `${entity.of}:${entity.id}` as EntityRef).filter((ref) => !removed.has(ref))
  const created = Object.entries(state.entities ?? {}).flatMap(([kind, byId]) =>
    Object.keys(byId ?? {})
      .map((id) => `${kind}:${id}` as EntityRef)
      .filter((ref) => !entityDef(game, ref)),
  )
  return [...first, ...created]
}

/** Returns the trait with this id, a plugin's or, for an id with no `/`, the game's own in `rules.traits`. Returns undefined when none declares it. */
export function traitDef(game: Pick<Game, 'plugins' | 'rules'> | undefined, id: string): TraitDef<string, unknown> | undefined {
  const at = id.indexOf('/')
  if (at < 0) return game?.rules?.traits?.find((trait) => trait.id === id)
  if (at === 0) return undefined
  const plugin = game?.plugins?.find((entry) => entry.id === id.slice(0, at))
  return plugin?.traits?.find((trait) => trait.id === id)
}

/**
 * Returns the state one entity keeps for one of its traits, the value play last wrote or else the trait's
 * `state.start`.
 *
 * It returns undefined when the entity isn't in the game, lacks the trait, or the trait keeps no state.
 */
export function traitState<S = unknown>(state: GameState, game: Game, ref: string, id: string): S | undefined {
  if (!hasEntity(state, game, ref)) return undefined
  const kept = recordOf(state, ref)?.traits
  if (kept && Object.hasOwn(kept, id)) return kept[id] as S
  const data = traitOf(state, game, ref, id)
  if (data === undefined) return undefined
  return traitDef(game, id)?.state?.start(data) as S | undefined
}

/** Returns the state with one entity's state for one trait replaced. The state is unchanged for an entity not in the game. */
export function setTraitState(state: GameState, game: Game, ref: string, id: string, next: unknown): GameState {
  if (!hasEntity(state, game, ref)) return state
  const record = recordOf(state, ref) ?? {}
  return writeEntity(state, ref, { ...record, traits: { ...record.traits, [id]: next } })
}
