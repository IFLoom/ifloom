---
title: "Mods"
description: Mod files a player adds to a built game, the store that keeps them, and loading them at start-up, with a mod manager in plain DOM, React, Vue or Svelte.
---
A mod is a [pack](/docs/reference/loader#pack) in a file that a player adds to a built game. It can bring new scenes and prose, more variants for a line, a choice patched into a scene, or a replacement location or character. The player picks the file, the game keeps it, and the next time the game starts the mod's pack is loaded over the game's content.

```ts
import { mods, readMod, type Mods, type ModFile, type InstalledMod } from '@ifloom/engine'
```

A mod is data only. Nothing in it runs, so it can do what a pack can do and no more, and the game's code is the code the game shipped.

Below are the file a player adds, the store that keeps it, and how a game loads it when it starts. How packs merge over the game's content, and the checks the loader runs on them, is on [Content, packs and loading](/docs/reference/loader).

## ModFile

```ts
type ModFile = {
  ifloomMod: 1
  id: string
  name: string
  version?: string
  game: string
  description?: string
  pack: Pack
}
```

A mod as a file. It's JSON that says what the mod is, which game it's for, and the pack it adds.

| Field | What it is |
|---|---|
| `ifloomMod` | Always `1`. It marks the file as a mod. |
| `id` | The mod's id. The store keeps one mod per id, and its pack is renamed `mod:<id>`. |
| `name` | What the player sees in the mod list. The list is sorted by it. |
| `version` | Shown beside the name. Optional, and never compared. |
| `game` | The [`game.id`](/docs/reference/game#game) it was made for. Any other game refuses it. |
| `description` | A line under the name. Optional. |
| `pack` | The [pack](/docs/reference/loader#pack). Its `schema` may be the game's [`SCHEMA`](/docs/reference/loader#schema) or an older one, which is [upgraded](/docs/reference/loader#upgradepack) each time the game loads it. It may record the version of each plugin's content it was written for in `plugins`. Its `id` is replaced. |

This is a whole mod, as the showcase ships it in `examples/showcase/mods/fog-season.json`:

```json
{
  "ifloomMod": 1,
  "id": "fog-season",
  "name": "Fog season",
  "version": "1.0",
  "game": "small-town",
  "description": "Autumn comes early: fog on the high street, and the park goes quiet.",
  "pack": {
    "id": "fog-season",
    "schema": 6,
    "prose": {
      "street.weather.fog": "Fog down the high street; the bakery's lights are the only colour in it.",
      "place.park": "The river has gone grey under the fog, and even the ducks are keeping their opinions to themselves."
    },
    "variants": {
      "street.weather": ["street.weather.fog"]
    }
  }
}
```

It adds a fourth line to the high street's weather, because a pack's `variants` are appended. It rewrites the park, because a pack's `prose` replaces the line with the same key. See [Pack](/docs/reference/loader#pack) for how each field merges.

A pack in a file has only what JSON can hold: scenes, storylines, stats, the starting `kv` and `resets`, kinds, entities, traits, actions, locks, triggers, inputs, settings, timers, minigames, strings, prose, variants, patches and plugin content (`data`). The [places plugin](/docs/plugins/places#in-your-content)'s locations, the [shop](/docs/plugins/shop#writing-vendors)'s vendors and the [cast](/docs/plugins/cast#in-your-content)'s characters are entities with their plugin's trait, so a mod adds one in `entities`, and changes one by replacing the entity or with a `traits` row. A [`DataScene`](/docs/reference/scenes#datascene) is already JSON. The game's [`rules`](/docs/reference/rules) are code, so a mod file can't carry them.

## readMod

```ts
function readMod(text: string, gameId: string): Result<ModFile>
```

Reads a mod file's text for the game `gameId`. It returns a [`Result`](/docs/reference/runner#result): the mod with its pack as the file wrote it and its `id` set to `mod:<id>`, or the reason it can't be used, worded for the player. The pack isn't upgraded here: [`loadGame`](/docs/reference/loader#loadgame) upgrades it with the game's other packs each time it loads, so the game's plugins carry their own content in it forward too, and a mod a player installed keeps working after you update a plugin. Here it's only checked that this engine can read its schema.

| When | Reason |
|---|---|
| The text isn't JSON, or lacks any of `ifloomMod: 1`, a string `id`, a string `name`, a string `game`, or a `pack` with a numeric `schema` | `That is not a mod file.` |
| `game` isn't `gameId` | `That mod is for another game (<game>).` |
| `pack.schema` is newer than `SCHEMA`, or too old to upgrade | `That mod was written for a version this game cannot read (schema <n>).` |

```ts
import { readMod } from '@ifloom/engine'

const read = readMod(text, 'small-town')
if (!read.ok) showMessage(read.reason)
else read.value.pack.id // 'mod:fog-season'
```

The store's `add` calls it for you. Only call it yourself to look at a file without keeping it.

**Gotcha.** It checks the outside of the file, not the content. A pack that names a scene nobody wrote reads fine here. [`loadGame`](/docs/reference/checks) reports it as a problem, against `mod:<id>`.

## mods

```ts
function mods(gameId: string, driver: SaveDriver): Mods

interface Mods {
  list(): Promise<InstalledMod[]>
  add(text: string): Promise<Result<InstalledMod>>
  remove(id: string): Promise<void>
  setEnabled(id: string, enabled: boolean): Promise<void>
  packs(): Promise<Pack[]>
}
```

One game's installed mods, kept in a [save driver](/docs/reference/saves#drivers). In a browser, use [`indexedDbDriver()`](/docs/browser#indexeddbdriver), so a mod survives a reload and needs no server.

| Member | What it does |
|---|---|
| `list()` | Every mod added, on or off, sorted by name. |
| `add(text)` | Reads a file's text with [`readMod`](#readmod) and keeps the mod, switched on. Returns a `Result` with it, or the refusal. A mod with the same `id` as one already there replaces it, and is switched on again. |
| `remove(id)` | Forgets the mod. |
| `setEnabled(id, enabled)` | Turns a mod on or off. A mod that's off stays in the list but is left out of the game. An unknown id does nothing. |
| `packs()` | The packs of the mods that are on, in name order. Pass them to `loadGame` as `packs`, over the game's content. |

### InstalledMod

```ts
type InstalledMod = {
  id: string
  name: string
  version?: string
  description?: string
  enabled: boolean
  pack: Pack
}
```

A mod as the store keeps it: the file's fields without `ifloomMod` and `game`, and whether it's on. `pack.id` is already `mod:<id>`.

### Keys

| What | Key |
|---|---|
| Mod `id` | `<gameId>.mod.<id>` |

Mods use the same drivers and the same key scheme as [saves](/docs/reference/saves#keys). Saves sit under `<gameId>.save.` and mods under `<gameId>.mod.`, so a game can keep both in one database without them clashing.

## Loading mods at start-up

A game builds itself once, when the page opens. It reads the mods that are on, loads them over the game's content, and makes the runner from the result. This part is the same whatever draws the game:

```ts
// src/runner.ts, or src/main.ts in the vanilla template
import { browserRunner, indexedDbDriver } from '@ifloom/browser'
import { mods } from '@ifloom/engine'
import { smallTown } from './game.ts'

// The player's mods live in IndexedDB; they're loaded over the town at start-up.
export const modStore = mods('small-town', indexedDbDriver({ database: 'small-town-mods' }))
export const { game, problems } = smallTown({ mods: await modStore.packs() })
if (problems.length) console.warn(problems.join('\n'))

export const runner = await browserRunner(game)
```

`smallTown`, in `src/game.ts`, passes the packs to [`loadGame`](/docs/reference/loader#loadgame) as its third argument, over the town's content. Trimmed, it reads:

```ts
import { describeProblem, loadGame, type Pack } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { stats } from './world/stats.ts'
import { cafe } from './story/cafe.ts'

const content = [stats, cafe /* , … */]

export function smallTown({ withDebug = false, mods = [] as Pack[] } = {}) {
  const { game, problems } = loadGame(
    content,
    { id: 'small-town', title: 'Small Town', plugins: [calendar({ start: { day: 0, period: 'night' } }), places({ start: 'flat' }), /* … */], /* … */ },
    { packs: mods },
  )
  return { game, problems: problems.map(describeProblem) }
}
```

The player also needs somewhere to add a file and turn mods on and off. A change takes effect when the game is built again, so each one reloads the page. The React UI has a [mod manager](/docs/react/components#modmanager) for this. The React tab is the showcase's `src/main.tsx` in full, which builds its runner by hand, with undo, a backlog and an autosave each turn, and draws `GameShell` inside React's `StrictMode`. The other tabs draw a small manager of their own, with `modStore` and `problems` from the code above:

```ts tab="Plain JS" tab-group="framework"
// src/modManager.ts
import type { Mods } from '@ifloom/engine'

/** The installed mods with a checkbox each, any problems under the mod that caused them, and a file input to add one. */
export async function modManager(store: Mods, problems: string[]): Promise<HTMLElement> {
  const section = document.createElement('section')
  section.appendChild(document.createElement('h2')).textContent = 'Mods'
  for (const mod of await store.list()) {
    const label = section.appendChild(document.createElement('label'))
    const box = label.appendChild(document.createElement('input'))
    box.type = 'checkbox'
    box.checked = mod.enabled
    box.onchange = async () => {
      await store.setEnabled(mod.id, box.checked)
      location.reload()
    }
    label.append(` ${mod.name}`)
    for (const line of problems.filter((problem) => problem.startsWith(`mod:${mod.id} `))) {
      section.appendChild(document.createElement('p')).textContent = line
    }
  }
  const file = section.appendChild(document.createElement('input'))
  file.type = 'file'
  file.accept = '.json,application/json'
  file.onchange = async () => {
    const chosen = file.files?.[0]
    if (!chosen) return
    const added = await store.add(await chosen.text())
    if (!added.ok) alert(added.reason) // why it isn't a mod for this game
    else location.reload()
  }
  return section
}
```

```tsx tab="React" tab-group="framework"
// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { indexedDbDriver, localStorageDriver } from '@ifloom/browser'
import { createRunner, mods, saves, startingState } from '@ifloom/engine'
import { GameShell } from '@ifloom/react'
import { smallTown } from './game.ts'
import './styles.css'

// The player's mods live in IndexedDB; they're loaded over the town at start-up.
const modStore = mods('small-town', indexedDbDriver({ database: 'small-town-mods' }))
const { game, problems } = smallTown({ withDebug: import.meta.env.DEV, mods: await modStore.packs() })
if (problems.length) console.warn(problems.join('\n'))

// A fresh seed per new game, so each playthrough deals its own variants.
const runner = createRunner(game, startingState(game, { seed: Math.floor(Math.random() * 2 ** 31) }), {
  history: { depth: 50 },
  backlog: { limit: 200 },
  saves: saves(game, localStorageDriver(window.localStorage)),
  autosave: { every: 'turn' },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameShell runner={runner} mods={{ store: modStore, problems, onChange: () => location.reload() }} />
  </StrictMode>,
)
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
  installed.value = await modStore.list()
})

async function toggle(mod: InstalledMod) {
  await modStore.setEnabled(mod.id, !mod.enabled)
  location.reload()
}

async function addFile(event: Event) {
  const chosen = (event.target as HTMLInputElement).files?.[0]
  if (!chosen) return
  const added = await modStore.add(await chosen.text())
  if (!added.ok) refused.value = added.reason
  else location.reload()
}
</script>

<template>
  <section>
    <h2>Mods</h2>
    <template v-for="mod in installed" :key="mod.id">
      <label><input type="checkbox" :checked="mod.enabled" @change="toggle(mod)" /> {{ mod.name }}</label>
      <p v-for="line in problems.filter((problem) => problem.startsWith(`mod:${mod.id} `))" :key="line">{{ line }}</p>
    </template>
    <input type="file" accept=".json,application/json" @change="addFile" />
    <p v-if="refused">{{ refused }}</p>
  </section>
</template>
```

```svelte tab="Svelte" tab-group="framework"
<!-- src/ModManager.svelte -->
<script lang="ts">
  import type { InstalledMod } from '@ifloom/engine'
  import { modStore, problems } from './runner.ts'

  const installed = modStore.list()
  let refused = $state('')

  async function toggle(mod: InstalledMod) {
    await modStore.setEnabled(mod.id, !mod.enabled)
    location.reload()
  }

  async function addFile(event: Event) {
    const chosen = (event.currentTarget as HTMLInputElement).files?.[0]
    if (!chosen) return
    const added = await modStore.add(await chosen.text())
    if (!added.ok) refused = added.reason
    else location.reload()
  }
</script>

<section>
  <h2>Mods</h2>
  {#await installed then mods}
    {#each mods as mod (mod.id)}
      <label><input type="checkbox" checked={mod.enabled} onchange={() => toggle(mod)} /> {mod.name}</label>
      {#each problems.filter((problem) => problem.startsWith(`mod:${mod.id} `)) as line (line)}<p>{line}</p>{/each}
    {/each}
  {/await}
  <input type="file" accept=".json,application/json" onchange={addFile} />
  {#if refused}<p>{refused}</p>{/if}
</section>
```

In the React UI, `mods` on [`GameShell`](/docs/react#gameshell) adds Mods to the player's menu, and with `pages` on, a Mods section to the [settings page](/docs/react/components#settingspage). Both show the [mod manager](/docs/react/components#modmanager), where the player adds a file, turns mods on and off, and restarts with the change. `onChange` is the restart, and reloading the page runs `main.tsx` again. Each line of `problems` starting `mod:<id> ` is shown under that mod, as the other tabs do by hand.

The first argument to `mods` must be the game's `id`, the same one the files name in `game`.

### Problems in a mod

The loader reports every problem against the pack that brought it, and a mod's pack is `mod:<id>`, so each problem a mod causes names that mod. A mod that patched a choice into Ava's scene and forgot its label would give:

```text
mod:compliments · scene ava.hi · no prose for "ava.hi#coffee"
```

The game decides what to do about problems. Loading never throws, so a mod with a broken reference still loads, and the game runs with whatever of it works. Show each line starting `mod:<id> ` under that mod, as the managers above do, so the player can see which one to turn off.

### Saves made with mods

[Saves](/docs/reference/saves#savemeta) record the ids of the packs the game was loaded with, `mod:<id>` among them. A save made with a mod that's now off or removed still loads, and [`LoadedSave.missingPacks`](/docs/reference/saves#loadedsave) names the mod. The React UI's saves menu says so with the `ui.missingPacks` string.

## Gotchas

- **A change takes effect when the game is built again.** The store changes at once, but the running game doesn't. A game is loaded once, so adding, removing or turning off a mod changes nothing until the page is reloaded (`onChange` in the React UI). Until then the player plays on with the mods the game started with.
- **A mod can only do what a pack can.** It can add scenes, characters and the rest, replace any of the game's whole by id, replace prose by key, append members to a set of variants, add, drop or replace a choice with a [patch](/docs/reference/loader#patches), and add content for the game's plugins. It can't remove a variant, change one field of a scene or a location, add a plugin, or change the game's `rules`.
- **No code mods.** A mod file is JSON, and nothing in it runs. A mod that needs a new condition or effect worked out in code can only [call one by name](/docs/reference/custom) that the game or its plugins already have. A game that wants code from its modders has to ship that code itself.
- **Turning a mod off can break the saves that used it**, as any [missing pack](/docs/reference/saves#loadedsave) does. The save loads, but a scene, thing or storyline that only the mod had isn't there, and the game may not play as it did. Warn the player before loading such a save, or turn the mod back on.
- **Mods load in name order.** When two mods replace the same prose key or the same scene, the one whose `name` sorts last wins. Their ids don't matter, and neither does the order they were added in.
- **Adding a mod again turns it on.** `add` with a file whose `id` is already there replaces the kept mod with the new one, switched on, whatever it was before.

## See it in an example

Small Town: [`examples/showcase/src/main.tsx`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/main.tsx) keeps the player's mods with `mods('small-town', indexedDbDriver({ database: 'small-town-mods' }))` and loads their packs over the town's content before making the game. [`examples/showcase/mods/fog-season.json`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/mods/fog-season.json) is a mod file to try it with.
