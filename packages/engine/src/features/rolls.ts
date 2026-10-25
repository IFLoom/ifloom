/**
 * Dice rolls: the `roll` effect throws dice, seeded and replay-exact, keeps
 * the total in the kv store under its key, and records the roll so a
 * condition can read the outcome and a UI can show the faces.
 *
 * Each die is drawn from the save's seed, the turn, the save's count of rolls
 * made so far, the key and the die's place. The count goes up with every roll,
 * so two rolls in one command (or the same roll tried twice in a turn) differ,
 * while a replay of the same commands makes the same rolls.
 *
 * The view's `rolls` are the rolls the last command made, for a UI to
 * animate; a command that rolls nothing leaves it empty.
 */
import type { Reference } from '../references.ts'
import type { GameState } from '../types.ts'
import { defineFeature } from './feature.ts'
import { statValue } from './stats.ts'

/** Dice as content writes them: notation (`'2d6+1'`, `'1d20'`, `'d100'`) or a count of dice and their sides. */
export type Dice = string | { count?: number; sides: number }

/** One roll, as it was made: the faces each die showed, what was added, the total, and the outcome against a target. */
export type Roll = {
  /** The kv key the total was stored under. */
  key: string
  /** The dice thrown, as notation without what is added: `'2d6'`. */
  dice: string
  /** The face each die showed, in order. */
  faces: number[]
  /** Everything added to the faces: the notation's own `+1` and the effect's `plus`. 0 when nothing was. */
  plus: number
  /** The faces added up, plus `plus`. */
  total: number
  /** The target the total had to reach, when the effect gave one. */
  against?: number
  /** Whether the total reached `against`; there only with a target. */
  passed?: boolean
  /** `'max'` when every die showed its highest face, `'min'` when every die showed 1. */
  critical?: 'max' | 'min'
}

/** The rolls a save has made: how many in all, the last command's, and the latest under each key. */
export type RollsState = {
  /** How many rolls this save has made: part of each new roll's seed. */
  made: number
  /** The rolls the last command made, in order. */
  last: Roll[]
  /** The latest roll under each key, for the `roll` condition. */
  latest: Record<string, Roll>
}

/** What the rolls feature adds, as types. */
export type RollsShape = {
  state: {
    rolls: RollsState
  }
  conditions: {
    /**
     * The latest roll under a key. Bare, it asks whether one was made; with
     * `passed`, whether it reached (or missed) its target; with `critical`,
     * whether every die showed its highest or lowest face (`true` for either):
     * `{ roll: 'skim', passed: true }`. Read the total itself with `{ kv: 'skim', gte: 8 }`.
     */
    roll: { roll: string; passed?: boolean; critical?: boolean | 'max' | 'min' }
  }
  effects: {
    /**
     * Throw dice and keep the total in the kv store under `key`. `dice` is
     * notation (`'2d6+1'`) or `{ count, sides }`; `plus` adds a number or a
     * stat's value (`{ stat: 'strength' }`); with `against`, the roll passes
     * when the total reaches it.
     */
    roll: { roll: string; dice: Dice; plus?: number | { stat: string }; against?: number }
  }
  view: {
    /** The rolls the last command made, in order. Empty when it made none. */
    rolls: Roll[]
  }
}

/** Dice notation: an optional count, `d`, the sides, and an optional `+n` or `-n`. */
const NOTATION = /^\s*(\d*)\s*d\s*(\d+)\s*(?:([+-])\s*(\d+))?\s*$/i
/** The most dice one roll throws. */
const MOST_DICE = 100
/** A key a prose token `{{key}}` can show. */
const KEY = /^[A-Za-z_][A-Za-z0-9_]*$/

/** Dice read into their count, sides and what the notation adds, or what is wrong with them. */
export function readDice(dice: unknown): { count: number; sides: number; plus: number } | { problem: string } {
  let count: number
  let sides: number
  let plus = 0
  if (typeof dice === 'string') {
    const match = NOTATION.exec(dice)
    if (!match) return { problem: `dice "${dice}" is not dice notation such as "2d6+1", "1d20" or "d100"` }
    count = match[1] ? Number(match[1]) : 1
    sides = Number(match[2])
    if (match[4]) plus = Number(match[4]) * (match[3] === '-' ? -1 : 1)
  } else if (dice && typeof dice === 'object' && !Array.isArray(dice)) {
    const written = dice as { count?: unknown; sides?: unknown }
    count = written.count === undefined ? 1 : (written.count as number)
    sides = written.sides as number
    if (!Number.isInteger(count) || !Number.isInteger(sides)) return { problem: 'dice must have a whole number of sides, and a whole count if it gives one' }
  } else return { problem: 'dice must be notation such as "2d6" or { count, sides }' }
  if (sides < 2) return { problem: `dice have ${sides} sides; a die needs at least 2` }
  if (count < 1 || count > MOST_DICE) return { problem: `${count} dice; a roll throws 1 to ${MOST_DICE}` }
  return { count, sides, plus }
}

/** What is wrong with a roll effect's key, dice, `plus` and `against`. */
function rollProblems(ref: { dice: unknown; key?: unknown; plus?: unknown; against?: unknown }): string[] {
  const problems: string[] = []
  if (typeof ref.key !== 'string' || !KEY.test(ref.key)) {
    problems.push(`roll key ${JSON.stringify(ref.key)} must be letters, digits and _, not starting with a digit, so {{key}} can show it`)
  }
  const read = readDice(ref.dice)
  if ('problem' in read) problems.push(read.problem)
  const plus = ref.plus
  const plusOk =
    plus === undefined ||
    (typeof plus === 'number' && Number.isFinite(plus)) ||
    (typeof plus === 'object' && plus !== null && typeof (plus as { stat?: unknown }).stat === 'string')
  if (!plusOk) problems.push('roll plus must be a number or { stat }')
  if (ref.against !== undefined && !(typeof ref.against === 'number' && Number.isFinite(ref.against))) problems.push('roll against must be a number')
  return problems
}

function described(roll: Roll | undefined): string {
  if (!roll) return 'not rolled'
  const outcome = roll.passed === undefined ? '' : roll.passed ? ', passed' : ', failed'
  const critical = roll.critical ? `, critical ${roll.critical}` : ''
  return `${roll.total} on ${roll.dice}${outcome}${critical}`
}

export const rolls = defineFeature<RollsShape>({
  name: 'rolls',
  requires: ['kv', 'stats'],
  state: {
    rolls: {
      start: () => ({ made: 0, last: [], latest: {} }),
      load: () => ({ made: 0, last: [], latest: {} }),
      keeps: (value) => typeof value === 'object' && value !== null && typeof (value as RollsState).made === 'number',
    },
  },
  conditions: {
    roll: {
      holds: (state, condition) => {
        const roll = state.rolls.latest[condition.roll]
        if (!roll) return false
        if (condition.passed !== undefined && roll.passed !== condition.passed) return false
        if (condition.critical === true && !roll.critical) return false
        if (condition.critical === false && roll.critical) return false
        if (typeof condition.critical === 'string' && roll.critical !== condition.critical) return false
        return true
      },
      explain: (state, condition) => {
        const wants = [
          condition.passed === undefined ? '' : condition.passed ? 'passed' : 'failed',
          condition.critical === undefined
            ? ''
            : condition.critical === false
              ? 'not critical'
              : `critical${condition.critical === true ? '' : ` ${condition.critical}`}`,
        ].filter(Boolean)
        return `roll ${condition.roll} is ${described(state.rolls.latest[condition.roll])}; wants ${wants.length ? wants.join(', ') : 'a roll'}`
      },
      references: () => [],
    },
  },
  effects: {
    roll: {
      apply: (state, effect, game, cx) => {
        const read = readDice(effect.dice)
        // Dice the checker reports roll nothing.
        if ('problem' in read) return state
        const made = state.rolls.made
        const faces = Array.from({ length: read.count }, (_, die) => 1 + cx.roll(read.sides, 'roll', state.seed, state.turn, made, effect.roll, die))
        const extra = typeof effect.plus === 'object' ? statValue(state, game, effect.plus.stat, undefined, cx) : (effect.plus ?? 0)
        const plus = read.plus + extra
        const total = faces.reduce((sum, face) => sum + face, 0) + plus
        const critical = faces.every((face) => face === read.sides) ? 'max' : faces.every((face) => face === 1) ? 'min' : undefined
        const roll: Roll = {
          key: effect.roll,
          dice: `${read.count}d${read.sides}`,
          faces,
          plus,
          total,
          ...(effect.against === undefined ? {} : { against: effect.against, passed: total >= effect.against }),
          ...(critical ? { critical } : {}),
        }
        return {
          ...state,
          kv: { ...state.kv, [effect.roll]: total },
          rolls: { made: made + 1, last: [...state.rolls.last, roll], latest: { ...state.rolls.latest, [effect.roll]: roll } },
        }
      },
      references: (effect) => {
        const refs: Reference[] = [{ dice: effect.dice, key: effect.roll, plus: effect.plus, against: effect.against }]
        if (typeof effect.plus === 'object' && effect.plus !== null && typeof effect.plus.stat === 'string') refs.push({ stat: effect.plus.stat })
        return refs
      },
    },
  },
  // Keep only the rolls this command made: the last ones, as many as the count went up by.
  afterCommand: {
    at: 'afterPlugins',
    run: (before, after) => {
      const fresh = after.rolls.made - before.rolls.made
      if (fresh <= 0) return after.rolls.last.length ? { ...after, rolls: { ...after.rolls, last: [] } } : after
      return fresh === after.rolls.last.length ? after : { ...after, rolls: { ...after.rolls, last: after.rolls.last.slice(-fresh) } }
    },
  },
  resolve: () => ({ dice: (ref) => rollProblems(ref) }),
  view: (state: GameState) => ({ rolls: state.rolls.last }),
})
