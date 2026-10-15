/**
 * What content names: for every kind of condition, effect and command, the
 * ids and files it points at. The content checker (`check.ts`) resolves these
 * against the game; nothing here knows whether a name exists.
 *
 * The tables are built from one small table per feature, so a feature can
 * later own its entries in its own module. The merged tables are typed as
 * complete: a new condition key, effect kind or command type that has no entry
 * here fails to compile.
 */
import type { Condition } from './condition.ts'
import { customCall, type EffectRef } from './custom.ts'
import { anyOf, bindCurrent, parseRef } from './entities.ts'
import type { SceneMedia } from './game.ts'
import type { MediaStage } from './media.ts'
import type { PluginArgs } from './plugin.ts'
import type { Block, DataScene } from './scene.ts'
import type { Command, Effect, FlagValue } from './types.ts'

/**
 * One thing a piece of content names, for the content checker to resolve.
 * Ids by what they are, files by kind, and content that names more (a
 * condition, effects, a command, blocks, a stage) to be looked inside.
 */
export type Reference =
  /** A scene, as a gate (`{ seen }`), as somewhere an effect goes, or as a button opens it. */
  | { scene: string; as?: 'gate' | 'go' | 'open' }
  /** A choice, by `scene/choice`. */
  | { choice: string }
  /** A draw some scene's `drawnFrom` has to name. */
  | { drawnFrom: string }
  /**
   * A stat, read on the player or, with `of`, on an entity (`'staff:ana'`, or
   * `'staff:*'` for any of a kind). `writes` for an effect that changes it.
   */
  | { stat: string; of?: string; writes?: boolean }
  /** A stat an entity of this kind is given a starting value for. */
  | { stat: string; starts: string }
  | { item: string }
  | { storyline: string }
  | { collection: string }
  /** A `play` setting, and the value it is compared with or given. */
  | { setting: string; is?: FlagValue }
  /** A kind of entity. */
  | { kind: string }
  | { activity: string }
  | { input: string }
  /** A prose key that needs words. */
  | { prose: string }
  /** A variants list that needs lines. */
  | { variants: string }
  /** A custom value. */
  | { value: string }
  /** A custom panel. */
  | { panel: string }
  /** Background audio: a track (or silence) on a channel. */
  | { channel: string; track: string | null | undefined }
  /** A track played once. */
  | { sound: string }
  /** A pool, with the tags asked of it. */
  | { pool: string; tags?: readonly string[] }
  /**
   * A call to a custom or plugin condition, effect or command by name. `long`
   * is an effect written `{ kind: 'custom' }`, which only a plugin can answer.
   */
  | { call: 'conditions' | 'effects' | 'commands'; name: string; with?: PluginArgs; long?: boolean }
  /**
   * An entry in a plugin's content, such as a location: `{ entry: 'cafe',
   * plugin: 'places', list: 'locations', noun: 'location' }`. Not checked when
   * the game doesn't have that plugin.
   */
  | { entry: string; plugin: string; list: string; noun: string }
  /** A picture file, through `artSrc`, or used as written with `asWritten`. */
  | { picture: string; asWritten?: boolean }
  /** A video file, through `artSrc`, or used as written with `asWritten`. */
  | { video: string; asWritten?: boolean }
  /** A sound file, through `audioSrc`. */
  | { audio: string }
  /** Prose with markup in it: the sounds, pools and files it names. */
  | { markup: string }
  /** A condition, looked inside. */
  | { when: Condition | undefined }
  /** Effects, looked inside. */
  | { effects: readonly EffectRef[] | undefined }
  /** A button's command, looked inside. */
  | { command: Command | undefined }
  /** Prose blocks, as a data scene's body. */
  | { blocks: readonly Block[] | undefined }
  /** A `{ media }` block. */
  | { media: SceneMedia }
  /** A stage. `choices` are its scene's choice ids, or null for a stage with no scene. */
  | { stage: MediaStage | undefined; choices: readonly string[] | null }
  /** More references, whose problems are worded as `label: what`. */
  | { within: string; refs: readonly Reference[] }

/** The keys that tell one kind of condition from another. A plugin's short call (`{ 'quests/done': … }`) is read as `custom`. */
export const CONDITION_KINDS = [
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
  'custom',
] as const

export type ConditionKind = (typeof CONDITION_KINDS)[number]

/** The condition a key stands for. */
export type ConditionOf<K extends ConditionKind> = Extract<Condition, Record<K, unknown>>

export const EFFECT_KINDS = [
  'stat',
  'custom',
  'setStat',
  'storylineFlag',
  'flag',
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
] as const satisfies readonly Effect['kind'][]

export const COMMAND_KINDS = [
  'start',
  'activity',
  'scene',
  'choose',
  'leave',
  'use',
  'dismiss',
  'input',
  'setting',
  'custom',
] as const satisfies readonly Command['type'][]

export type ConditionTable = { [K in ConditionKind]: (condition: ConditionOf<K>) => Reference[] }
export type EffectTable = { [K in Effect['kind']]: (effect: Extract<Effect, { kind: K }>) => Reference[] }
export type CommandTable = { [K in Command['type']]: (command: Extract<Command, { type: K }>) => Reference[] }

/** One feature's entries. */
export type FeatureReferences = {
  conditions?: Partial<ConditionTable>
  effects?: Partial<EffectTable>
  commands?: Partial<CommandTable>
}

// Compile-time completeness. Each line is `true` only while the lists cover the unions.

/** Every condition but a plugin's short call has a key from the list. */
type Uncovered<C> = C extends unknown ? (keyof C extends `${string}/${string}` ? never : Extract<keyof C, ConditionKind> extends never ? C : never) : never
export const conditionKindsComplete: [Uncovered<Condition>] extends [never] ? true : false = true
export const effectKindsComplete: [Exclude<Effect['kind'], (typeof EFFECT_KINDS)[number]>] extends [never] ? true : false = true
export const commandKindsComplete: [Exclude<Command['type'], (typeof COMMAND_KINDS)[number]>] extends [never] ? true : false = true

/** The kind an `of` names, when it names one rather than `'$'`. */
function ofKind(ref: string | undefined): Reference[] {
  const parts = ref === undefined ? undefined : parseRef(ref)
  return parts ? [{ kind: parts.kind }] : []
}

const none = (): Reference[] => []

// One table per feature.

/** Combining conditions, the clock and the phase. */
const flow = {
  conditions: {
    all: (condition) => condition.all.map((when) => ({ when })),
    any: (condition) => condition.any.map((when) => ({ when })),
    not: (condition) => [{ when: condition.not }],
    turn: none,
    phase: none,
  },
  effects: {
    phase: none,
    turn: none,
  },
  commands: {
    start: none,
    leave: none,
    dismiss: none,
  },
} satisfies FeatureReferences

/** Variables, the game's and entities'. */
const variables = {
  conditions: {
    flag: (condition) => ofKind(condition.of),
  },
  effects: {
    flag: (effect) => ofKind(effect.of),
  },
} satisfies FeatureReferences

const scenes = {
  conditions: {
    chose: (condition) => [{ choice: condition.chose }],
    seen: (condition) => [{ scene: condition.seen, as: 'gate' }],
    since: (condition) => [{ scene: condition.since, as: 'gate' }],
    scene: (condition) => condition.scene.map((scene) => ({ scene, as: 'gate' as const })),
  },
  effects: {
    scene: (effect) => {
      if ('from' in effect) return [{ drawnFrom: effect.from }, ...(effect.otherwise !== undefined ? [{ scene: effect.otherwise, as: 'go' as const }] : [])]
      return effect.id === null ? [] : [{ scene: effect.id, as: 'go' }]
    },
  },
  commands: {
    scene: (command) => [{ scene: command.id, as: 'open' }],
    choose: none,
  },
} satisfies FeatureReferences

const stats = {
  conditions: {
    stat: (condition) => [{ stat: condition.stat, of: condition.of }, ...ofKind(condition.of)],
    level: (condition) => [{ stat: condition.level, of: condition.of }, ...ofKind(condition.of)],
    tier: (condition) => [{ stat: condition.tier }],
  },
  effects: {
    stat: (effect) => [{ stat: effect.key, of: effect.of, writes: true }, ...ofKind(effect.of)],
    setStat: (effect) => [{ stat: effect.key, of: effect.of, writes: true }, ...ofKind(effect.of)],
  },
} satisfies FeatureReferences

const entities = {
  conditions: {
    count: (condition) => [{ kind: condition.count }, { when: bindCurrent(condition.where, anyOf(condition.count)) }],
    entity: (condition) => ofKind(condition.entity),
  },
  effects: {
    create: (effect) => [{ kind: effect.of }, ...Object.keys(effect.entity.stats ?? {}).map((stat) => ({ stat, starts: effect.of }))],
    remove: (effect) => ofKind(effect.of),
    each: (effect) => {
      // Inside, `'$'` is one of the kind it runs over.
      const one = anyOf(effect.of)
      return [{ kind: effect.of }, { within: `in each ${effect.of}`, refs: [{ when: bindCurrent(effect.where, one) }, { effects: bindCurrent(effect.effects, one) }] }]
    },
  },
} satisfies FeatureReferences

const storylines = {
  conditions: {
    storylineFlag: (condition) => [{ storyline: condition.storylineFlag.storyline }],
    counter: (condition) => [{ storyline: condition.counter.storyline }],
    storyline: (condition) => [{ storyline: condition.storyline }],
  },
  effects: {
    storylineFlag: (effect) => [{ storyline: effect.id }],
    closeStoryline: (effect) => [{ storyline: effect.id }],
  },
} satisfies FeatureReferences

const items = {
  conditions: {
    item: (condition) => [{ item: condition.item }],
    has: (condition) => [{ item: condition.has }],
  },
  effects: {
    item: (effect) => [{ item: effect.id }],
  },
  commands: {
    use: (command) => [{ item: command.itemId }],
  },
} satisfies FeatureReferences

const collections = {
  conditions: {
    collection: (condition) => [{ collection: condition.collection }],
  },
  effects: {
    collect: (effect) => [
      { collection: effect.to },
      ...(effect.entry.text !== undefined ? [{ prose: effect.entry.text }] : []),
      ...(effect.entry.image !== undefined ? [{ picture: effect.entry.image, asWritten: true }] : []),
    ],
    discard: (effect) => [{ collection: effect.from }],
  },
} satisfies FeatureReferences

const notices = {
  effects: {
    notify: (effect) => [
      ...(effect.text !== undefined ? [{ prose: effect.text }] : []),
      ...(effect.image !== undefined ? [{ picture: effect.image, asWritten: true }] : []),
    ],
  },
} satisfies FeatureReferences

const audio = {
  effects: {
    audio: (effect) => [{ channel: effect.channel, track: effect.track }],
    sound: (effect) => [{ sound: effect.track }],
  },
} satisfies FeatureReferences

const settings = {
  conditions: {
    setting: (condition) => [{ setting: condition.setting, is: condition.is }],
  },
  commands: {
    setting: (command) => [{ setting: command.id, is: command.value }],
  },
} satisfies FeatureReferences

const actions = {
  commands: {
    activity: (command) => [{ activity: command.id }],
    input: (command) => [{ input: command.id }],
  },
} satisfies FeatureReferences

/** The game's named functions and plugins'. */
const custom = {
  conditions: {
    custom: (condition) => [{ call: 'conditions', name: condition.custom, with: condition.with }],
  },
  effects: {
    custom: (effect) => [{ call: 'effects', name: effect.name, with: effect.with, long: true }],
  },
  commands: {
    custom: (command) => [{ call: 'commands', name: command.name, with: command.with }],
  },
} satisfies FeatureReferences

/** What each kind of condition names, by the key that tells it apart. */
export const conditionTable: ConditionTable = {
  ...flow.conditions,
  ...variables.conditions,
  ...scenes.conditions,
  ...stats.conditions,
  ...entities.conditions,
  ...storylines.conditions,
  ...items.conditions,
  ...collections.conditions,
  ...settings.conditions,
  ...custom.conditions,
}

/** What each kind of effect names. */
export const effectTable: EffectTable = {
  ...flow.effects,
  ...variables.effects,
  ...scenes.effects,
  ...stats.effects,
  ...entities.effects,
  ...storylines.effects,
  ...items.effects,
  ...collections.effects,
  ...notices.effects,
  ...audio.effects,
  ...custom.effects,
}

/** What each type of command names. */
export const commandTable: CommandTable = {
  ...flow.commands,
  ...scenes.commands,
  ...items.commands,
  ...settings.commands,
  ...actions.commands,
  ...custom.commands,
}

/** What a condition names, one level down: nested conditions come back as `{ when }`. */
export function conditionReferences(condition: Condition | undefined): Reference[] {
  if (!condition) return []
  const call = customCall(condition)
  if (call) return [{ call: 'conditions', name: call.custom, with: call.with }]
  const key = Object.keys(condition).find((name): name is ConditionKind => Object.hasOwn(conditionTable, name))
  if (!key) return []
  return (conditionTable[key] as (entry: Condition) => Reference[])(condition)
}

/** What one effect names, in either form. */
export function effectReferences(ref: EffectRef): Reference[] {
  const call = customCall(ref)
  if (call) return [{ call: 'effects', name: call.custom, with: call.with }]
  const effect = ref as Effect
  const entry = Object.hasOwn(effectTable, effect.kind) ? effectTable[effect.kind] : undefined
  return entry ? (entry as (effect: Effect) => Reference[])(effect) : []
}

/** What a command names. */
export function commandReferences(command: Command): Reference[] {
  const entry = Object.hasOwn(commandTable, command.type) ? commandTable[command.type] : undefined
  return entry ? (entry as (command: Command) => Reference[])(command) : []
}

/** What prose blocks name: prose keys, variants and their art, conditions, media. */
export function blockReferences(blocks: readonly Block[] | undefined): Reference[] {
  const out: Reference[] = []
  for (const block of blocks ?? []) {
    if ('text' in block) out.push({ prose: block.text })
    if ('variants' in block) {
      out.push({ variants: block.variants })
      for (const art of Object.values(block.art ?? {})) out.push({ variants: art })
    }
    if ('media' in block) out.push({ media: block.media })
    out.push({ when: block.when })
    if ('variants' in block) for (const gate of Object.values(block.gate ?? {})) out.push({ when: gate })
  }
  return out
}

/** What a data scene names: its body, its choices' labels, conditions and effects, its audio, panel and stage. */
export function dataSceneReferences(scene: DataScene): Reference[] {
  const out: Reference[] = [{ blocks: scene.body }]
  for (const choice of scene.choices) {
    out.push({ prose: choice.label ?? `${scene.id}#${choice.id}` })
    for (const entry of choice.labels ?? []) out.push({ prose: entry.key }, { when: entry.when })
    out.push({ when: choice.when })
    for (const entry of choice.blocked ?? []) out.push({ when: entry.when })
    out.push({ effects: choice.effects })
  }
  for (const [channel, track] of Object.entries(scene.audio ?? {})) out.push({ channel, track })
  if (scene.panelData !== undefined) out.push({ panel: scene.panelData })
  out.push({ stage: scene.stage, choices: scene.choices.map((choice) => choice.id) })
  return out
}
