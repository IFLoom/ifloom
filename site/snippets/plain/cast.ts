import type { RunnerSnapshot } from '@ifloom/engine'
// add and drawChoices, as in the vanilla template's src/main.ts.
import { add, drawChoices } from './runner.ts'

/** Who's here, each with their face and their Talk button, then everyone you've met. */
export function drawPeople(parent: HTMLElement, { view }: RunnerSnapshot): void {
  const cast = view.plugins.cast
  if (!cast) return
  for (const person of cast.present) {
    const card = add(parent, 'div', '', 'person')
    card.dataset.person = person.ref
    if (person.portrait) Object.assign(add(card, 'img'), { src: person.portrait, alt: '' })
    add(card, 'strong', person.name)
    if (person.description) add(card, 'span', person.description)
    drawChoices(card, person.actions)
  }
  const met = cast.people.filter((person) => person.met)
  if (!met.length) return
  add(parent, 'h3', 'People you know')
  const list = add(parent, 'ul')
  for (const person of met) add(list, 'li', person.here ? `${person.fullName} (here)` : person.fullName)
}
