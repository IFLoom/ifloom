/**
 * @ifloom/browser: what a game in a browser needs from the page that the
 * engine can't do itself, as plain DOM, so any framework or none can use it.
 * The minigame clock, keyboard shortcuts, the number for a new save slot, and
 * the timing of prose that reveals in steps. Each `start…` returns the way to
 * stop it. The React UI uses these too.
 */
export { startClock } from './clock.ts'
export type { ClockOptions } from './clock.ts'
export { dialogOpen, ignoredKey, minigameInput, numberedChoices, startKeys, startMinigameKeys } from './keys.ts'
export type { KeysOptions } from './keys.ts'
export { nextSlot } from './slots.ts'
export { lastReveal, revealGroups, startRevealSkip } from './reveal.ts'
export type { RevealBeat, RevealGroup } from './reveal.ts'
