/**
 * The game's runner, and its view as Vue state. Components read `view` and
 * send commands with `runner.apply`; nothing else talks to the engine.
 */
import { shallowRef } from 'vue'
import { browserRunner } from '@ifloom/engine'
import { startAudio } from '@ifloom/audio'
import loaded from './game.ts'
import { startClock, startKeys } from './minigame.ts'

const { game, problems } = loaded
if (problems.length) console.warn(problems)

// A new game with a random seed, undo, saves in localStorage and an autosave each turn.
export const runner = browserRunner(game)

// The view is replaced whole after every change, so a shallowRef is enough:
// Vue only needs to know that it changed, not to look inside it.
export const view = shallowRef(runner.view())
runner.subscribe(() => {
  view.value = runner.view()
})

// Plays what the game's `audio` asks for, from the first click or key press.
// Its `play` plays a file on demand, such as a voice line again.
export const player = startAudio(runner)
// Ticks a minigame's timers and maps the keyboard to its inputs.
startClock(runner)
startKeys(runner)
