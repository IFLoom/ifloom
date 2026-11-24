---
title: "Browser helpers"
description: "The browser helpers in @ifloom/browser, which make a runner with saves, keep saves in the browser, tick the clock and handle keys."
---
`@ifloom/browser` holds the parts of a game that need a web page, which the engine leaves out because it has no DOM. It makes a runner with saves in the browser, keeps saves in `localStorage` or IndexedDB, sends the clock's ticks, and turns key presses into commands. Every helper is plain DOM, so a UI in any framework uses it, and so does the [React UI](/docs/0.1.0/reference/react). [Start your own UI](/docs/0.1.0/how-to/render/start) starts each helper beside the runner, and [Choosing a UI](/docs/0.1.0/explanation/choosing-a-ui) compares the ways to put a game on screen.

In the showcase: `examples/showcase/src/main.tsx`, which keeps saves in `localStorage` and mods in IndexedDB. The `vanilla` and `vue` templates' `src/main.ts` and `src/runner.ts` start `browserRunner`, `startClock` and `startKeys`.

```ts
import { browserRunner, indexedDbDriver, localStorageDriver, nextSlot, startClock, startKeys, startRevealSkip } from '@ifloom/browser'
```

The package imports only `@ifloom/engine`. Each `start…` function returns the function that stops it.

## browserRunner

`browserRunner` returns a [runner](/docs/0.1.0/reference/runner) with saves, a profile and an autosave kept in the browser. Its signature is in [`browserRunner`](/docs/0.1.0/api/browser#browserrunner).

It calls the engine's [`createRunner`](/docs/0.1.0/reference/runner#createrunner) with these options, and each [`RunnerOptions`](/docs/0.1.0/api/engine#runneroptions) field you pass replaces that field's default whole:

| Field | Meaning |
|---|---|
| `history` | `{ depth: 50 }`, so undo goes 50 steps back. |
| `saves` | A [save store](/docs/0.1.0/reference/saves#saves) on [`localStorageDriver`](#localstoragedriver), with keys that start with the game's id. |
| `profile` | The [profile](/docs/0.1.0/reference/profile) on the same driver. |
| `autosave` | `{ every: 'turn' }`, into the `auto` slot. |

The game starts from `start` when you pass it. Otherwise it starts from [`startingState`](/docs/0.1.0/reference/commands#startingstate) with a random seed, so each playthrough draws its own variants, and with the player's stored play [settings](/docs/0.1.0/reference/settings). `browserRunner` is async because it reads the profile first, so [`runner.snapshot().settings`](/docs/0.1.0/reference/runner#settings) holds the player's ui settings from the first frame. A profile that can't be read starts the game with the settings' defaults.

```ts
import { browserRunner } from '@ifloom/browser'
import module from './game.ts'

const { game } = module.build()
const runner = await browserRunner(game, { backlog: { limit: 200 } })
```

[`mountGame`](/docs/0.1.0/reference/react#mountgame) and the `vanilla`, `vue`, `svelte` and `next` templates make their runner with it. [Start your own UI](/docs/0.1.0/how-to/render/start#start-the-runner) renders its snapshot.

## Save drivers

A [`SaveDriver`](/docs/0.1.0/reference/saves#savedriver) keeps the data of a save store, a profile or a [mod store](/docs/0.1.0/reference/mods). The engine has only [`memoryDriver`](/docs/0.1.0/reference/saves#memorydriver), and these two keep the data in the browser.

### localStorageDriver

`localStorageDriver` returns a save driver on `globalThis.localStorage`, or on the Web Storage you pass. Its signature is in [`localStorageDriver`](/docs/0.1.0/api/browser#localstoragedriver).

The driver looks for the storage on its first read or write, not when you make it. Where there's none, such as in Node or a locked-down iframe, that read or write rejects with `localStorage is not available here`. The save store turns the rejection into a reason such as `The game could not be saved.` (see [Strings](/docs/0.1.0/reference/saves#strings)), and the runner passes it to `onSaveError`.

Web Storage holds about 5MB per origin. Chromium gives every page opened from disk one origin, so every `file://` game the player has shares those 5MB.

```ts given
import { localStorageDriver } from '@ifloom/browser'
import { saves } from '@ifloom/engine'

const store = saves(game, localStorageDriver(window.sessionStorage))
```

### StorageLike

`StorageLike` is the part of the Web Storage API that `localStorageDriver` uses. Both `localStorage` and `sessionStorage` are one. Every field is in [`StorageLike`](/docs/0.1.0/api/browser#storagelike).

### indexedDbDriver

`indexedDbDriver` returns a save driver on IndexedDB, which holds far more than Web Storage. Every option is in [`indexedDbDriver`](/docs/0.1.0/api/browser#indexeddbdriver).

The driver opens one database, `database` (`'ifloom'` if left out), and creates it when it's missing. The database holds one object store of strings by key, `store` (`'saves'` if left out). Every game can share the default database, because each key starts with the game's id. `indexedDB` is `globalThis.indexedDB` if left out, and a test passes another, such as `fake-indexeddb`'s.

The driver creates its object store only when it creates the database. An existing database opened with another `store` name has no such store, so every call rejects, and a new store needs a new `database` too. Where IndexedDB is missing, every call rejects with `IndexedDB is not available here`.

```ts
import { indexedDbDriver } from '@ifloom/browser'
import { mods } from '@ifloom/engine'

const modStore = mods('small-town', indexedDbDriver({ database: 'small-town-mods' }))
```

### IndexedDbLike

`IndexedDbLike` is the part of `indexedDB` that `indexedDbDriver` uses, so a test can pass its own. The browser's `indexedDB` is one. Its fields are in [`IndexedDbLike`](/docs/0.1.0/api/browser#indexeddblike).

## startClock

`startClock` sends the [`tick`](/docs/0.1.0/reference/commands#tick) commands that run down [timers](/docs/0.1.0/reference/timers) and a [minigame](/docs/0.1.0/reference/minigames)'s timer, since the engine keeps no clock. Its signature is in [`startClock`](/docs/0.1.0/api/browser#startclock).

The clock runs only while a timer in `view.timers` or the minigame's timer counts down and the page is visible. It then sends a tick every `every` milliseconds, carrying the real time since the last one. When the player switches to another tab, it sends the time until then and stops, so a timer waits for them. A command that starts a timer, or moves a minigame to a new state, restarts the clock from that command.

```ts
import { browserRunner, startClock } from '@ifloom/browser'
import module from './game.ts'

const runner = await browserRunner(module.build().game)
const stopClock = startClock(runner)
```

Start one clock per runner, when the game starts. Two clocks would each send ticks, so the timers would run twice as fast. [Render timers](/docs/0.1.0/how-to/render/timers-minigames-panels) shows the countdowns it drives.

### ClockOptions

`ClockOptions` is the settings for `startClock`. Its one field, `every`, is the time between ticks in milliseconds, 100 if left out. Each tick carries the real time that passed, so a slower clock keeps time as well and only updates less smoothly. It's in [`ClockOptions`](/docs/0.1.0/api/browser#clockoptions).

## Keyboard shortcuts

These helpers turn key presses into commands. Each one leaves alone a key the player types into a field and a key held with Ctrl, Alt, Meta or Shift.

### startKeys

`startKeys` starts the game's keyboard shortcuts. Its signature is in [`startKeys`](/docs/0.1.0/api/browser#startkeys).

It tries the keys in this order: the game's own keys in `map`, then Escape, then the number keys for the choices, then a minigame's keys. A key it uses does nothing else. While a dialog is open (see [`dialogOpen`](#dialogopen)), it leaves every key to the dialog.

```ts given
import { startKeys } from '@ifloom/browser'

const stopKeys = startKeys(runner, {
  escape: () => console.log('open the menu'),
  map: { F5: { type: 'action', id: 'quick-save' } },
})
```

The templates call `startKeys(runner)` with no options. A game that starts it again with options removes the template's call, or each key is handled twice. With the React UI, pass `keys` to `mountGame` instead.

### KeysOptions

`KeysOptions` is the settings for `startKeys`. Every field is in [`KeysOptions`](/docs/0.1.0/api/browser#keysoptions).

| Field | Meaning |
|---|---|
| `map` | The game's own keys, by [`KeyboardEvent.key`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key), each with the command it sends. They come first, so mapping `'1'` or `'Escape'` replaces what that key does. |
| `escape` | The function Escape calls. A function that returns `false` did nothing, so the key goes on to the page. |
| `choices` | The number keys 1 to 9 choose the choices in [`numberedChoices`](#numberedchoices) order, skipping one that is greyed out. A function takes the key's number and returns whether it chose anything. `true` if left out. |
| `minigame` | The keyboard presses a minigame's inputs through [`startMinigameKeys`](#startminigamekeys). `true` if left out. |

### startMinigameKeys

`startMinigameKeys` presses the running minigame's inputs from the keyboard, mapping keys with [`minigameInput`](#minigameinput). Its signature is in [`startMinigameKeys`](/docs/0.1.0/api/browser#startminigamekeys).

It listens before other shortcuts, so a minigame's keys win over the number keys. A key that maps to an input never scrolls the page or does anything else, even while that input does nothing. `startKeys` starts it unless you pass `minigame: false`, and the React UI's [`MinigameCard`](/docs/0.1.0/reference/react/components#minigamecard) starts it on its own.

### minigameInput

`minigameInput` returns the id of the minigame input that a key presses, whether or not the input does anything now, or `undefined` for none. Its signature is in [`minigameInput`](/docs/0.1.0/api/browser#minigameinput).

It reads the minigame's own [`keys`](/docs/0.1.0/reference/minigames#minigamedef) first. Without them, the arrow keys and space press the inputs `up`, `down`, `left`, `right` and `space`, and an input with a one-letter id is pressed by that letter in either case.

```ts given
import { minigameInput } from '@ifloom/browser'

minigameInput(runner.view().minigame!, 'ArrowLeft') // 'left'
```

### numberedChoices

`numberedChoices` returns the choices the number keys choose, in order. They're the open scene's choices, or the room's [actions](/docs/0.1.0/reference/actions) when the scene has none, and key 1 is the first. A UI uses it to show each button's number. Its signature is in [`numberedChoices`](/docs/0.1.0/api/browser#numberedchoices).

### ignoredKey

`ignoredKey` returns true for a key press that shortcuts leave alone. That is a key typed into an input, a text area, a select or editable text, a key held with Ctrl, Alt, Meta or Shift, or one another handler has already prevented. A shortcut of your own calls it first. Its signature is in [`ignoredKey`](/docs/0.1.0/api/browser#ignoredkey).

### dialogOpen

`dialogOpen` returns true while the page shows a dialog, an open `<dialog>` element or an element with the `dialog` or `alertdialog` role. The shortcuts stand aside while it's open, so the dialog's own keys and Escape reach it. Its signature is in [`dialogOpen`](/docs/0.1.0/api/browser#dialogopen).

## nextSlot

`nextSlot` returns the slot for a new save, one more than the highest numbered slot in a listing of the saves, as a string. Its signature is in [`nextSlot`](/docs/0.1.0/api/browser#nextslot).

It returns `'1'` when the listing has no numbered slot. It skips slots with other names, such as `'auto'` and `'quick'`. A save that can't be read still holds its number, so a new save never writes over it. Pass it the snapshot's [`saves`](/docs/0.1.0/reference/runner#saves-1), which the runner keeps up to date, or the result of [`saves.list()`](/docs/0.1.0/reference/saves#saves).

```ts given
import { nextSlot } from '@ifloom/browser'

const saved = await runner.save(nextSlot(runner.snapshot().saves), 'Before the café')
```

[Render a save and load screen](/docs/0.1.0/how-to/render/saves-and-settings#render-a-save-and-load-screen) uses it.

## Revealed prose

A UI decides how and when prose appears, from [ui hints](/docs/0.1.0/reference/ui-hints) such as the React UI's [`reveal`](/docs/0.1.0/reference/react/hints#reveal). This helper does the one part every such UI shares, a key that shows the rest at once.

### startRevealSkip

`startRevealSkip` calls `skip` on each key press until it's stopped. `skip` shows everything the scene still holds back. Its signature is in [`startRevealSkip`](/docs/0.1.0/api/browser#startrevealskip).

It listens before other shortcuts and stops the key there, so a number key can't choose a choice the player can't see yet. It leaves alone a key typed into a field and a key held with a modifier. Start it while a reveal is pending, and stop it once the scene shows in full.

```ts
import { startRevealSkip } from '@ifloom/browser'
import { showEverything } from './reveal.ts'

const stopSkip = startRevealSkip(() => {
  showEverything()
  stopSkip()
})
```

[Add a transition](/docs/0.1.0/how-to/add-a-transition) times a reveal in each framework.

## Caveats

- `browserRunner` keeps its saves and profile in `localStorage`, which Node lacks. The runner still starts there, but every save, autosave and profile write fails with `localStorage is not available here`. A test passes `{ saves: saves(game, memoryDriver()), profile: profile(game, memoryDriver()) }`, or calls `createRunner` itself.
- A timer runs out whether or not the UI renders it, so start `startClock` when the game starts, not only while a countdown is on screen.
