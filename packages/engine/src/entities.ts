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
}

/** One thing of a kind, as content declares it: there from the start of the game. */
export type EntityDef = {
  /** Unique within its kind. */
  id: string
  /** Its kind's id. */
  of: string
  /** What the player reads: "Ana". */
  name: string
  /** Where its stats start, where they differ from each stat's `start`. */
  stats?: Record<string, number>
  /** Its kv keys at the start. */
  kv?: Record<string, KvValue>
}

/** One thing as the state keeps it. */
export type EntityState = {
  name: string
  stats: Stats
  kv: Record<string, KvValue>
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

/** The entity a reference names, if the save has it. */
export function entityOf(state: GameState, ref: EntityRef): EntityState | undefined {
  const parts = parseRef(ref)
  return parts ? state.entities?.[parts.kind]?.[parts.id] : undefined
}

/** Every entity of a kind, as references, in the order they came. */
export function entitiesOf(state: GameState, kind: string): EntityRef[] {
  return Object.keys(state.entities?.[kind] ?? {}).map((id) => `${kind}:${id}`)
}

/** A new entity's state: each of its kind's stats at its start, then what it was given. */
export function newEntity(game: Game, kind: string, given: { name: string; stats?: Record<string, number>; kv?: Record<string, KvValue> }): EntityState {
  const stats: Stats = {}
  // A derived stat is worked out when it is read, so an entity keeps none.
  for (const stat of game.stats ?? []) if (stat.of === kind && stat.derive === undefined) stats[stat.id] = stat.start ?? 0
  return { name: given.name, stats: { ...stats, ...given.stats }, kv: { ...given.kv } }
}

/** Every declared entity at its start, by kind and id. */
export function startingEntities(game: Game): Record<string, Record<string, EntityState>> {
  const out: Record<string, Record<string, EntityState>> = {}
  for (const kind of game.kinds ?? []) out[kind.id] = {}
  for (const entity of game.entities ?? []) {
    out[entity.of] = { ...out[entity.of], [entity.id]: newEntity(game, entity.of, entity) }
  }
  return out
}

/** The state with one entity replaced. */
export function writeEntity(state: GameState, ref: EntityRef, next: EntityState): GameState {
  const parts = parseRef(ref)
  if (!parts) return state
  return {
    ...state,
    entities: { ...state.entities, [parts.kind]: { ...state.entities?.[parts.kind], [parts.id]: next } },
  }
}

/** The state with one entity gone. */
export function removeEntity(state: GameState, ref: EntityRef): GameState {
  const parts = parseRef(ref)
  if (!parts || !state.entities?.[parts.kind]?.[parts.id]) return state
  const { [parts.id]: _gone, ...rest } = state.entities[parts.kind]
  return { ...state, entities: { ...state.entities, [parts.kind]: rest } }
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

/**
 * Put a real reference where content wrote `'$'`, in every `of` of a
 * condition or an effect list. A nested `each`'s effects and a nested
 * `count`'s `where` are left alone: their `'$'` is their own.
 */
export function bindCurrent<T extends Condition | EffectRef | readonly EffectRef[] | undefined>(value: T, ref: EntityRef): T {
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk)
    if (node === null || typeof node !== 'object') return node
    const out: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(node)) {
      if ((key === 'of' || key === 'entity') && child === CURRENT) out[key] = ref
      else if (ownsCurrent(node) && (key === 'effects' || key === 'where')) out[key] = child
      else out[key] = walk(child)
    }
    return out
  }
  return walk(value) as T
}
