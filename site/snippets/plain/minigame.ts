import type { RunnerSnapshot } from '@ifloom/engine'
// add and drawChoices, as in the vanilla template's src/main.ts, which runs startClock(runner) to send the ticks.
import { add, drawChoices } from './runner.ts'

/** The minigame being played, under the scene's title and beats (its words): a bar counting down its timer, and a button for each input that does something now. */
export function drawMinigame(parent: HTMLElement, { view }: RunnerSnapshot): void {
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
  // Each input is a button like any other, labelled by the game's minigame.<input> strings: Up, Space.
  drawChoices(add(box, 'div', '', 'choices'), minigame.inputs)
}
