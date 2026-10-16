import { pluginLabel } from './plugin.ts'
import type { InputDef } from './inputs.ts'
import { formatStat, statLevel, statMax, statValue, type StatDef } from './stats.ts'
import { holds } from './condition.ts'
import type { Game } from './game.ts'
import { settingAffects } from './settings.ts'
import type { StageView } from './media.ts'
import type { AudioView } from './audio.ts'
import type { SpeakerView } from './plugin.ts'
import type { SceneBeat } from './sceneBody.ts'
import type { FlagValue, GameState, StatKey } from './types.ts'
import { bindCurrent, entitiesOf, entityOf, parseRef } from './entities.ts'
import { screen, type RenderedChoice, type Screen, type ScreenChoice } from './screen.ts'

/** A stat as the UI shows it: its value, its ceiling, and the value written out. */
export type StatView = {
  key: StatKey
  label: string
  value: number
  max: number
  text: string
  /**
   * Where a stat with `levels` stands: its level, the value the next level
   * starts at (null at the top), and how far it is towards it, 0 to 1. Left
   * out for a stat with no levels.
   */
  level?: { level: number; next: number | null; progress: number }
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
    /** The scene's layered picture and its hotspots, or null when it has none. See `stageView`. */
    stage: StageView | null
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
  /** What should be playing on each channel, and the sounds that are due. Empty when the game has no audio. */
  audio: AudioView
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
 * The scene, its choices, the room's buttons, the plugins' views and the audio
 * come from `screen`, which renders the open scene once; the rest is read from
 * the state here. `view` only formats: what each choice would apply and the
 * picks stay on the screen.
 */
export function view(state: GameState, game: Game): View {
  return viewOf(screen(state, game), state, game)
}

/** A screen as the view a UI draws. */
function viewOf(shown: Screen, state: GameState, game: Game): View {
  const { tracks: _tracks, ...audio } = shown.audio
  return {
    title: game.title,
    phase: state.phase,
    turn: state.turn,
    when: pluginLabel(game, state),
    scene: { ...shown.scene, stage: shown.stage, choices: shown.choices.map(rendered) },
    actions: shown.actions.map(rendered),
    stats: statsOf(state, game),
    statsById: statsById(state, game),
    pack: packOf(state, game),
    inScene: Boolean(state.sceneId),
    collections: collectionsOf(state, game),
    entities: entitiesView(state, game),
    notices: noticesOf(state, game),
    inputs: inputsOf(state, game),
    plugins: shown.plugins,
    settings: settingsOf(state, game),
    audio,
  }
}

/** A screen's choice as the view shows it: without its effects. */
function rendered({ effects: _effects, ...choice }: ScreenChoice): RenderedChoice {
  return choice
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

function statView(state: GameState, game: Game, stat: StatDef, of?: string): StatView {
  const value = statValue(state, game, stat.id, of)
  const level = statLevel(state, game, stat.id, of)
  return {
    key: stat.id,
    label: stat.label,
    value,
    max: statMax(state, game, stat.id),
    text: formatStat(stat, value),
    ...(level ? { level } : {}),
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
            .map((stat) => statView(state, game, stat, ref)),
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

