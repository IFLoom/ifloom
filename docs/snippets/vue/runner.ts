/**
 * The runner and its snapshot as Vue state, as the vue template's
 * `src/runner.ts` has them. The template makes its runner with
 * `browserRunner`, which keeps saves in the browser; here it's `createRunner`
 * with the same options and everything in memory, so the tests start each
 * file fresh.
 */
import { computed, shallowRef } from 'vue'
import { startAudio } from '@ifloom/audio'
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

// The runner hands every listener a new snapshot whenever anything in it changes, so a shallowRef is enough.
export const snapshot = shallowRef(runner.snapshot())
runner.subscribe((next) => {
  snapshot.value = next
})
// The view, which is most of what the components draw.
export const view = computed(() => snapshot.value.view)

// Plays what view.audio asks for, from the first click or key press. Its play() plays a file on demand.
export const player = startAudio(runner)
