/**
 * The state intake, the two ways a `GameState` comes into play. `startingState` makes a new game, and `loadState`
 * carries forward and fills in any other state, such as a save, a command log's start or a state a test wrote.
 *
 * Each field of the state declares its new-game value and its load default once, in `FIELDS`, and both paths read it.
 */
import { fail, ok, type Result } from './result.ts'
import { stringOf } from './strings.ts'
import type { Game } from './game.ts'
import { pluginsOf, type PluginSlice } from './plugin.ts'
import { SAVE_VERSION, type GameState, type StartOptions } from './types.ts'
import { hash } from './random.ts'
import { carryChain, runChain } from './chain.ts'
import { featureContext } from './core.ts'
import type { StateField } from './features/feature.ts'
import { carrySteps, featureFields, fillSteps, loadSteps, startSteps, type FeatureFill } from './features/registry.ts'

export type { StartOptions } from './types.ts'

/** One field of the state: what a new game has, and what a loaded state that lacks it gets. See `StateField`. */
type Field<K extends keyof GameState> = StateField<GameState[K]>

/**
 * The table of every `GameState` field's new-game value and load default, the core's here and each feature's from its
 * `state`. Internal.
 *
 * A field an older save won't have declares a load default, so old saves load without a step in `STEPS`. A step is
 * needed only to reshape a field a save already has.
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
  for (const plugin of pluginsOf(game)) {
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
 * Returns the state of a new game, with every field at its start value. With `carry`, the New Game+'s carried values
 * go over it.
 *
 * Features then work out the fields that read the whole state, such as the audio the opening screen starts playing.
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
 * step that reshapes the previous version in the same change. A step is given
 * the game too, for one that has to read its content.
 */
const STEPS: Record<number, (state: Saved, game: Game) => Saved> = {}

/** The engine's steps, then each field's load default. Null when the save's version can't be read. */
function carryEngine(data: Saved, game: Game): GameState | null {
  const version = typeof data.version === 'number' ? data.version : 0
  if (!Number.isInteger(version) || version < OLDEST || version > SAVE_VERSION) return null
  // A version with no step only added fields, which their load defaults below fill.
  const state = carryChain(data, { from: version, to: SAVE_VERSION, step: (at) => STEPS[at] && ((saved: Saved) => STEPS[at](saved, game)) }).value
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
  for (const plugin of pluginsOf(game)) {
    const slice = plugins[plugin.id]
    if (!slice) {
      if (!plugin.start) continue
      plugins = { ...plugins, [plugin.id]: { version: plugin.version, state: plugin.start(game) } }
      changed = true
      continue
    }
    if (slice.version === plugin.version) continue
    if (slice.version > plugin.version) {
      return stringOf(game, 'pluginNewer', { plugin: plugin.id })
    }
    // The same tools a game's step gets: the state as the engine carried it, filled from the game on request.
    const tools: MigrationTools = { game, fill: (parts) => fillDeclared(state, game, parts) }
    // A plugin's state has no route past a version with no step.
    const run = runChain(slice.state, {
      from: slice.version,
      to: plugin.version,
      gap: 'refuse',
      step: (at) => {
        const step = plugin.migrations?.[at]
        return step && ((inner: unknown) => step(inner, tools))
      },
    })
    if (!run.ok) return stringOf(game, 'pluginUnreadable', { plugin: plugin.id })
    plugins = { ...plugins, [plugin.id]: { version: plugin.version, state: run.value } }
    changed = true
  }
  return changed ? { ...state, plugins } : state
}

/**
 * A part of the state `MigrationTools.fill` can fill, named by the feature that fills it.
 *
 * The parts are the player's stats (start values), kv keys (the content's starting kv and per-turn resets) and play
 * settings (defaults).
 */
export type FillPart = FeatureFill

/** The tools a step of `rules.migrations` or a plugin's `migrations` gets beside the state. */
export type MigrationTools = {
  /** The game the save is loading into, for a step that reads its content, such as the entity an old id now names. */
  game: Game
  /**
   * Returns the state the step was given, with the values the game declares and the save lacks filled in. It fills the
   * parts asked for, or every part if left out.
   *
   * A migration fills nothing unless its step calls this. See `FillPart`.
   */
  fill: (parts?: FillPart[]) => GameState
}

/**
 * A state with what the game declares and the save lacks filled in: only the
 * parts asked for, every part if left out. Nothing the save already has is
 * changed.
 */
function fillDeclared(state: GameState, game: Game, parts?: readonly FillPart[]): GameState {
  return fillSteps.reduce((next, fill) => (!parts || parts.includes(fill.part) ? fill.run(next, game) : next), state)
}

/**
 * The game's own `migrations`, from the version the save records (1 if none)
 * to `game.version`. The reason, through `say`, when the save is from a newer
 * version of the game.
 */
function carryGame(state: GameState, game: Game): GameState | string {
  const target = game.version ?? 1
  const version = state.gameVersion ?? 1
  if (version > target) return stringOf(game, 'gameNewer')
  // A version with no step changed nothing the save keeps: it is carried forward as it is.
  const next = carryChain(state, {
    from: version,
    to: target,
    step: (at) => {
      const step = game.rules?.migrations?.[at]
      return step && ((given: GameState) => step(given, { game, fill: (parts) => fillDeclared(given, game, parts) }))
    },
  }).value
  if (game.version === undefined) return next
  return next.gameVersion === game.version ? next : { ...next, gameVersion: game.version }
}

/**
 * What the game as it is now declares and the save lacks, as each feature's
 * `loaded` says: a storyline added since. A game that declares no `version`
 * also gets the fills marked `unversioned` (its play settings)
 * here, as it always has; one that declares a version fills them in its own
 * steps, with `tools.fill()`.
 */
function fillGame(state: GameState, game: Game): GameState {
  const next = loadSteps.reduce((filled, step) => step(filled, game), state)
  if (game.version !== undefined) return next
  return fillSteps.reduce((filled, fill) => (fill.unversioned ? fill.run(filled, game) : filled), next)
}

/**
 * Returns a state from a save, a command log or a test made ready to play in this game. Returns a failed `Result`
 * with a reason the player can read when it can't be.
 *
 * It runs the engine's own steps and each field's load default, then the plugins' migrations, then the game's
 * migrations, and last fills in the values the game declares and the save lacks.
 */
export function loadState(raw: unknown, game: Game): Result<GameState> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fail(stringOf(game, 'notASave'))
  const engine = carryEngine(raw as Saved, game)
  if (!engine) return fail(stringOf(game, 'saveTooOld'))
  const plugged = carryPlugins(engine, game)
  if (typeof plugged === 'string') return fail(plugged)
  const carried = carryGame(plugged, game)
  if (typeof carried === 'string') return fail(carried)
  return ok(fillGame(carried, game))
}
