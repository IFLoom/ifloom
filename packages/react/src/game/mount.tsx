import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { browserRunner } from '@ifloom/browser'
import { describeProblem, type Game, type GameState, type Problem, type Runner, type RunnerOptions } from '@ifloom/engine'
import { GameShell, type GameShellProps } from './shell.tsx'

export type MountOptions = Omit<GameShellProps, 'runner'> & {
  /** Where to draw it: an element, or a selector for one. `'#root'` if left out. */
  root?: string | Element
  /** The state to start from. A new game with a random seed if left out. */
  start?: GameState
  /** Merged over the defaults: undo 50 deep, saves in localStorage, an autosave each turn. */
  runner?: RunnerOptions
}

/** A loader problem in the loader's own words; anything else as a string. */
function problemText(problem: unknown): string {
  return typeof problem === 'object' && problem !== null && 'what' in problem ? describeProblem(problem as Problem) : String(problem)
}

/**
 * Start a game in the page: a runner with undo, saves and autosave (from
 * `browserRunner`, so it starts with the player's stored settings), the
 * whole React UI (`GameShell`, with your `layout`) drawn into `#root`, and
 * the game's sound playing if it has any. Takes a game, or what `loadGame` returns, whose
 * problems are logged as warnings. Resolves to the runner once the game is
 * drawn, for anything the game wants to drive itself.
 */
export async function mountGame(loaded: Game | { game: Game; problems?: readonly unknown[] }, options: MountOptions = {}): Promise<Runner> {
  const { root: where = '#root', start, runner: runnerOptions, ...shell } = options
  const game = 'game' in loaded && typeof loaded.game === 'object' ? loaded.game : (loaded as Game)
  const problems = 'game' in loaded && typeof loaded.game === 'object' ? (loaded.problems ?? []) : []
  if (problems.length) console.warn(problems.map(problemText).join('\n'))

  const element = typeof where === 'string' ? document.querySelector(where) : where
  if (!element) throw new Error(`mountGame: nothing in the page matches ${String(where)}.`)

  const runner = await browserRunner(game, { start, ...runnerOptions })
  createRoot(element).render(
    <StrictMode>
      <GameShell runner={runner} {...shell} />
    </StrictMode>,
  )
  return runner
}
