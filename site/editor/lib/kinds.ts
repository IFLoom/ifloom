/**
 * The kinds of condition and effect the editor offers, checked against the
 * engine's own unions. A kind the engine adds or drops fails the typecheck
 * here, so the menus can't fall out of step with `Condition` and `Effect`.
 */
import type { Condition, Effect, StatDef } from '@ifloom/engine'

/** The keys an object type can't leave out. */
type RequiredKeys<T> = T extends unknown ? { [K in keyof T]-?: {} extends Pick<T, K> ? never : K }[keyof T] : never

/** The key that names a condition's kind: `stat`, `flag`, `all` and the rest. A plugin call (`'quests/done'`) is not one. */
export type ConditionKey = Exclude<RequiredKeys<Condition>, `${string}/${string}` | 'gte'>

/** Every kind of condition the engine has, in the order the docs list them. */
export const CONDITION_KEYS = [
  'all',
  'any',
  'not',
  'flag',
  'setting',
  'chose',
  'seen',
  'since',
  'storylineFlag',
  'stat',
  'count',
  'entity',
  'tier',
  'level',
  'storyline',
  'counter',
  'item',
  'has',
  'collection',
  'scene',
  'turn',
  'phase',
  'minigameVar',
  'custom',
] as const satisfies readonly ConditionKey[]

/** Every kind of effect the engine has. */
export const EFFECT_KINDS = [
  'stat',
  'setStat',
  'flag',
  'storylineFlag',
  'create',
  'remove',
  'each',
  'scene',
  'item',
  'phase',
  'closeStoryline',
  'turn',
  'collect',
  'discard',
  'notify',
  'audio',
  'sound',
  'minigame',
  'minigameVar',
  'custom',
] as const satisfies readonly Effect['kind'][]

// Both lists are complete: a kind missing from either is a type error here.
type Missing<All, Listed> = [Exclude<All, Listed>] extends [never] ? true : Exclude<All, Listed>
export const conditionKeysComplete: Missing<ConditionKey, (typeof CONDITION_KEYS)[number]> = true
export const effectKindsComplete: Missing<Effect['kind'], (typeof EFFECT_KINDS)[number]> = true

/** The conditions the builder has a form for. Anything else is edited as JSON. */
export const CONDITION_FORMS = ['all', 'any', 'not', 'stat', 'flag', 'item', 'has', 'chose', 'seen', 'since', 'setting', 'level', 'turn'] as const satisfies readonly ConditionKey[]
export type ConditionForm = (typeof CONDITION_FORMS)[number] | 'plugin' | 'json'

export const CONDITION_LABELS: Record<ConditionForm, string> = {
  all: 'All of',
  any: 'Any of',
  not: 'Not',
  stat: 'Stat',
  flag: 'Variable',
  item: 'Item count',
  has: 'Has item',
  chose: 'Chose',
  seen: 'Seen scene',
  since: 'Turns since scene',
  setting: 'Setting',
  level: 'Stat level',
  turn: 'Turn',
  plugin: 'Plugin call (JSON)',
  json: 'Other (JSON)',
}

/** The effects the builder has a form for. `flagAdd` and `draw` are the `add` and `from` shapes of `flag` and `scene`. */
export const EFFECT_FORMS = ['stat', 'setStat', 'flag', 'item', 'scene', 'notify', 'turn', 'sound', 'audio'] as const satisfies readonly Effect['kind'][]
export type EffectForm = (typeof EFFECT_FORMS)[number] | 'flagAdd' | 'draw' | 'plugin' | 'json'

export const EFFECT_LABELS: Record<EffectForm, string> = {
  stat: 'Change a stat',
  setStat: 'Set a stat',
  flag: 'Set a variable',
  flagAdd: 'Add to a variable',
  item: 'Give or take an item',
  scene: 'Go to a scene',
  draw: 'Draw a storylet',
  notify: 'Notify',
  turn: 'End the turn',
  sound: 'Play a sound',
  audio: 'Background audio',
  plugin: 'Plugin call (JSON)',
  json: 'Other (JSON)',
}

/** The effect builder's menu, in order. Every form is in it. */
export const EFFECT_MENU = ['stat', 'setStat', 'flag', 'flagAdd', 'item', 'scene', 'draw', 'notify', 'turn', 'sound', 'audio', 'plugin', 'json'] as const satisfies readonly EffectForm[]
export const effectMenuComplete: Missing<EffectForm, (typeof EFFECT_MENU)[number]> = true

/** The comparisons a range offers. `is` is only for variables and settings. */
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
