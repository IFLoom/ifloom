# Mods

A mod is a [pack](/reference/loader#pack) in a file that a player adds to a built game. It can bring new scenes and prose, more variants for a line, a choice patched into a scene, or a replacement location or character. The player picks the file, the game keeps it, and the next time the game starts the mod's pack is loaded over the game's own.

```ts
import { mods, readMod, type Mods, type ModFile, type InstalledMod } from '@ifloom/engine'
```

A mod is data only. Nothing in it runs, so it can do what a pack can do and no more, and the game's code is the code the game shipped.

This page covers what happens at runtime: the file a player adds, the store that keeps it, and how a game loads it when it starts. How packs merge, and the checks the loader runs on them, is on [Packs and loading](/reference/loader).

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
| `game` | The [`game.id`](/reference/game#game) it was made for. Any other game refuses it. |
| `description` | A line under the name. Optional. |
| `pack` | The [pack](/reference/loader#pack). Its `schema` must be the game's [`SCHEMA`](/reference/loader#schema), and its `id` is replaced. |

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
    "schema": 4,
    "prose": {
      "street.weather/fog": "Fog down the high street; the bakery's lights are the only colour in it.",
      "place.park": "The river has gone grey under the fog, and even the ducks are keeping their opinions to themselves."
    },
    "variants": {
      "street.weather": ["street.weather/fog"]
    }
  }
}
```

It adds a fourth line to the high street's weather, because a later pack's `variants` are appended. It rewrites the park, because a later pack's `prose` replaces the line with the same key. See [Pack](/reference/loader#pack) for how each field merges.

A pack in a file has only what JSON can hold: scenes, items, storylines, activities, stats, kinds, entities, collections, triggers, inputs, strings, prose, variants, patches and plugin content (`data`). Locations and characters are plugin content, at `data.places.locations` for the [places plugin](/plugins/places#in-a-pack) and `data.cast.characters` for the [cast](/plugins/cast#in-a-pack). A [`DataScene`](/reference/scenes#datascene) is already JSON. A hand-written `Scene` and [custom functions](/reference/custom) are code, so a mod file can't carry them.

## readMod

```ts
function readMod(text: string, gameId: string): ModFile | string
```

Reads a mod file's text for the game `gameId`. It returns the mod with its pack's `id` set to `mod:<id>`, or the reason it can't be used, worded for the player:

| When | Returns |
|---|---|
| The text isn't JSON, or lacks any of `ifloomMod: 1`, a string `id`, a string `name`, a string `game`, or a `pack` with a numeric `schema` | `That is not a mod file.` |
| `game` isn't `gameId` | `That mod is for another game (<game>).` |
| `pack.schema` isn't `SCHEMA` | `That mod was written for a version this game cannot read (schema <n>).` |

```ts
import { readMod } from '@ifloom/engine'

const read = readMod(text, 'small-town')
if (typeof read === 'string') showMessage(read)
else read.pack.id // 'mod:fog-season'
```

The store's `add` calls it for you. Only call it yourself to look at a file without keeping it.

**Gotcha.** It checks the outside of the file, not the content. A pack that names a scene nobody wrote reads fine here. [`loadGame`](/reference/loader#the-checks) reports it as a problem, against `mod:<id>`.

## mods

```ts
function mods(gameId: string, driver: SaveDriver): Mods

type Mods = {
  list(): Promise<InstalledMod[]>
  add(text: string): Promise<InstalledMod | string>
  remove(id: string): Promise<void>
  setEnabled(id: string, enabled: boolean): Promise<void>
  packs(): Promise<Pack[]>
}
```

One game's installed mods, kept in a [save driver](/reference/saves#drivers). In a browser, use [`indexedDbDriver()`](/reference/saves#indexeddbdriver), so a mod survives a reload and needs no server.

| Member | What it does |
|---|---|
| `list()` | Every mod added, on or off, sorted by name. |
| `add(text)` | Reads a file's text with [`readMod`](#readmod) and keeps the mod, switched on. Returns it, or the refusal. A mod with the same `id` as one already there replaces it, and is switched on again. |
| `remove(id)` | Forgets the mod. |
| `setEnabled(id, enabled)` | Turns a mod on or off. A mod that's off stays in the list but is left out of the game. An unknown id does nothing. |
| `packs()` | The packs of the mods that are on, in name order. Load these after the game's own. |

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

Mods use the same drivers and the same key scheme as [saves](/reference/saves#keys). Saves sit under `<gameId>.save.` and mods under `<gameId>.mod.`, so a game can keep both in one database without them clashing.

## Loading mods at start-up

A game builds itself once, when the page opens. It reads the mods that are on, loads them over the game's own pack, and makes the runner from the result. This is the showcase's `src/main.tsx` in full. It builds its runner by hand, with undo, a backlog and an autosave each turn, and draws `GameShell` inside React's `StrictMode`. The mod lines are the `modStore` and the `mods` passed to `smallTown` and `GameShell`, using a top-level `await`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createRunner, indexedDbDriver, localStorageDriver, mods, saves, startingState } from '@ifloom/engine'
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

`smallTown`, in `src/game.ts`, passes the packs to [`loadGame`](/reference/loader#loadgame) after its own. Trimmed, it reads:

```ts
import { describeProblem, loadGame, type Pack } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { town } from './content/town.ts'

export function smallTown({ withDebug = false, mods = [] as Pack[] } = {}) {
  const { game, problems } = loadGame([town, ...mods], { id: 'small-town', title: 'Small Town', plugins: [calendar({ start: { day: 0, period: 'night' } }), places({ start: 'flat' }), /* … */], /* … */ })
  return { game, problems: problems.map(describeProblem) }
}
```

`mods` on [`GameShell`](/react/#gameshell) adds Mods to the player's menu. That opens the [mod manager](/react/components#modmanager), where the player adds a file, turns mods on and off, and restarts with the change. `onChange` is the restart, and reloading the page runs `main.tsx` again.

The first argument to `mods` must be the game's `id`, the same one the files name in `game`.

### Problems in a mod

The loader reports every problem against the pack that brought it, and a mod's pack is `mod:<id>`, so each problem a mod causes names that mod. A mod that patched a choice into Ava's scene and forgot its label would give:

```text
mod:compliments · scene ava.hi · no prose for "ava.hi#coffee"
```

The game decides what to do about problems. Loading never throws, so a mod with a broken reference still loads, and the game runs with whatever of it works. If you pass the problems to the mod manager as `problems`, each line starting `mod:<id> ` is shown under that mod, so the player can see which one to turn off.

### Saves made with mods

[Saves](/reference/saves#savemeta) record the packs the game was loaded from, `mod:<id>` among them. A save made with a mod that's now off or removed still loads, and [`LoadedSave.missingPacks`](/reference/saves#loadedsave) names the mod. The React UI's saves menu says so with the `ui.missingPacks` string.

## Gotchas

- **A change takes effect when the game is built again.** The store changes at once, but the running game doesn't. A game is loaded once, so adding, removing or turning off a mod changes nothing until the page is reloaded (`onChange`). Until then the player plays on with the mods the game started with.
- **A mod can only do what a pack can.** It can add scenes, characters and the rest, replace any of them whole by id, replace prose by key, append members to a set of variants, add, drop or replace a choice with a [patch](/reference/loader#patches), and add content for the game's plugins. It can't remove a variant, change one field of a scene or a location, add a plugin, or change the game's `rules`.
- **No code mods.** A mod file is JSON, and nothing in it runs. A mod that needs a new [custom condition or effect](/reference/custom) can only name ones the game already has. A game that wants code from its modders has to ship that code itself.
- **Turning a mod off can break the saves that used it**, as any [missing pack](/reference/saves#loadedsave) does. The save loads, but a scene, item or storyline that only the mod had isn't there, and the game may not play as it did. Warn the player before loading such a save, or turn the mod back on.
- **Mods load in name order.** When two mods replace the same prose key or the same scene, the one whose `name` sorts last wins. Their ids don't matter, and neither does the order they were added in.
- **Adding a mod again turns it on.** `add` with a file whose `id` is already there replaces the kept mod with the new one, switched on, whatever it was before.
