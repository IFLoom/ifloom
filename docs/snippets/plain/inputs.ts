import type { InputView, RunnerSnapshot } from '@ifloom/engine'
// runner and add, as in the vanilla template's src/main.ts.
import { add, runner } from './runner.ts'

/** The inputs on offer now, such as the cat's name. What the player enters goes back as an `input` command. */
export function drawInputs(parent: HTMLElement, { view }: RunnerSnapshot): void {
  for (const input of view.inputs) drawInput(add(parent, 'div', '', 'input'), input)
}

function drawInput(parent: HTMLElement, input: InputView): void {
  if (input.type === 'choice') {
    for (const option of input.options) {
      add(parent, 'button', option.label).onclick = () => runner.apply({ type: 'input', id: input.id, to: option.value })
    }
    return
  }
  const form = add(parent, 'form')
  const field = add(add(form, 'label', input.label), 'input')
  field.type = input.type === 'number' ? 'number' : 'text'
  field.value = input.value === null ? '' : String(input.value)
  if (input.maxLength !== null) field.maxLength = input.maxLength
  if (input.min !== null) field.min = String(input.min)
  if (input.max !== null) field.max = String(input.max)
  add(form, 'button', 'OK').type = 'submit'
  form.onsubmit = (event) => {
    event.preventDefault()
    // A value that breaks the input's rules is refused with why, such as "Up to 16 letters."
    const sent = runner.apply({ type: 'input', id: input.id, to: input.type === 'number' ? Number(field.value) : field.value })
    if (!sent.ok) add(form, 'p', sent.reason, 'reason')
  }
}
