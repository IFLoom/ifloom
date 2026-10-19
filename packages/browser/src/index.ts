/**
 * @ifloom/browser: what a game in a browser needs from the page that the
 * engine can't do itself, as plain DOM, so any framework or none can use it.
 * The clock for timers and minigames, keyboard shortcuts, the number for a new save slot, and
 * a key press that shows what a UI is still holding back. Each `start…` returns the way to
 * stop it. The React UI uses these too.
 */
export { startClock } from './clock.ts'
export type { ClockOptions } from './clock.ts'
export { dialogOpen, ignoredKey, minigameInput, numberedChoices, startKeys, startMinigameKeys } from './keys.ts'
export type { KeysOptions } from './keys.ts'
export { nextSlot } from './slots.ts'
export { startRevealSkip } from './reveal.ts'
