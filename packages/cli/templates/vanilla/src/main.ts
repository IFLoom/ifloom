/**
 * The game drawn with plain DOM, no framework. The whole loop is: ask the
 * runner for the view, draw it, send a command when a button is pressed, and
 * draw again when the state changes. Any framework can do the same.
 */
import {
  browserRunner,
  type InlineSpan,
  type InputView,
  type MinigameView,
  type OpenPanel,
  type RenderedChoice,
  type SceneBeat,
  type View,
} from '@ifloom/engine'
import { startAudio } from '@ifloom/audio'
import { startClock, startKeys } from '@ifloom/browser'
import loaded from './game.ts'
import { layout, section } from './layout.ts'
import './styles.css'

const { game, problems } = loaded
if (problems.length) console.warn(problems)

// A new game with a random seed, undo, saves in localStorage and an autosave each turn.
const runner = await browserRunner(game)

// Plays what the game's `audio` asks for, from the first click or key press.
startAudio(runner)
// Ticks the game's timers and a minigame's, and maps the keyboard: 1 to 9 pick the choices, and a minigame's keys press its inputs.
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

/** The story's region, where the scene is drawn. */
let story = root

function draw(view: View): void {
  const regions = layout(root)
  story = regions.story

  // The side column: the title, the time if a plugin says, and the stats in a section that folds.
  add(regions.sidebar, 'h1', view.title)
  if (view.when) add(regions.sidebar, 'p', view.when, 'clock')
  if (view.stats.length) {
    const stats = add(section(regions.sidebar, 'stats', 'Stats'), 'dl', '', 'stats')
    for (const stat of view.stats) {
      add(stats, 'dt', stat.label)
      add(stats, 'dd', stat.text)
    }
  }
  drawSaves(section(regions.sidebar, 'saves', 'Saves'), view)

  // While a minigame runs, the scene's title and beats are the minigame's.
  if (view.scene.title) add(story, 'h2', view.scene.title)
  const prose = add(story, 'div', '', 'prose')
  for (const beat of view.scene.beats) drawBeat(prose, beat)
  if (view.minigame) drawMinigame(view.minigame)

  const inputs = add(story, 'div', '', 'inputs')
  for (const input of Object.values(view.inputs)) drawInput(inputs, input)

  drawChoices(add(story, 'div', '', 'choices'), view.scene.choices)
  // The bottom of the story: the game's own buttons and its plugins', such as a place's exits and things to do.
  if (view.actions.length) drawChoices(story.appendChild(regions.bottom), view.actions)

  // A panel content opened, such as a shop's counter, over everything else.
  if (view.panel) drawPanel(view.panel)
}

/** What happened the last time the save slot was used. */
let said = ''

/** One save slot. While the game's `saveable` refuses saving, Save is greyed out with why (`hide` leaves it off). */
function drawSaves(parent: HTMLElement, view: View): void {
  const row = add(parent, 'div', '', 'saves')
  const { allowed, reason, visible } = view.saving
  if (visible) {
    const save = add(row, 'button', 'Save')
    save.disabled = !allowed
    if (reason) save.title = reason
    save.onclick = async () => {
      const saved = await runner.save('quick')
      said = saved.ok ? 'Saved.' : saved.reason
      draw(runner.view())
    }
    if (reason) add(parent, 'p', reason, 'reason')
  }
  add(row, 'button', 'Load').onclick = async () => {
    const loaded = await runner.load('quick')
    said = loaded.ok ? 'Loaded.' : loaded.reason
    // A load draws again by itself; a refusal doesn't.
    if (!loaded.ok) draw(runner.view())
  }
  if (said) add(parent, 'p', said, 'said')
}

/** Buttons that send their commands, each greyed out with its reason when it can't be pressed. */
function drawChoices(parent: HTMLElement, choices: RenderedChoice[]): void {
  for (const choice of choices) {
    const button = add(parent, 'button', choice.label)
    button.disabled = Boolean(choice.disabled)
    if (choice.disabled) button.title = choice.disabled
    button.onclick = () => runner.apply(choice.command)
    // Why it can't be pressed, such as "You need 4 coins."
    if (choice.disabled) add(parent, 'p', choice.disabled, 'reason')
  }
}

/** One paragraph of a scene: narration, a spoken line, a picture, a letter. A sound beat is heard, not drawn. */
function drawBeat(parent: HTMLElement, beat: SceneBeat): void {
  switch (beat.kind) {
    case 'text':
      drawLine(add(parent, 'p'), beat.text, beat.spans)
      break
    case 'mono':
      add(parent, 'p', beat.text, 'beat-mono')
      break
    case 'say':
      drawLine(add(parent, 'p', '', 'beat-say'), beat.text, beat.spans).dataset.who = beat.who
      break
    case 'image':
      Object.assign(add(parent, 'img', '', 'beat-image'), { src: beat.src, alt: beat.alt ?? '' })
      break
    case 'video':
      Object.assign(add(parent, 'video', '', 'beat-image'), {
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
      const mail = add(parent, 'div', '', 'beat-prop')
      for (const line of beat.headers) add(mail, 'p', `${line.key}: ${line.value}`)
      add(mail, 'p', beat.body)
      break
    }
    case 'prop':
      add(parent, 'div', beat.text, 'beat-prop')
      break
  }
}

let notes = 0

/**
 * A line's words, with bold and italics, and its inline actions and tooltips as buttons in it. A
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
    if (span.kind === 'bold' || span.kind === 'italic') {
      add(line, span.kind === 'bold' ? 'strong' : 'em', span.text)
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
  const box = add(story, 'section', '', 'minigame')
  box.dataset.state = minigame.state
  if (minigame.timeLeft !== null && minigame.timeTotal) {
    const timer = add(box, 'div', '', 'timer')
    timer.setAttribute('role', 'progressbar')
    timer.setAttribute('aria-label', 'Time left')
    add(timer, 'span').style.transform = `scaleX(${minigame.timeLeft / minigame.timeTotal})`
  }
  const inputs = add(box, 'div', '', 'choices')
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
