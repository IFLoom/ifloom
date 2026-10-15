# Storylines

A storyline is one thread of your story, such as a friendship with Ava or the business of a lost cat. For each one, the engine keeps its own variables and whether it's closed for a while.

```ts
type StorylineDef = { id: string; name: string }

type StorylineState = {
  closedUntil: number | null
  flags: Record<string, FlagValue>
}
```

`StorylineDef` is listed with the rest of the game on [The game](/reference/game#storylinedef). This page is about how storylines behave.

Declare your storylines in `game.storylines`, or in a [pack](/reference/loader#pack)'s `storylines`. A new game starts each one open and with no variables. Its live state is `state.storylines[id]`:

| Field | Meaning |
|---|---|
| `closedUntil` | A [turn](/reference/state#turn). While `state.turn` is below it, the storyline is closed. [`{ kind: 'closeStoryline', id, turns }`](/reference/effects#closestoryline) sets it to the current turn plus `turns`. `null` means open. |
| `flags` | The storyline's variables. Set them with [`{ kind: 'storylineFlag' }`](/reference/effects#storylineflag), read them with a [`{ storylineFlag }`](/reference/conditions#storylineflag) condition, count them with [progress counters](/reference/progress) and show them with the <code v-pre>{{n:storyline.key}}</code> token. |

```ts
storylines: [{ id: 'ava', name: 'Ava' }]

// Ava has had enough of you for three turns.
{ kind: 'closeStoryline', id: 'ava', turns: 3 }

// A choice offered only while she's talking to you.
{ id: 'apologise', when: { storyline: 'ava' }, effects: [/* … */] }
// And one for while she isn't.
{ id: 'leave-a-note', when: { storyline: 'ava', open: false }, effects: [/* … */] }
```

The game and its plugins decide what being closed means. The engine itself only answers the [`{ storyline }`](/reference/conditions#storyline) condition. The [cast](/plugins/cast) won't let the player talk to or call someone whose storyline is closed, and the [quests](/plugins/quests) plugin groups quests by storyline.

The core has no characters. People, who's in the room, and talking and calling come from the [cast plugin](/plugins/cast), and a friendship is a [stat](/reference/stats#entity-stats) on a character rather than part of a storyline.

## storylineOf and storylineOpen

```ts
import { storylineOf, storylineOpen } from '@ifloom/engine'

function storylineOf(state: GameState, id: string): StorylineState
function storylineOpen(state: GameState, id: string): boolean
```

`storylineOf` returns a storyline's state, or an [empty one](#emptystoryline) if the save has none, so it never returns `undefined`. `storylineOpen` is `closedUntil === null || state.turn >= closedUntil`, so a storyline closed until turn 5 is open again on turn 5.

```ts
storylineOpen(state, 'ava')              // true on a new game
storylineOf(state, 'ava').flags.met      // undefined until a storylineFlag sets it
```

**Gotcha:** a storyline the game doesn't declare isn't an error here. It reads as empty and open. The [content checker](/reference/checks) reports a condition, a `storylineFlag` effect or a `closeStoryline` effect that names an unknown storyline.

## emptyStoryline

```ts
import { emptyStoryline } from '@ifloom/engine'

function emptyStoryline(): StorylineState
```

A storyline as a new game has it: `{ closedUntil: null, flags: {} }`. [`startingState`](/reference/commands#startingstate) gives every declared storyline one, and [`hydrate`](/reference/commands#hydrate) adds one for a storyline the save lacks, such as one a mod has added since.
