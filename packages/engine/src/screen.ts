/**
 * One state as the player would see it: the open scene rendered once (or the
 * room, when none is open), its choices with what each would apply, the
 * stage, every plugin's view, and the pool picks and audio all of that implies.
 *
 * `view` is built from it, and the reducer records picks and audio from it, so
 * a scene is rendered once per screen rather than once per question asked
 * about it.
 */
import { say } from './strings.ts'
import { pluginButtons, pluginCommand, pluginSpeaker, type SpeakerView, pluginPrices, pluginStage, pluginsWatch, pluginViews } from './plugin.ts'
import { defaultRuntime, renderScene } from './scene.ts'
import { effectsIn, rendering, warningIn, whyNotIn, type Rendering } from './availability.ts'
import { formatStat, statDef } from './features/stats.ts'
import { holds } from './condition.ts'
import { lockIn, lockedOut } from './locks.ts'
import { sceneById, type ActionDef, type Game, type SceneMedia } from './game.ts'
import { activityById } from './activity.ts'
import { artSrc, mediaKind, parseBeats, videoView, type SceneBeat } from './sceneBody.ts'
import { mediaMarkup, poolPick, resolveMedia, resolvePoolMarkup, type HotspotView, type MediaStage, type StageLayerView, type StageView } from './features/media.ts'
import { audioTracks, audioView, type AudioView } from './features/audio.ts'
import { featureContext } from './core.ts'
import type { Command, Effect, GameState } from './types.ts'

/**
 * What pressing a button will spend, shown on it before it is pressed. Only
 * costs: what a choice *pays* stays off the label, because a payout printed on
 * a line tells the player which line is the right one.
 */
export type Price = {
  /** Stats it spends, in the order the button lists them, written for the player. */
  stats?: { id: string; amount: number; text: string }[]
  /** What plugins say it costs, in their words: "until evening". */
  notes?: string[]
}

export type RenderedChoice = {
  id: string
  label: string
  price?: Price
  disabled?: string
  tags?: string[]
  irreversible?: string
  /**
   * Pressable, but the game would rather you didn't, and says why: a plugin
   * guard's soft refusal: running past dawn, say. The reducer refuses it all the
   * same, so a UI shows the warning and offers something else.
   */
  warning?: string
  command: Command
}

/** A choice or a button on a screen: as the view shows it, and what pressing it would apply. */
export type ScreenChoice = RenderedChoice & {
  /** What it would apply, as `effectsOf` says: a choice's effects, an activity's cost and effects. */
  effects: Effect[]
}

/** The scene on a screen, or the room when none is open, without its choices and stage. */
export type ScreenScene = {
  /** The open scene's id, or null for the room. */
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
}

/** One state's screen. See `screen`. */
export type Screen = {
  /** The open scene as rendered, or the room when none is open. */
  scene: ScreenScene
  /** The open scene's visible choices, each with its effects, availability and price. Empty for the room. */
  choices: ScreenChoice[]
  /** The room's buttons while no scene is open and no lock stops everything: plugins' first, then the game's. */
  actions: ScreenChoice[]
  /** The open scene's layered picture and its hotspots, or null. */
  stage: StageView | null
  /** Every plugin's view, by plugin id. */
  plugins: Record<string, unknown>
  /** The pool picks this screen made that the save doesn't hold yet, by pick key. The reducer records them. */
  picks: Record<string, string>
  /**
   * What should be playing, as `view.audio` has it, and `tracks`: the track
   * each background channel resolved to (null for silence), which the reducer
   * records as started.
   */
  audio: AudioView & { tracks: Record<string, string | null> }
}

/** What one screen shares while it is drawn: the open scene, rendered once, and the picks made. */
type Drawing = { rendered: Rendering; picks: Record<string, string> }

/**
 * One state, drawn once: the open scene (or the room), its choices with their
 * effects, availability and price, the room's buttons, the stage, the plugins'
 * views, and the pool picks and audio they imply. The open scene is rendered
 * once, and every choice's availability and effects come from that one render.
 *
 * `view` formats a screen for a UI. Use `screen` when you need what `view`
 * leaves out: what each choice would apply, or the picks and tracks.
 */
export function screen(state: GameState, game: Game): Screen {
  const picks: Record<string, string> = {}
  const drawing: Drawing = { rendered: rendering(state, game, picks), picks }
  const idle = !lockedOut(state, game) && !state.sceneId
  const dialogue = renderDialogue(state, game, drawing)
  const room = dialogue ? null : standing(state, game, drawing)
  const actions = idle ? idleActions(state, game, drawing) : []
  const plugins = pluginViews(state, game, picks)
  const cx = featureContext()
  const tracks = audioTracks(state, game, dialogue?.audio, cx)
  const beats = dialogue ? dialogue.scene.beats : null
  return {
    scene: dialogue?.scene ?? room!,
    choices: dialogue?.choices ?? [],
    actions,
    stage: dialogue?.stage ?? null,
    plugins,
    picks,
    audio: { ...audioView(state, game, tracks, beats, cx), tracks },
  }
}

/** The room itself, when no scene is playing over it. */
function standing(state: GameState, game: Game, drawing: Drawing): ScreenScene {
  // A plugin's stage; with none, there is nothing to read but the buttons.
  const stage = pluginStage(game, state)
  const rendered = stage?.body
    ? renderScene({ id: stage.id, body: [...stage.body], choices: [] }, state, defaultRuntime(game), drawing.picks)
    : { body: '' }
  const body = rendered.body ?? ''
  return {
    id: null,
    title: stage?.title ?? game.title,
    body,
    beats: beatsOf(state, game, stage?.id ?? '', body, 'media' in rendered ? rendered.media : undefined, drawing.picks),
    frame: 'stage',
    tags: [],
    panel: null,
    panelData: null,
    speaker: null,
    stageImage: null,
  }
}

/**
 * A body's beats, with media that opens or closes it around them. Media with no
 * `at` in a hand-built scene's list goes at the end, as it always has; a data
 * scene's `{ media }` blocks are already in the body, in place.
 */
function beatsOf(
  state: GameState,
  game: Game,
  owner: string,
  body: string,
  media: readonly SceneMedia[] | undefined,
  picks: Record<string, string>,
): SceneBeat[] {
  const placed = (media ?? []).flatMap((item, index) => {
    const shown = resolveMedia(item, state, game, owner, `media.${index}`, featureContext(), picks)
    return shown ? [{ at: shown.at ?? 'end', beats: parseBeats(mediaMarkup(shown)) }] : []
  })
  return [
    ...placed.filter((item) => item.at === 'lead').flatMap((item) => item.beats),
    ...parseBeats(body),
    ...placed.filter((item) => item.at !== 'lead').flatMap((item) => item.beats),
  ]
}

/**
 * A stage as the UI draws it: the layers whose `when` holds, each with its
 * file (a pool's pick, kept per owner and layer as `stage:<index>`), and the
 * hotspots on them. A hotspot tied to a layer that isn't shown is left out. A
 * `choice` hotspot takes that choice's command and availability from
 * `choices`, the scene's rendered choices, and is left out when the choice is
 * not on offer; a `command` hotspot is worked out as any action's button is.
 * Exported for plugins that draw a stage of their own: a place's. A plugin's
 * `view` passes its context's `picks`, so the reducer records the layers' picks.
 */
export function stageView(
  state: GameState,
  game: Game,
  stage: MediaStage | undefined,
  owner: string,
  choices: readonly RenderedChoice[] | null = null,
  picks?: Record<string, string>,
): StageView | null {
  return drawStage(state, game, stage, owner, choices, { rendered: rendering(state, game, picks), picks: picks ?? {} })
}

function drawStage(
  state: GameState,
  game: Game,
  stage: MediaStage | undefined,
  owner: string,
  choices: readonly RenderedChoice[] | null,
  drawing: Drawing,
): StageView | null {
  if (!stage) return null
  const layers: StageLayerView[] = []
  stage.layers.forEach((layer, index) => {
    if (!holds(state, layer.when, game)) return
    const src = layer.pool !== undefined
      ? poolPick(state, game, { pool: layer.pool, tags: layer.tags, owner, slot: `stage:${index}` }, featureContext(), drawing.picks)
      : (layer.src ?? null)
    if (!src) return
    const video = Boolean(layer.video) || mediaKind(src) === 'video'
    layers.push({
      id: layer.id ?? null,
      src: artSrc(src, video ? 'video' : 'image'),
      ...(video ? { video: videoView(layer) } : {}),
    })
  })
  const shown = new Set(layers.map((layer) => layer.id))
  const hotspots: HotspotView[] = []
  for (const hotspot of stage.hotspots ?? []) {
    if (!holds(state, hotspot.when, game)) continue
    if (hotspot.layer !== undefined && !shown.has(hotspot.layer)) continue
    let button: Pick<RenderedChoice, 'command' | 'disabled' | 'warning'> | undefined
    if (hotspot.choice !== undefined) button = choices?.find((choice) => choice.id === hotspot.choice)
    else if (hotspot.command && !hiddenByLock(state, game, hotspot.command, drawing.rendered)) {
      button = actionButton(state, game, { id: hotspot.id, label: hotspot.label, command: hotspot.command }, drawing.rendered)
    }
    if (!button) continue
    hotspots.push({
      id: hotspot.id,
      rect: hotspot.rect,
      label: hotspot.label,
      command: button.command,
      ...(button.disabled !== undefined ? { disabled: button.disabled } : {}),
      ...(button.warning !== undefined ? { warning: button.warning } : {}),
      ...(hotspot.layer !== undefined ? { layer: hotspot.layer } : {}),
    })
  }
  return { aspect: stage.aspect ?? null, layers, hotspots }
}

/** Is this button left off the screen by a lock that hides? Never one that ignores locks. */
function hiddenByLock(state: GameState, game: Game, command: Command, rendered: Rendering): boolean {
  if (command.type === 'custom' && pluginCommand(game, command.name)?.ignoresLocks) return false
  return Boolean(lockIn(state, game, command, () => effectsIn(rendered, state, game, command))?.hide)
}

/**
 * The buttons offered while no scene is open: plugins' first, then the
 * game's. One a hiding lock stops is left off the screen.
 */
function idleActions(state: GameState, game: Game, drawing: Drawing): ScreenChoice[] {
  return [...pluginButtons(game, state), ...(game.actions ?? [])]
    .filter((action) => holds(state, action.when, game) && !hiddenByLock(state, game, action.command, drawing.rendered))
    .map((action) => {
      const effects = effectsIn(drawing.rendered, state, game, action.command)
      return { ...actionButton(state, game, action, drawing.rendered, effects), effects }
    })
}

/**
 * An action as a button: its label, its price, and why it is greyed out, if it
 * is. Availability comes from `whyNot`, so the button and the reducer always
 * agree. What a room's buttons are made with, for plugins that show actions
 * somewhere else — an app on a device.
 */
export function renderAction(
  state: GameState,
  game: Game,
  action: ActionDef,
): RenderedChoice {
  return actionButton(state, game, action, rendering(state, game))
}

/** `renderAction`, asking `rendered` for the open scene. `effects`, when the caller has worked them out. */
function actionButton(
  state: GameState,
  game: Game,
  action: ActionDef,
  rendered: Rendering,
  known?: readonly Effect[],
): RenderedChoice {
  const activity =
    action.command.type === 'activity'
      ? activityById(game, action.command.id)
      : undefined
  // Worked out here only when a plugin will look at them; a lock asks for them itself.
  const watched = pluginsWatch(game)
  const effects = known ?? (watched ? effectsIn(rendered, state, game, action.command) : undefined)
  const choice: RenderedChoice = {
    id: action.id,
    label: action.label,
    price: priced(state, game, activity?.cost ?? {}, watched ? effects : []),
    disabled:
      action.blocked?.find((entry) => holds(state, entry.when, game))?.reason ??
      whyNotIn(rendered, state, game, action.command, effects),
    command: action.command,
  }
  const warning = warningIn(rendered, state, game, action.command, effects)
  if (warning) choice.warning = warning
  return choice
}

function priced(
  state: GameState,
  game: Game,
  cost: { stats?: Record<string, number> },
  effects: readonly Effect[] = [],
): Price | undefined {
  const out: Price = {}
  const spent = Object.entries(cost.stats ?? {})
    .filter(([, amount]) => amount > 0)
    .map(([id, amount]) => ({ id, amount, text: formatStat(statDef(game, id), amount) }))
  if (spent.length) out.stats = spent
  const notes = effects.length ? pluginPrices(game, state, effects) : []
  if (notes.length) out.notes = notes
  return Object.keys(out).length ? out : undefined
}

/**
 * A scene choice spends through its effects: any spendable
 * stat down. Listed in the order the game declared its stats.
 */
function priceOfEffects(
  state: GameState,
  game: Game,
  effects: readonly Effect[],
): Price | undefined {
  const spent: Record<string, number> = {}
  for (const effect of effects) {
    if (effect.kind === 'stat' && effect.of === undefined && effect.by < 0 && statDef(game, effect.key)?.spendable) {
      spent[effect.key] = (spent[effect.key] ?? 0) - effect.by
    }
  }
  const stats: Record<string, number> = {}
  for (const stat of game.stats ?? []) {
    if (spent[stat.id]) stats[stat.id] = spent[stat.id]
  }
  return priced(state, game, { stats }, effects)
}

type Dialogue = {
  scene: ScreenScene
  choices: ScreenChoice[]
  stage: StageView | null
  audio?: Record<string, string | null>
}

/** The open scene as the screen draws it, and what it puts on the audio channels. */
function renderDialogue(state: GameState, game: Game, drawing: Drawing): Dialogue | null {
  if (!state.sceneId) return null
  const scene = sceneById(game, state.sceneId)
  if (!scene) {
    return {
      scene: {
        id: state.sceneId,
        title: pluginStage(game, state)?.title ?? game.title,
        body: say(game, 'momentPassed'),
        beats: parseBeats(say(game, 'momentPassed')),
        frame: 'stage',
        tags: [],
        panel: null,
        panelData: null,
        speaker: null,
        stageImage: null,
      },
      choices: [
        { id: 'leave', label: say(game, 'lookAround'), command: { type: 'leave' }, effects: [] },
      ],
      stage: null,
    }
  }
  // Markdown is laid over legacy scenes by `bake` in the content pack. Doing it
  // again here would overwrite a declarative scene's composed body with
  // whatever single block happens to share the scene's id.
  const rendered = drawing.rendered.scene()!
  // A hand-built scene's body may still ask pools for files; a data scene's has had them filled in.
  const body = resolvePoolMarkup(rendered.body ?? '', state, game, state.sceneId, 'body', featureContext(), drawing.picks)
  const beats = beatsOf(state, game, state.sceneId, body, rendered.media, drawing.picks)
  const choices: ScreenChoice[] = rendered.choices
    .filter((choice) => choice.visible !== false)
    .map((choice) => {
      const command = { type: 'choose', id: choice.id } as const
      return {
        id: choice.id,
        label: choice.label,
        price: priceOfEffects(state, game, choice.effects),
        // The choice's own reason first; then a lock or a plugin's guard, as the reducer will ask.
        disabled: choice.disabled ?? whyNotIn(drawing.rendered, state, game, command, choice.effects),
        tags: choice.tags,
        irreversible: choice.irreversible,
        warning: warningIn(drawing.rendered, state, game, command, choice.effects),
        command,
        effects: [...choice.effects],
      }
    })
  const speaker = speakerOf(rendered.speaker ?? scene.speaker, game, state)
  const frame = rendered.frame ?? scene.frame ?? (speaker ? 'talk' : 'stage')
  return {
    audio: rendered.audio,
    scene: {
      id: state.sceneId,
      title: rendered.title ?? scene.title ?? pluginStage(game, state)?.title ?? game.title,
      body,
      beats,
      frame,
      tags: rendered.tags ?? scene.tags ?? [],
      panel: rendered.panel ?? scene.panel ?? null,
      panelData: rendered.panelData ?? null,
      speaker,
      stageImage: rendered.portrait ?? speaker?.portrait ?? null,
    },
    choices,
    stage: drawStage(state, game, rendered.stage, state.sceneId, choices, drawing),
  }
}

/** Who is speaking: the id the scene names, as a plugin knows them. Never guessed from the scene's id. */
function speakerOf(id: string | undefined, game: Game, state: GameState): SpeakerView | null {
  return id ? (pluginSpeaker(game, state, id) ?? null) : null
}
