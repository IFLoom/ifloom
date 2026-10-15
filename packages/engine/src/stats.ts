import { say } from './strings.ts'
import type { Condition } from './condition.ts'
import type { Game } from './game.ts'
import { tier } from './tier.ts'
import { customValue } from './custom.ts'
import { entityOf } from './entities.ts'
import type { GameState, Stats } from './types.ts'

/**
 * How a derived stat is worked out from other stats. A number is itself, a
 * string is another stat's value (the same entity's, for a stat with `of`),
 * and the rest combine formulas:
 *
 * - `{ sum: [...] }`, `{ product: [...] }`, `{ min: [...] }`, `{ max: [...] }`;
 * - `{ scale: f, by: n }` is f times n;
 * - `{ clamp: f, min?, max? }` holds f between the two.
 */
export type Formula =
  | number
  | string
  | { sum: Formula[] }
  | { product: Formula[] }
  | { min: Formula[] }
  | { max: Formula[] }
  | { scale: Formula; by: number }
  | { clamp: Formula; min?: number; max?: number }

/** Levels on a stat: thresholds it passes as it grows, and what to tell the player when it passes one. */
export type StatLevels = {
  /** The value each level starts at, lowest first. Below the first is level 0. */
  at: number[]
  /**
   * Raised as a notice tagged `level` when a command takes the player's stat
   * up a level, with `{label}` and `{level}` filled in: `'{label} is now level {level}.'`.
   * No notice if left out.
   */
  notice?: string
}

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
  /**
   * Work the stat out from others instead of keeping it: `{ sum: ['strength', 'agility'] }`.
   * A derived stat is read like any stat and never written; the loader
   * reports a `stat` or `setStat` effect on one. See `Formula`.
   */
  derive?: Formula
  /** Levels the stat passes as it grows. None if left out. See `StatLevels`. */
  levels?: StatLevels
}

export function statDef(game: Game, id: string): StatDef | undefined {
  return game.stats?.find((stat) => stat.id === id)
}

/** Every one of the player's stats at its starting value. A derived stat is worked out, never kept, so it is not here. */
export function startingStats(game: Game): Stats {
  return Object.fromEntries((game.stats ?? []).filter((stat) => !stat.of && stat.derive === undefined).map((stat) => [stat.id, stat.start ?? 0]))
}

/** Formulas deeper than this are a cycle the loader would have reported; they read as 0. */
const DEPTH = 64

function evaluate(formula: Formula, read: (id: string, depth: number) => number, depth: number): number {
  if (typeof formula === 'number') return formula
  if (typeof formula === 'string') return read(formula, depth + 1)
  const all = (list: Formula[]) => list.map((entry) => evaluate(entry, read, depth))
  if ('sum' in formula) return all(formula.sum).reduce((a, b) => a + b, 0)
  if ('product' in formula) return all(formula.product).reduce((a, b) => a * b, 1)
  if ('min' in formula && Array.isArray(formula.min)) return formula.min.length ? Math.min(...all(formula.min)) : 0
  if ('max' in formula && Array.isArray(formula.max)) return formula.max.length ? Math.max(...all(formula.max)) : 0
  if ('scale' in formula) return evaluate(formula.scale, read, depth) * formula.by
  if ('clamp' in formula) {
    const value = evaluate(formula.clamp, read, depth)
    return Math.max(formula.min ?? -Infinity, Math.min(formula.max ?? Infinity, value))
  }
  return 0
}

/**
 * A stat's value as everything reads it: the player's, or with `of`, an
 * entity's (`'staff:ana'`). A derived stat is worked out from its formula and
 * held to its range; a kept stat the save doesn't have yet reads as its
 * `start`. An entity that isn't there reads 0.
 */
export function statValue(state: GameState, game: Game, id: string, of?: string): number {
  const stats = of === undefined ? state.stats : entityOf(state, of)?.stats
  if (!stats) return 0
  const read = (key: string, depth: number): number => {
    const def = statDef(game, key)
    if (def?.derive === undefined) return stats[key] ?? def?.start ?? 0
    if (depth > DEPTH) return 0
    return clampStat(state, game, key, evaluate(def.derive, read, depth))
  }
  return read(id, 0)
}

/** Which level a value is at: how many of the thresholds it has reached. */
export function levelAt(value: number, at: readonly number[]): number {
  let level = 0
  for (const threshold of at) if (value >= threshold) level += 1
  return level
}

/**
 * Where a stat with `levels` stands: its level, the value the next one starts
 * at (null at the top), and how far it is from this level's start to the
 * next, 0 to 1 (1 at the top). Undefined for a stat with no levels.
 */
export function statLevel(
  state: GameState,
  game: Game,
  id: string,
  of?: string,
): { level: number; next: number | null; progress: number } | undefined {
  const def = statDef(game, id)
  if (!def?.levels) return undefined
  const at = def.levels.at
  const value = statValue(state, game, id, of)
  const level = levelAt(value, at)
  const next = level < at.length ? at[level] : null
  if (next === null) return { level, next, progress: 1 }
  const from = level === 0 ? (def.min ?? 0) : at[level - 1]
  const progress = next > from ? Math.max(0, Math.min(1, (value - from) / (next - from))) : 0
  return { level, next, progress }
}

/** The stat ids a formula reads. */
export function formulaStats(formula: Formula): string[] {
  if (typeof formula === 'number') return []
  if (typeof formula === 'string') return [formula]
  if ('sum' in formula) return formula.sum.flatMap(formulaStats)
  if ('product' in formula) return formula.product.flatMap(formulaStats)
  if ('min' in formula && Array.isArray(formula.min)) return formula.min.flatMap(formulaStats)
  if ('max' in formula && Array.isArray(formula.max)) return formula.max.flatMap(formulaStats)
  if ('scale' in formula) return formulaStats(formula.scale)
  if ('clamp' in formula) return formulaStats(formula.clamp)
  return []
}

/**
 * What is wrong with the game's derived stats and levels, each with where
 * (`stat brains`): a formula naming an unknown stat or another owner's, a
 * cycle, a derived stat that is spendable or given a start, levels out of
 * order or outside the stat's range.
 */
export function statProblems(game: Game): { where: string; what: string }[] {
  const out: { where: string; what: string }[] = []
  const stats = game.stats ?? []
  const byId = new Map(stats.map((stat) => [stat.id, stat]))
  for (const stat of stats) {
    const where = `stat ${stat.id}`
    if (stat.derive !== undefined) {
      for (const id of formulaStats(stat.derive)) {
        const used = byId.get(id)
        if (!used) out.push({ where, what: `derive reads unknown stat "${id}"` })
        else if (used.of !== stat.of) out.push({ where, what: `derive reads stat "${id}", which belongs to ${used.of ?? 'the player'}, not ${stat.of ?? 'the player'}` })
      }
      if (stat.spendable) out.push({ where, what: 'a derived stat cannot be spendable: it is never written' })
      if (stat.start !== undefined) out.push({ where, what: 'a derived stat has no start: it is worked out' })
    }
    if (stat.levels) {
      const at = stat.levels.at
      if (!Array.isArray(at) || !at.length) out.push({ where, what: 'levels.at needs at least one threshold' })
      else {
        if (at.some((n, i) => i > 0 && n <= at[i - 1])) out.push({ where, what: 'levels.at must go up, each threshold above the last' })
        const min = stat.min ?? 0
        const max = typeof stat.max === 'number' ? stat.max : stat.max === undefined ? 100 : Infinity
        const outside = at.filter((n) => n < min || n > max)
        if (outside.length) out.push({ where, what: `levels.at ${outside.join(', ')} outside the stat's range (${min} to ${max})` })
      }
    }
  }
  // Cycles: a derived stat that reads itself, however far round.
  const reported = new Set<string>()
  const visit = (id: string, path: string[]): void => {
    const def = byId.get(id)
    if (def?.derive === undefined) return
    const at = path.indexOf(id)
    if (at >= 0) {
      const cycle = path.slice(at)
      const key = [...cycle].sort().join(',')
      if (!reported.has(key)) {
        reported.add(key)
        out.push({ where: `stat ${id}`, what: `derive goes round in a cycle: ${[...cycle, id].join(' → ')}` })
      }
      return
    }
    for (const next of formulaStats(def.derive)) visit(next, [...path, id])
  }
  for (const stat of stats) visit(stat.id, [])
  return out
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
  return bands ? tier(statValue(state, game, id), bands) : 0
}

/** A value as the player reads it, through the stat's `format`. */
export function formatStat(def: StatDef | undefined, value: number): string {
  return def?.format ? def.format.replace('{n}', String(value)) : String(value)
}
