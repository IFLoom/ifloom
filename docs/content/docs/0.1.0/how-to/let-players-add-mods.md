---
title: "Let players add mods"
description: "Let players add mods to your built game with a mod manager in plain JS, React or Vue, and see what mods do to saves."
---
Use this to let players add [mods](/docs/0.1.0/reference/glossary#mod) to your built game: files of content that change scenes, add new ones or reword lines. A mod is a [pack](/docs/0.1.0/explanation/content-and-packs), so it is data a player can add with no code. The game reads the mods that are on as the page opens, builds itself over them, and reloads when the player changes them.

## Build the game over its packs

Give `src/game.ts` a function that builds the game over any packs, and build the game module from it, so `ifloom check` and the page share one build:

```ts
// src/game.ts
import { loadGame, type Pack } from '@ifloom/engine'
import { defineGame } from '@ifloom/cli/game'
import { stats } from './world/stats.ts'
import { cafe } from './story/cafe.ts'

/** The town, with packs over its content: the player's mods, or content a code unlocked. */
export function smallTown(packs: Pack[] = []) {
  return loadGame([stats, cafe], { id: 'small-town', title: 'Small Town' }, { packs })
}

export default defineGame({ build: ({ unlocked }) => smallTown(unlocked) })
```

A pack replaces what it repeats, last wins, so a mod can rewrite one of your scenes by its id.

## Load the mods at start-up

Open the [mod store](/docs/0.1.0/reference/mods#mods) with the game's `id` and a driver, read the packs of the mods that are on, and build the game over them. This part is the same whatever renders the game:

```ts
// src/runner.ts
import { browserRunner, indexedDbDriver } from '@ifloom/browser'
import { describeProblem, mods } from '@ifloom/engine'
import { smallTown } from './game.ts'

export const modStore = mods('small-town', indexedDbDriver({ database: 'small-town-mods' }))
// Where the browser refuses IndexedDB, the town starts without mods.
const packs = await modStore.packs()
if (!packs.ok) console.warn(packs.reason, packs.cause)

const built = smallTown(packs.ok ? packs.value : [])
// Each problem as a line. A mod's start with `mod:<id> `.
export const problems = built.problems.map(describeProblem)
export const runner = await browserRunner(built.game)
```

The first argument to `mods` must be the game's `id`. IndexedDB has room for big mods, and `localStorageDriver()` works too.

## Give the player a mod manager

The player needs a way to add a file and turn mods on and off. Each change takes effect when the game is built again, so reload the page after it. In React, `mountGame`'s `mods` option adds the React UI's [mod manager](/docs/0.1.0/reference/react/components#modmanager) to the menu, and to the settings page with `pages` on:

```ts tab="Plain JS" tab-group="framework"
// src/modManager.ts
import { modStore, problems } from './runner.ts'

export async function modManager(parent: HTMLElement): Promise<void> {
  const installed = await modStore.list()
  for (const mod of installed.ok ? installed.value : []) {
    const label = parent.appendChild(document.createElement('label'))
    const box = label.appendChild(document.createElement('input'))
    box.type = 'checkbox'
    box.checked = mod.enabled
    box.onchange = async () => ((await modStore.setEnabled(mod.id, box.checked)).ok ? location.reload() : undefined)
    label.append(` ${mod.name}`)
    for (const line of problems.filter((problem: string) => problem.startsWith(`mod:${mod.id} `))) parent.appendChild(document.createElement('p')).textContent = line
  }
  const file = parent.appendChild(document.createElement('input'))
  file.type = 'file'
  file.accept = '.json,application/json'
  file.onchange = async () => {
    const added = await modStore.add((await file.files?.[0]?.text()) ?? '')
    if (added.ok) location.reload()
    else alert(added.reason) // such as 'That mod is for another game (other-town).'
  }
}
```

```tsx tab="React" tab-group="framework"
// src/main.tsx
import { indexedDbDriver } from '@ifloom/browser'
import { describeProblem, mods } from '@ifloom/engine'
import { mountGame } from '@ifloom/react'
import { smallTown } from './game.ts'

const store = mods('small-town', indexedDbDriver({ database: 'small-town-mods' }))
const packs = await store.packs()
const built = smallTown(packs.ok ? packs.value : [])

// A Mods page in the menu, with each mod's problems under it; a change reloads the page.
await mountGame(built, { pages: true, mods: { store, problems: built.problems.map(describeProblem), onChange: () => location.reload() } })
```

```vue tab="Vue" tab-group="framework"
<!-- src/ModManager.vue -->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { InstalledMod } from '@ifloom/engine'
import { modStore, problems } from './runner.ts'

const installed = ref<InstalledMod[]>([])
const refused = ref('')
onMounted(async () => {
  const listed = await modStore.list()
  if (listed.ok) installed.value = listed.value
})
async function toggle(mod: InstalledMod) {
  if ((await modStore.setEnabled(mod.id, !mod.enabled)).ok) location.reload()
}
async function addFile(event: Event) {
  const added = await modStore.add((await (event.target as HTMLInputElement).files?.[0]?.text()) ?? '')
  if (added.ok) location.reload()
  else refused.value = added.reason
}
</script>

<template>
  <section>
    <template v-for="mod in installed" :key="mod.id">
      <label><input type="checkbox" :checked="mod.enabled" @change="toggle(mod)" /> {{ mod.name }}</label>
      <p v-for="line in problems.filter((problem: string) => problem.startsWith(`mod:${mod.id} `))" :key="line">{{ line }}</p>
    </template>
    <input type="file" accept=".json,application/json" @change="addFile" />
    <p v-if="refused">{{ refused }}</p>
  </section>
</template>
```

`add` refuses a file that isn't a mod, one made for another game, and one written for a newer engine, each with a line to show the player. It replaces an installed mod with the same id.

## Show each mod's problems under it

The loader reports every problem against the pack that brought it, and a mod's pack is `mod:<id>`. Loading never throws, so a mod with a broken reference still loads, and the game runs with whatever of it works:

```text
mod:compliments · scene ava.hi · goes to unknown scene "ava.compliment"
```

Show each line that starts `mod:<id> ` under that mod, as the managers above do, so the player knows which one to turn off.

## Try it with a mod file

A mod file is JSON in the shape of [`ModFile`](/docs/0.1.0/reference/mods#modfile), with the game's `id` in `game` and a pack whose `schema` is the engine's `SCHEMA`. This one adds a scene to the town:

```json
{
  "ifloomMod": 1,
  "id": "naps",
  "name": "Afternoon naps",
  "game": "small-town",
  "pack": {
    "id": "naps",
    "schema": 30,
    "scenes": [{ "id": "flat.nap", "title": "A nap", "body": [{ "text": "You doze off on the sofa." }], "choices": [{ "id": "wake", "label": "Wake up", "effects": [{ "scene": null }] }] }]
  }
}
```

Add it in the manager. The page reloads, and the store loads its pack as `mod:naps`.

## Load a save made with mods

Saves record the ids of the packs the game was loaded with. A save made with a mod that's now off or removed still loads, and its [`LoadedSave`](/docs/0.1.0/reference/saves#loadedsave)'s `missingPacks` names the mod, so tell the player. The React UI's load page does this with its `ui.missingPacks` string.

For more, see:

- [Mods](/docs/0.1.0/reference/mods), with [`mods`](/docs/0.1.0/reference/mods#mods-1), [`Mods`](/docs/0.1.0/reference/mods#mods) and [`ModFile`](/docs/0.1.0/reference/mods#modfile).
- [Content and packs](/docs/0.1.0/explanation/content-and-packs), on why a mod is a pack and how packs merge.
- [Translate your game](/docs/0.1.0/how-to/translate-your-game), for a translation shipped as a pack.
