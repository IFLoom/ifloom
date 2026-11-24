---
title: "Offer a random scene from a set"
description: "Draw a scene at random from a set of storylets by weight, condition, cooldown and chance, and let other files and mods add to the set."
---
Use this for the small things that happen while the player sits in a café or waits at a bus stop. Each one is a [storylet](/docs/reference/glossary#storylet), a scene drawn at random from a named set, and the game keeps no list of them. The steps build the showcase café's "Sit a while".

## Mark the scenes that can come up

Give each scene a `drawnFrom` with the set's name. Add a `weight` to make one more likely, 1 if left out, and a `when` to say when it can come up:

```ts
import type { DataScene } from '@ifloom/engine'

export const cafeScenes: DataScene[] = [
  {
    id: 'cafe.window',
    title: 'The window seat',
    drawnFrom: ['cafe'],
    weight: 3,
    when: { not: { seen: 'cafe.window', gte: 2 } },
    body: [{ text: 'Rain on the glass, and the high street going by in umbrellas.' }],
    choices: [{ id: 'leave', effects: [{ scene: null }] }],
  },
  {
    id: 'cafe.crossword',
    title: 'Seven down',
    drawnFrom: ['cafe'],
    when: { not: { seen: 'cafe.crossword' } },
    body: [{ text: '"Seven down. Somewhere to sit and wait, four letters." You try "café".' }],
    choices: [{ id: 'leave', effects: [{ stat: 'charm', by: 1 }, { scene: null }] }],
  },
]
```

A weight of 3 comes up three times as often as a weight of 1, among the scenes whose `when` holds. `when` only limits draws, so a `{ scene: 'cafe.window' }` effect opens the scene whether it holds or not.

## Draw one from an action

Add the [`scene` effect](/docs/reference/storylets#scene) with `from` in place of an id, on an action, a choice or a trigger. Name a scene in `otherwise` for when none can come up:

```ts
import type { ActionDef, DataScene } from '@ifloom/engine'

export const sit: ActionDef = { id: 'sit', label: 'Sit a while', effects: [{ scene: { from: 'cafe', otherwise: 'cafe.quiet' } }] }

export const quiet: DataScene = {
  id: 'cafe.quiet',
  title: 'A quiet table',
  body: [{ text: 'Nothing much happens. The coffee is good.' }],
  choices: [{ id: 'leave', effects: [{ scene: null }] }],
}
```

In the showcase, `sit` is one of the café location's actions. The draw is seeded from the save, so reloading doesn't change what comes up.

## Limit how often each comes up

Write the limit in the scene's `when`:

```ts fragment
when: { not: { seen: 'cafe.crossword' } }                          // once ever
when: { not: { seen: 'cafe.window', gte: 2 } }                     // at most twice
when: cast.here('ava')                                              // only while Ava is here
when: { stat: 'friendship', of: cast.character('ava'), gte: 25 }   // only once you know her
```

For at most once a turn, set a kv key in the scene's choice, list the key in your content's [`resets`](/docs/reference/rules#resets) so it goes back each turn, and test it in `when`.

## Add a cooldown

Store the turn when the scene was last seen, and test how long ago that was with a condition of the game's own. These go in the game's [rules](/docs/reference/glossary#rules), and content calls them as `game/<name>`:

```ts
import type { DataScene, GameRules } from '@ifloom/engine'

export const rules: GameRules = {
  conditions: {
    cooledDown: (state, args) => {
      const last = state.kv[String(args.key)]
      return typeof last !== 'number' || state.turn - last >= Number(args.turns ?? 1)
    },
  },
  macros: { stamp: (state, args) => [{ kv: String(args.key), to: state.turn }] },
}

export const samAtTheCafe: DataScene = {
  id: 'cafe.sam',
  drawnFrom: ['cafe'],
  when: { 'game/cooledDown': { key: 'cafe.sam.last', turns: 3 } },
  body: [{ text: 'Sam waves from the queue with a dog lead in one hand.' }],
  choices: [{ id: 'leave', effects: [{ 'game/stamp': { key: 'cafe.sam.last' } }, { scene: null }] }],
}
```

Sam turns up at most once every three turns. Stamp the key in every way out of the scene, or in the effect that opens it.

## Make an event rare

Put an ordinary scene in the same set with a bigger weight. With the window seat at weight 1 and a `cafe.ordinary` visit at weight 3, the window seat comes up about one sit in four.

For a chance worked out from the state, such as 20% plus 8% per rank, roll it in a [macro](/docs/reference/glossary#macro) with [`chance`](/docs/reference/random#chance), and draw only when it comes up:

```ts
import { chance } from '@ifloom/engine'
import type { Macro } from '@ifloom/engine/plugin'

// in rules.macros, called as { 'game/maybeSomething': { rank: 2 } }
export const maybeSomething: Macro = (state, args) =>
  chance(20 + 8 * Number(args.rank ?? 0), 100, state.seed, state.turn, 'cafe.event') ? [{ scene: { from: 'cafe', otherwise: 'cafe.quiet' } }] : []
```

## Add to the set from another file or a mod

Declare another scene with the set in its `drawnFrom`. The set has no list of members, so a later content file or a [mod](/docs/reference/glossary#mod) adds one this way:

```ts
import { SCHEMA, type Pack } from '@ifloom/engine'

export const rainyDays: Pack = {
  id: 'mod:rainy-days',
  schema: SCHEMA,
  scenes: [
    {
      id: 'cafe.umbrella',
      drawnFrom: ['cafe'],
      body: [{ text: 'Someone has left an umbrella hooked over the back of your chair. Nobody comes back for it.' }],
      choices: [{ id: 'leave', label: 'Leave it where it is', effects: [{ scene: null }] }],
    },
  ],
}
```

## Check it worked

Run `npm run check`. It reports a draw from a set no scene is in, which is usually a typo, and a `weight` or `when` on a scene that is in no set. Then sit a while several times in a row with `npm run dev`. A test can sit down with many seeds and check that each scene comes up, as the showcase's test `draws something to happen when you sit a while at the café, and a quiet table when nothing can` does.

In the showcase, Small Town, the `sit` action and the `cafe.*` scenes are in [`examples/showcase/src/story/cafe.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/cafe.ts). For more, see:

- [Storylets](/docs/reference/storylets), with the checks and how the draw is seeded.
- [The `seen` condition](/docs/reference/conditions#seen) and [`resets`](/docs/reference/rules#resets).
- [The same save gives the same draws](/docs/explanation/design#the-same-save-gives-the-same-draws).
