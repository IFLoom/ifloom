import { say } from './strings.ts'
import { pluginButtons, pluginCommand, pluginSpeaker, type SpeakerView, pluginLabel, pluginPrices, pluginStage, pluginsWatch, pluginViews } from './plugin.ts'
import type { InputDef } from './inputs.ts'
import { defaultRuntime, renderScene } from './scene.ts'
import { effectsOf, warningOf, whyNot } from './availability.ts'
import { formatStat, statDef, statMax, type StatDef } from './stats.ts'
import { holds } from './condition.ts'
import { lockOn, lockedOut } from './locks.ts'
import { sceneById, type Game, type ActionDef } from './game.ts'
import { activityById } from './activity.ts'
import { settingAffects } from './settings.ts'
import {
  artSrc,
  parseBeats,
  type SceneBeat,
} from './sceneBody.ts'
import { sceneContext } from './context.ts'
import type { FlagValue, Command, Effect, GameState, StatKey, Stats } from './types.ts'
import { bindCurrent, entitiesOf, entityOf, parseRef } from './entities.ts'

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

/** A stat as the UI shows it: its value, its ceiling, and the value written out. */
export type StatView = {
  key: StatKey
  label: string
  value: number
  max: number
  text: string
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

export type View = {
  title: string
  phase: GameState['phase']
  /** How many turns have passed: 0 on the first. */
  turn: number
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
    choices: RenderedChoice[]
  }
  actions: RenderedChoice[]
  stats: StatView[]
  /** Every declared stat, by id, whether or not it is listed. */
  statsById: Record<string, StatView>
  pack: {
    id: string
    name: string
    desc: string
    count: number
    useLabel?: string
  }[]
  inScene: boolean
  /** Every declared collection, with its entries oldest first and their words filled in. */
  collections: Record<string, CollectionView>
  /** Each kind's entities, by kind id, in the order they came. Every declared kind is here, empty or not. */
  entities: Record<string, EntitiesView>
  notices: NoticesView
  /** The inputs on offer now, by id, with the value each holds. */
  inputs: Record<string, InputView>
  /** What each plugin gives the UI, by plugin id. */
  plugins: Record<string, unknown>
  /** Every setting the game declares, in order, for a settings screen. */
  settings: SettingView[]
}

/** A setting as a settings screen draws it. */
export type SettingView = {
  id: string
  label: string
  kind: 'toggle' | 'choice' | 'range'
  affects: 'play' | 'ui'
  /** A choice's options. */
  options?: { value: string; label: string }[]
  /** A range's bounds and step. */
  min?: number
  max?: number
  step?: number
  default: FlagValue
  /** A play setting's value in this game. Null for a ui setting, which the UI reads from the profile. */
  value: FlagValue | null
}

export type CollectionView = {
  name: string
  entries: {
    id: string
    title: string
    /** The entry's prose, filled in; empty if it has none. */
    text: string
    image: string | null
    data: Record<string, FlagValue>
    /** The turn it was collected. */
    turn: number
  }[]
}

/** One entity as the UI draws it. */
export type EntityView = {
  id: string
  /** How content names it: `'staff:ana'`. */
  ref: string
  name: string
  /** Its kind's listed stats that the player can see on it, in declared order. */
  stats: StatView[]
  flags: Record<string, FlagValue>
}

export type EntitiesView = {
  label: string
  plural: string
  entries: EntityView[]
}

export type NoticeView = {
  id: string
  title: string
  /** The notice's prose, filled in; empty if it has none. */
  text: string
  image: string | null
  tag: string | null
  /** The turn it was raised. */
  turn: number
}

export type NoticesView = {
  /** Not yet dismissed, newest first. */
  unseen: NoticeView[]
  /** How many unseen notices each tag has: badges. Untagged ones count under `''`. */
  byTag: Record<string, number>
}

export type InputView = {
  id: string
  label: string
  kind: InputDef['kind']
  maxLength: number | null
  min: number | null
  max: number | null
  options: { value: FlagValue; label: string }[]
  /** What the variable holds now, if anything. */
  value: FlagValue | null
}

/**
 * Everything the UI draws, assembled from the state in one pass.
 *
 * Each panel is its own function below, so a panel can be built (and later
 * memoised) on its own — the shape of `View` is an assembly of slices, not a
 * hundred-line literal.
 */
export function view(state: GameState, game: Game): View {
  const idle = !lockedOut(state, game) && !state.sceneId

  return {
    title: game.title,
    phase: state.phase,
    turn: state.turn,
    when: pluginLabel(game, state),
    scene: renderDialogue(state, game) ?? standing(state, game),
    actions: idle ? idleActions(state, game) : [],
    stats: statsOf(state, game),
    statsById: statsById(state, game),
    pack: packOf(state, game),
    inScene: Boolean(state.sceneId),
    collections: collectionsOf(state, game),
    entities: entitiesView(state, game),
    notices: noticesOf(state, game),
    inputs: inputsOf(state, game),
    plugins: pluginViews(state, game),
    settings: settingsOf(state, game),
  }
}

function settingsOf(state: GameState, game: Game): SettingView[] {
  return (game.settings ?? []).map((setting) => {
    const affects = settingAffects(setting)
    return {
      id: setting.id,
      label: setting.label,
      kind: setting.kind,
      affects,
      ...(setting.kind === 'choice' ? { options: setting.options } : {}),
      ...(setting.kind === 'range' ? { min: setting.min, max: setting.max, ...(setting.step !== undefined ? { step: setting.step } : {}) } : {}),
      default: setting.default,
      value: affects === 'play' ? (state.settings?.[setting.id] ?? setting.default) : null,
    }
  })
}

/** A prose key's words for this state; empty when there is no key or no prose. */
function words(state: GameState, game: Game, key: string | undefined): string {
  return key ? (game.prose?.line(key, state) ?? '') : ''
}

function collectionsOf(state: GameState, game: Game): View['collections'] {
  return Object.fromEntries(
    (game.collections ?? []).map((collection) => [
      collection.id,
      {
        name: collection.name,
        entries: (state.collections?.[collection.id] ?? []).map((entry) => ({
          id: entry.id,
          title: entry.title ?? '',
          text: words(state, game, entry.text),
          image: entry.image ?? null,
          data: entry.data ?? {},
          turn: entry.turn,
        })),
      },
    ]),
  )
}

function noticesOf(state: GameState, game: Game): View['notices'] {
  const unseen = (state.notices ?? []).filter((notice) => !notice.seen).reverse()
  const byTag: Record<string, number> = {}
  for (const notice of unseen) byTag[notice.tag ?? ''] = (byTag[notice.tag ?? ''] ?? 0) + 1
  return {
    unseen: unseen.map((notice) => ({
      id: notice.id,
      title: notice.title,
      text: words(state, game, notice.text),
      image: notice.image ?? null,
      tag: notice.tag ?? null,
      turn: notice.turn,
    })),
    byTag,
  }
}

function inputsOf(state: GameState, game: Game): View['inputs'] {
  return Object.fromEntries(
    (game.inputs ?? [])
      .filter((input) => holds(state, input.when, game))
      .map((input) => [
        input.id,
        {
          id: input.id,
          label: input.label,
          kind: input.kind,
          maxLength: input.kind === 'text' ? (input.maxLength ?? 40) : null,
          min: input.min ?? null,
          max: input.max ?? null,
          options: input.options ?? [],
          value: state.flags[input.variable ?? input.id] ?? null,
        },
      ]),
  )
}

/** The room itself, when no scene is playing over it. */
function standing(state: GameState, game: Game): View['scene'] {
  // A plugin's stage; with none, there is nothing to read but the buttons.
  const stage = pluginStage(game, state)
  const rendered = stage?.body
    ? renderScene({ id: stage.id, body: [...stage.body], choices: [] }, state, defaultRuntime(game))
    : { body: '' }
  const body = rendered.body ?? ''
  return {
    id: null,
    title: stage?.title ?? game.title,
    body,
    beats: parseBeats(body),
    frame: 'stage',
    tags: [],
    panel: null,
    panelData: null,
    speaker: null,
    stageImage: null,
    choices: [],
  }
}

function statView(state: GameState, game: Game, stat: StatDef, stats: Stats = state.stats): StatView {
  const value = stats[stat.id] ?? 0
  return {
    key: stat.id,
    label: stat.label,
    value,
    max: statMax(state, game, stat.id),
    text: formatStat(stat, value),
  }
}

/** The listed stats the player can see right now, in the order the game declared them. */
function statsOf(state: GameState, game: Game): View['stats'] {
  return (game.stats ?? [])
    .filter((stat) => !stat.of && stat.listed !== false && holds(state, stat.visible, game))
    .map((stat) => statView(state, game, stat))
}

function statsById(state: GameState, game: Game): Record<string, StatView> {
  return Object.fromEntries(
    (game.stats ?? []).filter((stat) => !stat.of).map((stat) => [stat.id, statView(state, game, stat)]),
  )
}

/** Every kind's entities, with the stats the player can see on each. */
function entitiesView(state: GameState, game: Game): View['entities'] {
  return Object.fromEntries(
    (game.kinds ?? []).map((kind) => {
      const stats = (game.stats ?? []).filter((stat) => stat.of === kind.id && stat.listed !== false)
      const entries = entitiesOf(state, kind.id).map((ref) => {
        const entity = entityOf(state, ref)!
        return {
          id: parseRef(ref)!.id,
          ref,
          name: entity.name,
          stats: stats
            .filter((stat) => holds(state, bindCurrent(stat.visible, ref), game))
            .map((stat) => statView(state, game, stat, entity.stats)),
          flags: entity.flags,
        }
      })
      return [kind.id, { label: kind.label, plural: kind.plural ?? kind.label, entries }]
    }),
  )
}

function packOf(state: GameState, game: Game): View['pack'] {
  return game.items
    .map((item) => ({
      id: item.id,
      name: item.name,
      desc: item.desc,
      count: state.items[item.id] ?? 0,
      useLabel: item.use?.label,
    }))
    .filter((item) => item.count > 0)
}

/** Is this button left off the screen by a lock that hides? Never one that ignores locks. */
function hiddenByLock(state: GameState, game: Game, command: Command): boolean {
  if (command.type === 'custom' && pluginCommand(game, command.name)?.ignoresLocks) return false
  return Boolean(lockOn(state, game, command)?.hide)
}

/**
 * The buttons offered while no scene is open: plugins' first, then the
 * game's. One a hiding lock stops is left off the screen.
 */
function idleActions(state: GameState, game: Game): RenderedChoice[] {
  return [...pluginButtons(game, state), ...(game.actions ?? [])]
    .filter((action) => holds(state, action.when, game) && !hiddenByLock(state, game, action.command))
    .map((action) => renderAction(state, game, action))
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
  const activity =
    action.command.type === 'activity'
      ? activityById(game, action.command.id)
      : undefined
  // Only worked out when a plugin will look at them.
  const effects = pluginsWatch(game) ? effectsOf(state, game, action.command) : []
  const choice: RenderedChoice = {
    id: action.id,
    label: action.label,
    price: priced(state, game, activity?.cost ?? {}, effects),
    disabled:
      action.blocked?.find((entry) => holds(state, entry.when, game))?.reason ??
      whyNot(state, game, action.command),
    command: action.command,
  }
  const warning = warningOf(state, game, action.command, effects)
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

function renderDialogue(
  state: GameState,
  game: Game,
): View['scene'] | null {
  if (!state.sceneId) return null
  const scene = sceneById(game, state.sceneId)
  if (!scene) {
    return {
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
      choices: [
        { id: 'leave', label: say(game, 'lookAround'), command: { type: 'leave' } },
      ],
    }
  }
  // Markdown is laid over legacy scenes by `bake` in the content pack. Doing it
  // again here would overwrite a declarative scene's composed body with
  // whatever single block happens to share the scene's id.
  const rendered = scene.render(state, sceneContext(state, game))
  const media = (rendered.media ?? []).map((item) => ({
    beat: {
      kind: 'image' as const,
      src: artSrc(item.src),
      alt: item.alt,
      size: item.size,
    },
    at: item.at ?? 'end',
  }))
  const beats = [
    ...media.filter((item) => item.at === 'lead').map((item) => item.beat),
    ...parseBeats(rendered.body ?? ''),
    ...media.filter((item) => item.at !== 'lead').map((item) => item.beat),
  ]
  const speaker = speakerOf(rendered.speaker ?? scene.speaker, game, state)
  const frame = rendered.frame ?? scene.frame ?? (speaker ? 'talk' : 'stage')
  return {
    id: state.sceneId,
    title: rendered.title ?? scene.title ?? pluginStage(game, state)?.title ?? game.title,
    body: rendered.body ?? '',
    beats,
    frame,
    tags: rendered.tags ?? scene.tags ?? [],
    panel: rendered.panel ?? scene.panel ?? null,
    panelData: rendered.panelData ?? null,
    speaker,
    stageImage: rendered.portrait ?? speaker?.portrait ?? null,
    choices: rendered.choices
      .filter((choice) => choice.visible !== false)
      .map((choice) => {
        return {
          id: choice.id,
          label: choice.label,
          price: priceOfEffects(state, game, choice.effects),
          // The choice's own reason first; then a lock or a plugin's guard, as the reducer will ask.
          disabled: choice.disabled ?? whyNot(state, game, { type: 'choose', id: choice.id }),
          tags: choice.tags,
          irreversible: choice.irreversible,
          warning: warningOf(state, game, { type: 'choose', id: choice.id }, choice.effects),
          command: { type: 'choose', id: choice.id } as const,
        }
      }),
  }
}

/** Who is speaking: the id the scene names, as a plugin knows them. Never guessed from the scene's id. */
function speakerOf(id: string | undefined, game: Game, state: GameState): SpeakerView | null {
  return id ? (pluginSpeaker(game, state, id) ?? null) : null
}
