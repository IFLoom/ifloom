// src/main.ts
import type { RenderedChoice, RunnerSnapshot } from '@ifloom/engine'
import { runner } from './runner.ts'
import './styles.css'

const root = document.querySelector<HTMLElement>('#root')!

/** An element with some text, added to `parent`. */
function add<K extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: K, text = ''): HTMLElementTagNameMap[K] {
  const element = parent.appendChild(document.createElement(tag))
  element.textContent = text
  return element
}

/** A button for each choice, greyed out with its reason when it can't be pressed. `who` goes before each label. */
function buttons(parent: HTMLElement, choices: readonly RenderedChoice[], who = ''): void {
  for (const choice of choices) {
    const button = add(parent, 'button', who ? `${who}: ${choice.label}` : choice.label)
    button.disabled = Boolean(choice.disabled)
    button.title = choice.disabled ?? ''
    button.onclick = () => runner.apply(choice.command)
  }
}

function draw({ view }: RunnerSnapshot): void {
  root.replaceChildren()
  if (view.when) add(root, 'p', view.when)
  add(root, 'h2', view.scene.title)
  // Who the scene is with, such as Ruth at the counter.
  if (view.scene.speaker) add(root, 'h3', view.scene.speaker.name)

  // Narration, and a spoken line, under the name of who says it when the line names them.
  for (const beat of view.scene.beats) {
    if (beat.type === 'text') add(root, 'p', beat.text)
    if (beat.type === 'say') add(root, 'p', beat.name ? `${beat.name}: “${beat.text}”` : `“${beat.text}”`)
  }

  // The scene's choices. With no scene open, the room's buttons and the game's.
  buttons(add(root, 'div'), [...view.scene.choices, ...view.actions])

  // With no scene open, the ways out, each labelled with where it goes,
  // and a Talk button for each person here, under their name ("Ruth: Talk").
  buttons(add(root, 'nav'), view.plugins.places?.exits ?? [])
  for (const person of view.plugins.cast?.present ?? []) buttons(add(root, 'div'), person.actions, person.name)

  add(root, 'p', view.stats.map((stat) => `${stat.label}: ${stat.text}`).join(' · '))
}

// Draw again after every change of state.
runner.subscribe(draw)
draw(runner.snapshot())
