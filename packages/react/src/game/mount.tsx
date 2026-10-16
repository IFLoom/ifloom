import { StrictMode, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import type { AudioOptions } from '@ifloom/audio'
import { browserRunner, describeProblem, type Game, type GameState, type Problem, type Runner, type RunnerOptions } from '@ifloom/engine'
import { hasAudio, startPlayer } from './audio.ts'
import { GameProvider } from './context.tsx'
import { GameShell, WithPages, type GameShellProps } from './shell.tsx'

export type MountOptions = Omit<GameShellProps, 'runner'> & {
  /** Where to draw it: an element, or a selector for one. `'#root'` if left out. */
  root?: string | Element
  /** The state to start from. A new game with a random seed if left out. */
  start?: GameState
  /** Merged over the defaults: undo 50 deep, saves in localStorage, an autosave each turn. */
  runner?: RunnerOptions
  /**
   * Your own root component, drawn instead of `GameShell`. It sits inside the
   * game's provider, so `useGame()` and every built-in component work in it.
   * With `pages` on, it's drawn on the `game` page.
   */
  app?: ComponentType
  /**
   * Sound, through `@ifloom/audio`. It starts on its own when the game lists
   * any tracks in `game.audio`; `false` turns it off, and an object is passed
   * to `startAudio` as its options.
   */
  audio?: false | AudioOptions
}

/** A loader problem in the loader's own words; anything else as a string. */
function problemText(problem: unknown): string {
  return typeof problem === 'object' && problem !== null && 'what' in problem ? describeProblem(problem as Problem) : String(problem)
}

/**
 * Start a game in the page: a runner with undo, saves and autosave, and the
 * whole React UI drawn into `#root`, or your own `app`, and the game's sound
 * playing if it has any. Takes a game, or what
 * `loadGame` returns, whose problems are logged as warnings. Returns the runner,
 * for anything the game wants to drive itself.
 */
export function mountGame(loaded: Game | { game: Game; problems?: readonly unknown[] }, options: MountOptions = {}): Runner {
  const { root = '#root', start, runner: runnerOptions, app: App, audio, ...shell } = options
  const game = 'game' in loaded && typeof loaded.game === 'object' ? loaded.game : (loaded as Game)
  const problems = 'game' in loaded && typeof loaded.game === 'object' ? (loaded.problems ?? []) : []
  if (problems.length) console.warn(problems.map(problemText).join('\n'))

  const element = typeof root === 'string' ? document.querySelector(root) : root
  if (!element) throw new Error(`mountGame: nothing in the page matches ${String(root)}.`)

  const runner = browserRunner(game, { start, ...runnerOptions })
  if (audio !== false && hasAudio(game)) startPlayer(runner, audio)
  const { layout: _layout, className: _className, pages, ...provider } = shell
  createRoot(element).render(
    <StrictMode>
      {App ? (
        <GameProvider runner={runner} {...provider}>
          <WithPages pages={pages}>
            <App />
          </WithPages>
        </GameProvider>
      ) : (
        <GameShell runner={runner} {...shell} />
      )}
    </StrictMode>,
  )
  return runner
}
