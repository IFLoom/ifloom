/**
 * @ifloom/cli/game: what a game's `src/game.ts` writes for the command line,
 * `defineGame`, `probe` and a playtest's policy. It imports only the engine,
 * so the game's page can import the same module the CLI reads.
 */
export type { BuildOptions, GameModule, GameModuleDef, Probe, ProbeStep } from './module.ts'
export { defineGame, probe } from './module.ts'
export type { Policy } from './playtest.ts'
export { explorer } from './playtest.ts'
