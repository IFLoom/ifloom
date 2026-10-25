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
import { say } from '../strings.ts'
import type { PluginArgs } from '../plugin.ts'
import type { GameState } from '../types.ts'
import { defineFeature } from './feature.ts'

/** The panel that is open: its name, and what it was opened with. */
export type OpenPanel = {
  /** Its name, as the UI knows it: `'shop'`, `'jobs'`, or one of the game's own. */
  panel: string
  /** What it was opened with, such as `{ vendor: 'cafe' }`. Empty if the effect gave nothing. */
  with: PluginArgs
  /**
   * The scene that holds it open, for a scene's own `panel`: it is open for
   * as long as the scene is, and `closePanel` doesn't close it. Left out for
   * one the `panel` effect opened.
   */
  scene?: string
}

/** A panel a scene holds open for as long as it is on screen: its name, and what it is opened with. */
export type ScenePanel = { panel: string; with?: PluginArgs }

/** What the panels feature adds, as types. */
export type PanelsShape = {
  state: {
    /** The panel open over the story, or null. */
    panel: OpenPanel | null
  }
  effects: {
    /**
     * Open a panel by name, with what it needs: `{ panel: 'shop', with: { vendor: 'cafe' } }`.
     * One already open is replaced. `panel: null` closes it.
     */
    panel: { panel: string | null; with?: PluginArgs }
  }
  commands: {
    /** Close the open panel: what a UI sends when the player dismisses it. Refused with none open. */
    closePanel: { type: 'closePanel' }
  }
  view: {
    /** The panel open over the story: one the `panel` effect opened, else the open scene's own, else null. */
    panel: OpenPanel | null
  }
}

/** Whether a command moved the story on from under a panel that was already open: a turn ended, or the scene on screen changed. */
function movedOn(before: GameState, after: GameState): boolean {
  return after.turn !== before.turn || after.sceneId !== before.sceneId
}

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
      whyNot: (state, _command, game) => (state.panel ? undefined : say(game, 'noPanel')),
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
    openPanel: (ref, where) => {
      const asked = { problems: (refs: Parameters<typeof tools.resolve>[0]) => tools.resolve(refs, where) }
      return (game.plugins ?? []).flatMap((plugin) => plugin.panelProblems?.(ref.openPanel, ref.with ?? {}, game, asked) ?? [])
    },
  }),
  // One the `panel` effect opened, else the open scene's own, for as long as it is open.
  view: (state, game, _shown, cx) => {
    if (state.panel) return { panel: state.panel }
    const held = state.sceneId ? cx.sceneById(game, state.sceneId)?.panel : undefined
    return { panel: held ? { panel: held.panel, with: { ...held.with }, scene: state.sceneId! } : null }
  },
})
