/**
 * Variables: the game's named values, and a storyline's counters. A variable
 * is the player's, or with `of`, an entity's.
 */
import { entityOf, ofKind, writeEntity } from '../entities.ts'
import { storylineOf } from '../storylines.ts'
import type { FlagValue, Range } from '../types.ts'
import { bounded, counted, defineFeature, inRange, wanted } from './feature.ts'

/** What the variables feature adds, as types. */
export type VariablesShape = {
  state: {
    flags: Record<string, FlagValue>
  }
  conditions: {
    /**
     * A variable. Bare, it asks whether it is set to anything truthy; with `is`,
     * whether it equals that; with a range, whether its number is in it (a
     * variable that is not a number counts as 0): `{ flag: 'lies', gte: 3 }`.
     * With `of`, an entity's variable: `{ flag: 'role', of: '$', is: 'cook' }`.
     */
    flag: { flag: string; is?: FlagValue; of?: string } & Range
    counter: { counter: { storyline: string; key: string } } & Range
  }
  effects: {
    /**
     * Set a variable, or with `add`, add to its number (a variable that is not
     * a number counts as 0). With `of`, the variable is an entity's.
     */
    flag: { kind: 'flag'; key: string; value: FlagValue; of?: string } | { kind: 'flag'; key: string; add: number; of?: string }
  }
  fill: 'variables'
}

export const variables = defineFeature<VariablesShape>({
  name: 'variables',
  state: {
    flags: { start: (_game, options) => ({ ...options.flags }) },
  },
  conditions: {
    flag: {
      holds: (state, condition) => {
        const flags = condition.of === undefined ? state.flags : entityOf(state, condition.of)?.flags
        // An entity that is not there has no variables to test: false, whatever was asked.
        if (!flags) return false
        const value = flags[condition.flag]
        if (condition.is !== undefined) return value === condition.is
        if (bounded(condition)) return inRange(counted(value), condition)
        return Boolean(value)
      },
      explain: (state, condition) => {
        const owner = condition.of === undefined ? state.flags : entityOf(state, condition.of)?.flags
        if (!owner) return `${condition.of} is not in the game; wants it there`
        const value = owner[condition.flag]
        const want = condition.is !== undefined ? `= ${JSON.stringify(condition.is)}` : bounded(condition) ? wanted(condition) : 'set'
        return `${condition.of === undefined ? '' : `${condition.of} `}flag ${condition.flag} is ${value === undefined ? 'unset' : JSON.stringify(value)}; wants ${want}`
      },
      references: (condition) => ofKind(condition.of),
    },
    counter: {
      holds: (state, condition) => inRange(counted(storylineOf(state, condition.counter.storyline).flags[condition.counter.key]), condition),
      explain: (state, condition) => {
        const { storyline, key } = condition.counter
        const value = storylineOf(state, storyline).flags[key]
        return `counter ${storyline}.${key} is ${typeof value === 'number' ? value : 0}; wants ${wanted(condition)}`
      },
      references: (condition) => [{ storyline: condition.counter.storyline }],
    },
  },
  effects: {
    flag: {
      apply: (state, effect) => {
        const entity = effect.of === undefined ? undefined : entityOf(state, effect.of)
        if (effect.of !== undefined && !entity) return state
        const flags = entity ? entity.flags : state.flags
        let value: FlagValue
        if ('add' in effect) {
          const was = flags[effect.key]
          value = (typeof was === 'number' ? was : 0) + effect.add
        } else value = effect.value
        if (entity) return writeEntity(state, effect.of!, { ...entity, flags: { ...flags, [effect.key]: value } })
        return { ...state, flags: { ...state.flags, [effect.key]: value } }
      },
      references: (effect) => ofKind(effect.of),
    },
  },
  // The variables the game resets each turn, at their reset values, where the save lacks them.
  fill: {
    kind: 'variables',
    run: (state, game) => {
      const lacking = Object.entries(game.rules?.resets ?? {}).filter(([key]) => state.flags?.[key] === undefined)
      return lacking.length ? { ...state, flags: { ...state.flags, ...Object.fromEntries(lacking) } } : state
    },
  },
  // A New Game+ carries the variables `carryOver` lists; the ones the new game is given still win.
  carry: {
    key: 'flags',
    run: (fresh, game, from, options) => {
      const flags = { ...fresh.flags }
      for (const key of game.carryOver?.flags ?? []) {
        if (from.flags?.[key] !== undefined) flags[key] = from.flags[key]
      }
      return { flags: { ...flags, ...options.flags } }
    },
  },
})
