import type { RunnerSnapshot } from '@ifloom/engine'
import { nextSlot } from '@ifloom/browser'
// runner and add, as in the vanilla template's src/main.ts.
import { add, runner } from './runner.ts'

/** A Save button, greyed out while the game refuses saving, and a row for each save with Load and Delete. */
export function drawSaves(parent: HTMLElement, { view, saves }: RunnerSnapshot): void {
  const { allowed, reason, visible } = view.saving
  if (visible) {
    const save = add(parent, 'button', 'Save')
    save.disabled = !allowed
    if (reason) save.title = reason
    // Each save in a slot of its own, '1', '2', ..., named from view.when, such as "Day 2 · Tuesday morning · The Corner Café".
    save.onclick = () => void runner.save(nextSlot(saves))
  }
  // The snapshot lists the saves, and the runner hands a new one after every save and delete.
  const list = add(parent, 'ul', '', 'slots')
  for (const entry of saves) {
    const row = add(list, 'li')
    // A save that can't be read says why, and can only be deleted.
    add(row, 'span', 'broken' in entry ? entry.broken : entry.name)
    if (!('broken' in entry)) add(row, 'button', 'Load').onclick = () => void runner.load(entry.slot)
    add(row, 'button', 'Delete').onclick = () => void runner.saves?.remove(entry.slot)
  }
}
