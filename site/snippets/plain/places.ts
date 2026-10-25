import type { View } from '@ifloom/engine'
// add and drawChoices, as in the vanilla template's src/main.ts.
import { add, drawChoices } from './runner.ts'

/** Where you are: the place's name and picture, the ways out, and what lies here to pick up. */
export function drawPlace(parent: HTMLElement, view: View): void {
  const places = view.plugins.places
  if (!places?.location) return
  const { location } = places
  add(parent, 'h3', location.name)
  if (location.image) Object.assign(add(parent, 'img'), { src: location.image, alt: '' })
  // Each exit is a button like any other, greyed out with why it can't be taken.
  if (places.exits.length) drawChoices(add(parent, 'nav', '', 'exits'), places.exits)
  for (const thing of places.things) {
    const row = add(parent, 'div', '', 'lying')
    add(row, 'span', thing.count > 1 ? `${thing.name} ×${thing.count}` : thing.name)
    drawChoices(row, [thing.pickUp])
  }
}
