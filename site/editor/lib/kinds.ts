/**
 * The kinds of condition and effect the editor offers, checked against the
 * engine's own unions. A kind the engine adds or drops fails the typecheck
 * here, so the menus can't fall out of step with `Condition` and `Effect`.
 */
import type { Condition, Effect, StatDef } from '@ifloom/engine'

/** The keys an object type can't leave out. */
type RequiredKeys<T> = T extends unknown ? { [K in keyof T]-?: {} extends Pick<T, K> ? never : K }[keyof T] : never

/** The key that names a condition's kind: `stat`, `kv`, `all` and the rest. A plugin call (`'quests/done'`) is not one. */
export type ConditionKey = Exclude<RequiredKeys<Condition>, `${string}/${string}` | 'gte'>

/** Every kind of condition the engine has, in the order the docs list them. */
export const CONDITION_KEYS = [
  'all',
  'any',
  'not',
  'kv',
  'setting',
  'chose',
  'seen',
  'since',
  'storylineKv',
  'stat',
  'count',
  'entity',
  'level',
  'storyline',
  'scene',
  'turn',
  'phase',
  'minigameVar',
  'custom',
] as const satisfies readonly ConditionKey[]

/** Every kind of effect the engine has. */
export const EFFECT_KINDS = [
  'stat',
  'kv',
  'storylineKv',
  'create',
  'remove',
  'each',
  'entity',
  'move',
  'you',
  'scene',
  'phase',
  'closeStoryline',
  'turn',
  'notify',
  'audio',
  'sound',
  'minigame',
  'minigameVar',
  'transition',
  'panel',
  'custom',
] as const satisfies readonly Effect['kind'][]

// Both lists are complete: a kind missing from either is a type error here.
type Missing<All, Listed> = [Exclude<All, Listed>] extends [never] ? true : Exclude<All, Listed>
export const conditionKeysComplete: Missing<ConditionKey, (typeof CONDITION_KEYS)[number]> = true
export const effectKindsComplete: Missing<Effect['kind'], (typeof EFFECT_KINDS)[number]> = true

/** The conditions the builder has a form for. Anything else is edited as JSON. */
export const CONDITION_FORMS = [
  'all',
  'any',
  'not',
  'stat',
  'kv',
  'entity',
  'count',
  'chose',
  'seen',
  'since',
  'setting',
  'level',
  'turn',
] as const satisfies readonly ConditionKey[]
export type ConditionForm = (typeof CONDITION_FORMS)[number] | 'plugin' | 'json'

export const CONDITION_LABELS: Record<ConditionForm, string> = {
  all: 'All of',
  any: 'Any of',
  not: 'Not',
  stat: 'Stat',
  kv: 'kv key',
  entity: 'A thing held',
  count: 'How many things',
  chose: 'Chose',
  seen: 'Seen scene',
  since: 'Turns since scene',
  setting: 'Setting',
  level: 'Stat level',
  turn: 'Turn',
  plugin: 'Plugin call (JSON)',
  json: 'Other (JSON)',
}

/**
 * The effects the builder has a form for. `statTo`, `kvBy` and `draw` are the
 * `to`, `by` and `from` shapes of `stat`, `kv` and `scene`.
 */
export const EFFECT_FORMS = [
  'stat',
  'kv',
  'entity',
  'move',
  'you',
  'scene',
  'notify',
  'turn',
  'sound',
  'audio',
  'transition',
] as const satisfies readonly Effect['kind'][]
export type EffectForm = (typeof EFFECT_FORMS)[number] | 'statTo' | 'kvBy' | 'draw' | 'plugin' | 'json'

export const EFFECT_LABELS: Record<EffectForm, string> = {
  stat: 'Change a stat',
  statTo: 'Set a stat',
  kv: 'Set a kv key',
  kvBy: 'Change a kv key by',
  entity: 'Give or take a thing',
  move: 'Move a thing',
  you: 'Play as',
  scene: 'Go to a scene',
  draw: 'Draw a storylet',
  notify: 'Notify',
  turn: 'End the turn',
  sound: 'Play a sound',
  audio: 'Background audio',
  transition: 'How the next screen comes in',
  plugin: 'Plugin call (JSON)',
  json: 'Other (JSON)',
}

/** The effect builder's menu, in order. Every form is in it. */
export const EFFECT_MENU = [
  'stat',
  'statTo',
  'kv',
  'kvBy',
  'entity',
  'move',
  'you',
  'scene',
  'draw',
  'notify',
  'turn',
  'sound',
  'audio',
  'transition',
  'plugin',
  'json',
] as const satisfies readonly EffectForm[]
export const effectMenuComplete: Missing<EffectForm, (typeof EFFECT_MENU)[number]> = true

/** The comparisons a range offers. `is` is only for kv keys and settings. */
export const RANGE_OPS = ['gte', 'gt', 'lte', 'lt'] as const
export type RangeOp = (typeof RANGE_OPS)[number]
export const RANGE_LABELS: Record<RangeOp | 'is' | 'set', string> = {
  set: 'is set',
  is: 'is',
  gte: 'at least',
  gt: 'more than',
  lte: 'at most',
  lt: 'less than',
}

export const STAT_DISPLAYS = ['number', 'bar', 'pips'] as const satisfies readonly NonNullable<StatDef['display']>[]
export const STAT_ROUNDS = ['none', 'floor', 'round', 'ceil'] as const satisfies readonly NonNullable<StatDef['round']>[]
export const displaysComplete: Missing<NonNullable<StatDef['display']>, (typeof STAT_DISPLAYS)[number]> = true
export const roundsComplete: Missing<NonNullable<StatDef['round']>, (typeof STAT_ROUNDS)[number]> = true
