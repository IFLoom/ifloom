/**
 * Storylines: threads of the story, each with flags of its own, that can be
 * closed for a while. The helpers are in `storylines.ts`.
 */
import { emptyStoryline, storylineOf, storylineOpen } from '../storylines.ts'
import type { StorylineDef } from '../game.ts'
import type { FlagValue, StorylineState } from '../types.ts'
import { defineFeature, mergedById } from './feature.ts'

/** What the storylines feature adds, as types. */
export type StorylinesShape = {
  state: {
    storylines: Record<string, StorylineState>
  }
  conditions: {
    storylineFlag: { storylineFlag: { storyline: string; key: string; is?: FlagValue } }
    /**
     * A storyline is open (`open: true`, the default): not closed, or closed
     * until a turn that has come. With `open: false`, that it is closed for now.
     */
    storyline: { storyline: string; open?: boolean }
  }
  effects: {
    storylineFlag: { kind: 'storylineFlag'; id: string; key: string; value: FlagValue }
    closeStoryline: { kind: 'closeStoryline'; id: string; turns: number }
  }
  game: {
    storylines: StorylineDef[]
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
    storylines: { start: (game) => Object.fromEntries(game.storylines.map((storyline) => [storyline.id, emptyStoryline()])) },
  },
  conditions: {
    storylineFlag: {
      holds: (state, condition) => {
        const { storyline, key, is } = condition.storylineFlag
        const value = storylineOf(state, storyline).flags[key]
        return is === undefined ? Boolean(value) : value === is
      },
      explain: (state, condition) => {
        const { storyline, key, is } = condition.storylineFlag
        const value = storylineOf(state, storyline).flags[key]
        const want = is === undefined ? 'set' : `= ${JSON.stringify(is)}`
        return `storyline ${storyline} flag ${key} is ${value === undefined ? 'unset' : JSON.stringify(value)}; wants ${want}`
      },
      references: (condition) => [{ storyline: condition.storylineFlag.storyline }],
    },
    storyline: {
      holds: (state, condition) => storylineOpen(state, condition.storyline) === (condition.open ?? true),
      explain: (state, condition) => {
        const open = storylineOpen(state, condition.storyline)
        return `storyline ${condition.storyline} is ${open ? 'open' : 'closed'}; wants it ${condition.open ?? true ? 'open' : 'closed'}`
      },
      references: (condition) => [{ storyline: condition.storyline }],
    },
  },
  effects: {
    storylineFlag: {
      apply: (state, effect) => {
        const cur = storylineOf(state, effect.id)
        return { ...state, storylines: { ...state.storylines, [effect.id]: { ...cur, flags: { ...cur.flags, [effect.key]: effect.value } } } }
      },
      references: (effect) => [{ storyline: effect.id }],
    },
    closeStoryline: {
      apply: (state, effect) => {
        const cur = storylineOf(state, effect.id)
        return { ...state, storylines: { ...state.storylines, [effect.id]: { ...cur, closedUntil: state.turn + effect.turns } } }
      },
      references: (effect) => [{ storyline: effect.id }],
    },
  },
  // What the base game declares isn't merged: its storylines come from packs.
  pack: mergedById<StorylinesShape['game'], StorylinesShape['pack'], StorylineDef>({ pack: (pack) => pack.storylines }, (game, list) => {
    game.storylines = list
  }),
  lists: ['storyline'],
  // A storyline the game added since the save was made starts empty, whatever the game's version.
  loaded: (state, game) => {
    const lacking = game.storylines.filter((def) => !state.storylines?.[def.id])
    if (!lacking.length) return state
    const storylines: Record<string, StorylineState> = { ...state.storylines }
    for (const def of lacking) storylines[def.id] = emptyStoryline()
    return { ...state, storylines }
  },
  check: (game, tools) => tools.twice('storyline', 'storylines', game.storylines.map((entry) => entry.id)),
  resolve: (game) => {
    const ids = new Set(game.storylines.map((storyline) => storyline.id))
    return { storyline: (ref) => (ids.has(ref.storyline) ? [] : [`unknown storyline "${ref.storyline}"`]) }
  },
})
