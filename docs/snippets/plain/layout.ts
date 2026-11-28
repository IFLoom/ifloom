import type { RunnerSnapshot } from '@ifloom/engine'
// add, as in the vanilla template's src/main.ts. Each part below imports runner, add and drawChoices from there too.
import { add } from './runner.ts'
import { drawActions } from './actions.ts'
import { drawEntities } from './entities.ts'
import { drawInputs } from './inputs.ts'
import { drawNotices } from './notices.ts'
import { drawPanel } from './panel.ts'
import { drawScene } from './scene.ts'
import { drawStats } from './stats.ts'

/** The screen, put together from the parts on the Render it yourself pages: a side column, the story, the notices and any open panel. */
export function drawLayout(parent: HTMLElement, snapshot: RunnerSnapshot): void {
  parent.replaceChildren()
  const side = add(parent, 'aside', '', 'sidebar')
  add(side, 'h1', snapshot.view.title)
  drawStats(side, snapshot)
  drawEntities(side, snapshot)
  const story = add(parent, 'main', '', 'story')
  drawScene(story, snapshot)
  drawInputs(story, snapshot)
  drawActions(add(story, 'div', '', 'actions'), snapshot)
  drawNotices(parent, snapshot)
  drawPanel(parent, snapshot)
}
