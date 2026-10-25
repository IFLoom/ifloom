/**
 * The game module: what a game's `src/game.ts` exports for the command line,
 * written with `defineGame`, and `probe`, which makes a state for
 * `ifloom snapshot` by playing. It imports only the engine, so the game's
 * page can import the same module (`@ifloom/cli/game`).
 */
import {
  apply,
  applyEffects,
  startingState,
  type CommandRef,
  type Effect,
  type Game,
  type GameState,
  type Pack,
  type Probe,
  type Problem,
} from '@ifloom/engine'
import type { Policy } from './playtest.ts'

/** What `build` is given: the packs to load over the content, such as the locked content a player's codes opened. */
export type BuildOptions = {
  /** Packs to pass to `loadGame` as `{ packs }`. `ifloom check` passes the game's `src/unlocks/` content here; empty otherwise. */
  unlocked: Pack[]
}

/** A state to render every scene in, with a name for the snapshot file: the engine's, which `checkGame` takes too. */
export type { Probe }

/** What a game module says about the game, as written to `defineGame`. */
export type GameModuleDef = {
  /** Build the game: what `loadGame` returns, its `game` and its `problems`. */
  build: (options: BuildOptions) => { game: Game; problems: Problem[] }
  /** Where `ifloom playtest` starts, and `ifloom snapshot` when there are no probes. `startingState(game)` if left out. */
  start?: (game: Game) => GameState
  /** The states `ifloom snapshot` renders every scene and place in, each made with `probe`. Just the start if left out. */
  probes?: (game: Game) => Probe[]
  /** Picks each command `ifloom playtest` plays. The CLI's `explorer()` if left out. */
  policy?: Policy
}

/** A game module, as `defineGame` returns it: `build` may be called with no options, as a page does. */
export type GameModule = Omit<GameModuleDef, 'build'> & {
  build: (options?: Partial<BuildOptions>) => { game: Game; problems: Problem[] }
}

/** How the CLI knows a module came from `defineGame`: `Symbol.for`, so two copies of the CLI agree. */
const MARK = Symbol.for('ifloom.game-module')

/**
 * The game module `src/game.ts` exports as its default, for `ifloom check`,
 * `playtest`, `snapshot`, `words` and `build`:
 *
 *     export default defineGame({
 *       build: ({ unlocked }) => loadGame(content, { id: 'my-story', title: 'My Story' }, { packs: unlocked }),
 *     })
 *
 * The page builds the game the same way, with `game.build()`.
 */
export function defineGame(def: GameModuleDef): GameModule {
  if (typeof def?.build !== 'function') throw new Error('defineGame needs a build function: defineGame({ build: () => loadGame(content, base) }).')
  const module: GameModule = { ...def, build: (options = {}) => def.build({ unlocked: options.unlocked ?? [] }) }
  Object.defineProperty(module, MARK, { value: true })
  return module
}

/** Whether a value is a module `defineGame` made. */
export function isGameModule(value: unknown): value is GameModule {
  return typeof value === 'object' && value !== null && (value as Record<symbol, unknown>)[MARK] === true
}

/**
 * One step of a probe: an effect, applied as content applies it, or
 * `{ play: command }`, a command played as the player would press it.
 */
export type ProbeStep = Effect | { play: CommandRef }

/**
 * A probe state made by playing: each step in order, from the game's starting
 * state, or from `from` (another probe, or a state). An effect is any content
 * write, a plugin's included, so a probe never writes the state's own shape.
 * A command (`{ play }`) is played as the player would press it, with all
 * that follows a command, and must be allowed: a refused one throws, with why.
 *
 *     const morning = probe('first-morning', game, [{ play: { type: 'choose', id: 'unpack' } }, { play: sleep() }])
 *     probe('a-week-in', game, [{ turn: { by: 6 } }, { 'calendar/set': { period: 'afternoon' } }], morning)
 */
export function probe(name: string, game: Game, steps: readonly ProbeStep[], from?: Probe | GameState): Probe {
  let state = from === undefined ? startingState(game) : 'state' in from ? from.state : from
  for (const step of steps) {
    if (!('play' in step)) {
      state = applyEffects(state, game, [step])
      continue
    }
    const played = apply(state, game, step.play)
    if (!played.ok) throw new Error(`probe ${name}: ${JSON.stringify(step.play)} was refused: ${played.reason}`)
    state = played.state
  }
  return { name, state }
}
