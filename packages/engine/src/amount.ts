/**
 * Amounts, the numbers content names that the engine works out when it reads them (see `Amount`). `amountOf` reads
 * one, and features get the same function as `cx.amount`.
 *
 * The engine works out a condition's range bounds here before it asks the condition, so no feature or plugin has to.
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

/** Returns an amount worked out with the core's helpers in `cx`. An amount that doesn't read as a finite number gives 0. */
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
 * Returns an amount worked out in this state. An amount that doesn't read as a finite number gives 0, and so does an
 * owner that isn't there.
 *
 * An amount is a number, a stat (the player's by id, or `{ stat, of }`), a kv key's number (`{ kv, of }`), a value by
 * name (`{ value, with }`), a count of entities (`{ count }`) or a formula of these.
 */
export function amountOf(state: GameState, game: Game, amount: Amount): number {
  return amountIn(state, game, amount, featureContext())
}

/**
 * Returns true when `value` is in the range, with each bound worked out in this state first. A range with no bounds
 * holds above 0.
 *
 * So `{ gte: { stat: 'rent' } }` compares the value with the rent.
 */
export function inRange(state: GameState, game: Game, value: number, range: Range): boolean {
  return inRangeOf(
    value,
    rangeWith(range, (amount) => amountOf(state, game, amount)),
  )
}

/**
 * Returns the condition with its range bounds worked out as numbers, so its kind reads numbers. Returns the same object
 * when there is nothing to work out.
 *
 * The bounds are the condition's own or a call's arguments (`{ 'jobs/shifts': { job, gte: { kv: 'target' } } }`).
 */
export function withAmounts(state: GameState, condition: Condition, game: Game): Condition {
  const read = (amount: Amount) => amountOf(state, game, amount)
  if (hasAmountBound(condition)) return rangeWith(condition, read)
  const call = customCall(condition)
  if (call?.with && hasAmountBound(call.with)) return { [call.custom]: rangeWith(call.with, read) } as Condition
  return condition
}

/** Returns the references a condition's range bounds make, its own or a call's, for the content checker. */
export function boundReferences(condition: Condition): Reference[] {
  const call = customCall(condition)
  const bounds = call ? (call.with ? amountBounds(call.with) : []) : amountBounds(condition)
  return bounds.map((amount) => ({ amount }))
}

/** What an amount is, in words, for a problem: the shapes it can take. */
const SHAPES = 'a number, a stat id, a formula, { stat }, { kv }, { value } or { count }'

/** Returns the problems with an amount's shape, or an empty list when it is well formed. */
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

/** Returns the references an amount makes to stats, kv owners, values and selections, for the content checker. */
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
