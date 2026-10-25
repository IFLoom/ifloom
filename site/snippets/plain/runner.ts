/**
 * What the Plain JS snippets share, copied from the vanilla template's
 * `src/main.ts`: the runner, `add` and `drawChoices`. The template makes its
 * runner with `browserRunner`, which keeps saves in the browser; here it's
 * `createRunner` on a new game, so the tests start each file fresh.
 */
import { createRunner, startingState, type RenderedChoice } from '@ifloom/engine'
import module from './game.ts'

const { game } = module.build()

export const runner = createRunner(game, startingState(game))

/** An element with a class and some text, added to `parent`. */
export function add<K extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: K, text = '', className = ''): HTMLElementTagNameMap[K] {
  const element = parent.appendChild(document.createElement(tag))
  if (text) element.textContent = text
  if (className) element.className = className
  return element
}

/** Buttons that send their commands, each greyed out with its reason when it can't be pressed. */
export function drawChoices(parent: HTMLElement, choices: RenderedChoice[]): void {
  for (const choice of choices) {
    const button = add(parent, 'button', choice.label)
    button.disabled = Boolean(choice.disabled)
    if (choice.disabled) button.title = choice.disabled
    button.onclick = () => runner.apply(choice.command)
    // Why it can't be pressed, such as "You need 4 coins."
    if (choice.disabled) add(parent, 'p', choice.disabled, 'reason')
  }
}
