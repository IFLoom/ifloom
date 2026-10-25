/**
 * The runner and its view as Vue state, as the vue template's `src/runner.ts`
 * has them. The template makes its runner with `browserRunner`, which keeps
 * saves in the browser; here it's `createRunner` on a new game, so the tests
 * start each file fresh.
 */
import { shallowRef } from 'vue'
import { createRunner, startingState } from '@ifloom/engine'
import module from './game.ts'

const { game } = module.build()

export const runner = createRunner(game, startingState(game))

// The view is replaced whole after every change, so a shallowRef is enough.
export const view = shallowRef(runner.view())
runner.subscribe(() => {
  view.value = runner.view()
})
