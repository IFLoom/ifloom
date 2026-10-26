import type { RunnerSnapshot } from '@ifloom/engine'
// add and drawChoices, as in the vanilla template's src/main.ts.
import { add, drawChoices } from './runner.ts'

/** What you have on, slot by slot, with a button to take each thing off, and what else you could wear. */
export function drawWardrobe(parent: HTMLElement, { view }: RunnerSnapshot): void {
  const wardrobe = view.plugins.wardrobe
  if (!wardrobe) return
  for (const slot of wardrobe.slots) {
    const row = add(parent, 'div', '', 'slot')
    add(row, 'span', `${slot.label}: ${slot.name ?? 'nothing'}`)
    // Ready-made buttons, worded by the plugin's strings: Take off, Wear raincoat.
    if (slot.takeOff) drawChoices(row, [slot.takeOff])
  }
  drawChoices(
    parent,
    wardrobe.spare.map((spare) => spare.wear),
  )
}
