import type { RunnerSnapshot } from '@ifloom/engine'
// runner and add, as in the vanilla template's src/main.ts.
import { add, runner } from './runner.ts'

/** The cheats under their groups, each a button that says how often it's been used, greyed out with why when it's refused. */
export function drawCheats(parent: HTMLElement, { view }: RunnerSnapshot): void {
  const cheats = view.plugins.cheats?.cheats ?? []
  for (const group of new Set(cheats.map((cheat) => cheat.group))) {
    if (group) add(parent, 'h3', group)
    for (const cheat of cheats.filter((entry) => entry.group === group)) {
      const button = add(parent, 'button', cheat.used ? `${cheat.name} (used ${cheat.used})` : cheat.name)
      button.disabled = Boolean(cheat.button.disabled)
      button.title = cheat.button.disabled ?? cheat.description
      button.onclick = () => runner.apply(cheat.button.command)
    }
  }
}
