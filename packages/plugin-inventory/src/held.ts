/**
 * Who holds what, as the inventory keeps it. The player and unique entities hold things, `'you'` is whoever the
 * player is playing now, and any entity can be held.
 *
 * Each thing's starting holder comes from its `inventory/at` trait in content, and the plugin's state keeps only the
 * counts play changed. A count written once is kept, 0 included, so a thing used up stays used up, and a thing a later
 * version of the game places reaches an older save. The holders are worked out from both and cached per state.
 */
import { declaredTrait, declaredWithTrait, isUnique, parseRef, PLAYER, resolveYou, YOU, type EntityRef, type Game, type GameState } from '@ifloom/engine'
import { everyEntity, hasEntity } from '@ifloom/engine/plugin'

/** The plugin's id, and its state's key. */
export const ID = 'inventory'

/** The trait that starts a thing with a holder. */
export const AT = 'inventory/at'

/**
 * A holder of things, `'player'`, a unique entity (`'character:ava'`) or `'you'`, whoever the player is playing now.
 */
export type Holder = EntityRef | typeof PLAYER | typeof YOU

/** A thing's starting place, one holder for one of it or a count for each holder (`{ player: 2, 'place:larder': 6 }`). */
export type Placement = Holder | Partial<Record<Holder, number>>

/** The inventory's state, the counts play changed. */
export type InventoryState = {
  /** The counts play changed, by holder and then thing. A count stays once written, 0 included. */
  held: Record<string, Record<string, number>>
}

/** Returns a placement as counts by holder. A single holder such as `'player'` counts as 1 held there. */
export function placementCounts(at: Placement | undefined): Record<string, number> {
  if (at === undefined || at === null) return {}
  return typeof at === 'string' ? { [at]: 1 } : (at as Record<string, number>)
}

/** The inventory's state in this save, or nothing held when the game has no inventory yet. */
export function sliceOf(state: GameState): InventoryState {
  return (state.plugins?.[ID]?.state as InventoryState | undefined) ?? { held: {} }
}

/** The state with the inventory's state set. */
function withSlice(state: GameState, slice: InventoryState): GameState {
  return { ...state, plugins: { ...state.plugins, [ID]: { version: state.plugins?.[ID]?.version ?? 1, state: slice } } }
}

const startsCache = new WeakMap<Game, Map<string, Map<string, number>>>()

/** What content starts where, by holder and then thing, from each declared entity's `inventory/at`. */
function starts(game: Game): Map<string, Map<string, number>> {
  let found = startsCache.get(game)
  if (!found) {
    found = new Map()
    for (const ref of declaredWithTrait(game, AT)) {
      for (const [holder, count] of Object.entries(placementCounts(declaredTrait(game, ref, AT) as Placement | undefined))) {
        if (!(count > 0)) continue
        const into = found.get(holder) ?? new Map<string, number>()
        into.set(ref, count)
        found.set(holder, into)
      }
    }
    startsCache.set(game, found)
  }
  return found
}

/** Who holds what, both ways: only counts above 0, of things and holders in the game. */
type Holdings = { byHolder: Map<string, Map<string, number>>; byThing: Map<string, Map<string, number>> }

type Cached = { game: Game; removed: unknown; entities: unknown; holdings: Holdings }
const holdingsCache = new WeakMap<object, Cached>()

/** Returns true when `holder` can hold things now. The player always can, and a unique entity can while it is in the game. */
export function canHold(state: GameState, game: Game, holder: string): holder is Holder {
  if (holder === PLAYER) return true
  return isUnique(game, holder) && hasEntity(state, game, holder)
}

function holdings(state: GameState, game: Game): Holdings {
  const held = sliceOf(state).held
  const cached = holdingsCache.get(held)
  if (cached?.game === game && cached.removed === state.removed && cached.entities === state.entities) return cached.holdings
  const out: Holdings = { byHolder: new Map(), byThing: new Map() }
  const counts = new Map<string, Map<string, number>>()
  for (const [holder, things] of starts(game)) counts.set(holder, new Map(things))
  for (const [holder, things] of Object.entries(held)) {
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
  return holdings(state, game).byHolder.get(resolveYou(state, at))?.get(ref) ?? 0
}

/** Returns each holder of a thing with its count, in no set order. */
export function holdersOf(state: GameState, game: Game, ref: string): { holder: Holder; count: number }[] {
  return [...(holdings(state, game).byThing.get(ref) ?? [])].map(([holder, count]) => ({ holder: holder as Holder, count }))
}

/** Returns the holder of a thing when one holder has it, as always for a unique thing. Undefined when no one holds it. */
export function holderOf(state: GameState, game: Game, ref: string): Holder | undefined {
  return holdings(state, game).byThing.get(ref)?.keys().next().value as Holder | undefined
}

/** Returns the things a holder holds, `'you'` if left out, each with its count, in the game's order of its entities. */
export function heldBy(state: GameState, game: Game, at: string = YOU): { ref: EntityRef; count: number }[] {
  const things = holdings(state, game).byHolder.get(resolveYou(state, at))
  if (!things?.size) return []
  return everyEntity(state, game)
    .filter((ref) => things.has(ref))
    .map((ref) => ({ ref, count: things.get(ref)! }))
}

/** Returns true when giving a thing to a holder would make something hold itself at any depth, such as a box in a bag in the box. */
export function wouldHoldItself(state: GameState, game: Game, ref: string, holder: string): boolean {
  const seen = new Set<string>()
  for (let at: string | undefined = holder; at !== undefined && at !== PLAYER; at = holderOf(state, game, resolveYou(state, at))) {
    if (at === ref) return true
    if (seen.has(at)) return false
    seen.add(at)
  }
  return false
}

/** The state with one holder's count of one thing written, 0 included. */
function written(state: GameState, holder: string, ref: string, count: number): GameState {
  const { held } = sliceOf(state)
  return withSlice(state, { held: { ...held, [holder]: { ...held[holder], [ref]: count } } })
}

/**
 * Returns the state with a holder's count of a thing set, at 0 or more and at most 1 for a unique thing. Giving a
 * unique thing to one holder takes it from any other. Unchanged for a holder that can't hold, a thing not in the game,
 * or a thing that would end up holding itself.
 */
export function setHeld(state: GameState, game: Game, ref: string, at: string, count: number): GameState {
  const holder = resolveYou(state, at)
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
 * left out. Unchanged when the target can't hold, the holders are the same, or the thing would end up holding itself.
 */
export function moveHeld(state: GameState, game: Game, ref: string, from: string, to: string, by?: number): GameState {
  const source = resolveYou(state, from)
  const target = resolveYou(state, to)
  if (source === target || !canHold(state, game, target) || wouldHoldItself(state, game, ref, target)) return state
  const there = heldCount(state, game, ref, source)
  const moving = Math.min(there, Math.max(0, Math.floor(by ?? there)))
  if (!(moving > 0)) return state
  const taken = written(state, source, ref, there - moving)
  return written(taken, target, ref, heldCount(taken, game, ref, target) + moving)
}

/**
 * The holders a default `of` or `from` reads: the protagonist being played, then the player's own things too, since
 * what the household shares is the protagonist's to use.
 */
export function defaultHolders(state: GameState): Holder[] {
  const you = resolveYou(state, YOU) as Holder
  return you === PLAYER ? [PLAYER] : [you, PLAYER]
}

/** Returns true when `holder` looks like a holder: `'player'`, `'you'`, `'$'` or an entity reference. */
export function looksLikeHolder(holder: string): boolean {
  return holder === PLAYER || holder === YOU || holder === '$' || parseRef(holder) !== undefined
}
