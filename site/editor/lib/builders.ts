/**
 * The condition and effect builders' logic: which form a condition or an
 * effect is edited with, a new one of each kind, and ranges. The builders
 * edit the engine's own objects; there is no second model to keep in step.
 */
import type { Blocked, Condition, EffectRef, EntityDef, SettingDef, StatDef } from '@ifloom/engine'
import { TRANSITIONS, type Transition, type TransitionName } from '@ifloom/react'
import { formatTs } from './format.ts'
import { CONDITION_FORMS, RANGE_OPS, type ConditionForm, type EffectForm, type RangeOp } from './kinds.ts'

/**
 * The ids the pickers offer. `things` are entities, by reference (`item:bun`),
 * `kinds` the kinds they can be of, and `holders` the unique entities that can
 * hold things, besides `'you'` and `'player'`.
 */
export type Names = {
  scenes: string[]
  stats: string[]
  things: string[]
  kv: string[]
  choices: string[]
  sets: string[]
  kinds?: string[]
  holders?: string[]
}

export const NO_NAMES: Names = { scenes: [], stats: [], things: [], kv: [], choices: [], sets: [], kinds: [], holders: [] }

/** The keys a `Select` can have that the count form shows: everything but `where`. */
const SELECT_KEYS = new Set(['of', 'at', 'tag', 'trait'])

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
  // Only the keys a form shows: its kind, a range, `is` for kv keys and settings, and what you hold for things.
  const allowed = new Set<string>([
    kind,
    ...RANGE_OPS,
    ...(kind === 'kv' || kind === 'setting' ? ['is'] : []),
    ...(kind === 'entity' ? ['at'] : []),
    ...(kind === 'count' ? ['units'] : []),
  ])
  if (kind === 'entity' && typeof (condition as { entity: unknown }).entity !== 'string') return 'json'
  // A count of a kind, or of a Select the form can show: no `where`, which only JSON edits.
  if (kind === 'count') {
    const count = (condition as { count: unknown }).count
    if (typeof count !== 'string' && !(typeof count === 'object' && count !== null && Object.keys(count).every((k) => SELECT_KEYS.has(k)))) return 'json'
  }
  if (kind === 'all' || kind === 'any' || kind === 'not') return keys.length === 1 ? kind : 'json'
  // A turn's range is its value: `{ turn: { gte: 3 } }`.
  if (kind === 'turn') {
    const range = (condition as { turn: unknown }).turn
    return keys.length === 1 && typeof range === 'object' && range !== null && rangeOf(range as Condition) !== undefined ? kind : 'json'
  }
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
      return { not: { kv: names.kv[0] ?? 'met' } }
    case 'stat':
      return { stat: names.stats[0] ?? 'coins', gte: 1 }
    case 'kv':
      return { kv: names.kv[0] ?? 'met' }
    case 'entity':
      return { entity: names.things[0] ?? 'item:key', at: 'you', gte: 1 }
    case 'count':
      return { count: { of: names.kinds?.[0] ?? 'item', at: 'you' }, gte: 1 }
    case 'chose':
      return { chose: names.choices[0] ?? 'start#go' }
    case 'seen':
      return { seen: names.scenes[0] ?? 'start' }
    case 'since':
      return { since: names.scenes[0] ?? 'start', gte: 1 }
    case 'setting':
      return { setting: 'hints' }
    case 'level':
      return { level: names.stats[0] ?? 'coins', gte: 1 }
    case 'turn':
      return { turn: { gte: 1 } }
    case 'plugin':
      return { 'quests/done': { quest: 'errand' } }
    case 'json':
      return { kv: 'met' }
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

/**
 * The transitions a menu offers: the built-in ones, and `current` when it is
 * a name of the game's own, so the menu still shows it.
 */
export function transitionOptions(current?: string): string[] {
  return current && !(TRANSITIONS as readonly string[]).includes(current) ? [...TRANSITIONS, current] : [...TRANSITIONS]
}

/**
 * A `ui` field with one hint set, or taken out when `value` is undefined; the
 * whole field undefined once it holds nothing. The forms edit the React UI's
 * hints this way and leave any other hint as it was.
 */
export function withHint<U extends object>(ui: U | undefined, key: string, value: unknown): U | undefined {
  const next: Record<string, unknown> = { ...ui }
  if (value === undefined) delete next[key]
  else next[key] = value
  return Object.keys(next).length ? (next as U) : undefined
}

/** A scene's `ui.transition` as the scene form edits it: each part blank when it isn't set. */
export type TransitionFields = { in: string; out: string; ms: number | undefined }

/** A transition, by name or as a pair, as the form's fields. */
export function transitionFields(value: Transition | TransitionName | undefined): TransitionFields {
  if (value === undefined) return { in: '', out: '', ms: undefined }
  if (typeof value === 'string') return { in: value, out: value, ms: undefined }
  return { in: value.in ?? '', out: value.out ?? '', ms: value.ms }
}

/** The form's fields as the shortest transition that says them: none, a name for both ways, or a pair. */
export function transitionValue(fields: TransitionFields): Transition | TransitionName | undefined {
  if (!fields.in && !fields.out && fields.ms === undefined) return undefined
  if (fields.in && fields.in === fields.out && fields.ms === undefined) return fields.in
  return {
    ...(fields.in ? { in: fields.in } : {}),
    ...(fields.out ? { out: fields.out } : {}),
    ...(fields.ms !== undefined ? { ms: fields.ms } : {}),
  }
}

/** The form an effect is edited with. */
export function effectForm(effect: EffectRef): EffectForm {
  if (isPluginCall(effect) || 'custom' in effect) return 'plugin'
  if (!('kind' in effect)) return 'json'
  switch (effect.kind) {
    case 'stat':
      if (effect.of !== undefined) return 'json'
      return 'to' in effect ? 'statTo' : 'stat'
    case 'kv':
      if (effect.of !== undefined) return 'json'
      return 'by' in effect ? 'kvBy' : 'kv'
    case 'scene':
      return 'from' in effect ? 'draw' : 'scene'
    case 'entity':
      return 'by' in effect ? 'entity' : 'json'
    case 'move':
    case 'you':
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
      return { kind: 'stat', stat: names.stats[0] ?? 'coins', by: 1 }
    case 'statTo':
      return { kind: 'stat', stat: names.stats[0] ?? 'coins', to: 0 }
    case 'kv':
      return { kind: 'kv', key: names.kv[0] ?? 'met', to: true }
    case 'kvBy':
      return { kind: 'kv', key: names.kv[0] ?? 'visits', by: 1 }
    case 'entity':
      return { kind: 'entity', entity: names.things[0] ?? 'item:key', by: 1 }
    case 'move':
      return { kind: 'move', entity: names.things[0] ?? 'item:key', to: names.holders?.[0] ?? 'player' }
    case 'you':
      return { kind: 'you', to: names.holders?.[0] ?? null }
    case 'scene':
      return { kind: 'scene', scene: names.scenes[0] ?? null }
    case 'draw':
      return { kind: 'scene', from: names.sets[0] ?? 'market' }
    case 'notify':
      return { kind: 'notify', title: 'Something happened.' }
    case 'turn':
      return { kind: 'turn' }
    case 'sound':
      return { kind: 'sound', track: 'knock' }
    case 'audio':
      return { kind: 'audio', channel: 'music', to: 'calm' }
    case 'plugin':
      return { 'quests/start': { quest: 'errand' } }
    case 'json':
      return { kind: 'phase', to: 'day' }
  }
}

/** A `stat` effect that takes from the player's own stat: part of what a choice costs. */
export function isCost(e: EffectRef): e is { kind: 'stat'; stat: string; by: number } {
  return 'kind' in e && e.kind === 'stat' && 'by' in e && e.of === undefined && e.by < 0
}

/** What a choice costs: its negative `stat` effects on the player's stats, as amounts. */
export function costOf(effects: readonly EffectRef[]): { stat: string; amount: number }[] {
  return effects.flatMap((e) => (isCost(e) ? [{ stat: e.stat, amount: -e.by }] : []))
}

/** The effects with the cost replaced: the old cost entries taken out, the new ones put first. */
export function withCost(effects: readonly EffectRef[], cost: { stat: string; amount: number }[]): EffectRef[] {
  const rest = effects.filter((e) => !isCost(e))
  return [...cost.filter((c) => c.amount > 0).map((c): EffectRef => ({ kind: 'stat', stat: c.stat, by: -c.amount })), ...rest]
}

/** The `blocked` entry that greys a choice out when the player can't pay. */
export function shortBlock(stat: StatDef | undefined, id: string, amount: number): Blocked {
  const label = (stat?.label ?? id).toLowerCase()
  return { when: { stat: id, lt: amount }, reason: `You need ${amount} ${label}.` }
}

/** A snippet as TypeScript, for the builders' output. */
export function snippet(value: unknown): string {
  return formatTs(value, { width: 80 })
}

/** A new stat, thing or setting for the snippet forms. */
export const SNIPPET_DEFAULTS = {
  stat: { id: 'coins', label: 'Coins', start: 20, max: 9999, format: '{n}c', spendable: true } satisfies StatDef,
  thing: { id: 'umbrella', of: 'item', name: 'Umbrella', desc: 'A black umbrella with a bent spoke.', at: 'player' } satisfies EntityDef,
  setting: { id: 'hints', label: 'Show hints', kind: 'toggle', default: true } satisfies SettingDef,
}

/** Drops fields left empty in a form, so the output has only what was filled in. */
export function compact<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0))) as T
}
