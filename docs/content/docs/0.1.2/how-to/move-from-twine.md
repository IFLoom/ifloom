---
title: "Move a story from Twine"
description: "Move a SugarCube or Harlowe story to IFLoom, with one passage converted side by side and the differences to plan for."
---
Use this when you have a story written in Twine's SugarCube or Harlowe and want it in IFLoom. Make a game first, as [Create a game](/docs/0.1.2/how-to/create-a-game) shows. The [Twine phrasebook](/docs/0.1.2/reference/twine-phrasebook) maps each macro and special passage, and this page converts a whole passage.

Still deciding whether to move? [IFLoom and Twine](https://ifloom.dev/twine) compares the two, with where Twine is the better choice.

## Decide where each passage goes

A Twine story is one file of passages, and an IFLoom game is a few files that each export [`Content`](/docs/0.1.2/reference/content#content). Sort the passages into the layout every template starts with:

- **`StoryInit`** and the variables every passage uses go in `src/world/`, a file per kind: `stats.ts`, `things.ts`, and `cast.ts` for the people.
- **The passages of one place, chapter or character** go in one file in `src/story/`, such as `story/cafe.ts`, with their words.
- **Passages tagged `widget`**, and the Story JavaScript, go in `src/rules.ts` as the game's own code.
- **The story's title** goes in `src/game.ts`, the [game module](/docs/0.1.2/reference/cli#the-game-module). The start passage becomes `introScene`, in the content that holds that scene.

[Organise your game's files](/docs/0.1.2/how-to/organise-your-files) has the whole layout.

## Convert a passage

This café passage in SugarCube shows a line when the player is short of money, and offers a coffee that costs 3 coins:

```html
:: Cafe
Ava looks up from the till. "The usual?"
<<if $coins lt 3>>Your pockets feel light.<</if>>

<<if $coins gte 3>>
  <<link "Buy a coffee (3 coins)" "Street">><<set $coins -= 3>><<set $hadCoffee to true>><</link>>
<<else>>
  You can't afford a coffee.
<</if>>
[[Head back out|Street]]
```

Convert it in four steps:

1. Declare each variable that holds a number as a stat in `src/world/stats.ts`, with its start and label. `$coins` becomes the stat `coins`.
2. Make the passage a scene in `src/story/cafe.ts`. Each line of text becomes a `text()` block, and a line inside `<<if>>` takes the condition as its `when`.
3. Make each link a choice. A link inside `<<if>>` becomes a choice with `blocked`, which keeps the button on screen with its reason. Each `<<set>>` becomes an effect, and a true/false variable such as `$hadCoffee` becomes a key in the [kv store](/docs/0.1.2/reference/glossary#kv).
4. Make the link's target the choice's last effect, `{ scene: 'street' }`.

The result, kept in one file here to stay short:

```ts
import { text, type Content } from '@ifloom/engine'

export const cafe: Content = {
  introScene: 'cafe',
  stats: [{ id: 'coins', label: 'Coins', start: 5, max: 999, spendable: true, format: '{n} coins' }],
  scenes: [
    {
      id: 'cafe',
      title: 'The Corner Café',
      body: [text('Ava looks up from the till. "The usual?"'), text('Your pockets feel light.', { when: { stat: 'coins', lt: 3 } })],
      choices: [
        {
          id: 'coffee',
          label: 'Buy a coffee',
          blocked: [{ when: { stat: 'coins', lt: 3 }, reason: 'You need 3 coins.' }],
          effects: [{ stat: 'coins', by: -3 }, { kv: 'hadCoffee', to: true }, { scene: 'street' }],
        },
        { id: 'leave', label: 'Head back out', effects: [{ scene: 'street' }] },
      ],
    },
    { id: 'street', title: 'The high street', body: [text('The high street, busy with the market.')], choices: [] },
  ],
}
```

Leave the price out of the label. `coins` is `spendable`, so the UI works the price out from the choice's effects and shows `Buy a coffee (3 coins)` itself.

## Plan for the differences

Four things in a Twine story need a different shape in IFLoom:

- **HTML and JavaScript in prose.** Prose is words with a small [markup](/docs/0.1.2/reference/prose#markup) for speech, pictures, video and sound. Move styling to your UI's theme and CSS, and calculations to `rules`.
- **Variables that hold objects.** A stat holds a number, and a kv key holds a number, a string or `true`/`false`. The state is the save and must survive being written as JSON, so model a list of things as [entities](/docs/0.1.2/reference/entities).
- **Changing text after it shows.** A choice changes the state, and the scene renders again from it. Replace `<<replace>>` and similar macros with blocks whose `when` reads the state.
- **The Twine editor.** Scenes are objects in `.ts` files, which you edit in a code editor.

## Check it worked

Run `npm run check` after each passage you convert. It reports a choice that goes to a scene nobody declared, a stat that doesn't exist, or a misspelt key, with the scene it's in:

```text
cafe · scene cafe · goes to unknown scene "stret"
```

It prints `No problems.` once every name resolves. Then run `npm run dev` and play the scene: the coffee button is refused with `You need 3 coins.` while the player has fewer than 3 coins.

For more, see:

- [The Twine phrasebook](/docs/0.1.2/reference/twine-phrasebook), for every SugarCube and Harlowe macro.
- [Scenes](/docs/0.1.2/reference/scenes), [Conditions](/docs/0.1.2/reference/conditions) and [Effects](/docs/0.1.2/reference/effects).
- [Differences from Twine, Ink and Ren'Py](/docs/0.1.2/explanation/design#differences-from-twine-ink-and-renpy), for why IFLoom keeps rules out of the prose.
