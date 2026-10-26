import type { RunnerSnapshot } from '@ifloom/engine'
// add, as in the vanilla template's src/main.ts.
import { add } from './runner.ts'

/** What you hold: the protagonist's things, then the player's, with how many. */
export function drawHeld(parent: HTMLElement, { view }: RunnerSnapshot): void {
  const list = add(parent, 'ul', '', 'held')
  for (const thing of view.held) add(list, 'li', thing.count > 1 ? `${thing.name} ×${thing.count}` : thing.name).title = thing.description ?? ''
}

/** Each listed kind, with its entities and the stats the player can see on each. */
export function drawEntities(parent: HTMLElement, { view }: RunnerSnapshot): void {
  for (const kind of view.entities) {
    if (!kind.entries.length) continue
    add(parent, 'h3', kind.plural)
    const list = add(parent, 'ul', '', 'entities')
    for (const entity of kind.entries) {
      const row = add(list, 'li', entity.name)
      row.dataset.entity = entity.ref
      // A kind's flags, such as { met: true }, to split or style the list by.
      for (const [flag, holds] of Object.entries(entity.flags)) if (holds) row.classList.add(flag)
      for (const stat of entity.stats) add(row, 'span', `${stat.label} ${stat.text}`, 'stat')
    }
  }
}
