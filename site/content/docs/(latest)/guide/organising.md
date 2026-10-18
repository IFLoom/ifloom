---
title: "Organising a game"
description: "Where a game's content goes as it grows: src/game.ts only assembles, src/world/ holds what the whole game shares by kind, src/story/ holds the story by area. Pack ids, how packs merge, the duplicate warning and overrides, prose files, tests per area, an editor export and mods."
---
A game's content is a list of [packs](/docs/reference/loader#pack), and [`loadGame`](/docs/reference/loader#loadgame) merges them into one game. A small story fits in one pack, but a game with places, people and a few weeks of story gets hard to find your way around in one file. This page shows how the templates and the examples split a game into packs, and why.

## The layout

Every template starts a game in this layout, and the three examples follow it:

```
src/
├── game.ts           puts the game together from the packs
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

Each file in `world/` and `story/` exports one pack, and `game.ts` lists them:

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
import { SCHEMA, type Pack } from '@ifloom/engine'

export const stats: Pack = {
  id: 'world.stats',
  schema: SCHEMA,
  stats: [{ id: 'coins', label: 'Coins', start: 12, spendable: true }],
}
```

`game.ts` holds no content. Its job is the list of packs and what only the base can hold: the game's `id` and `title`, its `plugins`, `rules`, `actions` and the rest that [can't go in a pack](/docs/reference/loader#pack).

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

A small game can keep one file in each folder. The templates start with `world/stats.ts` and `story/opening.ts` and nothing else. Split a file when you start scrolling through it to find things, or when two people are editing it at once. A new file is a new pack: export it and add it to the list in `game.ts`.

## Other layouts

The layout is a convention. The engine only sees the list of packs, so any layout works.

- **Everything by kind**, for a management game that's mostly data. The Corner Café keeps its stats, staff, menu, activities and triggers in `world/`, a file each, and has only two scenes in `story/`. When most of your game is tables of things and the story is a few scenes around them, by kind is easier to read.
- **One file**, for a tiny story. A game of a dozen scenes reads fine as one pack in `game.ts`. [Installation](/docs/guide/installation#add-ifloom-to-an-existing-project) shows one. Move it into the folders when it grows.

## Pack ids

Name each pack after its file: `world.stats`, `story.cafe`, `story.moving-day`. Every problem the loader reports starts with the pack it came from, so the id tells you which file to open:

```text
story.cafe · scene cafe.window · no prose for "cafe.window.rain"
```

A [save](/docs/reference/saves#savemeta) records the ids of the packs the game was loaded from, but only missing mods are reported in [`missingPacks`](/docs/reference/saves#loadedsave). So you can rename, split or merge your own packs after release without players seeing a warning. What still matters is the content inside them: a save that sits in a scene you renamed or removed won't play as it did, so keep scene, item and storyline ids stable once players have saves.

## How the packs merge

`loadGame` merges the packs in the order you list them. Scenes, stats, items, prose and the rest are keyed, by id or by key, and a later pack's entry replaces an earlier one's ([How packs merge](/docs/reference/loader#how-packs-merge) has every key). Packs that each declare their own things don't affect each other, so the order rarely matters.

It does matter where a list's order means something:

- **Triggers fire in list order** after each command, each on the state the one before left. Two triggers that react to each other, or that both raise a notice on the same command, should sit in one file, or in packs listed in the order you want them to fire.
- **Plugins list their content in order.** The quest log lists quests, the job board jobs and the places plugin its locations in the order the packs bring them.
- **Variants append.** Two packs can add lines to the same [variants](/docs/reference/prose#variantmember) name, and the lines are drawn from in the order they arrive.

Small Town lists `world/` first, then its story packs from moving day onwards, so its quests and places are listed in the order the player meets them.

## Two packs with one key

Splitting a game makes one mistake easy: declaring the same thing twice. You copy a scene into a new file and forget to delete the old one, or declare `coins` in a chapter as well as in `world/stats.ts`. The later pack would win without a word, and you'd be editing the copy that isn't used.

So `loadGame` reports it, naming both packs:

```text
story.town · pack · scene "cafe.counter" is in both story.cafe and story.town
```

It checks everything a pack declares by a key: scenes, prose keys, stats, items, entities and their kinds, storylines, activities, triggers, custom functions, plugin content and the rest ([Two packs with one key](/docs/reference/loader#two-packs-with-one-key) has the list). `npm run check` prints it with the other problems.

Sometimes replacing is the point, such as a winter version of the café laid over the usual one. Give that pack `overrides: true` and it's not reported:

```ts
// src/story/cafe-winter.ts
import { SCHEMA, type Pack } from '@ifloom/engine'

export const cafeWinter: Pack = {
  id: 'story.cafe-winter',
  schema: SCHEMA,
  overrides: true,
  prose: { 'cafe.counter': 'Frost on the window. The counter smells of cinnamon.' },
}
```

Mods and patches are never reported, because changing your game is what they're for.

## Prose beside its scenes

An area's words go in its pack's `prose`, next to the scenes that show them, so the key and the line are in the same file. When an area has a lot of words, move them to a sibling file named after it, and import them:

```ts
// src/story/cafe.prose.ts
export const prose: Record<string, string> = {
  'place.cafe': 'Six tables, one of them wobbly.',
  'cafe.window': 'You take the stool by the window.',
}
```

```ts
// src/story/cafe.ts
import { SCHEMA, type Pack } from '@ifloom/engine'
import { prose } from './cafe.prose.ts'

export const cafe: Pack = {
  id: 'story.cafe',
  schema: SCHEMA,
  scenes: [
    /* … */
  ],
  prose,
}
```

A writer can then work through `cafe.prose.ts` without the scenes in the way. Small Town does this for Ava's arc and the café, and keeps the shorter areas' prose inline.

## Tests per area

A pack on its own usually can't load, since a scene in `story/cafe.ts` names stats from `world/stats.ts`. So test the whole game, with a test file for each area that starts where that area does:

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

The [editor](/docs/guide/editor) exports one pack. It's part of the story, so save it in `story/` and add it to the list in `game.ts`. If it declares stats or items the rest of the game uses too, move those into `world/`, and the duplicate report tells you if you leave a copy behind.

## Mods are more packs

A [mod](/docs/reference/mods) is a pack the player adds, loaded after yours with an id that starts with `mod:`:

```ts
// src/game.ts
import { loadGame, type Pack } from '@ifloom/engine'
import { stats } from './world/stats.ts'
import { opening } from './story/opening.ts'
import { cafe } from './story/cafe.ts'

const packs: Pack[] = [stats, opening, cafe]

export function myGame(mods: Pack[] = []) {
  return loadGame([...packs, ...mods], { id: 'my-game', title: 'My Game' })
}
```

Because your own game is already a list of packs, a mod is just more of the same. It replaces what it repeats, it isn't reported as a clash, and the problems it causes are pinned on `mod:<id>`, not on your files.

## See it in the examples

- **Small Town** (`examples/showcase`): `world/` has stats, items, cast, settings, activities, achievements and cheats, and `story/` has moving day, Ava, the flat, the high street, the café, the park, the office and Sam. The tour in [The showcase](/docs/guide/showcase#the-files) lists every file.
- **The Letter** (`examples/novel`): `world/stats.ts` and a file per chapter in `story/`.
- **The Corner Café** (`examples/cafe`): nearly everything in `world/`, by kind, with its sums in `rules.ts`.
