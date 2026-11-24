import { pluginLabel } from './plugin.ts'
import type { Game } from './game.ts'
import type { PictureView } from './features/media.ts'
import type { SpeakerView } from './speakers.ts'
import type { SceneBeat } from './sceneBody.ts'
import type { SceneUi, Ui } from './features/ui.ts'
import type { RenderedChoice } from './screen.ts'
import type { Flat, GameState } from './types.ts'
import type { ViewsIn } from './calls.ts'
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
  /** The game's title. */
  title: string
  /** The time in the game in the plugins' words, such as "Day 3 · Wednesday morning", or null when no plugin gives one. */
  when: string | null
  /** The open scene as the player sees it, or the room when none is open, or the minigame while one is played. */
  scene: {
    /** The open scene's id, or null for the room. */
    id: string | null
    /**
     * The screen's key, which changes when the screen does and only then. It is `scene:<id>`, `minigame:<id>`,
     * `room:<id>` for a plugin's room scene, or `room`.
     */
    key: string
    /** The screen's title, the scene's or the room's. */
    title: string
    /** The body as markup text. A UI renders `beats`, which are this text parsed. */
    body: string
    /** The body parsed into beats, such as paragraphs, speech, pictures and past choices, ready to render. */
    beats: SceneBeat[]
    /** The index of the first beat the flow's last step added, so a UI can animate only those. It is 0 with none. */
    fresh: number
    /** The scene's tags, for a UI to style it by. */
    tags: string[]
    /** The scene's `speaker`, read from their entity, or null. */
    speaker: SpeakerView | null
    /** The speaker's picture to show with the scene, or null without one. */
    image: string | null
    /** The scene's layered picture and its hotspots, or null when it has none. `pictureView` builds it. */
    picture: PictureView | null
    /** The open scene's visible choices, ready to render. It is empty for the room and while a minigame is played. */
    choices: RenderedChoice[]
    /** The scene's `ui` hints, or the room scene's when no scene is open, unchanged from content. Left out with none. */
    ui?: Ui<SceneUi>
  }
  /**
   * The actions on offer besides the scene's choices, ready to render. The `actions` providers' come first, such as
   * wait, sleep and travel, then the game's own `actions`.
   */
  actions: RenderedChoice[]
  /** The plugins' views, by plugin id. Each plugin that declares its view in `ViewRegistry` has it typed. */
  plugins: ViewsIn
}

/** One state as a UI renders it, returned by `view`. It holds the core's fields and each feature's. */
export type View = Flat<ViewBase & FeatureView>

/**
 * Returns the {@link View} of a state, the value a UI renders. Without `options.profile`, no plugin's view reads the
 * profile.
 *
 * The scene, its choices, the room's actions, the plugins' views and the audio come from `screen`, which renders the
 * open scene once, and the rest comes from the state. `view` only formats, so each choice's effects and the pool picks
 * stay on the screen.
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
    scene: { ...shown.scene, picture: shown.picture, choices: shown.choices.map(renderedChoice) },
    actions: shown.actions.map(renderedChoice),
    plugins: shown.plugins,
  }
  // Each feature's piece: the stats, the settings, the audio.
  return Object.assign(base, ...viewPieces.map((piece) => piece(state, game, shown, cx))) as View
}
