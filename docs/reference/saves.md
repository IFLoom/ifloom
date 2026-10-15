# Saves

To save a game, you write its whole [`GameState`](/reference/state) to a slot, along with a few details for a load screen. Nothing else needs storing, because the same state in the same game gives the same draws (see [Randomness](/reference/random)).

Saving has two parts:

- **The driver** decides where saves are kept: `localStorage`, IndexedDB, memory, or somewhere of your own.
- **The save store**, [`saves(game, driver)`](#saves), handles slots, the details for a load screen, export and import, and carrying old saves forward.

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

Most games never call the store directly. They hand it to the [runner](/reference/runner), which saves, loads and autosaves through it and counts the time played.

## Drivers

The engine never picks where saves live. There's no default driver, so your game chooses one and hands it to `saves`.

| Driver | Where | Room | Use it for |
|---|---|---|---|
| [`memoryDriver()`](#memorydriver) | A `Map`, gone with the page. | Memory. | Tests, previews. |
| [`localStorageDriver()`](#localstoragedriver) | `localStorage`, or any Web Storage. | About 5MB per origin, shared. | Short games. It's the simplest driver that keeps saves. |
| [`indexedDbDriver()`](#indexeddbdriver) | IndexedDB. | Large, up to the browser's own quota. | Long games, big backlogs, mod data. |
| [Your own](#a-driver-of-your-own) | Anywhere: a desktop wrapper's file system, a sync service. | Whatever it has. | Games shipped outside a browser. |

Every driver is asynchronous, even over storage that isn't, so you can swap one for another without changing the code that calls it.

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

A driver stores strings by key. `name` is for diagnostics (`'localStorage'`, `'indexedDB'`). `get` returns `null` for a key that isn't there. `keys(prefix)` returns every key that starts with `prefix`, which the save store uses to list one game's saves.

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

Saves in `globalThis.localStorage`, or in the Web Storage you pass. It works everywhere but it's small, around 5MB per origin. In Chromium every page opened from disk shares one origin, so every `file://` game the player has shares those 5MB.

The driver looks for the storage when a save is first read or written, not when you make it. Where there's none (Node, a locked-down iframe), that read or write rejects with `localStorage is not available here`.

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

Saves in IndexedDB, which has far more room. It opens one database, `database` (default `'ifloom'`), creating it if needed. That database holds one object store of strings by key, `store` (default `'saves'`). `indexedDB` defaults to `globalThis.indexedDB`. Pass another for tests, such as `fake-indexeddb`.

```ts
const store = saves(game, indexedDbDriver())
```

Every game can share the default database, because keys carry the game's id (see [Keys](#keys)).

**Gotcha:** the database is opened at version 1, and the store is only created along with the database. If you open an existing database with a different `store` name, there's no such store and every call rejects. Give a new store a new `database` too. If IndexedDB isn't there at all, every call rejects with `IndexedDB is not available here`.

### IndexedDbLike

```ts
type IndexedDbLike = { open: (name: string, version?: number) => OpenRequest }
```

The part of `indexedDB` the driver needs, typed by the engine because it carries no DOM types. The browser's `indexedDB` is one.

### A driver of your own

A driver is a name and four functions over strings. Here's one for a desktop wrapper that writes each save as a file:

```ts
import type { SaveDriver } from '@ifloom/engine'

// `files` is whatever your wrapper exposes, such as Tauri's fs plugin or an Electron preload.
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

Keys contain dots (`corner-cafe.save.auto`), and the slot part is whatever the game named it. A driver that turns keys into file names or URLs should keep them intact, or escape them in a way it can undo.

## saves

```ts
function saves(game: Game, driver: SaveDriver): Saves
```

One game's saves, kept wherever its driver keeps them. `Saves` is `ReturnType<typeof saves>`.

Slots are names your game picks, such as `'auto'` for the runner's autosave, `'quick'` for a quicksave key, or `'1'`, `'2'` and `'3'` for a save screen. There's no fixed number of them.

| Member | What it does |
|---|---|
| `driver` | The driver it was given. |
| `write(slot, state, extra?)` | Writes a [`SaveFile`](#savefile) to the slot, replacing what was there, and returns its [`SaveMeta`](#savemeta). `extra` is `{ name?, played?, savedAt? }`. |
| `read(slot)` | The slot read back as a [`LoadedSave`](#loadedsave). `null` if the slot is empty, or a string saying why if it couldn't be read. |
| `list()` | The `SaveMeta` of every readable save this game has, newest first by `savedAt`. Unreadable ones are left out. |
| `remove(slot)` | Empties a slot. |
| `exportSlot(slot)` | The save as text, for the player to keep as a file. `null` if the slot is empty. |
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

`read` and `importText` refuse a save with a line the player can read:

| Returns | When |
|---|---|
| `'That is not a save file.'` | Not JSON, or JSON that isn't an IFLoom save. |
| `'That save belongs to another game (<id>).'` | The save's `meta.game` isn't this game's id. |
| `'That save is from a version this game cannot read.'` | [`migrate`](#migrate) found no route to the current version. |
| `'That save was made with a newer version of <plugin>.'` | A [plugin](/reference/plugins)'s state in the save is newer than the game's plugin. |
| `'That save's <plugin> is from a version this game cannot read.'` | A plugin's state has no [migration](/reference/plugins#migrateplugins) route to its current version. |

These are the engine's English. A game rewords them in the [strings table](/reference/strings#saves) as `notASave`, `otherGame`, `saveTooOld`, `pluginNewer` and `pluginUnreadable`.

After the engine's own format is carried forward, each plugin's state is brought up to date with [`migratePlugins`](/reference/plugins#migrateplugins). A plugin added since the save was made starts fresh, and an older plugin state is carried forward. Finally the state goes through [`hydrate`](/reference/commands#hydrate), so a declared entity or storyline the save lacks joins it.

**Gotchas:**
- `write` without `played` records `0`. The runner passes the time played for you. When you write an imported save yourself, pass `loaded.meta.played` on.
- `write` without `name` makes one from the state, so an imported save written that way loses the player's name for it. Pass `loaded.meta.name`.
- `read` and `importText` refuse a save whose plugin state can't be carried forward, and [`apply`](/reference/commands#apply) refuses to run a command on such a state. [`hydrate`](/reference/commands#hydrate) doesn't refuse, so a [`view`](/reference/view) drawn from a state you read some other way can hand a plugin a shape it doesn't expect. Load saves through the store (or the [runner](/reference/runner), which uses it), or call [`migratePlugins`](/reference/plugins#migrateplugins) yourself and check for a string.

### Keys

| What | Key |
|---|---|
| Slot `s` | `<gameId>.save.<s>` |

The keys carry the game's id because a game opened from disk shares one storage origin with every other game opened from disk in the same browser, and game hosts such as itch.io serve many games from shared domains. Without the id, two IFLoom games would overwrite each other's `'auto'`. The id is `game.id`, so pick one unique to your game and never change it.

The keys don't carry the save format's version. That's stored inside each save and handled by [`migrate`](#migrate). A key that changed with each version would lose every existing save on the first update.

## SaveFile

```ts
type SaveFile = { ifloom: 1; meta: SaveMeta; state: GameState }
```

A save as it's written, as JSON: the tag `ifloom: 1`, the save's details, and the state. This is the text `exportSlot` returns.

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

What a save says about itself, which is enough to draw a row on a load screen without reading the state.

| Field | What |
|---|---|
| `game` | The game's id. Another game's save is refused. |
| `slot` | The slot it was written to. |
| `name` | The player's name for it, or one made from `when`, else `Turn <n>` (the [`turnLabel`](/reference/strings#saves) string, with the turn counted from 1). With the [calendar](/plugins/calendar#the-label) and the [places plugin](/plugins/places#the-label): `'Day 5 · Friday evening · The Corner Café'`. With no plugin that has a label, `'Turn 3'`. |
| `savedAt` | When it was written, epoch milliseconds. Default `Date.now()`. |
| `played` | Time played, in milliseconds, as the [runner](/reference/runner) counted it. |
| `turn` | How many turns had passed: [`state.turn`](/reference/state#turn), from 0. |
| `when` | When and where the game was, in its plugins' [labels](/reference/plugins#labels), as the view shows it in [`view.when`](/reference/view#the-clock-and-the-player): `'Day 5 · Friday evening · The Corner Café'` with the calendar and the places plugin, `'Day 5 · Friday evening'` with the calendar alone. `null` when no plugin says. |
| `player` | The game's `playerName` [variable](/reference/state#flags) when it's a string, else `null`. The engine keeps no name of its own, so a game that stores the player's name under that variable gets it on its load screen. |
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

A save read back: its details, and the state carried forward to the current version.

`missingPacks` names packs the save was made with that this game wasn't loaded from, such as a mod the player has since removed. The save still loads, and your game decides whether to warn, refuse or carry on. A state that refers to scenes, items or storylines from a missing pack may not play as it did.

`missingPlugins` names [plugins](/reference/plugins) the save was made with that this game doesn't have. The save still loads, and the plugin's state is kept in `state.plugins`, unused, so it comes back if a later build adds the plugin again.

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

`JSON.stringify(state)`. It writes a bare state, without a [`SaveFile`](#savefile)'s details. Use it for snapshot tests, debugging and storage of your own.

## deserialize

```ts
function deserialize(raw: string): GameState | null
```

Parses a bare state, [migrates](#migrate) it to the current version, and checks it has a `turn` (a number) and `stats`. It returns `null` for bad JSON, a state with no migration route or one missing those fields. It never throws.

```ts
const state = deserialize(serialize(before))
```

**Gotcha:** `deserialize` reads what `serialize` wrote, not a save file. Read a save store's saves with `read` or `importText`.

## migrate

```ts
function migrate(data: unknown): GameState | null
```

Carries a parsed state forward to `SAVE_VERSION`, one version at a time, or gives up and returns `null`. A state with no `version` counts as version `0`. The save store runs every save it reads through `migrate`.

The steps live in an internal table keyed by the version each step upgrades from, so entry `1` turns a version-1 save into version 2. If any step on the way is missing, the save is dropped rather than loaded into a shape the engine would misread. A save whose version is higher than `SAVE_VERSION` is dropped too.

There are eight steps so far.

- **1 → 2** moves the player's name out of the top level (`playerName`, `playerFirst`, `playerLast`) into [variables](/reference/state#flags) of the same names, so <code v-pre>{{playerName}}</code> still fills in, and adds an empty [`chosen`](/reference/state#chosen).
- **2 → 3** brings in the [turn](/reference/state#turn). Before it, a day was the only turn there was, so `turn` is set to `time.day` (0 if the save has no `time`), and everything stamped with a day is stamped with that turn: variables named `day:<id>` (the [once-a-turn](/reference/progress#onceperturn) records) become `turn:<id>`, each storyline's `closedUntilDay` becomes [`closedUntil`](/reference/state#storylines), and each [collection](/reference/collections) entry's and [notice](/reference/notices)'s `day` becomes `turn`. `seenOn` and `fired` keep their numbers, which now read as turns.
- **3 → 4** brings in [entities](/reference/entities): it adds an empty [`entities`](/reference/state#entities) and an empty [`created`](/reference/state#created). `migrate` doesn't know the game, so it doesn't put in the game's declared entities. [`hydrate`](/reference/commands#hydrate) adds them when the save is next played.
- **4 → 5** takes the clock out of the engine. The save's `time: { day, period }` moves into the [calendar plugin](/plugins/calendar#calendarstate)'s state, `plugins.calendar = { version: 1, state: { day, period } }`, with the old last period `'sleep'` renamed `'late'`, the calendar's word for it. A save that already has a `plugins.calendar` keeps it. A game without the calendar keeps the entry unused, as it keeps the state of any plugin it doesn't have.
- **5 → 6** takes places out of the engine. The save's `locationId` is dropped from the top level and moves into the [places plugin](/plugins/places#placesstate)'s state, `plugins.places = { version: 1, state: { at: locationId } }`. A save that already has a `plugins.places` keeps it, and one whose `locationId` was `null` gets no entry. A game with the places plugin then starts that save at the plugin's [`start`](/plugins/places#placesoptions), because [`migratePlugins`](/reference/plugins#migrateplugins) gives any plugin missing from a save its starting state. A game without the places plugin keeps the entry unused.
- **6 → 7** adds an empty [`removed`](/reference/state#removed), the list of declared entities removed in play. Older saves didn't record them, so a declared entity removed in a save from before version 7 isn't on the list, and [`hydrate`](/reference/commands#hydrate) puts it back at its start.
- **7 → 8** takes `standing` and `rapport` off every [storyline](/reference/state#storylines), keeping its `closedUntil` and `flags` (a missing `closedUntil` becomes `null`, missing `flags` `{}`). They're dropped, not carried anywhere. A relationship is now a [stat](/reference/stats#entity-stats) the game declares on the [cast](/plugins/cast)'s `character` kind, and the engine can't know which stat a game meant.
- **8 → 9** adds an empty [`settings`](/reference/state#settings). When the save next loads, [`hydrate`](/reference/commands#hydrate) gives each `play` [setting](/reference/settings) the game declares its default, so an old save plays with the defaults rather than the player's stored choices.

A save from version 0 doesn't load.

**Gotcha:** `migrate` doesn't check fields. Use `deserialize` for a bare state read from disk.

## SAVE_VERSION

```ts
const SAVE_VERSION: 9
```

The current save format. Every new state carries it in `state.version`. It goes up when the shape of `GameState` changes, and the bump ships with its migration step. A bump without one would make every player's existing saves unreadable.
