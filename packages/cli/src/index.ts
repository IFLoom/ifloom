/** @ifloom/cli — the command line's parts, for scripts that want them without the command line. */
export { buildFiles, checkBuild, inlineAssets } from './build.ts'
export { checkGame, gameFrom } from './check.ts'
export type { TurnMetrics, Playtest, PlaytestOptions, Policy } from './playtest.ts'
export { explorer, metricsText, playtest, screenText } from './playtest.ts'
export type { Probe } from './snapshot.ts'
export { snapshot } from './snapshot.ts'
export type { NewGameOptions, TemplateName } from './new.ts'
export { TEMPLATES, newGame } from './new.ts'
