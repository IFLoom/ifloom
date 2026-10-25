/**
 * What content names: for every kind of condition, effect and command, the
 * ids and files it points at. The content checker (`check.ts`) resolves these
 * against the game; nothing here knows whether a name exists.
 *
 * What each kind names is its entry's `references`, in the core's table or
 * its feature's (`TABLES` in core.ts), which are typed complete: a new
 * condition key, effect kind or command type with no entry fails to compile.
 */
import { commandOf, type CommandRef, type EffectRef } from './calls.ts'
import type { SceneMedia } from './game.ts'
import type { MediaStage } from './features/media.ts'
import type { CallTable, PluginArgs } from './plugin.ts'
import type { Block } from './scene.ts'
import type { Condition, KvValue } from './types.ts'
import { commandEntry, conditionEntry, effectEntry } from './core.ts'
import { boundReferences } from './amount.ts'

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
  | { storyline: string }
  /** A `play` setting, and the value it is compared with or given. */
  | { setting: string; is?: KvValue }
  /** A kind of entity. */
  | { kind: string }
  /**
   * An entity content declares, by reference: `'food:apple'`. `'$'` and
   * `'food:*'` pass. With `carrying`, it must also carry that trait: a
   * place the places plugin can take the player to, `{ entity:
   * 'location:cafe', carrying: 'places/location' }`.
   */
  | { entity: string; carrying?: string }
  /**
   * Who holds a thing: `'player'`, `'you'` or a unique entity. `holds` is the
   * thing given to it, which can't be the holder itself; `protagonist` for a
   * `you` effect, which names the one to play.
   */
  | { holder: string; holds?: string; protagonist?: boolean }
  /** The entity a `create` makes a thing like, and the kind it makes, if it says. */
  | { like: string; of?: string }
  /** Who a spoken line is under, by id: `@ava: "…"` in prose, or a `say` block's `speaker`. `'you'` and `'player'` pass. */
  | { speaker: string }
  /** A trait, by id. */
  | { trait: string }
  /** An action the `action` command does, by its id. */
  | { action: string }
  | { input: string }
  /** A minigame, by id. */
  | { minigame: string }
  /** A jump to a point, `{ point }` as an effect: only a choice's, in the scene that has the point. */
  | { jump: string }
  /** A key some minigame declares in its `kv`, as `{ kv, of: 'minigame' }` names it. */
  | { minigameKv: string }
  /** A timer, by id, with a `timer` effect's `to` and `by`, which must be milliseconds. */
  | { timer: string; to?: unknown; by?: unknown }
  /** A prose key that needs words. */
  | { prose: string }
  /**
   * Words written in place, as a label, a line of text or a notice's text:
   * reported when they are a prose key the game has, as content wrote them
   * before schema 25. `oldKey` is where a choice with no label read its
   * words then, reported when the game's prose has it.
   */
  | { words: string | undefined; field: string; oldKey?: string }
  /** Something content writes the way an older schema did, with how to write it now. */
  | { outdated: string }
  /** A variants list that needs lines. */
  | { variants: string }
  /** A custom value. */
  | { value: string }
  /** An `Amount`, which must be well formed, with what it reads looked inside: a stat, a kv key's owner, a value, a count. */
  | { amount: unknown }
  /** A panel an effect opens, by name, with what it is opened with: asked of the plugins' `panelProblems`. */
  | { openPanel: string; with?: PluginArgs }
  /** Background audio: a track (or silence) on a channel. */
  | { channel: string; track: string | null | undefined }
  /** A track played once. */
  | { sound: string }
  /** A roll effect's dice and key, which must be well formed. */
  | { dice: unknown; key?: unknown }
  /** A `ui` field of presentation hints, which must be data. */
  | { ui: unknown }
  /** A pool, with the tags asked of it. */
  | { pool: string; tags?: readonly string[] }
  /** A call to a plugin's condition, effect or command by name, or the game's own (`game/…`). */
  | { call: CallTable; name: string; with?: PluginArgs }
  /**
   * An entry in a plugin's content, such as a quest: `{ entry: 'bread',
   * plugin: 'quests', list: 'quests', noun: 'quest' }`. Not checked when
   * the game doesn't have that plugin.
   */
  | { entry: string; plugin: string; list: string; noun: string }
  /** A picture file, through `artSrc`. */
  | { picture: string }
  /** A video file, through `artSrc`. */
  | { video: string }
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
  const entry = conditionEntry(condition)
  // Its range's bounds, its own or a call's, are amounts that can name things too.
  return entry ? [...entry.references(condition), ...boundReferences(condition)] : []
}

/** What one effect names: its key's, or a call's. An effect with no key of the engine's, or several, names nothing; the checker reports its shape. */
export function effectReferences(effect: EffectRef): Reference[] {
  return effectEntry(effect)?.references(effect) ?? []
}

/** What a command names, in either form. */
export function commandReferences(ref: CommandRef): Reference[] {
  const command = commandOf(ref)
  return commandEntry(command)?.references(command) ?? []
}
