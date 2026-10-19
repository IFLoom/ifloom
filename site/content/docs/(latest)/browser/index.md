---
title: "Browser helpers"
description: "@ifloom/browser: the minigame clock, keyboard shortcuts, the number for a new save slot and a key that shows held-back prose, as plain DOM for any framework."
---
The engine has no DOM, so a few things a game needs from the page live in `@ifloom/browser`: a clock for minigame timers, keyboard shortcuts, the number for a new save slot, and a key press that shows prose a UI is holding back. They're plain DOM, so they work with Vue, Svelte, plain JS or React. The [React UI](/docs/react) uses them itself, and the `vanilla`, `vue` and `svelte` templates start the clock and the keys beside the runner.

```ts
import {
  startClock, startKeys, startMinigameKeys, startRevealSkip,
  nextSlot, numberedChoices, minigameInput, ignoredKey, dialogOpen,
  type ClockOptions, type KeysOptions,
} from '@ifloom/browser'
```

Add `@ifloom/browser` beside the engine. It imports nothing but `@ifloom/engine`. Each `start…` function returns a function that stops it.

## startClock

```ts
function startClock(runner: Runner, options?: ClockOptions): () => void

type ClockOptions = { every?: number }
```

The engine keeps no clock, so a [minigame](/docs/reference/minigames)'s timers need something to send a [`tick`](/docs/reference/commands#tick). While the minigame being played has a timer running and the page is visible, `startClock` sends one about every `every` milliseconds (100 if left out) with the real time that passed since the last.

```ts
import { startClock } from '@ifloom/browser'

const runner = await browserRunner(game)
startClock(runner)
```

It only runs while a timer does, so it costs nothing the rest of the time. When the player switches to another tab, it sends what passed until then and stops. When they come back, it starts afresh, so the round waits for them. When an input moves the minigame to a new state, that state's clock starts from the input.

**Gotcha.** Start one per runner. Two clocks would each send ticks, and the timers would run twice as fast.

## startKeys

```ts
function startKeys(runner: Runner, options?: KeysOptions): () => void

type KeysOptions = {
  choices?: boolean | ((key: number) => boolean)
  escape?: () => boolean | void
  map?: Record<string, CommandRef>
  minigame?: boolean
}
```

The game's keyboard shortcuts, in this order:

| Option | What it does | Default |
|---|---|---|
| `map` | Keys of the game's own, by [`KeyboardEvent.key`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key) (`'m'`, `'F2'`, `' '`), each with the command it sends. They come first, so mapping `'1'` or `'Escape'` replaces what that key does. | none |
| `escape` | What Escape does, such as opening your menu. Return `false` when it did nothing, such as with no menu to open, and the key goes on to the page untouched. | nothing |
| `choices` | The number keys 1 to 9 pick the choices on screen, in [`numberedChoices`](#numberedchoices) order. A greyed-out choice is skipped. Pass a function to pick yourself: it gets the key's number and returns whether it picked anything. | on |
| `minigame` | A minigame's inputs from the keyboard too, through [`startMinigameKeys`](#startminigamekeys). | on |

A key the player types into a field, a key held with Ctrl, Alt, Meta or Shift, and any key while a dialog is open are left alone (see [`ignoredKey`](#ignoredkey) and [`dialogOpen`](#dialogopen)). A key it uses is kept from doing anything else.

Here a game opens its own menu with Escape and saves with F5:

```ts tab="Plain JS" tab-group="framework"
// src/main.ts
import { startKeys } from '@ifloom/browser'

const menu = document.querySelector<HTMLDialogElement>('#menu')!
startKeys(runner, {
  escape: () => menu.showModal(),
  map: { F5: { type: 'activity', id: 'quick-save' } },
})
```

```tsx tab="React" tab-group="framework"
// src/App.tsx, React by hand. With the React UI, pass `keys` to mountGame instead.
import { useEffect, useState } from 'react'
import { startKeys } from '@ifloom/browser'
import { runner } from './runner.ts'

export function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => startKeys(runner, { escape: () => setMenuOpen(true), map: { F5: { type: 'activity', id: 'quick-save' } } }), [])
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
  stop = startKeys(runner, { escape: () => (menuOpen.value = true), map: { F5: { type: 'activity', id: 'quick-save' } } })
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
  $effect(() => startKeys(runner, { escape: () => (menuOpen = true), map: { F5: { type: 'activity', id: 'quick-save' } } }))
</script>
```

The templates call `startKeys(runner)` with no options, so the number keys pick choices and a minigame's keys press its inputs. If you start it yourself with options, don't also keep the template's call, or each key is handled twice.

## startMinigameKeys

```ts
function startMinigameKeys(runner: Runner): () => void
```

Presses the minigame's inputs from the keyboard while one is being played, as [`minigameInput`](#minigameinput) maps keys to inputs. A key that belongs to an input is kept from scrolling the page or doing anything else, even while that input does nothing. It listens before other shortcuts, so a minigame's keys win over the number keys. `startKeys` starts it for you unless you pass `minigame: false`. The React UI's [`MinigameCard`](/docs/react/components#minigamecard) uses it on its own.

## minigameInput

```ts
function minigameInput(minigame: MinigameView, key: string): string | undefined
```

The input a key presses, by `KeyboardEvent.key`, whether or not it does anything now. It's the minigame's own [`keys`](/docs/reference/minigames#minigamedef) if it gives the input any. Otherwise it's the arrow keys and space for inputs named `up`, `down`, `left`, `right` and `space`, and failing that the input's own name when it's one letter. One-letter keys match either case.

```ts
minigameInput(runner.view().minigame!, 'ArrowLeft') // 'left'
```

## numberedChoices

```ts
function numberedChoices(view: View): RenderedChoice[]
```

The choices the number keys pick, in order: the open scene's choices, or the room's [actions](/docs/reference/actions) when no scene has any. Key 1 is the first. Use it to show each button's number.

## nextSlot

```ts
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

```ts
function startRevealSkip(skip: () => void): () => void
```

Until stopped, the next key press calls `skip`, which should show everything the scene still holds back, and does nothing else. It listens before other shortcuts and swallows the key, so a number key can't pick a choice that isn't shown yet. Typing in a field and keys held with a modifier are left alone. Start it while reveals are pending, and stop it once they're all shown or skipped.

```ts
let stopSkip = startRevealSkip(() => {
  showEverything()
  stopSkip()
})
```

## ignoredKey

```ts
function ignoredKey(event: KeyboardEvent): boolean
```

Whether shortcuts should leave a key press alone: the player typing in an input, a text area, a select or editable text, a key held with Ctrl, Alt, Meta or Shift, or one something else already handled (`defaultPrevented`). Use it in shortcuts of your own.

## dialogOpen

```ts
function dialogOpen(): boolean
```

Whether the page has an open dialog, an element with `role="dialog"` or `role="alertdialog"`. The shortcuts stand aside while one is, so its own keys, and Escape, are its.
