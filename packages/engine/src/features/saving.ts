/**
 * Saving: when the game lets the player save. The engine keeps no saves
 * itself (the runner and `saves` do); this is the game's say in it, as
 * `blocked` entries, refused while `when` holds, like a choice's. The view
 * shows it so a UI can grey out its Save button with the reason, and the
 * runner refuses `save` and skips its autosave while it holds.
 */
import type { Blocked, Game } from '../game.ts'
import { reasonOf } from '../strings.ts'
import type { Condition, GameState } from '../types.ts'
import { appended, defineFeature, listWords } from './feature.ts'

/** The player's leave to save as the player sees it, in `view.saving`. A UI greys out or hides its Save button from it. */
export type SavingView = {
  /** The leave to save, false while one of the game's `saveable` entries holds. */
  allowed: boolean
  /** The reason of the first `saveable` entry that holds. Null when saving is allowed. */
  reason: string | null
  /** The Save button's visibility, false while the entry that holds has `hide`. A UI then leaves Save off the screen rather than greying it out. */
  visible: boolean
}

/** The saving feature's content key and view, as types. */
export type SavingShape = {
  game: {
    /**
     * The game's reasons to refuse saving, as `blocked` entries refused while their `when` holds. The first entry
     * that holds gives the reason, and saving is always allowed if left out.
     */
    saveable?: Blocked[]
  }
  pack: {
    /** The pack's reasons to refuse saving, added after the content's. An entry with the `id` of an earlier one replaces it. */
    saveable?: Blocked[]
  }
  view: {
    /** The player's leave to save now, with the reason when it's refused. */
    saving: SavingView
  }
  lists: 'saveable'
}

const ALLOWED: SavingView = Object.freeze({ allowed: true, reason: null, visible: true })

/** Returns the player's leave to save in this state, from the game's `saveable`. Saving is allowed when no entry holds. */
export function savingIn(state: GameState, game: Game, holds: (state: GameState, game: Game, condition: Condition | undefined) => boolean): SavingView {
  const entry = game.saveable?.find((blocked) => holds(state, game, blocked.when))
  return entry ? { allowed: false, reason: reasonOf(game, entry.reason), visible: !entry.hide } : ALLOWED
}

/** The saving feature, which refuses saving while a `saveable` entry holds. */
export const saving = defineFeature<SavingShape>({
  name: 'saving',
  pack: appended<SavingShape['game'], SavingShape['pack'], Blocked & { id?: string }>(
    'saveable',
    (pack) => pack.saveable,
    (game, list) => {
      game.saveable = list
    },
  ),
  // Saveable entries are added, each file its own, so none is declared twice.
  content: { saveable: { declares: null, words: listWords('saveable', 'saveable', { reason: true }) } },
  lists: ['saveable'],
  check: (game, tools) => {
    ;(game.saveable ?? []).forEach((entry, index) => tools.check({ list: 'saveable', id: String(index) }, 'saveable', [{ when: entry.when }]))
  },
  view: (state, game, _shown, cx) => ({ saving: savingIn(state, game, cx.holds) }),
  runner: {
    // The runner refuses `save`, and skips its autosave, while the game's `saveable` refuses saving.
    refusesSave: (state, game, cx) => savingIn(state, game, cx.holds).reason ?? undefined,
  },
})
