/**
 * The kv store: keys with a true/false, number or text value. A key is the
 * player's, or with `of`, someone else's: an entity's (`'staff:ana'`), a
 * storyline's (`'storyline:baker'`), or the running minigame's (`'minigame'`).
 */
import { entityKv, entityOf, hasEntity, ofKind, ownerOf, writeEntity } from '../entities.ts'
import { storylineOf } from '../storylines.ts'
import type { Game } from '../game.ts'
import type { Reference } from '../references.ts'
import type { Amount, GameState, KvValue, Range } from '../types.ts'
import { defineFeature, mergedByKey, type FeatureContext } from './feature.ts'
import { asCount, bounded, inRange, wanted } from '../range.ts'

/** What `of` names for a storyline's keys: `'storyline:baker'`. */
export const STORYLINE_KV = 'storyline:'

/** What `of` names for the running minigame's keys. */
export const MINIGAME_KV = 'minigame'

/** What the kv feature adds, as types. */
export type KvShape = {
  state: {
    kv: Record<string, KvValue>
  }
  conditions: {
    /**
     * A key in a kv store. Bare, it asks whether it is set to anything
     * truthy; with `is`, whether it equals that (or one of a list); with a
     * range, whether its number is in it (a value that is not a number counts
     * as 0): `{ kv: 'lies', gte: 3 }`. With `of`, someone else's key: an
     * entity's (`{ kv: 'role', of: '$', is: 'cook' }`), a storyline's
     * (`of: 'storyline:baker'`) or the running minigame's (`of: 'minigame'`).
     */
    kv: { kv: string; is?: KvValue | readonly KvValue[]; of?: string } & Range
  }
  effects: {
    /**
     * Set a key `to` a value, change its number `by` an amount (a value that
     * is not a number counts as 0), or set it to a whole number drawn from
     * `random: [min, max]`, both included and seeded by the save. `by` and
     * the ends of `random` are each an `Amount`. With `of`,
     * the key is an entity's, a storyline's or the running minigame's.
     */
    kv: { kv: string; to: KvValue; of?: string } | { kv: string; by: Amount; of?: string } | { kv: string; random: [Amount, Amount]; of?: string }
  }
  game: {
    /** The kv store a new game starts with, such as the stretch it opens in: `{ phase: 'arrival' }`. */
    kv?: Record<string, KvValue>
    /** kv keys put back at the start of each turn, with the value each goes back to: what "once this turn" was counting. */
    resets?: Record<string, KvValue>
  }
  pack: {
    /** The kv store a new game starts with, by key: a later pack's value replaces an earlier one's. */
    kv?: Record<string, KvValue>
    /** Keys reset each turn, by key: a later pack's value replaces an earlier one's. */
    resets?: Record<string, KvValue>
  }
  lists: 'reset' | 'kv'
  fill: 'kv'
}

/** One kv store: what it holds, and the state with a key of it set. Undefined for an owner that isn't there. */
type Store = { read: Readonly<Record<string, KvValue>>; write: (state: GameState, key: string, value: KvValue) => GameState }

/** How many times a minigame has started, as the minigames feature counts it. */
const plays = (state: GameState, id: string): number => (typeof state.kv[`minigame:${id}`] === 'number' ? (state.kv[`minigame:${id}`] as number) : 0)

/** The store `of` names: the player's with none, else an entity's, a storyline's or the running minigame's. */
function storeOf(state: GameState, game: Game | undefined, of: string | undefined): Store | undefined {
  if (of === undefined || of === 'player') return { read: state.kv, write: (on, key, value) => ({ ...on, kv: { ...on.kv, [key]: value } }) }
  if (of === MINIGAME_KV) {
    const running = state.minigame
    if (!running) return undefined
    return {
      read: running.kv,
      // A minigame keeps numbers: anything else counts as 0.
      write: (on, key, value) => (on.minigame ? { ...on, minigame: { ...on.minigame, kv: { ...on.minigame.kv, [key]: asCount(value) } } } : on),
    }
  }
  if (of.startsWith(STORYLINE_KV)) {
    const id = of.slice(STORYLINE_KV.length)
    return {
      read: storylineOf(state, id).kv,
      write: (on, key, value) => {
        const cur = storylineOf(on, id)
        return { ...on, storylines: { ...on.storylines, [id]: { ...cur, kv: { ...cur.kv, [key]: value } } } }
      },
    }
  }
  const owner = ownerOf(state, of)
  if (owner === undefined) return storeOf(state, game, undefined)
  if (!game || !hasEntity(state, game, owner)) return undefined
  return {
    read: entityKv(state, game, owner),
    write: (on, key, value) => {
      const entity = entityOf(on, game, owner)
      return entity ? writeEntity(on, owner, { ...entity, kv: { ...entity.kv, [key]: value } }) : on
    },
  }
}

/** A key's value in the store `of` names, or undefined when it is unset or the owner isn't there. */
export function kvValue(state: GameState, game: Game | undefined, key: string, of: string | undefined): KvValue | undefined {
  return storeOf(state, game, of)?.read[key]
}

/** What `of` names, for the content checker: a kind, a storyline, or a minigame's key. */
export function ownerReferences(of: string | undefined, key: string): Reference[] {
  if (of === MINIGAME_KV) return [{ minigameKv: key }]
  if (of?.startsWith(STORYLINE_KV)) return [{ storyline: of.slice(STORYLINE_KV.length) }]
  return ofKind(of)
}

/** A whole number from `random`, both ends included: the minigame's own draw while one runs, else one seeded by the save, the turn and the key. */
function drawn(state: GameState, of: string | undefined, key: string, ends: [number, number], cx: FeatureContext): number {
  const [low, high] = [Math.min(...ends), Math.max(...ends)].map(Math.round)
  const running = state.minigame
  if (of === MINIGAME_KV && running)
    return low + cx.draw(high - low + 1, 'minigame', running.id, state.seed, plays(state, running.id), running.steps, 'var', key)
  return low + cx.draw(high - low + 1, 'kv', of ?? '', key, state.seed, state.turn)
}

/** Whose key a line about it names: nothing for the player's. */
const whose = (of: string | undefined) => (of === undefined || of === 'player' ? '' : `${of} `)

export const kv = defineFeature<KvShape>({
  name: 'kv',
  state: {
    kv: { start: (game, options) => ({ ...game.kv, ...options.kv }) },
  },
  conditions: {
    kv: {
      holds: (state, condition, game) => {
        // An owner that is not there has no keys to test: false, whatever was asked.
        const store = storeOf(state, game, condition.of)
        if (!store) return false
        const value = store.read[condition.kv]
        if (condition.is !== undefined) return Array.isArray(condition.is) ? (condition.is as KvValue[]).includes(value as KvValue) : value === condition.is
        if (bounded(condition)) return inRange(asCount(value), condition)
        return Boolean(value)
      },
      explain: (state, condition, game) => {
        const store = storeOf(state, game, condition.of)
        if (!store) return `${condition.of} is not there; wants it there`
        const value = store.read[condition.kv]
        const want =
          condition.is !== undefined
            ? Array.isArray(condition.is)
              ? `one of ${(condition.is as KvValue[]).map((entry) => JSON.stringify(entry)).join(', ')}`
              : `= ${JSON.stringify(condition.is)}`
            : bounded(condition)
              ? wanted(condition)
              : 'set'
        return `${whose(condition.of)}kv ${condition.kv} is ${value === undefined ? 'unset' : JSON.stringify(value)}; wants ${want}`
      },
      references: (condition) => ownerReferences(condition.of, condition.kv),
    },
  },
  effects: {
    kv: {
      apply: (state, effect, game, cx) => {
        const store = storeOf(state, game, effect.of)
        if (!store) return state
        let value: KvValue
        if ('by' in effect) {
          const was = store.read[effect.kv]
          value = (typeof was === 'number' ? was : 0) + cx.amount(state, game, effect.by)
        } else if ('random' in effect) {
          const [low, high] = effect.random.map((end) => cx.amount(state, game, end))
          value = drawn(state, effect.of, effect.kv, [low, high], cx)
        } else value = effect.to
        return store.write(state, effect.kv, value)
      },
      references: (effect) => [
        ...ownerReferences(effect.of, effect.kv),
        ...('by' in effect ? [{ amount: effect.by }] : 'random' in effect ? effect.random.map((amount) => ({ amount })) : []),
      ],
    },
  },
  pack: {
    merge: () => {
      const starts = mergedByKey<KvShape['game'], KvShape['pack'], KvValue>(
        'kv',
        (pack) => pack.kv,
        (game, store) => {
          game.kv = store
        },
      ).merge()
      const resets = mergedByKey<KvShape['game'], KvShape['pack'], KvValue>(
        'reset',
        (pack) => pack.resets,
        (game, store) => {
          game.resets = store
        },
      ).merge()
      return {
        base: () => {},
        add: (pack, from) => {
          starts.add(pack, from)
          resets.add(pack, from)
        },
        finish: (game) => {
          starts.finish(game)
          resets.finish(game)
        },
        from: (list, id) => starts.from(list, id) ?? resets.from(list, id),
      }
    },
  },
  lists: ['reset', 'kv'],
  // The keys a new game starts with and the ones the game resets each turn, at those values, where the save lacks them.
  fill: {
    part: 'kv',
    run: (state, game) => {
      const lacking = Object.entries({ ...game.kv, ...game.resets }).filter(([key]) => state.kv?.[key] === undefined)
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
