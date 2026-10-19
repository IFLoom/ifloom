import type { Condition } from './condition.ts'
import type { EffectRef } from './custom.ts'
import type { Game } from './game.ts'
import type { Reference } from './references.ts'
import type { KvValue, GameState, Stats } from './types.ts'

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
}

/**
 * What play has changed about one entity, as the save keeps it. A declared
 * entity has no record until something changes it, and reads the rest from
 * its declaration; one created in play keeps the name it was given.
 */
export type EntityState = {
  /** The name it was created with. A declared entity's name is read from content. */
  name?: string
  /** Stats changed in play, by id. Others read from the declaration, then the stat's `start`. */
  stats?: Stats
  /** kv keys set in play. Others read from the declaration. */
  kv?: Record<string, KvValue>
}

/**
 * Which entity, as content names it: `'staff:ana'`, its kind and its id. Inside
 * an `each` or a `count`'s `where`, `'$'` is the one being looked at.
 */
export type EntityRef = string

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

/**
 * An entity's kept stat, as play left it or its declaration starts it.
 * Undefined when neither has it: the stat's `start` then.
 */
export function entityStat(state: GameState, game: Game | undefined, ref: EntityRef, stat: string): number | undefined {
  return recordOf(state, ref)?.stats?.[stat] ?? entityDef(game, ref)?.stats?.[stat]
}

/** An entity's kv store as it reads: its declaration's keys with what play set laid over them. */
export function entityKv(state: GameState, game: Game | undefined, ref: EntityRef): Record<string, KvValue> {
  return { ...entityDef(game, ref)?.kv, ...recordOf(state, ref)?.kv }
}

/** An entity's tags: its kind's, then its own, each once. */
export function entityTags(_state: GameState, game: Game, ref: EntityRef): string[] {
  const kind = parseRef(ref)?.kind
  const own = [...((kind !== undefined ? kindById(game, kind)?.tags : undefined) ?? []), ...(entityDef(game, ref)?.tags ?? [])]
  return [...new Set(own)]
}

/**
 * An entity's name or description as written, before its tokens are filled:
 * the name it was created with, then its declaration's. `entityName` and
 * `entityDesc` fill them.
 */
export function entityText(state: GameState, game: Game | undefined, ref: EntityRef, field: 'name' | 'desc'): string | undefined {
  if (field === 'name') {
    const given = recordOf(state, ref)?.name
    if (given !== undefined) return given
    // Phase 4's `like` reads through here, before the declaration.
  }
  return entityDef(game, ref)?.[field]
}

/** A new record for an entity created in play: its name, and the stats and kv it was given. */
export function createdRecord(given: { name: string; stats?: Record<string, number>; kv?: Record<string, KvValue> }): EntityState {
  const record: EntityState = { name: given.name }
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

/**
 * Put a real reference where content wrote `'$'`: in every `of` and `entity`
 * of a condition or an effect list, and anywhere in a plugin or custom call's
 * arguments (`{ 'cast/met': { character: '$' } }`). A nested `each`'s
 * effects and a nested `count`'s `where` are left alone: their `'$'` is
 * their own.
 */
export function bindCurrent<T extends Condition | EffectRef | readonly EffectRef[] | undefined>(value: T, ref: EntityRef): T {
  const walk = (node: unknown, inArgs: boolean): unknown => {
    if (inArgs && node === CURRENT) return ref
    if (Array.isArray(node)) return node.map((child) => walk(child, inArgs))
    if (node === null || typeof node !== 'object') return node
    const out: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(node)) {
      if ((key === 'of' || key === 'entity') && child === CURRENT) out[key] = ref
      else if (ownsCurrent(node) && (key === 'effects' || key === 'where')) out[key] = child
      else out[key] = walk(child, inArgs || holdsArgs(key))
    }
    return out
  }
  return walk(value, false) as T
}
