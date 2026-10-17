---
title: "Your first story"
description: A step-by-step tutorial that builds a short linear story with no plugins, from one scene to a name input, a remembered choice, a counter and chapters as turns, then draws it in the browser with plain DOM, React, Vue or Svelte.
---
This page builds a short story in three chapters, called The Last Bus. You wait for the last bus in the rain with a stranger, find your bus pass has run out, and walk home. What you do at the stop changes what happens on the bus, and how you talk your way past the driver changes how the evening ends.

It's the smallest shape of game IFLoom makes. It uses no plugins, so there's no map or clock to set up. Along the way you'll use:

- scenes and choices, with their words kept apart by key
- a stat
- a choice the story remembers later
- a counter
- a name the player types
- a turn for each chapter

The finished game is one file, `src/game.ts`, plus a page that draws it. The whole file is at the [end of the page](#the-whole-thing). [The Letter](/docs/guide/shapes#a-linear-novel-the-letter), in `examples/novel`, is a slightly longer story built the same way.

To try the same ideas without installing anything, open the [editor](/docs/guide/editor) in your browser. It builds scenes, choices and stats from forms, and exports a pack you can bring back to this page.

## Before you start

Follow [Installation](/docs/guide/installation) as far as cloning the repository and running `npm install`. Then, from the root of the checkout, make a new game from the template for the way you want to draw it:

```sh tab="Plain JS" tab-group="framework"
npm run new -- my-story --template vanilla
npm install
npm run dev -w my-story
```

```sh tab="React" tab-group="framework"
npm run new -- my-story
npm install
npm run dev -w my-story
```

```sh tab="Vue" tab-group="framework"
npm run new -- my-story --template vue
npm install
npm run dev -w my-story
```

```sh tab="Svelte" tab-group="framework"
npm run new -- my-story --template svelte
npm install
npm run dev -w my-story
```

The default `blank` template draws the game with the [React UI](/docs/react). The others draw it themselves with no React. Pick the tab you want here and the rest of the docs show the same one.

That gives you `games/my-story`, with a two-scene game in `src/game.ts` and the code that draws it. Open the address Vite prints, and keep `npm run dev -w my-story` running in a terminal. The game reloads each time you save a file.

You'll replace `src/game.ts` as you go, and leave the other files as they are.

## 1. One scene

A game is one or more packs of content that [`loadGame`](/docs/reference/loader#loadgame) merges. Start with a pack holding one scene, and the words it shows. Replace everything in `src/game.ts` with this:

```ts
// src/game.ts
import { SCHEMA, loadGame, type Pack } from '@ifloom/engine'

const story: Pack = {
  id: 'story',
  schema: SCHEMA,
  scenes: [
    {
      id: 'ch1.stop',
      title: 'Chapter one: the stop',
      body: [{ text: 'ch1.stop' }],
      choices: [],
    },
  ],
  prose: {
    'ch1.stop': 'Rain, and the last bus is late. A man in a thin jacket shelters beside you under half an umbrella.',
  },
}

export default loadGame([story], { id: 'last-bus', title: 'The Last Bus', introScene: 'ch1.stop' })
```

The scene is a [data scene](/docs/reference/scenes#datascene). Its `body` is a list of blocks, and `{ text: 'ch1.stop' }` shows the prose stored under the key `ch1.stop`. Keeping the words apart from the structure means the loader can check that every key has words, and a translation can replace them.

`loadGame` takes the packs and a base with the game's `id` and `title`. `introScene` is the scene on screen when a new game starts. `schema: SCHEMA` says which version of the pack format you wrote against.

The default export is what the [CLI](/docs/cli) reads: `loadGame` returns `{ game, problems }`, and `npm run check -w my-story` prints each problem, or `No problems.` when there are none.

## 2. Choices

A scene moves on through its choices. Each choice has an `id` and a list of [effects](/docs/reference/effects) that run when the player picks it. `{ kind: 'scene', id }` opens another scene.

Add a second chapter, and two ways to get there:

```ts
scenes: [
  {
    id: 'ch1.stop',
    title: 'Chapter one: the stop',
    body: [{ text: 'ch1.stop' }],
    choices: [
      { id: 'share', effects: [{ kind: 'scene', id: 'ch2.bus' }] },
      { id: 'keep', effects: [{ kind: 'scene', id: 'ch2.bus' }] },
    ],
  },
  {
    id: 'ch2.bus',
    title: 'Chapter two: the bus',
    body: [{ text: 'ch2.bus' }],
    choices: [],
  },
],
prose: {
  'ch1.stop': 'Rain, and the last bus is late. A man in a thin jacket shelters beside you under half an umbrella.',
  'ch1.stop#share': 'Hold the umbrella over both of you',
  'ch1.stop#keep': 'Keep the umbrella to yourself',
  'ch2.bus': 'The bus comes at last. At the front, the driver looks at your card and shakes her head. "That one’s run out, love."',
},
```

A choice's label is the prose under `scene#choice`, so `ch1.stop#share` labels the `share` choice. A scene with no choices left is an ending, so the player sees the second chapter and nothing more for now.

If you misspell a scene id or forget a label, `npm run check -w my-story` says which scene and which key. The full list is under [the checks](/docs/reference/checks).

## 3. A stat

A [stat](/docs/reference/stats) is a number the game keeps for the player. The engine doesn't define any, so you declare each one in the pack. This story keeps one, `warmth`, for how kind the player has been:

```ts
stats: [{ id: 'warmth', label: 'Warmth', start: 0, max: 3 }],
```

Sharing the umbrella raises it. Put the stat effect before the scene change:

```ts
{ id: 'share', effects: [{ kind: 'stat', key: 'warmth', by: 1 }, { kind: 'scene', id: 'ch2.bus' }] },
```

A stat stays between its `min` (0 unless you say) and its `max`. Every template shows it under the story.

## 4. A choice the story remembers

The engine counts every choice the player takes, by `scene/choice`. A later scene can ask about an earlier choice with the [`{ chose }`](/docs/reference/conditions#chose) condition, so you don't need to set a variable for it.

Give the second chapter a line for each choice at the stop. A block with a `when` only shows while its condition holds:

```ts
body: [
  { text: 'ch2.bus' },
  { text: 'ch2.bus/shared', when: { chose: 'ch1.stop/share' } },
  { text: 'ch2.bus/kept', when: { chose: 'ch1.stop/keep' } },
],
```

```ts
'ch2.bus/shared': 'Behind you, the man from the stop is still drying his glasses on his scarf.',
'ch2.bus/kept': 'Behind you, the man from the stop is wringing out his sleeves.',
```

A choice can have a `when` too. A choice whose condition doesn't hold isn't offered at all.

## 5. A counter

Now the driver. The player can pay, make an excuse, or, if they shared the umbrella, claim the stranger is paying. Each excuse adds to a variable called `excuses`. Variables are the game's own named values, kept in `state.flags`. The `flag` effect sets one, or with `add`, adds to its number:

```ts
choices: [
  { id: 'pay', effects: [{ kind: 'stat', key: 'warmth', by: 1 }, { kind: 'scene', id: 'ch3.home' }] },
  { id: 'excuse', effects: [{ kind: 'flag', key: 'excuses', add: 1 }, { kind: 'scene', id: 'ch3.home' }] },
  {
    id: 'blame',
    when: { chose: 'ch1.stop/share' },
    effects: [{ kind: 'flag', key: 'excuses', add: 2 }, { kind: 'scene', id: 'ch3.home' }],
  },
],
```

The third chapter reads the count back with a range. `lt`, `is` and `gte` are three of the [range](/docs/reference/conditions#range) keys:

```ts
{
  id: 'ch3.home',
  title: 'Chapter three: home',
  body: [
    { text: 'ch3.home' },
    { text: 'ch3.home/none', when: { flag: 'excuses', lt: 1 } },
    { text: 'ch3.home/one', when: { flag: 'excuses', is: 1 } },
    { text: 'ch3.home/more', when: { flag: 'excuses', gte: 2 } },
  ],
  choices: [
    { id: 'wave', when: { stat: 'warmth', gte: 2 }, effects: [{ kind: 'scene', id: 'end.wave' }] },
    { id: 'door', effects: [{ kind: 'scene', id: 'end.door' }] },
  ],
},
{ id: 'end.wave', title: 'The end', body: [{ text: 'end.wave' }], choices: [] },
{ id: 'end.door', title: 'The end', body: [{ text: 'end.door' }], choices: [] },
```

A variable that was never set counts as 0, so the honest player's line needs nothing written first. The `wave` ending uses the stat. Only a player who shared the umbrella and paid the fare has a warmth of 2.

## 6. A name the player types

An [input](/docs/reference/inputs) asks the player for a value and writes it to a variable. This one asks for a name, writes it to `playerName` (the input's id), and is only offered until a name has been given:

```ts
inputs: [{ id: 'playerName', label: 'Your name', kind: 'text', maxLength: 20, when: { not: { flag: 'playerName' } } }],
```

`{ flag: 'playerName' }` holds once the variable has a value, so `{ not: … }` hides the input after that. The prose prints any variable by name with a token, `{{playerName}}`:

```ts
'ch1.stop/named': 'He nods at you, {{playerName}}, as if he knows you from somewhere.',
```

Show that line, and hold the first chapter's choices back, until the name is in:

```ts
body: [{ text: 'ch1.stop' }, { text: 'ch1.stop/named', when: { flag: 'playerName' } }],
choices: [
  { id: 'share', when: { flag: 'playerName' }, effects: [/* … */] },
  { id: 'keep', when: { flag: 'playerName' }, effects: [/* … */] },
],
```

Saves use `playerName` too. A save's [`SaveMeta`](/docs/reference/saves#savemeta) has a `player` field, read from that variable, for a load screen to show.

## 7. A chapter is a turn

The engine dates things in turns. `state.turn` starts at 0, and the `turn` effect, `{ kind: 'turn' }`, ends one. Your game decides how long a turn is. In this story it's a chapter, so every choice that moves to the next chapter ends a turn before it changes the scene:

```ts
{ id: 'keep', when: { flag: 'playerName' }, effects: [{ kind: 'turn' }, { kind: 'scene', id: 'ch2.bus' }] },
```

Now `state.turn` is the chapter the player has reached, counting from 0. Anything else the engine dates, such as how many turns have passed [`since`](/docs/reference/conditions#since) a scene was seen, counts chapters. The saves menu names each save by its turn, and [`ifloom playtest`](/docs/cli#ifloom-playtest) writes its transcript a turn at a time.

## 8. Draw it

The engine has no UI of its own. Your template already has the code that draws the game, and you don't need to change it:

```ts tab="Plain JS" tab-group="framework"
// src/main.ts in the vanilla template, cut down to the scene and its choices
import { browserRunner, type View } from '@ifloom/engine'
import loaded from './game.ts'
import './styles.css'

const runner = browserRunner(loaded.game)
const root = document.querySelector<HTMLElement>('#root')!

function draw(view: View): void {
  root.replaceChildren()
  for (const beat of view.scene.beats) {
    if (beat.kind === 'text') root.append(Object.assign(document.createElement('p'), { textContent: beat.text }))
  }
  for (const choice of [...view.scene.choices, ...view.actions]) {
    const button = document.createElement('button')
    button.textContent = choice.label
    button.disabled = Boolean(choice.disabled)
    button.onclick = () => runner.apply(choice.command)
    root.append(button)
  }
}

// Draw again after every change of state.
runner.subscribe(() => draw(runner.view()))
draw(runner.view())
```

```ts tab="React" tab-group="framework"
// src/main.ts
import { READING_LAYOUT, mountGame } from '@ifloom/react'
import game from './game.ts'
import './styles.css'

// `pages` opens on a title screen with New game, Continue, Load and
// Settings. Leave it out to start straight in the story.
mountGame(game, { layout: READING_LAYOUT, pages: true })
```

```ts tab="Vue" tab-group="framework"
// src/runner.ts
import { shallowRef } from 'vue'
import { browserRunner } from '@ifloom/engine'
import loaded from './game.ts'

export const runner = browserRunner(loaded.game)

// The view as Vue state, replaced after every change of state.
export const view = shallowRef(runner.view())
runner.subscribe(() => {
  view.value = runner.view()
})

// src/main.ts
import { createApp } from 'vue'
import App from './App.vue'
import './styles.css'

createApp(App).mount('#root')
```

```ts tab="Svelte" tab-group="framework"
// src/runner.ts
import { readable } from 'svelte/store'
import { browserRunner } from '@ifloom/engine'
import loaded from './game.ts'

export const runner = browserRunner(loaded.game)

// The view as a store, set again after every change of state.
export const view = readable(runner.view(), (set) => runner.subscribe(() => set(runner.view())))

// src/main.ts
import { mount } from 'svelte'
import App from './App.svelte'
import './styles.css'

mount(App, { target: document.querySelector('#root')! })
```

Every template starts the game the same way, with [`browserRunner`](/docs/reference/runner#browserrunner) (React's [`mountGame`](/docs/react#mountgame) calls it for you):

- It makes a new game with a random seed, so each playthrough's random draws are different.
- It builds a [runner](/docs/reference/runner), which keeps the state and adds undo, 50 steps back.
- It keeps saves in the browser's `localStorage`, under keys that start with the game's id, and autosaves to the `auto` slot each turn. In this story that's the start of each chapter.

Then the page draws `runner.view()`, sends the command of each button the player presses with `runner.apply`, and draws again when the runner says the state changed. The vanilla, Vue and Svelte templates also draw the name input and the stats, and [Using another framework](/docs/guide/frameworks) goes through their code piece by piece.

In the React template, `mountGame` also logs any problems `loadGame` found as warnings in the browser's console, and draws [`GameShell`](/docs/react#gameshell), the whole React UI, into the element with the id `root` in `index.html`. With `pages: true`, the page opens on a title screen. New game starts the story, and Continue appears once there's a save. [The title screen and settings](/docs/guide/title-screen) shows what else it can do. [`READING_LAYOUT`](/docs/react#layouts) is a single column to read, with the title over the scene, then the name input, the game's actions, the stats and the menu under it.

`src/styles.css` holds the page's look. In the React template it imports the React UI's styles and one of its theme presets, such as `paper`, a printed page with a serif font, and [Make it your own](/docs/react/customising) has the rest. In the others it's a plain stylesheet you can change as you like.

## 9. Check it and playtest it

```sh
npm run check -w my-story   # No problems.
```

If you misspelled a key or a scene id along the way, `check` names it.

A playtest plays the game with no one at the keyboard. It needs somewhere to start, and a new game would stop at the name input. So export a `start` from `src/game.ts`, a player who has already typed a name:

```ts
import { startingState, type Game } from '@ifloom/engine'

export const start = (game: Game) => startingState(game, { flags: { playerName: 'Sam' } })
```

Then run it:

```sh
npm run playtest -w my-story
```

The template's `playtest` script runs `ifloom playtest --turns 5 --out playtest/run.txt`. Read `games/my-story/playtest/run.txt`. It has every screen the [explorer](/docs/cli#explorer) saw, a turn at a time, and the commands it sent. Since a turn is a chapter here, that's chapter by chapter. Change `--turns` in `package.json` as your story grows.

When you're happy with it, `npm run build -w my-story` makes one HTML file in `games/my-story/dist/` that opens from disk. See [Shipping a game](/docs/guide/shipping).

To test the story in code, see `examples/novel/tests/novel.test.ts`. It plays The Letter with `apply` and checks the state and the view.

## The whole thing

```ts
// src/game.ts
import { SCHEMA, loadGame, startingState, type Game, type Pack } from '@ifloom/engine'

const story: Pack = {
  id: 'story',
  schema: SCHEMA,
  stats: [{ id: 'warmth', label: 'Warmth', start: 0, max: 3 }],
  inputs: [{ id: 'playerName', label: 'Your name', kind: 'text', maxLength: 20, when: { not: { flag: 'playerName' } } }],
  scenes: [
    {
      id: 'ch1.stop',
      title: 'Chapter one: the stop',
      body: [{ text: 'ch1.stop' }, { text: 'ch1.stop/named', when: { flag: 'playerName' } }],
      choices: [
        {
          id: 'share',
          when: { flag: 'playerName' },
          effects: [{ kind: 'stat', key: 'warmth', by: 1 }, { kind: 'turn' }, { kind: 'scene', id: 'ch2.bus' }],
        },
        { id: 'keep', when: { flag: 'playerName' }, effects: [{ kind: 'turn' }, { kind: 'scene', id: 'ch2.bus' }] },
      ],
    },
    {
      id: 'ch2.bus',
      title: 'Chapter two: the bus',
      body: [
        { text: 'ch2.bus' },
        { text: 'ch2.bus/shared', when: { chose: 'ch1.stop/share' } },
        { text: 'ch2.bus/kept', when: { chose: 'ch1.stop/keep' } },
      ],
      choices: [
        { id: 'pay', effects: [{ kind: 'stat', key: 'warmth', by: 1 }, { kind: 'turn' }, { kind: 'scene', id: 'ch3.home' }] },
        { id: 'excuse', effects: [{ kind: 'flag', key: 'excuses', add: 1 }, { kind: 'turn' }, { kind: 'scene', id: 'ch3.home' }] },
        {
          id: 'blame',
          when: { chose: 'ch1.stop/share' },
          effects: [{ kind: 'flag', key: 'excuses', add: 2 }, { kind: 'turn' }, { kind: 'scene', id: 'ch3.home' }],
        },
      ],
    },
    {
      id: 'ch3.home',
      title: 'Chapter three: home',
      body: [
        { text: 'ch3.home' },
        { text: 'ch3.home/none', when: { flag: 'excuses', lt: 1 } },
        { text: 'ch3.home/one', when: { flag: 'excuses', is: 1 } },
        { text: 'ch3.home/more', when: { flag: 'excuses', gte: 2 } },
      ],
      choices: [
        { id: 'wave', when: { stat: 'warmth', gte: 2 }, effects: [{ kind: 'scene', id: 'end.wave' }] },
        { id: 'door', effects: [{ kind: 'scene', id: 'end.door' }] },
      ],
    },
    { id: 'end.wave', title: 'The end', body: [{ text: 'end.wave' }], choices: [] },
    { id: 'end.door', title: 'The end', body: [{ text: 'end.door' }], choices: [] },
  ],
  prose: {
    'ch1.stop': 'Rain, and the last bus is late. A man in a thin jacket shelters beside you under half an umbrella.',
    'ch1.stop/named': 'He nods at you, {{playerName}}, as if he knows you from somewhere.',
    'ch1.stop#share': 'Hold the umbrella over both of you',
    'ch1.stop#keep': 'Keep the umbrella to yourself',
    'ch2.bus': 'The bus comes at last. At the front, the driver looks at your card and shakes her head. "That one’s run out, love."',
    'ch2.bus/shared': 'Behind you, the man from the stop is still drying his glasses on his scarf.',
    'ch2.bus/kept': 'Behind you, the man from the stop is wringing out his sleeves.',
    'ch2.bus#pay': 'Count out the fare in coins',
    'ch2.bus#excuse': '“It worked this morning.”',
    'ch2.bus#blame': '“He’s paying for me.”',
    'ch3.home': 'Your stop. The man gets off too, and turns up your street.',
    'ch3.home/none': 'The driver calls goodnight after you both.',
    'ch3.home/one': 'The driver watches you go and says nothing.',
    'ch3.home/more': 'The man gives you a long look and walks a little faster.',
    'ch3.home#wave': 'Wave him in for a cup of tea',
    'ch3.home#door': 'Let yourself in',
    'end.wave': 'He turns out to live two doors down. He brings biscuits next time.',
    'end.door': 'The kettle, the radiator, the rain on the window. You sleep well enough.',
  },
}

export default loadGame([story], { id: 'last-bus', title: 'The Last Bus', introScene: 'ch1.stop' })

/** Where `ifloom playtest` starts: a player who has already typed a name. */
export const start = (game: Game) => startingState(game, { flags: { playerName: 'Sam' } })
```

## Where next

- [The editor](/docs/guide/editor) builds scenes like these from forms in the browser, with the game playing beside them.
- [Shapes of game](/docs/guide/shapes) walks through The Letter, then a management game built on [entities](/docs/reference/entities).
- [A game with a world](/docs/guide/first-game) is the second tutorial. It adds a calendar, places and a character with the first-party plugins.
- [Core concepts](/docs/guide/concepts) explains the ideas behind what you just used.
- [Scenes](/docs/reference/scenes), [Conditions](/docs/reference/conditions) and [Effects](/docs/reference/effects) list everything a scene can do.
