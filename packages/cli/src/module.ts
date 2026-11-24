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

/**
 * The options a game module's `build` receives. They name the packs to load over the content, such as the locked
 * content a player's codes opened.
 */
export type BuildOptions = {
  /** The packs to pass to `loadGame` as `{ packs }`. `ifloom check` passes the game's `src/unlocks/` packs, and it's empty otherwise. */
  unlocked: Pack[]
}

/** A named state that `ifloom snapshot` renders every scene in, re-exported from the engine. The name becomes the snapshot file's. */
export type { Probe }

/** The definition a game passes to `defineGame`. Only `build` is required. */
export type GameModuleDef = {
  /** The function that builds the game. It returns what `loadGame` returns, the `game` and its `problems`. */
  build: (options: BuildOptions) => { game: Game; problems: Problem[] }
  /**
   * The function that returns the state `ifloom playtest` starts from, and `ifloom snapshot` when there are no probes.
   * `startingState(game)` if left out.
   */
  start?: (game: Game) => GameState
  /**
   * The function that returns the states `ifloom snapshot` renders every scene and location in, each made with `probe`.
   * The start only if left out.
   */
  probes?: (game: Game) => Probe[]
  /** The policy that chooses each command `ifloom playtest` sends. The CLI's `explorer()` if left out. */
  policy?: Policy
}

/** The game module `defineGame` returns, the default export of `src/game.ts`. Its `build` takes its options as optional, so a page calls `game.build()`. */
export type GameModule = Omit<GameModuleDef, 'build'> & {
  /** Builds the game with the definition's `build`, and returns the game and the loader's problems. `unlocked` is empty unless given. */
  build: (options?: Partial<BuildOptions>) => { game: Game; problems: Problem[] }
}

/** How the CLI knows a module came from `defineGame`: `Symbol.for`, so two copies of the CLI agree. */
const MARK = Symbol.for('ifloom.game-module')

/**
 * Returns the game module for a definition, the default export of `src/game.ts`. It throws when `build` is missing.
 *
 * `ifloom check`, `playtest`, `snapshot`, `words` and `build` read the game module, and the page builds the game from
 * it with `game.build()`.
 *
 *     export default defineGame({
 *       build: ({ unlocked }) => loadGame(content, { id: 'my-story', title: 'My Story' }, { packs: unlocked }),
 *     })
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
 * One step of a probe, either an effect or `{ play: command }`. The probe applies an effect as content's effects
 * apply, and sends a command as the player would.
 */
export type ProbeStep = Effect | { play: CommandRef }

/**
 * Returns a probe made by playing each step in order, from the game's starting state or from `from`. It throws when
 * the game refuses a command, with the reason.
 *
 * `from` is another probe or a state. An effect step is any effect content can write, a plugin's included, so a probe
 * never writes the state directly. A `{ play }` step sends the command with everything that follows a command.
 *
 *     const morning = probe('first-morning', game, [{ play: { type: 'choose', id: 'unpack' } }, { play: calendar.sleep() }])
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
