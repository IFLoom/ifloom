/**
 * The builders a flowing scene's body is written with, top to bottom, as its words and decisions read.
 *
 * Each builder returns plain data, the same objects a pack or a mod writes by hand, so a scene written with them
 * saves, checks and replays as any other.
 *
 * ```ts
 * import { choice, decide, jump, point, say, text } from '@ifloom/engine'
 *
 * body: [
 *   text(`Ava looks up from the till.`),
 *   point('questions'),
 *   decide('ask', [
 *     choice('beans', 'Ask about the beans', { then: [say('ava', 'From a farm up the valley.')], effects: [jump('questions')] }),
 *     choice('done', 'Thank her'),
 *   ]),
 *   text(`She goes back to the till.`),
 * ]
 * ```
 */
import type { Condition } from './condition.ts'
import type { SceneMedia } from './game.ts'
import type { PluginArgs } from './plugin.ts'
import type { Block, FlowChoice } from './scene.ts'
import type { BlockUi, Ui } from './features/ui.ts'

/** The fields any block can have beside its own, a condition and ui hints. */
export type BlockExtras = {
  /** The block's condition, which leaves it out while it fails. */
  when?: Condition
  /** The block's ui hints. See `BlockUi`. */
  ui?: Ui<BlockUi>
}

/**
 * Returns a `{ text }` block of words in place, one paragraph or several. A blank line between lines starts a new
 * paragraph.
 *
 * It strips the indentation every line shares and the blank lines at either end, so the words can sit indented in your
 * code. The words are read as prose is, so `@ava: "…"` is a spoken line, `[[img:…]]` a picture and `{{key}}` a token.
 * An `id` keys the block in a translation's words table as `scene.<scene>.text.<id>`, and a hash of its words keys it
 * without one.
 */
export function text(words: string, extras: BlockExtras & { id?: string } = {}): Block {
  return { text: dedent(words), ...extras }
}

/** `words` without the indentation its lines share, and without blank lines at either end. */
function dedent(words: string): string {
  const lines = words.split('\n')
  while (lines.length && !lines[0].trim()) lines.shift()
  while (lines.length && !lines.at(-1)!.trim()) lines.pop()
  const indents = lines.filter((line) => line.trim()).map((line) => line.length - line.trimStart().length)
  const shared = indents.length ? Math.min(...indents) : 0
  return lines.map((line) => (line.trim() ? line.slice(shared).trimEnd() : '')).join('\n')
}

/**
 * Returns a `{ say }` block, a spoken line under the id of who says it. Its beat is a `say` beat with that speaker and
 * their name.
 *
 * `who` names the speaker as `@id: "…"` does in prose, an entity by reference or bare id (`'ava'` is `character:ava`),
 * `'you'` for whoever the player is playing, or `'player'`.
 */
export function say(who: string, words: string, extras: BlockExtras & { id?: string; voice?: string } = {}): Block {
  return { say: dedent(words), speaker: who, ...extras }
}

/** Returns a section of blocks shown only while `condition` holds. A section can hold any block a body can. */
export function when(condition: Condition, blocks: Block[], extras: Omit<BlockExtras, 'when'> = {}): Block {
  return { when: condition, blocks, ...extras }
}

/**
 * Returns a `{ cases }` block that shows only the first of `blocks` whose own `when` holds, or that has none. Leave the
 * last without a `when` as the fallback.
 *
 * A `when` in `extras` leaves the whole block out while it fails.
 *
 * ```ts
 * cases([
 *   text(`Rain streaks the window.`, { when: { kv: 'rain' } }),
 *   text(`Ava's umbrella is by the door.`, { when: { kv: 'cloudy' } }),
 *   text(`The street is dry.`),
 * ])
 * ```
 */
export function cases(blocks: Block[], extras: BlockExtras = {}): Block {
  return { cases: blocks, ...extras }
}

/**
 * Returns a decision, where the flow waits until the player chooses one of `choices`. Its id is unique within the
 * scene.
 *
 * The chosen choice's `then` comes next, then the blocks after the decision.
 */
export function decide(id: string, choices: FlowChoice[], extras: BlockExtras = {}): Block {
  return { decide: id, choices, ...extras }
}

/**
 * Returns a choice for a decision or a scene's ending choices, with `label` as its words. Its id is unique within the
 * scene.
 *
 * Every other field of a `Choice` goes in `fields`, such as `effects`, `cost`, `blocked`, `once` or `command`, and
 * `then`, the blocks the flow shows once the player chooses it.
 */
export function choice(id: string, label: string, fields: Omit<FlowChoice, 'id' | 'label'> = {}): FlowChoice {
  return { id, label, ...fields }
}

/** Returns a `{ media }` block, a picture or a video at this place in the flow, such as `image('cafe/cup', { alt: 'A cup of tea' })`. */
export function image(src: string, media: Omit<SceneMedia, 'src'> & BlockExtras = {}): Block {
  const { when: shownWhen, ui, ...rest } = media
  return { media: { src, ...rest }, ...(shownWhen !== undefined ? { when: shownWhen } : {}), ...(ui !== undefined ? { ui } : {}) }
}

/** Returns a `{ minigame }` block, a minigame played at this place in the flow. The flow waits until it ends, then carries on. */
export function minigame(id: string, extras: BlockExtras = {}): Block {
  return { minigame: id, ...extras }
}

/** Returns a `{ panel }` block, a panel opened at this place in the flow with `args` as its `with`. The flow waits until the player closes it. */
export function panel(name: string, args?: PluginArgs, extras: BlockExtras = {}): Block {
  return { panel: name, ...(args !== undefined ? { with: args } : {}), ...extras }
}

/**
 * Returns a fold, a section the player can open and shut under `label`, such as a letter to read. A UI without the
 * `fold` hint shows the blocks open.
 *
 * A fold is presentation only, a section with the React UI's `fold` hint, and keeps no state.
 */
export function fold(label: string, blocks: Block[], extras: BlockExtras = {}): Block {
  return { blocks, ...extras, ui: { ...extras.ui, fold: label } }
}

/** Returns a point, a place in the flow a choice's `jump(id)` goes to, anywhere in a scene's body, a section or a choice's `then`. */
export function point(id: string): Block {
  return { point: id }
}

/**
 * Returns the jump effect `{ point: id }`, which carries the flow on from a point instead of after the choice's
 * decision, once its `then` is done. A flow loops only this way, through a choice.
 */
export function jump(id: string): { point: string } {
  return { point: id }
}
