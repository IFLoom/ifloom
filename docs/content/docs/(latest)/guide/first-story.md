---
title: "Your first story"
description: A step-by-step tutorial that builds a short linear story with no plugins, from one scene to a name input, a remembered choice, a counter and chapters as turns, then draws it in the browser with plain DOM, React, Vue or Svelte.
---
You'll build a short story in three chapters, called The Last Bus. You wait for the last bus in the rain with a stranger, find your bus pass has run out, and walk home. What you do at the stop changes what happens on the bus, and how you talk your way past the driver changes how the evening ends.

It's the smallest kind of game you can make with IFLoom. There are no plugins, so there's no map or clock to set up. Along the way you'll use:

- scenes and choices, with their words written in place
- a stat
- a choice the story remembers later
- a counter
- a name the player types
- a turn for each chapter

The finished game is three short files, plus a page that draws it: `src/story/opening.ts` holds the scenes and their words, `src/world/stats.ts` the stat, and `src/game.ts` puts them together. The whole thing is at the [end of the page](#the-whole-thing). [The Letter](/docs/guide/shapes#a-linear-novel-the-letter) is a slightly longer story built the same way, and `--template novel` starts a copy of it.

## Before you start

Make a new game from the template for the way you want to draw it (see [Installation](/docs/guide/installation) for pnpm, yarn and bun):

```sh tab="Plain JS" tab-group="framework"
npm create ifloom@latest my-story -- --template vanilla
cd my-story
npm install
npm run dev
```

```sh tab="React" tab-group="framework"
npm create ifloom@latest my-story
cd my-story
npm install
npm run dev
```

```sh tab="Vue" tab-group="framework"
npm create ifloom@latest my-story -- --template vue
cd my-story
npm install
npm run dev
```

```sh tab="Svelte" tab-group="framework"
npm create ifloom@latest my-story -- --template svelte
cd my-story
npm install
npm run dev
```

The default `react` template draws the game with the [React UI](/docs/reference/react). The others draw it themselves with no React. Pick the tab you want here and the rest of the docs show the same one.

That gives you a folder `my-story` with a two-scene game and the code that draws it. The game is in three files: `src/story/opening.ts` has the scenes and their words, `src/world/stats.ts` a stat, and `src/game.ts` puts them together. Open the address Vite prints, and keep `npm run dev` running in a terminal. The game reloads each time you save a file.

You'll replace those three files as you go, and leave the other files as they are. Why the game is split this way is on [Organising a game](/docs/guide/organising).

## 1. One scene

A game is [content](/docs/explanation/content-and-packs) that [`loadGame`](/docs/reference/content#loadgame) merges, split across the files in `src/story/` and `src/world/`. Each file exports a `Content` object. Start with one scene, and the words it shows. Replace everything in `src/story/opening.ts` with this:

```ts
// src/story/opening.ts
import { text, type Content } from '@ifloom/engine'

export const opening: Content = {
  introScene: 'ch1.stop',
  scenes: [
    {
      id: 'ch1.stop',
      title: 'Chapter one: the stop',
      body: [text('Rain, and the last bus is late. A man in a thin jacket shelters beside you under half an umbrella.')],
      choices: [],
    },
  ],
}
```

`introScene` is the scene on screen when a new game starts. Then replace `src/game.ts` with this, which gives the game its own id and title:

```ts
// src/game.ts
import { loadGame } from '@ifloom/engine'
import { defineGame } from '@ifloom/cli/game'
import { stats } from './world/stats.ts'
import { opening } from './story/opening.ts'

export default defineGame({
  build: () => loadGame([stats, opening], { id: 'last-bus', title: 'The Last Bus' }),
})
```

The scene is a [data scene](/docs/reference/scenes#datascene). Its `body` is a list of blocks, read top to bottom, and `text('…')` is a block of words, written where it's read. It's plain data, `{ text: '…' }`, which you can write by hand too. A blank line in the words starts a new paragraph.

The words are plain text, with `**bold**` and `*italic*` as in Markdown (see [Prose](/docs/reference/prose#bold-and-italics)). A translation can give every one of them other words later, with no change to this file (see [Translating a game](/docs/recipes/translating)).

`loadGame` takes your content, in a list, and a base with the game's `id` and `title`. Everything the story holds, its first scene included, is content. The base holds only what says which game this is, its plugins and its own code.

The default export is the [game module](/docs/cli#the-game-module), made with `defineGame`. Its `build` returns what `loadGame` returns, `{ game, problems }`. The page calls it to start the game, and `npm run check` calls it too and prints each problem, or `No problems.` when there are none.

The template's `game.ts` also had `probes`, and a `build` that takes `({ unlocked })`. This story needs neither yet, so the file above leaves them out. [Organising a game](/docs/guide/organising#the-layout) explains both.

## 2. Choices

A scene moves on through its choices. Each choice has an `id`, a `label` the player reads on its button, and a list of [effects](/docs/reference/effects) that run when the player picks it. `{ scene: 'ch2.bus' }` opens another scene.

Add a second chapter, and two ways to get there:

```ts fragment
scenes: [
  {
    id: 'ch1.stop',
    title: 'Chapter one: the stop',
    body: [text('Rain, and the last bus is late. A man in a thin jacket shelters beside you under half an umbrella.')],
    choices: [
      { id: 'share', label: 'Hold the umbrella over both of you', effects: [{ scene: 'ch2.bus' }] },
      { id: 'keep', label: 'Keep the umbrella to yourself', effects: [{ scene: 'ch2.bus' }] },
    ],
  },
  {
    id: 'ch2.bus',
    title: 'Chapter two: the bus',
    body: [text('The bus comes at last. At the front, the driver looks at your card and shakes her head. "That one’s run out, love."')],
    choices: [],
  },
],
```

A scene with no choices left is an ending, so the player sees the second chapter and nothing more for now.

If you misspell a scene id, `npm run check` says which scene names it. The full list is under [the checks](/docs/reference/checks).

A choice here moves the story to another scene. When you'd rather the scene carried on after the pick, with the player's answer and what it brings on the same page, write it as a [flowing scene](/docs/recipes/flowing-scenes): a decision partway through the body, with the words in place. The Letter's second chapter is one.

## 3. A stat

A [stat](/docs/reference/stats) is a number the game keeps for the player. The engine doesn't define any, so you declare each one. A stat is used all through the story, so it goes in `src/world/stats.ts`, the file for what the whole game shares. This story keeps one, `warmth`, for how kind the player has been. Replace the template's stat with it:

```ts
// src/world/stats.ts
import type { Content } from '@ifloom/engine'

export const stats: Content = {
  stats: [{ id: 'warmth', label: 'Warmth', start: 0, max: 3 }],
}
```

Sharing the umbrella raises it. Back in `src/story/opening.ts`, put the stat effect before the scene change in the `share` choice:

```ts fragment
{ id: 'share', label: 'Hold the umbrella over both of you', effects: [{ stat: 'warmth', by: 1 }, { scene: 'ch2.bus' }] },
```

A stat stays between its `min` (0 unless you say) and its `max`. Every template shows it in the side column, beside the story.

## 4. A choice the story remembers

The engine counts every choice the player takes, by `scene#choice`. A later scene can ask about an earlier choice with the [`{ chose }`](/docs/reference/conditions#chose) condition, so you don't need to record it yourself.

Give the second chapter a line for each choice at the stop. A block with a `when` only shows while its condition holds:

```ts fragment
body: [
  text('The bus comes at last. At the front, the driver looks at your card and shakes her head. "That one’s run out, love."'),
  text('Behind you, the man from the stop is still drying his glasses on his scarf.', { when: { chose: 'ch1.stop#share' } }),
  text('Behind you, the man from the stop is wringing out his sleeves.', { when: { chose: 'ch1.stop#keep' } }),
],
```

A choice can have a `when` too. A choice whose condition doesn't hold isn't offered at all.

## 5. A counter

Now the driver. The player can pay, make an excuse, or, if they shared the umbrella, claim the stranger is paying. Each excuse adds to a count called `excuses`, kept in the kv store. The kv store is where a game keeps named values of its own, each a true/false, a number or a text. It's part of the game's state, the one object that holds everything about a game in progress, and you'll see it written `state.kv` in code. ([The state is one plain object](/docs/guide/concepts#the-state-is-one-plain-object) says more.) The `kv` effect sets a key `to` a value, or changes its number `by` an amount:

```ts fragment
choices: [
  { id: 'pay', label: 'Count out the fare in coins', effects: [{ stat: 'warmth', by: 1 }, { scene: 'ch3.home' }] },
  { id: 'excuse', label: '“It worked this morning.”', effects: [{ kv: 'excuses', by: 1 }, { scene: 'ch3.home' }] },
  {
    id: 'blame',
    label: '“He’s paying for me.”',
    when: { chose: 'ch1.stop#share' },
    effects: [{ kv: 'excuses', by: 2 }, { scene: 'ch3.home' }],
  },
],
```

The third chapter reads the count back with a range. `lt`, `is` and `gte` are three of the [range](/docs/reference/common#range) keys. Add it and the two endings to the end of the `scenes` list, after the second chapter:

```ts fragment
{
  id: 'ch3.home',
  title: 'Chapter three: home',
  body: [
    text('Your stop. The man gets off too, and turns up your street.'),
    text('The driver calls goodnight after you both.', { when: { kv: 'excuses', lt: 1 } }),
    text('The driver watches you go and says nothing.', { when: { kv: 'excuses', is: 1 } }),
    text('The man gives you a long look and walks a little faster.', { when: { kv: 'excuses', gte: 2 } }),
  ],
  choices: [
    { id: 'wave', label: 'Wave him in for a cup of tea', when: { stat: 'warmth', gte: 2 }, effects: [{ scene: 'end.wave' }] },
    { id: 'door', label: 'Let yourself in', effects: [{ scene: 'end.door' }] },
  ],
},
{
  id: 'end.wave',
  title: 'The end',
  body: [text('He turns out to live two doors down. He brings biscuits next time.')],
  choices: [{ id: 'again', label: 'Start again', command: { type: 'newGame' }, effects: [] }],
},
{
  id: 'end.door',
  title: 'The end',
  body: [text('The kettle, the radiator, the rain on the window. You sleep well enough.')],
  choices: [{ id: 'again', label: 'Start again', command: { type: 'newGame' }, effects: [] }],
},
```

A key that was never set counts as 0, so the honest player's line needs nothing written first. The `wave` ending uses the stat. Only a player who shared the umbrella and paid the fare has a warmth of 2.

The two `end.` scenes are endings. The player reads the ending's words and sees its one button. A choice with a `command` sends that command when it's picked, and [`newGame`](/docs/reference/commands#newgame) starts the story over from the first scene, keeping the player's settings. An ending with `choices: []` works too, but then the page shows no button at all, and the player has to know to start again from a menu. [Endings](/docs/reference/scenes#endings) has more.

A story like this one keeps a scene on screen from the first chapter to an ending, because every choice opens another scene. The one command that closes a scene without a choice is [`leave`](/docs/reference/commands#leave), and nothing on this story's page sends it. If something does, a story with no places has no room to show, so the screen has the game's title and nothing to read or press. In a game with places, closing a scene shows the room the player is in, as [The scene and the room](/docs/guide/concepts#the-scene-and-the-room) shows.

## 6. A name the player types

An [input](/docs/reference/inputs) asks the player for a value and writes it to a key in the kv store. Inputs aren't part of a scene. They're a list of their own in the content, beside `scenes`, and the page shows each one while its `when` holds, whatever is on screen. This one asks for a name, writes it to `playerName` (the input's id), and is only offered until a name has been given. It goes in `src/story/opening.ts`, since the first scene is where it's asked:

```ts fragment
export const opening: Content = {
  introScene: 'ch1.stop',
  inputs: [{ id: 'playerName', label: 'Your name', type: 'text', maxLength: 20, when: { not: { kv: 'playerName' } } }],
  scenes: [
    // … the scenes, as before
  ],
}
```

`{ kv: 'playerName' }` holds once the key has a value, so `{ not: … }` hides the input after that. Words print any key by name with a token, `{{playerName}}`. Add a line that uses it, shown once the name is in, and hold the first chapter's choices back until then:

```ts fragment
body: [
  text('Rain, and the last bus is late. A man in a thin jacket shelters beside you under half an umbrella.'),
  text('He nods at you, {{playerName}}, as if he knows you from somewhere.', { when: { kv: 'playerName' } }),
],
choices: [
  { id: 'share', label: 'Hold the umbrella over both of you', when: { kv: 'playerName' }, effects: [/* … */] },
  { id: 'keep', label: 'Keep the umbrella to yourself', when: { kv: 'playerName' }, effects: [/* … */] },
],
```

A game can also name each save after the player from this same key, with [`saveName`](/docs/reference/rules#savename) in its rules, for a load screen of your own to show. This story has none, so it leaves that out.

## 7. A chapter is a turn

The engine dates things in turns. The turn is a number in the state, `state.turn`, that starts at 0, and the `turn` effect, `{ turn: true }`, ends one. Your game decides how long a turn is. In this story it's a chapter, so every choice that moves to the next chapter ends a turn before it changes the scene:

```ts fragment
{ id: 'keep', label: 'Keep the umbrella to yourself', when: { kv: 'playerName' }, effects: [{ turn: true }, { scene: 'ch2.bus' }] },
```

Effects run in the order they're written. Ending the turn first means the next chapter opens on the new turn, so whatever the new scene does or asks as it opens counts in its own chapter. Add `{ turn: true }` the same way to `share`, and to `pay`, `excuse` and `blame` in the second chapter.

Now `state.turn` is the chapter the player has reached, counting from 0, so the first chapter is turn 0 and the third is turn 2. What the player reads counts from 1: a save named by its turn says `Turn 1` in the first chapter, and the playtest transcript heads the chapters `Turn 1`, `Turn 2` and `Turn 3`. Anything else the engine dates, such as how many turns have passed [`since`](/docs/reference/conditions#since) a scene was seen, counts chapters. A save made with no name of its own is named by its turn, and [`ifloom playtest`](/docs/cli#ifloom-playtest) writes its transcript a turn at a time.

## 8. Draw it

The engine has no UI of its own. Your template already has the code that draws the game, and you don't need to change it. Here's what it does, cut down to what this story uses:

```ts tab="Plain JS" tab-group="framework"
// src/main.ts in the vanilla template, cut down to the scene, the name input and the choices
import { browserRunner } from '@ifloom/browser'
import type { InputView, View } from '@ifloom/engine'
import module from './game.ts'
import './styles.css'

const { game } = module.build()

const runner = await browserRunner(game)
const root = document.querySelector<HTMLElement>('#root')!

/** An element with some text, added to `parent`. */
function add<K extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: K, text = ''): HTMLElementTagNameMap[K] {
  const element = parent.appendChild(document.createElement(tag))
  element.textContent = text
  return element
}

/** A value the game asks for, such as the player's name. What they type goes back as an `input` command. */
function drawInput(input: InputView): void {
  const form = add(root, 'form')
  const field = add(add(form, 'label', input.label), 'input')
  add(form, 'button', 'OK')
  form.onsubmit = (event) => {
    event.preventDefault()
    runner.apply({ type: 'input', id: input.id, to: field.value })
  }
}

function draw(view: View): void {
  root.replaceChildren()
  add(root, 'h2', view.scene.title)
  for (const beat of view.scene.beats) {
    // Narration, and a spoken line: a paragraph that is all one quote.
    if (beat.type === 'text') add(root, 'p', beat.text)
    if (beat.type === 'say') add(root, 'p', `“${beat.text}”`)
  }
  for (const input of view.inputs) drawInput(input)
  for (const choice of [...view.scene.choices, ...view.actions]) {
    const button = add(root, 'button', choice.label)
    button.disabled = Boolean(choice.disabled)
    button.onclick = () => runner.apply(choice.command)
  }
}

// Draw again after every change of state.
runner.subscribe(({ view }) => draw(view))
draw(runner.view())
```

```ts tab="React" tab-group="framework"
// src/main.ts
import { mountGame } from '@ifloom/react'
import module from './game.ts'
import { Layout } from './layout.tsx'
import './styles.css'

// `layout` is the page, in `layout.tsx`. `pages` opens on a title screen
// with New game, Continue, Load and Settings. Leave it out to start straight
// in the story. `plugins` lists the UIs of the plugins in game.ts; this story has none.
mountGame(module.build(), { layout: Layout, pages: true, plugins: [] })
```

```ts tab="Vue" tab-group="framework"
// src/runner.ts, cut down to the runner and the view
import { computed, shallowRef } from 'vue'
import { browserRunner } from '@ifloom/browser'
import module from './game.ts'

const { game } = module.build()
export const runner = await browserRunner(game)

// The runner's snapshot as Vue state, replaced after every change of state.
export const snapshot = shallowRef(runner.snapshot())
runner.subscribe((next) => {
  snapshot.value = next
})
export const view = computed(() => snapshot.value.view)
```

```ts tab="Vue" tab-group="framework"
// src/main.ts
import { createApp } from 'vue'
import App from './App.vue'
import './styles.css'

createApp(App).mount('#root')
```

```ts fragment tab="Svelte" tab-group="framework"
// src/runner.ts, cut down to the runner and the view
import { derived, readable } from 'svelte/store'
import { browserRunner } from '@ifloom/browser'
import module from './game.ts'

const { game } = module.build()
export const runner = await browserRunner(game)

// The runner's snapshot as a store, set again after every change of state.
export const snapshot = readable(runner.snapshot(), (set) => runner.subscribe(set))
export const view = derived(snapshot, (now) => now.view)
```

```ts fragment tab="Svelte" tab-group="framework"
// src/main.ts
import { mount } from 'svelte'
import App from './App.svelte'
import './styles.css'

mount(App, { target: document.querySelector('#root')! })
```

Every template starts the game with [`browserRunner`](/docs/browser#browserrunner), which adds undo, saves and an autosave each chapter, and draws `runner.view()` again whenever the state changes ([Running a game](/docs/guide/running-a-game) goes through it). In the Vue and Svelte templates, `src/App.vue` or `src/App.svelte` draws the view from `runner.ts`, with a component for each part: a beat, an input, the minigame. In the React template, `src/layout.tsx` is the page and `src/styles.css` its look, and [Make it your own](/docs/reference/react/customising) covers both.

## 9. Check it and playtest it

```sh
npm run check   # No problems.
```

If you misspelled a scene id or a key along the way, `check` names it.

A playtest plays the game with no one at the keyboard, pressing what's on screen. It doesn't type, so a new game gives it nothing to press: the first chapter's choices wait for a name. It then sends [`leave`](/docs/reference/commands#leave), which closes the scene, and the rest of the transcript is the empty screen from step 5. So give the game module a `start`, a player who has already typed a name. `startingState` builds a new game, and its `kv` writes keys to the kv store before the first scene:

```ts
// src/game.ts
import { loadGame, startingState } from '@ifloom/engine'
import { defineGame } from '@ifloom/cli/game'
import { stats } from './world/stats.ts'
import { opening } from './story/opening.ts'

export default defineGame({
  build: () =>
    loadGame([stats, opening], {
      id: 'last-bus',
      title: 'The Last Bus',
    }),
  // Where `ifloom playtest` starts: a player who has already typed a name.
  start: (game) => startingState(game, { kv: { playerName: 'Sam' } }),
})
```

Then run it:

```sh
npm run playtest
```

The template's `playtest` script runs `ifloom playtest --turns 5 --out playtest/run.txt`. Read `playtest/run.txt`. It has every screen the [explorer](/docs/cli#explorer) saw, a turn at a time, and the commands it sent. Since a turn is a chapter here, that's chapter by chapter. Change `--turns` in `package.json` as your story grows.

When you're happy with it, `npm run build` makes one HTML file in `dist/` that opens from disk. See [Shipping a game](/docs/guide/shipping).

To test the story in code, see [Testing your game](/docs/guide/testing).

## The whole thing

The game is three files. `src/game.ts` puts it together:

```ts
// src/game.ts
import { loadGame, startingState } from '@ifloom/engine'
import { defineGame } from '@ifloom/cli/game'
import { stats } from './world/stats.ts'
import { opening } from './story/opening.ts'

export default defineGame({
  build: () =>
    loadGame([stats, opening], {
      id: 'last-bus',
      title: 'The Last Bus',
    }),
  /** Where `ifloom playtest` starts: a player who has already typed a name. */
  start: (game) => startingState(game, { kv: { playerName: 'Sam' } }),
})
```

`src/world/stats.ts` declares the stat:

```ts
// src/world/stats.ts
import type { Content } from '@ifloom/engine'

export const stats: Content = {
  stats: [{ id: 'warmth', label: 'Warmth', start: 0, max: 3 }],
}
```

And `src/story/opening.ts` is the story, its words written in its scenes:

```ts
// src/story/opening.ts
import { text, type Content } from '@ifloom/engine'

export const opening: Content = {
  introScene: 'ch1.stop',
  inputs: [{ id: 'playerName', label: 'Your name', type: 'text', maxLength: 20, when: { not: { kv: 'playerName' } } }],
  scenes: [
    {
      id: 'ch1.stop',
      title: 'Chapter one: the stop',
      body: [
        text('Rain, and the last bus is late. A man in a thin jacket shelters beside you under half an umbrella.'),
        text('He nods at you, {{playerName}}, as if he knows you from somewhere.', { when: { kv: 'playerName' } }),
      ],
      choices: [
        {
          id: 'share',
          label: 'Hold the umbrella over both of you',
          when: { kv: 'playerName' },
          effects: [{ stat: 'warmth', by: 1 }, { turn: true }, { scene: 'ch2.bus' }],
        },
        { id: 'keep', label: 'Keep the umbrella to yourself', when: { kv: 'playerName' }, effects: [{ turn: true }, { scene: 'ch2.bus' }] },
      ],
    },
    {
      id: 'ch2.bus',
      title: 'Chapter two: the bus',
      body: [
        text('The bus comes at last. At the front, the driver looks at your card and shakes her head. "That one’s run out, love."'),
        text('Behind you, the man from the stop is still drying his glasses on his scarf.', { when: { chose: 'ch1.stop#share' } }),
        text('Behind you, the man from the stop is wringing out his sleeves.', { when: { chose: 'ch1.stop#keep' } }),
      ],
      choices: [
        { id: 'pay', label: 'Count out the fare in coins', effects: [{ stat: 'warmth', by: 1 }, { turn: true }, { scene: 'ch3.home' }] },
        { id: 'excuse', label: '“It worked this morning.”', effects: [{ kv: 'excuses', by: 1 }, { turn: true }, { scene: 'ch3.home' }] },
        {
          id: 'blame',
          label: '“He’s paying for me.”',
          when: { chose: 'ch1.stop#share' },
          effects: [{ kv: 'excuses', by: 2 }, { turn: true }, { scene: 'ch3.home' }],
        },
      ],
    },
    {
      id: 'ch3.home',
      title: 'Chapter three: home',
      body: [
        text('Your stop. The man gets off too, and turns up your street.'),
        text('The driver calls goodnight after you both.', { when: { kv: 'excuses', lt: 1 } }),
        text('The driver watches you go and says nothing.', { when: { kv: 'excuses', is: 1 } }),
        text('The man gives you a long look and walks a little faster.', { when: { kv: 'excuses', gte: 2 } }),
      ],
      choices: [
        { id: 'wave', label: 'Wave him in for a cup of tea', when: { stat: 'warmth', gte: 2 }, effects: [{ scene: 'end.wave' }] },
        { id: 'door', label: 'Let yourself in', effects: [{ scene: 'end.door' }] },
      ],
    },
    {
      id: 'end.wave',
      title: 'The end',
      body: [text('He turns out to live two doors down. He brings biscuits next time.')],
      choices: [{ id: 'again', label: 'Start again', command: { type: 'newGame' }, effects: [] }],
    },
    {
      id: 'end.door',
      title: 'The end',
      body: [text('The kettle, the radiator, the rain on the window. You sleep well enough.')],
      choices: [{ id: 'again', label: 'Start again', command: { type: 'newGame' }, effects: [] }],
    },
  ],
}
```

Three chapters fit in one file. When a story grows, give each chapter a file of its own in `src/story/`, add each one to the list in `game.ts`, and `npm run check` tells you if two of them declare the same scene. The Letter is laid out that way.

## Where next

- [Organising a game](/docs/guide/organising) explains the files: what goes in `world/` and `story/`, when to split one, and how the files combine.
- [How the pieces fit](/docs/guide/how-it-fits) shows what you just used: the engine, the UI and the CLI.
- [A game with a world](/docs/guide/first-game), the second tutorial, adds a calendar, places and a character with plugins.
- [Writing a flowing scene](/docs/recipes/flowing-scenes) shows a scene that reads on as the player chooses.
- [Scenes](/docs/reference/scenes), [Conditions](/docs/reference/conditions) and [Effects](/docs/reference/effects) list everything a scene can do.
