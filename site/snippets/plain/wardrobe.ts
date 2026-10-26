import type { RunnerSnapshot } from '@ifloom/engine'
// runner and add, as in the vanilla template's src/main.ts.
import { add, runner } from './runner.ts'

/** What you have on, slot by slot, with a button to take each thing off, and what else you could wear. */
export function drawWardrobe(parent: HTMLElement, { view }: RunnerSnapshot): void {
  const wardrobe = view.plugins.wardrobe
  if (!wardrobe) return
  for (const slot of wardrobe.slots) {
    const row = add(parent, 'div', '', 'slot')
    add(row, 'span', `${slot.label}: ${slot.name ?? 'nothing'}`)
    if (slot.entity) add(row, 'button', 'Take off').onclick = () => runner.apply({ 'wardrobe/takeOff': { id: slot.id } })
  }
  for (const spare of wardrobe.spare) {
    add(parent, 'button', `Wear the ${spare.name}`).onclick = () => runner.apply({ 'wardrobe/wear': { id: spare.entity } })
  }
}
