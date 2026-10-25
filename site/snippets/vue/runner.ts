/**
 * The runner and its view as Vue state, as the vue template's `src/runner.ts`
 * has them. The template makes its runner with `browserRunner`, which keeps
 * saves in the browser; here it's `createRunner` with the same options and
 * everything in memory, so the tests start each file fresh.
 */
import { shallowRef } from 'vue'
import { createRunner, memoryDriver, profile, saves, startingState } from '@ifloom/engine'
import module from './game.ts'

const { game } = module.build()

// As browserRunner makes it (undo, saves and a profile), with the backlog on and everything kept in memory.
const driver = memoryDriver()
export const runner = createRunner(game, startingState(game), {
  history: { depth: 50 },
  saves: saves(game, driver),
  profile: profile(game, driver),
  backlog: true,
})

// The view is replaced whole after every change, so a shallowRef is enough.
export const view = shallowRef(runner.view())
runner.subscribe(() => {
  view.value = runner.view()
})
