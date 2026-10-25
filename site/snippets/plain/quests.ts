import type { View } from '@ifloom/engine'
// runner and add, as in the vanilla template's src/main.ts.
import { add, runner } from './runner.ts'

/** The quest log: the active quests, the pinned one first, each with its hint and how far along it is, then the finished ones. */
export function drawQuests(parent: HTMLElement, view: View): void {
  const quests = view.plugins.quests
  if (!quests) return
  for (const quest of quests.active) {
    const entry = add(parent, 'section', '', 'quest')
    if (quest.updated) entry.dataset.updated = ''
    add(entry, 'h3', `${quest.name} (${quest.stage} of ${quest.stages})`)
    add(entry, 'p', quest.hint)
    // Pin it, so it comes first; pressing it again unpins.
    add(entry, 'button', quest.tracked ? 'Unpin' : 'Pin').onclick = () => runner.apply({ 'quests/track': quest.tracked ? {} : { id: quest.id } })
  }
  if (quests.done.length) add(parent, 'p', `Done: ${quests.done.map((quest) => quest.name).join(', ')}`, 'done')
  // Looking at the log clears the "updated" marks.
  if (quests.updates) add(parent, 'button', 'Mark all read').onclick = () => runner.apply({ 'quests/seen': {} })
}
