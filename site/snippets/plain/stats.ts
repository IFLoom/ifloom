import type { View } from '@ifloom/engine'
// add, as in the vanilla template's src/main.ts.
import { add } from './runner.ts'

/** The listed stats: each label and value, a bar from min to max, and how far to the next level. */
export function drawStats(parent: HTMLElement, view: View): void {
  const list = add(parent, 'dl', '', 'stats')
  for (const stat of view.stats) {
    add(list, 'dt', stat.level ? `${stat.label} (level ${stat.level.level})` : stat.label)
    const value = add(list, 'dd', stat.text)
    const bar = add(value, 'meter')
    Object.assign(bar, { min: stat.min, max: stat.max, value: stat.value })
    // Towards the next level, from 0 to 1; there's no next one at the top.
    if (stat.level?.next != null) Object.assign(add(value, 'progress'), { max: 1, value: stat.level.progress })
  }
}
