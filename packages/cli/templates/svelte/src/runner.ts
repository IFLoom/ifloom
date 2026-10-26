/**
 * The game's runner, and its snapshot as a Svelte store. Components read
 * `$view` (or the whole `$snapshot`: settings, backlog, undo, saves) and send
 * commands with `runner.apply`; nothing else talks to the engine.
 */
import { derived, readable } from 'svelte/store'
import { startAudio } from '@ifloom/audio'
import { browserRunner, startClock, startKeys } from '@ifloom/browser'
import module from './game.ts'

// The game module builds the game, and says what the loader found wrong with it.
const { game, problems } = module.build()
if (problems.length) console.warn(problems)

// A new game with a random seed, undo, saves in localStorage and an autosave each turn.
export const runner = await browserRunner(game)

// A readable store fits the runner: it starts by subscribing, and stops with
// the function `subscribe` returns. Each listener is handed the new snapshot.
export const snapshot = readable(runner.snapshot(), (set) => runner.subscribe(set))
// The view, which is most of what the components draw.
export const view = derived(snapshot, (now) => now.view)

// Plays what the game's `audio` asks for, from the first click or key press.
// Its `play` plays a file on demand, such as a voice line again.
export const player = startAudio(runner)
// Ticks the game's timers and a minigame's, and maps the keyboard: 1 to 9 pick the choices, and a minigame's keys press its inputs.
startClock(runner)
startKeys(runner)
