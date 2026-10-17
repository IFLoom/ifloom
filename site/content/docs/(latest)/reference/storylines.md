---
title: "Storylines"
description: "Storylines: threads of the story with their own kv store, closed for some turns and opened again."
---
A storyline is one thread of your story, such as a friendship with Ava or the business of a lost cat. For each one, the engine keeps a kv store of its own and whether it's closed for a while.

```ts
type StorylineDef = { id: string; name: string }

type StorylineState = {
  closedUntil: number | null
  kv: Record<string, KvValue>
}
```

`StorylineDef` is listed with the rest of the game on [The game](/docs/reference/game#storylinedef). This page is about how storylines behave.

Declare your storylines in `game.storylines`, or in a [pack](/docs/reference/loader#pack)'s `storylines`. A new game starts each one open and with an empty kv store. Its live state is `state.storylines[id]`:

| Field | Meaning |
|---|---|
| `closedUntil` | A [turn](/docs/reference/state#turn). While `state.turn` is below it, the storyline is closed. [`{ kind: 'closeStoryline', storyline, turns }`](/docs/reference/effects#closestoryline) sets it to the current turn plus `turns`. `null` means open. |
| `kv` | The storyline's own kv store. Set its keys with [`{ kind: 'storylineKv' }`](/docs/reference/effects#storylinekv), read them with a [`{ storylineKv }`](/docs/reference/conditions#storylinekv) condition, count them with [progress counters](/docs/reference/progress) and show them with the `{{n:storyline.key}}` token. |

```ts
storylines: [{ id: 'ava', name: 'Ava' }]

// Ava has had enough of you for three turns.
{ kind: 'closeStoryline', storyline: 'ava', turns: 3 }

// A choice offered only while she's talking to you.
{ id: 'apologise', when: { storyline: 'ava' }, effects: [/* … */] }
// And one for while she isn't.
{ id: 'leave-a-note', when: { storyline: 'ava', open: false }, effects: [/* … */] }
```

The game and its plugins decide what being closed means. The engine itself only answers the [`{ storyline }`](/docs/reference/conditions#storyline) condition. The [cast](/docs/plugins/cast) won't let the player talk to or call someone whose storyline is closed, and the [quests](/docs/plugins/quests) plugin groups quests by storyline.

The core has no characters. People, who's in the room, and talking and calling come from the [cast plugin](/docs/plugins/cast), and a friendship is a [stat](/docs/reference/stats#entity-stats) on a character rather than part of a storyline.

## storylineOf and storylineOpen

```ts
import { storylineOf, storylineOpen } from '@ifloom/engine'

function storylineOf(state: GameState, id: string): StorylineState
function storylineOpen(state: GameState, id: string): boolean
```

`storylineOf` returns a storyline's state, or an [empty one](#emptystoryline) if the save has none, so it never returns `undefined`. `storylineOpen` is `closedUntil === null || state.turn >= closedUntil`, so a storyline closed until turn 5 is open again on turn 5.

```ts
storylineOpen(state, 'ava')              // true on a new game
storylineOf(state, 'ava').kv.met      // undefined until a storylineKv sets it
```

**Gotcha:** a storyline the game doesn't declare isn't an error here. It reads as empty and open. The [content checker](/docs/reference/checks) reports a condition, a `storylineKv` effect or a `closeStoryline` effect that names an unknown storyline.

## emptyStoryline

```ts
import { emptyStoryline } from '@ifloom/engine'

function emptyStoryline(): StorylineState
```

A storyline as a new game has it: `{ closedUntil: null, kv: {} }`. [`startingState`](/docs/reference/commands#startingstate) gives every declared storyline one, and [`loadState`](/docs/reference/saves#loadstate) adds one for a storyline a save lacks, such as one a mod has added since.

## See it in an example

Small Town: [`examples/showcase/src/content/town.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/content/town.ts) declares a storyline each for Ava and Sam, names it on each character, and ties the `friend` quest to Ava's. No example uses a storyline's kv store or closes a storyline yet.
