import type { View } from '@ifloom/engine'
// add and drawChoices, as in the vanilla template's src/main.ts.
import { add, drawChoices } from './runner.ts'

/** What you hold, each thing with a button to use it, when it has a use, and one to drop it. */
export function drawInventory(parent: HTMLElement, view: View): void {
  const inventory = view.plugins.inventory
  if (!inventory) return
  for (const thing of inventory.things) {
    const row = add(parent, 'div', '', 'thing')
    add(row, 'span', thing.count > 1 ? `${thing.name} ×${thing.count}` : thing.name).title = thing.description ?? ''
    drawChoices(row, thing.use ? [thing.use, thing.drop] : [thing.drop])
  }
}
