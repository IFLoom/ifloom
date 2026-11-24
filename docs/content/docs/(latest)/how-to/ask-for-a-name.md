---
title: "Ask the player for a name"
description: "Ask the player to type a name, hold the story until they do, and print it in the prose and on their spoken lines."
---
Use this when the story needs the player's name, or any other word or number they type, such as a pet's name or the hour they wake. An [input](/docs/reference/inputs) writes what the player enters to a key in the [kv store](/docs/reference/glossary#kv), the game's store of named values. The steps use The Letter, the novel example, whose first page asks for a name.

## Declare the input

Add an entry to `inputs` in your content. The input writes to the kv key of its `id`, here `playerName`, unless `key` names another:

```ts
import type { Content } from '@ifloom/engine'

export const ch1: Content = {
  inputs: [{ id: 'playerName', label: 'Your name', type: 'text', maxLength: 20, when: { not: { kv: 'playerName' } } }],
}
```

`when` keeps the field on screen only until the player has given a name. A `text` input takes 40 characters unless `maxLength` says otherwise, and the engine trims spaces from both ends before it writes the value.

## Hold the story until it's given

Give the scene's choices `when: { kv: 'playerName' }`, which holds once the key has a value. Until then the page shows the field and no choices:

```ts
import type { DataScene } from '@ifloom/engine'

export const mat: DataScene = {
  id: 'ch1.mat',
  title: 'Chapter one: the mat',
  body: [
    { text: 'On the mat, under the takeaway menus, is a letter with a name on it that isn’t yours: J. Hart.' },
    { text: 'You turn it over, {{playerName}}. The flap is barely stuck.', when: { kv: 'playerName' } },
  ],
  choices: [{ id: 'open', label: 'Open it', when: { kv: 'playerName' }, effects: [{ scene: 'ch2.stairs' }] }],
}
```

The token `{{playerName}}` prints the value of the key in any line. The second line has the same `when`, so nobody reads "You turn it over, ." before there's a name. Test the value elsewhere with the [`kv` condition](/docs/reference/conditions#kv), such as `{ kv: 'playerName', is: 'Sam' }`.

To stop the player saving a game with no name, add a `saveable` entry to your content:

```ts
import type { Content } from '@ifloom/engine'

export const noSaveYet: Content = {
  saveable: [{ when: { not: { kv: 'playerName' } }, reason: 'Type your name first.' }],
}
```

## Name the saves and the player's lines

Give the game's [rules](/docs/reference/glossary#rules) a `saveName` that returns the name. The save list shows it, and a spoken line written under `@you` or `@player` shows it as the speaker:

```ts
// src/rules.ts
import type { GameRules } from '@ifloom/engine'

export const rules: GameRules = {
  saveName: (state) => (typeof state.kv.playerName === 'string' ? state.kv.playerName : undefined),
}
```

Pass `rules` in the base of `loadGame` in `src/game.ts`. Without a `saveName`, the player's lines show `You`.

## Check it worked

Run `npm run dev`, type a name and press Enter. The field goes, the line with your name shows, and the choices appear. Type a name over 20 characters and the engine refuses it with `Keep it to 20 characters.`, which every UI shows by the field. [Inputs](/docs/reference/inputs#strings) lists each refusal and its strings key.

`ifloom playtest` never types, so a story that waits for a name stops there. Start the playtest past the field with the game module's `start`:

```ts
import { loadGame, startingState, type Content } from '@ifloom/engine'
import { defineGame } from '@ifloom/cli/game'

declare const ch1: Content

export default defineGame({
  build: ({ unlocked }) => loadGame([ch1], { id: 'the-letter', title: 'The Letter' }, { packs: unlocked }),
  start: (game) => startingState(game, { kv: { playerName: 'Sam' } }),
})
```

## Variations

**A number or a choice.** `type: 'number'` takes a number between `min` and `max`, such as `{ id: 'alarm', label: 'Wake at', type: 'number', min: 5, max: 10, key: 'wakeAt' }`. `type: 'choice'` offers `options`, each a `value` and a `label`, such as tea or coffee.

**A field outside a scene.** An input whose `when` holds while no scene is open shows under the room. While a scene is open, the React UI shows it between the scene's words and its choices.

In the showcase, Small Town, the cat's name is an input in [`examples/showcase/src/story/moving-day.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/moving-day.ts), and The Letter's is in [`examples/novel/src/story/ch1.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/novel/src/story/ch1.ts). For more, see:

- [Inputs](/docs/reference/inputs) and the [`input` command](/docs/reference/commands#input).
- [Tokens](/docs/reference/prose#tokens), for printing a value in a line.
- [Render inputs](/docs/how-to/render/scene#render-inputs), for a UI of your own.
- [Triggers, notices and inputs](/docs/explanation/state-and-commands#triggers-notices-and-inputs).
