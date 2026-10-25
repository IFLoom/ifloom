/**
 * Builders for flowing scenes, exported from @ifloom/engine: a scene's body written
 * as the words and decisions it reads as, top to bottom.
 *
 * Each builder returns plain data, the same objects a pack or a mod writes
 * by hand, so a scene written with them saves, checks and replays as any
 * other.
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

/** What any block can have besides its own: a condition it shows under, and presentation hints. */
export type BlockExtras = { when?: Condition; ui?: Ui<BlockUi> }

/**
 * Words as written: a paragraph, or several. The indentation every line
 * shares is taken off, so the words can sit indented in your code, and
 * blank lines at the start and the end go. A blank line between lines
 * starts a new paragraph. The words are read as prose is: `@ava: "…"` is a
 * spoken line, `[[img:…]]` a picture, `{{key}}` a token, and inline markup
 * works.
 */
export function text(words: string, extras: BlockExtras = {}): Block {
  return { words: dedent(words), ...extras }
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
 * A spoken line, under who says it, by id as `@id: "…"` in prose names them:
 * an entity, by reference or by bare id as a scene's `speaker` is (`'ava'` is
 * `character:ava`), `'you'` for whoever the player is playing, or `'player'`.
 * Its beat is a `say` with that `speaker` and their name.
 */
export function say(who: string, words: string, extras: BlockExtras & { voice?: string } = {}): Block {
  return { say: dedent(words), speaker: who, ...extras }
}

/** Blocks shown only while `condition` holds: a section, which can hold anything a body can. */
export function when(condition: Condition, blocks: Block[], extras: Omit<BlockExtras, 'when'> = {}): Block {
  return { when: condition, blocks, ...extras }
}

/**
 * A decision: the flow waits here until the player picks one of `choices`.
 * The pick's `then` comes next, then the blocks after the decision. Its id
 * is unique within the scene.
 */
export function decide(id: string, choices: FlowChoice[], extras: BlockExtras = {}): Block {
  return { decide: id, choices, ...extras }
}

/**
 * A choice at a decision, or among a scene's ending choices. `label` is its
 * words. Everything a `Choice` has goes in `fields`: its `effects`, `cost`,
 * `blocked`, `once` or `command`, and `then`, what the flow shows once it is
 * picked. Its id is unique within the scene.
 */
export function choice(id: string, label: string, fields: Omit<FlowChoice, 'id' | 'label'> = {}): FlowChoice {
  return { id, label, ...fields }
}

/** A picture or a video in the flow, where it stands: `image('cafe/cup', { alt: 'A cup of tea' })`. */
export function image(src: string, media: Omit<SceneMedia, 'src'> & BlockExtras = {}): Block {
  const { when: shownWhen, ui, ...rest } = media
  return { media: { src, ...rest }, ...(shownWhen !== undefined ? { when: shownWhen } : {}), ...(ui !== undefined ? { ui } : {}) }
}

/** A minigame played where it stands. The flow waits until it ends, then carries on. */
export function minigame(id: string, extras: BlockExtras = {}): Block {
  return { minigame: id, ...extras }
}

/** A panel opened where it stands, with what it needs. The flow waits until the player closes it. */
export function panel(name: string, args?: PluginArgs, extras: BlockExtras = {}): Block {
  return { panel: name, ...(args !== undefined ? { with: args } : {}), ...extras }
}

/**
 * Blocks the player can open and shut, under `label`: a letter to read, a
 * long aside. It is presentation only, a section with the React UI's `fold`
 * hint, and keeps no state; a UI that doesn't know the hint shows the blocks.
 */
export function fold(label: string, blocks: Block[], extras: BlockExtras = {}): Block {
  return { blocks, ...extras, ui: { ...extras.ui, fold: label } }
}

/** A place in the flow a choice can jump to, with `jump(id)`: at the top of a scene's body, in a section or in a choice's `then`. */
export function point(id: string): Block {
  return { point: id }
}

/**
 * A choice's effect that carries the flow on from a point instead of after
 * its decision, once its `then` is done: `{ point: id }`. The point can be
 * anywhere in the scene, and the flow reads on from it. A flow loops only
 * this way, through a pick.
 */
export function jump(id: string): { point: string } {
  return { point: id }
}
