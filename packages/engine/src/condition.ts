import type { Game } from './game.ts'
import { storylineOf, storylineOpen } from './storylines.ts'
import { customCall, customCondition, type PluginCall } from './custom.ts'
import { statBand, statLevel, statValue } from './stats.ts'
import { turnsSince } from './progress.ts'
import { bindCurrent, entitiesOf, entityOf } from './entities.ts'
import type {
  FlagValue,
  GameState,
  Phase,
  StatKey,
} from './types.ts'

/**
 * When a thing applies: a block of prose, a choice, a line in a variants.
 *
 * Plain nested data, so content stays serialisable and the loader can check it
 * — `{ storyline: 'baker' }` is verifiable against the declared storylines in a way
 * that an arbitrary function never was. Anything genuinely derived escapes
 * through `{ custom: name }`, a custom condition the game declares.
 */
export type Range = { gte?: number; gt?: number; lte?: number; lt?: number }

export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  /**
   * A variable. Bare, it asks whether it is set to anything truthy; with `is`,
   * whether it equals that; with a range, whether its number is in it (a
   * variable that is not a number counts as 0): `{ flag: 'lies', gte: 3 }`.
   * With `of`, an entity's variable: `{ flag: 'role', of: '$', is: 'cook' }`.
   */
  | ({ flag: string; is?: FlagValue; of?: string } & Range)
  /**
   * A `play` setting, read as a variable is: bare, whether it is truthy
   * (`{ setting: 'hints' }`); with `is`, whether it equals that; with a range,
   * whether its number is in it.
   */
  | ({ setting: string; is?: FlagValue } & Range)
  /**
   * How many times a choice has been picked, by `scene/choice`. Bare, at least
   * once: `{ chose: 'bakery.counter/buy-bread' }`.
   */
  | ({ chose: string } & Range)
  /**
   * A scene the player has already been through. The order half of a gate: a
   * stat says whether you are good enough yet, this says whether you have been
   * here yet. Bare, it asks for one viewing; `{ seen: 'x', gte: 2 }` for two.
   */
  | ({ seen: string } & Range)
  /**
   * Whole turns since a scene was first entered. The pace half of a gate:
   * `{ since: 'baker.first-coffee', gte: 5 }` holds from five turns after
   * the first coffee. A scene not yet seen fails every range, `lt` included — "not long
   * since" is not true of something that has not happened.
   */
  | ({ since: string } & Range)
  | { storylineFlag: { storyline: string; key: string; is?: FlagValue } }
  /** A stat: the player's, or with `of`, an entity's (`'staff:ana'`, or `'$'` in an `each` or `where`). */
  | ({ stat: StatKey; of?: string } & Range)
  /**
   * How many entities of a kind there are, or with `where`, how many it holds
   * for (`'$'` in it is each one in turn). Bare, at least one:
   * `{ count: 'staff', where: { stat: 'morale', of: '$', lt: 20 }, gte: 2 }`.
   */
  | ({ count: string; where?: Condition } & Range)
  /** An entity is in the game: `{ entity: 'staff:ana' }`. */
  | { entity: string }
  | { tier: StatKey; gte: number }
  /**
   * The level a stat with `levels` is at: the player's, or with `of`, an
   * entity's. Bare, level 1 or more: `{ level: 'baking', gte: 2 }`. A stat
   * with no levels is always level 0.
   */
  | ({ level: StatKey; of?: string } & Range)
  /**
   * A storyline is open (`open: true`, the default): not closed, or closed
   * until a turn that has come. With `open: false`, that it is closed for now.
   */
  | { storyline: string; open?: boolean }
  | ({ counter: { storyline: string; key: string } } & Range)
  | ({ item: string } & Range)
  /** Owns at least one. */
  | { has: string }
  /**
   * What is in a collection. With `id`: that entry is there. Without: how many
   * entries there are, at least one if no range is given.
   */
  | ({ collection: string; id?: string } & Range)
  /** The scene on screen is one of these. */
  | { scene: string[] }
  /** How many turns have passed. Turn 0 is the first, so `{ turn: true, gte: 3 }` is the fourth on. */
  | ({ turn: true } & Range)
  | { phase: Phase[] }
  /** A custom condition the game declares by this name, or a plugin's (`quests/done`), with what it is asked. */
  | { custom: string; with?: Record<string, unknown> }
  /** A plugin's condition in short: `{ 'quests/done': { quest: 'bakery' } }`. See `PluginCall`. */
  | PluginCall

function bounded(range: Range): boolean {
  return range.gte !== undefined || range.gt !== undefined || range.lte !== undefined || range.lt !== undefined
}

/** Is the number in the range? A range with no bounds asks whether it is above 0. For plugin conditions that take one. */
export function inRange(value: number, range: Range): boolean {
  // A bare test with no bounds asks whether there is any of it at all.
  if (!bounded(range)) return value > 0
  if (range.gte !== undefined && value < range.gte) return false
  if (range.gt !== undefined && value <= range.gt) return false
  if (range.lte !== undefined && value > range.lte) return false
  if (range.lt !== undefined && value >= range.lt) return false
  return true
}

function counted(value: FlagValue | undefined): number {
  return typeof value === 'number' ? value : 0
}

export function holds(
  state: GameState,
  condition: Condition | undefined,
  game?: Game,
): boolean {
  if (!condition) return true
  if ('all' in condition) {
    return condition.all.every((entry) => holds(state, entry, game))
  }
  if ('any' in condition) {
    return condition.any.some((entry) => holds(state, entry, game))
  }
  if ('not' in condition) return !holds(state, condition.not, game)
  const call = customCall(condition)
  if (call) {
    const fn = customCondition(game, call.custom)
    // An undeclared custom condition is a content fault the loader reports; here it
    // simply does not apply, so a broken mod hides content rather than crashing.
    return fn ? fn(state, call.with ?? {}) : false
  }

  if ('flag' in condition) {
    const flags = condition.of === undefined ? state.flags : entityOf(state, condition.of)?.flags
    // An entity that is not there has no variables to test: false, whatever was asked.
    if (!flags) return false
    const value = flags[condition.flag]
    if (condition.is !== undefined) return value === condition.is
    if (bounded(condition)) return inRange(counted(value), condition)
    return Boolean(value)
  }
  if ('setting' in condition) {
    const value = state.settings?.[condition.setting]
    if (condition.is !== undefined) return value === condition.is
    if (bounded(condition)) return inRange(counted(value), condition)
    return Boolean(value)
  }
  if ('chose' in condition) return inRange(state.chosen?.[condition.chose] ?? 0, condition)
  if ('seen' in condition) return inRange(state.seen?.[condition.seen] ?? 0, condition)
  if ('since' in condition) {
    const turns = turnsSince(state, condition.since)
    return turns !== null && inRange(turns, condition)
  }
  if ('storylineFlag' in condition) {
    const { storyline, key, is } = condition.storylineFlag
    const value = storylineOf(state, storyline).flags[key]
    return is === undefined ? Boolean(value) : value === is
  }
  if ('stat' in condition) {
    // An entity that is not there fails every range, `lt` included.
    if (condition.of !== undefined && !entityOf(state, condition.of)) return false
    if (!game) return inRange(state.stats[condition.stat] ?? 0, condition)
    return inRange(statValue(state, game, condition.stat, condition.of), condition)
  }
  if ('count' in condition) {
    const refs = entitiesOf(state, condition.count)
    const n = condition.where ? refs.filter((ref) => holds(state, bindCurrent(condition.where, ref), game)).length : refs.length
    return inRange(n, condition)
  }
  if ('entity' in condition) return entityOf(state, condition.entity) !== undefined
  if ('level' in condition) {
    if (condition.of !== undefined && !entityOf(state, condition.of)) return false
    return inRange(game ? (statLevel(state, game, condition.level, condition.of)?.level ?? 0) : 0, condition)
  }
  if ('tier' in condition) {
    if (!game) return false
    return statBand(state, game, condition.tier) >= condition.gte
  }
  if ('storyline' in condition) return storylineOpen(state, condition.storyline) === (condition.open ?? true)
  if ('counter' in condition) {
    const { storyline, key } = condition.counter
    return inRange(counted(storylineOf(state, storyline).flags[key]), condition)
  }
  if ('item' in condition) return inRange(state.items[condition.item] ?? 0, condition)
  if ('collection' in condition) {
    const entries = state.collections?.[condition.collection] ?? []
    if (condition.id !== undefined) return entries.some((entry) => entry.id === condition.id)
    if (!bounded(condition)) return entries.length > 0
    return inRange(entries.length, condition)
  }
  if ('has' in condition) {
    return (state.items[condition.has] ?? 0) > 0
  }
  if ('scene' in condition) {
    return state.sceneId !== null && condition.scene.includes(state.sceneId)
  }
  if ('turn' in condition) return inRange(state.turn, condition)
  if ('phase' in condition) return condition.phase.includes(state.phase)
  return false
}
