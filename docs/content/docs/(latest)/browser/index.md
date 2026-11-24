---
title: "Browser helpers"
description: "@ifloom/browser: a runner with saves in the browser, the localStorage and IndexedDB save drivers, the clock for timers and minigames, keyboard shortcuts, the number for a new save slot and a key that shows held-back prose."
---
The engine has no DOM, so a few things a game needs from the page live in `@ifloom/browser`: a runner with saves and settings kept in the browser, the save drivers for `localStorage` and IndexedDB, a clock for [timers](/docs/reference/timers) and minigames, keyboard shortcuts, the number for a new save slot, and a key press that shows prose a UI is holding back. They're plain DOM, so they work with Vue, Svelte, plain JS or React. The [React UI](/docs/react) uses them itself, and the templates make their runner with `browserRunner` and start the clock and the keys beside it.

```ts
import {
  browserRunner, localStorageDriver, indexedDbDriver,
  startClock, startKeys, startMinigameKeys, startRevealSkip,
  nextSlot, numberedChoices, minigameInput, ignoredKey, dialogOpen,
  type ClockOptions, type KeysOptions, type StorageLike, type IndexedDbLike,
} from '@ifloom/browser'
```

Add `@ifloom/browser` beside the engine. It imports nothing but `@ifloom/engine`. Each `start…` function returns a function that stops it.

## browserRunner

```ts shape
function browserRunner(game: Game, options?: RunnerOptions & { start?: GameState }): Promise<Runner>
```

A runner with what most games in a browser want. It's the engine's [`createRunner`](/docs/reference/runner#createrunner) with these defaults:

| | Default |
|---|---|
| `start` | A new game, `startingState(game, { seed, settings })`, with a random seed so each playthrough draws its own variants, and the player's `play` [settings](/docs/reference/settings) from the profile. |
| `history` | `{ depth: 50 }`, so undo goes 50 steps back. |
| `saves` | `saves(game, localStorageDriver())`, saves in the browser's `localStorage` under keys that start with the game's id. |
| `profile` | `profile(game, localStorageDriver())`, the [profile](/docs/reference/profile) at `<game id>.profile` in the same `localStorage`. |
| `autosave` | `{ every: 'turn' }`, to the `auto` slot. |

Pass `start` to begin from another state, and any [`RunnerOptions`](/docs/reference/runner#runneroptions) to change the rest. They're merged over the defaults, one option at a time. [`mountGame`](/docs/react#mountgame) uses it, and so do the `vanilla`, `vue`, `svelte` and `next` templates:

```ts
import { browserRunner } from '@ifloom/browser'
import { draw } from './draw.ts' // your own drawing

const runner = await browserRunner(game, { backlog: { limit: 200 } })

runner.subscribe(({ view }) => draw(view))
draw(runner.view())
```

It's async because it reads the profile before it starts. The new game gets the player's stored `play` settings, and [`runner.snapshot().settings`](/docs/reference/runner#settings) has their `ui` settings from the first frame, so a text size or a volume is right before anything is drawn. A profile that can't be read starts the game with the defaults.

**Gotcha.** Its saves and profile go to `localStorage`, which a test or a script in Node doesn't have. The runner still starts there, but every save, autosave and profile write fails with `localStorage is not available here`. Pass your own stores, such as `{ saves: saves(game, memoryDriver()), profile: profile(game, memoryDriver()) }` with [`memoryDriver`](/docs/reference/saves#memorydriver), or use [`createRunner`](/docs/reference/runner#createrunner).

## Save drivers

The engine's save store, [profile](/docs/reference/profile) and [mod store](/docs/reference/mods) keep their data through a [`SaveDriver`](/docs/reference/saves#savedriver). The engine has only the in-memory one, [`memoryDriver`](/docs/reference/saves#memorydriver), for tests. These two keep it in the browser.

### localStorageDriver

```ts shape
function localStorageDriver(storage?: StorageLike): SaveDriver
```

Saves in `globalThis.localStorage`, or in the Web Storage you pass. It works everywhere but it's small, around 5MB per origin. In Chromium every page opened from disk shares one origin, so every `file://` game the player has shares those 5MB.

The driver looks for the storage when a save is first read or written, not when you make it. Where there's none (Node, a locked-down iframe), that read or write rejects with `localStorage is not available here`.

### StorageLike

```ts shape
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

```ts shape
function indexedDbDriver(options?: {
  database?: string
  store?: string
  indexedDB?: IndexedDbLike
}): SaveDriver
```

Saves in IndexedDB, which has far more room. It opens one database, `database` (default `'ifloom'`), creating it if needed. That database holds one object store of strings by key, `store` (default `'saves'`). `indexedDB` defaults to `globalThis.indexedDB`. Pass another for tests, such as `fake-indexeddb`.

```ts
import { indexedDbDriver } from '@ifloom/browser'
import { saves } from '@ifloom/engine'

const store = saves(game, indexedDbDriver())
```

Every game can share the default database, because keys carry the game's id (see [Keys](/docs/reference/saves#keys)).

**Gotcha.** The driver creates its store only when it creates the database. If you open an existing database with a different `store` name, there's no such store and every call rejects. Give a new store a new `database` too. If IndexedDB isn't there at all, every call rejects with `IndexedDB is not available here`.

### IndexedDbLike

```ts fragment
type IndexedDbLike = { open: (name: string, version?: number) => OpenRequest }
```

The part of `indexedDB` the driver needs, typed here so a test can pass its own. The browser's `indexedDB` is one.

## startClock

```ts shape
function startClock(runner: Runner, options?: ClockOptions): () => void
```

The engine keeps no clock, so its [timers](/docs/reference/timers) and a [minigame](/docs/reference/minigames)'s timers need something to send a [`tick`](/docs/reference/commands#tick). While anything counts down (a timer in [`view.timers`](/docs/reference/view#timers), or the minigame's timer) and the page is visible, `startClock` sends one about every `every` milliseconds (100 if left out) with the real time that passed since the last.

```ts
import { browserRunner, startClock } from '@ifloom/browser'

const runner = await browserRunner(game)
startClock(runner)
```

It only runs while something counts down, so it costs nothing the rest of the time. When the player switches to another tab, it sends what passed until then and stops. When they come back, it starts afresh, so a timer waits for them. When a command starts a timer, or an input moves the minigame to a new state, that clock starts from the command rather than from the last tick.

Start it once, when the game starts, rather than only while something is on screen: a timer runs out whether or not your UI draws it.

**Gotcha.** Start one per runner. Two clocks would each send ticks, and the timers would run twice as fast.

### ClockOptions

How often `startClock` ticks.

```ts shape
type ClockOptions = { every?: number }
```

| Field | Type | Default | What it is |
|---|---|---|---|
| `every` | `number` | `100` | Milliseconds between ticks while something counts down. Each tick carries the real time that passed, so a slower clock is as accurate, only less smooth. |

## startKeys

```ts shape
function startKeys(runner: Runner, options?: KeysOptions): () => void
```

The game's keyboard shortcuts: the game's own keys in `map`, then Escape, then the number keys for the choices, then a minigame's keys. [`KeysOptions`](#keysoptions) says which are on.

A key the player types into a field, a key held with Ctrl, Alt, Meta or Shift, and any key while a dialog is open are left alone (see [`ignoredKey`](#ignoredkey) and [`dialogOpen`](#dialogopen)). A key it uses is kept from doing anything else.

Here a game opens its own menu with Escape and saves with F5:

```ts tab="Plain JS" tab-group="framework"
// src/main.ts
import { startKeys } from '@ifloom/browser'

const menu = document.querySelector<HTMLDialogElement>('#menu')!
startKeys(runner, {
  escape: () => menu.showModal(),
  map: { F5: { type: 'action', id: 'quick-save' } },
})
```

```tsx tab="React" tab-group="framework"
// src/App.tsx, React by hand. With the React UI, pass `keys` to mountGame instead.
import { useEffect, useState } from 'react'
import { startKeys } from '@ifloom/browser'
import { runner } from './runner.ts'
import { Game, Menu } from './screens.tsx' // your own components

export function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => startKeys(runner, { escape: () => setMenuOpen(true), map: { F5: { type: 'action', id: 'quick-save' } } }), [])
  return menuOpen ? <Menu onClose={() => setMenuOpen(false)} /> : <Game />
}
```

```vue tab="Vue" tab-group="framework"
<!-- src/App.vue -->
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { startKeys } from '@ifloom/browser'
import { runner } from './runner.ts'

const menuOpen = ref(false)
let stop = () => {}
onMounted(() => {
  stop = startKeys(runner, { escape: () => (menuOpen.value = true), map: { F5: { type: 'action', id: 'quick-save' } } })
})
onUnmounted(() => stop())
</script>
```

```svelte tab="Svelte" tab-group="framework"
<!-- src/App.svelte -->
<script lang="ts">
  import { startKeys } from '@ifloom/browser'
  import { runner } from './runner.ts'

  let menuOpen = $state(false)
  $effect(() => startKeys(runner, { escape: () => (menuOpen = true), map: { F5: { type: 'action', id: 'quick-save' } } }))
</script>
```

The templates call `startKeys(runner)` with no options, so the number keys pick choices and a minigame's keys press its inputs. If you start it yourself with options, don't also keep the template's call, or each key is handled twice.

### KeysOptions

Which shortcuts `startKeys` handles, in the order it tries them.

```ts shape
type KeysOptions = {
  choices?: boolean | ((key: number) => boolean)
  escape?: () => boolean | void
  map?: Record<string, CommandRef>
  minigame?: boolean
}
```

| Field | Type | Default | What it is |
|---|---|---|---|
| `map` | `Record<string, CommandRef>` | none | Keys of the game's own, by [`KeyboardEvent.key`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key) (`'m'`, `'F2'`, `' '`), each with the command it sends. They come first, so mapping `'1'` or `'Escape'` replaces what that key does. |
| `escape` | `() => boolean \| void` | nothing | What Escape does, such as opening your menu. Return `false` when it did nothing, such as with no menu to open, and the key goes on to the page untouched. |
| `choices` | `boolean \| ((key: number) => boolean)` | `true` | The number keys 1 to 9 pick the choices on screen, in [`numberedChoices`](#numberedchoices) order. A greyed-out choice is skipped. Pass a function to pick yourself: it gets the key's number and returns whether it picked anything. |
| `minigame` | `boolean` | `true` | A minigame's inputs from the keyboard too, through [`startMinigameKeys`](#startminigamekeys). |

## startMinigameKeys

```ts shape
function startMinigameKeys(runner: Runner): () => void
```

Presses the minigame's inputs from the keyboard while one is being played, as [`minigameInput`](#minigameinput) maps keys to inputs. A key that belongs to an input is kept from scrolling the page or doing anything else, even while that input does nothing. It listens before other shortcuts, so a minigame's keys win over the number keys. `startKeys` starts it for you unless you pass `minigame: false`. The React UI's [`MinigameCard`](/docs/react/components#minigamecard) uses it on its own.

## minigameInput

```ts shape
function minigameInput(minigame: MinigameView, key: string): string | undefined
```

The input a key presses, by `KeyboardEvent.key`, whether or not it does anything now. It's the minigame's own [`keys`](/docs/reference/minigames#minigamedef) if it gives the input any. Otherwise it's the arrow keys and space for inputs named `up`, `down`, `left`, `right` and `space`, and failing that the input's own name when it's one letter. One-letter keys match either case.

```ts
import { minigameInput } from '@ifloom/browser'

minigameInput(runner.view().minigame!, 'ArrowLeft') // 'left'
```

## numberedChoices

```ts shape
function numberedChoices(view: View): RenderedChoice[]
```

The choices the number keys pick, in order: the open scene's choices, or the room's [actions](/docs/reference/actions) when no scene has any. Key 1 is the first. Use it to show each button's number.

## nextSlot

```ts shape
function nextSlot(listing: readonly SaveListing[]): string
```

The slot for a new save: one more than the highest numbered slot in the listing from [`saves.list()`](/docs/reference/saves#saves), as a string, so `'1'` for the first save. Slots with other names, such as `'auto'` and `'quick'`, are passed over. A save that can't be read still holds its number, so a new save never writes over it.

```ts
import { nextSlot } from '@ifloom/browser'

const saved = await runner.save(nextSlot(await runner.saves!.list()), 'Before the café')
```

## Revealed prose

How and when prose reveals is a UI's to decide, from [presentation hints](/docs/reference/ui-hints) such as the React UI's [`reveal`](/docs/react/hints#reveal). The [Transitions recipe](/docs/recipes/transitions#draw-them-yourself) times them in each framework. This helper does the part every UI shares: letting a key show everything at once.

### startRevealSkip

```ts shape
function startRevealSkip(skip: () => void): () => void
```

Until stopped, the next key press calls `skip`, which should show everything the scene still holds back, and does nothing else. It listens before other shortcuts and swallows the key, so a number key can't pick a choice that isn't shown yet. Typing in a field and keys held with a modifier are left alone. Start it while reveals are pending, and stop it once they're all shown or skipped.

```ts
import { startRevealSkip } from '@ifloom/browser'
import { showEverything } from './reveal.ts' // your own

const stopSkip = startRevealSkip(() => {
  showEverything()
  stopSkip()
})
```

## ignoredKey

```ts shape
function ignoredKey(event: KeyboardEvent): boolean
```

Whether shortcuts should leave a key press alone: the player typing in an input, a text area, a select or editable text, a key held with Ctrl, Alt, Meta or Shift, or one something else already handled (`defaultPrevented`). Use it in shortcuts of your own.

## dialogOpen

```ts shape
function dialogOpen(): boolean
```

Whether the page has an open dialog, an element with `role="dialog"` or `role="alertdialog"`. The shortcuts stand aside while one is, so its own keys, and Escape, are its.
