import { say } from './strings.ts'
import type { Condition } from './condition.ts'
import type { Game } from './game.ts'
import { tier } from './tier.ts'
import { customValue } from './custom.ts'
import type { GameState, Stats } from './types.ts'

/**
 * A number the game keeps for the player: charisma, money, energy, a
 * reputation — whatever the game is about. The engine has none of its own; a
 * game declares every stat it uses, and one with no stats declares none.
 */
export type StatDef = {
  id: string
  /**
   * The kind of entity it belongs to: `'staff'` gives every member of staff
   * one. The player's if left out.
   */
  of?: string
  /** What the player reads: "Charisma", "Money". */
  label: string
  /** Where a new game starts it. 0 if left out. */
  start?: number
  /** Lowest it can go. 0 if left out. */
  min?: number
  /**
   * Highest it can go. 100 if left out. A number, or the name of a custom
   * value (`{ value: 'energyMax' }`) when the ceiling moves with the game.
   */
  max?: number | { value: string }
  /** When the player can see it. Always, if left out. */
  visible?: Condition
  /**
   * Whether it belongs in the view's stat list. True if left out. A game that
   * shows a stat its own way — a gauge, a purse — sets this false.
   */
  listed?: boolean
  /**
   * Spent on things: money, energy, time on the clock. A spendable stat is
   * what a button's price is made of.
   */
  spendable?: boolean
  /**
   * The refusal when a cost needs more than the player has, with `{n}` for
   * the amount: `'Not enough on you.'`, `'Need {n} energy.'`. Without it:
   * "Not enough" and the label.
   */
  lacking?: string
  /**
   * Hidden thresholds, lowest first. A `{ tier: id, gte: n }` condition asks
   * whether the stat has passed `n` of them; the numbers themselves are never
   * shown. No bands means every value is band 0.
   */
  bands?: readonly number[]
  /**
   * How the value is written for the player, with `{n}` for the number:
   * `'£{n}'`, `'{n} energy'`. Just the number if left out.
   */
  format?: string
}

export function statDef(game: Game, id: string): StatDef | undefined {
  return game.stats?.find((stat) => stat.id === id)
}

/** Every one of the player's stats at its starting value. */
export function startingStats(game: Game): Stats {
  return Object.fromEntries((game.stats ?? []).filter((stat) => !stat.of).map((stat) => [stat.id, stat.start ?? 0]))
}

/** The highest a stat can go right now: its declared max, worked out if it names a value. */
export function statMax(state: GameState, game: Game, id: string): number {
  const max = statDef(game, id)?.max
  if (max === undefined) return 100
  if (typeof max === 'number') return max
  const fn = customValue(game, max.value)
  return fn ? Number(fn(state)) : 100
}

/** A value held to the stat's declared range (0–100 unless it says). */
export function clampStat(
  state: GameState,
  game: Game,
  id: string,
  value: number,
): number {
  const min = statDef(game, id)?.min ?? 0
  return Math.max(min, Math.min(statMax(state, game, id), value))
}

/** The refusal for a cost the player cannot cover. */
export function lackingLine(def: StatDef | undefined, id: string, amount: number, game?: Game): string {
  if (def?.lacking) return def.lacking.replaceAll('{n}', String(amount))
  return say(game, 'notEnough', { stat: (def?.label ?? id).toLowerCase(), n: amount })
}

/** Which of its hidden bands a stat has reached. */
export function statBand(state: GameState, game: Game, id: string): number {
  const bands = statDef(game, id)?.bands
  return bands ? tier(state.stats[id] ?? 0, bands) : 0
}

/** A value as the player reads it, through the stat's `format`. */
export function formatStat(def: StatDef | undefined, value: number): string {
  return def?.format ? def.format.replace('{n}', String(value)) : String(value)
}
