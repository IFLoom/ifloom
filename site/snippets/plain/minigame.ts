import type { View } from '@ifloom/engine'
// runner and add, as in the vanilla template's src/main.ts, which runs startClock(runner) to send the ticks.
import { add, runner } from './runner.ts'

/** The minigame being played, under the scene's title and beats (its words): a bar counting down its timer, and a button for each input that does something now. */
export function drawMinigame(parent: HTMLElement, view: View): void {
  const minigame = view.minigame
  if (!minigame) return
  const box = add(parent, 'section', '', 'minigame')
  box.dataset.state = minigame.state
  if (minigame.timeLeft !== null && minigame.timeTotal) {
    const timer = add(box, 'div', '', 'timer')
    timer.setAttribute('role', 'progressbar')
    timer.setAttribute('aria-label', 'Time left')
    add(timer, 'span').style.transform = `scaleX(${minigame.timeLeft / minigame.timeTotal})`
  }
  const inputs = add(box, 'div', '', 'choices')
  for (const input of minigame.inputs) add(inputs, 'button', input).onclick = () => runner.apply({ type: 'minigame', input })
}
