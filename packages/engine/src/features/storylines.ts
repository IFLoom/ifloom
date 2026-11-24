/**
 * Storylines: threads of the story, each with a kv store of its own (the `kv`
 * condition and effect with `of: 'storyline:<id>'`), that can be closed for a
 * while. The helpers are in `storylines.ts`.
 */
import { emptyStoryline, storylineOf, storylineOpen } from '../storylines.ts'
import type { StorylineDef } from '../game.ts'
import type { StorylineState } from '../types.ts'
import { byId, defineFeature, listWords, mergedById } from './feature.ts'

/** The storylines feature's state, calls and content key, as types. */
export type StorylinesShape = {
  state: {
    /** The storylines a save keeps, by id, each with its kv store and the turn it stays closed until. */
    storylines: Record<string, StorylineState>
  }
  conditions: {
    /**
     * A condition that holds while a storyline is open. With `open: false` it holds while the storyline is closed.
     *
     * A storyline is open when nothing closed it, or when the turn it was closed until has come. `open` is true if
     * left out.
     */
    storyline: { storyline: string; open?: boolean }
  }
  effects: {
    /** An effect that closes a storyline for `turns` turns. Its kv store keeps its values while it's closed. */
    closeStoryline: { closeStoryline: string; turns: number }
  }
  game: {
    /** The game's storylines, threads of story each with its own kv store, which a `closeStoryline` effect rests for some turns. None if left out. */
    storylines?: StorylineDef[]
  }
  pack: {
    /** The pack's storylines, merged by id over the content's. */
    storylines?: StorylineDef[]
  }
  lists: 'storyline'
  references: {
    /** A reference to a storyline by id. */
    storyline: { storyline: string }
  }
}

/** The storylines feature, which keeps each storyline's kv store and closes storylines for some turns. */
export const storylines = defineFeature<StorylinesShape>({
  name: 'storylines',
  state: {
    // A storyline the save lacks is added by `loaded`, from the game's list.
    storylines: { start: (game) => Object.fromEntries((game.storylines ?? []).map((storyline) => [storyline.id, emptyStoryline()])) },
  },
  conditions: {
    storyline: {
      holds: (state, condition) => storylineOpen(state, condition.storyline) === (condition.open ?? true),
      explain: (state, condition) => {
        const open = storylineOpen(state, condition.storyline)
        return `storyline ${condition.storyline} is ${open ? 'open' : 'closed'}; wants it ${(condition.open ?? true) ? 'open' : 'closed'}`
      },
      references: (condition) => [{ storyline: condition.storyline }],
    },
  },
  effects: {
    closeStoryline: {
      apply: (state, effect) => {
        const cur = storylineOf(state, effect.closeStoryline)
        return { ...state, storylines: { ...state.storylines, [effect.closeStoryline]: { ...cur, closedUntil: state.turn + effect.turns } } }
      },
      references: (effect) => [{ storyline: effect.closeStoryline }],
    },
  },
  // What the base game declares isn't merged: its storylines come from packs.
  pack: mergedById<StorylinesShape['game'], StorylinesShape['pack'], StorylineDef>({ pack: (pack) => pack.storylines }, (game, list) => {
    game.storylines = list
  }),
  content: { storylines: { declares: byId('storyline'), words: listWords('storylines', 'storyline', { name: true }) } },
  lists: ['storyline'],
  // A storyline the game added since the save was made starts empty, whatever the game's version.
  loaded: (state, game) => {
    const lacking = (game.storylines ?? []).filter((def) => !state.storylines?.[def.id])
    if (!lacking.length) return state
    const storylines: Record<string, StorylineState> = { ...state.storylines }
    for (const def of lacking) storylines[def.id] = emptyStoryline()
    return { ...state, storylines }
  },
  check: (game, tools) =>
    tools.twice(
      'storyline',
      'storylines',
      (game.storylines ?? []).map((entry) => entry.id),
    ),
  resolve: (game) => {
    const ids = new Set((game.storylines ?? []).map((storyline) => storyline.id))
    return { storyline: (ref) => (ids.has(ref.storyline) ? [] : [`unknown storyline "${ref.storyline}"`]) }
  },
})
