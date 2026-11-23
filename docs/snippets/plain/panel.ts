import type { RunnerSnapshot } from '@ifloom/engine'
// runner and add, as in the vanilla template's src/main.ts.
import { add, runner } from './runner.ts'
import { drawShop } from './shop.ts'

/** The panel open over the story, drawn by its name, with a Close button unless a scene holds it open. */
export function drawPanel(parent: HTMLElement, snapshot: RunnerSnapshot): void {
  const { view } = snapshot
  if (!view.panel) return
  const dialog = add(parent, 'section', '', 'panel')
  dialog.setAttribute('role', 'dialog')
  dialog.setAttribute('aria-label', view.panel.panel)
  const box = add(dialog, 'div')
  // The shop's counter (see the shop plugin's page); any other panel shows what it was opened with.
  if (view.panel.panel === 'shop') drawShop(box, snapshot)
  else add(box, 'pre', JSON.stringify(view.panel.with, null, 2))
  if (!view.panel.scene) add(box, 'button', 'Close').onclick = () => runner.apply({ type: 'closePanel' })
}
