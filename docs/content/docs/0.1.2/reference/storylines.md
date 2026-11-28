---
title: "Storylines"
description: "A storyline is one thread of the story with a kv store of its own, which can close for some turns and open again."
---
A storyline is one thread of the story, such as a friendship with Ava or the business of a lost cat. Your content declares each one in `storylines`, and the engine keeps a kv store for it and whether it's closed for a while. [Entities, things and traits](/docs/0.1.2/explanation/entities-and-traits#stats-the-kv-store-and-storylines) explains a storyline beside stats and the kv store.

In the showcase: `examples/showcase/src/world/cast.ts`, which declares a storyline each for Ava and Sam and names it on each character.

```ts
import { storylineOpen, type StorylineDef, type StorylineState } from '@ifloom/engine'
```

## StorylineDef

A thread of the story the game declares in `storylines`, with an id and a name. Every field is in [`StorylineDef`](/docs/0.1.2/api/engine#storylinedef).

A new game starts each declared storyline open with an empty kv store. The [`closeStoryline`](/docs/0.1.2/reference/effects#closestoryline) effect closes one for some turns, and the [`storyline`](/docs/0.1.2/reference/conditions#storyline) condition asks whether it's open. The engine gives being closed no other meaning, so the game and its plugins decide what it stops. The [cast plugin](/docs/0.1.2/reference/plugins/cast) won't let the player talk to or call someone whose storyline is closed, and the [quests plugin](/docs/0.1.2/reference/plugins/quests) groups quests by storyline. A character names its storyline in its `storyline` field, but a storyline needs no character. The view renders no storylines of its own.

```ts
import type { Content } from '@ifloom/engine'

export const ava: Content = {
  storylines: [{ id: 'ava', name: 'Ava' }],
  actions: [
    { id: 'apologise', label: 'Say sorry to Ava', when: { storyline: 'ava' }, effects: [{ kv: 'apologies', by: 1, of: 'storyline:ava' }] },
    { id: 'snap', label: 'Snap at Ava', effects: [{ closeStoryline: 'ava', turns: 3 }] },
  ],
}
```

## State

### StorylineState

A storyline as the save keeps it, at `state.storylines[id]`. Every field is in [`StorylineState`](/docs/0.1.2/api/engine#storylinestate).

`closedUntil` is the [turn](/docs/0.1.2/reference/state#turn) the storyline opens again, or `null` while it's open. `{ closeStoryline: 'ava', turns: 3 }` sets it to the current turn plus 3. `kv` is the storyline's own kv store. The [`kv` effect](/docs/0.1.2/reference/effects#kv) and [`kv` condition](/docs/0.1.2/reference/conditions#kv) reach it with `of: 'storyline:<id>'`, and prose prints a key with `{{kv:visits of=storyline:ava}}`. A storyline the save has no record of reads as open with an empty kv store.

## Functions

### storylineOpen

Returns whether a storyline is open on the state's turn. Every parameter is in [`storylineOpen`](/docs/0.1.2/api/engine#storylineopen).

A storyline is open when its `closedUntil` is `null` or the turn has reached it, so one closed until turn 5 is open again on turn 5. A storyline the save has no record of is open.

```ts given
import { storylineOpen } from '@ifloom/engine'

storylineOpen(state, 'ava') // true on a new game
```

## Checks

The [content checker](/docs/0.1.2/reference/checks) reports a `storyline` condition, a `kv` effect or condition with `of: 'storyline:…'` and a `closeStoryline` effect that name a storyline the game doesn't declare.

## Caveats

- A storyline the game doesn't declare reads as empty and open at run time, so a typo in its id fails silently until the checker runs.
