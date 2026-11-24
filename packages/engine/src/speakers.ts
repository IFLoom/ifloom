/**
 * Who someone is, for the screen: a scene's speaker, the sender of a
 * message, whoever a spoken line is written under. People are entities, so
 * the answer is the entity's own name, picture and hints, read as any
 * entity's are, with no plugin to ask.
 */
import type { Game } from './game.ts'
import type { GameState } from './types.ts'
import { entityImage, entityUi, protagonist, speakerRef, PLAYER, YOU, type EntityRef } from './entities.ts'
import type { EntityUi, Ui } from './features/ui.ts'
import { entityName } from './prose.ts'
import { artSrc, type SpeakerFinder } from './sceneBody.ts'
import { pluginSaveName } from './plugin.ts'
import { stringOf } from './strings.ts'

/** Who is speaking, or who sent something, as the screen draws them. */
export type SpeakerView = {
  /** The id as content named them: `'ava'`, or a reference, `'character:ava'`. */
  id: string
  /** The entity they are. */
  ref: EntityRef
  name: string
  /** Their entity's picture, through `artSrc`; null for none. */
  image: string | null
  /** Their presentation hints, as their entity has them; left out with none. See `EntityUi`. */
  ui?: Ui<EntityUi>
}

/**
 * Who a speaker id is: their entity's name (its tokens filled), picture and
 * hints. Null when the id names no entity in the game. What a scene's
 * `speaker` becomes on screen, and what a plugin asks for the sender of a
 * message or a post.
 */
export function speakerOf(state: GameState, game: Game, id: string): SpeakerView | null {
  const ref = speakerRef(state, game, id)
  if (ref === undefined) return null
  const image = entityImage(state, game, ref)
  const ui = entityUi(state, game, ref)
  return { id, ref, name: entityName(state, game, ref), image: image === undefined ? null : artSrc(image), ...(ui ? { ui } : {}) }
}

/**
 * The name the player's own lines show: the name a save is listed under
 * (the first `saveName` that answers, such as the name the player typed), else the game's
 * string `you` (`You` in English).
 */
export function playerName(state: GameState, game: Game): string {
  return pluginSaveName(game, state) ?? stringOf(game, 'you')
}

/**
 * Who a spoken line under an id is, in this game. `'player'` is the player.
 * `'you'` is whoever the player is playing: their entity, else the player.
 * Any other id names an entity as a scene's `speaker` does (`'ava'` is
 * `character:ava`, else the one entity with that id), and the line is the
 * player's own when that entity is the one the player is playing. The name
 * shown is the entity's or the player's. An id that names no entity is a
 * character's line under the id, and the checker reports it.
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
