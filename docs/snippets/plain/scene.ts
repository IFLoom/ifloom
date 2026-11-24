import type { SceneBeat, RunnerSnapshot } from '@ifloom/engine'
// runner, add and drawChoices, as in the vanilla template's src/main.ts.
import { add, drawChoices } from './runner.ts'

/** The story: the scene's title, its beats and its choices. With no scene open it's the room, whose buttons are view.actions. */
export function drawScene(parent: HTMLElement, { view }: RunnerSnapshot): void {
  if (view.scene.title) add(parent, 'h2', view.scene.title)
  const prose = add(parent, 'div', '', 'prose')
  for (const beat of view.scene.beats) drawBeat(prose, beat)
  drawChoices(add(parent, 'div', '', 'choices'), view.scene.choices)
}

/** One paragraph of a scene. A sound beat is heard, not rendered. */
function drawBeat(parent: HTMLElement, beat: SceneBeat): void {
  switch (beat.type) {
    case 'text':
      add(parent, 'p', beat.text)
      break
    case 'say': {
      // Who says it over the words. A quote that answers the line before names no one.
      const line = add(parent, 'p', '', 'beat-say')
      line.dataset.who = beat.who
      if (beat.name) add(line, 'span', beat.name, 'speaker-name')
      add(line, 'span', beat.text)
      break
    }
    case 'chose':
      // A pick made earlier in a flowing scene, where the decision was.
      add(parent, 'p', beat.label, 'beat-chose')
      break
    case 'image':
      Object.assign(add(parent, 'img', '', 'beat-image'), { src: beat.src, alt: beat.alt ?? '' })
      break
    case 'video':
      Object.assign(add(parent, 'video', '', 'beat-image'), {
        src: beat.src,
        autoplay: beat.autoplay,
        loop: beat.loop,
        muted: beat.muted,
        controls: beat.controls,
      })
      break
  }
}
