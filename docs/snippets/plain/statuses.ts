import type { RunnerSnapshot } from '@ifloom/engine'
// add, as in the vanilla template's src/main.ts.
import { add } from './runner.ts'

/** The active statuses, under the stats: each with how many turns it has left. The stats already include what they add. */
export function drawStatuses(parent: HTMLElement, { view }: RunnerSnapshot): void {
  const active = view.plugins.statuses?.active ?? []
  if (!active.length) return
  const list = add(parent, 'ul', '', 'statuses')
  for (const status of active) {
    const item = add(list, 'li', `${status.name} (${status.turnsLeft} left)`)
    item.title = status.description
    if (status.stacks > 1) add(item, 'span', ` ×${status.stacks}`)
  }
}
