---
title: "Saves and settings"
description: "Add saving, loading and a settings screen to a game run on the engine directly: save stores and drivers, slots, autosave, a load list, play and ui settings, runner.settings() and setSetting, all without a UI package."
---
[Running a game](/docs/guide/running-a-game) drew the view and sent commands. A game also needs to remember where the player got to, and to let them change a few things, such as the text size. The runner handles both without a UI package, and this page adds them to that loop.

## Where saves go

A save is the whole [game state](/docs/reference/state), written to a slot with a few details for a load screen. Two things decide where it goes:

- **A driver** stores text by key. The engine has three, and you can write your own:

  | Driver | Keeps saves in | Use it for |
  |---|---|---|
  | [`localStorageDriver()`](/docs/reference/saves#localstoragedriver) | The browser's `localStorage`, about 5MB shared. | Short games. |
  | [`indexedDbDriver()`](/docs/reference/saves#indexeddbdriver) | IndexedDB, with far more room. | Long games and big backlogs. |
  | [`memoryDriver()`](/docs/reference/saves#memorydriver) | A `Map`, gone with the page or the process. | Tests and previews. |

- **A save store**, [`saves(game, driver)`](/docs/reference/saves#saves), keeps one game's slots on that driver, and carries old saves forward when the game changes.

[`browserRunner`](/docs/reference/runner#browserrunner) uses `localStorage` for you. To choose, pass the store to the runner:

```ts
import { createRunner, indexedDbDriver, profile, saves, startingState } from '@ifloom/engine'

const driver = indexedDbDriver()
const runner = createRunner(game, startingState(game, { seed: Math.floor(Math.random() * 2 ** 31) }), {
  history: true,
  saves: saves(game, driver),
  profile: profile(game, driver),
  autosave: { every: 'turn' },
})
```

The [profile](/docs/reference/profile) keeps what outlives a single save, such as the player's settings. You'll want it for the settings below.

`autosave` writes the `auto` slot by itself: after every turn here, or after each scene or command if you'd rather.

## Save and load

```ts
const saved = await runner.save('quick')
if (!saved.ok) showMessage(saved.reason)

const loaded = await runner.load('quick')
if (!loaded.ok) showMessage(loaded.reason) // 'Nothing is saved there.'
```

Both are async and answer with a [`Result`](/docs/reference/runner#result) rather than throwing. A load that works replaces the game in play and calls your listener, so the screen redraws by itself. A save made by an older version of your game still loads: the engine and your game's [migrations](/docs/reference/saves#the-games-own-migrations) carry it forward, or `reason` says why they can't.

### When saving isn't allowed

A game can refuse saving for a while, such as until the player has typed a name, with [`saveable`](/docs/reference/game#saveable). `runner.save` then fails with the game's reason, and autosave waits. [`view.saving`](/docs/reference/view#saving) says so before the player presses anything, so grey the button out with it:

```ts
const { allowed, reason } = runner.view().saving
saveButton.disabled = !allowed
saveButton.title = reason ?? ''
```

## A load screen

[`runner.saves`](/docs/reference/runner#the-runners-members) is the store the runner was made with. Its `list()` gives every save, newest first, with the details a load screen shows. A save that can't be read is still listed, as `{ slot, broken }`, so the player can delete it.

```ts
import { nextSlot } from '@ifloom/browser'

const listing = await runner.saves!.list()
for (const entry of listing) {
  if ('broken' in entry) console.log(`${entry.slot}: can't be read (${entry.broken})`)
  else console.log(`${entry.slot}: ${entry.name}, saved ${new Date(entry.savedAt).toLocaleString()}`)
}

// A new save goes in the next numbered slot: '1', then '2', and so on.
await runner.save(nextSlot(listing))
```

[`nextSlot`](/docs/browser#nextslot) comes from [`@ifloom/browser`](/docs/browser), the helpers for any UI. It skips named slots such as `auto` and `quick`. The store also exports a slot as text for the player to keep, and imports it again (see [`saves`](/docs/reference/saves#saves)).

## Settings

Settings are what the player can change, such as whether hints are shown or how large the text is. The engine has none of its own, so your content declares each one:

```ts
const story: Content = {
  settings: [
    { id: 'hints', label: 'Show hints', kind: 'toggle', default: true },
    {
      id: 'textSize',
      label: 'Text size',
      kind: 'choice',
      affects: 'ui',
      options: [
        { value: 'normal', label: 'Normal' },
        { value: 'large', label: 'Large' },
      ],
      default: 'normal',
    },
  ],
  // ...
}
```

There are two kinds:

- **A `play` setting**, the default, is part of the game. It's saved with it, and content reads it with the [`{ setting }`](/docs/reference/conditions#setting) condition, such as a hint that appears only with `when: { setting: 'hints' }`.
- **A `ui` setting** only changes how the game looks or sounds. It lives in the profile, never in the game state, and only your UI reads it.

Read every setting's value now with [`runner.settings()`](/docs/reference/runner#settings), and change one with [`runner.setSetting`](/docs/reference/runner#setsetting):

```ts
// Copy the text size onto the page now, and whenever it changes.
function showTextSize() {
  document.documentElement.dataset.textSize = String(runner.settings().textSize)
}
showTextSize()
runner.subscribe(showTextSize)

const result = runner.setSetting('textSize', 'large')
if (!result.ok) showMessage(result.reason)
```

`settings()` is synchronous and returns the same object until a value changes, so you can call it while you draw. `setSetting` checks the value against the declaration. A play setting goes through the game as a command, so it's logged and replays the same. A ui setting is written to the profile, and needs a runner made with one. `browserRunner` has one.

To draw a whole settings screen, read [`view.settings`](/docs/reference/view#settings). It lists every setting in order with its `label`, `kind`, `options` or range, and `default`. Take each one's current value from `runner.settings()`, and call `setSetting` when the player changes it.

The player's last choices are kept in the profile, so a new game starts with them. [Settings](/docs/reference/settings) has the rest, such as ranges.

## Next

- [A game with a world](/docs/guide/first-game) builds a bigger game with plugins, still on the engine directly.
- [A UI from scratch](/docs/guide/ui-from-scratch) puts the loop on a page in plain JS.
- [Saves](/docs/reference/saves) has drivers of your own, export and import, and migrations.
