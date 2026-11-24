/**
 * What content names: for every kind of condition, effect and command, the
 * ids and files it points at. The content checker (`check.ts`) resolves these
 * against the game; nothing here knows whether a name exists.
 *
 * What each kind names is its entry's `references`, in the core's table or
 * its feature's (`TABLES` in core.ts), which are typed complete: a new
 * condition key, effect kind or command type with no entry fails to compile.
 * The kinds of reference are the core's (below) and each feature's, which
 * its shape declares and its `resolve` answers for.
 */
import { commandOf, type CommandRef, type EffectRef } from './calls.ts'
import type { FeatureReferences } from './features/registry.ts'
import type { CallTable, PluginArgs } from './plugin.ts'
import type { Condition } from './types.ts'
import { commandEntry, conditionEntry, effectEntry } from './core.ts'
import { boundReferences } from './amount.ts'

/**
 * The kinds of reference the core resolves itself, by the key that tells each
 * apart: content that names more (a condition, effects, a command, prose
 * markup) to be looked inside, calls, prose, words and files. Each feature
 * declares its own kinds in its shape's `references`, and resolves them.
 */
type CoreReferences = {
  /** A prose key that needs words. */
  prose: { prose: string }
  /**
   * Words written in place, as a label, a line of text or a notice's text:
   * reported when they are a prose key the game has, as content wrote them
   * before schema 25. `oldKey` is where a choice with no label read its
   * words then, reported when the game's prose has it.
   */
  words: { words: string | undefined; field: string; oldKey?: string }
  /** Something content writes the way an older schema did, with how to write it now. */
  outdated: { outdated: string }
  /** Something a plugin's own rule finds wrong, as it reads: `{ problem: 'count must be a whole number, 1 or more' }`. */
  problem: { problem: string }
  /** A variants list that needs lines. */
  variants: { variants: string }
  /** A custom value. */
  value: { value: string }
  /** An `Amount`, which must be well formed, with what it reads looked inside: a stat, a kv key's owner, a value, a count. */
  amount: { amount: unknown }
  /** A call to a plugin's condition, effect or command by name, or the game's own (`game/…`). */
  call: { call: CallTable; name: string; with?: PluginArgs }
  /**
   * An entry in a plugin's content, such as a quest: `{ entry: 'bread',
   * plugin: 'quests', list: 'quests', noun: 'quest' }`. Not checked when
   * the game doesn't have that plugin.
   */
  entry: { entry: string; plugin: string; list: string; noun: string }
  /** A refusal's words: one by key (`{ string: 'shop/closed' }`) must be a string the game, a plugin or the engine has. */
  reason: { reason: string | { string: string } | undefined }
  /** A picture file, through `artSrc`. */
  picture: { picture: string }
  /** A video file, through `artSrc`. */
  video: { video: string }
  /** Prose with markup in it: the sounds, pools and files it names. `shownWhen` is the condition it shows under, if any. */
  markup: { markup: string; shownWhen?: Condition }
  /** A condition, looked inside. */
  when: { when: Condition | undefined }
  /** Effects, looked inside. */
  effects: { effects: readonly EffectRef[] | undefined }
  /** A button's command, looked inside. */
  command: { command: CommandRef | undefined }
  /** More references, whose problems are worded as `label: what`. */
  within: { within: string; refs: readonly Reference[] }
}

/** Every kind of reference by its key: the core's and each feature's. */
export type ReferenceMap = CoreReferences & FeatureReferences

/**
 * One thing a piece of content names, for the content checker to resolve.
 * Ids by what they are, files by kind, and content that names more (a
 * condition, effects, a command, blocks, a picture) to be looked inside.
 * Built from the core's kinds and each feature's (`references` in its
 * shape), as `Condition` is.
 */
export type Reference = ReferenceMap[keyof ReferenceMap]

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
