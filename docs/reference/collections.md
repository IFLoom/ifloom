# Collections

A collection is a named list the game keeps entries in, such as notes found, photos taken or a ledger of wages. You declare each one. Effects add entries with [`collect`](/reference/effects#collect) and take them out with [`discard`](/reference/effects#discard), and the [`{ collection }`](/reference/conditions#collection) condition asks what's in one. The [view](/reference/view#collections) hands every declared collection to the UI with its words filled in.

```ts
import { collect, collected, collectionById, discard, type CollectionDef, type CollectionItem, type CollectionEntry } from '@ifloom/engine'
```

## A worked example

In the showcase, Sam leaves a welcome note under the door. The player keeps it in their notes, and the camera fills a gallery of photos.

```ts
import { SCHEMA, type Pack } from '@ifloom/engine'

const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  collections: [
    { id: 'notes', name: 'Notes' },
    { id: 'gallery', name: 'Photos', max: 30 },
  ],
  activities: [
    {
      id: 'read-note',
      effects: [{ kind: 'collect', to: 'notes', entry: { id: 'welcome', title: 'Welcome note', text: 'notice.welcome', data: { from: 'sam' } } }],
    },
    { id: 'bin-note', effects: [{ kind: 'discard', from: 'notes', id: 'welcome' }] },
  ],
  prose: { 'notice.welcome': 'Welcome to the building, {{playerName}}! Bins go out Thursday.' },
}
```

After `read-note` in turn 2, the state holds the entry as written, with the [turn](/reference/state#turn) it was collected in:

```ts
import { holds, view } from '@ifloom/engine'

state.collections.notes
// [{ id: 'welcome', title: 'Welcome note', text: 'notice.welcome', data: { from: 'sam' }, turn: 2 }]

view(state, game).collections.notes.entries[0].text
// 'Welcome to the building, Alex! Bins go out Thursday.'

holds(state, { collection: 'notes', id: 'welcome' }, game)  // true
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

Declare collections in [`Game.collections`](/reference/game#game), either on the base you give [`loadGame`](/reference/loader#loadgame) or in a [pack](/reference/loader#pack)'s `collections`, or both. They merge by id with the base's first, so a later pack's collection replaces an earlier one with the same id.

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
| `id` | Unique within the collection. Collecting an id that's already there does nothing. |
| `title` | A short label. It's shown as written, not looked up. |
| `text` | A prose key for the entry's words, not the words themselves. The view fills it in for the current save. |
| `image` | An image path, passed through. |
| `data` | Anything else the game wants to keep with it, such as who sent it or what it paid. |

## CollectionEntry

```ts
type CollectionEntry = CollectionItem & { turn: number }
```

An entry as the state keeps it in [`state.collections`](/reference/state#collections). It's what was collected, plus the [turn](/reference/state#turn) it was collected in. Entries are kept oldest first.

## Functions

The effects call these. A [plugin](/reference/plugins) or a custom command can call them directly.

### collect

```ts
import { collect } from '@ifloom/engine'

function collect(state: GameState, game: Game, to: string, item: CollectionItem): GameState
```

Returns the state with `item` added to the end of collection `to`, stamped with the current turn. If an entry with that id is already there, the state comes back unchanged, and the old entry keeps its turn and fields. If the collection goes over its `max`, the oldest entries are dropped.

```ts
const next = collect(state, game, 'gallery', { id: 'photo.ava', title: 'Ava at work', image: 'art/photo/ava.svg' })
```

### discard

```ts
import { discard } from '@ifloom/engine'

function discard(state: GameState, from: string, id: string): GameState
```

Returns the state with the entry `id` taken out of collection `from`, or the same state if it isn't there.

### collected

```ts
import { collected } from '@ifloom/engine'

function collected(state: GameState, id: string): CollectionEntry[]
```

The entries in a collection, oldest first. It's `[]` for a collection with nothing in it, or one the state has never heard of.

```ts
collected(state, 'notes').map((entry) => entry.title)  // ['Welcome note']
```

### collectionById

```ts
import { collectionById } from '@ifloom/engine'

function collectionById(game: Game, id: string): CollectionDef | undefined
```

The declaration with that id, or `undefined`.

## Gotchas

- **Collecting an id that's already there does nothing.** That stops a note being found twice, but it also means a ledger with one fixed id records only the first wage. Give each entry its own id. A [custom effect](/reference/effects#computed-effects) can build one from the turn:

  ```ts
  custom: {
    effects: {
      logWage: (state) => [
        { kind: 'collect', to: 'ledger', entry: { id: `wage.${state.turn}`, title: 'Office shift', data: { coins: 20 } } },
        { kind: 'stat', key: 'coins', by: 20 },
      ],
    },
  },
  // in an activity: effects: [{ custom: 'logWage' }]
  ```

- **`text` is a prose key.** Write the words in the pack's `prose` and name the key. The [content checker](/reference/checks) reports a key with no prose as `no prose for "…"`.
- **Declare every collection.** A `collect` into an undeclared id still stores the entries in the state, but the view only lists declared collections, so the UI never sees them. The [content checker](/reference/checks) reports `unknown collection "…"` wherever the effect is.
- **`max` drops the oldest without telling anyone.** That includes entries a condition may be waiting for. Only ask for an entry by id in a collection without a `max`, or one large enough that it can't have rolled off.
- **`discard` takes one entry by id.** There's no effect that empties a collection.
