/**
 * Holdings, the counts of each thing each holder holds. The player and unique entities hold, and any entity can be
 * held.
 *
 * The engine reads each entity's starting holder from content (`EntityDef.at`), and `state.held` keeps only the
 * counts play changed. A count written once is kept, 0 included, so a thing used up stays used up, and a thing a later
 * version of the game places reaches an older save. The engine works out each thing's holders from both and caches
 * them for that state, never in the save.
 */
import type { Game } from './game.ts'
import type { Condition, Effect, GameState } from './types.ts'
import { entityDef, everyEntity, hasEntity, isUnique, parseRef, PLAYER, resolveHolder, YOU, type EntityRef, type Holder, type Placement } from './entities.ts'

/** Returns a placement as counts by holder. A single holder such as `'player'` counts as 1 held there. */
export function placementCounts(at: Placement | undefined): Record<string, number> {
  if (at === undefined) return {}
  return typeof at === 'string' ? { [at]: 1 } : (at as Record<string, number>)
}

/** What the game's content places where at the start, by holder and then thing. Worked out once per list of entities. */
const startsCache = new WeakMap<object, Map<string, Map<string, number>>>()
const NO_STARTS = new Map<string, Map<string, number>>()

function starts(game: Game): Map<string, Map<string, number>> {
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

type Cached = { game: Game; removed: unknown; entities: unknown; holdings: Holdings }
const holdingsCache = new WeakMap<object, Cached>()
const NOTHING_HELD = {}

/** Returns true when `holder` can hold things now. The player always can, and a unique entity can while it is in the game. */
export function canHold(state: GameState, game: Game, holder: string): holder is Holder {
  if (holder === PLAYER) return true
  return isUnique(game, holder) && hasEntity(state, game, holder)
}

function holdings(state: GameState, game: Game): Holdings {
  const held = state.held ?? NOTHING_HELD
  const cached = holdingsCache.get(held)
  if (cached?.game === game && cached.removed === state.removed && cached.entities === state.entities) return cached.holdings
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

/** Returns the count of a thing a holder holds, `'you'` if left out. Returns 0 for a thing not held there or not in the game. */
export function heldCount(state: GameState, game: Game, ref: string, at: string = YOU): number {
  return holdings(state, game).byHolder.get(resolveHolder(state, at))?.get(ref) ?? 0
}

/** Returns the count of a thing held by every holder together. */
export function heldTotal(state: GameState, game: Game, ref: string): number {
  let total = 0
  for (const count of holdings(state, game).byThing.get(ref)?.values() ?? []) total += count
  return total
}

/** Returns each holder of a thing with its count, in no set order. Returns an empty list when no one holds it. */
export function holdersOf(state: GameState, game: Game, ref: string): { holder: Holder; count: number }[] {
  return [...(holdings(state, game).byThing.get(ref) ?? [])].map(([holder, count]) => ({ holder: holder as Holder, count }))
}

/** Returns the holder of a thing when one holder has it, as always for a unique thing. Returns undefined when no one holds it. */
export function holderOf(state: GameState, game: Game, ref: string): Holder | undefined {
  return holdings(state, game).byThing.get(ref)?.keys().next().value as Holder | undefined
}

/**
 * Returns the things a holder holds, `'you'` if left out, each with its count. They come in the game's entity order,
 * declared ones in content order and then those made in play.
 */
export function heldBy(state: GameState, game: Game, at: string = YOU): { ref: EntityRef; count: number }[] {
  const things = holdings(state, game).byHolder.get(resolveHolder(state, at))
  if (!things?.size) return []
  return everyEntity(state, game)
    .filter((ref) => things.has(ref))
    .map((ref) => ({ ref, count: things.get(ref)! }))
}

/** Returns true when giving a thing to a holder would make something hold itself at any depth, such as a box in a bag in the box. */
export function wouldHoldItself(state: GameState, game: Game, ref: string, holder: string): boolean {
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
 * Returns the state with a holder's count of a thing set, at 0 or more and at most 1 for a unique thing. Giving a
 * unique thing to one holder takes it from any other.
 *
 * The state is returned unchanged for a holder that can't hold, a thing not in the game, or a thing that would end up
 * holding itself.
 */
export function setHeld(state: GameState, game: Game, ref: string, at: string, count: number): GameState {
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
 * Returns the state with up to `by` of a thing moved from one holder to another, or all the first holds if `by` is
 * left out. It never moves more than the first holds.
 *
 * The state is returned unchanged when the target can't hold, the holders are the same, or the thing would end up
 * holding itself.
 */
export function moveHeld(state: GameState, game: Game, ref: string, from: string, to: string, by?: number): GameState {
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
 * Returns the state with an entity's holdings released before it is removed. No one holds it any more, and the things
 * it held go to its own holder, or are held by nobody when it had none.
 */
export function releaseHeld(state: GameState, game: Game, ref: string): GameState {
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

/** Returns true when `holder` has a holder's form, `'player'`, `'you'`, `'$'` or an entity reference. */
export function looksLikeHolder(holder: string): boolean {
  return holder === PLAYER || holder === YOU || holder === '$' || parseRef(holder) !== undefined
}

/**
 * Returns the effect that gives `you` `n` of a thing, 1 if left out. A unique thing someone else holds is taken from
 * them.
 *
 * ```ts
 * effects: [give('food:apple', 2)]
 * ```
 */
export function give(ref: string, n = 1): Effect {
  return { entity: ref, by: n }
}

/** Returns the effect that takes `n` of a thing from `you`, 1 if left out. The count never goes below 0. */
export function take(ref: string, n = 1): Effect {
  return { entity: ref, by: -n }
}

/**
 * Returns the effect that moves a thing to another holder. It moves all there is unless `by` says otherwise.
 *
 * Without `from`, a stack moves from `you` and a unique thing moves from wherever it is.
 *
 * ```ts
 * effects: [move('gift:scarf', 'character:ava')]
 * ```
 */
export function move(ref: string, to: string, options: { from?: Holder; by?: number } = {}): Effect {
  return { move: ref, to, ...options }
}

/** Returns the condition that holds while `you` hold at least `n` of a thing, 1 if left out. */
export function holding(ref: string, n = 1): Condition {
  return { entity: ref, at: YOU, gte: n }
}
