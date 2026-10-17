/**
 * The game drawn with plain DOM, no framework. The whole loop is: ask the
 * runner for the view, draw it, send a command when a button is pressed, and
 * draw again when the state changes. Any framework can do the same.
 */
import { browserRunner, type InlineSpan, type InputView, type MinigameView, type OpenPanel, type SceneBeat, type View } from '@ifloom/engine'
import { startAudio } from '@ifloom/audio'
import { startClock, startKeys } from '@ifloom/browser'
import loaded from './game.ts'
import './styles.css'

const { game, problems } = loaded
if (problems.length) console.warn(problems)

// A new game with a random seed, undo, saves in localStorage and an autosave each turn.
const runner = await browserRunner(game)

// Plays what the game's `audio` asks for, from the first click or key press.
startAudio(runner)
// Ticks a minigame's timers, and maps the keyboard: 1 to 9 pick the choices, and a minigame's keys press its inputs.
startClock(runner)
startKeys(runner)

const root = document.querySelector<HTMLElement>('#root')!

/** An element with a class and some text, added to `parent`. */
function add<K extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: K, text = '', className = ''): HTMLElementTagNameMap[K] {
  const element = parent.appendChild(document.createElement(tag))
  if (text) element.textContent = text
  if (className) element.className = className
  return element
}

function draw(view: View): void {
  root.replaceChildren()
  add(root, 'h1', view.title)

  // While a minigame runs, the scene's title and beats are the minigame's.
  if (view.scene.title) add(root, 'h2', view.scene.title)
  for (const beat of view.scene.beats) drawBeat(beat)
  if (view.minigame) drawMinigame(view.minigame)

  const inputs = add(root, 'div', '', 'inputs')
  for (const input of Object.values(view.inputs)) drawInput(inputs, input)

  const choices = add(root, 'div', '', 'choices')
  // A scene's choices, or the game's own buttons when no scene is open.
  for (const choice of [...view.scene.choices, ...view.actions]) {
    const button = add(choices, 'button', choice.label)
    button.disabled = Boolean(choice.disabled)
    if (choice.disabled) button.title = choice.disabled
    button.onclick = () => runner.apply(choice.command)
    // Why it can't be pressed, such as "You need 4 coins."
    if (choice.disabled) add(choices, 'p', choice.disabled, 'reason')
  }

  add(root, 'p', view.stats.map((stat) => `${stat.label}: ${stat.text}`).join(' · '), 'stats')

  // A panel content opened, such as a shop's counter, over everything else.
  if (view.panel) drawPanel(view.panel)
}

/** One paragraph of a scene: narration, a spoken line, a picture, a letter. A sound beat is heard, not drawn. */
function drawBeat(beat: SceneBeat): void {
  switch (beat.kind) {
    case 'text':
      drawLine(add(root, 'p'), beat.text, beat.spans)
      break
    case 'mono':
      add(root, 'p', beat.text, 'beat-mono')
      break
    case 'say':
      drawLine(add(root, 'p', '', 'beat-say'), beat.text, beat.spans).dataset.who = beat.who
      break
    case 'image':
      Object.assign(add(root, 'img', '', 'beat-image'), { src: beat.src, alt: beat.alt ?? '' })
      break
    case 'video':
      Object.assign(add(root, 'video', '', 'beat-image'), {
        src: beat.src,
        poster: beat.poster ?? '',
        autoplay: beat.autoplay,
        loop: beat.loop,
        muted: beat.muted,
        controls: beat.controls,
        playsInline: true,
      })
      break
    case 'mail': {
      const mail = add(root, 'div', '', 'beat-prop')
      for (const line of beat.headers) add(mail, 'p', `${line.key}: ${line.value}`)
      add(mail, 'p', beat.body)
      break
    }
    case 'prop':
      add(root, 'div', beat.text, 'beat-prop')
      break
  }
}

let notes = 0

/**
 * A line's words, with its inline actions and tooltips as buttons in it. A
 * tooltip, or a greyed-out action's reason, is a note after the button that
 * shows on hover, on focus and on a tap (see `.note` in styles.css).
 */
function drawLine(line: HTMLElement, text: string, spans: InlineSpan[] | undefined): HTMLElement {
  if (!spans) {
    line.textContent = text
    return line
  }
  for (const span of spans) {
    if (span.kind === 'text') {
      line.append(span.text)
      continue
    }
    const button = add(line, 'button', span.text, span.kind === 'tip' ? 'tip' : 'inline-action')
    button.type = 'button'
    const note = span.kind === 'tip' ? span.tip : span.choice.disabled
    if (span.kind === 'action') {
      // Greyed out but still focusable, so its reason can be read.
      if (span.choice.disabled) button.setAttribute('aria-disabled', 'true')
      else button.onclick = () => runner.apply(span.choice.command)
    }
    if (!note) continue
    const id = `note-${(notes += 1)}`
    const shown = add(line, 'span', note, 'note')
    Object.assign(shown, { id, role: 'tooltip' })
    button.setAttribute('aria-describedby', id)
    button.setAttribute('aria-expanded', 'false')
    if (!button.onclick) button.onclick = () => button.setAttribute('aria-expanded', String(button.getAttribute('aria-expanded') !== 'true'))
  }
  return line
}

/** A value the game asks for, such as the player's name. What they enter goes back as an `input` command. */
function drawInput(parent: HTMLElement, input: InputView): void {
  if (input.kind === 'choice') {
    for (const option of input.options) {
      add(parent, 'button', option.label).onclick = () => runner.apply({ type: 'input', id: input.id, to: option.value })
    }
    return
  }
  const form = add(parent, 'form')
  const label = add(form, 'label', input.label)
  const field = add(label, 'input')
  field.type = input.kind === 'number' ? 'number' : 'text'
  field.value = input.value === null ? '' : String(input.value)
  if (input.maxLength !== null) field.maxLength = input.maxLength
  if (input.min !== null) field.min = String(input.min)
  if (input.max !== null) field.max = String(input.max)
  add(form, 'button', 'OK').type = 'submit'
  form.onsubmit = (event) => {
    event.preventDefault()
    runner.apply({ type: 'input', id: input.id, to: input.kind === 'number' ? Number(field.value) : field.value })
  }
}

/** The minigame being played: a bar counting down its timer, and a button for each input that does something now. */
function drawMinigame(minigame: MinigameView): void {
  const section = add(root, 'section', '', 'minigame')
  section.dataset.state = minigame.state
  if (minigame.timeLeft !== null && minigame.timeTotal) {
    const timer = add(section, 'div', '', 'timer')
    timer.setAttribute('role', 'progressbar')
    timer.setAttribute('aria-label', 'Time left')
    add(timer, 'span').style.transform = `scaleX(${minigame.timeLeft / minigame.timeTotal})`
  }
  const inputs = add(section, 'div', '', 'choices')
  for (const input of minigame.inputs) add(inputs, 'button', input).onclick = () => runner.apply({ type: 'minigame', input })
}

/**
 * The panel content opened (`{ kind: 'panel', panel, with }`) over the story: a shop's counter, a job board.
 * Draw each one your game opens by its name, from what it was opened with; closing it sends `closePanel`.
 */
function drawPanel(panel: OpenPanel): void {
  const dialog = add(root, 'section', '', 'panel')
  dialog.setAttribute('role', 'dialog')
  dialog.setAttribute('aria-modal', 'true')
  dialog.setAttribute('aria-label', panel.panel)
  dialog.dataset.panel = panel.panel
  const box = add(dialog, 'div')
  add(box, 'h2', panel.panel)
  add(box, 'pre', JSON.stringify(panel.with, null, 2))
  add(box, 'button', 'Close').onclick = () => runner.apply({ type: 'closePanel' })
}

runner.subscribe(() => draw(runner.view()))
draw(runner.view())
