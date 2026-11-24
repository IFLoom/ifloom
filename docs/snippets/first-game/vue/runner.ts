// src/runner.ts
import { computed, shallowRef } from 'vue'
import { browserRunner } from '@ifloom/browser'
import module from './game.ts'

// The game module builds the game, and says what the loader found wrong with it.
const { game, problems } = module.build()
if (problems.length) console.warn(problems)

// A new game with a random seed and saves in localStorage. Undo goes back 50 steps,
// but never past the start of a turn, and the game autosaves whenever the scene changes.
export const runner = await browserRunner(game, {
  history: { depth: 50, stopAtNewTurn: true },
  autosave: { every: 'scene' },
})

// Carry on from the autosave when there is one. On a first visit there's none,
// and the new game stays as it is.
await runner.load('auto')

// The runner's snapshot as Vue state, replaced whole after every change of state.
export const snapshot = shallowRef(runner.snapshot())
runner.subscribe((next) => {
  snapshot.value = next
})
export const view = computed(() => snapshot.value.view)
