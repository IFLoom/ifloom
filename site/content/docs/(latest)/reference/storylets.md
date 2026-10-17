---
title: "Storylets"
description: "Scenes drawn at random from a named set by weight and condition, with once, at-most and cooldown recipes."
---
A storylet is a scene drawn at random from a named set. You mark the scenes that can come up with the name of the set, give each a weight and its own `when`, and an effect draws one of the eligible ones. Use them for the small things that happen while the player sits in a café or waits at a bus stop, without keeping a list of those things anywhere.

```ts
import type { DataScene, Effect } from '@ifloom/engine'

// A scene that can come up when the player sits in the café.
const windowSeat: DataScene = {
  id: 'cafe.window',
  drawnFrom: ['cafe'],
  weight: 3,
  when: { not: { seen: 'cafe.window', gte: 2 } },
  body: [{ text: 'cafe.window' }],
  choices: [{ id: 'leave', effects: [{ kind: 'scene', scene: null }] }],
}

// The effect that draws one, on an activity or a choice.
const sit: Effect = { kind: 'scene', from: 'cafe', otherwise: 'cafe.quiet' }
```

A storylet is an ordinary scene in `game.scenes`. It renders, records [seen](/docs/reference/state#seen) and counts as the scene on screen like any other. The only difference is that an effect can pick it by chance.

## Marking a scene

Any scene can be a storylet, a [data scene](/docs/reference/scenes#datascene) or a hand-written [`Scene`](/docs/reference/scenes#scene). These three fields make it one (they're the [`StoryletFields`](/docs/reference/scenes#storyletfields) type):

| Field | Default | What it does |
|---|---|---|
| `drawnFrom` | none | The sets the scene can be drawn from, by name, such as `['cafe']`. A scene can be in more than one. |
| `weight` | `1` | How likely a draw is to pick it, against the other eligible scenes. A scene of weight 3 comes up three times as often as one of weight 1. |
| `when` | always | A [condition](/docs/reference/conditions). The scene is only eligible while it holds. |

`drawnFrom` is separate from `tags`. Tags style a scene in the UI and have nothing to do with draws.

`when` only gates draws. A `{ kind: 'scene', id }` effect or a `scene` command that names the scene opens it whether `when` holds or not.

## Drawing one

```ts
{ kind: 'scene', from: 'cafe' }
{ kind: 'scene', from: 'cafe', otherwise: 'cafe.quiet' }
```

This is the [`scene` effect](/docs/reference/effects#scene) with `from` in place of `id`. It can go in any effect list: a choice, an activity, a trigger or an item's use. When it runs, it:

1. finds the eligible scenes, which are the scenes in `game.scenes` whose `drawnFrom` includes `from` and whose `when` holds;
2. draws one of them by weight, with [`weighted`](/docs/reference/random#weighted);
3. opens the scene it drew.

If no scene is eligible, it opens `otherwise`. If you gave no `otherwise`, the effect leaves the scene on screen as it was. `otherwise` can be any scene, and doesn't need a `drawnFrom` of its own.

`when` is tested against the state as the effect finds it, so an effect earlier in the same list counts. A storylet whose `when` reads a kv key that the same choice sets will see the new value.

## How the draw is seeded

A draw is worked out from the save's [seed](/docs/reference/random#the-seed), the [turn](/docs/reference/state#turn), the name of the set, and how many draws the set has had so far. That count is kept in the kv key `storylet:<name>`, such as `storylet:cafe`, and goes up by one on every draw, including one that found nothing to draw.

So:

- the same save draws the same scene, and reloading doesn't re-roll it;
- a second draw from the same set in the same turn is a fresh draw, because the count has moved on;
- two saves with different seeds draw differently;
- [`replay`](/docs/reference/runner#replay) runs the same commands on the same start and draws the same scenes, because the draw is part of the command.

**Gotchas.**
- The draw walks the eligible scenes in the order they sit in `game.scenes`. A pack or a mod that adds a storylet to a set changes which scene a given save draws next, even when the new one isn't the one drawn.
- The count is per set, not per place. Two activities that both draw from `'cafe'` share one count.
- The engine writes `storylet:` keys itself, so don't use that prefix for your own. See [the kv store](/docs/reference/state#kv).

## Once, at most, and only while

There's no separate once or cooldown setting for a storylet. Its `when` covers it:

```ts
when: { not: { seen: 'cafe.crossword' } }          // once ever
when: { not: { seen: 'cafe.window', gte: 2 } }     // at most twice
when: here('ava')                                  // only while Ava is in the café
when: { stat: 'friendship', of: person('ava'), gte: 25 }  // only once you know her
```

For once a turn, set a kv key in the storylet's choice, list that key in [`rules.resets`](/docs/reference/rules#resets) so it goes back each turn, and test it in `when`.

### A cooldown

`{ since }` counts from the first time a scene was seen, so it can't say "not within three days of the last time". For a cooldown, have the storylet's choice write the turn into a kv key, and test it with a small custom condition:

```ts
import type { Custom, DataScene } from '@ifloom/engine'

// goes on the game as `custom`
const custom: Custom = {
  conditions: {
    // True when the key was never written, or at least `turns` turns ago.
    cooledDown: (state, args) => {
      const last = state.kv[String(args.key)]
      return typeof last !== 'number' || state.turn - last >= Number(args.turns ?? 1)
    },
  },
  effects: {
    stamp: (state, args) => [{ kind: 'kv', key: String(args.key), to: state.turn }],
  },
}

const samAtTheCafe: DataScene = {
  id: 'cafe.sam',
  drawnFrom: ['cafe'],
  when: { custom: 'cooledDown', with: { key: 'cafe.sam.last', turns: 3 } },
  body: [{ text: 'cafe.sam' }],
  choices: [{ id: 'leave', effects: [{ custom: 'stamp', with: { key: 'cafe.sam.last' } }, { kind: 'scene', scene: null }] }],
}
```

Sam turns up at most once every three days. Stamp the key in every way out of the scene, or in the effect that opens it, so a player who leaves another way still starts the wait.

### A chance that it happens at all

A draw always opens something while any storylet is eligible. To make an event rare, put an ordinary storylet in the same set with a bigger weight, such as a `cafe.ordinary` visit where nothing happens. With the window seat at weight 1 and an ordinary visit at weight 3, the window seat comes up about one sit in four. For a chance worked out from the state, such as 20% plus 8% per rank, roll it in a [custom effect](/docs/reference/custom#effects) with [`chance`](/docs/reference/random#chance) and return the draw only when it comes up:

```ts
import { chance, type CustomEffect } from '@ifloom/engine'

const maybeSomething: CustomEffect = (state, args) =>
  chance(20 + 8 * Number(args.rank ?? 0), 100, state.seed, state.turn, 'cafe.event')
    ? [{ kind: 'scene', from: 'cafe', otherwise: 'cafe.quiet' }]
    : []
```

## Adding to a set

A set has no list of members. Every scene that names it in `drawnFrom` is a member, so a [pack](/docs/reference/loader#pack) or a [mod](/docs/reference/mods) adds one just by declaring a scene:

```ts
import type { Pack } from '@ifloom/engine'
import { SCHEMA } from '@ifloom/engine'

export const rainyDays: Pack = {
  id: 'mod:rainy-days',
  schema: SCHEMA,
  prose: {
    'cafe.umbrella': 'Someone has left an umbrella hooked over the back of your chair. Nobody comes back for it.',
    'cafe.umbrella#leave': 'Leave it where it is',
  },
  scenes: [
    {
      id: 'cafe.umbrella',
      drawnFrom: ['cafe'],
      body: [{ text: 'cafe.umbrella' }],
      choices: [{ id: 'leave', effects: [{ kind: 'scene', scene: null }] }],
    },
  ],
}
```

## The showcase café

The [showcase](/docs/guide/showcase#sit-a-while-at-the-café) has a "Sit a while" button in the café. It's a room action on the `cafe` location that runs the activity `sit`:

```ts
// the cafe location's actions
{ id: 'sit', label: 'Sit a while', command: { type: 'activity', id: 'sit' } },

// the pack's activities
{ id: 'sit', blocked: [onlyAt(['cafe'])], effects: [{ kind: 'scene', from: 'cafe', otherwise: 'cafe.quiet' }] },
```

Three scenes are drawn from `'cafe'`, and a fourth is the quiet table for when none of them can happen:

```ts
// The café's storylets: scenes drawn from 'cafe' by "Sit a while", by weight, while their when holds.
{
  id: 'cafe.window',
  title: 'The window seat',
  drawnFrom: ['cafe'],
  weight: 3,
  when: { not: { seen: 'cafe.window', gte: 2 } },
  body: [{ text: 'cafe.window' }],
  choices: [{ id: 'leave', effects: [{ kind: 'scene', scene: null }] }],
},
{
  id: 'cafe.crossword',
  title: 'Seven down',
  drawnFrom: ['cafe'],
  when: { not: { seen: 'cafe.crossword' } },
  body: [{ text: 'cafe.crossword' }],
  choices: [{ id: 'leave', effects: [{ kind: 'stat', stat: 'charm', by: 1 }, { kind: 'scene', scene: null }] }],
},
{
  id: 'cafe.break',
  title: 'Ava’s break',
  speaker: 'ava',
  drawnFrom: ['cafe'],
  weight: 2,
  when: here('ava'),
  body: [{ text: 'cafe.break' }],
  choices: [{ id: 'leave', effects: [{ kind: 'stat', stat: 'friendship', by: 2, of: person('ava') }, { kind: 'scene', scene: null }] }],
},
// When none of them can happen.
{
  id: 'cafe.quiet',
  title: 'A quiet table',
  body: [{ text: 'cafe.quiet' }],
  choices: [{ id: 'leave', effects: [{ kind: 'scene', scene: null }] }],
},
```

While Ava is on shift and nothing has been seen, the window seat has weight 3, Ava's break 2 and the crossword 1, so out of six draws you'd expect three window seats, two breaks and one crossword. The window seat drops out once it's been seen twice, and the crossword once it's been seen at all. Ava's break only comes up while she's [in the room](/docs/plugins/cast#conditions), so on a Sunday, when she isn't working, it's out of the draw too. With all three out, sitting down opens `cafe.quiet`.

`here` and `person` are the [cast plugin](/docs/plugins/cast#helpers)'s helpers, and `onlyAt` is the [places plugin](/docs/plugins/places#helpers)'s. The showcase's test `draws something to happen when you sit a while at the café, and a quiet table when nothing can` sits down with twenty seeds and checks both.

## The checks

The [content checker](/docs/reference/checks) reports:

| Problem | Where | When |
|---|---|---|
| `draws from "…", but no scene is drawn from it` | the effect's list | No scene names the set in its `drawnFrom`. Usually a typo. |
| `goes to unknown scene "…"` | the effect's list | `otherwise` names a scene that doesn't exist. |
| `weight must be above 0` | `scene <id>` | A `weight` of 0 or less, or one that isn't a number. |
| `has a weight but no drawnFrom, so it is never drawn` | `scene <id>` | A `weight` on a scene that isn't in any set. |
| `has a when but no drawnFrom; when only gates draws` | `scene <id>` | A `when` on a scene that isn't in any set. |

A storylet's `when` is checked like [any other condition](/docs/reference/checks#in-a-condition), for unknown stats, scenes and so on.

The effect is checked wherever it is, in item uses and activities too. It says `draws from "<name>", but no scene is drawn from it` and `goes to unknown scene "<id>"`.

## See it in an example

Small Town: the `sit` activity and the `cafe.*` scenes in [`examples/showcase/src/content/town.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/content/town.ts). The test `draws something to happen when you sit a while at the café, and a quiet table when nothing can` in [`examples/showcase/tests/showcase.test.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/tests/showcase.test.ts) plays them.
