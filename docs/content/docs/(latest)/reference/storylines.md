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

Declare your storylines in your [content](/docs/reference/loader#content)'s `storylines`. A new game starts each one open and with an empty kv store. Its live state is `state.storylines[id]`:

| Field | Meaning |
|---|---|
| `closedUntil` | A [turn](/docs/reference/state#turn). While `state.turn` is below it, the storyline is closed. [`{ closeStoryline: storyline, turns }`](/docs/reference/effects#closestoryline) sets it to the current turn plus `turns`. `null` means open. |
| `kv` | The storyline's own kv store. Set its keys with the [`kv` effect](/docs/reference/effects#whose-key-it-is) and `of: 'storyline:<id>'`, as in `{ kv: 'visits', by: 1, of: 'storyline:ava' }`, read them with the [`kv` condition](/docs/reference/conditions#kv) and the same `of`, add to them with the effect's `by`, and show them with the `{{kv:visits of=storyline:ava}}` token. |

```ts
storylines: [{ id: 'ava', name: 'Ava' }]

// Ava has had enough of you for three turns.
{ closeStoryline: 'ava', turns: 3 }

// A choice offered only while she's talking to you.
{ id: 'apologise', when: { storyline: 'ava' }, effects: [/* … */] }
// And one for while she isn't.
{ id: 'leave-a-note', when: { storyline: 'ava', open: false }, effects: [/* … */] }
```

The game and its plugins decide what being closed means. The engine itself only answers the [`{ storyline }`](/docs/reference/conditions#storyline) condition. The [cast](/docs/plugins/cast) won't let the player talk to or call someone whose storyline is closed, and the [quests](/docs/plugins/quests) plugin groups quests by storyline.

The core has no characters. People, who's in the room, and talking and calling come from the [cast plugin](/docs/plugins/cast), and a friendship is a [stat](/docs/reference/stats#entity-stats) on a character rather than part of a storyline.

## storylineOpen

```ts
import { storylineOpen } from '@ifloom/engine'

function storylineOpen(state: GameState, id: string): boolean
```

Whether a storyline is open: `closedUntil === null || state.turn >= closedUntil`, so a storyline closed until turn 5 is open again on turn 5. A storyline the save has no record of is open. Its kv keys are read like any others, with `{ kv: 'met', of: 'storyline:ava' }` in a condition.

```ts
storylineOpen(state, 'ava') // true on a new game
```

**Gotcha:** a storyline the game doesn't declare isn't an error here. It reads as empty and open. The [content checker](/docs/reference/checks) reports a condition, a `kv` effect with `of: 'storyline:…'` or a `closeStoryline` effect that names an unknown storyline.

## See it in an example

Small Town: [`examples/showcase/src/world/cast.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/world/cast.ts) declares a storyline each for Ava and Sam and names it on each character, and [`examples/showcase/src/story/ava.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/ava.ts) ties the `friend` quest to Ava's. No example uses a storyline's kv store or closes a storyline yet.
