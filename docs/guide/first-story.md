---
description: A step-by-step tutorial that builds a short linear story with no plugins, from one scene to a name input, a remembered choice, a counter and chapters as turns, then draws it with the React UI.
---

# Your first story

This page builds a short story in three chapters, called The Last Bus. You wait for the last bus in the rain with a stranger, find your bus pass has run out, and walk home. What you do at the stop changes what happens on the bus, and how you talk your way past the driver changes how the evening ends.

It's the smallest shape of game IFLoom makes. It uses no plugins, so there's no map or clock to set up. Along the way you'll use:

- scenes and choices, with their words kept apart by key
- a stat
- a choice the story remembers later
- a counter
- a name the player types
- a turn for each chapter

The finished game is one file, `src/game.ts`, plus a page that draws it. The whole file is at the [end of the page](#the-whole-thing). [The Letter](/guide/shapes#a-linear-novel-the-letter), in `examples/novel`, is a slightly longer story built the same way.

## Before you start

Follow [Installation](/guide/installation) as far as cloning the repository and running `npm install`. Then, from the root of the checkout, make a new game from the blank template:

```sh
npm run new -- my-story
npm install
npm run dev -w my-story
```

That gives you `games/my-story`, with a two-scene game in `src/game.ts` and a `src/main.ts` that draws it. Open the address Vite prints, and keep `npm run dev -w my-story` running in a terminal. The game reloads each time you save a file.

You'll replace `src/game.ts` as you go, and leave the other files as they are.

## 1. One scene

A game is one or more packs of content that [`loadGame`](/reference/loader#loadgame) merges. Start with a pack holding one scene, and the words it shows. Replace everything in `src/game.ts` with this:

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

The scene is a [data scene](/reference/scenes#datascene). Its `body` is a list of blocks, and `{ text: 'ch1.stop' }` shows the prose stored under the key `ch1.stop`. Keeping the words apart from the structure means the loader can check that every key has words, and a translation can replace them.

`loadGame` takes the packs and a base with the game's `id` and `title`. `introScene` is the scene on screen when a new game starts. `schema: SCHEMA` says which version of the pack format you wrote against.

The default export is what the [CLI](/cli/) reads: `loadGame` returns `{ game, problems }`, and `npm run check -w my-story` prints each problem, or `No problems.` when there are none.

## 2. Choices

A scene moves on through its choices. Each choice has an `id` and a list of [effects](/reference/effects) that run when the player picks it. `{ kind: 'scene', id }` opens another scene.

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

If you misspell a scene id or forget a label, `npm run check -w my-story` says which scene and which key. The full list is under [the checks](/reference/loader#the-checks).

## 3. A stat

A [stat](/reference/stats) is a number the game keeps for the player. The engine doesn't define any, so you declare each one in the pack. This story keeps one, `warmth`, for how kind the player has been:

```ts
stats: [{ id: 'warmth', label: 'Warmth', start: 0, max: 3 }],
```

Sharing the umbrella raises it. Put the stat effect before the scene change:

```ts
{ id: 'share', effects: [{ kind: 'stat', key: 'warmth', by: 1 }, { kind: 'scene', id: 'ch2.bus' }] },
```

A stat stays between its `min` (0 unless you say) and its `max`. The [React UI](/react/) shows it under the story.

## 4. A choice the story remembers

The engine counts every choice the player takes, by `scene/choice`. A later scene can ask about an earlier choice with the [`{ chose }`](/reference/conditions#chose) condition, so you don't need to set a variable for it.

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

The third chapter reads the count back with a range. `lt`, `is` and `gte` are three of the [range](/reference/conditions#range) keys:

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

An [input](/reference/inputs) asks the player for a value and writes it to a variable. This one asks for a name, writes it to `playerName` (the input's id), and is only offered until a name has been given:

```ts
inputs: [{ id: 'playerName', label: 'Your name', kind: 'text', maxLength: 20, when: { not: { flag: 'playerName' } } }],
```

`{ flag: 'playerName' }` holds once the variable has a value, so `{ not: … }` hides the input after that. The prose prints any variable by name with a token, <code v-pre>{{playerName}}</code>:

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

Saves use `playerName` too. A save's [`SaveMeta`](/reference/saves#savemeta) has a `player` field, read from that variable, for a load screen to show.

## 7. A chapter is a turn

The engine dates things in turns. `state.turn` starts at 0, and the `turn` effect, `{ kind: 'turn' }`, ends one. Your game decides how long a turn is. In this story it's a chapter, so every choice that moves to the next chapter ends a turn before it changes the scene:

```ts
{ id: 'keep', when: { flag: 'playerName' }, effects: [{ kind: 'turn' }, { kind: 'scene', id: 'ch2.bus' }] },
```

Now `state.turn` is the chapter the player has reached, counting from 0. Anything else the engine dates, such as how many turns have passed [`since`](/reference/conditions#since) a scene was seen, counts chapters. The saves menu names each save by its turn, and [`ifloom playtest`](/cli/#ifloom-playtest) writes its transcript a turn at a time.

## 8. Draw it

The engine has no UI of its own. The template's `src/main.ts` draws the game with the [React UI](/react/), and you don't need to change it:

```ts
// src/main.ts
import { READING_LAYOUT, mountGame } from '@ifloom/react'
import game from './game.ts'
import './styles.css'

mountGame(game, { layout: READING_LAYOUT })
```

[`mountGame`](/react/#mountgame) takes what `loadGame` returns and logs any problems as warnings in the browser's console. Then it starts the game:

- It makes a new game with a random seed, so each playthrough's random draws are different.
- It builds a [runner](/reference/runner), which keeps the state and adds undo, 50 steps back.
- It keeps saves in the browser's `localStorage`, under keys that start with the game's id, and autosaves to the `auto` slot each turn. In this story that's the start of each chapter.
- It draws [`GameShell`](/react/#gameshell), the whole UI, into the element with the id `root` in `index.html`.

[`READING_LAYOUT`](/react/#layouts) is a single column to read. It puts the title over the scene, then the name input, the game's actions, the stats and the menu under it. Without it you'd get the default layout, which has a side column for a game with a clock and a map.

`src/styles.css` imports the React UI's styles and one of its theme presets, such as `paper`, a printed page with a serif font. Change the preset there, or set your own fonts and colours under it. [Make it your own](/react/customising) has the presets and everything else you can change.

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

The template's `playtest` script runs `ifloom playtest --turns 5 --out playtest/run.txt`. Read `games/my-story/playtest/run.txt`. It has every screen the [explorer](/cli/#explorer) saw, a turn at a time, and the commands it sent. Since a turn is a chapter here, that's chapter by chapter. Change `--turns` in `package.json` as your story grows.

When you're happy with it, `npm run build -w my-story` makes one HTML file in `games/my-story/dist/` that opens from disk. See [Shipping a game](/guide/shipping).

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

- [Shapes of game](/guide/shapes) walks through The Letter, then a management game built on [entities](/reference/entities).
- [A game with a world](/guide/first-game) is the second tutorial. It adds a calendar, places and a character with the first-party plugins.
- [Core concepts](/guide/concepts) explains the ideas behind what you just used.
- [Scenes](/reference/scenes), [Conditions](/reference/conditions) and [Effects](/reference/effects) list everything a scene can do.
