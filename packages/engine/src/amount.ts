/**
 * Amounts: the one way content names a number that is worked out when it is
 * read (see `Amount`). `amountOf` reads one, and the core lends features the
 * same as `cx.amount`. Conditions get their range bounds worked out here
 * before they are asked, so no feature or plugin has to.
 */
import type { Game } from './game.ts'
import type { Reference } from './references.ts'
import type { Amount, Condition, GameState, Range } from './types.ts'
import { customCall } from './calls.ts'
import { featureContext } from './core.ts'
import type { FeatureContext } from './features/feature.ts'
import { countSelect, counting, selectReferences } from './features/entities.ts'
import { kvValue, ownerReferences } from './features/kv.ts'
import { statValue } from './features/stats.ts'
import { ofKind } from './entities.ts'
import { amountBounds, hasAmountBound, inRange as inRangeOf, rangeWith } from './range.ts'

type Raw = Record<string, unknown>

const isRecord = (value: unknown): value is Raw => value !== null && typeof value === 'object' && !Array.isArray(value)

/** The formulas' combining keys, whose members are amounts too. */
const LISTS = ['sum', 'product', 'min', 'max'] as const

const finite = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0)

/** An amount worked out with the core's helpers in `cx`. Anything that doesn't read as a finite number is 0. */
export function amountIn(state: GameState, game: Game, amount: Amount, cx: FeatureContext): number {
  if (typeof amount === 'number') return finite(amount)
  const stat = (id: string, of?: string) => (game ? statValue(state, game, id, of, cx) : finite(state.stats[id]))
  if (typeof amount === 'string') return stat(amount)
  if (!isRecord(amount)) return 0
  if ('stat' in amount) return stat(amount.stat, amount.of)
  if ('kv' in amount) return finite(kvValue(state, game, amount.kv, amount.of))
  if ('value' in amount) {
    const read = cx.customValue(game, amount.value)?.(state, amount.with ?? {})
    return finite(typeof read === 'string' ? Number(read) : read)
  }
  if ('count' in amount) return counting(state, amount, game, cx)
  // A formula: its strings are the player's stats, and its members can be any amount.
  const raw = amount as Raw
  for (const list of LISTS) {
    if (Array.isArray(raw[list])) {
      const parts = (raw[list] as Amount[]).map((part) => amountIn(state, game, part, cx))
      if (list === 'sum') return parts.reduce((a, b) => a + b, 0)
      if (list === 'product') return parts.reduce((a, b) => a * b, 1)
      if (!parts.length) return 0
      return list === 'min' ? Math.min(...parts) : Math.max(...parts)
    }
  }
  if ('scale' in raw) return amountIn(state, game, raw.scale as Amount, cx) * finite(raw.by)
  if ('clamp' in raw) {
    const value = amountIn(state, game, raw.clamp as Amount, cx)
    return Math.max(typeof raw.min === 'number' ? raw.min : -Infinity, Math.min(typeof raw.max === 'number' ? raw.max : Infinity, value))
  }
  return 0
}

/**
 * An amount worked out in this state: a number as written, a stat (the
 * player's by id, or `{ stat, of }`), a kv key's number (`{ kv, of }`), a
 * value by name (`{ value, with }`), a count of entities (`{ count }`) or a
 * formula of them. Anything that doesn't read as a finite number is 0, as an
 * owner that isn't there is.
 */
export function amountOf(state: GameState, game: Game, amount: Amount): number {
  return amountIn(state, game, amount, featureContext())
}

/**
 * Is the number in the range? Each bound is worked out in the state first,
 * so `{ gte: { stat: 'rent' } }` reads the rent. A range with no bounds asks
 * whether the number is above 0.
 */
export function inRange(state: GameState, game: Game, value: number, range: Range): boolean {
  return inRangeOf(
    value,
    rangeWith(range, (amount) => amountOf(state, game, amount)),
  )
}

/**
 * A condition with the bounds of its range worked out as numbers, the
 * condition's own or a call's (`{ 'jobs/shifts': { job, gte: { kv: 'target' } } }`),
 * so its kind reads numbers. The same object when there's nothing to work out.
 */
export function withAmounts(state: GameState, condition: Condition, game: Game): Condition {
  const read = (amount: Amount) => amountOf(state, game, amount)
  if (hasAmountBound(condition)) return rangeWith(condition, read)
  const call = customCall(condition)
  if (call?.with && hasAmountBound(call.with)) return { [call.custom]: rangeWith(call.with, read) } as Condition
  return condition
}

/** What a condition's range bounds name: its own, or a call's. */
export function boundReferences(condition: Condition): Reference[] {
  const call = customCall(condition)
  const bounds = call ? (call.with ? amountBounds(call.with) : []) : amountBounds(condition)
  return bounds.map((amount) => ({ amount }))
}

/** What an amount is, in words, for a problem: the shapes it can take. */
const SHAPES = 'a number, a stat id, a formula, { stat }, { kv }, { value } or { count }'

/** What is wrong with an amount's shape, if anything. */
export function amountProblems(amount: unknown): string[] {
  if (typeof amount === 'number') return Number.isFinite(amount) ? [] : [`an amount must be a finite number, not ${String(amount)}`]
  if (typeof amount === 'string') return amount ? [] : ['an amount names a stat by id, but this one is empty']
  if (!isRecord(amount)) return [`an amount is ${SHAPES}; this one is ${JSON.stringify(amount)}`]
  const text = (key: string) => typeof amount[key] === 'string' && amount[key] !== ''
  if ('stat' in amount) return text('stat') ? [] : ['an amount { stat } names a stat by id']
  if ('kv' in amount) return text('kv') ? [] : ['an amount { kv } names a key']
  if ('value' in amount) return text('value') ? [] : ['an amount { value } names a value']
  if ('count' in amount) return typeof amount.count === 'string' || isRecord(amount.count) ? [] : ['an amount { count } names a kind or a selection']
  for (const list of LISTS) if (Array.isArray(amount[list])) return (amount[list] as unknown[]).flatMap(amountProblems)
  if ('scale' in amount) return [...amountProblems(amount.scale), ...(typeof amount.by === 'number' ? [] : ['a { scale } formula needs a number in by'])]
  if ('clamp' in amount) return amountProblems(amount.clamp)
  return [`an amount is ${SHAPES}; this one has ${Object.keys(amount).length ? Object.keys(amount).join(', ') : 'nothing in it'}`]
}

/** What an amount names, for the content checker: the stats, kv owners, values and selections it reads. */
export function amountReferences(amount: unknown): Reference[] {
  if (typeof amount === 'string') return amount ? [{ stat: amount }] : []
  if (!isRecord(amount)) return []
  const of = typeof amount.of === 'string' ? amount.of : undefined
  if (typeof amount.stat === 'string') return [{ stat: amount.stat, of }, ...ofKind(of)]
  if (typeof amount.kv === 'string') return ownerReferences(of, amount.kv)
  if (typeof amount.value === 'string') return [{ value: amount.value }]
  if ('count' in amount) return typeof amount.count === 'string' || isRecord(amount.count) ? selectReferences(countSelect(amount as never)) : []
  for (const list of LISTS) if (Array.isArray(amount[list])) return (amount[list] as unknown[]).flatMap(amountReferences)
  if ('scale' in amount) return amountReferences(amount.scale)
  if ('clamp' in amount) return amountReferences(amount.clamp)
  return []
}
