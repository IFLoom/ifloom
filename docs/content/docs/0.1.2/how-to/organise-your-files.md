---
title: "Organise your game's files"
description: "Split a growing game's content into files by kind and by area, and let npm run check find a key declared twice."
---
Use this when one content file has grown too long to find your way around, or before you start a game with places, people and weeks of story. Every template and example already follows this layout. [Content, packs and the base](/docs/0.1.2/explanation/content-and-packs) explains how `loadGame` merges the files.

```
src/
├── game.ts           assembles the game from the files below
├── rules.ts          the game's own code, once it has any
├── world/            what the whole game shares, one file per kind
│   ├── stats.ts
│   ├── things.ts
│   ├── cast.ts
│   └── settings.ts
└── story/            the story, one file per area
    ├── opening.ts
    └── cafe.ts
```

## Keep game.ts to the list of files

`src/game.ts` holds the game module and the base, and no content. Its default export is the [game module](/docs/0.1.2/reference/cli#the-game-module), made with `defineGame`. The base holds only the game's `id`, `title`, `version`, `plugins` and `rules`. Actions, locks, the scene the game opens on and the rest are [content](/docs/0.1.2/reference/content#content), so they go in a file of their own.

```ts
// src/game.ts
import { loadGame } from '@ifloom/engine'
import { defineGame } from '@ifloom/cli/game'
import { stats } from './world/stats.ts'
import { opening } from './story/opening.ts'
import { cafe } from './story/cafe.ts'

export default defineGame({
  build: ({ unlocked }) => loadGame([stats, opening, cafe], { id: 'my-game', title: 'My Game' }, { packs: unlocked }),
})
```

`build` receives `unlocked`, the packs in `src/unlocks/` that a player opens with a code (see [Locked content](/docs/0.1.2/reference/cli#locked-content)). A game with no locked content can write `build: () => loadGame([…], base)`.

## Put what the whole game shares in world/

Give `src/world/` one file per kind of declaration: `stats.ts`, `things.ts`, `cast.ts` for the people, `settings.ts` for what the player can change. A stat or a character turns up all over the story, so it has no one home there. Each file exports one `Content` object:

```ts
// src/world/stats.ts
import type { Content } from '@ifloom/engine'

export const stats: Content = {
  stats: [{ id: 'coins', label: 'Coins', start: 12, spendable: true }],
}
```

## Put the story in story/, one file per area

Give `src/story/` one file per area, with the area's scenes, their words, the actions that open them and its slice of plugin content. A change to the café then touches `story/cafe.ts` and nothing else. Pick the kind of area that matches how you think about the story:

- **A place**, with the [places plugin](/docs/0.1.2/reference/plugins/places): the file holds the location, its actions, its scenes, and its vendor or jobs.
- **A chapter**, in a linear story: The Letter has `story/ch1.ts`, `ch2.ts` and `ch3.ts`.
- **A character's arc**: the showcase's `story/ava.ts` holds Ava's scenes, texts, quest and achievement.

A game can mix them, as the showcase mixes places and arcs. Write each scene's words in the scene itself, in its `text()` blocks and its choices' `label`s:

```ts
// src/story/cafe.ts
import { text, type Content } from '@ifloom/engine'

export const cafe: Content = {
  scenes: [
    {
      id: 'cafe.window',
      title: 'The window seat',
      body: [text('You take the stool by the window. A bus goes by, then a man with a ladder.')],
      choices: [{ id: 'leave', label: 'Finish your cup', effects: [{ scene: null }] }],
    },
  ],
  actions: [{ id: 'coffee', label: 'Buy a coffee', cost: { stats: { coins: 3 } }, effects: [{ scene: 'cafe.window' }] }],
}
```

Lines read by key go in the area's `prose`: [variants](/docs/0.1.2/reference/prose#variantmember), a tooltip's words, or a line several scenes share. When an area has a lot of them, move them to a sibling file named after it, `cafe.prose.ts`, and import them into the area's content as `prose`.

## Split a file when it gets long

Start with one file in each folder, as the templates do. Split a file when you scroll through it to find things, or when two people edit it at once:

1. Move the declarations into a new file that exports a `Content` object.
2. Import it in `src/game.ts` and add it to the list.
3. Run `npm run check`.

`loadGame` merges the files in the order you list them, and lists such as triggers, quests and places keep that order. List `world/` first, then the story in the order the player meets it. The files have no ids, so you can rename, split or merge them at any time, even after release. Saves depend on the ids inside them, so keep scene, entity and storyline ids stable once players have saves.

## Check it worked

Each key is declared once across all the files. If two files declare the same scene, `npm run check` fails with a line like this:

```text
content · scene "cafe.counter" · declared twice
```

Search for the id and delete the copy you don't want. Give each file's content a `name`, such as `name: 'story.cafe'`, and the problem names both files. `npm run check` prints `No problems.` once every key is declared once.

## Variations

**Everything by kind.** A management game that is mostly data can keep nearly everything in `world/`. The Corner Café keeps its stats, staff, menu, actions and triggers there, a file each, with only two scenes in `story/` and its sums in `rules.ts`.

**One file.** A story of a dozen scenes reads fine as one `Content` object in `src/game.ts`, as [Add IFLoom to an existing project](/docs/0.1.2/how-to/add-to-a-project) shows. Move it into the folders when it grows.

The pages this used:

- [`Content`](/docs/0.1.2/reference/content#content) and [`loadGame`](/docs/0.1.2/reference/content#loadgame), and the [checks](/docs/0.1.2/reference/content#checks) for a key declared twice.
- [The game module](/docs/0.1.2/reference/cli#the-game-module).
- [The examples](/docs/0.1.2/reference/examples), which lists each example's files.
- [Content, packs and the base](/docs/0.1.2/explanation/content-and-packs).
