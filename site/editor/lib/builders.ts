/**
 * The condition and effect builders' logic: which form a condition or an
 * effect is edited with, a new one of each kind, and ranges. The builders
 * edit the engine's own objects; there is no second model to keep in step.
 */
import type { Condition, EffectRef, ItemDef, SettingDef, StatDef } from '@ifloom/engine'
import { formatTs } from './format.ts'
import { CONDITION_FORMS, RANGE_OPS, type ConditionForm, type EffectForm, type RangeOp } from './kinds.ts'

/** The ids the pickers offer. */
export type Names = { scenes: string[]; stats: string[]; items: string[]; variables: string[]; choices: string[]; sets: string[] }

export const NO_NAMES: Names = { scenes: [], stats: [], items: [], variables: [], choices: [], sets: [] }

const isPluginCall = (value: object) => {
  const keys = Object.keys(value)
  return keys.length === 1 && keys[0].includes('/')
}

/** The form a condition is edited with, or `json` when no form can show all of it. */
export function conditionForm(condition: Condition): ConditionForm {
  if (isPluginCall(condition) || 'custom' in condition) return 'plugin'
  const keys = Object.keys(condition)
  const kind = (CONDITION_FORMS as readonly string[]).find((k) => k in condition) as ConditionForm | undefined
  if (!kind) return 'json'
  // Only the keys a form shows: its kind, a range, and `is` for variables and settings.
  const allowed = new Set<string>([kind, ...RANGE_OPS, ...(kind === 'flag' || kind === 'setting' ? ['is'] : [])])
  if (kind === 'all' || kind === 'any' || kind === 'not') return keys.length === 1 ? kind : 'json'
  if (keys.some((k) => !allowed.has(k))) return 'json'
  if (rangeOf(condition) === undefined) return 'json'
  return kind
}

/** A new condition of a kind, naming the first thing that exists. */
export function newCondition(form: ConditionForm, names: Names = NO_NAMES): Condition {
  switch (form) {
    case 'all':
      return { all: [] }
    case 'any':
      return { any: [] }
    case 'not':
      return { not: { flag: names.variables[0] ?? 'met' } }
    case 'stat':
      return { stat: names.stats[0] ?? 'coins', gte: 1 }
    case 'flag':
      return { flag: names.variables[0] ?? 'met' }
    case 'item':
      return { item: names.items[0] ?? 'key', gte: 1 }
    case 'has':
      return { has: names.items[0] ?? 'key' }
    case 'chose':
      return { chose: names.choices[0] ?? 'start/go' }
    case 'seen':
      return { seen: names.scenes[0] ?? 'start' }
    case 'since':
      return { since: names.scenes[0] ?? 'start', gte: 1 }
    case 'setting':
      return { setting: 'hints' }
    case 'level':
      return { level: names.stats[0] ?? 'coins', gte: 1 }
    case 'turn':
      return { turn: true, gte: 1 }
    case 'plugin':
      return { 'quests/done': { quest: 'errand' } }
    case 'json':
      return { flag: 'met' }
  }
}

/** A condition's one comparison: `set` for a bare one, `is` for an exact value, or a range op. */
export type RangeForm = { op: RangeOp | 'is' | 'set'; value: number | string | boolean }

/**
 * A condition's comparison, if the builder can show it as one: bare, `is`, or
 * one bound. Undefined when it has two bounds or more than one at once.
 */
export function rangeOf(condition: Condition): RangeForm | undefined {
  const c = condition as Record<string, unknown>
  const ops = [...RANGE_OPS, 'is'].filter((op) => c[op] !== undefined) as (RangeOp | 'is')[]
  if (ops.length > 1) return undefined
  if (!ops.length) return { op: 'set', value: 0 }
  return { op: ops[0], value: c[ops[0]] as number | string | boolean }
}

/** The condition with its comparison replaced. */
export function withRange(condition: Condition, range: RangeForm): Condition {
  const next = { ...condition } as Record<string, unknown>
  for (const op of [...RANGE_OPS, 'is']) delete next[op]
  if (range.op !== 'set') next[range.op] = range.value
  return next as Condition
}

/** The form an effect is edited with. */
export function effectForm(effect: EffectRef): EffectForm {
  if (isPluginCall(effect) || 'custom' in effect) return 'plugin'
  if (!('kind' in effect)) return 'json'
  switch (effect.kind) {
    case 'stat':
    case 'setStat':
      return effect.of === undefined ? effect.kind : 'json'
    case 'flag':
      if (effect.of !== undefined) return 'json'
      return 'add' in effect ? 'flagAdd' : 'flag'
    case 'scene':
      return 'from' in effect ? 'draw' : 'scene'
    case 'item':
    case 'notify':
    case 'turn':
    case 'sound':
    case 'audio':
      return effect.kind
    default:
      return 'json'
  }
}

/** A new effect of a kind, naming the first thing that exists. */
export function newEffect(form: EffectForm, names: Names = NO_NAMES): EffectRef {
  switch (form) {
    case 'stat':
      return { kind: 'stat', key: names.stats[0] ?? 'coins', by: 1 }
    case 'setStat':
      return { kind: 'setStat', key: names.stats[0] ?? 'coins', to: 0 }
    case 'flag':
      return { kind: 'flag', key: names.variables[0] ?? 'met', value: true }
    case 'flagAdd':
      return { kind: 'flag', key: names.variables[0] ?? 'visits', add: 1 }
    case 'item':
      return { kind: 'item', id: names.items[0] ?? 'key', by: 1 }
    case 'scene':
      return { kind: 'scene', id: names.scenes[0] ?? null }
    case 'draw':
      return { kind: 'scene', from: names.sets[0] ?? 'market' }
    case 'notify':
      return { kind: 'notify', title: 'Something happened.' }
    case 'turn':
      return { kind: 'turn' }
    case 'sound':
      return { kind: 'sound', track: 'knock' }
    case 'audio':
      return { kind: 'audio', channel: 'music', track: 'calm' }
    case 'plugin':
      return { 'quests/start': { quest: 'errand' } }
    case 'json':
      return { kind: 'phase', value: 'day' }
  }
}

/** What a choice costs: its negative `stat` effects on the player's stats, as amounts. */
export function costOf(effects: readonly EffectRef[]): { stat: string; amount: number }[] {
  return effects.flatMap((e) => ('kind' in e && e.kind === 'stat' && e.of === undefined && e.by < 0 ? [{ stat: e.key, amount: -e.by }] : []))
}

/** The effects with the cost replaced: the old cost entries taken out, the new ones put first. */
export function withCost(effects: readonly EffectRef[], cost: { stat: string; amount: number }[]): EffectRef[] {
  const rest = effects.filter((e) => !('kind' in e && e.kind === 'stat' && e.of === undefined && e.by < 0))
  return [...cost.filter((c) => c.amount > 0).map((c): EffectRef => ({ kind: 'stat', key: c.stat, by: -c.amount })), ...rest]
}

/** The `blocked` entry that greys a choice out when the player can't pay. */
export function shortBlock(stat: StatDef | undefined, id: string, amount: number): { when: Condition; reason: string } {
  const label = (stat?.label ?? id).toLowerCase()
  return { when: { stat: id, lt: amount }, reason: `You need ${amount} ${label}.` }
}

/** A snippet as TypeScript, for the builders' output. */
export function snippet(value: unknown): string {
  return formatTs(value, { width: 80 })
}

/** A new stat, item or setting for the snippet forms. */
export const SNIPPET_DEFAULTS = {
  stat: { id: 'coins', label: 'Coins', start: 20, max: 9999, format: '{n}c', spendable: true } satisfies StatDef,
  item: { id: 'umbrella', name: 'Umbrella', desc: 'A black umbrella with a bent spoke.', kind: 'gear' } satisfies ItemDef,
  setting: { id: 'hints', label: 'Show hints', kind: 'toggle', default: true } satisfies SettingDef,
}

/** Drops fields left empty in a form, so the output has only what was filled in. */
export function compact<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0))) as T
}
