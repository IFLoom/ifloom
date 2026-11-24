---
title: "@ifloom/browser"
description: "Every export of @ifloom/browser, the browser helpers for any UI: its signature and its fields."
---
Generated from the source of `@ifloom/browser` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

- Functions: [`browserRunner`](#browserrunner), [`dialogOpen`](#dialogopen), [`ignoredKey`](#ignoredkey), [`indexedDbDriver`](#indexeddbdriver), [`localStorageDriver`](#localstoragedriver), [`minigameInput`](#minigameinput), [`nextSlot`](#nextslot), [`numberedChoices`](#numberedchoices), [`startClock`](#startclock), [`startKeys`](#startkeys), [`startMinigameKeys`](#startminigamekeys), [`startRevealSkip`](#startrevealskip)
- Types: [`ClockOptions`](#clockoptions), [`IndexedDbLike`](#indexeddblike), [`KeysOptions`](#keysoptions), [`StorageLike`](#storagelike)

## browserRunner

Function. Explained in [Browser helpers](/docs/browser#browserrunner).

A runner with what most games in a browser want: a new game with a random
seed, undo 50 steps deep, saves and a profile in `localStorage`, and an
autosave each turn. It reads the profile before it starts, so the new
game has the player's play settings and `settings()` has their ui
settings from the first frame. Pass a `start` to begin elsewhere, and
runner options to change any default; they are merged over these. Any UI
can use it: the React UI's `mountGame` does, and so do the templates.

```ts shape
import { browserRunner } from '@ifloom/browser'
function browserRunner(game: Game, options?: RunnerOptions & { start?: GameState }): Promise<Runner>
```

## ClockOptions

Type. Explained in [Browser helpers](/docs/browser#clockoptions).

How `startClock` ticks.

```ts shape
import type { ClockOptions } from '@ifloom/browser'
type ClockOptions = {
  every?: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `every` | `number` | yes |  | How often to tick while anything counts down, in milliseconds. 100 if left out. |

## dialogOpen

Function. Explained in [Browser helpers](/docs/browser#dialogopen).

Whether a dialog is open in the page. Its own keys come first, and Escape is its own.

```ts shape
import { dialogOpen } from '@ifloom/browser'
function dialogOpen(): boolean
```

## ignoredKey

Function. Explained in [Browser helpers](/docs/browser#ignoredkey).

Whether a key press should be left alone by shortcuts: the player typing
in a field, a key held with a modifier, or one something else already
handled.

```ts shape
import { ignoredKey } from '@ifloom/browser'
function ignoredKey(event: KeyboardEvent): boolean
```

## indexedDbDriver

Function. Explained in [Browser helpers](/docs/browser#indexeddbdriver).

Saves in IndexedDB: asynchronous and roomy, the right home for long games,
big backlogs and mod data. Opens (and if needed creates) one database with
one store of strings by key.

```ts shape
import { indexedDbDriver } from '@ifloom/browser'
function indexedDbDriver(options?: { database?: string; store?: string; indexedDB?: IndexedDbLike }): SaveDriver
```

## IndexedDbLike

Type. Explained in [Browser helpers](/docs/browser#indexeddblike).

The parts of `indexedDB` a driver needs.

```ts fragment
type IndexedDbLike = {
  open: (name: string, version?: number | undefined) => OpenRequest
}
```

## KeysOptions

Type. Explained in [Browser helpers](/docs/browser#keysoptions).

What `startKeys` listens for.

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
| `choices` | `boolean \| ((key: number) => boolean)` | yes |  | The number keys 1 to 9 pick the choices on screen, in `numberedChoices` order, skipping a greyed-out one. On unless false. A function picks instead, given the key's number, and returns whether it did, such as a UI that clicks the button it drew with that number. |
| `escape` | `() => boolean \| void` | yes |  | What Escape does, such as opening the game's menu. Nothing if left out. Return `false` when it did nothing, such as with no menu on screen, and the key goes on to the page as if it weren't there. |
| `map` | `Record<string, CommandRef>` | yes |  | Keys of the game's own, by `KeyboardEvent.key` (`'m'`, `'F2'`, `' '`): the command each sends. They come before the built-in keys, so mapping `'1'` or `'Escape'` replaces what that key does. |
| `minigame` | `boolean` | yes |  | A minigame's inputs from the keyboard too, with `startMinigameKeys`. On unless false. |

## localStorageDriver

Function. Explained in [Browser helpers](/docs/browser#localstoragedriver).

Saves in `localStorage` (or any Web Storage). Simple and everywhere, but
small: around 5MB per origin, and in Chromium every page opened from disk
shares one origin. Pass a storage to use another, as tests do.

```ts shape
import { localStorageDriver } from '@ifloom/browser'
function localStorageDriver(storage?: StorageLike): SaveDriver
```

## minigameInput

Function. Explained in [Browser helpers](/docs/browser#minigameinput).

The minigame input a key presses, by `KeyboardEvent.key`, whether or not it
does anything now: the minigame's own `keys`, else the arrow keys and space
for `up`, `down`, `left`, `right` and `space`, else the input's own name
when it's one letter. One-letter keys match either case.

```ts shape
import { minigameInput } from '@ifloom/browser'
function minigameInput(minigame: MinigameView, key: string): string | undefined
```

## nextSlot

Function. Explained in [Browser helpers](/docs/browser#nextslot).

The slot for a new save: one more than the highest numbered slot in the
listing (`saves.list()`), as a string, so `'1'` for the first. Slots named
otherwise, such as `'auto'`, are passed over. A save that can't be read
still holds its number, so a new save never writes over it.

```ts shape
import { nextSlot } from '@ifloom/browser'
function nextSlot(listing: readonly SaveListing[]): string
```

## numberedChoices

Function. Explained in [Browser helpers](/docs/browser#numberedchoices).

The choices the number keys pick, in order: the open scene's, else the room's buttons. Key 1 is the first.

```ts shape
import { numberedChoices } from '@ifloom/browser'
function numberedChoices(view: View): RenderedChoice[]
```

## startClock

Function. Explained in [Browser helpers](/docs/browser#startclock).

The clock the game's timers need, which the engine doesn't keep. While
anything counts down (a timer in `view.timers`, or the timer of the
minigame being played) and the page is visible, it sends a `tick` with the
real time since the last one, about every 100 ms. Time while the page is
hidden is dropped: the tick on hiding sends what passed until then, and the
clock starts afresh on showing, so a timer waits for the player. A timer a
command has just started, or a minigame state just entered, counts from
that command, not from the last tick. Returns the way to stop it. Start one
per runner.

```ts shape
import { startClock } from '@ifloom/browser'
function startClock(runner: Runner, options?: ClockOptions): () => void
```

## startKeys

Function. Explained in [Browser helpers](/docs/browser#startkeys).

The game's keyboard shortcuts: the game's own keys, Escape, the number keys
for the choices on screen, and a minigame's inputs. Keys the player types
into a field, keys held with a modifier, and keys while a dialog is open
are left alone. Returns the way to stop.

```ts shape
import { startKeys } from '@ifloom/browser'
function startKeys(runner: Runner, options?: KeysOptions): () => void
```

## startMinigameKeys

Function. Explained in [Browser helpers](/docs/browser#startminigamekeys).

Presses the minigame's inputs from the keyboard while one is being played,
as `minigameInput` maps them. A key that belongs to an input is kept from
doing anything else, such as scrolling the page, even while that input does
nothing. It listens before other shortcuts, so a minigame's keys win.
Returns the way to stop.

```ts shape
import { startMinigameKeys } from '@ifloom/browser'
function startMinigameKeys(runner: Runner): () => void
```

## startRevealSkip

Function. Explained in [Browser helpers](/docs/browser#startrevealskip).

Until stopped, the next key press calls `skip`, to show everything a scene
still holds back, and does nothing else: it listens before other shortcuts
and swallows the key, so a number key can't pick a choice that isn't shown
yet. Typing in a field and keys held with a modifier are left alone. Start
it while a UI holds something back, such as prose it reveals in steps, and
stop it once everything is shown.

```ts shape
import { startRevealSkip } from '@ifloom/browser'
function startRevealSkip(skip: () => void): () => void
```

## StorageLike

Type. Explained in [Browser helpers](/docs/browser#storagelike).

The parts of the Web Storage API a driver needs. `localStorage` is one.

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
