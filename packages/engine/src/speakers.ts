/**
 * Who someone is, for the screen: a scene's speaker, the sender of a
 * message, whoever a spoken line is written under. People are entities, so
 * the answer is the entity's own name, picture and hints, read as any
 * entity's are, with no plugin to ask.
 */
import type { Game } from './game.ts'
import type { GameState } from './types.ts'
import { entityImage, entityUi, hasEntity, protagonist, PLAYER, YOU, type EntityRef } from './entities.ts'
import type { EntityUi, Ui } from './features/ui.ts'
import { entityName } from './prose.ts'
import { artSrc, type SpeakerFinder } from './sceneBody.ts'
import { say } from './strings.ts'

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

/** The kind a bare speaker id is read as first: the cast's. */
const SPEAKER_KIND = 'character'

/**
 * The entity a speaker id names, if it names one: a reference as written
 * (`'character:ava'`, `'you'` for whoever the player is playing), or a bare id
 * as `character:<id>`, else the one entity the game declares with that id.
 * Undefined when it names none.
 */
export function speakerRef(state: GameState, game: Game, id: string): EntityRef | undefined {
  if (id === YOU) {
    const who = protagonist(state)
    return who === PLAYER ? undefined : who
  }
  if (id.includes(':')) return hasEntity(state, game, id) ? id : undefined
  const ref = `${SPEAKER_KIND}:${id}`
  if (hasEntity(state, game, ref)) return ref
  const named = (game.entities ?? []).filter((entity) => entity.id === id)
  if (named.length !== 1) return undefined
  const only = `${named[0].of}:${id}`
  return hasEntity(state, game, only) ? only : undefined
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
 * Who a named spoken line in this game is: the player's own when it is
 * written under the game's word for the player (the string `you`, `You` in
 * English) or under the name of whoever the player is playing; else the
 * entity the game declares by that name, if one is; else a character's
 * line, with no entity.
 */
export function lineSpeakers(state: GameState, game: Game): SpeakerFinder {
  const word = say(game, 'you')
  const playing = protagonist(state)
  let byName: Map<string, EntityRef> | undefined
  return (name) => {
    if (name === word) return { who: 'player' }
    if (playing !== PLAYER && entityName(state, game, playing) === name) return { who: 'player', speaker: playing }
    if (!byName) {
      byName = new Map()
      for (const entity of game.entities ?? []) {
        const ref = `${entity.of}:${entity.id}`
        if (!hasEntity(state, game, ref)) continue
        const shown = entityName(state, game, ref)
        if (!byName.has(shown)) byName.set(shown, ref)
      }
    }
    const speaker = byName.get(name)
    return speaker !== undefined ? { who: 'character', speaker } : { who: 'character' }
  }
}
