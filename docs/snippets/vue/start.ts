// src/runner.ts: the vue template's runner, and its snapshot as Vue state.
import { computed, shallowRef } from 'vue'
import { startAudio } from '@ifloom/audio'
import { browserRunner, startClock, startKeys } from '@ifloom/browser'
import module from './game.ts'

// The game module builds the game, and lists what the loader found wrong with it.
const { game, problems } = module.build()
if (problems.length) console.warn(problems)

// A new game with a random seed, undo, saves in localStorage and an autosave each turn.
export const runner = await browserRunner(game)

// The runner hands every listener a new snapshot whenever anything in it changes, so a shallowRef is enough.
export const snapshot = shallowRef(runner.snapshot())
runner.subscribe((next) => {
  snapshot.value = next
})
// The view, which is most of what the components render.
export const view = computed(() => snapshot.value.view)

// Each helper follows the runner by itself. The player plays view.audio from the first click or key press,
// and its play() plays a file on demand. startClock ticks the timers and minigames, and startKeys presses the choices on 1 to 9.
export const player = startAudio(runner)
startClock(runner)
startKeys(runner)
