/**
 * The state intake: every way a `GameState` comes into play. A new game is
 * built by `startingState`; anything else (a save, a command log's start, a
 * state a test wrote by hand) comes in through `loadState`, which carries it
 * forward and fills it in. Each field of the state declares its new-game value
 * and its load default once, in `FIELDS`, and both paths read that table.
 */
import { say } from './strings.ts'
import type { Game } from './game.ts'
import type { PluginSlice } from './plugin.ts'
import { SAVE_VERSION, type GameState, type StartOptions } from './types.ts'
import { hash } from './random.ts'
import { featureContext } from './core.ts'
import type { StateField } from './features/feature.ts'
import { carrySteps, featureFields, fillSteps, loadSteps, startSteps, type FeatureFill } from './features/registry.ts'

export type { StartOptions } from './types.ts'

export { itemStart } from './features/items.ts'

/** One field of the state: what a new game has, and what a loaded state that lacks it gets. See `StateField`. */
type Field<K extends keyof GameState> = StateField<GameState[K]>

/**
 * Every field of `GameState`: the core's, declared here, and each feature's,
 * declared in its `state`. A new field is declared once: its new-game value
 * and, for a field an older save won't have, its load default. Old saves
 * then load without a step in `STEPS`; a step is only needed to reshape what
 * a save already has.
 */
export const FIELDS: { [K in keyof GameState]-?: Field<K> } = {
  version: { start: () => SAVE_VERSION },
  seed: { start: (game, options) => options.seed ?? hash(game.id) },
  ...featureFields,
  // A plugin the save lacks starts fresh in `carryPlugins`.
  plugins: { start: (game) => startingPlugins(game) },
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

/** What `carryOver` takes from the game before, laid over a fresh state: each feature's fields, worked out from the fresh state. */
function carried(state: GameState, game: Game, from: GameState, options: StartOptions): GameState {
  if (!game.carryOver) return state
  const cx = featureContext()
  return Object.assign({ ...state }, ...carrySteps.map((step) => step(state, game, from, options, cx))) as GameState
}

/**
 * A new game: every field at its start value, with a New Game+'s carried
 * values laid over, then what features work out from the whole state (what
 * the opening screen starts playing).
 */
export function startingState(game: Game, options: StartOptions = {}): GameState {
  const fresh: Record<string, unknown> = {}
  for (const [key, field] of Object.entries(FIELDS) as [string, Field<keyof GameState>][]) {
    const value = field.start(game, options)
    if (value !== undefined) fresh[key] = value
  }
  let state = fresh as GameState
  if (options.carry) {
    state = carried(state, game, options.carry, options)
  }
  return startSteps.reduce((next, step) => step(next, game, featureContext()), state)
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
  // 1 → 2: the player's name moves into flags (the kv store since 12), and choices start being remembered.
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
  // 11 → 12: flags become the kv store: the game's, each storyline's and each entity's.
  11: ({ flags, ...state }) => {
    const moved = <T extends { flags?: unknown; kv?: unknown }>({ flags: own, ...rest }: T) => ({ ...rest, kv: own ?? rest.kv ?? {} })
    return {
      ...state,
      kv: flags ?? state.kv ?? {},
      storylines: Object.fromEntries(Object.entries((state.storylines ?? {}) as Record<string, { flags?: unknown }>).map(([id, storyline]) => [id, moved(storyline)])),
      entities: Object.fromEntries(
        Object.entries((state.entities ?? {}) as Record<string, Record<string, { flags?: unknown }>>).map(([kind, byId]) => [
          kind,
          Object.fromEntries(Object.entries(byId).map(([id, entity]) => [id, moved(entity)])),
        ]),
      ),
    }
  },
  // 12 → 13: the timed-effects plugin is the statuses plugin, so its state moves from `plugins.effects`.
  12: (state) => {
    const plugins = state.plugins as Record<string, unknown> | undefined
    if (!plugins || !('effects' in plugins) || 'statuses' in plugins) return state
    const { effects, ...rest } = plugins
    return { ...state, plugins: { ...rest, statuses: effects } }
  },
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
    // The same tools a game's step gets: the state as the engine carried it, filled from the game on request.
    const tools: MigrationTools = { fill: (kinds) => fillDeclared(state, game, kinds) }
    while (version < plugin.version) {
      const step = plugin.migrations?.[version]
      if (!step) return say(game, 'pluginUnreadable', { plugin: plugin.id })
      inner = step(inner, tools)
      version += 1
    }
    plugins = { ...plugins, [plugin.id]: { version, state: inner } }
    changed = true
  }
  return changed ? { ...state, plugins } : state
}

/**
 * What `MigrationTools.fill` can fill, each named by the feature that fills
 * it: the player's stats and each entity's (start values), items (start
 * counts), kv keys the game resets each turn (`rules.resets`), play
 * settings (defaults) and declared entities.
 */
export type FillKind = FeatureFill

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
function fillDeclared(state: GameState, game: Game, kinds?: readonly FillKind[]): GameState {
  return fillSteps.reduce((next, fill) => (!kinds || kinds.includes(fill.kind) ? fill.run(next, game) : next), state)
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
 * What the game as it is now declares and the save lacks, as each feature's
 * `loaded` says: a storyline added since. A game that declares no `version`
 * also gets the fills marked `unversioned` (its play settings and entities)
 * here, as it always has; one that declares a version fills them in its own
 * steps, with `tools.fill()`.
 */
function fillGame(state: GameState, game: Game): GameState {
  const next = loadSteps.reduce((filled, step) => step(filled, game), state)
  if (game.version !== undefined) return next
  return fillSteps.reduce((filled, fill) => (fill.unversioned ? fill.run(filled, game) : filled), next)
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
