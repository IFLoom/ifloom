import type { RunnerSnapshot } from '@ifloom/engine'
// runner and add, as in the vanilla template's src/main.ts.
import { add, runner } from './runner.ts'

/** The room's buttons, while no scene is open: each with its price, greyed out with why it can't be pressed, or warned. */
export function drawActions(parent: HTMLElement, { view }: RunnerSnapshot): void {
  for (const action of view.actions) {
    // The price in a line, such as "2 coins · until evening".
    const button = add(parent, 'button', action.price ? `${action.label} (${action.price.text})` : action.label)
    button.disabled = Boolean(action.disabled)
    button.onclick = () => runner.apply(action.command)
    // Why it can't be pressed, such as "You need 3 coins.", or a warning that it will be refused.
    const note = action.disabled ?? action.warning
    if (note) add(parent, 'p', note, 'reason')
  }
}
