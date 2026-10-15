import { checkGame, type Probe } from '../../src/check.ts'
import type { Game } from '../../src/game.ts'

/** A game's problems from the content checker, each as `where: what`. */
export function problemsOf(game: Game, probes?: readonly Probe[]): string[] {
  return checkGame(game, { probes }).problems.map((problem) => `${problem.where}: ${problem.what}`)
}
