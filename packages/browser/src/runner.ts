import { createRunner, profile, saves, startingState, type Game, type GameState, type Runner, type RunnerOptions } from '@ifloom/engine'
import { localStorageDriver } from './drivers.ts'

/**
 * A runner with what most games in a browser want: a new game with a random
 * seed, undo 50 steps deep, saves and a profile in `localStorage`, and an
 * autosave each turn. It reads the profile before it starts, so the new
 * game has the player's play settings and `settings()` has their ui
 * settings from the first frame. Pass a `start` to begin elsewhere, and
 * runner options to change any default; they are merged over these. Any UI
 * can use it: the React UI's `mountGame` does, and so do the templates.
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
