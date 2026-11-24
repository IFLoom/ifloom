---
title: "Mods"
description: "A mod is a pack in a JSON file that a player adds to a built game, kept by the mod store and loaded over the content."
---
A mod is a [pack](/docs/reference/content#pack) in a JSON file that a player adds to a built game. The mod store keeps it, and the next time the game starts, the game loads the packs of the mods that are on over its content. [Content, packs and the base](/docs/explanation/content-and-packs#why-a-games-files-are-content-and-a-mod-is-a-pack) explains why a mod is a pack, and [Let players add mods](/docs/how-to/let-players-add-mods) builds a mod manager.

In the showcase: `examples/showcase/mods/fog-season.json`, a mod to try, and `examples/showcase/src/main.tsx`, which keeps the player's mods with `mods('small-town', indexedDbDriver({ database: 'small-town-mods' }))`.

```ts
import { mods, type InstalledMod, type ModFile, type Mods } from '@ifloom/engine'
```

A mod is data only. Nothing in it runs, so it can do what a pack can do and no more, and the game's code is the code the game shipped. [Content and packs](/docs/reference/content#pack) says how each field of a pack merges over the content.

## ModFile

A mod as a file: what it is, which game it's for, and the pack it adds. Every field is in [`ModFile`](/docs/api/engine#modfile).

| Field | Meaning |
|---|---|
| `ifloomMod` | Always `1`, which marks the file as a mod. |
| `id` | The mod's id. The store keeps one mod per id and renames its pack `mod:<id>`. |
| `name` | The name the player sees in the mod list, which the store sorts by. |
| `game` | The [`id`](/docs/reference/content#gamebase) of the game it was made for. Any other game refuses it. |
| `pack` | The pack. Its `schema` can be the game's [`SCHEMA`](/docs/reference/content#schema) or an older one, which [`loadGame`](/docs/reference/content#loadgame) upgrades each time it loads the mod, and its `plugins` can record the version of each plugin's content it was written for. |

A pack in a file holds only what JSON can hold: scenes, stats, kinds, entities, `traits` rows, actions, locks, triggers, inputs, settings, timers, minigames, strings, prose, variants, patches, plugin content in `data`, and the rest of [`Pack`](/docs/reference/content#pack)'s data keys. A location, a vendor and a character are entities with their plugin's trait, so a mod adds one in `entities` and changes one by replacing it or with a `traits` row. The game's [`rules`](/docs/reference/rules) are code, so a mod can't carry them.

The showcase's mod adds a fourth line to the high street's weather, because a pack's `variants` are appended, and rewrites the park, because a pack's `prose` replaces the line with the same key:

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
    "variants": { "street.weather": ["street.weather.fog"] }
  }
}
```

## Mods

One game's installed mods, kept in a [save driver](/docs/reference/saves#savedriver), as [`mods`](#mods-1) returns them. Every member is in [`Mods`](/docs/api/engine#mods).

Each member answers a [`Result`](/docs/reference/common#result) and never rejects. When the driver fails, such as IndexedDB in a private window that refuses it, the member fails with a reason the player can read and the driver's error as its `cause`.

| Field | Meaning |
|---|---|
| `list()` | Answers every mod added, on or off, sorted by name, as [`InstalledMod`](#installedmod)s. It leaves out a mod stored in a way it can't read, and fails with `The mods could not be read.` |
| `add(text)` | Reads a file's text and keeps the mod, switched on, then answers it. A mod with the id of one already there replaces it and is switched on again. It fails with a [refusal](#mods-1) or `The mod could not be added.` |
| `remove(id)` | Forgets the mod, and fails with `The mod could not be removed.` |
| `setEnabled(id, enabled)` | Turns a mod on or off. A mod that's off stays in the list and out of the game, and an unknown id does nothing. It fails with `The mod could not be changed.` |
| `packs()` | Answers the packs of the mods that are on, in name order, for `loadGame`'s `packs`. It fails with `The mods could not be read.` |

These lines are English, because the store has no game to take strings from.

```ts given
import { indexedDbDriver } from '@ifloom/browser'
import { mods } from '@ifloom/engine'

const store = mods(game.id, indexedDbDriver({ database: 'small-town-mods' }))
const packs = await store.packs()
const forLoading = packs.ok ? packs.value : []
```

## InstalledMod

A mod as the store keeps it: the file's fields without `ifloomMod` and `game`, and whether it's on. Every field is in [`InstalledMod`](/docs/api/engine#installedmod). Its `pack.id` is already `mod:<id>`.

## Functions

### mods

Returns the mod store for a game, kept in a driver under the keys `<game id>.mod.<mod id>`. Every parameter is in [`mods`](/docs/api/engine#mods-1).

The first argument is the game's `id`, the one each file names in `game`. The keys sit beside the saves' `<game id>.save.` keys, so one driver keeps both without them clashing. In a browser, [`indexedDbDriver`](/docs/reference/browser#indexeddbdriver) keeps a mod across reloads with no server.

`add` keeps the pack as the file wrote it, with its `id` set to `mod:<id>`, and checks only the outside of the file and that this engine can read its schema. `loadGame` upgrades the pack each time it loads, so a plugin carries its own content in the mod forward and an installed mod keeps working after an update. `add` refuses a file it can't use:

| Problem | Cause |
|---|---|
| `That is not a mod file.` | The text isn't JSON, or lacks `ifloomMod: 1`, a string `id`, `name` or `game`, or a `pack` with a numeric `schema`. |
| `That mod is for another game (<game>).` | The file's `game` isn't the store's game. |
| `That mod was written for a version this game cannot read (schema <n>).` | The pack's `schema` is newer than [`SCHEMA`](/docs/reference/content#schema), or too old to upgrade. |

```ts given
import { memoryDriver, mods } from '@ifloom/engine'

const store = mods(game.id, memoryDriver())
const added = await store.add('{"ifloomMod":1,"id":"fog","name":"Fog","game":"another-game","pack":{"id":"fog","schema":6}}')
if (!added.ok) console.warn(added.reason) // 'That mod is for another game (another-game).'
```

## Checks

`add` doesn't check a pack's content, so a mod that names a scene nobody wrote goes in. [`loadGame`](/docs/reference/content#loadgame) reports each problem against the pack that brought it, and a mod's pack is `mod:<id>`, so [`describeProblem`](/docs/reference/checks#describeproblem) writes a mod's problems with `mod:<id>` in front:

```text
mod:compliments · scene ava.hi · no prose for "ava.hi#coffee"
```

Loading never throws, so a mod with a broken reference still loads and the game runs with what of it works. A mod manager shows each line under the mod it names, so the player can see which one to turn off.

## Caveats

- A change to the store takes effect when the game is built again. The running game keeps the mods it started with, so a mod manager reloads the page after each change.
- Mods load in name order, so when two mods replace the same prose key, words key or scene, the one whose `name` sorts last wins. Their ids and the order they were added don't matter.
- A mod can't remove a variant, change one field of a scene or a location, add a plugin, or change the game's `rules`. A mod that needs logic in code can only [call](/docs/reference/custom) a condition or effect the game or its plugins already have.
- Saves record the packs the game was loaded with, so a save made with a mod that's now off still loads, and its [`LoadedSave.missingPacks`](/docs/reference/saves#loadedsave) names the mod. A scene, thing or storyline only that mod had isn't there.
