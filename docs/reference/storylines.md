# Storylines

A **storyline** is a thread of the story: a friendship with the baker, a run of the market's errands, the business of the lost cat. The engine keeps a little for each: its variables, its counters, and whether it is closed for a while.

`StorylineDef` is listed with the rest of the game on [The game](/reference/game#storylinedef). This page is about how storylines behave.

## Characters

**The engine core has no characters.** People who keep their own hours, who is in the room, talking and calling all belong to [`@ifloom/plugin-cast`](/plugins/cast), as places belong to [`@ifloom/plugin-places`](/plugins/places). What a game keeps about a person, such as a friendship, is a [stat](/reference/stats#entity-stats) it declares on the cast's `character` kind, not part of a storyline:

```ts
stats: [{ id: 'friendship', label: 'Friendship', of: 'character' }]

{ kind: 'stat', key: 'friendship', by: 5, of: person('rosa') }   // an effect
{ stat: 'friendship', of: person('rosa'), gte: 25 }             // a condition
```

A character can belong to a storyline through the cast's [`storyline`](/plugins/cast#characterdef) field: while it is closed, they will not talk or pick up. See [Shapes of game](/guide/shapes).

## Storylines

```ts
type StorylineDef = { id: string; name: string }

type StorylineState = {
  closedUntil: number | null
  flags: Record<string, FlagValue>
}
```

A storyline is declared in `game.storylines` (or a [pack](/reference/loader#pack)'s `storylines`). A new game starts each one empty: open, with no variables. Its live state is `state.storylines[id]`:

| Field | Meaning |
|---|---|
| `closedUntil` | A [turn](/reference/state#turn). While `state.turn` is below this, the storyline is **closed**. Set by [`{ kind: 'closeStoryline', id, turns }`](/reference/effects#closestoryline). `null` is open. |
| `flags` | Storyline variables. Set by [`{ kind: 'storylineFlag' }`](/reference/effects#storylineflag), read with [`{ storylineFlag }`](/reference/conditions#storylineflag) conditions, counted with [progress counters](/reference/progress) and the <code v-pre>{{n:storyline.key}}</code> token. |

What being closed means is up to the game and its plugins. The engine itself only answers the [`{ storyline }`](/reference/conditions#storyline) condition; the [cast](/plugins/cast) refuses to talk to or call someone whose storyline is closed, and the [quests](/plugins/quests) plugin groups quests by storyline.

```ts
storylines: [{ id: 'rosa', name: 'Rosa' }]

// Rosa has had enough of you for three turns.
{ kind: 'closeStoryline', id: 'rosa', turns: 3 }

// A choice offered only while she is talking to you.
{ id: 'apologise', when: { storyline: 'rosa' }, effects: [/* … */] }
// And one for while she is not.
{ id: 'leave-a-note', when: { storyline: 'rosa', open: false }, effects: [/* … */] }
```

### storylineOf and storylineOpen

```ts
import { storylineOf, storylineOpen } from '@ifloom/engine'

function storylineOf(state: GameState, id: string): StorylineState
function storylineOpen(state: GameState, id: string): boolean
```

`storylineOf` returns a storyline's state, or an [empty one](#emptystoryline) if the save has none, so it never returns `undefined`. `storylineOpen` is `closedUntil === null || state.turn >= closedUntil`: a storyline closed until turn 5 is open again on turn 5.

```ts
storylineOpen(state, 'rosa')              // true on a new game
storylineOf(state, 'rosa').flags.met      // undefined until a storylineFlag sets it
```

**Gotcha:** a storyline the game does not declare is not an error here: it reads as empty and open. The [loader](/reference/loader#loadgame) reports content that names an unknown storyline.

### emptyStoryline

```ts
import { emptyStoryline } from '@ifloom/engine'

function emptyStoryline(): StorylineState
```

A storyline as a new game has it: `{ closedUntil: null, flags: {} }`. [`startingState`](/reference/commands#startingstate) gives every declared storyline one, and [`hydrate`](/reference/commands#hydrate) adds one for a storyline a save lacks (one a mod added since).
