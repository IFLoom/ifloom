/**
 * The game's runner, and its view as a Svelte store. Components read `$view`
 * and send commands with `runner.apply`; nothing else talks to the engine.
 */
import { readable } from 'svelte/store'
import { browserRunner } from '@ifloom/engine'
import { startAudio } from '@ifloom/audio'
import loaded from './game.ts'
import { startClock, startKeys } from './minigame.ts'

const { game, problems } = loaded
if (problems.length) console.warn(problems)

// A new game with a random seed, undo, saves in localStorage and an autosave each turn.
export const runner = await browserRunner(game)

// A readable store fits the runner: it starts by subscribing, and stops with
// the function `subscribe` returns.
export const view = readable(runner.view(), (set) => runner.subscribe(() => set(runner.view())))

// Plays what the game's `audio` asks for, from the first click or key press.
// Its `play` plays a file on demand, such as a voice line again.
export const player = startAudio(runner)
// Ticks a minigame's timers and maps the keyboard to its inputs.
startClock(runner)
startKeys(runner)
