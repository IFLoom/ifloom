/**
 * The game's runner, and its view as Vue state. Components read `view` and
 * send commands with `runner.apply`; nothing else talks to the engine.
 */
import { shallowRef } from 'vue'
import { browserRunner } from '@ifloom/engine'
import { startAudio } from '@ifloom/audio'
import { startClock, startKeys } from '@ifloom/browser'
import loaded from './game.ts'

const { game, problems } = loaded
if (problems.length) console.warn(problems)

// A new game with a random seed, undo, saves in localStorage and an autosave each turn.
export const runner = await browserRunner(game)

// The view is replaced whole after every change, so a shallowRef is enough:
// Vue only needs to know that it changed, not to look inside it.
export const view = shallowRef(runner.view())
runner.subscribe(() => {
  view.value = runner.view()
})

// Plays what the game's `audio` asks for, from the first click or key press.
// Its `play` plays a file on demand, such as a voice line again.
export const player = startAudio(runner)
// Ticks the game's timers and a minigame's, and maps the keyboard: 1 to 9 pick the choices, and a minigame's keys press its inputs.
startClock(runner)
startKeys(runner)
