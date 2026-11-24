/**
 * Blocks drawn as beats for something that isn't a scene on screen: a
 * message, a post, an app's words, a minigame's label. What a plugin's
 * `context.beats` does. And a prose line by key as beats, for a UI that
 * shows one away from the scene.
 */
import type { Game } from './game.ts'
import type { GameState } from './types.ts'
import { defaultRuntime, renderScene, type Block } from './scene.ts'
import { beatsOfParts, parseBeats, styledBeats, type SceneBeat } from './sceneBody.ts'
import { lineSpeakers } from './speakers.ts'

/**
 * Blocks as beats, drawn as a scene's body is: the blocks whose `when`
 * holds, their words filled in for this save, variants drawn and pools
 * picked under `id`, spoken lines with their speakers. New pool picks go in
 * `picks`, for the reducer to record.
 */
export function blockBeats(state: GameState, game: Game, blocks: readonly Block[], id: string, picks?: Record<string, string>): SceneBeat[] {
  const rendered = renderScene({ id, body: [...blocks], choices: [] }, state, defaultRuntime(game), picks)
  return beatsOfParts(rendered.parts, lineSpeakers(state, game)).beats
}

/**
 * The prose line `key` as beats, formatted as a scene's body is: its tokens
 * filled for this save, cut into paragraphs and spoken lines, each speaker
 * named from their entity, and its inline markup (bold, italics, UI pieces)
 * in `spans`. For a UI that shows a line by key away from the scene, such as
 * a dialog an inline piece opens. Null when the game has no line by that key.
 */
export function proseBeats(state: GameState, game: Game, key: string): SceneBeat[] | null {
  const line = game.prose?.line(key, state)
  return line === undefined ? null : styledBeats(parseBeats(line, lineSpeakers(state, game)))
}
