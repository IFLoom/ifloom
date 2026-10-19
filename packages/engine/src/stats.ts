/**
 * The stats feature's helpers as the engine exports them, with the core's
 * context bound in: `statValue(state, game, id, of?)` and the rest. The
 * feature itself, and every helper, is in `features/stats.ts`.
 */
import type { Game } from './game.ts'
import type { GameState } from './types.ts'
import { featureContext } from './core.ts'
import * as stats from './features/stats.ts'

export type { Formula, StatDef, StatLevels, StatRound, StatView, StatWords } from './features/stats.ts'
export { formatStat, lackingLine, levelAt, startingStats, statDef } from './features/stats.ts'

/**
 * A stat's value as everything reads it: the player's, or with `of`, an
 * entity's (`'staff:ana'`). A derived stat is worked out from its formula and
 * held to its range; a kept stat the save doesn't have yet reads as its
 * `start`. An entity that isn't there reads 0.
 */
export function statValue(state: GameState, game: Game, id: string, of?: string): number {
  return stats.statValue(state, game, id, of, featureContext())
}

/**
 * Where a stat with `levels` stands: its level, the value the next one starts
 * at (null at the top), and how far it is from this level's start to the
 * next, 0 to 1 (1 at the top). Undefined for a stat with no levels.
 */
export function statLevel(state: GameState, game: Game, id: string, of?: string): { level: number; next: number | null; progress: number } | undefined {
  return stats.statLevel(state, game, id, of, featureContext())
}

/** The highest a stat can go right now: its declared max, worked out if it names a value. */
export function statMax(state: GameState, game: Game, id: string): number {
  return stats.statMax(state, game, id, featureContext())
}

/** A value held to the stat's declared range (0–100 unless it says). */
export function clampStat(state: GameState, game: Game, id: string, value: number): number {
  return stats.clampStat(state, game, id, value, featureContext())
}
