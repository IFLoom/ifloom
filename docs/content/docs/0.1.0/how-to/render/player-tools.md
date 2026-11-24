---
title: "Render cheats, unlocks and debug"
description: "Render a cheat menu, a box for supporter codes and a debug readout in a UI of your own, in plain JS, React or Vue."
---
Render the tools that sit outside the story: the player's cheats from [cheats](/docs/0.1.0/reference/plugins/cheats), a box for codes from [unlocks](/docs/0.1.0/reference/plugins/unlocks), and a readout for yourself from [debug](/docs/0.1.0/reference/plugins/debug). Set up the runner first, as [Start your own UI](/docs/0.1.0/how-to/render/start) shows. In the React tabs, each plugin's UI comes from its `/react` subpath and goes in `mountGame`'s `plugins`, as [Show plugins in the React UI](/docs/0.1.0/how-to/react/show-plugin-uis) explains.

## Render the cheats

`view.plugins.cheats` holds the cheats the player can see as a [`CheatsView`](/docs/0.1.0/api/plugin-cheats#cheatsview), each a [`CheatView`](/docs/0.1.0/api/plugin-cheats#cheatview) with its group, how often this save has used it, and a ready `button`. The React UI's `cheatsUi` puts a [`CheatsButton`](/docs/0.1.0/api/plugin-cheats#cheatsbutton) in the side column that opens the [`CheatPanel`](/docs/0.1.0/api/plugin-cheats#cheatpanel).

```ts tab="Plain JS" tab-group="framework"
import type { RunnerSnapshot } from '@ifloom/engine'
// runner and add, as in the vanilla template's src/main.ts.
import { add, runner } from './runner.ts'

/** The cheats under their groups, each a button that says how often it's been used, greyed out with why when it's refused. */
export function drawCheats(parent: HTMLElement, { view }: RunnerSnapshot): void {
  const cheats = view.plugins.cheats?.cheats ?? []
  for (const group of new Set(cheats.map((cheat) => cheat.group))) {
    if (group) add(parent, 'h3', group)
    for (const cheat of cheats.filter((entry) => entry.group === group)) {
      const button = add(parent, 'button', cheat.used ? `${cheat.name} (used ${cheat.used})` : cheat.name)
      button.disabled = Boolean(cheat.button.disabled)
      button.title = cheat.button.disabled ?? cheat.description
      button.onclick = () => runner.apply(cheat.button.command)
    }
  }
}
```

```tsx tab="React" tab-group="framework"
import { mountGame } from '@ifloom/react'
import { cheatsUi } from '@ifloom/plugin-cheats/react'
import module from './game.ts'

// A Cheats button in the side column opens the CheatPanel.
mountGame(module.build(), { plugins: [cheatsUi] })
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import { computed } from 'vue'
import { runner, view } from './runner.ts'

// The cheats under their groups, each a button that says how often it's been used, greyed out with why when it's refused.
const cheats = computed(() => view.value.plugins.cheats?.cheats ?? [])
const groups = computed(() => [...new Set(cheats.value.map((cheat) => cheat.group))])
</script>

<template>
  <template v-for="group in groups" :key="group ?? ''">
    <h3 v-if="group">{{ group }}</h3>
    <button
      v-for="cheat in cheats.filter((entry) => entry.group === group)"
      :key="cheat.id"
      :disabled="Boolean(cheat.button.disabled)"
      :title="cheat.button.disabled ?? cheat.description"
      @click="runner.apply(cheat.button.command)"
    >
      {{ cheat.name }}<template v-if="cheat.used"> (used {{ cheat.used }})</template>
    </button>
  </template>
</template>
```

Group the cheats by `group`, in the order the game declares them. A cheat's `button` has the reason it's refused in `disabled`, such as a supporter cheat before its code is entered, so render it greyed out with the reason. `used` counts the times this save has used the cheat, and the view's `used` counts them all. A cheat runs in any scene and through any lock, so the menu can stay on screen. [`useCheats`](/docs/0.1.0/api/plugin-cheats#usecheats) gives the cheats' view to a React component of your own.

## Render a box for codes

`view.plugins.unlocks` holds every unlock as an [`UnlocksView`](/docs/0.1.0/api/plugin-unlocks#unlocksview), each with whether the player has it, and the runner's snapshot holds where entering a code stands at `helpers.unlocks`, an [`UnlockStatus`](/docs/0.1.0/api/plugin-unlocks#unlockstatus). The React UI's `unlocksUi` starts codes on the runner and puts the [`UnlocksPanel`](/docs/0.1.0/api/plugin-unlocks#unlockspanel) on the settings page with pages on, or behind an **Enter a code** button in the menu without them.

```ts tab="Plain JS" tab-group="framework"
import type { RunnerSnapshot } from '@ifloom/engine'
import { enterCode } from '@ifloom/plugin-unlocks'
// runner and add, as in the vanilla template's src/main.ts. Start codes there once, beside startClock: startUnlocks(runner).
import { add, runner } from './runner.ts'

/** A code box while codes have started, with where the last code stands, and the unlocks with which the player has. */
export function drawUnlocks(parent: HTMLElement, { view, helpers }: RunnerSnapshot): void {
  const unlocks = view.plugins.unlocks
  if (!unlocks?.total) return
  // What startUnlocks reports: idle, checking, wrong or unlocked. A new snapshot follows each change.
  const codes = helpers.unlocks
  if (codes) {
    const form = add(parent, 'form')
    const input = add(form, 'input')
    input.placeholder = 'Code'
    const button = add(form, 'button', codes.status === 'checking' ? 'Checking…' : 'Unlock')
    button.disabled = codes.status === 'checking'
    form.onsubmit = (event) => {
      event.preventDefault()
      void enterCode(runner, input.value)
    }
    if (codes.status === 'wrong') add(form, 'p', codes.reason ?? '', 'reason')
    if (codes.status === 'unlocked') add(form, 'p', `Unlocked: ${codes.entered?.name}.`)
  }
  add(parent, 'h3', `Unlocked ${unlocks.unlocked} of ${unlocks.total}`)
  const list = add(parent, 'ul', '', 'unlocks')
  for (const unlock of unlocks.unlocks) {
    const item = add(list, 'li', `${unlock.name}: ${unlock.unlocked ? 'unlocked' : 'locked'}`)
    item.title = unlock.description
  }
}
```

```tsx tab="React" tab-group="framework"
import { localStorageDriver } from '@ifloom/browser'
import { profile } from '@ifloom/engine'
import { mountGame } from '@ifloom/react'
import { unlockedPacks } from '@ifloom/plugin-unlocks'
import { unlocksUiWith } from '@ifloom/plugin-unlocks/react'
import module from './game.ts'

// What the player's codes opened, from the profile, before the game is built with it.
const opened = await unlockedPacks('small-town', profile({ id: 'small-town' }, localStorageDriver()))

// A code box on the settings page; a new code builds the game again with what it opened.
const unlocks = unlocksUiWith({ problems: opened.problems, onChange: () => location.reload() })
mountGame(module.build({ unlocked: opened.packs }), { pages: true, plugins: [unlocks] })
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import { ref } from 'vue'
import { enterCode } from '@ifloom/plugin-unlocks'
import { runner, snapshot, view } from './runner.ts'

// A code box while codes have started, with where the last code stands, and the unlocks with which the player has.
// Start codes once in runner.ts, beside startClock: startUnlocks(runner). It reports idle, checking, wrong or unlocked in the snapshot.
const code = ref('')
</script>

<template>
  <template v-if="view.plugins.unlocks?.total">
    <form v-if="snapshot.helpers.unlocks" @submit.prevent="enterCode(runner, code)">
      <input v-model="code" placeholder="Code" />
      <button :disabled="snapshot.helpers.unlocks.status === 'checking'">
        {{ snapshot.helpers.unlocks.status === 'checking' ? 'Checking…' : 'Unlock' }}
      </button>
      <p v-if="snapshot.helpers.unlocks.status === 'wrong'" class="reason">{{ snapshot.helpers.unlocks.reason }}</p>
      <p v-if="snapshot.helpers.unlocks.status === 'unlocked'">Unlocked: {{ snapshot.helpers.unlocks.entered?.name }}.</p>
    </form>
    <h3>Unlocked {{ view.plugins.unlocks.unlocked }} of {{ view.plugins.unlocks.total }}</h3>
    <ul class="unlocks">
      <li v-for="unlock in view.plugins.unlocks.unlocks" :key="unlock.id" :title="unlock.description">
        {{ unlock.name }}: {{ unlock.unlocked ? 'unlocked' : 'locked' }}
      </li>
    </ul>
  </template>
</template>
```

Entering a code isn't a command, because the plugin checks each code against a slow hash. Set it up in this order:

1. Before you build the game, open the content the player's codes unlock with [`unlockedPacks`](/docs/0.1.0/api/plugin-unlocks#unlockedpacks), from the game's id and its [profile](/docs/0.1.0/reference/profile). Use the same save driver the runner will use, and pass its `packs` to the game module's `build` as `unlocked`.
2. After you make the runner, start taking codes with [`startUnlocks(runner)`](/docs/0.1.0/api/plugin-unlocks#startunlocks), beside `startClock`. It records each remembered unlock in the game and reports in `helpers.unlocks`.
3. Send each code the player enters to [`enterCode(runner, code)`](/docs/0.1.0/api/plugin-unlocks#entercode). When its result's `restart` is true, the code opened content the game in play lacks, so reload the page to build the game again.

`helpers.unlocks.status` is `checking` while a code is checked, then `wrong` with its `reason`, or `unlocked` with what it `entered`. Disable the button while it's `checking`, since a check takes a fraction of a second per unlock on a phone. In React, `unlocksUiWith` takes the `problems` `unlockedPacks` returns and an `onChange` that reloads, as the React tab shows. [`useUnlocks`](/docs/0.1.0/api/plugin-unlocks#useunlocks) gives the unlocks' view to a React component of your own.

## Render a debug readout

`view.plugins.debug` holds a readout for the developer as a [`DebugView`](/docs/0.1.0/api/plugin-debug#debugview), with the locks that are on, how often each trigger has fired, and the save's seed. The React UI's [`DebugCard`](/docs/0.1.0/api/plugin-debug#debugcard), from `debugUi`, goes at the end of the story.

```ts tab="Plain JS" tab-group="framework"
import type { RunnerSnapshot } from '@ifloom/engine'
import { debug } from '@ifloom/plugin-debug'
// runner and add, as in the vanilla template's src/main.ts.
import { add, runner } from './runner.ts'

/** What a debugger wants on screen: the save's seed, the locks that are on, the triggers fired, and a few commands that ignore locks. */
export function drawDebug(parent: HTMLElement, { view }: RunnerSnapshot): void {
  const shown = view.plugins.debug
  if (!shown) return
  add(parent, 'p', `Seed ${shown.seed}`)
  for (const lock of shown.locks) add(parent, 'p', `Locked: ${lock.reason} (${lock.deny.join(', ')})`, 'lock')
  add(parent, 'p', `Triggers fired: ${Object.keys(shown.fired).join(', ') || 'none'}`)
  add(parent, 'button', '100 coins').onclick = () => runner.apply(debug.stat('coins', 100))
  add(parent, 'button', 'Close the scene').onclick = () => runner.apply(debug.scene())
}
```

```tsx tab="React" tab-group="framework"
import { mountGame } from '@ifloom/react'
import { debugUi } from '@ifloom/plugin-debug/react'
import module from './game.ts'

// The DebugCard goes at the end of the story. It does nothing in a build without the plugin.
mountGame(module.build(), { plugins: [debugUi] })
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import { debug } from '@ifloom/plugin-debug'
import { runner, view } from './runner.ts'

// What a debugger wants on screen: the save's seed, the locks that are on, the triggers fired, and a few commands that ignore locks.
</script>

<template>
  <template v-if="view.plugins.debug">
    <p>Seed {{ view.plugins.debug.seed }}</p>
    <p v-for="(lock, at) in view.plugins.debug.locks" :key="at" class="lock">Locked: {{ lock.reason }} ({{ lock.deny.join(', ') }})</p>
    <p>Triggers fired: {{ Object.keys(view.plugins.debug.fired).join(', ') || 'none' }}</p>
    <button @click="runner.apply(debug.stat('coins', 100))">100 coins</button>
    <button @click="runner.apply(debug.scene())">Close the scene</button>
  </template>
</template>
```

The plugin's commands, such as `debug.stat('coins', 100)` and `debug.scene()`, ignore locks, so a button can send them at any time. A release build leaves the plugin out, so `view.plugins.debug` is undefined there and the readout renders nothing. That lets you keep it in your UI for every build, and `DebugCard` does the same. [`useDebug`](/docs/0.1.0/api/plugin-debug#usedebug) gives the debug view to a React component of your own.

For more on what these sections render, see:

- [Cheats](/docs/0.1.0/reference/plugins/cheats), [Unlocks](/docs/0.1.0/reference/plugins/unlocks) and [Debug](/docs/0.1.0/reference/plugins/debug).
- [The runner](/docs/0.1.0/reference/runner), for the snapshot's `helpers`.
- [Sell supporter content](/docs/0.1.0/how-to/sell-supporter-content) and [Debug a game](/docs/0.1.0/how-to/debug-a-game).
