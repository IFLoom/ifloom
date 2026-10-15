# Mods

A **mod** is a [pack](/reference/loader#pack) in a file a player can add to a built game: new scenes and prose, more variants for a line, a choice patched into a scene, a place or a person replaced. The player picks the file, the game keeps it, and the next time the game is built at start-up the mod's pack is loaded over the game's own.

```ts
import { mods, readMod, type Mods, type ModFile, type InstalledMod } from '@ifloom/engine'
```

A mod is data only. Nothing in it runs: it can do what a pack can do and no more, and the game's code is the code the game shipped.

How packs merge, and the checks run on them, is on [Loading and mods](/reference/loader). This page is the file a player adds, the store that keeps it, and how a game loads it.

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

A mod as a file: JSON, with what it is, which game it is for, and the pack it adds.

| Field | What it is |
|---|---|
| `ifloomMod` | Always `1`: the mark of a mod file. |
| `id` | The mod's id. The store keeps one mod per id, and its pack is renamed `mod:<id>`. |
| `name` | What the player sees in the mod list. The list is sorted by it. |
| `version` | Shown beside the name. Optional, and never compared. |
| `game` | The [`game.id`](/reference/game#game) it was made for. Another game refuses it. |
| `description` | A line under the name. Optional. |
| `pack` | The [pack](/reference/loader#pack). Its `schema` must be the game's [`SCHEMA`](/reference/loader#schema); its `id` is replaced. |

A whole mod, as the showcase ships it in `examples/showcase/mods/fog-season.json`:

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

It adds a fourth line to the high street's weather, because a later pack's `variants` are **appended**, and rewrites the park, because a later pack's `prose` **replaces** the line with the same key. See [Pack](/reference/loader#pack) for what each field does when merged.

A pack in a file has only what JSON can hold: scenes, items, storylines, activities, stats, collections, triggers, inputs, strings, prose, variants, patches and plugin content (`data`), the game's locations and people among it (`data.places.locations` for the [places plugin](/plugins/places#in-a-pack), `data.cast.characters` for the [cast](/plugins/cast#in-a-pack)). A [`DataScene`](/reference/scenes#datascene) is JSON already; a hand-written `Scene` and [custom functions](/reference/custom) are code, and a mod file cannot carry them.

## readMod

```ts
function readMod(text: string, gameId: string): ModFile | string
```

Reads a mod file's text for the game `gameId`. Returns the mod, with its pack's `id` set to `mod:<id>`, or why it can't be used, in words to show the player:

| When | Returns |
|---|---|
| The text is not JSON, or has no `ifloomMod: 1`, string `id`, string `name` or `pack` | `That is not a mod file.` |
| `game` is not `gameId` | `That mod is for another game (<game>).` |
| `pack.schema` is not `SCHEMA` | `That mod was written for a version this game cannot read (schema <n>).` |

```ts
const read = readMod(text, 'small-town')
if (typeof read === 'string') showMessage(read)
else read.pack.id // 'mod:fog-season'
```

The store's `add` calls it; call it yourself only to look at a file without keeping it.

**Gotcha.** It checks the outside of the file, not the content. A pack that names a scene nobody wrote reads fine here; [`loadGame`](/reference/loader#loadgame) reports it as a problem, against `mod:<id>`.

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

One game's installed mods, kept in a [save driver](/reference/saves#drivers): in a browser, [`indexedDbDriver()`](/reference/saves#indexeddbdriver), so a mod survives a reload and needs no server.

| Member | What it does |
|---|---|
| `list()` | Every mod added, on or off, sorted by name. |
| `add(text)` | Reads a file's text with [`readMod`](#readmod) and keeps the mod, **on**. Returns it, or the refusal. A mod with the same `id` as one already there replaces it, and is on again. |
| `remove(id)` | Forgets the mod. |
| `setEnabled(id, enabled)` | Turns a mod on or off. An off mod stays in the list and is left out of the game. An unknown id does nothing. |
| `packs()` | The packs of the mods that are on, in name order: what to load after the game's own. |

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

A mod as the store keeps it: the file's fields, without `ifloomMod` and `game`, and whether it is on. `pack.id` is already `mod:<id>`.

### Keys

| What | Key |
|---|---|
| Mod `id` | `<gameId>.mod.<id>` |

The same drivers and the same scheme as [saves](/reference/saves#keys), so a game can keep its saves and its mods in one database without the two meeting: saves are under `<gameId>.save.`, mods under `<gameId>.mod.`.

## Loading mods at start-up

A game builds itself once, when the page opens: read the mods that are on, load them over the game's own pack, and make the runner from the result. The showcase's `src/main.tsx` does it in two lines, with a top-level `await`:

```tsx
import { createRoot } from 'react-dom/client'
import { createRunner, indexedDbDriver, localStorageDriver, mods, saves, startingState } from '@ifloom/engine'
import { GameShell } from '@ifloom/ui'
import { smallTown } from './game.ts'

// The player's mods live in IndexedDB; they're loaded over the town at start-up.
const modStore = mods('small-town', indexedDbDriver({ database: 'small-town-mods' }))
const { game, problems } = smallTown({ withDebug: import.meta.env.DEV, mods: await modStore.packs() })
if (problems.length) console.warn(problems.join('\n'))

const runner = createRunner(game, startingState(game, { seed: Math.floor(Math.random() * 2 ** 31) }), {
  saves: saves(game, localStorageDriver(window.localStorage)),
})

createRoot(document.getElementById('root')!).render(
  <GameShell runner={runner} mods={{ store: modStore, problems, onChange: () => location.reload() }} />,
)
```

`smallTown`, in `src/game.ts`, passes the packs on to [`loadGame`](/reference/loader#loadgame) after its own:

```ts
export function smallTown({ withDebug = false, mods = [] as Pack[] } = {}) {
  const { game, problems } = loadGame([town, ...mods], { id: 'small-town', title: 'Small Town', plugins: [clock, places({ start: 'flat' }), /* … */], /* … */ })
  return { game, problems: problems.map(describeProblem) }
}
```

`mods` on [`GameShell`](/ui/#gameshell) puts **Mods** in the player's menu: the [mod manager](/ui/components#modmanager), where the player adds a file, turns mods on and off, and restarts with the change. `onChange` is the restart; reloading the page runs the lines above again.

The first argument to `mods` must be the game's `id`, the same one the files name in `game`.

### Problems in a mod

The loader reports every problem against the pack that brought it, and a mod's pack is `mod:<id>`, so each problem a mod causes names it. A mod that patched a choice into the market stall and forgot its label would give:

```text
mod:fog-season · scene market.stall · no prose for "market.stall#shelter"
```

The game decides what to do with them. Loading never throws: a mod with a broken reference loads, and the game runs with whatever of it works. Passed to the mod manager as `problems`, each line starting `mod:<id> ` is shown under that mod, so the player can see which one to turn off.

### Saves made with mods

[Saves](/reference/saves#savemeta) record the packs the game was loaded from, `mod:<id>` among them. A save made with a mod that is now off, or removed, still loads, and [`LoadedSave.missingPacks`](/reference/saves#loadedsave) names the mod; the base UI's saves menu says so with `ui.missingPacks`.

## Gotchas

- **A change takes effect when the game is built again.** The store changes at once; the running game does not. A game is loaded once, so adding, removing or turning off a mod changes nothing until the page is reloaded (`onChange`). Until then the player plays on with the mods it started with.
- **A mod can only do what a pack can.** Add scenes, places, people and the rest; replace any of them by id, whole; replace prose by key; append members to a set of variants; add, drop or replace a choice with a [patch](/reference/loader#patches); add content for the game's plugins. It cannot remove a variant, change one field of a place, add a plugin, or change the game's `rules`.
- **No code mods.** A mod file is JSON, and nothing in it runs. A mod that needs a new [custom condition or effect](/reference/custom) can only name ones the game already has. A game that wants code from its modders has to ship that code itself.
- **Turning a mod off can break the saves that used it**, exactly as a [missing pack](/reference/saves#loadedsave) does. The save loads; a scene, item or storyline it refers to that only the mod had is not there, and the state may not play as it did. Warn the player before loading such a save, or turn the mod back on.
- **Mods load in name order.** When two mods replace the same prose key or the same scene, the one whose `name` sorts last wins. Their ids do not matter, and the order is not the order they were added in.
- **Adding a mod again turns it on.** `add` with a file whose `id` is already there replaces the kept mod with the new one, on, whatever it was before.
