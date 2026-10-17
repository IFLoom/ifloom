/**
 * Stats: the numbers a game keeps for the player and for entities, derived
 * stats worked out from others, levels, and hidden bands. The engine has no
 * stats of its own; a game declares every one it uses.
 */
import { say } from '../strings.ts'
import type { Game } from '../game.ts'
import { tier } from '../tier.ts'
import { entityOf, ofKind, statOwnerProblem, writeEntity } from '../entities.ts'
import { notify } from '../notices.ts'
import type { Condition, GameState, Range, StatKey, Stats } from '../types.ts'
import type { StatModifier } from '../plugin.ts'
import type { ValueRef } from '../calls.ts'
import { defineFeature, inRange, wanted, type FeatureContext } from './feature.ts'

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
   * Highest it can go. 100 if left out. A number, or a custom value by name
   * (`{ value: 'energyMax' }`, with `with` for its arguments) when the
   * ceiling moves with the game.
   */
  max?: number | ValueRef
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
   * reports a `stat` effect on one. See `Formula`.
   */
  derive?: Formula
  /** Levels the stat passes as it grows. None if left out. See `StatLevels`. */
  levels?: StatLevels
  /**
   * How a UI should draw it: the number, a bar from `min` to `max`, or pips,
   * one per point. `'number'` if left out. Pips suit a small range: the
   * checker reports pips on a stat whose range is more than 20.
   */
  display?: StatDisplay
  /**
   * How the value reads: `'floor'`, `'round'` or `'ceil'` to a whole number,
   * or `'none'` to read it as it is. Applied to what is read, last, after
   * `derive` and any plugin's modifiers, then held to the range; the kept
   * value underneath is never rounded. `'none'` if left out.
   */
  round?: StatRound
}

/** How a stat's value is rounded when it is read: see `StatDef.round`. */
export type StatRound = 'none' | 'floor' | 'round' | 'ceil'

/** How a UI draws a stat: see `StatDef.display`. */
export type StatDisplay = 'number' | 'bar' | 'pips'

/** A stat as the UI shows it: its value, its range, the value written out, and how to draw it. */
export type StatView = {
  key: StatKey
  label: string
  value: number
  /** The lowest it can go. */
  min: number
  /** The highest it can go right now. */
  max: number
  /** How to draw it, from `StatDef.display`: `'number'` if the game doesn't say. */
  display: StatDisplay
  text: string
  /**
   * Where a stat with `levels` stands: its level, the value the next level
   * starts at (null at the top), and how far it is towards it, 0 to 1. Left
   * out for a stat with no levels.
   */
  level?: { level: number; next: number | null; progress: number }
}

/** What the stats feature adds, as types. */
export type StatsShape = {
  state: {
    /** The player's stats. An entity's are on the entity. */
    stats: Stats
  }
  conditions: {
    /** A stat: the player's, or with `of`, an entity's (`'staff:ana'`, or `'$'` in an `each` or `where`). */
    stat: { stat: StatKey; of?: string } & Range
    tier: { tier: StatKey; gte: number }
    /**
     * The level a stat with `levels` is at: the player's, or with `of`, an
     * entity's. Bare, level 1 or more: `{ level: 'baking', gte: 2 }`. A stat
     * with no levels is always level 0.
     */
    level: { level: StatKey; of?: string } & Range
  }
  effects: {
    /**
     * Change a stat `by` an amount, or put it `to` a value (energy back to
     * full overnight), held to its range: the player's, or with `of`, an
     * entity's (`'staff:ana'`, or `'$'` in an `each`).
     */
    stat: { kind: 'stat'; stat: StatKey; by: number; of?: string } | { kind: 'stat'; stat: StatKey; to: number; of?: string }
  }
  game: {
    /** Every stat the game keeps. The engine has none of its own. */
    stats?: StatDef[]
  }
  pack: {
    /** Stats the game keeps. A later pack can redeclare one by id. */
    stats?: StatDef[]
  }
  view: {
    stats: StatView[]
    /** Every declared stat, by id, whether or not it is listed. */
    statsById: Record<string, StatView>
  }
  lists: 'stat'
  fill: 'stats'
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
 * `start`. Then the plugins' modifiers, then the stat's `round`, then its
 * range again. An entity that isn't there reads 0.
 */
export function statValue(state: GameState, game: Game, id: string, of: string | undefined, cx: FeatureContext): number {
  const stats = of === undefined ? state.stats : entityOf(state, of)?.stats
  if (!stats) return 0
  // The plugins' modifiers change what the player's stats read, never what is kept.
  const modifiers = of === undefined ? cx.statModifiers(state, game) : []
  const read = (key: string, depth: number): number => {
    const def = statDef(game, key)
    let value: number
    if (def?.derive === undefined) value = stats[key] ?? def?.start ?? 0
    else if (depth > DEPTH) return 0
    else value = clampStat(state, game, key, evaluate(def.derive, read, depth), cx)
    if (modifiers.length) value = modified(state, game, key, value, modifiers, cx)
    return rounded(state, game, key, def, value, cx)
  }
  return read(id, 0)
}

/**
 * A value as the stat's `round` reads it: rounded, then held to the range,
 * so a stat with a fractional `min` or `max` never reads past it. As it is
 * for `'none'`.
 */
function rounded(state: GameState, game: Game, key: string, def: StatDef | undefined, value: number, cx: FeatureContext): number {
  const how = def?.round ?? 'none'
  if (how === 'none') return value
  return clampStat(state, game, key, Math[how](value), cx)
}

/**
 * A value with the modifiers on this stat applied: the adds summed, then the
 * total multiplied by every multiplier, held to the stat's range. A stat no
 * modifier names reads as it is.
 */
function modified(state: GameState, game: Game, key: string, value: number, modifiers: readonly StatModifier[], cx: FeatureContext): number {
  let add = 0
  let multiply = 1
  let named = false
  for (const modifier of modifiers) {
    if (modifier.stat !== key) continue
    named = true
    add += modifier.add ?? 0
    multiply *= modifier.multiply ?? 1
  }
  return named ? clampStat(state, game, key, (value + add) * multiply, cx) : value
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
  of: string | undefined,
  cx: FeatureContext,
): { level: number; next: number | null; progress: number } | undefined {
  const def = statDef(game, id)
  if (!def?.levels) return undefined
  const at = def.levels.at
  const value = statValue(state, game, id, of, cx)
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
export function statMax(state: GameState, game: Game, id: string, cx: FeatureContext): number {
  const max = statDef(game, id)?.max
  if (max === undefined) return 100
  if (typeof max === 'number') return max
  const fn = cx.customValue(game, max.value)
  return fn ? Number(fn(state, max.with ?? {})) : 100
}

/** A value held to the stat's declared range (0–100 unless it says). */
export function clampStat(state: GameState, game: Game, id: string, value: number, cx: FeatureContext): number {
  const min = statDef(game, id)?.min ?? 0
  return Math.max(min, Math.min(statMax(state, game, id, cx), value))
}

/** The refusal for a cost the player cannot cover. */
export function lackingLine(def: StatDef | undefined, id: string, amount: number, game?: Game): string {
  if (def?.lacking) return def.lacking.replaceAll('{n}', String(amount))
  return say(game, 'notEnough', { stat: (def?.label ?? id).toLowerCase(), n: amount })
}

/** Which of its hidden bands a stat has reached. */
export function statBand(state: GameState, game: Game, id: string, cx: FeatureContext): number {
  const bands = statDef(game, id)?.bands
  return bands ? tier(statValue(state, game, id, undefined, cx), bands) : 0
}

/** A value as the player reads it, through the stat's `format`. */
export function formatStat(def: StatDef | undefined, value: number): string {
  return def?.format ? def.format.replace('{n}', String(value)) : String(value)
}

/** One stat as the UI shows it: the player's, or with `of`, an entity's. */
export function statView(state: GameState, game: Game, stat: StatDef, of: string | undefined, cx: FeatureContext): StatView {
  const value = statValue(state, game, stat.id, of, cx)
  const level = statLevel(state, game, stat.id, of, cx)
  return {
    key: stat.id,
    label: stat.label,
    value,
    min: stat.min ?? 0,
    max: statMax(state, game, stat.id, cx),
    text: formatStat(stat, value),
    display: stat.display ?? 'number',
    ...(level ? { level } : {}),
  }
}

/**
 * A notice for each of the player's stats a command took up a level, when the
 * stat's `levels` has a `notice`. Tagged `level`, one per stat: a second
 * level-up replaces the first while it is unseen.
 */
function levelUps(before: GameState, after: GameState, game: Game, cx: FeatureContext): GameState {
  let next = after
  for (const stat of game.stats ?? []) {
    if (stat.of || !stat.levels?.notice) continue
    const was = statLevel(before, game, stat.id, undefined, cx)?.level ?? 0
    const now = statLevel(after, game, stat.id, undefined, cx)?.level ?? 0
    if (now <= was) continue
    const title = stat.levels.notice.replaceAll('{label}', stat.label).replaceAll('{level}', String(now))
    next = notify(next, { id: `level.${stat.id}`, title, tag: 'level' })
  }
  return next
}

/** What a `stat` effect leaves: held to the stat's range, on the player or an entity, through `rules.onStat`. */
function writeStat(state: GameState, game: Game, key: StatKey, of: string | undefined, to: (was: number) => number, cx: FeatureContext): GameState {
  // A derived stat is worked out, never written: the loader reports the effect.
  if (statDef(game, key)?.derive !== undefined) return state
  if (of !== undefined) {
    const entity = entityOf(state, of)
    if (!entity) return state
    const value = clampStat(state, game, key, to(entity.stats[key] ?? 0), cx)
    return writeEntity(state, of, { ...entity, stats: { ...entity.stats, [key]: value } })
  }
  const was = state.stats[key] ?? 0
  const value = clampStat(state, game, key, to(was), cx)
  return { ...state, stats: { ...state.stats, [key]: value } }
}

export const stats = defineFeature<StatsShape>({
  name: 'stats',
  state: {
    stats: { start: (game) => startingStats(game) },
  },
  conditions: {
    stat: {
      holds: (state, condition, game, cx) => {
        // An entity that is not there fails every range, `lt` included.
        if (condition.of !== undefined && !entityOf(state, condition.of)) return false
        if (!game) return inRange(state.stats[condition.stat] ?? 0, condition)
        return inRange(statValue(state, game, condition.stat, condition.of, cx), condition)
      },
      explain: (state, condition, game, cx) => {
        const read = (of?: string) => (game ? statValue(state, game, condition.stat, of, cx) : (state.stats[condition.stat] ?? 0))
        if (condition.of === undefined) return `stat ${condition.stat} is ${read()}; wants ${wanted(condition)}`
        if (!entityOf(state, condition.of)) return `${condition.of} is not in the game`
        return `${condition.of} stat ${condition.stat} is ${read(condition.of)}; wants ${wanted(condition)}`
      },
      references: (condition) => [{ stat: condition.stat, of: condition.of }, ...ofKind(condition.of)],
    },
    tier: {
      holds: (state, condition, game, cx) => (game ? statBand(state, game, condition.tier, cx) >= condition.gte : false),
      explain: (state, condition, game, cx) => {
        const band = game ? statBand(state, game, condition.tier, cx) : 0
        return `stat ${condition.tier} is in band ${band}; wants band ${condition.gte} or more`
      },
      references: (condition) => [{ stat: condition.tier }],
    },
    level: {
      holds: (state, condition, game, cx) => {
        if (condition.of !== undefined && !entityOf(state, condition.of)) return false
        return inRange(game ? (statLevel(state, game, condition.level, condition.of, cx)?.level ?? 0) : 0, condition)
      },
      explain: (state, condition, game, cx) => {
        if (condition.of !== undefined && !entityOf(state, condition.of)) return `${condition.of} is not in the game`
        const level = game ? (statLevel(state, game, condition.level, condition.of, cx)?.level ?? 0) : 0
        return `${condition.of === undefined ? '' : `${condition.of} `}stat ${condition.level} is at level ${level}; wants ${wanted(condition)}`
      },
      references: (condition) => [{ stat: condition.level, of: condition.of }, ...ofKind(condition.of)],
    },
  },
  effects: {
    stat: {
      apply: (state, effect, game, cx) => {
        const set = 'to' in effect
        const after = writeStat(state, game, effect.stat, effect.of, (was) => (set ? effect.to : was + effect.by), cx)
        if (after === state || effect.of !== undefined) return after
        const delta = set ? after.stats[effect.stat] - (state.stats[effect.stat] ?? 0) : effect.by
        return game.rules?.onStat?.(state, after, effect.stat, delta) ?? after
      },
      references: (effect) => [{ stat: effect.stat, of: effect.of, writes: true }, ...ofKind(effect.of)],
    },
  },
  pack: {
    // A later pack's stat replaces an earlier one's by id. The base game's own aren't merged.
    merge: () => {
      const merged = new Map<string, { value: StatDef; from: string }>()
      return {
        base: () => {},
        add: (pack, from) => {
          for (const stat of pack.stats ?? []) merged.set(stat.id, { value: stat, from })
        },
        finish: (game) => {
          game.stats = [...merged.values()].map((entry) => entry.value)
        },
        from: (_list, id) => (id === undefined ? undefined : merged.get(id)?.from),
      }
    },
  },
  lists: ['stat'],
  // A kept stat the save lacks, the player's or an entity's, starts at its start.
  fill: {
    kind: 'stats',
    run: (state, game) => {
      let next = state
      const kept = (game.stats ?? []).filter((stat) => stat.derive === undefined)
      const lacking = kept.filter((stat) => !stat.of && next.stats?.[stat.id] === undefined)
      if (lacking.length) next = { ...next, stats: { ...next.stats, ...Object.fromEntries(lacking.map((stat) => [stat.id, stat.start ?? 0])) } }
      for (const [kind, entities] of Object.entries(next.entities ?? {})) {
        const owned = kept.filter((stat) => stat.of === kind)
        for (const [id, entity] of Object.entries(entities)) {
          const missing = owned.filter((stat) => entity.stats?.[stat.id] === undefined)
          if (!missing.length) continue
          const stats = { ...entity.stats, ...Object.fromEntries(missing.map((stat) => [stat.id, stat.start ?? 0])) }
          next = writeEntity(next, `${kind}:${id}`, { ...entity, stats })
        }
      }
      return next
    },
  },
  // A New Game+ carries the player's stats `carryOver` lists, held to the new game's range.
  carry: {
    key: 'stats',
    run: (fresh, game, from, _options, cx) => {
      const stats = { ...fresh.stats }
      for (const id of game.carryOver?.stats ?? []) {
        if (typeof from.stats?.[id] === 'number') stats[id] = clampStat(fresh, game, id, from.stats[id], cx)
      }
      return { stats }
    },
    check: (game, tools) => {
      const statOf = new Map((game.stats ?? []).map((stat) => [stat.id, stat]))
      for (const id of game.carryOver?.stats ?? []) {
        const def = statOf.get(id)
        if (!def) tools.problem(undefined, 'carryOver', `unknown stat "${id}"`)
        else if (def.of !== undefined) tools.problem(undefined, 'carryOver', `stat "${id}" belongs to ${def.of}, not the player`)
      }
    },
  },
  check: (game, tools) => {
    tools.twice('stat', 'stats', (game.stats ?? []).map((entry) => entry.id))
    const kindIds = new Set([...(game.kinds ?? []), ...(game.plugins ?? []).flatMap((plugin) => plugin.kinds ?? [])].map((kind) => kind.id))
    for (const stat of game.stats ?? []) {
      const source = { list: 'stat', id: stat.id }
      const where = `stat ${stat.id}`
      if (stat.of !== undefined && !kindIds.has(stat.of)) tools.problem(source, where, `belongs to unknown kind "${stat.of}"`)
      tools.check(source, where, [...(typeof stat.max === 'object' ? [{ value: stat.max.value }] : []), { when: stat.visible }])
      // Pips are one per point, so a wide range can't be drawn as pips. A ceiling from a custom value isn't known until play.
      if (stat.display === 'pips' && typeof stat.max !== 'object') {
        const range = (stat.max ?? 100) - (stat.min ?? 0)
        if (range > 20) tools.problem(source, where, `display pips needs a range of 20 or less; this one is ${range}`)
      }
    }
    // Derived stats and levels: formulas, cycles, thresholds.
    for (const { where, what } of statProblems(game)) tools.problem({ list: 'stat', id: where.slice('stat '.length) }, where, what)
  },
  resolve: (game) => {
    const statOf = new Map((game.stats ?? []).map((stat) => [stat.id, stat]))
    return {
      stat: (ref) => {
        const def = statOf.get(ref.stat)
        if ('starts' in ref) {
          if (def?.of !== ref.starts) return [`no ${ref.starts} stat named "${ref.stat}"`]
          return def.derive !== undefined ? [`stat "${ref.stat}" is derived: it is worked out, never written`] : []
        }
        if (!def) return [`unknown stat "${ref.stat}"`]
        const out: string[] = []
        const owner = statOwnerProblem(def.of, ref.stat, ref.of)
        if (owner) out.push(owner)
        if (ref.writes && def.derive !== undefined) out.push(`stat "${ref.stat}" is derived: it is worked out, never written`)
        return out
      },
    }
  },
  view: (state, game, _shown, cx) => ({
    // The listed stats the player can see right now, in the order the game declared them.
    stats: (game.stats ?? [])
      .filter((stat) => !stat.of && stat.listed !== false && cx.holds(state, stat.visible, game))
      .map((stat) => statView(state, game, stat, undefined, cx)),
    statsById: Object.fromEntries((game.stats ?? []).filter((stat) => !stat.of).map((stat) => [stat.id, statView(state, game, stat, undefined, cx)])),
  }),
  // After the plugins' `onCommand` hooks, so a level a hook's reward reached is noticed too.
  afterCommand: { at: 'afterPlugins', run: levelUps },
})
