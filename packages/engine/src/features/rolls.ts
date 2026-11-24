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
import type { Amount, GameState } from '../types.ts'
import { defineFeature } from './feature.ts'

/** Dice a `roll` effect throws, in notation (`'2d6+1'`, `'1d20'`, `'d100'`) or as a count of dice and their sides. A count of 1 if left out. */
export type Dice = string | { count?: number; sides: number }

/** A roll the `roll` effect made, with the face each die showed, the total and the outcome against a target. `view.rolls` lists the last command's. */
export type Roll = {
  /** The kv key the roll stored its total under. */
  key: string
  /** The dice thrown, in notation without the added number, such as `'2d6'`. */
  dice: string
  /** The face each die showed, in order. */
  faces: number[]
  /** The number added to the faces, the notation's own `+1` and the effect's `plus` together. 0 when nothing was added. */
  plus: number
  /** The roll's total, the faces added up plus `plus`. */
  total: number
  /** The target the total had to reach. Left out when the effect gave none. */
  against?: number
  /** The roll's outcome, true when the total reached `against`. Left out when there's no target. */
  passed?: boolean
  /** The roll's critical mark, `'max'` when every die showed its highest face and `'min'` when every die showed 1. */
  critical?: 'max' | 'min'
}

/** The rolls a save keeps, with the count of rolls made, the last command's rolls and the latest roll under each key. */
export type RollsState = {
  /** The number of rolls this save has made. It's part of each new roll's seed. */
  made: number
  /** The rolls the last command made, in order. */
  last: Roll[]
  /** The latest roll under each key, which the `roll` condition reads. */
  latest: Record<string, Roll>
}

/** The rolls feature's state, calls, view and reference, as types. */
export type RollsShape = {
  state: {
    /** The rolls this save has made. */
    rolls: RollsState
  }
  conditions: {
    /**
     * A condition on the latest roll under a key, such as `{ roll: 'skim', passed: true }`. With nothing else, it
     * holds once a roll was made under the key.
     *
     * With `passed`, it holds when the roll reached (or missed) its target. With `critical`, it holds when every die
     * showed its highest or lowest face, and `true` takes either. Read the total itself with `{ kv: 'skim', gte: 8 }`.
     */
    roll: { roll: string; passed?: boolean; critical?: boolean | 'max' | 'min' }
  }
  effects: {
    /**
     * An effect that throws dice and keeps the total in the kv store under the key `roll`. The dice are seeded, so a
     * replay makes the same rolls.
     *
     * `dice` is notation (`'2d6+1'`) or `{ count, sides }`. `plus` adds an `Amount`, such as a stat's value
     * (`{ stat: 'strength' }`). With `against`, also an `Amount`, the roll passes when the total reaches it.
     */
    roll: { roll: string; dice: Dice; plus?: Amount; against?: Amount }
  }
  view: {
    /** The rolls the last command made, in order. Empty when it made none. */
    rolls: Roll[]
  }
  references: {
    /** A reference to a `roll` effect's dice and key, which the checker holds to being well formed. */
    dice: { dice: unknown; key?: unknown }
  }
}

/** Dice notation: an optional count, `d`, the sides, and an optional `+n` or `-n`. */
const NOTATION = /^\s*(\d*)\s*d\s*(\d+)\s*(?:([+-])\s*(\d+))?\s*$/i
/** The most dice one roll throws. */
const MOST_DICE = 100
/** A key a prose token `{{key}}` can show. */
const KEY = /^[A-Za-z_][A-Za-z0-9_]*$/

/** Returns dice read into their count, their sides and the number the notation adds. Badly formed dice give `{ problem }` with the reason. */
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

/** What is wrong with a roll effect's key and dice. Its `plus` and `against` are amounts, checked as amounts. */
function rollProblems(ref: { dice: unknown; key?: unknown }): string[] {
  const problems: string[] = []
  if (typeof ref.key !== 'string' || !KEY.test(ref.key)) {
    problems.push(`roll key ${JSON.stringify(ref.key)} must be letters, digits and _, not starting with a digit, so {{key}} can show it`)
  }
  const read = readDice(ref.dice)
  if ('problem' in read) problems.push(read.problem)
  return problems
}

function described(roll: Roll | undefined): string {
  if (!roll) return 'not rolled'
  const outcome = roll.passed === undefined ? '' : roll.passed ? ', passed' : ', failed'
  const critical = roll.critical ? `, critical ${roll.critical}` : ''
  return `${roll.total} on ${roll.dice}${outcome}${critical}`
}

/** The rolls feature, which throws seeded dice and records each roll. */
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
        const faces = Array.from({ length: read.count }, (_, die) => 1 + cx.draw(read.sides, 'roll', state.seed, state.turn, made, effect.roll, die))
        const extra = effect.plus === undefined ? 0 : cx.amount(state, game, effect.plus)
        const against = effect.against === undefined ? undefined : cx.amount(state, game, effect.against)
        const plus = read.plus + extra
        const total = faces.reduce((sum, face) => sum + face, 0) + plus
        const critical = faces.every((face) => face === read.sides) ? 'max' : faces.every((face) => face === 1) ? 'min' : undefined
        const roll: Roll = {
          key: effect.roll,
          dice: `${read.count}d${read.sides}`,
          faces,
          plus,
          total,
          ...(against === undefined ? {} : { against, passed: total >= against }),
          ...(critical ? { critical } : {}),
        }
        return {
          ...state,
          kv: { ...state.kv, [effect.roll]: total },
          rolls: { made: made + 1, last: [...state.rolls.last, roll], latest: { ...state.rolls.latest, [effect.roll]: roll } },
        }
      },
      references: (effect) => {
        const refs: Reference[] = [{ dice: effect.dice, key: effect.roll }]
        if (effect.plus !== undefined) refs.push({ within: 'roll plus', refs: [{ amount: effect.plus }] })
        if (effect.against !== undefined) refs.push({ within: 'roll against', refs: [{ amount: effect.against }] })
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
