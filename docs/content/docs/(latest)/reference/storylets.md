---
title: "Storylets"
description: "A storylet is a scene drawn at random from a named set by weight and condition, with the seeded draw and its checks."
---
A storylet is a scene an effect draws at random from a named set, such as the small things that happen while the player sits in the café. A scene in content's `scenes` joins a set with its [`StoryletFields`](#storyletfields), and the [`scene` effect](#scene) with `from` draws one of the scenes eligible now. [Offer a random scene](/docs/how-to/offer-a-random-scene) sets one up, with recipes for once, at most and a cooldown, and [Why IFLoom works this way](/docs/explanation/design#the-same-save-gives-the-same-draws) explains why a draw can't be had again by reloading.

In the showcase: `examples/showcase/src/story/cafe.ts`, whose `sit` action draws one of three `cafe.*` scenes, or the quiet table when none can happen.

```ts
import type { StoryletFields } from '@ifloom/engine'
```

## StoryletFields

The fields that make a scene a storylet, the sets it is drawn from, its weight and its condition. Every field is in [`StoryletFields`](/docs/api/engine#storyletfields).

A storylet is an ordinary scene in `game.scenes`. It renders, counts as [seen](/docs/reference/state#seen) and stays on screen as any other scene does, and the only difference is that an effect can draw it.

| Field | Meaning |
|---|---|
| `drawnFrom` | The sets the scene can be drawn from, such as `['cafe']`. A scene can be in several, and `tags` play no part. |
| `weight` | How often a draw picks the scene against the other eligible ones, 1 if left out. A scene of weight 3 comes up three times as often as one of weight 1. |
| `when` | The condition the scene is eligible under. It gates draws only, so a `scene` command or a `{ scene: 'id' }` effect opens the scene whether it holds or not. |

A set has no list of its members. Every scene that names the set in `drawnFrom` is one, so another content file or a [mod](/docs/reference/mods) adds to a set by declaring a scene.

```ts
import type { DataScene } from '@ifloom/engine'
import { cast } from '@ifloom/plugin-cast'

export const avasBreak: DataScene = {
  id: 'cafe.break',
  title: 'Ava’s break',
  speaker: 'ava',
  drawnFrom: ['cafe'],
  weight: 2,
  when: cast.here('ava'),
  body: [{ prose: 'cafe.break' }],
  choices: [{ id: 'leave', effects: [{ stat: 'friendship', by: 2, of: cast.character('ava') }, { scene: null }] }],
}
```

## Effects

### scene

Draws a scene from the set `from` and opens it, or opens `otherwise` when no scene in the set is eligible. Every field is in the `scene` form of [`Effect`](/docs/api/engine#effect).

This is the [`scene` effect](/docs/reference/effects#scene) with `from` in place of a scene's id, so it goes in any list of effects, a choice's, an action's, a trigger's or a thing's use. When it runs, the engine takes these steps:

1. It finds the eligible scenes, those in `game.scenes` whose `drawnFrom` holds `from` and whose `when` holds.
2. It draws one by weight with [`weighted`](/docs/reference/random#weighted).
3. It opens the scene it drew.

With no eligible scene, the effect opens `otherwise`, which can be any scene and needs no `drawnFrom` of its own. With no `otherwise`, the screen stays as it was. The engine tests each `when` against the state as the effect finds it, so an effect earlier in the same list counts.

```ts fragment
{ scene: { from: 'cafe', otherwise: 'cafe.quiet' } }
```

The engine seeds the draw from the save's seed, the [turn](/docs/reference/state#turn), the set's name and the count of the set's draws so far. The same save draws the same scene, a second draw from one set in one turn is a fresh draw, and a [replay](/docs/reference/runner#replay) draws what the save drew.

## State

The engine counts each set's draws in the [kv store](/docs/reference/glossary#kv) under `storylet:<name>`, such as `storylet:cafe`. The count goes up by one on every draw, one that found nothing to draw included, and goes into the next draw's seed.

## Checks

The [content checker](/docs/reference/checks) checks every storylet and every draw:

| Problem | Cause |
|---|---|
| `draws from "cafe", but no scene is drawn from it` | No scene names the set in its `drawnFrom`, which is usually a typo. |
| `goes to unknown scene "cafe.quiet"` | `otherwise` names a scene the game doesn't have. |
| `weight must be above 0` | A scene's `weight` is 0 or less, or isn't a number. |
| `has a weight but no drawnFrom, so it is never drawn` | A scene has a `weight` and is in no set. |
| `has a when but no drawnFrom; when only gates draws` | A scene has a `when` and is in no set. |

The checker checks a storylet's `when` as it checks [any other condition](/docs/reference/conditions#checks), and checks the draw wherever it stands, in actions and triggers too.

## Caveats

- The draw walks the eligible scenes in their order in `game.scenes`. A content file or mod that adds a storylet to a set changes which scene a save draws next, even when the new one isn't the one drawn.
- The count is per set. Two actions that draw from `'cafe'` share one count.
- The engine writes the `storylet:` keys, so keep that prefix out of your own kv keys.
- A draw opens a scene whenever any scene in the set is eligible. A rare event needs an ordinary scene of greater weight beside it in the set, as [Offer a random scene](/docs/how-to/offer-a-random-scene) shows.
