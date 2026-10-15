/**
 * The game drawn with plain DOM, no framework. The whole loop is: ask the
 * runner for the view, draw it, send a command when a button is pressed, and
 * draw again when the state changes. Any framework can do the same.
 */
import { browserRunner, type View } from '@ifloom/engine'
import loaded from './game.ts'
import './styles.css'

const { game, problems } = loaded
if (problems.length) console.warn(problems)

// A new game with a random seed, undo, saves in localStorage and an autosave each turn.
const runner = browserRunner(game)

const root = document.querySelector<HTMLElement>('#root')!

function draw(view: View): void {
  root.replaceChildren()
  const title = root.appendChild(document.createElement('h1'))
  title.textContent = view.title

  if (view.scene.title) root.appendChild(document.createElement('h2')).textContent = view.scene.title
  for (const paragraph of view.scene.body.split('\n\n')) {
    root.appendChild(document.createElement('p')).textContent = paragraph
  }

  const choices = root.appendChild(document.createElement('div'))
  choices.className = 'choices'
  // A scene's choices, or the game's own buttons when no scene is open.
  for (const choice of [...view.scene.choices, ...view.actions]) {
    const button = choices.appendChild(document.createElement('button'))
    button.textContent = choice.label
    button.disabled = Boolean(choice.disabled)
    if (choice.disabled) button.title = choice.disabled
    button.onclick = () => runner.apply(choice.command)
  }

  const stats = root.appendChild(document.createElement('p'))
  stats.className = 'stats'
  stats.textContent = view.stats.map((stat) => `${stat.label}: ${stat.text}`).join(' · ')
}

runner.subscribe(() => draw(runner.view()))
draw(runner.view())
