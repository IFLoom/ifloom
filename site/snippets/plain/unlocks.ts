import type { View } from '@ifloom/engine'
// add, as in the vanilla template's src/main.ts.
import { add } from './runner.ts'

/** The unlocks, with which the player has. Entering a code is enterCode, on this page under Entering a code. */
export function drawUnlocks(parent: HTMLElement, view: View): void {
  const unlocks = view.plugins.unlocks
  if (!unlocks?.total) return
  add(parent, 'h3', `Unlocked ${unlocks.unlocked} of ${unlocks.total}`)
  const list = add(parent, 'ul', '', 'unlocks')
  for (const unlock of unlocks.unlocks) {
    const item = add(list, 'li', `${unlock.name}: ${unlock.unlocked ? 'unlocked' : 'locked'}`)
    item.title = unlock.description
  }
}
