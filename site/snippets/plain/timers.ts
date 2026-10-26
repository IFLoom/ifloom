import type { RunnerSnapshot } from '@ifloom/engine'
// add, as in the vanilla template's src/main.ts, which runs startClock(runner) to send the ticks.
import { add } from './runner.ts'

/** A countdown for each running timer: its label, a bar that empties, and the seconds left. */
export function drawTimers(parent: HTMLElement, { view }: RunnerSnapshot): void {
  for (const timer of view.timers) {
    const box = add(parent, 'div', '', 'timer')
    box.dataset.timer = timer.id
    // A quarter or less left: draw it as urgent.
    if (timer.left <= timer.total / 4) box.dataset.urgent = ''
    if (timer.label) add(box, 'span', timer.label, 'timer-label')
    Object.assign(add(box, 'progress'), { max: timer.total, value: timer.left })
    add(box, 'span', `${Math.ceil(timer.left / 1000)}s`, 'timer-left')
  }
}
