---
title: "Organising a game"
description: "Where a game's content goes as it grows: src/game.ts only assembles, src/world/ holds what the whole game shares by kind, src/story/ holds the story by area. Combining your files, prose files, tests per area, an editor export and mods."
---
A game's [content](/docs/reference/loader#content-and-packs) can be split across as many files as you like, and [`loadGame`](/docs/reference/loader#loadgame) merges them into one game. A small story fits in one file, but a game with places, people and a few weeks of story gets hard to find your way around in one. This page shows how the templates and the examples split a game into files, and why.

## The layout

Every template starts a game in this layout, and the three examples follow it:

```
src/
├── game.ts           puts the game together from the files below
├── rules.ts          rules and custom functions, once it has any
├── world/            what the whole game shares, one file per kind
│   ├── stats.ts      the stats
│   ├── items.ts      the items
│   ├── cast.ts       the people, when the game has a cast
│   └── settings.ts   what the player can change
└── story/            the story, one file per area
    ├── opening.ts    an area's scenes, choices, prose and plugin content
    └── cafe.ts       ...and one more for each place, chapter or arc
```

Each file in `world/` and `story/` exports one `Content` object, and `game.ts` lists them:

```ts
// src/game.ts
import { loadGame } from '@ifloom/engine'
import { stats } from './world/stats.ts'
import { opening } from './story/opening.ts'
import { cafe } from './story/cafe.ts'

export default loadGame([stats, opening, cafe], { id: 'my-game', title: 'My Game', introScene: 'start' })
```

```ts
// src/world/stats.ts
import type { Content } from '@ifloom/engine'

export const stats: Content = {
  stats: [{ id: 'coins', label: 'Coins', start: 12, spendable: true }],
}
```

`game.ts` holds no content. Its job is the list of files and what only the base can hold: the game's `id` and `title`, its `plugins`, `rules`, `actions` and the rest that [can't go in content](/docs/reference/loader#content).

### World by kind, story by area

The two folders split the game in different ways on purpose.

- **`world/` goes by kind.** A stat, an item or a character is used all over the story. Coins are spent in the café and earned at the office, and Ava turns up in three places. These declarations have no one home in the story, so they're kept together by what they are, and you know where to look for every item.
- **`story/` goes by area.** A scene, its choices, the words it shows, the activity that opens it and the plugin content around it are written and changed together. Keeping them in one file means a change to the café touches `story/cafe.ts` and nothing else.

What an area is depends on the shape of your game:

- **A place**, in a game with the [places plugin](/docs/plugins/places): the flat, the high street, the café. Its file holds the location, the activities you can do there, its scenes, and the plugin content that belongs to it, such as its shop's vendor or the jobs based there.
- **A chapter**, in a linear story: The Letter has `story/ch1.ts`, `ch2.ts` and `ch3.ts`.
- **A character's arc**, for a story that follows one person across places: Small Town's `story/ava.ts` holds her scenes, her texts, her quest and her achievement.

Pick whichever matches how you think about the story. A game can mix them, as Small Town does with places and arcs.

### When to split

A small game can keep one file in each folder. The templates start with `world/stats.ts` and `story/opening.ts` and nothing else. Split a file when you start scrolling through it to find things, or when two people are editing it at once. Export the new file's content and add it to the list in `game.ts`.

## Other layouts

The layout is a convention. The engine only sees the list of content, so any layout works.

- **Everything by kind**, for a management game that's mostly data. The Corner Café keeps its stats, staff, menu, activities and triggers in `world/`, a file each, and has only two scenes in `story/`. When most of your game is tables of things and the story is a few scenes around them, by kind is easier to read.
- **One file**, for a tiny story. A game of a dozen scenes reads fine as one `Content` object in `game.ts`. [Installation](/docs/guide/installation#add-ifloom-to-an-existing-project) shows one. Move it into the folders when it grows.

## Combining your files

`loadGame` merges your files in the order you list them. Each scene, stat, item, prose key and the rest is declared once across all of them. If two files declare the same one, say a scene you copied into a new file and forgot to delete, `loadGame` reports it and `npm run check` fails:

```text
content · scene "cafe.counter" · declared twice
```

Search for the id and delete the copy you don't want. To have the problem name both files, give each file's content a `name`, such as `name: 'story.cafe'`. ([One key declared twice](/docs/reference/loader#one-key-declared-twice) has every key it looks at.)

Lists keep the order you combine your files in. Triggers fire in that order, and the quest log, the job board and the places list show their entries in it. Small Town lists `world/` first, then its story from moving day onwards, so its quests and places come in the order the player meets them.

Your files have no ids of their own, so you can rename, split or merge them at any time, even after release. What a save depends on is the ids inside them: keep scene, item and storyline ids stable once players have saves.

## Prose beside its scenes

An area's words go in its `prose`, next to the scenes that show them, so the key and the line are in the same file. When an area has a lot of words, move them to a sibling file named after it, and import them:

```ts
// src/story/cafe.prose.ts
export const prose: Record<string, string> = {
  'place.cafe': 'Six tables, one of them wobbly.',
  'cafe.window': 'You take the stool by the window.',
}
```

```ts
// src/story/cafe.ts
import type { Content } from '@ifloom/engine'
import { prose } from './cafe.prose.ts'

export const cafe: Content = {
  scenes: [
    /* … */
  ],
  prose,
}
```

A writer can then work through `cafe.prose.ts` without the scenes in the way. Small Town does this for Ava's arc and the café, and keeps the shorter areas' prose inline.

## Tests per area

One file on its own usually can't load, since a scene in `story/cafe.ts` names stats from `world/stats.ts`. So test the whole game, with a test file for each area that starts where that area does:

```ts
// tests/cafe.test.ts
import { describe, expect, it } from 'vitest'
import { createRunner, startingState } from '@ifloom/engine'
import loaded from '../src/game.ts'

const { game } = loaded

describe('the café', () => {
  it('sells a coffee for 3 coins', () => {
    const runner = createRunner(game, { ...startingState(game), sceneId: null })
    runner.apply({ type: 'activity', id: 'coffee' })
    expect(runner.state.stats.coins).toBe(9)
  })
})
```

When a test fails, its file names the area, and the area's file is where the fix goes. [Testing your game](/docs/guide/testing) covers playing routes, reaching scenes and replaying saves.

## An editor export

The [editor](/docs/guide/editor)'s TypeScript export is one file of content. It's part of the story, so save it in `story/` and add it to the list in `game.ts`. If it declares stats or items the rest of the game uses too, move those into `world/`, and `npm run check` tells you if you leave a copy behind.

## Mods are packs

A [mod](/docs/reference/mods) is a [pack](/docs/reference/loader#content-and-packs): content from outside your code, with an id that starts with `mod:`. Packs go in `loadGame`'s third argument, over your content:

```ts
// src/game.ts
import { loadGame, type Pack } from '@ifloom/engine'
import { stats } from './world/stats.ts'
import { opening } from './story/opening.ts'
import { cafe } from './story/cafe.ts'

export function myGame(mods: Pack[] = []) {
  return loadGame([stats, opening, cafe], { id: 'my-game', title: 'My Game' }, { packs: mods })
}
```

A pack replaces whatever it repeats, since changing your game is what it's for, and the problems it causes are pinned on `mod:<id>`, not on your files. Saves record the ids of the mods they were made with, so a player who removes one is told when they load such a save.

## See it in the examples

- **Small Town** (`examples/showcase`): `world/` has stats, items, cast, settings, activities, achievements and cheats, and `story/` has moving day, Ava, the flat, the high street, the café, the park, the office and Sam. The tour in [The showcase](/docs/guide/showcase#the-files) lists every file.
- **The Letter** (`examples/novel`): `world/stats.ts` and a file per chapter in `story/`.
- **The Corner Café** (`examples/cafe`): nearly everything in `world/`, by kind, with its sums in `rules.ts`.
