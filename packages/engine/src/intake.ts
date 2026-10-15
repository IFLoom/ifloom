/**
 * The state intake: every way a `GameState` comes into play. A new game is
 * built by `startingState`; anything else (a save, a command log's start, a
 * state a test wrote by hand) comes in through `loadState`, which carries it
 * forward and fills it in. Each field of the state declares its new-game value
 * and its load default once, in `FIELDS`, and both paths read that table.
 */
import { say } from './strings.ts'
import type { Game, ItemDef } from './game.ts'
import type { PluginSlice } from './plugin.ts'
import { SAVE_VERSION, type FlagValue, type GameState, type StorylineState } from './types.ts'
import { clampStat, startingStats } from './stats.ts'
import { newEntity, startingEntities, writeEntity } from './entities.ts'
import { settingAffects, startingSettings } from './settings.ts'
import { emptyStoryline } from './storylines.ts'
import { emptyAudio, noteStarted } from './audio.ts'
import { emptyMedia } from './media.ts'
import { hash } from './random.ts'

export type StartOptions = {
  /** Fixes the save's random draws. Left out, it is hashed from the game's id, so tests deal the same cards. */
  seed?: number
  /** Variables to write before the first scene: a name from a title screen, a difficulty. */
  flags?: Record<string, FlagValue>
  /**
   * The player's stored values for the game's `play` settings, usually the
   * profile's `settings`. A setting given no value, or one it doesn't take,
   * starts at its default; ids the game doesn't declare are ignored.
   */
  settings?: Record<string, unknown>
  /**
   * The state a finished game ended on, for a New Game+: the stats, variables
   * and items the game's `carryOver` lists are copied from it.
   */
  carry?: GameState
}

/** How many of an item a new game starts with: its `start`, else 1 of gear and 0 of stuff. */
export function itemStart(item: ItemDef): number {
  return item.start ?? (item.kind === 'gear' ? 1 : 0)
}

/** One field of the state: what a new game has, and what a loaded state that lacks it gets. */
type Field<K extends keyof GameState> = {
  /** A new game's value. `undefined` leaves the field out. */
  start: (game: Game, options: StartOptions) => GameState[K]
  /**
   * What a loaded state gets when the field is missing (or null), after the
   * engine's own steps and before the plugins' and the game's. Left out, the
   * field is never filled: a step or a fill rule below owns it.
   */
  load?: () => GameState[K]
  /** Whether a loaded value can be kept. Default: it is there and not null. */
  keeps?: (value: unknown) => boolean
}

/**
 * Every field of `GameState`. A new field is declared here once: its new-game
 * value and, for a field an older save won't have, its load default. Old saves
 * then load without a step in `STEPS`; a step is only needed to reshape what
 * a save already has.
 */
export const FIELDS: { [K in keyof GameState]-?: Field<K> } = {
  version: { start: () => SAVE_VERSION },
  seed: { start: (game, options) => options.seed ?? hash(game.id) },
  phase: { start: (game) => game.startPhase ?? '' },
  turn: { start: () => 0, load: () => 0, keeps: (value) => typeof value === 'number' },
  sceneId: { start: (game) => game.introScene ?? null },
  stats: { start: (game) => startingStats(game) },
  entities: { start: (game) => startingEntities(game), load: () => ({}) },
  created: { start: () => ({}), load: () => ({}) },
  removed: { start: () => [], load: () => [] },
  // A storyline the save lacks is added by `fillGame`, from the game's list.
  storylines: { start: (game) => Object.fromEntries(game.storylines.map((storyline) => [storyline.id, emptyStoryline()])) },
  flags: { start: (_game, options) => ({ ...options.flags }) },
  items: { start: (game) => Object.fromEntries(game.items.map((item) => [item.id, itemStart(item)])) },
  collections: { start: () => ({}), load: () => ({}) },
  notices: { start: () => [], load: () => [] },
  fired: { start: () => ({}), load: () => ({}) },
  // A plugin the save lacks starts fresh in `carryPlugins`.
  plugins: { start: (game) => startingPlugins(game) },
  // The opening scene is on screen from the first frame, so it counts as seen
  // without a command ever having been run.
  seen: { start: (game) => (game.introScene ? { [game.introScene]: 1 } : {}), load: () => ({}) },
  seenOn: { start: (game) => (game.introScene ? { [game.introScene]: 0 } : {}), load: () => ({}) },
  chosen: { start: () => ({}), load: () => ({}) },
  settings: { start: (game, options) => startingSettings(game, options.settings), load: () => ({}) },
  // The opening scene is the first showing.
  audio: { start: (game) => ({ ...emptyAudio(), shown: game.introScene ? 1 : 0 }), load: emptyAudio },
  media: { start: () => emptyMedia(), load: emptyMedia },
  // Only a game that declares a version stamps its saves with one; `carryGame` carries it.
  gameVersion: { start: (game) => game.version },
}

function startingPlugins(game: Game): Record<string, PluginSlice> {
  const out: Record<string, PluginSlice> = {}
  for (const plugin of game.plugins ?? []) {
    if (plugin.start) out[plugin.id] = { version: plugin.version, state: plugin.start(game) }
  }
  return out
}

/** What `carryOver` takes from the game before, laid over a fresh state. */
function carried(state: GameState, game: Game, from: GameState): GameState {
  const listed = game.carryOver
  if (!listed) return state
  const stats = { ...state.stats }
  for (const id of listed.stats ?? []) {
    if (typeof from.stats?.[id] === 'number') stats[id] = clampStat(state, game, id, from.stats[id])
  }
  const flags = { ...state.flags }
  for (const key of listed.flags ?? []) {
    if (from.flags?.[key] !== undefined) flags[key] = from.flags[key]
  }
  const items = { ...state.items }
  const itemIds = listed.items === 'all' ? Object.keys(items) : (listed.items ?? [])
  for (const id of itemIds) {
    if (id in items && typeof from.items?.[id] === 'number') items[id] = from.items[id]
  }
  return { ...state, stats, flags, items }
}

/** A new game: every field at its start value, with a New Game+'s carried values laid over. */
export function startingState(game: Game, options: StartOptions = {}): GameState {
  const fresh: Record<string, unknown> = {}
  for (const [key, field] of Object.entries(FIELDS) as [string, Field<keyof GameState>][]) {
    const value = field.start(game, options)
    if (value !== undefined) fresh[key] = value
  }
  const state = fresh as GameState
  if (!options.carry) return noteStarted(state, game)
  // Carried over first, so variables the caller gives still win.
  const plus = carried(state, game, options.carry)
  return noteStarted({ ...plus, flags: { ...plus.flags, ...options.flags } }, game)
}

/** A save as it came off disk: some version of the shape, not necessarily this one. */
type Saved = Record<string, unknown> & { version?: unknown }

/** The oldest save format the engine still reads. A save older than this, or with no version, is refused. */
const OLDEST = 1

/**
 * The engine's steps that reshape what a save already has, keyed by the
 * version each upgrades *from*. A version with no step only added fields,
 * which their load defaults in `FIELDS` fill.
 *
 * When the save format changes after release, bump `SAVE_VERSION`, and add the
 * step that reshapes the previous version in the same change.
 */
const STEPS: Record<number, (state: Saved) => Saved> = {
  // 1 → 2: the player's name moves into variables, and choices start being remembered.
  1: ({ playerName, playerFirst, playerLast, ...state }) => ({
    ...state,
    flags: { playerName, playerFirst, playerLast, ...(state.flags as object) },
    chosen: {},
  }),
  // 2 → 3: one clock, the turn. A day was the only turn there was, so the turn
  // is the day, and everything stamped with a day is stamped with that turn.
  2: (state) => {
    const time = state.time as { day: number } | undefined
    const stamped = <T extends { day?: number }>(list: T[] = []) =>
      list.map(({ day, ...rest }) => ({ ...rest, turn: day ?? 0 }))
    const flags = Object.fromEntries(
      Object.entries((state.flags ?? {}) as Record<string, unknown>).map(([key, value]) => [
        key.startsWith('day:') ? `turn:${key.slice(4)}` : key,
        value,
      ]),
    )
    const storylines = Object.fromEntries(
      Object.entries((state.storylines ?? {}) as Record<string, { closedUntilDay?: number | null }>).map(
        ([id, { closedUntilDay, ...rest }]) => [id, { ...rest, closedUntil: closedUntilDay ?? null }],
      ),
    )
    const collections = Object.fromEntries(
      Object.entries((state.collections ?? {}) as Record<string, { day?: number }[]>).map(([id, list]) => [id, stamped(list)]),
    )
    return { ...state, turn: time?.day ?? 0, flags, storylines, collections, notices: stamped(state.notices as { day?: number }[]) }
  },
  // 3 → 4: entities and created, from their load defaults.
  // 4 → 5: the clock leaves the engine for the calendar plugin, with the same day and period
  // (the last one, 'sleep', is the calendar's 'late'). A game without the calendar keeps it unused.
  4: ({ time, ...state }) => {
    const clock = time as { day: number; period: string } | undefined
    if (!clock) return state
    const plugins = { ...(state.plugins as Record<string, unknown>) }
    plugins.calendar ??= { version: 1, state: { day: clock.day, period: clock.period === 'sleep' ? 'late' : clock.period } }
    return { ...state, plugins }
  },
  // 5 → 6: where the player is leaves the engine for the places plugin.
  5: ({ locationId, ...state }) => {
    if (locationId === null || locationId === undefined) return state
    const plugins = { ...(state.plugins as Record<string, unknown>) }
    plugins.places ??= { version: 1, state: { at: locationId } }
    return { ...state, plugins }
  },
  // 6 → 7: removed, from its load default.
  // 7 → 8: storylines lose standing and rapport. A relationship is a stat the game declares on the cast's
  // characters now, and the engine cannot know which; a version-7 save's standing is dropped.
  7: (state) => ({
    ...state,
    storylines: Object.fromEntries(
      Object.entries((state.storylines ?? {}) as Record<string, { closedUntil?: number | null; flags?: Record<string, unknown> }>).map(
        ([id, { closedUntil, flags }]) => [id, { closedUntil: closedUntil ?? null, flags: flags ?? {} }],
      ),
    ),
  }),
  // 8 → 9: settings, 9 → 10: audio, 10 → 11: media, all from their load defaults.
}

/** The engine's steps, then each field's load default. Null when the save's version can't be read. */
function carryEngine(data: Saved): GameState | null {
  let state = data
  let version = typeof state.version === 'number' ? state.version : 0
  if (!Number.isInteger(version) || version < OLDEST || version > SAVE_VERSION) return null
  while (version < SAVE_VERSION) {
    const step = STEPS[version]
    if (step) state = step(state)
    version += 1
  }
  let next = (state.version === SAVE_VERSION ? state : { ...state, version: SAVE_VERSION }) as Record<string, unknown>
  for (const [key, field] of Object.entries(FIELDS) as [string, Field<keyof GameState>][]) {
    if (!field.load) continue
    const value = next[key]
    if (field.keeps ? field.keeps(value) : value !== undefined && value !== null) continue
    next = { ...next, [key]: field.load() }
  }
  return next as unknown as GameState
}

/**
 * Every plugin's state brought up to the version the game has: a plugin added
 * since the save starts fresh, an older state is carried forward step by step.
 * The reason, when a state is newer than its plugin or has no route forward.
 * The state of a plugin the game no longer has is kept as it is.
 */
function carryPlugins(state: GameState, game: Game): GameState | string {
  let plugins = state.plugins ?? {}
  let changed = !state.plugins
  for (const plugin of game.plugins ?? []) {
    const slice = plugins[plugin.id]
    if (!slice) {
      if (!plugin.start) continue
      plugins = { ...plugins, [plugin.id]: { version: plugin.version, state: plugin.start(game) } }
      changed = true
      continue
    }
    if (slice.version === plugin.version) continue
    if (slice.version > plugin.version) {
      return say(game, 'pluginNewer', { plugin: plugin.id })
    }
    let version = slice.version
    let inner = slice.state
    while (version < plugin.version) {
      const step = plugin.migrations?.[version]
      if (!step) return say(game, 'pluginUnreadable', { plugin: plugin.id })
      inner = step(inner)
      version += 1
    }
    plugins = { ...plugins, [plugin.id]: { version, state: inner } }
    changed = true
  }
  return changed ? { ...state, plugins } : state
}

/**
 * What `MigrationTools.fill` can fill: the player's stats and each entity's
 * (start values), items (start counts), variables the game resets each turn
 * (`rules.resets`), play settings (defaults) and declared entities.
 */
export type FillKind = 'stats' | 'items' | 'variables' | 'settings' | 'entities'

const FILL_KINDS: readonly FillKind[] = ['stats', 'items', 'variables', 'settings', 'entities']

/** What a step of `game.migrations` is given besides the state. */
export type MigrationTools = {
  /**
   * The state this step was given, with what the game declares and the save
   * lacks filled in: the kinds asked for, or every kind if left out. Nothing
   * is filled unless a step calls this. See `FillKind`.
   */
  fill: (kinds?: FillKind[]) => GameState
}

/**
 * A state with what the game declares and the save lacks filled in: only the
 * kinds asked for, every kind if left out. Nothing the save already has is
 * changed, and an entity removed in play is not brought back.
 */
function fillDeclared(state: GameState, game: Game, kinds: readonly FillKind[] = FILL_KINDS): GameState {
  let next = state
  if (kinds.includes('stats')) {
    const kept = (game.stats ?? []).filter((stat) => stat.derive === undefined)
    const lacking = kept.filter((stat) => !stat.of && next.stats?.[stat.id] === undefined)
    if (lacking.length) next = { ...next, stats: { ...next.stats, ...Object.fromEntries(lacking.map((stat) => [stat.id, stat.start ?? 0])) } }
    for (const [kind, entities] of Object.entries(next.entities ?? {})) {
      const owned = kept.filter((stat) => stat.of === kind)
      for (const [id, entity] of Object.entries(entities)) {
        const missing = owned.filter((stat) => entity.stats?.[stat.id] === undefined)
        if (!missing.length) continue
        const stats = { ...entity.stats, ...Object.fromEntries(missing.map((stat) => [stat.id, stat.start ?? 0])) }
        next = writeEntity(next, `${kind}:${id}`, { ...entity, stats })
      }
    }
  }
  if (kinds.includes('items')) {
    const lacking = game.items.filter((item) => next.items?.[item.id] === undefined)
    if (lacking.length) {
      next = { ...next, items: { ...next.items, ...Object.fromEntries(lacking.map((item) => [item.id, itemStart(item)])) } }
    }
  }
  if (kinds.includes('variables')) {
    const lacking = Object.entries(game.rules?.resets ?? {}).filter(([key]) => next.flags?.[key] === undefined)
    if (lacking.length) next = { ...next, flags: { ...next.flags, ...Object.fromEntries(lacking) } }
  }
  if (kinds.includes('settings')) {
    // A play setting the save lacks (one the game added since, or every one in an older save) takes its default.
    const lacking = (game.settings ?? []).filter((setting) => settingAffects(setting) === 'play' && next.settings?.[setting.id] === undefined)
    if (lacking.length || !next.settings) {
      next = { ...next, settings: { ...next.settings, ...Object.fromEntries(lacking.map((setting) => [setting.id, setting.default])) } }
    }
  }
  if (kinds.includes('entities')) {
    // A declared entity the save does not have (a mod's, a new version's) joins it, unless it was removed in play.
    const missing = (game.entities ?? []).filter(
      (entity) => !next.entities?.[entity.of]?.[entity.id] && !(next.removed ?? []).includes(`${entity.of}:${entity.id}`),
    )
    for (const entity of missing) next = writeEntity(next, `${entity.of}:${entity.id}`, newEntity(game, entity.of, entity))
  }
  return next
}

/**
 * The game's own `migrations`, from the version the save records (1 if none)
 * to `game.version`. The reason, through `say`, when the save is from a newer
 * version of the game.
 */
function carryGame(state: GameState, game: Game): GameState | string {
  const target = game.version ?? 1
  let version = state.gameVersion ?? 1
  if (version > target) return say(game, 'gameNewer')
  let next = state
  while (version < target) {
    const step = game.migrations?.[version]
    if (step) {
      const given = next
      next = step(given, { fill: (kinds) => fillDeclared(given, game, kinds) })
    }
    version += 1
  }
  if (game.version === undefined) return next
  return next.gameVersion === game.version ? next : { ...next, gameVersion: game.version }
}

/**
 * What the game as it is now declares and the save lacks: a storyline added
 * since. A game that declares no `version` also gets its play settings and
 * entities filled here, as it always has; one that declares a version fills
 * them in its own steps, with `tools.fill()`.
 */
function fillGame(state: GameState, game: Game): GameState {
  let next = state
  const lacking = game.storylines.filter((def) => !state.storylines?.[def.id])
  if (lacking.length) {
    const storylines: Record<string, StorylineState> = { ...state.storylines }
    for (const def of lacking) storylines[def.id] = emptyStoryline()
    next = { ...next, storylines }
  }
  return game.version === undefined ? fillDeclared(next, game, ['settings', 'entities']) : next
}

/**
 * A state from anywhere (a save, a command log, a test) made ready to play in
 * this game, or the reason it can't be, through `say`. In order: the engine's
 * own steps and each field's load default, the plugins' migrations, the
 * game's migrations, then what the game declares and the save lacks.
 */
export function loadState(raw: unknown, game: Game): GameState | string {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return say(game, 'notASave')
  const engine = carryEngine(raw as Saved)
  if (!engine) return say(game, 'saveTooOld')
  const plugged = carryPlugins(engine, game)
  if (typeof plugged === 'string') return plugged
  const carried = carryGame(plugged, game)
  if (typeof carried === 'string') return carried
  return fillGame(carried, game)
}
