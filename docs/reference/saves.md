# Saves

A save is a snapshot of the whole [`GameState`](/reference/state), with a little written about it for a load screen. There is nothing else to store: same state, same game, same draws (see [Randomness](/reference/random)).

Two parts keep saves:

- a **driver** says *where* — `localStorage`, IndexedDB, memory, or a home of your own;
- the **save store**, [`saves(game, driver)`](#saves), says *what* — slots, metadata, export and import, and old saves carried forward.

```ts
import {
  saves, memoryDriver, localStorageDriver, indexedDbDriver,
  serialize, deserialize, migrate, SAVE_VERSION,
  type Saves, type SaveDriver, type SaveFile, type SaveMeta, type LoadedSave,
  type StorageLike, type IndexedDbLike,
} from '@ifloom/engine'

const store = saves(game, indexedDbDriver())
await store.write('quick', state)
```

Most games never call the store directly: they hand it to the [runner](/reference/runner), which saves, loads and autosaves through it and counts the time played.

## Drivers

The engine never picks where saves live. There is **no default driver**: the game chooses one and hands it to `saves`.

| Driver | Where | Room | Use it for |
|---|---|---|---|
| [`memoryDriver()`](#memorydriver) | A `Map`, gone with the page. | Memory. | Tests, previews. |
| [`localStorageDriver()`](#localstoragedriver) | `localStorage`, or any Web Storage. | About 5MB per origin, shared. | Short games; the simplest thing that persists. |
| [`indexedDbDriver()`](#indexeddbdriver) | IndexedDB. | Large; the browser's own quota. | Long games, big backlogs, mod data. |
| [Your own](#a-driver-of-your-own) | Anywhere: a desktop wrapper's file system, a sync service. | Whatever it has. | Games shipped outside a browser. |

Every driver is asynchronous, even over storage that is not, so a game can swap one for another without changing a line that calls it.

### SaveDriver

```ts
type SaveDriver = {
  name: string
  get: (key: string) => Promise<string | null>
  set: (key: string, value: string) => Promise<void>
  remove: (key: string) => Promise<void>
  keys: (prefix: string) => Promise<string[]>
}
```

Strings by key. `name` is for diagnostics (`'localStorage'`, `'indexedDB'`). `get` returns `null` for a key that is not there. `keys(prefix)` returns every key that starts with `prefix`; the save store uses it to list one game's saves.

### memoryDriver

```ts
function memoryDriver(): SaveDriver
```

Saves in memory, gone when the page is. Each call is a new, empty store.

```ts
const store = saves(game, memoryDriver())
```

### localStorageDriver

```ts
function localStorageDriver(storage?: StorageLike): SaveDriver
```

Saves in `globalThis.localStorage`, or in the Web Storage you pass. Simple and everywhere, but small — around 5MB per origin — and **in Chromium every page opened from disk shares one origin**, so every `file://` game the player has shares those 5MB.

The storage is looked up when a save is first read or written, not when the driver is made. Where there is none (Node, a locked-down iframe), that read or write rejects with `localStorage is not available here`.

### StorageLike

```ts
type StorageLike = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
  key: (index: number) => string | null
  readonly length: number
}
```

The parts of the Web Storage API the driver needs. `localStorage` and `sessionStorage` are both one.

### indexedDbDriver

```ts
function indexedDbDriver(options?: {
  database?: string
  store?: string
  indexedDB?: IndexedDbLike
}): SaveDriver
```

Saves in IndexedDB: asynchronous and roomy. It opens — creating if needed — one database, `database` (default `'ifloom'`), holding one object store of strings by key, `store` (default `'saves'`). `indexedDB` defaults to `globalThis.indexedDB`; pass another for tests, such as `fake-indexeddb`.

```ts
const store = saves(game, indexedDbDriver())
```

Every game can share the default database: keys carry the game's id (see [Keys](#keys)).

**Gotcha:** the database is opened at version 1, and the store is created only when the database is first created. Opening an existing database with a *different* `store` name finds no such store and every call rejects; give a new store a new `database` too.

### IndexedDbLike

```ts
type IndexedDbLike = { open: (name: string, version?: number) => OpenRequest }
```

The part of `indexedDB` the driver needs, typed by the engine because it carries no DOM types. The browser's `indexedDB` is one.

### A driver of your own

Four functions over strings, and a name. A desktop wrapper that writes each save as a file:

```ts
import type { SaveDriver } from '@ifloom/engine'

// `files` is whatever your wrapper exposes: Tauri's fs plugin, an Electron preload, …
function fileDriver(folder: string): SaveDriver {
  const path = (key: string) => `${folder}/${key}.json`
  return {
    name: 'files',
    get: async (key) => ((await files.exists(path(key))) ? files.readText(path(key)) : null),
    set: (key, value) => files.writeText(path(key), value),
    remove: (key) => files.remove(path(key)),
    keys: async (prefix) =>
      (await files.list(folder))
        .filter((name) => name.endsWith('.json'))
        .map((name) => name.slice(0, -'.json'.length))
        .filter((key) => key.startsWith(prefix)),
  }
}
```

Keys contain dots (`corner-cafe.save.auto`), and the slot part is whatever the game named it; a driver that maps keys to file names or URLs should keep them intact or escape them both ways.

## saves

```ts
function saves(game: Game, driver: SaveDriver): Saves
```

One game's saves, kept wherever its driver keeps them. `Saves` is `ReturnType<typeof saves>`.

**Slots are names the game picks**: `'auto'` for the runner's autosave, `'quick'` for a quicksave key, `'1'`, `'2'`, `'3'` for a save screen. There is no fixed number of them.

| Member | What it does |
|---|---|
| `driver` | The driver it was given. |
| `write(slot, state, extra?)` | Writes a [`SaveFile`](#savefile) to the slot, replacing what was there, and returns its [`SaveMeta`](#savemeta). `extra` is `{ name?, played?, savedAt? }`. |
| `read(slot)` | The slot read back as a [`LoadedSave`](#loadedsave); `null` if the slot is empty; a string saying why if it could not be read. |
| `list()` | The `SaveMeta` of every readable save this game has, newest first by `savedAt`. Unreadable ones are left out. |
| `remove(slot)` | Empties a slot. |
| `exportSlot(slot)` | The save as text, for the player to keep as a file; `null` if the slot is empty. |
| `importText(text)` | Reads text from a file the player picked, with the same checks as `read`. Synchronous, and writes nothing. |

```ts
// A load screen.
for (const meta of await store.list()) {
  addRow(meta.name, new Date(meta.savedAt), meta.played)
}

// The player's own copy, and back again.
download('corner-cafe.save', await store.exportSlot('1'))
const loaded = store.importText(await pickedFile.text())
if (typeof loaded === 'string') showMessage(loaded)
else await store.write('1', loaded.state, { name: loaded.meta.name, played: loaded.meta.played })
```

`read` and `importText` refuse with a line the player can read:

| Returns | When |
|---|---|
| `'That is not a save file.'` | Not JSON, or JSON that is not an IFLoom save. |
| `'That save belongs to another game (<id>).'` | The save's `meta.game` is not this game's id. |
| `'That save is from a version this game cannot read.'` | [`migrate`](#migrate) found no route to the current version. |
| `'That save was made with a newer version of <plugin>.'` | A [plugin](/reference/plugins)'s state in the save is newer than the game's plugin. |
| `'That save's <plugin> is from a version this game cannot read.'` | A plugin's state has no [migration](/reference/plugins#migrateplugins) route to its current version. |

These are the engine's English; a game rewords them in the [strings table](/reference/strings#saves) (`notASave`, `otherGame`, `saveTooOld`, `pluginNewer`, `pluginUnreadable`).

After the engine's own format is carried forward, each plugin's state is brought up to date with [`migratePlugins`](/reference/plugins#migrateplugins): a plugin added since the save was made starts fresh, and an older plugin state is carried forward.

**Gotchas:**
- `write` without `played` records `0`. The runner passes the time played for you; when writing an imported save yourself, pass `loaded.meta.played` on.
- `write` without `name` makes one from the state, so an imported save written that way loses the player's name for it. Pass `loaded.meta.name`.
- `read` and `importText` refuse a save whose plugin state cannot be carried forward, and [`apply`](/reference/commands#apply) refuses to run a command on such a state. [`hydrate`](/reference/commands#hydrate) does not refuse, so a [`view`](/reference/view) drawn from a state read some other way can hand a plugin a shape it does not expect. Load saves through the store (or the [runner](/reference/runner), which uses it), or call [`migratePlugins`](/reference/plugins#migrateplugins) yourself and check for a string.

### Keys

| What | Key |
|---|---|
| Slot `s` | `<gameId>.save.<s>` |

**Why the keys carry the game id.** A game opened from disk shares one storage origin with every other game opened from disk in the same browser, and game hosts such as itch.io serve many games from shared domains. Without the id in the key, two games on the engine would overwrite each other's `'auto'`. The id is `game.id` — pick one unique to your game and never change it.

**Why the version is not in the key.** The format's version is stored inside each save and handled by [`migrate`](#migrate). A key that changed with each version would orphan every existing save on the first update.

## SaveFile

```ts
type SaveFile = { ifloom: 1; meta: SaveMeta; state: GameState }
```

A save as it is written, as JSON: the tag `ifloom: 1`, what the save says about itself, and the state. This is the text `exportSlot` returns.

## SaveMeta

```ts
type SaveMeta = {
  game: string
  slot: string
  name: string
  savedAt: number
  played: number
  turn: number
  when: string | null
  player: string | null
  packs: string[]
  plugins: Record<string, number>
  version: number
}
```

What a save says about itself, for a load screen — enough to draw a row without reading the state.

| Field | What |
|---|---|
| `game` | The game's id. Another game's save is refused. |
| `slot` | The slot it was written to. |
| `name` | The player's name for it, or one made from `when`, else `Turn <n>` (the [`turnLabel`](/reference/strings#saves) string, with the turn counted from 1). With the [calendar](/plugins/calendar#the-label) and the [places plugin](/plugins/places#the-label): `'Day 5 · Friday evening · The Corner Café'`. With no plugin that has a label, `'Turn 3'`. |
| `savedAt` | When it was written, epoch milliseconds. Default `Date.now()`. |
| `played` | Time played, in milliseconds, as the [runner](/reference/runner) counted it. |
| `turn` | How many turns had passed: [`state.turn`](/reference/state#turn), from 0. |
| `when` | When and where the game was, in its plugins' [labels](/reference/plugins#labels), as the view shows it in [`view.when`](/reference/view#the-clock-and-the-player): `'Day 5 · Friday evening · The Corner Café'` with the calendar and the places plugin, `'Day 5 · Friday evening'` with the calendar alone. `null` when no plugin says. |
| `player` | The game's `playerName` [variable](/reference/state#flags) when it is a string, else `null`. The engine keeps no name of its own; a game that asks for one under that name gets it on its load screen. |
| `packs` | The ids of the packs the game was loaded from ([`game.packs`](/reference/game)). |
| `plugins` | Each [plugin](/reference/plugins) the game was built with, by id, and the version of its state: `{ quests: 1 }`. |
| `version` | The state's save format, `state.version`. |

## LoadedSave

```ts
type LoadedSave = {
  meta: SaveMeta
  state: GameState
  missingPacks: string[]
  missingPlugins: string[]
}
```

A save read back: what it says about itself, and the state carried forward to the current version.

`missingPacks` names packs the save was made with that this game was not loaded from — a mod the player has since removed. The save still loads; whether to warn, refuse or carry on is the game's call. A state that refers to scenes, items or storylines from a missing pack may not play as it did.

`missingPlugins` names [plugins](/reference/plugins) the save was made with that this game does not have. The save still loads, and the plugin's state is kept in `state.plugins`, unused, so it comes back if a later build adds the plugin again.

```ts
const loaded = await store.read('1')
if (loaded && typeof loaded !== 'string' && loaded.missingPacks.length) {
  showMessage(`This save used mods you do not have: ${loaded.missingPacks.join(', ')}.`)
}
```

## serialize

```ts
function serialize(state: GameState): string
```

`JSON.stringify(state)`: a bare state, without what a [`SaveFile`](#savefile) says about itself. For snapshot tests, debugging and storage of your own.

## deserialize

```ts
function deserialize(raw: string): GameState | null
```

Parses a bare state, [migrates](#migrate) it to the current version, and checks it has a `turn` (a number) and `stats`. Returns `null` for anything that fails — bad JSON, no migration route, missing fields. Never throws.

```ts
const state = deserialize(serialize(before))
```

**Gotcha:** `deserialize` reads what `serialize` wrote, not a save file. Read a save store's saves with `read` or `importText`.

## migrate

```ts
function migrate(data: unknown): GameState | null
```

Carries a parsed state forward to `SAVE_VERSION`, one version at a time, or gives up and returns `null`. A state with no `version` counts as version `0`. The save store runs every save it reads through it.

The steps live in an internal table keyed by the version each step upgrades **from**: entry `1` turns a version-1 save into version 2. If any step on the way is missing, the save is dropped rather than loaded into a shape the engine would misread. A save whose version is higher than `SAVE_VERSION` is dropped too.

There are seven steps so far:

- **1 → 2** moves the player's name out of the top level (`playerName`, `playerFirst`, `playerLast`) into [variables](/reference/state#flags) of the same names, so <code v-pre>{{playerName}}</code> still fills in, and adds an empty [`chosen`](/reference/state#chosen).
- **2 → 3** brings in the [turn](/reference/state#turn). Before it, a day was the only turn there was, so `turn` is set to `time.day` (0 if the save has no `time`), and everything stamped with a day is stamped with that turn: variables named `day:<id>` (the [once-a-turn](/reference/progress#onceperturn) records) become `turn:<id>`, each storyline's `closedUntilDay` becomes [`closedUntil`](/reference/state#storylines), and each [collection](/reference/collections) entry's and [notice](/reference/notices)'s `day` becomes `turn`. `seenOn` and `fired` keep their numbers, which now read as turns.
- **3 → 4** brings in [entities](/reference/entities): it adds an empty [`entities`](/reference/state#entities) and an empty [`created`](/reference/state#created). The game's declared entities are not put in by `migrate`, which does not know the game; [`hydrate`](/reference/commands#hydrate) adds them when the save is next played.
- **4 → 5** takes the clock out of the engine. The save's `time: { day, period }` moves into the [calendar plugin](/plugins/calendar#calendarstate)'s state, `plugins.calendar = { version: 1, state: { day, period } }`, with the old last period `'sleep'` renamed `'late'`, the calendar's word for it. A save that already has a `plugins.calendar` keeps it. A game without the calendar keeps the entry unused, as it keeps any plugin's it does not have.
- **5 → 6** takes places out of the engine. The save's `locationId` is dropped from the top level and moves into the [places plugin](/plugins/places#placesstate)'s state, `plugins.places = { version: 1, state: { at: locationId } }`. A save that already has a `plugins.places` keeps it, and one whose `locationId` was `null` gets no entry: a game with the places plugin then starts that save at the plugin's [`start`](/plugins/places#placesoptions), as [`migratePlugins`](/reference/plugins#migrateplugins) gives any plugin missing from a save its starting state. A game without the places plugin keeps the entry unused.
- **6 → 7** adds an empty [`removed`](/reference/state#removed), the declared entities removed in play. Nothing older recorded them, so a declared entity removed in a save from before version 7 is not on the list, and [`hydrate`](/reference/commands#hydrate) puts it back at its start.
- **7 → 8** takes `standing` and `rapport` off every [storyline](/reference/state#storylines), keeping its `closedUntil` and `flags` (a missing `closedUntil` becomes `null`, missing `flags` `{}`). They are **dropped**, not carried anywhere: a relationship is now a [stat](/reference/stats#entity-stats) the game declares on the [cast](/plugins/cast)'s `character` kind, and the engine cannot know which stat a game meant.

A save from version 0 does not load.

**Gotcha:** `migrate` does not check fields; use `deserialize` for a bare state read from disk.

## SAVE_VERSION

```ts
const SAVE_VERSION: 8
```

The current save format. Every new state carries it in `state.version`. After release it changes when the shape of `GameState` changes, and the bump ships with its migration step — a bump without one throws every player's game away.
