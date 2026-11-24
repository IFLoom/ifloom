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
  /** A prose key that the game's `prose` must have. */
  prose: { prose: string }
  /**
   * Words written in place, such as a label, a line of text or a notice's text, in the field `field`. The checker
   * reports them when they are a prose key the game has, as content wrote them before schema 25.
   *
   * `oldKey` is the prose key a choice with no label read its words from then, reported when the game's prose has it.
   */
  words: { words: string | undefined; field: string; oldKey?: string }
  /** Content written the way an older schema wrote it, with the way to write it now. */
  outdated: { outdated: string }
  /** A problem a plugin's own rule finds, in the words the report shows, such as `{ problem: 'count must be a whole number, 1 or more' }`. */
  problem: { problem: string }
  /** A variants key that the game's `prose` must have lines for. */
  variants: { variants: string }
  /** A custom value by name, which the game or a plugin must declare. */
  value: { value: string }
  /** An `Amount`, which must be well formed, with the stats, kv owners, values and counts it reads looked inside. */
  amount: { amount: unknown }
  /** A call by name to a plugin's condition, effect or command, or to the game's own (`game/…`). */
  call: { call: CallTable; name: string; with?: PluginArgs }
  /**
   * An entry in a plugin's content, such as a quest, as in
   * `{ entry: 'bread', plugin: 'quests', list: 'quests', noun: 'quest' }`. The checker skips it when the game doesn't
   * have that plugin.
   */
  entry: { entry: string; plugin: string; list: string; noun: string }
  /** A refusal's reason. One by key (`{ string: 'shop/closed' }`) must be a string the game, a plugin or the engine has. */
  reason: { reason: string | { string: string } | undefined }
  /** A picture file, resolved through `artSrc`. */
  picture: { picture: string }
  /** A video file, resolved through `artSrc`. */
  video: { video: string }
  /** Prose with markup in it, whose sounds, pools and files the checker resolves. `shownWhen` is the condition it shows under, if any. */
  markup: { markup: string; shownWhen?: Condition }
  /** A condition, whose references the checker looks inside for. */
  when: { when: Condition | undefined }
  /** A list of effects, whose references the checker looks inside for. */
  effects: { effects: readonly EffectRef[] | undefined }
  /** An action's command, whose references the checker looks inside for. */
  command: { command: CommandRef | undefined }
  /** A group of references, whose problems the report words as `<within>: <problem>`. */
  within: { within: string; refs: readonly Reference[] }
}

/** The kinds of {@link Reference}, the core's and each feature's, by the key that tells each apart. */
export type ReferenceMap = CoreReferences & FeatureReferences

/**
 * One name a piece of content uses, such as an id, a file or a nested condition, for the content checker to resolve.
 *
 * The checker looks inside content that names more, such as a condition, effects, a command, blocks or a picture.
 *
 * The type is built from the core's kinds and each feature's (`references` in its shape), as `Condition` is.
 */
export type Reference = ReferenceMap[keyof ReferenceMap]

/** Returns the references a condition makes, one level down. Nested conditions come back as `{ when }`. */
export function conditionReferences(condition: Condition | undefined): Reference[] {
  if (!condition) return []
  // A condition with no kind key, or several, names nothing; the checker reports its shape.
  const entry = conditionEntry(condition)
  // Its range's bounds, its own or a call's, are amounts that can name things too.
  return entry ? [...entry.references(condition), ...boundReferences(condition)] : []
}

/**
 * Returns the references one effect makes, by its key or as a call. An effect with no key of the engine's, or several,
 * makes none, and the checker reports its shape.
 */
export function effectReferences(effect: EffectRef): Reference[] {
  return effectEntry(effect)?.references(effect) ?? []
}

/** Returns the references a command makes, in either form. */
export function commandReferences(ref: CommandRef): Reference[] {
  const command = commandOf(ref)
  return commandEntry(command)?.references(command) ?? []
}
