/**
 * Saving: when the game lets the player save. The engine keeps no saves
 * itself (the runner and `saves` do); this is the game's say in it, as
 * `blocked` entries, refused while `when` holds, like a choice's. The view
 * shows it so a UI can grey out its Save button with the reason, and the
 * runner refuses `save` and skips its autosave while it holds.
 */
import type { Blocked, Game } from '../game.ts'
import type { Condition, GameState } from '../types.ts'
import { appended, defineFeature } from './feature.ts'

/** Whether the player can save now, and why not: what `view.saving` holds. */
export type SavingView = {
  /** False while one of `game.saveable`'s entries holds. */
  allowed: boolean
  /** The first entry's `reason` that holds, or null when saving is allowed. */
  reason: string | null
  /** False while that entry has `hide`: leave Save off the screen rather than greyed out. */
  visible: boolean
}

/** What the saving feature adds, as types. */
export type SavingShape = {
  game: {
    /**
     * When saving is refused, and why: `blocked` entries, refused while
     * `when` holds, as a choice's are. The first that holds gives the
     * reason. Saving is always allowed if left out.
     */
    saveable?: Blocked[]
  }
  pack: {
    /** When saving is refused, after the entries before; one with the `id` of an earlier one takes its place. */
    saveable?: Blocked[]
  }
  view: {
    /** Whether the player can save now, for a Save button. */
    saving: SavingView
  }
  lists: 'saveable'
}

const ALLOWED: SavingView = Object.freeze({ allowed: true, reason: null, visible: true })

/** Whether the player can save in this state, by the game's `saveable`. */
export function savingIn(state: GameState, game: Game, holds: (state: GameState, condition: Condition | undefined, game?: Game) => boolean): SavingView {
  const entry = game.saveable?.find((blocked) => holds(state, blocked.when, game))
  return entry ? { allowed: false, reason: entry.reason, visible: !entry.hide } : ALLOWED
}

export const saving = defineFeature<SavingShape>({
  name: 'saving',
  pack: appended<SavingShape['game'], SavingShape['pack'], Blocked & { id?: string }>(
    'saveable',
    (pack) => pack.saveable,
    (game, list) => {
      game.saveable = list
    },
  ),
  lists: ['saveable'],
  check: (game, tools) => {
    ;(game.saveable ?? []).forEach((entry, index) => tools.check({ list: 'saveable', id: String(index) }, 'saveable', [{ when: entry.when }]))
  },
  view: (state, game, _shown, cx) => ({ saving: savingIn(state, game, cx.holds) }),
})
