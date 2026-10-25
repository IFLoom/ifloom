import type { View } from '@ifloom/engine'
import { debug } from '@ifloom/plugin-debug'
// runner and add, as in the vanilla template's src/main.ts.
import { add, runner } from './runner.ts'

/** What a debugger wants on screen: the save's seed, the locks that are on, the triggers fired, and a few commands that ignore locks. */
export function drawDebug(parent: HTMLElement, view: View): void {
  const shown = view.plugins.debug
  if (!shown) return
  add(parent, 'p', `Seed ${shown.seed}`)
  for (const lock of shown.locks) add(parent, 'p', `Locked: ${lock.reason} (${lock.deny.join(', ')})`, 'lock')
  add(parent, 'p', `Triggers fired: ${Object.keys(shown.fired).join(', ') || 'none'}`)
  add(parent, 'button', '100 coins').onclick = () => runner.apply(debug.stat('coins', 100))
  add(parent, 'button', 'Close the scene').onclick = () => runner.apply(debug.scene())
}
