/**
 * Stats: the numbers a game keeps for the player and for entities, derived
 * stats worked out from others, and levels, shown or hidden. The engine has no
 * stats of its own; a game declares every one it uses.
 */
import { stringOf } from '../strings.ts'
import type { Game } from '../game.ts'
import { entityOf, entityStat, hasEntity, ofKind, ownerOf, statOwnerProblem, writeEntity } from '../entities.ts'
import { notify } from '../notices.ts'
import type { Amount, Condition, GameState, Range, StatKey, Stats } from '../types.ts'
import type { StatModifier } from '../plugin.ts'
import { byId, defineFeature, listWords, type FeatureContext } from './feature.ts'
import { withUi, type StatUi, type Ui } from './ui.ts'
import { inRange, wanted } from '../range.ts'

/**
 * A formula a derived stat declares in its `derive`, to work the stat out from other stats. A number is itself, and a
 * string is another stat's value.
 *
 * For a stat with `of`, a string names the same entity's stat.
 *
 * The other forms combine formulas:
 *
 * - `{ sum: [...] }`, `{ product: [...] }`, `{ min: [...] }` and `{ max: [...] }` combine a list.
 * - `{ scale: f, by: n }` is f times n.
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

/** The levels a stat declares in its `levels`, thresholds it passes as it grows. It can raise a notice when the player's stat passes one. */
export type StatLevels = {
  /** The value each level starts at, lowest first. A value below the first is level 0. */
  at: number[]
  /**
   * The notice raised, tagged `level`, when a command takes the player's stat up a level, such as
   * `'{label} is now level {level}.'`. The engine fills `{label}` and `{level}`, and raises no notice if left out.
   */
  notice?: string
  /**
   * The levels' hidden mark, true to keep them from the player. The view then gives the stat no `level`, and
   * `{ level }` conditions still read them.
   *
   * Use it for a hidden rating, such as how much a character trusts you.
   */
  hidden?: boolean
}

/**
 * A stat the game declares in `stats`, a number it keeps for the player or for each entity of a kind. The engine
 * has no stats of its own.
 *
 * Charisma, money, energy and a reputation are stats.
 */
export type StatDef = {
  /** The stat's id. */
  id: string
  /** The kind of entity the stat is kept on, such as `'staff'` for every member of staff. The player's stat if left out. */
  of?: string
  /** The stat's label, such as "Charisma" or "Money". */
  label: string
  /** The stat's value in a new game. 0 if left out. */
  start?: number
  /** The stat's lowest value. 0 if left out, and an `Amount`, so a floor can move with the game (`{ stat: 'debtLimit' }`). */
  min?: Amount
  /**
   * The stat's highest value. 100 if left out, and an `Amount`, so a ceiling can move with the game.
   *
   * It can read another stat (`{ stat: 'fitness' }`) or a value by name (`{ value: 'game/energyMax' }`, with `with`
   * for its arguments). A ceiling that reads the stat itself reads 100.
   */
  max?: Amount
  /** The stat's condition. The player can see the stat only while it holds, and always if left out. */
  visible?: Condition
  /** The stat's listed mark, false to leave it out of `view.stats` for a game that shows it its own way, as a gauge or a purse. True if left out. */
  listed?: boolean
  /** The stat's spendable mark, true for a stat spent on things, such as money, energy or time. A choice's or action's price is made of spendable stats. */
  spendable?: boolean
  /**
   * The refusal when a cost needs more than the player has, with `{n}` for the amount. Without it the engine says
   * "Not enough" and the label.
   *
   * It's one line (`'Not enough on you.'`, `'Need {n} energy.'`) or one for 1 and one for any other amount, as
   * `format` takes.
   */
  lacking?: StatWords
  /**
   * The stat's value written for the player, with `{n}` for the number, such as `'£{n}'` or `'{n} energy'`. The bare
   * number if left out.
   *
   * For words that change with the number, give one for 1 and one for any other,
   * `{ one: '{n} coin', other: '{n} coins' }`.
   */
  format?: StatWords
  /**
   * The formula the stat is worked out from instead of being kept, such as `{ sum: ['strength', 'agility'] }`.
   *
   * A derived stat is read like any stat and never written, and the loader reports a `stat` effect on one.
   */
  derive?: Formula
  /** The levels the stat passes as it grows. None if left out. */
  levels?: StatLevels
  /**
   * The stat's rounding when it's read, `'floor'`, `'round'` or `'ceil'` to a whole number, or `'none'`. `'none'` if
   * left out.
   *
   * It applies last, after `derive` and any plugin's modifiers, and the value is then held to the range. The kept
   * value underneath is never rounded.
   */
  round?: StatRound
  /** The stat's ui hints, carried to its view as written. */
  ui?: Ui<StatUi>
}

/** The rounding a stat declares in its `round`, applied when the stat is read. */
export type StatRound = 'none' | 'floor' | 'round' | 'ceil'

/** A stat as the player sees it, in `view.stats` and `view.statsById`, with its value, its range, the value written out and its hints. */
export type StatView = {
  /** The stat's id. */
  key: StatKey
  /** The stat's label. */
  label: string
  /** The stat's value as play reads it, kept or derived, with the plugins' modifiers, rounded and held to its range. */
  value: number
  /** The stat's lowest value now. */
  min: number
  /** The stat's highest value now. */
  max: number
  /** The stat's value written with its `format`, such as `'12 coins'` or `'80%'`. The bare number with no format. */
  text: string
  /**
   * The stat's place in its `levels`, with its level, the value the next level starts at (null at the top) and its
   * progress towards it, from 0 to 1.
   *
   * It's left out for a stat with no levels or hidden ones.
   */
  level?: { level: number; next: number | null; progress: number }
  /** The stat's ui hints, kept as written. Left out if it has none. */
  ui?: Ui<StatUi>
}

/** The stats feature's state, calls, content key, view and reference, as types. */
export type StatsShape = {
  state: {
    /** The player's stats, by id. An entity's stats are kept on the entity. */
    stats: Stats
  }
  conditions: {
    /** A condition on a stat's value, the player's, or with `of` an entity's (`'staff:ana'`, or `'$'` in an `each` or `where`). */
    stat: { stat: StatKey; of?: string } & Range
    /**
     * A condition on the level a stat with `levels` is at, the player's or with `of` an entity's. With no range it
     * holds at level 1 or more, and `{ level: 'baking', gte: 2 }` asks for 2.
     *
     * A stat with no levels is always at level 0.
     */
    level: { level: StatKey; of?: string } & Range
  }
  effects: {
    /**
     * An effect that changes a stat `by` an amount or sets it `to` a value, held to its range. It's the player's
     * stat, or with `of` an entity's (`'staff:ana'`, or `'$'` in an `each`).
     *
     * `by` and `to` are each an `Amount`, worked out as the effect applies, as in
     * `{ stat: 'coins', by: { stat: 'wage', of: '$' } }`.
     */
    stat: { stat: StatKey; by: Amount; of?: string } | { stat: StatKey; to: Amount; of?: string }
  }
  game: {
    /** The game's stats. The engine has none of its own. */
    stats?: StatDef[]
  }
  pack: {
    /** The pack's stats. A later pack's stat replaces an earlier one with the same id. */
    stats?: StatDef[]
  }
  view: {
    /** The player's listed stats the player can see now, in the order the game declares them. */
    stats: StatView[]
    /** Every one of the player's stats, by id, listed and visible or not. */
    statsById: Record<string, StatView>
  }
  lists: 'stat'
  fill: 'stats'
  references: {
    /**
     * A reference to a stat, on the player or with `of` on an entity (`'staff:ana'`, or `'staff:*'` for any of a
     * kind). `writes` marks an effect that changes it.
     *
     * With `starts`, it's a stat an entity of that kind is given a starting value for.
     */
    stat: { stat: string; of?: string; writes?: boolean } | { stat: string; starts: string }
  }
}

/** Returns the stat the game declares with this id. Undefined when there's none. */
export function statOf(game: Game, id: string): StatDef | undefined {
  return game.stats?.find((stat) => stat.id === id)
}

/** Returns each of the player's kept stats at its starting value. A derived stat is worked out, never kept, so it's left out. */
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
 * Returns a stat's value as play reads it, the player's or with `whose` an entity's (`'staff:ana'`). An entity that
 * isn't there reads 0.
 *
 * @remarks
 * A derived stat is worked out from its formula and held to its range, and a kept stat the save doesn't have yet
 * reads its `start`. Then the plugins' modifiers apply to the player's stats, then the stat's `round`, then its range
 * again.
 */
export function statValue(state: GameState, game: Game, id: string, whose: string | undefined, cx: FeatureContext): number {
  const of = ownerOf(state, whose)
  if (of !== undefined && !hasEntity(state, game, of)) return 0
  // An entity's kept stat reads what play left, then its declaration, then the stat's start.
  const kept = (key: string) => (of === undefined ? state.stats[key] : entityStat(state, game, of, key))
  // The plugins' modifiers change what the player's stats read, never what is kept.
  const modifiers = of === undefined ? cx.statModifiers(state, game) : []
  const read = (key: string, depth: number): number => {
    const def = statOf(game, key)
    let value: number
    if (def?.derive === undefined) value = kept(key) ?? def?.start ?? 0
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

/** Returns the level a value is at, the number of thresholds in `at`, lowest first, it has reached. */
export function levelAt(value: number, at: readonly number[]): number {
  let level = 0
  for (const threshold of at) {
    if (value >= threshold) level += 1
    else break
  }
  return level
}

/**
 * Returns a stat's place in its `levels`, with its level and the value the next level starts at (null at the top).
 * Undefined for a stat with no levels.
 *
 * `progress` runs from 0 at this level's start to 1 at the next, and is 1 at the top.
 */
export function statLevel(
  state: GameState,
  game: Game,
  id: string,
  of: string | undefined,
  cx: FeatureContext,
): { level: number; next: number | null; progress: number } | undefined {
  const def = statOf(game, id)
  if (!def?.levels) return undefined
  const at = def.levels.at
  const value = statValue(state, game, id, of, cx)
  const level = levelAt(value, at)
  const next = level < at.length ? at[level] : null
  if (next === null) return { level, next, progress: 1 }
  const from = level === 0 ? statMin(state, game, id, cx) : at[level - 1]
  const progress = next > from ? Math.max(0, Math.min(1, (value - from) / (next - from))) : 0
  return { level, next, progress }
}

/** Returns the ids of the stats a formula reads. */
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
 * Returns the problems with the game's derived stats and levels, each with where it is, such as `stat brains`.
 *
 * It reports a formula that names an unknown stat or another owner's, a cycle, a derived stat that is spendable or
 * has a start, and levels out of order or outside the stat's range.
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
        else if (used.of !== stat.of)
          out.push({ where, what: `derive reads stat "${id}", which belongs to ${used.of ?? 'the player'}, not ${stat.of ?? 'the player'}` })
      }
      if (stat.spendable) out.push({ where, what: 'a derived stat cannot be spendable: it is never written' })
      if (stat.start !== undefined) out.push({ where, what: 'a derived stat has no start: it is worked out' })
    }
    if (stat.levels) {
      const at = stat.levels.at
      if (!Array.isArray(at) || !at.length) out.push({ where, what: 'levels.at needs at least one threshold' })
      else {
        if (at.some((n, i) => i > 0 && n <= at[i - 1])) out.push({ where, what: 'levels.at must go up, each threshold above the last' })
        // A bound worked out in play can be anything: only one written as a number is checked here.
        const min = typeof stat.min === 'number' ? stat.min : stat.min === undefined ? 0 : -Infinity
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

/** The bounds being worked out now, by `stat id`: a bound that reads its own stat back reads its default instead of going round. */
const working = new Set<string>()

/** A stat's bound worked out: as written for a number, else its `Amount` read now, with `fallback` while it is already being read. */
function bound(state: GameState, game: Game, id: string, which: 'min' | 'max', fallback: number, cx: FeatureContext): number {
  const amount = statOf(game, id)?.[which]
  if (amount === undefined) return fallback
  if (typeof amount === 'number') return amount
  // A value nobody declares, as from a plugin the game no longer has, leaves the default.
  if (typeof amount === 'object' && 'value' in amount && !cx.customValue(game, amount.value)) return fallback
  const key = `${which} ${id}`
  if (working.has(key)) return fallback
  working.add(key)
  try {
    const value = cx.amount(state, game, amount)
    return Number.isFinite(value) ? value : fallback
  } finally {
    working.delete(key)
  }
}

/** Returns a stat's highest value now, its `max` worked out when it's an `Amount`. 100 when the stat sets none. */
export function statMax(state: GameState, game: Game, id: string, cx: FeatureContext): number {
  return bound(state, game, id, 'max', 100, cx)
}

/** Returns a stat's lowest value now, its `min` worked out when it's an `Amount`. 0 when the stat sets none. */
export function statMin(state: GameState, game: Game, id: string, cx: FeatureContext): number {
  return bound(state, game, id, 'min', 0, cx)
}

/** Returns a value held to the stat's range, 0 to 100 unless the stat sets `min` or `max`. */
export function clampStat(state: GameState, game: Game, id: string, value: number, cx: FeatureContext): number {
  return Math.max(statMin(state, game, id, cx), Math.min(statMax(state, game, id, cx), value))
}

/** Returns the refusal for a cost the player can't cover, from the stat's `lacking`, else the `notEnough` string with the stat's label in lower case. */
export function lackingLine(game: Game, id: string, amount: number): string {
  const def = statOf(game, id)
  if (def?.lacking) return counted(def.lacking, amount)
  return stringOf(game, 'notEnough', { stat: (def?.label ?? id).toLowerCase(), n: amount })
}

/** Returns a value written for the player with the stat's `format`. The bare number when the stat has no format. */
export function formatStat(def: StatDef | undefined, value: number): string {
  return def?.format ? counted(def.format, value) : String(value)
}

/** A stat's words for a number, with `{n}` for it. It's one line for every number, or `one` for exactly 1 and `other` for the rest. */
export type StatWords = string | { one: string; other: string }

/** A stat's words for a number, with `{n}` filled in. */
function counted(words: StatWords, n: number): string {
  const text = typeof words === 'string' ? words : n === 1 ? words.one : words.other
  return text.replaceAll('{n}', String(n))
}

/** Returns a stat as the player sees it, the player's or with `of` an entity's. */
export function statView(state: GameState, game: Game, stat: StatDef, of: string | undefined, cx: FeatureContext): StatView {
  const value = statValue(state, game, stat.id, of, cx)
  const level = stat.levels?.hidden ? undefined : statLevel(state, game, stat.id, of, cx)
  return {
    key: stat.id,
    label: stat.label,
    value,
    min: statMin(state, game, stat.id, cx),
    max: statMax(state, game, stat.id, cx),
    text: formatStat(stat, value),
    ...(level ? { level } : {}),
    ...withUi(stat.ui),
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

/** What a `stat` effect leaves: held to the stat's range, on the player or an entity. */
function writeStat(state: GameState, game: Game, key: StatKey, of: string | undefined, to: (was: number) => number, cx: FeatureContext): GameState {
  // Written with `of` already made real: `'you'` and `'player'` are read by `ownerOf` first.
  // A derived stat is worked out, never written: the loader reports the effect.
  if (statOf(game, key)?.derive !== undefined) return state
  if (of !== undefined) {
    const entity = entityOf(state, game, of)
    if (!entity) return state
    const value = clampStat(state, game, key, to(entityStat(state, game, of, key) ?? statOf(game, key)?.start ?? 0), cx)
    return writeEntity(state, of, { ...entity, stats: { ...entity.stats, [key]: value } })
  }
  const was = state.stats[key] ?? 0
  const value = clampStat(state, game, key, to(was), cx)
  return { ...state, stats: { ...state.stats, [key]: value } }
}

/** The stats feature, which keeps the player's stats, reads every stat and raises level-up notices. */
export const stats = defineFeature<StatsShape>({
  name: 'stats',
  state: {
    stats: { start: (game) => startingStats(game) },
  },
  conditions: {
    stat: {
      holds: (state, condition, game, cx) => {
        const of = ownerOf(state, condition.of)
        // An entity that is not there fails every range, `lt` included.
        if (of !== undefined && !hasEntity(state, game, of)) return false
        if (!game) return inRange(state.stats[condition.stat] ?? 0, condition)
        return inRange(statValue(state, game, condition.stat, of, cx), condition)
      },
      explain: (state, condition, game, cx) => {
        const of = ownerOf(state, condition.of)
        const read = (whose?: string) => (game ? statValue(state, game, condition.stat, whose, cx) : (state.stats[condition.stat] ?? 0))
        if (of === undefined) return `stat ${condition.stat} is ${read()}; wants ${wanted(condition)}`
        if (!hasEntity(state, game, of)) return `${of} is not in the game`
        return `${of} stat ${condition.stat} is ${read(of)}; wants ${wanted(condition)}`
      },
      references: (condition) => [{ stat: condition.stat, of: condition.of }, ...ofKind(condition.of)],
    },
    level: {
      holds: (state, condition, game, cx) => {
        const of = ownerOf(state, condition.of)
        if (of !== undefined && !hasEntity(state, game, of)) return false
        return inRange(game ? (statLevel(state, game, condition.level, of, cx)?.level ?? 0) : 0, condition)
      },
      explain: (state, condition, game, cx) => {
        const of = ownerOf(state, condition.of)
        if (of !== undefined && !hasEntity(state, game, of)) return `${of} is not in the game`
        const level = game ? (statLevel(state, game, condition.level, of, cx)?.level ?? 0) : 0
        return `${of === undefined ? '' : `${of} `}stat ${condition.level} is at level ${level}; wants ${wanted(condition)}`
      },
      references: (condition) => [{ stat: condition.level, of: condition.of }, ...ofKind(condition.of)],
    },
  },
  effects: {
    stat: {
      apply: (state, effect, game, cx) => {
        const set = 'to' in effect
        const of = ownerOf(state, effect.of)
        const amount = cx.amount(state, game, set ? effect.to : effect.by)
        const after = writeStat(state, game, effect.stat, of, (was) => (set ? amount : was + amount), cx)
        if (after === state || of !== undefined) return after
        const delta = set ? after.stats[effect.stat] - (state.stats[effect.stat] ?? 0) : amount
        return cx.statHooks(state, after, effect.stat, delta, game)
      },
      references: (effect) => [{ stat: effect.stat, of: effect.of, writes: true }, ...ofKind(effect.of), { amount: 'to' in effect ? effect.to : effect.by }],
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
  content: { stats: { declares: byId('stat'), words: listWords('stats', 'stat', { label: true, format: true, lacking: true, levels: { notice: true } }) } },
  lists: ['stat'],
  // A kept stat of the player's the save lacks starts at its start. An entity's reads its start until play changes it.
  fill: {
    part: 'stats',
    run: (state, game) => {
      const lacking = (game.stats ?? []).filter((stat) => stat.derive === undefined && !stat.of && state.stats?.[stat.id] === undefined)
      return lacking.length ? { ...state, stats: { ...state.stats, ...Object.fromEntries(lacking.map((stat) => [stat.id, stat.start ?? 0])) } } : state
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
      const statsById = new Map((game.stats ?? []).map((stat) => [stat.id, stat]))
      for (const id of game.carryOver?.stats ?? []) {
        const def = statsById.get(id)
        if (!def) tools.problem({ list: 'carryOver' }, 'carryOver', `unknown stat "${id}"`)
        else if (def.of !== undefined) tools.problem({ list: 'carryOver' }, 'carryOver', `stat "${id}" belongs to ${def.of}, not the player`)
      }
    },
  },
  check: (game, tools) => {
    tools.twice(
      'stat',
      'stats',
      (game.stats ?? []).map((entry) => entry.id),
    )
    const kindIds = new Set([...(game.kinds ?? []), ...(game.plugins ?? []).flatMap((plugin) => plugin.content?.kinds ?? [])].map((kind) => kind.id))
    for (const stat of game.stats ?? []) {
      const source = { list: 'stat', id: stat.id }
      const where = `stat ${stat.id}`
      if (stat.of !== undefined && !kindIds.has(stat.of)) tools.problem(source, where, `belongs to unknown kind "${stat.of}"`)
      tools.check(source, where, [
        ...(stat.min !== undefined ? [{ amount: stat.min }] : []),
        ...(stat.max !== undefined ? [{ amount: stat.max }] : []),
        { when: stat.visible },
        { ui: stat.ui, on: 'stat', id: stat.id },
      ])
    }
    // Derived stats and levels: formulas, cycles, thresholds.
    for (const { where, what } of statProblems(game)) tools.problem({ list: 'stat', id: where.slice('stat '.length) }, where, what)
  },
  resolve: (game) => {
    const statsById = new Map((game.stats ?? []).map((stat) => [stat.id, stat]))
    return {
      stat: (ref) => {
        const def = statsById.get(ref.stat)
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
      .filter((stat) => !stat.of && stat.listed !== false && cx.holds(state, game, stat.visible))
      .map((stat) => statView(state, game, stat, undefined, cx)),
    statsById: Object.fromEntries((game.stats ?? []).filter((stat) => !stat.of).map((stat) => [stat.id, statView(state, game, stat, undefined, cx)])),
  }),
  // After the plugins' `onCommand` hooks, so a level a hook's reward reached is noticed too.
  afterCommand: { at: 'afterPlugins', run: levelUps },
})
