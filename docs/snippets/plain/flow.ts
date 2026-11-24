import type { RunnerSnapshot } from '@ifloom/engine'
// add and drawChoices, as in the vanilla template's src/main.ts.
import { add, drawChoices } from './runner.ts'

/** A flowing scene: everything up to where it stopped, the choices made on the way, a fold's beats together, and the decision it's waiting on. */
export function drawFlow(parent: HTMLElement, { view }: RunnerSnapshot): void {
  const prose = add(parent, 'div', '', 'prose')
  // The fold the beats are going into: a <details> the player opens and shuts, under the fold's words.
  let fold: { label: string; body: HTMLElement } | null = null
  view.scene.beats.forEach((beat, at) => {
    const label = beat.section?.fold
    if (typeof label !== 'string') fold = null
    else if (fold?.label !== label) {
      const details = add(prose, 'details')
      add(details, 'summary', label)
      fold = { label, body: details }
    }
    const into = fold?.body ?? prose
    const shown =
      beat.type === 'chose' ? add(into, 'p', beat.label, 'beat-chose') : beat.type === 'text' || beat.type === 'say' ? add(into, 'p', beat.text) : null
    // What the last choice brought, from `fresh` on, to fade in; what came before stays still.
    if (shown && at >= view.scene.fresh && view.scene.fresh > 0) shown.classList.add('fresh')
  })
  drawChoices(add(parent, 'div', '', 'choices'), view.scene.choices)
}
