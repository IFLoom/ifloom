/**
 * The kv store: keys with a true/false, number or text value. A key is the
 * player's, or with `of`, an entity's. A storyline's keys are in `storylines.ts`.
 */
import { entityKv, entityOf, hasEntity, ofKind, ownerOf, writeEntity } from '../entities.ts'
import type { KvValue, Range } from '../types.ts'
import { defineFeature } from './feature.ts'
import { asCount, bounded, inRange, wanted } from '../range.ts'

/** What the kv feature adds, as types. */
export type KvShape = {
  state: {
    kv: Record<string, KvValue>
  }
  conditions: {
    /**
     * A key in the kv store. Bare, it asks whether it is set to anything
     * truthy; with `is`, whether it equals that; with a range, whether its
     * number is in it (a value that is not a number counts as 0):
     * `{ kv: 'lies', gte: 3 }`. With `of`, an entity's key:
     * `{ kv: 'role', of: '$', is: 'cook' }`.
     */
    kv: { kv: string; is?: KvValue; of?: string } & Range
  }
  effects: {
    /**
     * Set a key `to` a value, or change its number `by` an amount (a value
     * that is not a number counts as 0). With `of`, the key is an entity's.
     */
    kv: { kind: 'kv'; key: string; to: KvValue; of?: string } | { kind: 'kv'; key: string; by: number; of?: string }
  }
  fill: 'kv'
}

export const kv = defineFeature<KvShape>({
  name: 'kv',
  state: {
    kv: { start: (_game, options) => ({ ...options.kv }) },
  },
  conditions: {
    kv: {
      holds: (state, condition, game) => {
        const of = ownerOf(state, condition.of)
        const store = of === undefined ? state.kv : hasEntity(state, game, of) ? entityKv(state, game, of) : undefined
        // An entity that is not there has no keys to test: false, whatever was asked.
        if (!store) return false
        const value = store[condition.kv]
        if (condition.is !== undefined) return value === condition.is
        if (bounded(condition)) return inRange(asCount(value), condition)
        return Boolean(value)
      },
      explain: (state, condition, game) => {
        const of = ownerOf(state, condition.of)
        const owner = of === undefined ? state.kv : hasEntity(state, game, of) ? entityKv(state, game, of) : undefined
        if (!owner) return `${of} is not in the game; wants it there`
        const value = owner[condition.kv]
        const want = condition.is !== undefined ? `= ${JSON.stringify(condition.is)}` : bounded(condition) ? wanted(condition) : 'set'
        return `${of === undefined ? '' : `${of} `}kv ${condition.kv} is ${value === undefined ? 'unset' : JSON.stringify(value)}; wants ${want}`
      },
      references: (condition) => ofKind(condition.of),
    },
  },
  effects: {
    kv: {
      apply: (state, effect, game) => {
        const of = ownerOf(state, effect.of)
        const entity = of === undefined ? undefined : entityOf(state, game, of)
        if (of !== undefined && !entity) return state
        const store = entity ? entityKv(state, game, of!) : state.kv
        let value: KvValue
        if ('by' in effect) {
          const was = store[effect.key]
          value = (typeof was === 'number' ? was : 0) + effect.by
        } else value = effect.to
        if (entity) return writeEntity(state, of!, { ...entity, kv: { ...entity.kv, [effect.key]: value } })
        return { ...state, kv: { ...state.kv, [effect.key]: value } }
      },
      references: (effect) => ofKind(effect.of),
    },
  },
  // The keys the game resets each turn, at their reset values, where the save lacks them.
  fill: {
    kind: 'kv',
    run: (state, game) => {
      const lacking = Object.entries(game.rules?.resets ?? {}).filter(([key]) => state.kv?.[key] === undefined)
      return lacking.length ? { ...state, kv: { ...state.kv, ...Object.fromEntries(lacking) } } : state
    },
  },
  // A New Game+ carries the keys `carryOver.kv` lists; the ones the new game is given still win.
  carry: {
    key: 'kv',
    run: (fresh, game, from, options) => {
      const store = { ...fresh.kv }
      for (const key of game.carryOver?.kv ?? []) {
        if (from.kv?.[key] !== undefined) store[key] = from.kv[key]
      }
      return { kv: { ...store, ...options.kv } }
    },
  },
})
