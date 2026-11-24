/**
 * The stats helpers the engine exports, such as `statValue(state, game, id, of?)`, with the core's context bound in.
 * The feature and every helper are in `features/stats.ts`.
 */
import type { Game } from './game.ts'
import type { GameState } from './types.ts'
import { featureContext } from './core.ts'
import * as stats from './features/stats.ts'

export type { Formula, StatDef, StatLevels, StatRound, StatView, StatWords } from './features/stats.ts'
export { formatStat, lackingLine, levelAt, startingStats, statOf } from './features/stats.ts'

/**
 * Returns a stat's value, the player's or, with `of`, an entity's (`'staff:ana'`). An entity that isn't there reads 0.
 *
 * A derived stat is worked out from its formula and held to its range. A kept stat the save doesn't have yet reads as
 * its `start`.
 */
export function statValue(state: GameState, game: Game, id: string, of?: string): number {
  return stats.statValue(state, game, id, of, featureContext())
}

/**
 * Returns the level a stat with `levels` has reached, with the value the next level starts at and the progress
 * towards it. Returns undefined for a stat with no levels.
 *
 * `next` is null at the top level. `progress` runs from 0 at this level's start to 1 at the next one's, and is 1 at
 * the top.
 */
export function statLevel(state: GameState, game: Game, id: string, of?: string): { level: number; next: number | null; progress: number } | undefined {
  return stats.statLevel(state, game, id, of, featureContext())
}

/** Returns the highest value a stat can reach now. The engine works out its declared `max` when that is an amount. */
export function statMax(state: GameState, game: Game, id: string): number {
  return stats.statMax(state, game, id, featureContext())
}

/** Returns `value` held to the stat's declared range. The range is 0 to 100 unless the stat declares one. */
export function clampStat(state: GameState, game: Game, id: string, value: number): number {
  return stats.clampStat(state, game, id, value, featureContext())
}
