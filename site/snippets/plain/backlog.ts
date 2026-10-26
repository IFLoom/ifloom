import type { RunnerSnapshot } from '@ifloom/engine'
// runner and add, as in the vanilla template's src/main.ts. The runner's backlog is on: browserRunner(game, { backlog: true }).
import { add, runner } from './runner.ts'

/** What was shown, oldest first, each scene's choice after its words, and a button that steps back one command. */
export function drawBacklog(parent: HTMLElement, { backlog, canUndo }: RunnerSnapshot): void {
  const undo = add(parent, 'button', 'Undo')
  undo.disabled = !canUndo
  undo.onclick = () => runner.undo()
  const list = add(parent, 'ol', '', 'backlog')
  for (const entry of backlog) {
    const item = add(list, 'li')
    add(item, 'h3', entry.title)
    for (const beat of entry.beats) if (beat.type === 'text' || beat.type === 'say') add(item, 'p', beat.text)
    if (entry.chose) add(item, 'p', entry.chose, 'chose')
  }
}
