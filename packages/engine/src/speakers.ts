/**
 * Speakers for the screen, such as a scene's speaker, a message's sender or the entity a spoken line is written
 * under. Each speaker is an entity, so the engine reads its name, picture and hints without asking a plugin.
 */
import type { Game } from './game.ts'
import type { GameState } from './types.ts'
import { entityImage, entityUi, protagonist, speakerRef, PLAYER, YOU, type EntityRef } from './entities.ts'
import type { EntityUi, Ui } from './features/ui.ts'
import { entityName } from './prose.ts'
import { artSrc, type SpeakerFinder } from './sceneBody.ts'
import { pluginSaveName } from './plugin.ts'
import { stringOf } from './strings.ts'

/** A speaker or sender as the player sees them, in `view.scene.speaker` and in plugins' views. */
export type SpeakerView = {
  /** The speaker's id in the content, a bare id (`'ava'`) or a reference (`'character:ava'`). */
  id: string
  /** The speaker's entity. */
  ref: EntityRef
  /** The speaker's name, read from their entity with its tokens filled. */
  name: string
  /** The speaker's picture, from their entity through `artSrc`, or null when the entity has none. */
  image: string | null
  /** The speaker's entity's ui hints (see `EntityUi`). Left out when the entity has none. */
  ui?: Ui<EntityUi>
}

/**
 * Returns the speaker a speaker id names, with their entity's name, picture and hints. Returns null when the id names
 * no entity in the game.
 *
 * The view renders a scene's `speaker` with it, and a plugin calls it for the sender of a message or a post.
 */
export function speakerOf(state: GameState, game: Game, id: string): SpeakerView | null {
  const ref = speakerRef(state, game, id)
  if (ref === undefined) return null
  const image = entityImage(state, game, ref)
  const ui = entityUi(state, game, ref)
  return { id, ref, name: entityName(state, game, ref), image: image === undefined ? null : artSrc(image), ...(ui ? { ui } : {}) }
}

/**
 * Returns the name the player's own spoken lines show. It is the first `saveName` answer, such as the name the player
 * typed, else the string `you` (`You` in English).
 */
export function playerName(state: GameState, game: Game): string {
  return pluginSaveName(game, state) ?? stringOf(game, 'you')
}

/**
 * Returns the function that finds the speaker of a spoken line by its id, in this game and state. The name shown is
 * the entity's or the player's.
 *
 * `'player'` is the player, and `'you'` is whoever the player is playing. Any other id names an entity the way a
 * scene's `speaker` does (`'ava'` is `character:ava`, else the one entity with that id), and the line is the player's
 * own when that entity is the one the player is playing. An id that names no entity gives a character's line under
 * the bare id, and the content checker reports it.
 */
export function lineSpeakers(state: GameState, game: Game): SpeakerFinder {
  const playing = protagonist(state)
  return (id) => {
    if (id === PLAYER || (id === YOU && playing === PLAYER)) return { who: 'player', name: playerName(state, game) }
    const ref = speakerRef(state, game, id)
    if (ref === undefined) return { who: 'character', name: id }
    return { who: ref === playing ? 'player' : 'character', speaker: ref, name: entityName(state, game, ref) }
  }
}
