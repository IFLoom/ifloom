---
title: "Older saves"
description: "How loadState carries a save written by an older engine forward, and each change to the save format."
---
A save records the format it was written in, and [`loadState`](/docs/0.1.2/reference/saves#loadstate) carries an older one forward when it loads. This page says how that works and lists each change to the save format. The game's own changes to its content are carried by its migrations, which [Migrate your players' saves](/docs/0.1.2/upgrading/migrate-your-saves) writes.

## SAVE_VERSION

[`SAVE_VERSION`](/docs/0.1.2/reference/saves#save_version) is 1, and every new state keeps it in [`state.version`](/docs/0.1.2/reference/state#version). It goes up only when something a save already has changes shape, and each rise ships with a step from the version before. A field added to the state with a load default needs no new version.

`loadState` reads every version from 1 to `SAVE_VERSION`. It refuses a state with no `version`, a version of 0 or a version above `SAVE_VERSION`, with the [`saveTooOld`](/docs/0.1.2/reference/saves#strings) string.

## The engine's steps

The save format hasn't changed since version 1, so the engine has no steps yet. A step reshapes a field a save already has, keyed by the version it upgrades from, and `loadState` runs the steps in order before each field's load default.

## Fields with a load default

A field the state gains without a change of shape has a load default and no step. A save that lacks one of these fields gets its default, whatever its version. A field such as `minigame`, `panel` or `flow` loads as `null`, and a list or a record loads empty.

A save made before the game added a setting gets each missing `play` setting's default when it loads, in a game with no `version`. A game with a `version` fills settings in its own steps instead.

## Plugin state in old saves

Each plugin carries its own state forward with its [migrations](/docs/0.1.2/reference/plugin-migrations#migrations), and a plugin the save lacks starts from its `start`. A save from before a plugin was added therefore loads with nothing used, earned or unlocked. A save with a plugin's state from a newer version than the game has is refused. The first-party plugins are all at version 1, with no steps yet.

## Command logs from older engines

A [`CommandLog`](/docs/0.1.2/reference/runner#commandlog) records the `schema` and each plugin's `commandVersion` its commands were written for. A log that records neither is read as the oldest, so every step runs. [Schema history](/docs/0.1.2/upgrading/schema-history#command-logs) says how the steps are kept.

## Profiles from before the prefixes

A [profile](/docs/0.1.2/reference/profile) stored before its namespaces took the `core:` and `ui:` prefixes kept `settings`, `finished` and `gate`. The first read moves them to `core:settings`, `core:finished` and `ui:gate`, and writes the profile back once.

## Save files

A save file's [`SaveMeta`](/docs/0.1.2/reference/saves#savemeta) records the game's own version in `gameVersion`. A file from before game versions has none, and reads as version 1.
