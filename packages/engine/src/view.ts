import { pluginLabel } from './plugin.ts'
import type { Game } from './game.ts'
import type { StageView } from './features/media.ts'
import type { SpeakerView } from './plugin.ts'
import type { SceneBeat } from './sceneBody.ts'
import type { SceneUi, Ui } from './features/ui.ts'
import type { RenderedChoice } from './screen.ts'
import type { Flat, GameState } from './types.ts'
import { renderedChoice, screen, type Screen, type ViewOptions } from './screen.ts'
import { featureContext } from './core.ts'
import { viewPieces, type FeatureView } from './features/registry.ts'

export type { SettingView } from './features/settings.ts'
export type { StatView } from './features/stats.ts'
export type { InputView } from './features/inputs.ts'
export type { NoticeView, NoticesView } from './features/notices.ts'
export type { EntitiesView, EntityView } from './features/entities.ts'

/** The view's fields the core fills itself. The features' (stats, settings, audio) are in `features/`. */
type ViewBase = {
  title: string
  /** Where the game is in time, in plugins' words ("Day 3 · Wednesday morning"), or null if none says. */
  when: string | null
  scene: {
    id: string | null
    /** Which screen this is: `scene:<id>`, `minigame:<id>`, `room:<stage id>` or `room`. It changes when the screen does, and only then. */
    key: string
    title: string
    body: string
    beats: SceneBeat[]
    /** The scene's tags, for the UI to style it by. */
    tags: string[]
    speaker: SpeakerView | null
    stageImage: string | null
    /** The scene's layered picture and its hotspots, or null when it has none. See `stageView`. */
    stage: StageView | null
    choices: RenderedChoice[]
    /** The scene's presentation hints (the room's stage's, when no scene is open), as written; left out with none. See `SceneUi`. */
    ui?: Ui<SceneUi>
  }
  actions: RenderedChoice[]
  /** What each plugin gives the UI, by plugin id. */
  plugins: Record<string, unknown>
}

/** Everything a UI draws for one state: the core's fields and each feature's. */
export type View = Flat<ViewBase & FeatureView>

/**
 * Everything the UI draws, assembled from the state in one pass.
 *
 * The scene, its choices, the room's buttons, the plugins' views and the audio
 * come from `screen`, which renders the open scene once; the rest is read from
 * the state here. `view` only formats: what each choice would apply and the
 * picks stay on the screen.
 *
 * `options.profile` hands each plugin's view its profile namespace; the
 * runner passes it, and without it no view sees the profile.
 */
export function view(state: GameState, game: Game, options: ViewOptions = {}): View {
  return viewOf(screen(state, game, options), state, game)
}

/** A screen as the view a UI draws. */
function viewOf(shown: Screen, state: GameState, game: Game): View {
  const cx = featureContext()
  const base: ViewBase = {
    title: game.title,
    when: pluginLabel(game, state),
    scene: { ...shown.scene, stage: shown.stage, choices: shown.choices.map(renderedChoice) },
    actions: shown.actions.map(renderedChoice),
    plugins: shown.plugins,
  }
  // Each feature's piece: the stats, the settings, the audio.
  return Object.assign(base, ...viewPieces.map((piece) => piece(state, game, shown, cx))) as View
}
