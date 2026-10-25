/**
 * Blocks drawn as beats for something that isn't a scene on screen: a
 * message, a post, an app's words, a minigame's label. What a plugin's
 * `context.beats` does.
 */
import type { Game } from './game.ts'
import type { GameState } from './types.ts'
import { defaultRuntime, renderScene, type Block } from './scene.ts'
import { beatsOfParts, type SceneBeat } from './sceneBody.ts'
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
