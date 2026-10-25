import type { View } from '@ifloom/engine'
// add, as in the vanilla template's src/main.ts.
import { add } from './runner.ts'

/** Every achievement, earned or not, with progress towards the ones that count. A secret one reads ??? until it's earned. */
export function drawAchievements(parent: HTMLElement, view: View): void {
  const achievements = view.plugins.achievements
  if (!achievements) return
  add(parent, 'h3', `Achievements: ${achievements.earned} of ${achievements.total}`)
  const list = add(parent, 'ul', '', 'achievements')
  for (const entry of achievements.achievements) {
    const item = add(list, 'li', entry.name)
    if (entry.earned) item.dataset.earned = ''
    if (entry.description) add(item, 'p', entry.description)
    if (entry.progress) Object.assign(add(item, 'progress'), { max: entry.progress.target, value: entry.progress.value })
  }
}
