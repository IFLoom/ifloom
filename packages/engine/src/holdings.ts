/**
 * Holding things: who holds what, and how many. The player and unique
 * entities hold; any entity can be held. What content declares an entity
 * starts with (`EntityDef.at`) is read through, and `state.held` keeps only
 * what play changed: a count written once, 0 included, is kept, so a thing
 * placed and then used up stays used up, and a thing a later version of the
 * game places reaches an older save. Who holds a thing is worked out from
 * both and kept for the state it was read from, never saved.
 */
import type { Game } from './game.ts'
import type { Condition, Effect, GameState } from './types.ts'
import { entityDef, everyEntity, hasEntity, isUnique, parseRef, PLAYER, resolveHolder, YOU, type EntityRef, type Holder, type Placement } from './entities.ts'

/** A placement as counts by holder: `'player'` is one held by the player. */
export function placementCounts(at: Placement | undefined): Record<string, number> {
  if (at === undefined) return {}
  return typeof at === 'string' ? { [at]: 1 } : (at as Record<string, number>)
}

/** What the game's content places where at the start, by holder and then thing. Worked out once per list of entities. */
const startsCache = new WeakMap<object, Map<string, Map<string, number>>>()
const NO_STARTS = new Map<string, Map<string, number>>()

function starts(game: Game | undefined): Map<string, Map<string, number>> {
  const list = game?.entities
  if (!list) return NO_STARTS
  let found = startsCache.get(list)
  if (!found) {
    found = new Map()
    for (const entity of list) {
      for (const [holder, count] of Object.entries(placementCounts(entity.at))) {
        if (!(count > 0)) continue
        const into = found.get(holder) ?? new Map<string, number>()
        into.set(`${entity.of}:${entity.id}`, count)
        found.set(holder, into)
      }
    }
    startsCache.set(list, found)
  }
  return found
}

/** Who holds what, both ways, as the state reads it: only counts above 0, of things and holders in the game. */
type Holdings = { byHolder: Map<string, Map<string, number>>; byThing: Map<string, Map<string, number>> }

type Cached = { game: Game | undefined; removed: unknown; entities: unknown; holdings: Holdings }
const holdingsCache = new WeakMap<object, Cached>()
const NOTHING_HELD = {}

/** Whether a holder is there to hold: the player always, a unique entity while it is in the game. */
export function canHold(state: GameState, game: Game | undefined, holder: string): holder is Holder {
  if (holder === PLAYER) return true
  return isUnique(game, holder) && hasEntity(state, game, holder)
}

function holdings(state: GameState, game: Game | undefined): Holdings {
  const held = state.held ?? NOTHING_HELD
  const cached = holdingsCache.get(held)
  if (cached && cached.game === game && cached.removed === state.removed && cached.entities === state.entities) return cached.holdings
  const out: Holdings = { byHolder: new Map(), byThing: new Map() }
  const counts = new Map<string, Map<string, number>>()
  for (const [holder, things] of starts(game)) counts.set(holder, new Map(things))
  for (const [holder, things] of Object.entries(state.held ?? {})) {
    const into = counts.get(holder) ?? new Map<string, number>()
    for (const [ref, count] of Object.entries(things ?? {})) into.set(ref, count)
    counts.set(holder, into)
  }
  const there = new Map<string, boolean>()
  const inGame = (ref: string) => {
    let found = there.get(ref)
    if (found === undefined) there.set(ref, (found = hasEntity(state, game, ref)))
    return found
  }
  for (const [holder, things] of counts) {
    if (holder !== PLAYER && !(isUnique(game, holder) && inGame(holder))) continue
    for (const [ref, count] of things) {
      if (!(count > 0) || !inGame(ref)) continue
      if (!out.byHolder.has(holder)) out.byHolder.set(holder, new Map())
      out.byHolder.get(holder)!.set(ref, count)
      if (!out.byThing.has(ref)) out.byThing.set(ref, new Map())
      out.byThing.get(ref)!.set(holder, count)
    }
  }
  holdingsCache.set(held, { game, removed: state.removed, entities: state.entities, holdings: out })
  return out
}

/** How many of a thing a holder holds (`'you'` by default): 0 for anything not held there, or not in the game. */
export function heldCount(state: GameState, game: Game | undefined, ref: string, at: string = YOU): number {
  return holdings(state, game).byHolder.get(resolveHolder(state, at))?.get(ref) ?? 0
}

/** How many of a thing are held, by everyone together. */
export function heldTotal(state: GameState, game: Game | undefined, ref: string): number {
  let total = 0
  for (const count of holdings(state, game).byThing.get(ref)?.values() ?? []) total += count
  return total
}

/** Who holds a thing, and how many each: the holders in no particular order. Empty when nobody does. */
export function holdersOf(state: GameState, game: Game | undefined, ref: string): { holder: Holder; count: number }[] {
  return [...(holdings(state, game).byThing.get(ref) ?? [])].map(([holder, count]) => ({ holder: holder as Holder, count }))
}

/** Who holds a thing, when one holder does (always so for a unique thing); undefined when nobody does. */
export function holderOf(state: GameState, game: Game | undefined, ref: string): Holder | undefined {
  return holdings(state, game).byThing.get(ref)?.keys().next().value as Holder | undefined
}

/**
 * What a holder (`'you'` by default) holds, and how many of each, in the
 * order the game has its entities: declared ones in content order, then
 * those created in play.
 */
export function heldBy(state: GameState, game: Game | undefined, at: string = YOU): { ref: EntityRef; count: number }[] {
  const things = holdings(state, game).byHolder.get(resolveHolder(state, at))
  if (!things?.size) return []
  return everyEntity(state, game)
    .filter((ref) => things.has(ref))
    .map((ref) => ({ ref, count: things.get(ref)! }))
}

/** Whether putting a thing with a holder would have something hold itself, however far round: the box in the bag in the box. */
export function wouldHoldItself(state: GameState, game: Game | undefined, ref: string, holder: string): boolean {
  const seen = new Set<string>()
  for (let at: string | undefined = holder; at !== undefined && at !== PLAYER; at = holderOf(state, game, resolveHolder(state, at))) {
    if (at === ref) return true
    if (seen.has(at)) return false
    seen.add(at)
  }
  return false
}

/** The state with one holder's count of one thing written, 0 included. */
function written(state: GameState, holder: string, ref: string, count: number): GameState {
  return { ...state, held: { ...state.held, [holder]: { ...state.held?.[holder], [ref]: count } } }
}

/**
 * The state with a holder's count of a thing set: held to 0 or more, and to
 * at most 1 for a unique thing, which giving to one holder takes from any
 * other. Left as it is for a holder that can't hold, a thing not in the
 * game, or a thing that would end up holding itself.
 */
export function setHeld(state: GameState, game: Game | undefined, ref: string, at: string, count: number): GameState {
  const holder = resolveHolder(state, at)
  if (!hasEntity(state, game, ref) || !canHold(state, game, holder)) return state
  const unique = isUnique(game, ref)
  const next = Math.max(0, Math.floor(unique ? Math.min(1, count) : count))
  if (next === heldCount(state, game, ref, holder) && (next === 0 || !unique || holdersOf(state, game, ref).length === 1)) return state
  if (unique && next > 0) {
    if (wouldHoldItself(state, game, ref, holder)) return state
    let moved = state
    for (const other of holdersOf(state, game, ref)) if (other.holder !== holder) moved = written(moved, other.holder, ref, 0)
    return written(moved, holder, ref, 1)
  }
  return written(state, holder, ref, next)
}

/**
 * The state with up to `by` of a thing moved from one holder to another
 * (all there is, if left out): never more than the first holds. Left as it
 * is when either can't hold, they are the same, or the thing would end up
 * holding itself.
 */
export function moveHeld(state: GameState, game: Game | undefined, ref: string, from: string, to: string, by?: number): GameState {
  const source = resolveHolder(state, from)
  const target = resolveHolder(state, to)
  if (source === target || !canHold(state, game, target) || wouldHoldItself(state, game, ref, target)) return state
  const there = heldCount(state, game, ref, source)
  const moving = Math.min(there, Math.max(0, Math.floor(by ?? there)))
  if (!(moving > 0)) return state
  const taken = written(state, source, ref, there - moving)
  return written(taken, target, ref, heldCount(taken, game, ref, target) + moving)
}

/**
 * What removing an entity does to holdings, before its record goes: it is
 * held by nobody, and what it held goes to whoever held it, or with it when
 * nobody did.
 */
export function releaseHeld(state: GameState, game: Game | undefined, ref: string): GameState {
  const owner = holderOf(state, game, ref)
  let next = state
  for (const { ref: thing, count } of heldBy(state, game, ref)) {
    next = written(next, ref, thing, 0)
    if (owner !== undefined) next = written(next, owner, thing, heldCount(next, game, thing, owner) + count)
  }
  for (const { holder } of holdersOf(state, game, ref)) next = written(next, holder, ref, 0)
  // A thing created in play leaves nothing behind; a declared one keeps its 0s, so nothing it started with comes back.
  if (!entityDef(game, ref)) {
    const { [ref]: _own, ...rest } = next.held ?? {}
    next = { ...next, held: Object.fromEntries(Object.entries(rest).map(([holder, things]) => [holder, withoutKey(things, ref)])) }
  }
  return next
}

function withoutKey(things: Record<string, number>, ref: string): Record<string, number> {
  if (!Object.hasOwn(things, ref)) return things
  const { [ref]: _gone, ...rest } = things
  return rest
}

/** Whether a reference names a holder at all: the player, `'you'`, `'$'`, or an entity reference. */
export function looksLikeHolder(holder: string): boolean {
  return holder === PLAYER || holder === YOU || holder === '$' || parseRef(holder) !== undefined
}

/**
 * Give the player (whoever they are playing) some of a thing: 1 if left
 * out. A unique thing someone else holds is taken from them.
 *
 * ```ts
 * effects: [give('food:apple', 2)]
 * ```
 */
export function give(ref: string, n = 1): Effect {
  return { entity: ref, by: n }
}

/** Take some of a thing from the player (whoever they are playing): 1 if left out, never below 0. */
export function take(ref: string, n = 1): Effect {
  return { entity: ref, by: -n }
}

/**
 * Move a thing to another holder: from the player (whoever they are
 * playing) for a stack, from wherever it is for a unique thing, unless
 * `from` says; all there is unless `by` says.
 *
 * ```ts
 * effects: [move('gift:scarf', 'character:ava')]
 * ```
 */
export function move(ref: string, to: string, options: { from?: Holder; by?: number } = {}): Effect {
  return { move: ref, to, ...options }
}

/** Whether the player (whoever they are playing) holds at least `n` of a thing: 1 if left out. */
export function holding(ref: string, n = 1): Condition {
  return { entity: ref, at: YOU, gte: n }
}
