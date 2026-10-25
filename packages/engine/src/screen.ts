/**
 * One state as the player would see it: the open scene rendered once (or the
 * room, when none is open), its choices with what each would apply, the
 * stage, every plugin's view, and the pool picks and audio all of that implies.
 *
 * `view` is built from it, and the reducer records picks and audio from it, so
 * a scene is rendered once per screen rather than once per question asked
 * about it.
 */
import { amountOf } from './amount.ts'
import { stringOf } from './strings.ts'
import { pluginButtons, pluginCommand, pluginPrices, pluginStage, pluginsWatch, pluginViews } from './plugin.ts'
import { defaultRuntime, renderScene, type RenderedScene } from './scene.ts'
import { blockBeats } from './beats.ts'
import { lineSpeakers, speakerOf, type SpeakerView } from './speakers.ts'
import { effectsIn, rendering, warningIn, whyNotIn, type Rendering } from './availability.ts'
import { formatStat, statOf } from './features/stats.ts'
import { holds } from './condition.ts'
import { lockIn, lockedOut } from './locks.ts'
import { bakedScene, type ActionDef, type Blocked, type Game, type SceneMedia } from './game.ts'
import { actionOf } from './action.ts'
import { costEffects, runsAsAction } from './features/actions.ts'
import { artSrc, beatsOfParts, inlineMarkup, mediaType, parseBeats, videoView, type BodyPart, type InlineSpan, type SceneBeat } from './sceneBody.ts'
import {
  mediaMarkup,
  poolPick,
  resolveMedia,
  resolvePoolMarkup,
  type HotspotView,
  type MediaStage,
  type StageLayerView,
  type StageView,
} from './features/media.ts'
import { audioTracks, audioView, type AudioView } from './features/audio.ts'
import { minigameOf } from './features/minigames.ts'
import { withUi, type BlockUi, type ChoiceUi, type SceneUi, type Ui } from './features/ui.ts'
import { commandEntry, featureContext } from './core.ts'
import type { Command, Effect, GameState } from './types.ts'
import { commandOf, previewEffects } from './custom.ts'

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
  /** The choice's or button's presentation hints, as written; left out with none. See `ChoiceUi`. */
  ui?: Ui<ChoiceUi>
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
  /** What it would apply, as `effectsOf` says: a choice's effects, an action's cost and effects. */
  effects: Effect[]
}

/** The scene on a screen, or the room when none is open, without its choices and stage. */
export type ScreenScene = {
  /** The open scene's id, or null for the room. */
  id: string | null
  /**
   * Which screen this is: `scene:<id>` while a scene is open, `minigame:<id>`
   * while a minigame is played, `room:<stage id>` for a plugin's stage (a
   * place), and `room` with none. It changes when the screen does, and only then.
   */
  key: string
  title: string
  body: string
  beats: SceneBeat[]
  /**
   * The first of `beats` the flow's last step brought, from its `chose` on:
   * what a pick, a jump or a minigame or panel done with added, so a UI can
   * animate only that. 0 when the visit has taken no step, and for the room.
   */
  fresh: number
  /** The scene's tags, for the UI to style it by. */
  tags: string[]
  /** Who is speaking: the scene's `speaker`, as their entity is. Null with none, or one that names no entity. */
  speaker: SpeakerView | null
  /** The big picture to draw with the scene: the speaker's, else null. */
  image: string | null
  /** The scene's presentation hints (the room's stage's, when no scene is open), as written; left out with none. See `SceneUi`. */
  ui?: Ui<SceneUi>
}

/** One state's screen. See `screen`. */
export type Screen = {
  /** The open scene as rendered, or the room when none is open. A minigame being played is drawn over either: see `view.minigame`. */
  scene: ScreenScene
  /** The open scene's visible choices, each with its effects, availability and price. Empty for the room, and while a minigame is played. */
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

/**
 * What a screen or a view is drawn with besides the state. `profile` is what
 * the player's profile holds, by namespace: each plugin's view is handed its
 * own as `context.profile`. The runner passes it; without it, no view sees
 * the profile.
 */
export type ViewOptions = { profile?: Readonly<Record<string, unknown>> }

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
export function screen(state: GameState, game: Game, options: ViewOptions = {}): Screen {
  const picks: Record<string, string> = {}
  const drawing: Drawing = { rendered: rendering(state, game, picks), picks }
  const idle = !lockedOut(state, game) && !state.sceneId && !state.minigame
  const dialogue = renderDialogue(state, game, drawing)
  // The room's stage, a plugin's (a place), when no scene is open.
  const roomStage = dialogue ? undefined : pluginStage(game, state)
  const room = dialogue ? null : standing(state, game, roomStage, drawing)
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
    stage: playing ? null : (dialogue?.stage ?? null),
    plugins,
    picks,
    audio: { ...audioView(state, game, tracks, beats, cx), tracks },
  }
}

/** The room itself, when no scene is playing over it. */
function standing(state: GameState, game: Game, stage: ReturnType<typeof pluginStage>, drawing: Drawing): ScreenScene {
  // A plugin's stage; with none, there is nothing to read but the buttons.
  const rendered = stage?.body ? renderScene({ id: stage.id, body: [...stage.body], choices: [] }, state, defaultRuntime(game), drawing.picks) : undefined
  const body = rendered?.body ?? ''
  return {
    id: null,
    key: stage ? `room:${stage.id}` : 'room',
    title: stage?.title ?? game.title,
    body,
    beats: beatsOf(state, game, stage?.id ?? '', rendered ?? { parts: [] }, rendered?.media, drawing.picks).beats,
    fresh: 0,
    tags: [],
    speaker: null,
    image: null,
    ...withUi(stage?.ui),
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
    title: def.label ?? under.title,
    body: beats.flatMap((beat) => ('text' in beat ? [beat.text] : [])).join('\n\n'),
    beats,
    fresh: 0,
  }
}

/**
 * A body's beats, with media that opens or closes it around them. Media with no
 * `at` in a hand-built scene's list goes at the end, as it always has; a data
 * scene's `{ media }` blocks are already in the body, in place. `body` is a
 * data scene's parts, or a hand-built scene's text with where its hinted
 * blocks start.
 */
function beatsOf(
  state: GameState,
  game: Game,
  owner: string,
  body: { parts: readonly BodyPart[]; fresh?: number } | { text: string; hints?: readonly { at: number; ui: Ui<BlockUi> }[] },
  media: readonly SceneMedia[] | undefined,
  picks: Record<string, string>,
): { beats: SceneBeat[]; fresh: number } {
  const placed = (media ?? []).flatMap((item, index) => {
    const shown = resolveMedia(item, state, game, owner, `media.${index}`, featureContext(), picks)
    return shown ? [{ at: shown.at ?? 'end', beats: parseBeats(mediaMarkup(shown)) }] : []
  })
  const find = lineSpeakers(state, game)
  const lead = placed.filter((item) => item.at === 'lead').flatMap((item) => item.beats)
  const made = 'parts' in body ? beatsOfParts(body.parts, find) : { beats: parseBeats(body.text, body.hints, find), starts: [] }
  // Where the part the flow's last step brought first starts among the beats, after the lead media.
  const from = 'parts' in body && body.fresh ? (made.starts[body.fresh] ?? made.beats.length) : 0
  return {
    beats: [...lead, ...made.beats, ...placed.filter((item) => item.at !== 'lead').flatMap((item) => item.beats)],
    fresh: from ? lead.length + from : 0,
  }
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
    if (!holds(state, game, layer.when)) return
    const src =
      layer.pool !== undefined
        ? poolPick(state, game, { pool: layer.pool, tags: layer.tags, owner, slot: `stage:${index}` }, featureContext(), drawing.picks)
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
  for (const hotspot of stage.hotspots ?? []) {
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
  return { aspect: stage.aspect ?? null, layers, hotspots }
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
 * The buttons offered while no scene is open: plugins' first, then the
 * game's. One a hiding lock stops is left off the screen.
 */
function idleActions(state: GameState, game: Game, drawing: Drawing): ScreenChoice[] {
  // The game's own actions with a label are its buttons; one with none is done only by a command.
  const own = (game.actions ?? []).filter((action) => action.label !== undefined).map((action) => asAction(state, game, action))
  return [...pluginButtons(game, state).map(({ action, owner }) => asAction(state, game, action, owner)), ...own]
    .filter((action) => holds(state, game, action.when) && !hidden(state, game, action, drawing.rendered))
    .map((action) => {
      const effects = effectsIn(drawing.rendered, state, game, action.command)
      return { ...actionButton(state, game, action, drawing.rendered, effects), effects }
    })
}

/**
 * An action as a button: its label, its price, and why it is greyed out, if it
 * is. Availability comes from `whyNot`, so the button and the reducer always
 * agree. What a room's buttons are made with, for plugins that show actions
 * somewhere else, such as an app on a device. `owner` is the plugin whose
 * action it is, so one with a cost or effects is done as `'<owner>/<id>'`
 * (see `Plugin.action`); left out, it is one of the game's.
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
    disabled: action.blocked?.find((entry) => holds(state, game, entry.when))?.reason ?? whyNotIn(rendered, state, game, action.command, effects),
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
  const out: Price = {}
  const spent = Object.entries(cost.stats ?? {})
    .filter(([, amount]) => amount > 0)
    .map(([id, amount]) => ({ id, amount, text: formatStat(statOf(game, id), amount) }))
  if (spent.length) out.stats = spent
  const notes = effects.length ? pluginPrices(game, state, effects) : []
  if (notes.length) out.notes = notes
  return Object.keys(out).length ? out : undefined
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
  stage: StageView | null
  audio?: Record<string, string | null>
}

/** The open scene as the screen draws it, and what it puts on the audio channels. */
function renderDialogue(state: GameState, game: Game, drawing: Drawing): Dialogue | null {
  if (!state.sceneId) return null
  const scene = bakedScene(game, state.sceneId)
  if (!scene) {
    return {
      scene: {
        id: state.sceneId,
        key: `scene:${state.sceneId}`,
        title: pluginStage(game, state)?.title ?? game.title,
        body: stringOf(game, 'momentPassed'),
        beats: parseBeats(stringOf(game, 'momentPassed')),
        fresh: 0,
        tags: [],
        speaker: null,
        image: null,
      },
      choices: [{ id: 'leave', label: stringOf(game, 'lookAround'), command: { type: 'leave' }, effects: [] }],
      stage: null,
    }
  }
  // Markdown is laid over legacy scenes by `bake` in the content pack. Doing it
  // again here would overwrite a declarative scene's composed body with
  // whatever single block happens to share the scene's id.
  const rendered = drawing.rendered.scene()!
  const { parts, fresh } = rendered as Partial<RenderedScene>
  // A hand-built scene's body may still ask pools for files; a data scene's has had them filled in.
  const body = parts ? (rendered.body ?? '') : resolvePoolMarkup(rendered.body ?? '', state, game, state.sceneId, 'body', featureContext(), drawing.picks)
  // A block's hints say where it starts in the body; a hand-built body whose pools were just filled has none.
  const drawn = beatsOf(
    state,
    game,
    state.sceneId,
    parts ? { parts, fresh } : { text: body, hints: body === rendered.body ? rendered.blockUi : undefined },
    rendered.media,
    drawing.picks,
  )
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
  // Choices the prose holds inline are drawn there, and leave the list. A stage's hotspot may still name one.
  // A choice picked earlier in the visit is named by its words, as the flow showed it.
  const labels = new Map([
    ...Object.entries((rendered as Partial<RenderedScene>).picked ?? {}),
    ...rendered.choices.map((choice) => [choice.id, choice.label] as const),
  ])
  const inline = inlineBeats(beats, choices, (id) => labels.get(id), state, game)
  const named = rendered.speaker ?? scene.speaker
  const speaker = named ? speakerOf(state, game, named) : null
  return {
    audio: rendered.audio,
    scene: {
      id: state.sceneId,
      key: `scene:${state.sceneId}`,
      title: rendered.title ?? scene.title ?? pluginStage(game, state)?.title ?? game.title,
      body,
      beats: inline.beats,
      fresh: drawn.fresh,
      tags: rendered.tags ?? scene.tags ?? [],
      speaker,
      image: rendered.image ?? speaker?.image ?? null,
      ...withUi(scene.ui),
    },
    choices: inline.offered,
    stage: drawStage(state, game, rendered.stage, state.sceneId, choices, drawing),
  }
}

/** A screen's choice as the view shows it: without its effects. */
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

/** The choices and buttons a scene's or a room's prose holds inline, in the order they come. */
export function inlineChoices(beats: readonly SceneBeat[]): RenderedChoice[] {
  return beats.flatMap((beat) => ('spans' in beat && beat.spans ? beat.spans.flatMap((span) => (span.type === 'action' ? [span.choice] : [])) : []))
}

/**
 * Beats as the backlog keeps them: an inline action is history there, so it
 * becomes its words and nothing can press it. Tooltips, UI pieces, bold and italics stay.
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
