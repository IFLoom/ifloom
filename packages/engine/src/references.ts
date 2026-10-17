/**
 * What content names: for every kind of condition, effect and command, the
 * ids and files it points at. The content checker (`check.ts`) resolves these
 * against the game; nothing here knows whether a name exists.
 *
 * What each kind names is its entry's `references`, in the core's table or
 * its feature's (`KINDS` in core.ts), which are typed complete: a new
 * condition key, effect kind or command type with no entry fails to compile.
 */
import { commandOf, customCall, type CommandRef, type EffectRef } from './calls.ts'
import type { SceneMedia } from './game.ts'
import type { MediaStage } from './features/media.ts'
import type { Reveal, Transition, TransitionName } from './features/transitions.ts'
import type { PluginArgs } from './plugin.ts'
import type { Block } from './scene.ts'
import type { Condition, Effect, KvValue } from './types.ts'
import { commandEntry, conditionEntry, effectEntry } from './core.ts'

/**
 * One thing a piece of content names, for the content checker to resolve.
 * Ids by what they are, files by kind, and content that names more (a
 * condition, effects, a command, blocks, a stage) to be looked inside.
 */
export type Reference =
  /** A scene, as a gate (`{ seen }`), as somewhere an effect goes, or as a button opens it. */
  | { scene: string; as?: 'gate' | 'go' | 'open' }
  /** A choice, by `scene#choice`. */
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
  | { setting: string; is?: KvValue }
  /** A kind of entity. */
  | { kind: string }
  | { activity: string }
  | { input: string }
  /** A minigame, by id. */
  | { minigame: string }
  /** A variable some minigame declares in its `vars`. */
  | { minigameVar: string }
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
  /** A transition, by name or as a pair: a scene's, a place's, the game's default, an effect's. */
  | { transition: Transition | TransitionName | undefined }
  /** A block's `reveal`: its transition and its delay. */
  | { reveal: Reveal }
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
  | { command: CommandRef | undefined }
  /** Prose blocks, as a data scene's body. */
  | { blocks: readonly Block[] | undefined }
  /**
   * The inline actions (`[[act:id]]`) in a body, as blocks or as rendered
   * prose, against `offers`: the ids of the choices or buttons it can name.
   */
  | { actionsIn: readonly Block[] | string | undefined; offers: readonly string[] }
  /** A `{ media }` block. */
  | { media: SceneMedia }
  /** A stage. `choices` are its scene's choice ids, or null for a stage with no scene. */
  | { stage: MediaStage | undefined; choices: readonly string[] | null }
  /** More references, whose problems are worded as `label: what`. */
  | { within: string; refs: readonly Reference[] }

/** What a condition names, one level down: nested conditions come back as `{ when }`. */
export function conditionReferences(condition: Condition | undefined): Reference[] {
  if (!condition) return []
  // A condition with no kind key, or several, names nothing; the checker reports its shape.
  return conditionEntry(condition)?.references(condition) ?? []
}

/** What one effect names, in either form. */
export function effectReferences(ref: EffectRef): Reference[] {
  const call = customCall(ref)
  if (call) return [{ call: 'effects', name: call.custom, with: call.with }]
  const effect = ref as Effect
  return effectEntry(effect)?.references(effect) ?? []
}

/** What a command names, in either form. */
export function commandReferences(ref: CommandRef): Reference[] {
  const command = commandOf(ref)
  return commandEntry(command)?.references(command) ?? []
}
