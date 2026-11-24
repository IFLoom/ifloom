---
title: "Older saves"
description: "Reference for saves written by an older engine: the history of SAVE_VERSION and what loading each version does, fields added without a version, entities and plugin state in old saves, and old save files, command logs and profiles."
---
A save records the format it was written in, and [`loadState`](/docs/reference/saves#loadstate) carries an older one forward when it loads. This page lists each change to the save format and what loading a save from before it does. The game's own changes to its content are carried by its migrations, which [Migrate your players' saves](/docs/upgrading/migrate-your-saves) writes. In the showcase, Small Town, the test `carries a save from before things were entities` in `examples/showcase/tests/showcase.test.ts` loads one such save.

## SAVE_VERSION

[`SAVE_VERSION`](/docs/reference/saves#save_version) is 24, and every new state keeps it in [`state.version`](/docs/reference/state#version). It goes up only when something a save already has changes shape, and each rise ships with a step from the version before. A field added to the state with a load default needs no new version.

`loadState` reads every version from 1 to `SAVE_VERSION`. It refuses a state with no `version`, a version of 0 or a version above `SAVE_VERSION`, with the [`saveTooOld`](/docs/reference/saves#strings) string. A few early versions added fields and nothing else, and have no step of their own. A save from before them gets those fields' load defaults, as it gets any field it lacks.

## The engine's steps

These are the changes to the save format, each with what loading a save from before it does:

- **1 → 2.** The player's name moves out of the top level (`playerName`, `playerFirst`, `playerLast`) into the [kv store](/docs/reference/state#kv), under the same keys, so `{{playerName}}` still prints. The save gets an empty [`chosen`](/docs/reference/state#chosen).
- **2 → 3.** The [turn](/docs/reference/state#turn) comes in. A day was the only turn there was, so `turn` is set to `time.day`, or 0 when the save has no `time`. Everything stamped with a day is stamped with that turn: kv keys named `day:<id>` become `turn:<id>`, each storyline's `closedUntilDay` becomes `closedUntil`, and each collection entry's and notice's `day` becomes `turn`.
- **3 → 4.** [Entities](/docs/reference/entities) come in. The save gets an empty [`entities`](/docs/reference/state#entities) and [`created`](/docs/reference/state#created) from their load defaults.
- **4 → 5.** The clock leaves the engine. The save's `time: { day, period }` moves into the [calendar plugin](/docs/reference/plugins/calendar#state)'s state, with the last period `'sleep'` renamed `'late'`. A save that already has calendar state keeps it, and a game without the calendar keeps the entry unused.
- **5 → 6.** Where the player is leaves the engine. The save's `locationId` moves into the [places plugin](/docs/reference/plugins/places#state)'s state as `at`. A save whose `locationId` was `null` gets no entry, so a game with places starts it at the plugin's `start`.
- **6 → 7.** The save gets an empty [`removed`](/docs/reference/state#removed). Older saves recorded no removals, so a declared entity removed in one is back.
- **7 → 8.** Each [storyline](/docs/reference/state#storylines) loses `standing` and `rapport`, which are dropped. A relationship is a [stat](/docs/reference/stats#of) the game declares on the cast's `character` kind, and the engine can't know which stat a game meant.
- **8 → 9, 9 → 10 and 10 → 11.** The save gets [`settings`](/docs/reference/state#settings), [`audio`](/docs/reference/state#audio) and [`media`](/docs/reference/state#media) from their load defaults. Each `play` setting then gets its default, every channel plays the default audio, and the next view picks from each pool as it would in a new game.
- **11 → 12.** `flags` becomes `kv` at the top level, on every storyline and on every entity, with the keys and values kept.
- **12 → 13.** `plugins.effects` moves to `plugins.statuses`, because the timed-effects plugin is the [statuses plugin](/docs/reference/plugins/statuses). A save that already has statuses state keeps it.
- **13 → 14.** [`chosen`](/docs/reference/state#chosen) is keyed `scene#choice`, not `scene/choice`. A choice's once-a-turn record isn't moved, so in a save made partway through a turn, a `once` choice already taken that turn can be taken once more.
- **14 → 15.** Each entity record keeps only what play changed. The step drops empty `stats` and `kv`, and `loadState` then drops what equals the game's content. [Entities in old saves](#entities-in-old-saves) says more.
- **15 → 16.** Items and collections leave the engine. Each count in `items` is written to [`held`](/docs/reference/state#held) for the player under the entity the item became, and each collection entry becomes a thing made in play. [Entities in old saves](#entities-in-old-saves) says more.
- **16 → 17.** `transition` is dropped. A UI reads how the next screen comes in from a choice's [`ui` hints](/docs/reference/ui-hints).
- **17 → 18.** [`seen`](/docs/reference/state#seen) and `chosen` keep one record per id, `{ n, first, last }`. The count comes from the old `seen` or `chosen`, `first` from `seenOn` or `chosenOn`, and `last` from `lastSeenOn` or `lastChosenOn`, else `first`. A record with no turn is dated the turn the save is at. The `turn:<scene>#<choice>` kv keys that capped a `once` choice go, and one that still caps the save's turn makes that choice's `last` the turn.
- **18 → 19.** The save's `phase` becomes the kv key `phase`. A save in no phase gets no key, and a save that already has a `phase` key keeps its own.
- **19 → 20.** A running minigame's `vars` become its `kv`. The [`flow`](/docs/reference/state#flow) field came in with this version, from its load default of `null`.
- **20 → 21.** A [notice](/docs/reference/state#notices)'s `text` is its words, not a prose key. A notice whose `text` is a key the game's prose has gets that key's words.
- **21 → 22.** What an entity made in play was given as `desc` is kept as `description`.
- **22 → 23.** A pool pick for a layered picture's layer is keyed `picture:<index>`, not `stage:<index>`.
- **23 → 24.** The save gets an empty [`changes`](/docs/reference/state#changes). Its file's `SaveMeta` no longer repeats the state's version as `version`. A file that still has one reads as before, and the meta it gives back leaves it out.

## Fields with a load default

A field the state gained without a change of shape has a load default and no step. A save that lacks one of these fields gets its default, whatever its version:

- `minigame`, `panel` and `flow` load as `null`.
- `rolls` loads with no rolls made.
- `timers` loads with no timer running.
- `notices`, `fired`, `held` and `you` load empty, or `null` for `you`.

A save from before [settings](/docs/reference/settings) existed, or one made before the game added a setting, gets each missing `play` setting's default when it loads, in a game with no `version`. A game with a `version` fills settings in its own steps instead.

## Entities in old saves

A declared entity is in the game unless it was removed, whether or not a save has a record of it. When an update writes Ben into the café, or the player turns on a mod that adds staff, Ben is in every old save the moment it loads. A save keeps only what play changed about an entity, so a fixed name, description or schedule reaches old saves too.

An entity that left in play stays gone. A [`remove`](/docs/reference/effects#remove) effect on a declared entity records it in [`state.removed`](/docs/reference/state#removed). An entity created in play isn't recorded there, because nothing would bring it back once its record goes.

```ts given
import { applyEffects, entitiesOf } from '@ifloom/engine'

entitiesOf(state, game, 'staff') // ['staff:ana', 'staff:ben']: Ben is there, record or not

const left = applyEffects(state, game, [{ remove: 'staff:ben' }])
entitiesOf(left, game, 'staff') // ['staff:ana']: he stays gone
```

Three save versions changed how entities are kept:

- **Before version 16**, a save kept the player's items and the game's collections apart from entities. Each item's count is held by the player as the entity the item became: `item:<id>` if the game declares it, else the one entity the game declares with that id (a raincoat that is `clothing:raincoat` now), else `item:<id>`. Each collection entry becomes a thing made in play and held by the player, of a kind named after the collection (the phone's `gallery` is `photo`). The entry's title is its name, its prose its description, its `image` its picture and its data its kv. A collection's `max` and an entry's `turn` aren't kept, and an entry with no id, or one already there, is skipped.
- **Before version 15**, a save copied every declared entity's name and starting stats and kv into the save. `loadState` drops a declared entity's copied name, and every stat and kv key equal to where it starts, so they read from content again. A record with nothing left goes.
- **Before version 7**, a save recorded no removals. Its `removed` starts empty, so a declared entity removed in such a save is back.

## Plugin state in old saves

Each plugin carries its own state forward with its [migrations](/docs/reference/plugin-migrations#migrations), and a plugin the save lacks starts from its `start`. A save from before a plugin was added therefore loads with nothing used, earned or unlocked. The first-party plugins have carried these changes:

- **Calendar and places.** Their state came out of the engine, in save versions 5 and 6 above.
- **Statuses.** A save from when the plugin was called `@ifloom/plugin-effects` kept its state at `state.plugins.effects`, and save version 13 moves it.
- **Wardrobe.** Version 1 kept item ids, and each becomes the wearable entity with that id, or `null` when there's none. Version 2 kept one set of slots for whoever was played, and they become that body's, the player's or the protagonist's.
- **Shop.** Version 1 counted how many of each item had gone. Each count becomes what the vendor has left, under the good whose thing has the item's id, kept in `StockRecord.left` until the vendor's holding takes it.
- **Messages.** Version 1 kept one arrival per message by id, and each becomes an arrival keyed by the message's id, with its day taken to be its turn. A save from before `after` loads with nothing waiting. A save from before `repliedOn` takes each reply's day to be its arrival's.
- **Feed.** Version 1 stamped each of the player's posts with a `day`, which becomes its `turn` unchanged. Version 2 kept a post's or a comment's `text` as a prose key, and it becomes that key's words.
- **Devices.** Version 1 kept only each device's open app, and loads with every device put away.

## Command logs from older engines

A [`CommandLog`](/docs/reference/runner#commandlog) records the `schema` and each plugin's `commandVersion` its commands were written for. A log from before logs kept them has neither, and [`replay`](/docs/reference/runner#replay) reads it as the oldest, so every step runs. The steps rewrite these commands:

- `{ type: 'use', itemId: 'tea' }`, from when items were the engine's, becomes the [inventory plugin](/docs/reference/plugins/inventory)'s `inventory/use` on `item:tea`.
- `{ type: 'activity', id }`, from before schema 20, becomes `{ type: 'action', id }`.
- `setting` and `input` commands from before schema 6 name the value they set `value`, which becomes `to`.
- The timed-effects plugin's commands become the statuses plugin's, by the same name.
- `devices/close`, which once went back to the home screen, becomes `devices/home`.
- `debug/item` becomes `debug/held`, naming the entity the item became.

[Schema history](/docs/upgrading/schema-history#command-logs) lists each plugin's command steps by version.

## Profiles from before the prefixes

A [profile](/docs/reference/profile) stored before its namespaces took the `core:` and `ui:` prefixes kept `settings`, `finished` and `gate`. The first read moves them to `core:settings`, `core:finished` and `ui:gate`, and writes the profile back once.

## Save files

A save file's [`SaveMeta`](/docs/reference/saves#savemeta) records the game's own version in `gameVersion`. A file from before game versions has none, and reads as version 1. A file from before save version 24 repeats the state's version as `version`, which the meta a read gives back leaves out.
