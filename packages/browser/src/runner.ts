import { createRunner, profile, saves, startingState, type Game, type GameState, type Runner, type RunnerOptions } from '@ifloom/engine'
import { localStorageDriver } from './drivers.ts'

/**
 * Returns a runner set up for a browser, with saves and a profile in `localStorage`. Each runner option you pass
 * replaces that option's default whole.
 *
 * The defaults are a new game with a random seed, undo 50 steps deep and an autosave each turn. It reads the profile
 * before it starts, so the new game has the player's play settings and `settings()` has their UI settings from the
 * first frame. Pass `start` to begin from another state. The React UI's `mountGame` and the templates use it.
 */
export async function browserRunner(game: Game, options: RunnerOptions & { start?: GameState } = {}): Promise<Runner> {
  const { start, ...runnerOptions } = options
  const driver = localStorageDriver()
  const merged: RunnerOptions = {
    history: { depth: 50 },
    saves: saves(game, driver),
    profile: profile(game, driver),
    autosave: { every: 'turn' },
    ...runnerOptions,
  }
  let first = start
  if (!first) {
    // A profile that can't be read starts the game with the defaults.
    const settings = await merged.profile?.get<Record<string, unknown>>('core:settings').catch(() => undefined)
    first = startingState(game, { seed: Math.floor(Math.random() * 2 ** 31), settings })
  }
  const runner = createRunner(game, first, merged)
  await runner.settled()
  return runner
}
