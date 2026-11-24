// src/main.ts: the vanilla template's start, cut down to the loop.
import type { RenderedChoice, RunnerSnapshot } from '@ifloom/engine'
import { startAudio } from '@ifloom/audio'
import { browserRunner, startClock, startKeys } from '@ifloom/browser'
import module from './game.ts'

// The game module builds the game, and lists what the loader found wrong with it.
const { game, problems } = module.build()
if (problems.length) console.warn(problems)

// A new game with a random seed, undo, saves in localStorage and an autosave each turn.
const runner = await browserRunner(game)

// Each helper follows the runner by itself. startAudio plays view.audio from the first click or key press,
// startClock ticks the timers and minigames, and startKeys presses the choices on 1 to 9.
startAudio(runner)
startClock(runner)
startKeys(runner)

const root = document.querySelector<HTMLElement>('#root')!

/** An element with a class and some text, added to `parent`. The text goes in as textContent, so prose can't add markup. */
function add<K extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: K, text = '', className = ''): HTMLElementTagNameMap[K] {
  const element = parent.appendChild(document.createElement(tag))
  if (text) element.textContent = text
  if (className) element.className = className
  return element
}

/** Buttons that send their commands, each greyed out with its reason when it can't be pressed. */
function drawChoices(parent: HTMLElement, choices: RenderedChoice[]): void {
  for (const choice of choices) {
    const button = add(parent, 'button', choice.label)
    button.disabled = Boolean(choice.disabled)
    if (choice.disabled) button.title = choice.disabled
    button.onclick = () => runner.apply(choice.command)
    if (choice.disabled) add(parent, 'p', choice.disabled, 'reason')
  }
}

/** The whole screen, rendered again from each snapshot. */
function draw({ view }: RunnerSnapshot): void {
  root.replaceChildren()
  add(root, 'h1', view.title)
  if (view.scene.title) add(root, 'h2', view.scene.title)
  for (const beat of view.scene.beats) if (beat.type === 'text' || beat.type === 'say') add(root, 'p', beat.text)
  // The open scene's choices, or the room's actions while no scene is open.
  drawChoices(add(root, 'div', '', 'choices'), [...view.scene.choices, ...view.actions])
  add(root, 'p', view.stats.map((stat) => `${stat.label}: ${stat.text}`).join(' · '), 'stats')
}

// Render again whenever the runner hands over a new snapshot.
runner.subscribe(draw)
draw(runner.snapshot())
