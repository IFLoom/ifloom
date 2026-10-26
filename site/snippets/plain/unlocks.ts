import type { RunnerSnapshot } from '@ifloom/engine'
import { enterCode } from '@ifloom/plugin-unlocks'
// runner and add, as in the vanilla template's src/main.ts. Start codes there once, beside startClock: startUnlocks(runner).
import { add, runner } from './runner.ts'

/** A code box while codes have started, with where the last code stands, and the unlocks with which the player has. */
export function drawUnlocks(parent: HTMLElement, { view, helpers }: RunnerSnapshot): void {
  const unlocks = view.plugins.unlocks
  if (!unlocks?.total) return
  // What startUnlocks reports: idle, checking, wrong or unlocked. A new snapshot follows each change.
  const codes = helpers.unlocks
  if (codes) {
    const form = add(parent, 'form')
    const input = add(form, 'input')
    input.placeholder = 'Code'
    const button = add(form, 'button', codes.status === 'checking' ? 'Checking…' : 'Unlock')
    button.disabled = codes.status === 'checking'
    form.onsubmit = (event) => {
      event.preventDefault()
      void enterCode(runner, input.value)
    }
    if (codes.status === 'wrong') add(form, 'p', codes.reason ?? '', 'reason')
    if (codes.status === 'unlocked') add(form, 'p', `Unlocked: ${codes.entered?.name}.`)
  }
  add(parent, 'h3', `Unlocked ${unlocks.unlocked} of ${unlocks.total}`)
  const list = add(parent, 'ul', '', 'unlocks')
  for (const unlock of unlocks.unlocks) {
    const item = add(list, 'li', `${unlock.name}: ${unlock.unlocked ? 'unlocked' : 'locked'}`)
    item.title = unlock.description
  }
}
