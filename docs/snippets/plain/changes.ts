import type { RunnerSnapshot } from '@ifloom/engine'
// add, as in the vanilla template's src/main.ts.
import { add } from './runner.ts'

/** What the last command moved, as pills: `+30 coins`, `Energy -1`, marked up or down for styling. */
export function drawChanges(parent: HTMLElement, { view }: RunnerSnapshot): void {
  if (!view.changes.length) return
  const list = add(parent, 'ul', '', 'changes')
  for (const change of view.changes) {
    const pill = add(list, 'li', `${change.label} ${change.text}`, 'change')
    pill.dataset.stat = change.stat
    if (change.of) pill.dataset.of = change.of
    pill.dataset.dir = change.by > 0 ? 'up' : 'down'
  }
}
