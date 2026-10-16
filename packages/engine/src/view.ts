import { pluginLabel } from './plugin.ts'
import type { Game } from './game.ts'
import type { StageView } from './features/media.ts'
import type { SpeakerView } from './plugin.ts'
import type { SceneBeat } from './sceneBody.ts'
import type { Flat, GameState } from './types.ts'
import { screen, type RenderedChoice, type Screen, type ScreenChoice, type ViewOptions } from './screen.ts'
import { featureContext } from './core.ts'
import { viewPieces, type FeatureView } from './features/registry.ts'

export type { SettingView } from './features/settings.ts'
export type { StatView } from './features/stats.ts'
export type { InputView } from './features/inputs.ts'
export type { CollectionView } from './features/collections.ts'
export type { NoticeView, NoticesView } from './features/notices.ts'
export type { EntitiesView, EntityView } from './features/entities.ts'

/** The view's fields the core fills itself. The features' (stats, settings, audio) are in `features/`. */
type ViewBase = {
  title: string
  /** Where the game is in time, in plugins' words ("Day 3 · Wednesday morning"), or null if none says. */
  when: string | null
  scene: {
    id: string | null
    title: string
    body: string
    beats: SceneBeat[]
    frame: 'stage' | 'talk'
    /** The scene's tags, for the UI to style it by. */
    tags: string[]
    /** A bespoke panel to render instead of the choice list, by name. */
    panel: string | null
    /** What that panel needs. Opaque here; the panel knows its own shape. */
    panelData: unknown
    speaker: SpeakerView | null
    stageImage: string | null
    /** The scene's layered picture and its hotspots, or null when it has none. See `stageView`. */
    stage: StageView | null
    choices: RenderedChoice[]
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
    scene: { ...shown.scene, stage: shown.stage, choices: shown.choices.map(rendered) },
    actions: shown.actions.map(rendered),
    plugins: shown.plugins,
  }
  // Each feature's piece: the stats, the settings, the audio.
  return Object.assign(base, ...viewPieces.map((piece) => piece(state, game, shown, cx))) as View
}

/** A screen's choice as the view shows it: without its effects. */
function rendered({ effects: _effects, ...choice }: ScreenChoice): RenderedChoice {
  return choice
}



