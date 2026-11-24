/**
 * Stands in for the vue template's src/runner.ts, cut down to what Town.vue
 * reads: the runner, and its view as Vue state.
 */
import { computed, shallowRef } from 'vue'
import { browserRunner } from '@ifloom/browser'
import module from './game.ts'

const { game, problems } = module.build()
if (problems.length) console.warn(problems)

export const runner = await browserRunner(game)

export const snapshot = shallowRef(runner.snapshot())
runner.subscribe((next) => {
  snapshot.value = next
})
export const view = computed(() => snapshot.value.view)
