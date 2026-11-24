---
title: "A UI from scratch"
description: "The worked example of the Engine track: a whole game UI in plain JS and DOM, with no framework, explained line by line from the vanilla template, then given undo, saves and a text-size setting, with @ifloom/browser and @ifloom/audio."
---
You'll build a complete UI for a game in plain JS, with no framework and no UI package. The code is the `vanilla` template's `src/main.ts`, taken a piece at a time. At the end you'll add an undo button, saves and a setting to it.

It uses only what [Running a game](/docs/guide/running-a-game) and [Saves and settings](/docs/guide/saves-and-settings) covered, plus two small helper packages that work with any UI:

- [`@ifloom/audio`](/docs/browser/audio-player) plays the game's music and sounds.
- [`@ifloom/browser`](/docs/browser) runs a minigame's clock and the keyboard shortcuts, and numbers new save slots.

The same UI in React, Vue and Svelte is in [Your own UI in any framework](/docs/guide/frameworks). Read this page first if you want to know what each part is for.

## Start from the template

```sh
npm create ifloom@latest my-game -- --template vanilla
cd my-game
npm install
npm run dev
```

`my-game` has the game in `src/game.ts`, which puts together the content in `src/world/` and `src/story/`, a plain stylesheet in `src/styles.css`, an `index.html` with an empty `<div id="root">`, and the UI in `src/main.ts`. Open `src/main.ts` beside this page.

## 1. The runner and the helpers

```ts
import { browserRunner, startClock, startKeys } from '@ifloom/browser'
import type { InlineSpan, InputView, MinigameView, SceneBeat, View } from '@ifloom/engine'
import { startAudio } from '@ifloom/audio'
import module from './game.ts'
import './styles.css'

// The game module builds the game, and says what the loader found wrong with it.
const { game, problems } = module.build()
if (problems.length) console.warn(problems)

// A new game with a random seed, undo, saves in localStorage and an autosave each turn.
const runner = await browserRunner(game)

// Plays what the game's `audio` asks for, from the first click or key press.
startAudio(runner)
// Ticks the game's timers and a minigame's, and maps the keyboard: 1 to 9 pick the choices, and a minigame's keys press its inputs.
startClock(runner)
startKeys(runner)
```

`module.build()` is what [`loadGame`](/docs/reference/loader#loadgame) returns in `src/game.ts`'s [game module](/docs/cli#the-game-module): the game, and anything wrong with its content. `npm run check` prints the same problems, so the warning is only a reminder.

The three `start…` calls each follow the runner by themselves, so you call them once and forget them:

- [`startAudio`](/docs/browser/audio-player#startaudio) reads `view.audio` after every change and plays what it asks for. Browsers don't allow sound before the player has clicked or pressed a key, so nothing plays until then.
- [`startClock`](/docs/browser#startclock) sends a [`tick`](/docs/reference/commands#tick) about every 100 ms while a [timer](/docs/reference/timers) or a minigame's timer runs. The engine keeps no clock of its own.
- [`startKeys`](/docs/browser#startkeys) maps the number keys to the choices on screen, and a minigame's keys to its inputs.

Each returns a function that stops it, if you ever need to.

## 2. A helper for elements

```ts continues
const root = document.querySelector<HTMLElement>('#root')!

/** An element with a class and some text, added to `parent`. */
function add<K extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: K, text = '', className = ''): HTMLElementTagNameMap[K] {
  const element = parent.appendChild(document.createElement(tag))
  if (text) element.textContent = text
  if (className) element.className = className
  return element
}
```

Everything the UI draws goes inside `#root`. `add` keeps the drawing code short. It sets `textContent`, never `innerHTML`, so nothing in the game's prose can inject markup.

## 3. Draw the screen

```ts continues
function draw(view: View): void {
  root.replaceChildren()
  add(root, 'h1', view.title)

  // While a minigame runs, the scene's title and beats are the minigame's.
  if (view.scene.title) add(root, 'h2', view.scene.title)
  for (const beat of view.scene.beats) drawBeat(beat)
  if (view.minigame) drawMinigame(view.minigame)

  const inputs = add(root, 'div', '', 'inputs')
  for (const input of view.inputs) drawInput(inputs, input)

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
}
```

`draw` empties the page and draws the whole view again. For a page this size that's fast enough, and it means there's no old state on screen to keep in step.

It draws, in order:

- **The game's title and the scene's.** With no scene open, `view.scene` is the room the player is in, when a plugin such as places has one.
- **The beats**, the scene's paragraphs (step 4).
- **The minigame**, if one is running (step 7).
- **The inputs**, any values the game is asking for, such as a name (step 6).
- **The buttons.** A scene's `choices` while one is open, otherwise the idle screen's `actions`. Only one of the two has anything in it at a time. Each button sends its own `command`. A greyed-out one shows its reason, because a player who can see why can plan for it.
- **The stats**, already formatted by the game, such as `5c`.

It never decides what can be pressed. The view has already worked that out, and the engine would refuse the same command for the same reason.

## 4. Beats

```ts continues
/** One paragraph of a scene: narration, a spoken line, a picture, a letter. A sound beat is heard, not drawn. */
function drawBeat(beat: SceneBeat): void {
  switch (beat.type) {
    case 'text':
      drawLine(add(root, 'p'), beat.text, beat.spans)
      break
    case 'say': {
      const line = add(root, 'p', '', 'beat-say')
      line.dataset.who = beat.who
      // Who says it, over the words: a name the engine worked out from the speaker's entity, or the player's.
      if (beat.name) add(line, 'span', beat.name, 'speaker-name')
      drawLine(add(line, 'span'), beat.text, beat.spans)
      break
    }
    case 'image':
      Object.assign(add(root, 'img', '', 'beat-image'), { src: beat.src, alt: beat.alt ?? '' })
      break
    // 'video' and 'chose' in the template
  }
}
```

The engine has already split the prose into [beats](/docs/reference/prose#scenebeat), so the UI never parses text. Each kind has its own look: narration, a monospaced line, a spoken line with who says it, a picture, a video, a letter with its headers, a prop such as a note. The template draws each one, and you can drop any your game doesn't use. A `sound` beat isn't drawn. The audio player plays it.

## 5. Actions and tooltips inside the text

`drawLine` writes a line's words, with any [inline actions and tooltips](/docs/reference/prose#inline-actions-and-tooltips) in it as buttons. A line with neither is just text:

```ts continues
function drawLine(line: HTMLElement, text: string, spans: InlineSpan[] | undefined): HTMLElement {
  if (!spans) {
    line.textContent = text
    return line
  }
  for (const span of spans) {
    if (span.type === 'text') {
      line.append(span.text)
      continue
    }
    const button = add(line, 'button', span.text, span.type === 'tip' ? 'tip' : 'inline-action')
    // ...
  }
  return line
}
```

An `action` span carries a choice, with its command and its reason, like the buttons in step 3. A `tip` span carries a note. The template shows a tooltip, or a greyed-out action's reason, after the button on hover, on focus and on a tap, and links the two with `aria-describedby` so a screen reader says it. [Inline actions](/docs/recipes/inline-actions) goes through it in full.

## 6. Inputs

```ts continues
/** A value the game asks for, such as the player's name. What they enter goes back as an `input` command. */
function drawInput(parent: HTMLElement, input: InputView): void {
  if (input.type === 'choice') {
    for (const option of input.options) {
      add(parent, 'button', option.label).onclick = () => runner.apply({ type: 'input', id: input.id, to: option.value })
    }
    return
  }
  const form = add(parent, 'form')
  const label = add(form, 'label', input.label)
  const field = add(label, 'input')
  field.type = input.type === 'number' ? 'number' : 'text'
  field.value = input.value === null ? '' : String(input.value)
  if (input.maxLength !== null) field.maxLength = input.maxLength
  if (input.min !== null) field.min = String(input.min)
  if (input.max !== null) field.max = String(input.max)
  add(form, 'button', 'OK').type = 'submit'
  form.onsubmit = (event) => {
    event.preventDefault()
    runner.apply({ type: 'input', id: input.id, to: input.type === 'number' ? Number(field.value) : field.value })
  }
}
```

An [input](/docs/reference/inputs) is a value the game asks for. It's in the view only while its `when` holds, so a name box disappears once there's a name. The UI sends what the player entered as an `input` command, and the engine writes it to the kv key the input names. The view gives the field's limits, so the browser can enforce them too.

## 7. Minigames

```ts continues
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
  for (const input of minigame.inputs) add(inputs, 'button', input.label).onclick = () => runner.apply(input.command)
}
```

A [minigame](/docs/reference/minigames) is a small state machine the game declares, such as a timed round at the café counter. While one runs, the scene's title and beats are its words, and `view.minigame` has the inputs that do something now and the time left. The clock from step 1 keeps the timer moving, and each tick redraws the bar. The [Minigames recipe](/docs/recipes/minigames) draws a panel of its own for one.

## 8. Draw again on every change

```ts continues
runner.subscribe(({ view }) => draw(view))
draw(runner.view())
```

That's the whole loop. Every button sends a command, the runner calls the listener when the state changes, and the listener draws the new view. Undo, a load and the clock's ticks go through the same listener.

## 9. Add undo and saves

The template has no menu. Add one at the end of `draw`, before the stats:

```ts fragment
  const menu = add(root, 'nav', '', 'menu')
  const undo = add(menu, 'button', 'Undo')
  undo.disabled = !runner.snapshot().canUndo
  undo.onclick = () => runner.undo()

  add(menu, 'button', 'Save').onclick = async () => {
    const saved = await runner.save(nextSlot(runner.snapshot().saves))
    showMessage(saved.ok ? `Saved as ${saved.value.name}.` : saved.reason)
  }

  add(menu, 'button', 'Continue').onclick = async () => {
    const latest = runner.snapshot().saves.find((entry) => !('broken' in entry))
    if (!latest) return showMessage('Nothing is saved yet.')
    const loaded = await runner.load(latest.slot)
    if (!loaded.ok) showMessage(loaded.reason)
  }
```

with `nextSlot` imported beside the clock and keys, and a small message line:

```ts
import { nextSlot, startClock, startKeys } from '@ifloom/browser'

const message = document.createElement('p')
message.setAttribute('role', 'status')
document.body.append(message)
const showMessage = (text: string) => (message.textContent = text)
```

`browserRunner` gave the runner undo, saves and an autosave each turn, so there's nothing else to set up. The snapshot's `saves` lists the newest save first, the autosave included, and the runner keeps it up to date, so Continue picks up wherever the player was. A load calls the listener, so the page redraws by itself.

## 10. Add a setting

Say the game declares a `textSize` ui setting, as in [Saves and settings](/docs/guide/saves-and-settings#settings). Draw a button for it in the menu, and copy its value onto the page where the stylesheet can use it:

```ts fragment
  const large = runner.snapshot().settings.textSize === 'large'
  add(menu, 'button', large ? 'Smaller text' : 'Larger text').onclick = () => {
    const result = runner.setSetting('textSize', large ? 'normal' : 'large')
    if (!result.ok) showMessage(result.reason)
  }
  document.documentElement.dataset.textSize = String(runner.snapshot().settings.textSize)
```

```css
/* src/styles.css */
html[data-text-size='large'] { font-size: 120%; }
```

A ui setting changes no game state, but the runner still calls your listener when one changes, so `draw` runs and the button and the page update. For a full settings screen, loop over `view.settings`.

## 11. Sound you trigger yourself

`startAudio` plays everything the view asks for. Keep the player it returns if you want to play something on demand, such as a spoken line again:

```ts fragment
import { audioSrc } from '@ifloom/engine'

const player = startAudio(runner)

// In drawBeat, for a 'say' beat with a voice:
const track = beat.voice ? game.audio?.tracks[beat.voice] : undefined
if (track && 'src' in track) add(root, 'button', 'Play again').onclick = () => player.play(audioSrc(track.src), 'voice', track.volume ?? 1)
```

The player also reads the game's volume and mute settings from the runner, so a volume setting works with no code of yours. See [The audio player](/docs/browser/audio-player).

## Where next

- [Your own UI in any framework](/docs/guide/frameworks) has this same UI in React, Vue and Svelte, piece by piece.
- [Testing your game](/docs/guide/testing) checks the game itself, with no page at all.
- The recipes build the common pieces in every framework: a [HUD](/docs/recipes/hud), a [title screen](/docs/recipes/title-screen), [plugin panels](/docs/recipes/plugin-ui) and [transitions](/docs/recipes/transitions).
