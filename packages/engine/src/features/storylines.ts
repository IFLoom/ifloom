/**
 * Storylines: threads of the story, each with a kv store of its own, that can be
 * closed for a while. The helpers are in `storylines.ts`.
 */
import { emptyStoryline, storylineOf, storylineOpen } from '../storylines.ts'
import type { StorylineDef } from '../game.ts'
import type { KvValue, Range, StorylineState } from '../types.ts'
import { defineFeature, mergedById } from './feature.ts'
import { asCount, bounded, inRange, wanted } from '../range.ts'

/** What the storylines feature adds, as types. */
export type StorylinesShape = {
  state: {
    storylines: Record<string, StorylineState>
  }
  conditions: {
    /**
     * A key in a storyline's kv store, read as the `kv` condition reads one:
     * bare, whether it is truthy; with `is`, whether it equals that; with a
     * range, whether its number is in it.
     * `{ storylineKv: { storyline: 'rosa', key: 'visits' }, gte: 3 }`.
     */
    storylineKv: { storylineKv: { storyline: string; key: string }; is?: KvValue } & Range
    /**
     * A storyline is open (`open: true`, the default): not closed, or closed
     * until a turn that has come. With `open: false`, that it is closed for now.
     */
    storyline: { storyline: string; open?: boolean }
  }
  effects: {
    /** Set a storyline's key `to` a value, or change its number `by` an amount, as the `kv` effect does. */
    storylineKv: { kind: 'storylineKv'; storyline: string; key: string; to: KvValue } | { kind: 'storylineKv'; storyline: string; key: string; by: number }
    /** Close a storyline for some turns. */
    closeStoryline: { kind: 'closeStoryline'; storyline: string; turns: number }
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
    storylineKv: {
      holds: (state, condition) => {
        const { storyline, key } = condition.storylineKv
        const value = storylineOf(state, storyline).kv[key]
        if (condition.is !== undefined) return value === condition.is
        if (bounded(condition)) return inRange(asCount(value), condition)
        return Boolean(value)
      },
      explain: (state, condition) => {
        const { storyline, key } = condition.storylineKv
        const value = storylineOf(state, storyline).kv[key]
        const want = condition.is !== undefined ? `= ${JSON.stringify(condition.is)}` : bounded(condition) ? wanted(condition) : 'set'
        return `storyline ${storyline} kv ${key} is ${value === undefined ? 'unset' : JSON.stringify(value)}; wants ${want}`
      },
      references: (condition) => [{ storyline: condition.storylineKv.storyline }],
    },
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
    storylineKv: {
      apply: (state, effect) => {
        const cur = storylineOf(state, effect.storyline)
        const was = cur.kv[effect.key]
        const value = 'by' in effect ? (typeof was === 'number' ? was : 0) + effect.by : effect.to
        return { ...state, storylines: { ...state.storylines, [effect.storyline]: { ...cur, kv: { ...cur.kv, [effect.key]: value } } } }
      },
      references: (effect) => [{ storyline: effect.storyline }],
    },
    closeStoryline: {
      apply: (state, effect) => {
        const cur = storylineOf(state, effect.storyline)
        return { ...state, storylines: { ...state.storylines, [effect.storyline]: { ...cur, closedUntil: state.turn + effect.turns } } }
      },
      references: (effect) => [{ storyline: effect.storyline }],
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
