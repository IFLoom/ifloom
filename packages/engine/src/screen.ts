/**
 * One state as the player would see it: the open scene rendered once (or the
 * room, when none is open), its choices with what each would apply, the
 * picture, every plugin's view, and the pool picks and audio all of that implies.
 *
 * `view` is built from it, and the reducer records picks and audio from it, so
 * a scene is rendered once per screen rather than once per question asked
 * about it.
 */
import { amountOf } from './amount.ts'
import { reasonOf, stringOf } from './strings.ts'
import { pluginActions, pluginCommand, pluginPrices, pluginScene, pluginsWatch, pluginViews } from './plugin.ts'
import { defaultRuntime, renderScene } from './scene.ts'
import { blockBeats } from './beats.ts'
import { lineSpeakers, speakerOf, type SpeakerView } from './speakers.ts'
import { effectsIn, rendering, warningIn, whyNotIn, type Rendering } from './availability.ts'
import { formatStat, statOf } from './features/stats.ts'
import { holds } from './condition.ts'
import { lockIn, lockedOut } from './locks.ts'
import { sceneOf, type ActionDef, type Blocked, type Game, type SceneMedia } from './game.ts'
import { actionOf } from './action.ts'
import { costEffects, runsAsAction } from './features/actions.ts'
import { artSrc, beatsOfParts, inlineMarkup, mediaType, parseBeats, videoView, type BodyPart, type InlineSpan, type SceneBeat } from './sceneBody.ts'
import { mediaMarkup, poolPick, resolveMedia, type HotspotView, type PictureDef, type PictureLayerView, type PictureView } from './features/media.ts'
import { audioTracks, audioView, type AudioView } from './features/audio.ts'
import { minigameOf } from './features/minigames.ts'
import { withUi, type ChoiceUi, type SceneUi, type Ui } from './features/ui.ts'
import { commandEntry, featureContext } from './core.ts'
import type { Command, Effect, GameState } from './types.ts'
import type { OpenPanel } from './features/panels.ts'
import { commandOf, previewEffects } from './custom.ts'

/**
 * The cost of a choice or action, shown on its button before the player presses it. It lists costs only, since a payout
 * printed on a choice tells the player which one is right.
 */
export type Price = {
  /** The stats the price spends, in the order the button lists them, each with its amount and its words in `text`. */
  stats?: { id: string; amount: number; text: string }[]
  /** The plugins' words for what else it costs, such as "until evening". */
  notes?: string[]
  /**
   * The whole price as one line for the player, such as `2 coins · until evening`. It joins each stat's `text`, then the
   * notes, with the `priceSeparator` string.
   */
  text: string
}

/**
 * A choice or action ready to render as a button, in `view.scene.choices`, `view.actions` or a plugin's view. A UI sends
 * its `command` when the player presses it.
 */
export type RenderedChoice = {
  /** The choice's or action's id. */
  id: string
  /** The button's label, with tokens filled. */
  label: string
  /** The button's price for this state, with its words in `text`. Left out when it's free. */
  price?: Price
  /** The reason the player can't press the button now, in the player's words. Left out when they can. */
  disabled?: string
  /** The choice's or action's tags, for a UI to style or filter it by. */
  tags?: string[]
  /** The warning that the choice or action can't be undone, for a UI to show on its button. */
  irreversible?: string
  /** The choice's or action's `ui` hints, unchanged from content. Left out with none, and typed by `ChoiceUi`. */
  ui?: Ui<ChoiceUi>
  /**
   * The reason a plugin's guard gives for refusing the button softly, such as running past dawn. The player can press
   * it, but the reducer refuses it, so a UI shows the warning instead.
   */
  warning?: string
  /** The command a UI sends when the player presses the button, as `runner.apply(choice.command)`. */
  command: Command
}

/** A choice or action on a {@link Screen}, with the effects pressing its button would apply. The view leaves the effects out. */
export type ScreenChoice = RenderedChoice & {
  /** The effects pressing the button would apply, such as a choice's effects or an action's cost and effects. */
  effects: Effect[]
}

/** The scene on a {@link Screen}, or the room when none is open, without its choices and picture. */
export type ScreenScene = {
  /** The open scene's id, or null for the room. */
  id: string | null
  /**
   * The screen's key, which changes when the screen does and only then.
   *
   * It is `scene:<id>` while a scene is open, `minigame:<id>` while a minigame is played, `room:<id>` for a plugin's
   * room scene and `room` without one.
   */
  key: string
  /** The screen's title, the scene's or the room's. */
  title: string
  /** The body as markup text. A UI renders `beats`, which are this text parsed. */
  body: string
  /** The body parsed into beats, such as paragraphs, speech, pictures and past choices, ready to render. */
  beats: SceneBeat[]
  /**
   * The index of the first beat the flow's last step added, from its `chose` beat on, so a UI can animate only those.
   * It's 0 for the room and before the visit's first step.
   */
  fresh: number
  /** The scene's tags, for a UI to style it by. */
  tags: string[]
  /** The scene's `speaker`, read from their entity. Null without one, or when it names no entity. */
  speaker: SpeakerView | null
  /** The speaker's picture to show with the scene, or null without one. */
  image: string | null
  /** The scene's `ui` hints, or the room scene's when no scene is open, unchanged from content. Left out with none, and typed by `SceneUi`. */
  ui?: Ui<SceneUi>
}

/** One state rendered once by `screen`, with what each choice would apply, the pool picks and the audio tracks. */
export type Screen = {
  /**
   * The open scene as rendered, or the room when none is open. While a minigame is played, the minigame's key, title
   * and words replace theirs, without their `ui`.
   *
   * `view.minigame` holds the running minigame's state.
   */
  scene: ScreenScene
  /** The open scene's visible choices, each with its effects, availability and price. It is empty for the room and while a minigame is played. */
  choices: ScreenChoice[]
  /**
   * The room's actions while no scene is open and no lock stops everything. The `actions` providers' come first (the
   * game's rules', then each plugin's), then the game's own `actions`.
   */
  actions: ScreenChoice[]
  /** The open scene's layered picture and its hotspots, or null. */
  picture: PictureView | null
  /** The plugins' views, by plugin id. */
  plugins: Record<string, unknown>
  /** The pool picks this screen made that the save doesn't hold yet, by pick key. The reducer records them. */
  picks: Record<string, string>
  /**
   * The audio that should be playing, as in `view.audio`, with `tracks` added. `tracks` gives the track each background
   * channel resolved to (null for silence), and the reducer records them as started.
   */
  audio: AudioView & { tracks: Record<string, string | null> }
}

/**
 * Settings for `screen` and `view` besides the state. Without `profile`, no plugin's view reads the profile.
 */
export type ViewOptions = {
  /** The player's profile, by namespace. Each plugin's view reads its own namespace as `context.profile`, and the runner passes this. */
  profile?: Readonly<Record<string, unknown>>
}

/** The words of the first of these that holds, or undefined. */
function blockedReason(state: GameState, game: Game, blocked: readonly Blocked[] | undefined): string | undefined {
  const entry = blocked?.find((one) => holds(state, game, one.when))
  return entry ? reasonOf(game, entry.reason) : undefined
}

/** What one screen shares while it is drawn: the open scene, rendered once, and the picks made. */
type Drawing = { rendered: Rendering; picks: Record<string, string> }

/**
 * Returns the {@link Screen} for a state, the open scene or the room rendered once. Use it when you need what `view`
 * leaves out, such as each choice's effects.
 *
 * The screen holds the choices, actions, picture, plugins' views, pool picks and audio of that one render.
 *
 * Every choice's availability and effects come from that one render of the scene. `view` formats a screen for a UI.
 */
export function screen(state: GameState, game: Game, options: ViewOptions = {}): Screen {
  const picks: Record<string, string> = {}
  const drawing: Drawing = { rendered: rendering(state, game, picks), picks }
  const idle = !lockedOut(state, game) && !state.sceneId && !state.minigame
  const dialogue = renderDialogue(state, game, drawing)
  // The room's scene, a plugin's (a place), when no scene is open.
  const roomScene = dialogue ? undefined : pluginScene(game, state)
  const room = dialogue ? null : standing(state, game, roomScene, drawing)
  const offered = idle ? idleActions(state, game, drawing) : []
  // A room's prose can hold its buttons inline, as a scene's holds its choices: those leave the list.
  const inRoom = room ? inlineBeats(room.beats, offered, () => undefined, state, game) : null
  const actions = inRoom ? inRoom.offered : offered
  if (room && inRoom) room.beats = inRoom.beats
  // A minigame being played is shown over the scene or the room, with no choices or buttons of theirs.
  const playing = playingScene(state, game, dialogue?.scene ?? room!, drawing)
  const plugins = pluginViews(state, game, picks, options.profile)
  const cx = featureContext()
  const tracks = audioTracks(state, game, dialogue?.audio, cx)
  const beats = dialogue ? dialogue.scene.beats : null
  return {
    scene: playing ?? dialogue?.scene ?? room!,
    choices: playing ? [] : (dialogue?.choices ?? []),
    actions,
    picture: playing ? null : (dialogue?.picture ?? null),
    plugins,
    picks,
    audio: { ...audioView(state, game, tracks, beats, cx), tracks },
  }
}

/** The room itself, when no scene is playing over it. */
function standing(state: GameState, game: Game, scene: ReturnType<typeof pluginScene>, drawing: Drawing): ScreenScene {
  // A plugin's room scene; with none, there is nothing to read but the buttons.
  const rendered = scene?.body ? renderScene({ id: scene.id, body: [...scene.body], choices: [] }, state, defaultRuntime(game), drawing.picks) : undefined
  const body = rendered?.body ?? ''
  return {
    id: null,
    key: scene ? `room:${scene.id}` : 'room',
    title: scene?.title ?? game.title,
    body,
    beats: beatsOf(state, game, scene?.id ?? '', rendered ?? { parts: [] }, rendered?.media, drawing.picks).beats,
    fresh: 0,
    tags: [],
    speaker: null,
    image: null,
    ...withUi(scene?.ui),
  }
}

/**
 * The minigame being played, drawn over `under` (the open scene or the room):
 * its label as the title, and the running state's words as the body. Null
 * with none running.
 */
function playingScene(state: GameState, game: Game, under: ScreenScene, drawing: Drawing): ScreenScene | null {
  const running = state.minigame
  const def = running ? minigameOf(game, running.id) : undefined
  if (!running || !def) return null
  const owner = `minigame.${def.id}`
  const label = def.states[running.state]?.label
  const beats = label !== undefined ? blockBeats(state, game, [{ text: label }], owner, drawing.picks) : []
  const { ui: _under, ...rest } = under
  return {
    ...rest,
    key: `minigame:${def.id}`,
    title: def.title ?? under.title,
    body: beats.flatMap((beat) => ('text' in beat ? [beat.text] : [])).join('\n\n'),
    beats,
    fresh: 0,
  }
}

/**
 * A body's beats, from its parts, with the media that opens (`lead`) or closes
 * (`end`) it around them. A `{ media }` block with no `at` is already among
 * the parts, in place.
 */
function beatsOf(
  state: GameState,
  game: Game,
  owner: string,
  body: { parts: readonly BodyPart[]; fresh?: number },
  media: readonly SceneMedia[] | undefined,
  picks: Record<string, string>,
): { beats: SceneBeat[]; fresh: number } {
  const placed = (media ?? []).flatMap((item, index) => {
    const shown = resolveMedia(item, state, game, owner, `media.${index}`, featureContext(), picks)
    return shown ? [{ at: shown.at ?? 'end', beats: parseBeats(mediaMarkup(shown)) }] : []
  })
  const find = lineSpeakers(state, game)
  const lead = placed.filter((item) => item.at === 'lead').flatMap((item) => item.beats)
  const made = beatsOfParts(body.parts, find)
  // Where the part the flow's last step brought first starts among the beats, after the lead media.
  const from = body.fresh ? (made.starts[body.fresh] ?? made.beats.length) : 0
  return {
    beats: [...lead, ...made.beats, ...placed.filter((item) => item.at !== 'lead').flatMap((item) => item.beats)],
    fresh: from ? lead.length + from : 0,
  }
}

/**
 * Returns the panel open over the story, as in `view.panel`. It is the one the `panel` effect opened, else the open
 * scene's own, else null.
 *
 * A plugin's view uses it to show what its own panel holds, filtered by the panel's `with`, as the jobs plugin lists the
 * jobs on the open board.
 */
export function panelOf(state: GameState, game: Game): OpenPanel | null {
  if (state.panel) return state.panel
  const held = state.sceneId ? sceneOf(game, state.sceneId)?.panel : undefined
  return held ? { panel: held.panel, with: { ...held.with }, scene: state.sceneId! } : null
}

/**
 * Returns the {@link PictureView} of a picture, with its layers whose `when` holds and their hotspots, or null without
 * a picture. A plugin calls it to render a picture of its own.
 *
 * Each layer's file can be a pool's pick, kept per owner and layer as `picture:<index>`. A hotspot tied to a layer that
 * isn't shown is left out. A `choice` hotspot takes that choice's command and availability from `choices`, the scene's
 * rendered choices, and is left out when the choice is not on offer. A `command` hotspot is rendered as any action is.
 * A plugin's `view` passes its context's `picks`, so the reducer records the layers' picks.
 */
export function pictureView(
  state: GameState,
  game: Game,
  picture: PictureDef | undefined,
  owner: string,
  choices: readonly RenderedChoice[] | null = null,
  picks?: Record<string, string>,
): PictureView | null {
  return drawPicture(state, game, picture, owner, choices, { rendered: rendering(state, game, picks), picks: picks ?? {} })
}

function drawPicture(
  state: GameState,
  game: Game,
  picture: PictureDef | undefined,
  owner: string,
  choices: readonly RenderedChoice[] | null,
  drawing: Drawing,
): PictureView | null {
  if (!picture) return null
  const layers: PictureLayerView[] = []
  picture.layers.forEach((layer, index) => {
    if (!holds(state, game, layer.when)) return
    const src =
      layer.pool !== undefined
        ? poolPick(state, game, { pool: layer.pool, tags: layer.tags, owner, slot: `picture:${index}` }, featureContext(), drawing.picks)
        : (layer.src ?? null)
    if (!src) return
    const video = Boolean(layer.video) || mediaType(src) === 'video'
    layers.push({
      id: layer.id ?? null,
      src: artSrc(src, video ? 'video' : 'image'),
      ...(video ? { video: videoView(layer) } : {}),
    })
  })
  const shown = new Set(layers.map((layer) => layer.id))
  const hotspots: HotspotView[] = []
  for (const hotspot of picture.hotspots ?? []) {
    if (!holds(state, game, hotspot.when)) continue
    if (hotspot.layer !== undefined && !shown.has(hotspot.layer)) continue
    let button: Pick<RenderedChoice, 'command' | 'disabled' | 'warning'> | undefined
    if (hotspot.choice !== undefined) button = choices?.find((choice) => choice.id === hotspot.choice)
    else if (hotspot.command) {
      const action = { id: hotspot.id, label: hotspot.label, command: commandOf(hotspot.command) }
      if (!hidden(state, game, action, drawing.rendered)) button = actionButton(state, game, action, drawing.rendered)
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
  return { aspect: picture.aspect ?? null, layers, hotspots }
}

/**
 * Is this button left off the screen? By its own `blocked` entry that hides,
 * by the action's its command does, or by a lock that hides (never on one that ignores locks).
 */
function hidden(state: GameState, game: Game, action: Action, rendered: Rendering): boolean {
  const hides = (entries: readonly Blocked[] | undefined) => Boolean(entries?.some((entry) => entry.hide && holds(state, game, entry.when)))
  const command = action.command
  if (hides(action.blocked)) return true
  if (command.type === 'action' && hides(actionOf(state, game, command.id)?.blocked)) return true
  if (command.type === 'custom' && pluginCommand(game, command.name)?.ignoresLocks) return false
  return Boolean(lockIn(state, game, command, () => effectsIn(rendered, state, game, command))?.hide)
}

/**
 * The buttons offered while no scene is open: those the `actions` providers
 * give, the game's rules' first (the engine runs them as the first plugin) and
 * then each plugin's in order, then the game's own `actions` from content.
 * One a hiding lock stops is left off the screen.
 */
function idleActions(state: GameState, game: Game, drawing: Drawing): ScreenChoice[] {
  // The game's own actions with a label are its buttons; one with none is done only by a command.
  const own = (game.actions ?? []).filter((action) => action.label !== undefined).map((action) => asAction(state, game, action))
  return [...pluginActions(game, state).map(({ action, owner }) => asAction(state, game, action, owner)), ...own]
    .filter((action) => holds(state, game, action.when) && !hidden(state, game, action, drawing.rendered))
    .map((action) => {
      const effects = effectsIn(drawing.rendered, state, game, action.command)
      return { ...actionButton(state, game, action, drawing.rendered, effects), effects }
    })
}

/**
 * Returns an action as a {@link RenderedChoice}, with its label, its price and the reason it's refused now, if any. A
 * plugin calls it to offer actions outside the room, such as in a device's app.
 *
 * Availability comes from `whyNot`, so the button and the reducer always agree. `owner` is the id of the plugin whose
 * action it is, so one with a cost or effects runs as `'<owner>/<id>'` (see `Plugin.action`). Left out, the action is the
 * game's.
 */
export function renderAction(state: GameState, game: Game, action: ActionDef, owner?: string): RenderedChoice {
  return actionButton(state, game, asAction(state, game, action, owner), rendering(state, game))
}

/** An action as a button sends it, as the view shows it: its command in the long form, and its words. */
type Action = Omit<ActionDef, 'command' | 'label'> & { label: string; command: Command }

/**
 * An action as its button: one with a cost, effects or `once` sends
 * `{ type: 'action', id }` (a plugin's as `'<owner>/<id>'`), one with only a
 * command sends that, read into the long form.
 */
const asAction = (state: GameState, game: Game, action: ActionDef, owner?: string): Action => ({
  ...action,
  label: buttonWords(state, game, action) ?? action.id,
  command: runsAsAction(action) ? { type: 'action', id: owner ? `${owner}/${action.id}` : action.id } : commandOf(action.command!),
})

/**
 * A button's words as its `labels` and `label` give them: the first label
 * whose `when` holds, else `label`, as written with tokens filled. Undefined with neither.
 */
function buttonWords(state: GameState, game: Game, button: Pick<ActionDef, 'label' | 'labels'>): string | undefined {
  const label = button.labels?.find((entry) => holds(state, game, entry.when))?.label ?? button.label
  return label === undefined ? undefined : featureContext().fillTokens(state, game, label)
}

/** `renderAction`, asking `rendered` for the open scene. `effects`, when the caller has worked them out. */
function actionButton(state: GameState, game: Game, action: Action, rendered: Rendering, known?: readonly Effect[]): RenderedChoice {
  // Worked out here only when a plugin will look at them; a lock asks for them itself.
  const watched = pluginsWatch(game)
  const effects = known ?? (watched ? effectsIn(rendered, state, game, action.command) : undefined)
  const choice: RenderedChoice = {
    id: action.id,
    label: action.label,
    price: priced(state, game, { stats: commandEntry(action.command)?.spends?.(action.command, game, state, featureContext()) }, watched ? effects : []),
    disabled: blockedReason(state, game, action.blocked) ?? whyNotIn(rendered, state, game, action.command, effects),
    ...(action.tags ? { tags: action.tags } : {}),
    ...(action.irreversible !== undefined ? { irreversible: action.irreversible } : {}),
    command: action.command,
    ...withUi(action.ui),
  }
  const warning = warningIn(rendered, state, game, action.command, effects)
  if (warning) choice.warning = warning
  return choice
}

function priced(state: GameState, game: Game, cost: { stats?: Record<string, number> }, effects: readonly Effect[] = []): Price | undefined {
  return priceView(game, cost.stats ?? {}, effects.length ? pluginPrices(game, state, effects) : []) ?? undefined
}

/**
 * Returns the {@link Price} of some stats and notes, or null when it costs nothing. A plugin's view calls it for a
 * price of its own, such as a vendor's full price.
 *
 * It lists each stat spent above 0 in the order given, worded as the stat's value is, then the `notes`, and joins them
 * into one line in `text`.
 */
export function priceView(game: Game, stats: Readonly<Record<string, number>>, notes: readonly string[] = []): Price | null {
  const spent = Object.entries(stats)
    .filter(([, amount]) => amount > 0)
    .map(([id, amount]) => ({ id, amount, text: formatStat(statOf(game, id), amount) }))
  if (!spent.length && !notes.length) return null
  const text = [...spent.map((stat) => stat.text), ...notes].join(stringOf(game, 'priceSeparator'))
  return { ...(spent.length ? { stats: spent } : {}), ...(notes.length ? { notes: [...notes] } : {}), text }
}

/**
 * A scene choice spends through its effects: any spendable
 * stat down, by the amount it reads now. Listed in the order the game declared its stats.
 */
function priceOfEffects(state: GameState, game: Game, effects: readonly Effect[], spends: Record<string, number> = {}): Price | undefined {
  const spent: Record<string, number> = { ...spends }
  for (const effect of effects) {
    if (!('stat' in effect && 'by' in effect && effect.of === undefined && statOf(game, effect.stat)?.spendable)) continue
    const by = amountOf(state, game, effect.by)
    if (by < 0) spent[effect.stat] = (spent[effect.stat] ?? 0) - by
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
  picture: PictureView | null
  audio?: Record<string, string | null>
}

/** The open scene as the screen draws it, and what it puts on the audio channels. */
function renderDialogue(state: GameState, game: Game, drawing: Drawing): Dialogue | null {
  if (!state.sceneId) return null
  const scene = sceneOf(game, state.sceneId)
  if (!scene) {
    return {
      scene: {
        id: state.sceneId,
        key: `scene:${state.sceneId}`,
        title: pluginScene(game, state)?.title ?? game.title,
        body: stringOf(game, 'momentPassed'),
        beats: parseBeats(stringOf(game, 'momentPassed')),
        fresh: 0,
        tags: [],
        speaker: null,
        image: null,
      },
      choices: [{ id: 'leave', label: stringOf(game, 'lookAround'), command: { type: 'leave' }, effects: [] }],
      picture: null,
    }
  }
  const rendered = drawing.rendered.scene()!
  const body = rendered.body
  const drawn = beatsOf(state, game, state.sceneId, rendered, rendered.media, drawing.picks)
  const beats = drawn.beats
  const choices: ScreenChoice[] = rendered.choices
    .filter((choice) => choice.visible !== false)
    .map((choice) => {
      const command = { type: 'choose', id: choice.id } as const
      // A choice that also sends a command applies what that command would, after its own effects' price.
      // The game's own custom effects among them are worked out against this state, for the price and the guards.
      const sends = choice.command && commandOf(choice.command)
      const paid = [...previewEffects(state, game, choice.effects), ...(sends ? effectsIn(drawing.rendered, state, game, sends) : [])]
      // What its cost spends is priced as an action's is, and seen by the guards as the stat effects it applies.
      const effects = [...costEffects(choice.cost), ...paid]
      const spends = { ...(sends ? commandEntry(sends)?.spends?.(sends, game, state, featureContext()) : undefined) }
      for (const [stat, amount] of Object.entries(choice.cost?.stats ?? {})) spends[stat] = (spends[stat] ?? 0) + amount
      return {
        id: choice.id,
        label: choice.label,
        price: priceOfEffects(state, game, paid, spends),
        // The choice's own reason first; then a lock or a plugin's guard, as the reducer will ask.
        disabled: choice.disabled ?? whyNotIn(drawing.rendered, state, game, command, effects),
        tags: choice.tags,
        irreversible: choice.irreversible,
        warning: warningIn(drawing.rendered, state, game, command, effects),
        command,
        ...withUi(choice.ui),
        effects,
      }
    })
  // Choices the prose holds inline are drawn there, and leave the list. A picture's hotspot may still name one.
  // A choice picked earlier in the visit is named by its words, as the flow showed it.
  const labels = new Map([...Object.entries(rendered.picked), ...rendered.choices.map((choice) => [choice.id, choice.label] as const)])
  const inline = inlineBeats(beats, choices, (id) => labels.get(id), state, game)
  const named = scene.speaker
  const speaker = named ? speakerOf(state, game, named) : null
  return {
    audio: rendered.audio,
    scene: {
      id: state.sceneId,
      key: `scene:${state.sceneId}`,
      title: scene.title ?? pluginScene(game, state)?.title ?? game.title,
      body,
      beats: inline.beats,
      fresh: drawn.fresh,
      tags: scene.tags ?? [],
      speaker,
      image: speaker?.image ?? null,
      ...withUi(scene.ui),
    },
    choices: inline.offered,
    picture: drawPicture(state, game, rendered.picture, state.sceneId, choices, drawing),
  }
}

/** Returns a screen's choice as the view shows it, without its effects. */
export function renderedChoice({ effects: _effects, ...choice }: ScreenChoice): RenderedChoice {
  return choice
}

/**
 * Beats with their inline markup drawn. Each inline action is given the choice
 * or button of `offered` it names, which then leaves `offered`, so it is drawn
 * in the prose and not in the list as well. One `offered` doesn't have (left
 * off, or not there) is shown as its words, as is a second mention of one
 * already drawn. Each tooltip gets its prose line, filled in for this save; one
 * with no line is shown as its words. A UI piece (`[[ui:…]]`) is carried as
 * written. Bold and italics become their spans, and
 * `text` keeps the words alone. `label` gives the words of a choice that isn't
 * offered, for markup that doesn't give its own.
 */
function inlineBeats(
  beats: SceneBeat[],
  offered: ScreenChoice[],
  label: (id: string) => string | undefined,
  state: GameState,
  game: Game,
): { beats: SceneBeat[]; offered: ScreenChoice[] } {
  const used = new Set<string>()
  const drawn = beats.map((beat): SceneBeat => {
    if (beat.type !== 'text' && beat.type !== 'say') return beat
    const parts = inlineMarkup(beat.text)
    if (!parts) return beat
    const spans: InlineSpan[] = []
    const words = (text: string) => {
      const prev = spans.at(-1)
      if (prev?.type === 'text') prev.text += text
      else spans.push({ type: 'text', text })
    }
    for (const part of parts) {
      if (part.type === 'text') words(part.text)
      else if (part.type === 'bold' || part.type === 'italic') spans.push({ type: part.type, text: part.text })
      else if (part.type === 'ui') spans.push({ type: 'ui', name: part.name, text: part.text, args: part.args })
      else if (part.type === 'tip') {
        const tip = game.prose?.line(part.key, state)
        if (tip === undefined) words(part.text)
        else spans.push({ type: 'tip', text: part.text, tip })
      } else {
        const choice = used.has(part.id) ? undefined : offered.find((entry) => entry.id === part.id)
        if (!choice) {
          words(part.text ?? label(part.id) ?? offered.find((entry) => entry.id === part.id)?.label ?? part.markup)
          continue
        }
        used.add(part.id)
        spans.push({ type: 'action', text: part.text ?? choice.label, choice: renderedChoice(choice) })
      }
    }
    const text = spans.map((span) => span.text).join('')
    return spans.some((span) => span.type !== 'text') ? { ...beat, text, spans } : { ...beat, text }
  })
  return { beats: drawn, offered: used.size ? offered.filter((choice) => !used.has(choice.id)) : offered }
}

/** Returns the choices and actions that a scene's or a room's beats hold inline, in the order they come. */
export function inlineChoices(beats: readonly SceneBeat[]): RenderedChoice[] {
  return beats.flatMap((beat) => ('spans' in beat && beat.spans ? beat.spans.flatMap((span) => (span.type === 'action' ? [span.choice] : [])) : []))
}

/**
 * Returns beats as the backlog keeps them, with each inline action turned into its words so nothing can press it.
 * Tooltips, UI pieces, bold and italics stay.
 */
export function pastBeats(beats: readonly SceneBeat[]): SceneBeat[] {
  return beats.map((beat) => {
    if (!('spans' in beat) || !beat.spans?.some((span) => span.type === 'action')) return beat
    const spans: InlineSpan[] = []
    for (const span of beat.spans) {
      const prev = spans.at(-1)
      if (span.type !== 'text' && span.type !== 'action') spans.push(span)
      else if (prev?.type === 'text') prev.text += span.text
      else spans.push({ type: 'text', text: span.text })
    }
    if (spans.every((span) => span.type === 'text')) {
      const { spans: _spans, ...rest } = beat
      return rest
    }
    return { ...beat, spans }
  })
}
