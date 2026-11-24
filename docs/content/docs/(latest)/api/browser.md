---
title: "@ifloom/browser"
description: "Every export of @ifloom/browser, the browser helpers for any UI: its signature and its fields."
---
Generated from the source of `@ifloom/browser` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

- Functions: [`browserRunner`](#browserrunner), [`dialogOpen`](#dialogopen), [`ignoredKey`](#ignoredkey), [`indexedDbDriver`](#indexeddbdriver), [`localStorageDriver`](#localstoragedriver), [`minigameInput`](#minigameinput), [`nextSlot`](#nextslot), [`numberedChoices`](#numberedchoices), [`startClock`](#startclock), [`startKeys`](#startkeys), [`startMinigameKeys`](#startminigamekeys), [`startRevealSkip`](#startrevealskip)
- Types: [`ClockOptions`](#clockoptions), [`IndexedDbLike`](#indexeddblike), [`KeysOptions`](#keysoptions), [`StorageLike`](#storagelike)

## browserRunner

Function. Explained in [Browser helpers](/docs/reference/browser#browserrunner).

Returns a runner set up for a browser, with saves and a profile in `localStorage`. Each runner option you pass
replaces that option's default whole.

The defaults are a new game with a random seed, undo 50 steps deep and an autosave each turn. It reads the profile
before it starts, so the new game has the player's play settings and `settings()` has their UI settings from the
first frame. Pass `start` to begin from another state. The React UI's `mountGame` and the templates use it.

```ts shape
import { browserRunner } from '@ifloom/browser'
function browserRunner(game: Game, options?: RunnerOptions & { start?: GameState }): Promise<Runner>
```

Uses: [`Game`](/docs/api/engine#game), [`RunnerOptions`](/docs/api/engine#runneroptions), [`GameState`](/docs/api/engine#gamestate), [`Runner`](/docs/api/engine#runner).

## ClockOptions

Type. Explained in [Browser helpers](/docs/reference/browser#clockoptions).

Settings for `startClock`. Each is optional.

```ts shape
import type { ClockOptions } from '@ifloom/browser'
type ClockOptions = {
  every?: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `every` | `number` | yes |  | The clock's interval between ticks while a timer or a minigame counts down, in milliseconds. 100 if left out. |

## dialogOpen

Function. Explained in [Browser helpers](/docs/reference/browser#dialogopen).

Returns true while the page shows a dialog, an open `<dialog>` or an element with the `dialog` or `alertdialog` role.
Shortcuts stand aside while it's open, so the dialog's own keys and Escape reach it.

```ts shape
import { dialogOpen } from '@ifloom/browser'
function dialogOpen(): boolean
```

## ignoredKey

Function. Explained in [Browser helpers](/docs/reference/browser#ignoredkey).

Returns true for a key press that shortcuts should leave alone. That is a key typed into a field, a key held with
Ctrl, Alt, Meta or Shift, or one another handler has already prevented.

```ts shape
import { ignoredKey } from '@ifloom/browser'
function ignoredKey(event: KeyboardEvent): boolean
```

## indexedDbDriver

Function. Explained in [Browser helpers](/docs/reference/browser#indexeddbdriver).

Returns a save driver that keeps its strings in IndexedDB, which holds far more than `localStorage`. Use it for long
games, long backlogs and mods.

It opens one database, `ifloom` unless `database` names another, with one store of strings by key, `saves` unless
`store` names another. It creates both on first use. Tests pass their own `indexedDB`.

```ts shape
import { indexedDbDriver } from '@ifloom/browser'
function indexedDbDriver(options?: { database?: string; store?: string; indexedDB?: IndexedDbLike }): SaveDriver
```

Uses: [`IndexedDbLike`](#indexeddblike), [`SaveDriver`](/docs/api/engine#savedriver).

## IndexedDbLike

Type. Explained in [Browser helpers](/docs/reference/browser#indexeddblike).

The part of the `indexedDB` API that `indexedDbDriver` uses. The browser's `indexedDB` fits it.

```ts fragment
type IndexedDbLike = {
  open: (name: string, version?: number | undefined) => OpenRequest
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `open` | `(name: string, version?: number \| undefined) => OpenRequest` |  |  | Opens a database by name at a version, and returns the request that settles with it. |

## KeysOptions

Type. Explained in [Browser helpers](/docs/reference/browser#keysoptions).

Settings for `startKeys`. Each is optional, and the number keys and a minigame's keys are on if left out.

```ts shape
import type { KeysOptions } from '@ifloom/browser'
type KeysOptions = {
  choices?: boolean | ((key: number) => boolean)
  escape?: () => boolean | void
  map?: Record<string, CommandRef>
  minigame?: boolean
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `choices` | `boolean \| ((key: number) => boolean)` | yes |  | The number keys' handling. By default keys 1 to 9 choose the choices on screen, in `numberedChoices` order, and a disabled one does nothing. `false` turns them off. A function chooses in their place. It gets the key's number and returns true when it handled the key, such as a UI that clicks the button it rendered with that number. |
| `escape` | `() => boolean \| void` | yes |  | The function Escape calls, such as one that opens the game's menu. Escape does nothing if left out. Return `false` when it did nothing, such as with no menu on screen, and the key goes on to the page untouched. |
| `map` | `Record<string,` [`CommandRef`](/docs/api/engine#commandref)`>` | yes |  | The game's own keys, each mapped by `KeyboardEvent.key` (`'m'`, `'F2'`, `' '`) to the command it sends. They come before the built-in keys, so mapping `'1'` or `'Escape'` replaces that key. |
| `minigame` | `boolean` | yes |  | True to start `startMinigameKeys` too, so the keyboard sends a minigame's inputs. On unless false. |

## localStorageDriver

Function. Explained in [Browser helpers](/docs/reference/browser#localstoragedriver).

Returns a save driver that keeps its strings in `localStorage`, or in the storage you pass. Every browser has it, but
it holds about 5MB per origin.

In Chromium every page opened from disk shares one origin, and so one 5MB store. Tests pass a storage of their own.

```ts shape
import { localStorageDriver } from '@ifloom/browser'
function localStorageDriver(storage?: StorageLike): SaveDriver
```

Uses: [`StorageLike`](#storagelike), [`SaveDriver`](/docs/api/engine#savedriver).

## minigameInput

Function. Explained in [Browser helpers](/docs/reference/browser#minigameinput).

Returns the id of the minigame input that a key presses, by `KeyboardEvent.key`, or `undefined` for none. It returns
the id even when the input does nothing now.

It reads the minigame's own `keys` first. Without them, the arrow keys and space press the inputs `up`, `down`,
`left`, `right` and `space`, and an input with a one-letter id is pressed by that letter. One-letter keys match
either case.

```ts shape
import { minigameInput } from '@ifloom/browser'
function minigameInput(minigame: MinigameView, key: string): string | undefined
```

Uses: [`MinigameView`](/docs/api/engine#minigameview).

## nextSlot

Function. Explained in [Browser helpers](/docs/reference/browser#nextslot).

Returns the slot for a new save, one more than the highest numbered slot in a `saves.list()` listing, as a string.
It returns `'1'` when there's none.

It skips slots with other names, such as `'auto'`. A save that can't be read still counts, so a new save never
writes over it.

```ts shape
import { nextSlot } from '@ifloom/browser'
function nextSlot(listing: readonly SaveListing[]): string
```

Uses: [`SaveListing`](/docs/api/engine#savelisting).

## numberedChoices

Function. Explained in [Browser helpers](/docs/reference/browser#numberedchoices).

Returns the choices the number keys choose, in order. They're the open scene's choices, else the room's actions, and
key 1 is the first.

```ts shape
import { numberedChoices } from '@ifloom/browser'
function numberedChoices(view: View): RenderedChoice[]
```

Uses: [`View`](/docs/api/engine#view), [`RenderedChoice`](/docs/api/engine#renderedchoice).

## startClock

Function. Explained in [Browser helpers](/docs/reference/browser#startclock).

Starts the clock that runs down the game's timers, and returns a function that stops it. The engine keeps no clock,
so start one per runner.

While a timer in `view.timers` or the running minigame's timer counts down and the page is visible, the clock sends
a `tick` command with the real time since the last one, every 100 ms by default. It drops the time the page spends
hidden, so a timer waits for the player. It sends the time up to the moment the page hides, then starts afresh when
the page shows again. A timer that the last command started, or a minigame state it entered, counts from that
command rather than from the last tick.

```ts shape
import { startClock } from '@ifloom/browser'
function startClock(runner: Runner, options?: ClockOptions): () => void
```

Uses: [`Runner`](/docs/api/engine#runner), [`ClockOptions`](#clockoptions).

## startKeys

Function. Explained in [Browser helpers](/docs/reference/browser#startkeys).

Starts the game's keyboard shortcuts, and returns a function that stops them. They cover the game's own keys, Escape,
the number keys for the choices on screen and a minigame's inputs.

They leave alone a key typed into a field, a key held with a modifier and any key while a dialog is open.

```ts shape
import { startKeys } from '@ifloom/browser'
function startKeys(runner: Runner, options?: KeysOptions): () => void
```

Uses: [`Runner`](/docs/api/engine#runner), [`KeysOptions`](#keysoptions).

## startMinigameKeys

Function. Explained in [Browser helpers](/docs/reference/browser#startminigamekeys).

Starts sending the running minigame's inputs from the keyboard, and returns a function that stops it. It maps keys
with `minigameInput` and listens before other shortcuts, so a minigame's keys win.

A key that maps to an input never does anything else, such as scrolling the page, even while that input does
nothing.

```ts shape
import { startMinigameKeys } from '@ifloom/browser'
function startMinigameKeys(runner: Runner): () => void
```

Uses: [`Runner`](/docs/api/engine#runner).

## startRevealSkip

Function. Explained in [Browser helpers](/docs/reference/browser#startrevealskip).

Starts calling `skip` on each key press, and returns a function that stops it. Run it while a UI reveals a scene in
steps, and stop it once the scene shows in full.

It listens before other shortcuts and stops the key there, so a number key can't choose a choice the player can't
see yet. It leaves alone a key typed into a field and a key held with a modifier.

```ts shape
import { startRevealSkip } from '@ifloom/browser'
function startRevealSkip(skip: () => void): () => void
```

## StorageLike

Type. Explained in [Browser helpers](/docs/reference/browser#storagelike).

The part of the Web Storage API that `localStorageDriver` uses. `localStorage` and `sessionStorage` both fit it.

```ts shape
import type { StorageLike } from '@ifloom/browser'
type StorageLike = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
  key: (index: number) => string | null
  readonly length: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `getItem` | `(key: string) => string \| null` |  |  | Returns the string stored under a key, or `null` when there's none. |
| `setItem` | `(key: string, value: string) => void` |  |  | Stores a string under a key, replacing any already there. |
| `removeItem` | `(key: string) => void` |  |  | Removes the string stored under a key. |
| `key` | `(index: number) => string \| null` |  |  | Returns the key at an index, or `null` past the end. The driver lists keys with it. |
| `length` | `number` |  |  | The number of keys in the storage. |
