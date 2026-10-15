# Collections

A collection is a named list the game keeps entries in: letters found, photos taken, notes written, a ledger of wages. The game declares each one; effects add entries with [`collect`](/reference/effects#collect) and take them out with [`discard`](/reference/effects#discard); the [`{ collection }`](/reference/conditions#collection) condition asks what is in one; the [view](/reference/view#collections) hands every declared collection to the UI with its words filled in.

```ts
import { collect, collected, collectionById, discard, type CollectionDef, type CollectionItem, type CollectionEntry } from '@ifloom/engine'
```

## A worked example

Rosa leaves a thank-you note at the café. The player keeps it in a box of letters, and a later scene asks whether it is there.

```ts
const core: Pack = {
  id: 'core',
  schema: SCHEMA,
  collections: [
    { id: 'letters', name: 'Letters' },
    { id: 'photos', name: 'Photos', max: 30 },
  ],
  activities: [
    {
      id: 'find-letter',
      effects: [{
        kind: 'collect',
        to: 'letters',
        entry: { id: 'rosa.thanks', title: 'A note from Rosa', text: 'letter.rosa.thanks', data: { from: 'rosa' } },
      }],
    },
    { id: 'burn-letter', effects: [{ kind: 'discard', from: 'letters', id: 'rosa.thanks' }] },
  ],
  prose: { 'letter.rosa.thanks': 'Thank you for the flour, {{playerName}}.' },
  // ...
}
```

After `find-letter` in turn 2 (the third day, in a game whose turn is a day), the state holds the entry as written, with the [turn](/reference/state#turn) it was collected in:

```ts
state.collections.letters
// [{ id: 'rosa.thanks', title: 'A note from Rosa', text: 'letter.rosa.thanks', data: { from: 'rosa' }, turn: 2 }]

view(state, game).collections.letters.entries[0].text
// 'Thank you for the flour, Sam.'

holds(state, { collection: 'letters', id: 'rosa.thanks' }, game)  // true
```

## CollectionDef

```ts
type CollectionDef = {
  id: string
  name: string
  max?: number
}
```

| Field | What it does |
|---|---|
| `id` | What effects and conditions name it by. |
| `name` | What the player sees it called. Passed through to the view. |
| `max` | Keep at most this many entries. When one more is collected, the oldest go first. No limit if left out. |

Declared in [`Game.collections`](/reference/game#game): on the base given to [`loadGame`](/reference/loader#loadgame), or in a [pack](/reference/loader#pack)'s `collections`, or both. They merge by id, the base's first: a later pack's collection replaces an earlier one's with the same id.

## CollectionItem

```ts
type CollectionItem = {
  id: string
  title?: string
  text?: string
  image?: string
  data?: Record<string, FlagValue>
}
```

An entry as content writes it, in a `collect` effect.

| Field | What it holds |
|---|---|
| `id` | Unique within the collection. Collecting an id that is already there does nothing. |
| `title` | A short label, as written: shown as it is, not looked up. |
| `text` | A **prose key** for the entry's words, not the words themselves. The view fills it in for the current save. |
| `image` | An image path, passed through. |
| `data` | Anything else the game wants to keep with it: who sent it, what it paid. |

## CollectionEntry

```ts
type CollectionEntry = CollectionItem & { turn: number }
```

An entry as the state keeps it in [`state.collections`](/reference/state#collections): what was collected, plus the [turn](/reference/state#turn) it was collected in. Entries are kept oldest first.

## Functions

The effects call these; a [plugin](/reference/plugins) or a custom command can call them directly.

### collect

```ts
function collect(state: GameState, game: Game, to: string, item: CollectionItem): GameState
```

The state with `item` added to the end of collection `to`, stamped with the current turn. If an entry with that id is already there, the state is returned unchanged — the old entry keeps its turn and fields. If the collection's `max` is passed, the oldest entries are dropped.

```ts
const next = collect(state, game, 'photos', { id: 'square', title: 'The market square' })
```

### discard

```ts
function discard(state: GameState, from: string, id: string): GameState
```

The state with the entry `id` taken out of collection `from`. Returns the same state if it is not there.

### collected

```ts
function collected(state: GameState, id: string): CollectionEntry[]
```

The entries in a collection, oldest first; `[]` for one with nothing in it, or one the state has never heard of.

```ts
collected(state, 'letters').map((entry) => entry.title)  // ['A note from Rosa']
```

### collectionById

```ts
function collectionById(game: Game, id: string): CollectionDef | undefined
```

The declaration with that id, or `undefined`.

## Gotchas

- **Collecting an id that is already there does nothing.** That is what keeps a letter from being found twice, but it means a ledger with one fixed id records only the first wage. Give each entry its own id; a [custom effect](/reference/effects#computed-effects) can build one from the turn:

  ```ts
  custom: {
    effects: {
      logWage: (state) => [
        { kind: 'collect', to: 'ledger', entry: { id: `wage.${state.turn}`, title: 'Café shift', data: { coins: 12 } } },
        { kind: 'stat', key: 'coins', by: 12 },
      ],
    },
  },
  // an activity: effects: [{ custom: 'logWage' }]
  ```

- **`text` is a prose key.** Write the words in the pack's `prose` and name the key. The loader reports a key with no prose (`no prose for "…"`).
- **Declare every collection.** `collect` into an undeclared id still stores the entries in the state, but the view lists declared collections only, so the UI never sees them. The loader reports `unknown collection "…"` in triggers, activities and data scene choices, and [`validatePack`](/reference/game#validatepack) reports `collection … is not declared` in item uses and activities.
- **`max` drops the oldest silently,** including entries a condition may be waiting on. Ask for an entry by id only in a collection without a `max`, or one large enough that it cannot have rolled off.
- `discard` takes one entry by id. There is no effect that empties a collection.
