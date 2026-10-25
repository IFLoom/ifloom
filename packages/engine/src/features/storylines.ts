/**
 * Storylines: threads of the story, each with a kv store of its own (the `kv`
 * condition and effect with `of: 'storyline:<id>'`), that can be closed for a
 * while. The helpers are in `storylines.ts`.
 */
import { emptyStoryline, storylineOf, storylineOpen } from '../storylines.ts'
import type { StorylineDef } from '../game.ts'
import type { StorylineState } from '../types.ts'
import { defineFeature, mergedById } from './feature.ts'

/** What the storylines feature adds, as types. */
export type StorylinesShape = {
  state: {
    storylines: Record<string, StorylineState>
  }
  conditions: {
    /**
     * A storyline is open (`open: true`, the default): not closed, or closed
     * until a turn that has come. With `open: false`, that it is closed for now.
     */
    storyline: { storyline: string; open?: boolean }
  }
  effects: {
    /** Close a storyline for some turns. */
    closeStoryline: { closeStoryline: string; turns: number }
  }
  game: {
    /** Threads of story with their own kv store, closed for a while when they need a rest. None if left out. */
    storylines?: StorylineDef[]
  }
  pack: {
    storylines?: StorylineDef[]
  }
  lists: 'storyline'
}

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
