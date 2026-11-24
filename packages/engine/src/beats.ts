/**
 * Blocks rendered as beats away from the open scene, for a message, a post, an app's words or a minigame's label.
 * A plugin's `context.beats` calls it, and a UI renders a prose key's line the same way.
 */
import type { Game } from './game.ts'
import type { GameState } from './types.ts'
import { defaultRuntime, renderScene, type Block } from './scene.ts'
import { beatsOfParts, parseBeats, styledBeats, type SceneBeat } from './sceneBody.ts'
import { lineSpeakers } from './speakers.ts'

/**
 * Returns `blocks` rendered as beats, the way a scene's body is rendered. New pool picks go in `picks`, for the
 * reducer to record.
 *
 * It keeps the blocks whose `when` holds, fills their words for this save, draws variants and pools under `id`,
 * and names each spoken line's speaker.
 */
export function blockBeats(state: GameState, game: Game, blocks: readonly Block[], id: string, picks?: Record<string, string>): SceneBeat[] {
  const rendered = renderScene({ id, body: [...blocks], choices: [] }, state, defaultRuntime(game), picks)
  return beatsOfParts(rendered.parts, lineSpeakers(state, game)).beats
}

/**
 * Returns the prose key's line rendered as beats, the way a scene's body is rendered. Returns null when the game has
 * no line by that key.
 *
 * The engine fills its tokens for this save, cuts it into paragraphs and spoken lines, names each speaker from their
 * entity and puts its inline markup (bold, italics, UI pieces) in `spans`. A UI calls it to show a line away from
 * the scene, such as in a dialog an inline piece opens.
 */
export function proseBeats(state: GameState, game: Game, key: string): SceneBeat[] | null {
  const line = game.prose?.line(key, state)
  return line === undefined ? null : styledBeats(parseBeats(line, lineSpeakers(state, game)))
}
