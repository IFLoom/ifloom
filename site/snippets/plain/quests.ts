import type { RunnerSnapshot } from '@ifloom/engine'
// add and drawChoices, as in the vanilla template's src/main.ts.
import { add, drawChoices } from './runner.ts'

/** The quest log: the active quests, the tracked one first, each with its hint and how far along it is, then the finished ones. */
export function drawQuests(parent: HTMLElement, { view }: RunnerSnapshot): void {
  const quests = view.plugins.quests
  if (!quests) return
  for (const quest of quests.active) {
    const entry = add(parent, 'section', '', 'quest')
    if (quest.updated) entry.dataset.updated = ''
    add(entry, 'h3', `${quest.name} (${quest.stage} of ${quest.stages})`)
    add(entry, 'p', quest.hint)
    // Track it, so it comes first; the same button says Untrack once it's tracked.
    if (quest.track) drawChoices(entry, [quest.track])
  }
  if (quests.done.length) add(parent, 'p', `Done: ${quests.done.map((quest) => quest.name).join(', ')}`, 'done')
  // Mark all seen, while there is news: it clears the "updated" marks.
  if (quests.seen) drawChoices(parent, [quests.seen])
}
