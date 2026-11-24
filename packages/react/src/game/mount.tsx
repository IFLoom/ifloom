import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { browserRunner } from '@ifloom/browser'
import { describeProblem, type Game, type GameState, type Problem, type Runner, type RunnerOptions } from '@ifloom/engine'
import { GameShell, type GameShellProps } from './shell.tsx'

/** Settings for `mountGame`, the {@link GameShellProps} without `runner`, with where to render and how to start. */
export type MountOptions = Omit<GameShellProps, 'runner'> & {
  /** The element to render the game into, or a selector for it. `'#root'` if left out. */
  root?: string | Element
  /** The state the game starts from. A new game with a random seed if left out. */
  start?: GameState
  /** The runner options, laid over `browserRunner`'s defaults of undo 50 deep, saves in `localStorage` and an autosave each turn. */
  runner?: RunnerOptions
}

/** A loader problem in the loader's own words; anything else as a string. */
function problemText(problem: unknown): string {
  return typeof problem === 'object' && problem !== null && 'what' in problem ? describeProblem(problem as Problem) : String(problem)
}

/**
 * Starts a game in the page and returns its runner once the game renders. It throws when nothing in the page matches
 * `root`.
 *
 * It takes a game, or what `loadGame` returns, and logs any problems as warnings. It makes the runner with
 * `browserRunner`, so the game has undo, saves, an autosave and the player's stored settings, and renders `GameShell`
 * into `#root`. The game's sound plays if it has any.
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
