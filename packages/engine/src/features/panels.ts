/**
 * Panels: a named piece of UI that content opens over the story, such as a
 * shop counter, a job board or the wardrobe. The engine keeps only which
 * panel is open and what it was opened with; the UI decides what each name
 * draws. Opening one is an effect, so a place's action, a person's, an
 * item's `use`, an app's button or a choice can each open one, and a save
 * and a replay open it exactly as play did.
 *
 * A panel stays open while the player uses it (buying several things, or
 * applying for a job, keeps it open) until it is closed, another replaces
 * it, or the story moves on: a command that ends a turn or changes the scene
 * on screen closes it, unless that same command opened it.
 */
import { stringOf } from '../strings.ts'
import type { PluginArgs } from '../plugin.ts'
import type { GameState } from '../types.ts'
import { defineFeature } from './feature.ts'

/** The open panel, a named piece of UI over the story, with the arguments it was opened with. `state.panel` and `view.panel` hold it. */
export type OpenPanel = {
  /** The panel's name, which the UI renders it by, such as `'shop'`, `'jobs'` or one of the game's own. */
  panel: string
  /** The panel's arguments, such as `{ vendor: 'cafe' }`. Empty if the effect gave none. */
  with: PluginArgs
  /**
   * The scene that holds the panel open, for a scene's own `panel`, which stays open as long as the scene does. It's
   * left out for a panel the `panel` effect opened.
   *
   * `closePanel` doesn't close a panel a scene holds open.
   */
  scene?: string
}

/** A panel a scene declares in its `panel`, held open for as long as the scene is open. `with` is empty if left out. */
export type ScenePanel = {
  /** The panel's name, which the UI renders it by. */
  panel: string
  /** The panel's arguments, such as `{ vendor: 'cafe' }`. Empty if left out. */
  with?: PluginArgs
}

/** The panels feature's state, calls, view and reference, as types. */
export type PanelsShape = {
  state: {
    /** The panel the `panel` effect opened over the story, or null. */
    panel: OpenPanel | null
  }
  effects: {
    /**
     * An effect that opens a panel by name with its arguments, such as `{ panel: 'shop', with: { vendor: 'cafe' } }`.
     * It replaces a panel already open, and `panel: null` closes it.
     */
    panel: { panel: string | null; with?: PluginArgs }
  }
  commands: {
    /** A command that closes the open panel, which a UI sends when the player dismisses it. The engine refuses it when no panel is open. */
    closePanel: { type: 'closePanel' }
  }
  view: {
    /** The panel open over the story. It's the one the `panel` effect opened, else the open scene's own, else null. */
    panel: OpenPanel | null
  }
  references: {
    /** A reference to a panel an effect opens, with its arguments. The plugins' `references.panels` check it. */
    openPanel: { openPanel: string; with?: PluginArgs }
  }
}

/** Whether a command moved the story on from under a panel that was already open: a turn ended, or the scene on screen changed. */
function movedOn(before: GameState, after: GameState): boolean {
  return after.turn !== before.turn || after.sceneId !== before.sceneId
}

/** The panels feature, which opens panels and closes them as the story moves on. */
export const panels = defineFeature<PanelsShape>({
  name: 'panels',
  state: {
    panel: {
      start: () => null,
      load: () => null,
      keeps: (value) => value === null || (typeof value === 'object' && typeof (value as OpenPanel).panel === 'string'),
    },
  },
  effects: {
    panel: {
      apply: (state, effect) => ({ ...state, panel: effect.panel === null ? null : { panel: effect.panel, with: { ...effect.with } } }),
      references: (effect) => (effect.panel === null ? [] : [{ openPanel: effect.panel, with: effect.with ?? {} }]),
    },
  },
  commands: {
    closePanel: {
      whyNot: (state, _command, game) => (state.panel ? undefined : stringOf(game, 'noPanel')),
      run: (state) => ({ ...state, panel: null }),
      // Closing a panel changes nothing in the story, and a lock must never hold one open.
      ignoresLocks: () => true,
      references: () => [],
    },
  },
  // A panel the command found open closes as the story moves on; one the command opened stays.
  afterCommand: {
    at: 'afterPlugins',
    run: (before, after) => (after.panel && after.panel === before.panel && movedOn(before, after) ? { ...after, panel: null } : after),
  },
  resolve: (game, tools) => ({
    openPanel: (ref, where) =>
      tools.resolve(
        // The game's own rules first, then its plugins, as everywhere else.
        [game.rules, ...(game.plugins ?? [])].flatMap((owner) => owner?.references?.panels?.(ref.openPanel, ref.with ?? {}, game) ?? []),
        where,
      ),
  }),
  // One the `panel` effect opened, else the open scene's own, for as long as it is open.
  view: (state, game, _shown, cx) => {
    if (state.panel) return { panel: state.panel }
    const held = state.sceneId ? cx.sceneOf(game, state.sceneId)?.panel : undefined
    return { panel: held ? { panel: held.panel, with: { ...held.with }, scene: state.sceneId! } : null }
  },
})
