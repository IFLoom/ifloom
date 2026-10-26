import type { RunnerSnapshot } from '@ifloom/engine'
// add, as in the vanilla template's src/main.ts.
import { add } from './runner.ts'

/** The rolls the last command made, as they landed: `2d6: 4 + 5 + 1 = 10 (passed)`. The next command clears them. */
export function drawRolls(parent: HTMLElement, { view }: RunnerSnapshot): void {
  for (const roll of view.rolls) {
    const plus = roll.plus ? ` + ${roll.plus}` : ''
    const outcome = roll.passed === undefined ? '' : roll.passed ? ' (passed)' : ' (failed)'
    const line = add(parent, 'p', `${roll.dice}: ${roll.faces.join(' + ')}${plus} = ${roll.total}${outcome}`, 'roll')
    line.dataset.roll = roll.key
    if (roll.critical) line.dataset.critical = roll.critical
  }
}
