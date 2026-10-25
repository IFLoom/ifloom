import type { View } from '@ifloom/engine'
// add and drawChoices, as in the vanilla template's src/main.ts.
import { add, drawChoices } from './runner.ts'

/** A flowing scene: everything up to where it stopped, the picks made on the way, and the decision it's waiting on. */
export function drawFlow(parent: HTMLElement, view: View): void {
  const prose = add(parent, 'div', '', 'prose')
  view.scene.beats.forEach((beat, at) => {
    const shown =
      beat.type === 'chose' ? add(prose, 'p', beat.label, 'beat-chose') : beat.type === 'text' || beat.type === 'say' ? add(prose, 'p', beat.text) : null
    // What the last pick brought, from `fresh` on, to fade in; what came before stays still.
    if (shown && at >= view.scene.fresh && view.scene.fresh > 0) shown.classList.add('fresh')
  })
  drawChoices(add(parent, 'div', '', 'choices'), view.scene.choices)
}
