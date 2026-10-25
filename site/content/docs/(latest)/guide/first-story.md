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

The default `react` template draws the game with the [React UI](/docs/react). The others draw it themselves with no React. Pick the tab you want here and the rest of the docs show the same one.

That gives you a folder `my-story` with a two-scene game and the code that draws it. The game is in three files: `src/story/opening.ts` has the scenes and their words, `src/world/stats.ts` a stat, and `src/game.ts` puts them together. Open the address Vite prints, and keep `npm run dev` running in a terminal. The game reloads each time you save a file.

You'll replace those three files as you go, and leave the other files as they are. Why the game is split this way is on [Organising a game](/docs/guide/organising).

## 1. One scene

A game is [content](/docs/reference/loader#content-and-packs) that [`loadGame`](/docs/reference/loader#loadgame) merges, split across the files in `src/story/` and `src/world/`. Each file exports a `Content` object. Start with one scene, and the words it shows. Replace everything in `src/story/opening.ts` with this:

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

`introScene` is the scene on screen when a new game starts. Then give `src/game.ts` the game's own id and title:

```ts
// src/game.ts
import { loadGame } from '@ifloom/engine'
import { stats } from './world/stats.ts'
import { opening } from './story/opening.ts'

export default loadGame([stats, opening], { id: 'last-bus', title: 'The Last Bus' })
```

The scene is a [data scene](/docs/reference/scenes#datascene). Its `body` is a list of blocks, read top to bottom, and `text('…')` is a block of words, written where it's read. It's plain data, `{ text: '…' }`, which you can write by hand too. A blank line in the words starts a new paragraph.

The words are plain text, with `**bold**` and `*italic*` as in Markdown (see [Prose](/docs/reference/prose#bold-and-italics)). A translation can give every one of them other words later, with no change to this file (see [Translating a game](/docs/recipes/translating)).

`loadGame` takes your content, in a list, and a base with the game's `id` and `title`. Everything the story holds, its first scene included, is content. The base holds only what says which game this is, its plugins and its own code.

The default export is what the [CLI](/docs/cli) reads: `loadGame` returns `{ game, problems }`, and `npm run check` prints each problem, or `No problems.` when there are none.

## 2. Choices

A scene moves on through its choices. Each choice has an `id`, a `label` the player reads on its button, and a list of [effects](/docs/reference/effects) that run when the player picks it. `{ scene: 'ch2.bus' }` opens another scene.

Add a second chapter, and two ways to get there:

```ts
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

Sharing the umbrella raises it. Back in `src/story/opening.ts`, put the stat effect before the scene change:

```ts
{ id: 'share', effects: [{ stat: 'warmth', by: 1 }, { scene: 'ch2.bus' }] },
```

A stat stays between its `min` (0 unless you say) and its `max`. Every template shows it in the side column, beside the story.

## 4. A choice the story remembers

The engine counts every choice the player takes, by `scene#choice`. A later scene can ask about an earlier choice with the [`{ chose }`](/docs/reference/conditions#chose) condition, so you don't need to record it yourself.

Give the second chapter a line for each choice at the stop. A block with a `when` only shows while its condition holds:

```ts
body: [
  text('The bus comes at last. At the front, the driver looks at your card and shakes her head. "That one’s run out, love."'),
  text('Behind you, the man from the stop is still drying his glasses on his scarf.', { when: { chose: 'ch1.stop#share' } }),
  text('Behind you, the man from the stop is wringing out his sleeves.', { when: { chose: 'ch1.stop#keep' } }),
],
```

A choice can have a `when` too. A choice whose condition doesn't hold isn't offered at all.

## 5. A counter

Now the driver. The player can pay, make an excuse, or, if they shared the umbrella, claim the stranger is paying. Each excuse adds to a count called `excuses`, kept in the kv store: keys with a true/false, number or text value, in `state.kv`. The `kv` effect sets a key `to` a value, or changes its number `by` an amount:

```ts
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

The third chapter reads the count back with a range. `lt`, `is` and `gte` are three of the [range](/docs/reference/conditions#range) keys:

```ts
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
{ id: 'end.wave', title: 'The end', body: [text('He turns out to live two doors down. He brings biscuits next time.')], choices: [] },
{ id: 'end.door', title: 'The end', body: [text('The kettle, the radiator, the rain on the window. You sleep well enough.')], choices: [] },
```

A key that was never set counts as 0, so the honest player's line needs nothing written first. The `wave` ending uses the stat. Only a player who shared the umbrella and paid the fare has a warmth of 2.

## 6. A name the player types

An [input](/docs/reference/inputs) asks the player for a value and writes it to a key in the kv store. It goes in `src/story/opening.ts`, beside the first scene, since that's where it's asked. This one asks for a name, writes it to `playerName` (the input's id), and is only offered until a name has been given:

```ts
inputs: [{ id: 'playerName', label: 'Your name', type: 'text', maxLength: 20, when: { not: { kv: 'playerName' } } }],
```

`{ kv: 'playerName' }` holds once the key has a value, so `{ not: … }` hides the input after that. Words print any key by name with a token, `{{playerName}}`. Add a line that uses it, shown once the name is in, and hold the first chapter's choices back until then:

```ts
body: [
  text('Rain, and the last bus is late. A man in a thin jacket shelters beside you under half an umbrella.'),
  text('He nods at you, {{playerName}}, as if he knows you from somewhere.', { when: { kv: 'playerName' } }),
],
choices: [
  { id: 'share', label: 'Hold the umbrella over both of you', when: { kv: 'playerName' }, effects: [/* … */] },
  { id: 'keep', label: 'Keep the umbrella to yourself', when: { kv: 'playerName' }, effects: [/* … */] },
],
```

Saves can use `playerName` too. A save's [`SaveMeta`](/docs/reference/saves#savemeta) has a `playerName` field for a load screen to show, which comes from the game's `saveName`. It's code, so it goes in the game's [`rules`](/docs/reference/rules#gamerules), in the base in `src/game.ts`:

```ts
export default loadGame([stats, opening], {
  id: 'last-bus',
  title: 'The Last Bus',
  rules: {
    saveName: (state) => (typeof state.kv.playerName === 'string' ? state.kv.playerName : null),
  },
})
```

## 7. A chapter is a turn

The engine dates things in turns. `state.turn` starts at 0, and the `turn` effect, `{ turn: true }`, ends one. Your game decides how long a turn is. In this story it's a chapter, so every choice that moves to the next chapter ends a turn before it changes the scene:

```ts
{ id: 'keep', label: 'Keep the umbrella to yourself', when: { kv: 'playerName' }, effects: [{ turn: true }, { scene: 'ch2.bus' }] },
```

Now `state.turn` is the chapter the player has reached, counting from 0. Anything else the engine dates, such as how many turns have passed [`since`](/docs/reference/conditions#since) a scene was seen, counts chapters. A save made with no name of its own is named by its turn, such as `Turn 2`, and [`ifloom playtest`](/docs/cli#ifloom-playtest) writes its transcript a turn at a time.

## 8. Draw it

The engine has no UI of its own. Your template already has the code that draws the game, and you don't need to change it:

```ts tab="Plain JS" tab-group="framework"
// src/main.ts in the vanilla template, cut down to the scene and its choices
import { browserRunner } from '@ifloom/browser'
import type { View } from '@ifloom/engine'
import loaded from './game.ts'
import './styles.css'

const runner = await browserRunner(loaded.game)
const root = document.querySelector<HTMLElement>('#root')!

function draw(view: View): void {
  root.replaceChildren()
  for (const beat of view.scene.beats) {
    if (beat.type === 'text') root.append(Object.assign(document.createElement('p'), { textContent: beat.text }))
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
import { mountGame } from '@ifloom/react'
import game from './game.ts'
import { Layout } from './layout.tsx'
import './styles.css'

// `layout` is the page, in `layout.tsx`. `pages` opens on a title screen
// with New game, Continue, Load and Settings. Leave it out to start straight
// in the story.
mountGame(game, { layout: Layout, pages: true })
```

```ts tab="Vue" tab-group="framework"
// src/runner.ts
import { shallowRef } from 'vue'
import { browserRunner } from '@ifloom/browser'
import loaded from './game.ts'

export const runner = await browserRunner(loaded.game)

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
import { browserRunner } from '@ifloom/browser'
import loaded from './game.ts'

export const runner = await browserRunner(loaded.game)

// The view as a store, set again after every change of state.
export const view = readable(runner.view(), (set) => runner.subscribe(() => set(runner.view())))

// src/main.ts
import { mount } from 'svelte'
import App from './App.svelte'
import './styles.css'

mount(App, { target: document.querySelector('#root')! })
```

Every template starts the game with [`browserRunner`](/docs/browser#browserrunner), which adds undo, saves and an autosave each chapter, and draws `runner.view()` again whenever the state changes ([Running a game](/docs/guide/running-a-game) goes through it). In the React template, `src/layout.tsx` is the page and `src/styles.css` its look, and [Make it your own](/docs/react/customising) covers both.

## 9. Check it and playtest it

```sh
npm run check   # No problems.
```

If you misspelled a scene id or a key along the way, `check` names it.

A playtest plays the game with no one at the keyboard. It needs somewhere to start, and a new game would stop at the name input. So export a `start` from `src/game.ts`, a player who has already typed a name:

```ts
import { startingState, type Game } from '@ifloom/engine'

export const start = (game: Game) => startingState(game, { kv: { playerName: 'Sam' } })
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
import { loadGame, startingState, type Game } from '@ifloom/engine'
import { stats } from './world/stats.ts'
import { opening } from './story/opening.ts'

export default loadGame([stats, opening], {
  id: 'last-bus',
  title: 'The Last Bus',
  rules: {
    saveName: (state) => (typeof state.kv.playerName === 'string' ? state.kv.playerName : null),
  },
})

/** Where `ifloom playtest` starts: a player who has already typed a name. */
export const start = (game: Game) => startingState(game, { kv: { playerName: 'Sam' } })
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
    { id: 'end.wave', title: 'The end', body: [text('He turns out to live two doors down. He brings biscuits next time.')], choices: [] },
    { id: 'end.door', title: 'The end', body: [text('The kettle, the radiator, the rain on the window. You sleep well enough.')], choices: [] },
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
