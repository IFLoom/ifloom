---
title: "Plugin migrations"
description: "Reference for carrying a plugin forward: its saved state with version and migrations, the content packs write for it with contentVersion and contentMigrations, and command logs with commandVersion and commandMigrations."
---
A plugin carries three things forward when their shape changes: its state in a save, the content packs write for it, and the commands in a [command log](/docs/reference/runner#commandlog). Each has a version on the [`Plugin`](/docs/reference/plugin-api#plugin) and a table of steps keyed by the version each step upgrades from. [Content, packs and the base](/docs/explanation/content-and-packs) explains why packs carry their own versions, and [Migrate your saves](/docs/upgrading/migrate-your-saves) does the same for a game's own state.

None of the examples writes a plugin of its own. The first-party plugins' steps are in each package's `src/`, such as the quests plugin's `contentMigrations` in `packages/plugin-quests/src/index.ts`.

```ts
import type { RawPack } from '@ifloom/engine'
import type { CallForm, CommandStep, ContentStep, ContentTools, PluginSlice, RawCall, RawCommand } from '@ifloom/engine/plugin'
```

## PluginSlice

One plugin's state as a save keeps it, with the version of its shape beside it. Every field is in [`PluginSlice`](/docs/api/engine-plugin#pluginslice).

Each plugin's slice is in [`state.plugins`](/docs/reference/state#plugins), keyed by plugin id, and [`startingState`](/docs/reference/commands#startingstate) fills it from each plugin's `start`. `version` is the plugin's `version` when the state was written, so [`loadState`](/docs/reference/saves#loadstate) knows which steps to run, and `state` is the plugin's own state. A plugin reads and writes it through its context's [`get` and `set`](/docs/reference/plugin-api#get-and-set), and code outside it through [`read` and `write`](/docs/reference/plugin-api#definedplugin).

```ts fragment
{ version: 2, state: { stamps: 0, free: 0 } } // state.plugins.loyalty
```

## migrations

The steps that carry the plugin's saved state forward, keyed by the version each upgrades from. Its type is the `migrations` field of [`Plugin`](/docs/api/engine-plugin#plugin).

When the state's shape changes, the plugin bumps its `version` and adds a step. A step gets the plugin's old state and the [`MigrationTools`](/docs/reference/saves#migrationtools) a game's own migration gets, and returns the plugin's new state. `tools.fill()` returns the whole game state with what the game declares and the save lacks filled in, for a step that reads the game, such as a stat's start value.

```ts fragment
version: 2,
migrations: {
  // Version 1 only counted stamps.
  1: (old) => ({ stamps: (old as { stamps: number }).stamps, free: 0 }),
},
```

[`loadState`](/docs/reference/saves#loadstate) brings every plugin's state up to the version the game has, after the engine's own steps and before the game's [migrations](/docs/reference/rules#migrations). A plugin added since the save was made starts from `start`, an older state is carried forward one step at a time, and the state of a plugin the game no longer has is kept unused. The [save store](/docs/reference/saves#saves), the runner and [`replay`](/docs/reference/runner#replay) all load through `loadState`, so a plugin never sees a state it couldn't read.

## contentVersion and contentMigrations

`contentVersion` is the version of the content packs write for the plugin, its `data`, its calls' arguments, its strings and its traits, and `contentMigrations` holds one step per version, keyed by the version it upgrades from. Their types are the `contentVersion` and `contentMigrations` fields of [`Plugin`](/docs/api/engine-plugin#plugin).

`contentVersion` is 1 if left out. The plugin bumps it when what content writes for it changes, and adds a [`ContentStep`](#contentstep). A version with no step changed nothing, so the steps can have gaps. Say version 1 of the card's `loyalty/stamp` effect took `{ count }` and version 2 takes `{ by }`:

```ts
import { definePlugin } from '@ifloom/engine/plugin'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

export const loyalty = definePlugin<{ stamps: number }>({
  id: 'loyalty',
  version: 1,
  start: () => ({ stamps: 0 }),
  contentVersion: 2,
  contentMigrations: {
    // Version 1's stamp effect counted with `count`.
    1: (pack, tools) =>
      tools.calls(pack, (call) => {
        if (call.name !== 'loyalty/stamp' || !isRecord(call.with) || !('count' in call.with)) return call
        const { count, ...rest } = call.with
        return { name: call.name, with: { ...rest, by: count } }
      }),
  },
})
```

A pack records the content version of each plugin it was written for in its [`plugins`](/docs/reference/content#pack), beside its `schema`, and any pack with content for a plugin writes it. [`upgradePack`](/docs/reference/content#upgradepack) runs the plugin's steps from that version up to the plugin's own and records where it got to. A pack that records no version for a plugin is read as written for its `schema`, or for the plugin's own version if that's lower, and at least version 1, so for a pack written today nothing runs. The first-party plugins number their content versions by the engine's schema: each one's content version is the schema at which its content last changed.

```ts
import { SCHEMA, type Pack } from '@ifloom/engine'

export const doubleStamps: Pack = { id: 'mod:double-stamps', schema: SCHEMA, plugins: { loyalty: 2 } }
```

For each schema the pack is behind, `upgradePack` runs every plugin's steps keyed by that schema or below, in the order of the game's `plugins`, then the engine's own step from that schema. Each plugin's remaining steps run after that. A step keyed by a schema therefore meets the pack as the engine had it at that schema, and a plugin that numbers its versions from 1 has its steps run early in an old pack.

[`loadGame`](/docs/reference/content#loadgame) upgrades every pack it's given with the game's plugins, including installed [mods](/docs/reference/mods), which the store keeps as their files wrote them. A new version of a plugin with a content step therefore carries every installed mod forward the next time the game loads.

## ContentStep

One step of `contentMigrations`, which gets the whole pack as the version it upgrades from wrote it, and returns the pack as the next version writes it. Its type is in [`ContentStep`](/docs/api/engine-plugin#contentstep).

A step changes only the plugin's own `data`, calls, strings and traits, and returns a new pack, never changing the one it was given. It rewrites only the old shape and leaves anything else as it was, so a step that meets a pack whose version is a guess does no harm. The [`ContentTools`](#contenttools) it gets rewrite a pack without walking it by hand.

```ts
import type { ContentStep } from '@ifloom/engine/plugin'

// Version 2 renamed each card's `stamps` to `stampsToFill`.
export const step: ContentStep = (pack, tools) =>
  tools.entries(pack, 'loyalty/cards', ({ stamps, ...card }) => (stamps === undefined ? card : { ...card, stampsToFill: stamps }))
```

## RawPack

A pack as it came in, in some version's shape, so its fields are `unknown` until a step checks them, apart from its `schema`. Its type is in [`RawPack`](/docs/api/engine#rawpack), from `@ifloom/engine`.

```ts fragment
{ schema: 30, data: { loyalty: { cards: [{ id: 'cafe', stamps: 5 }] } } }
```

## ContentTools

The functions a [`ContentStep`](#contentstep) gets to rewrite a pack, each returning a new pack. Every member is in [`ContentTools`](/docs/api/engine-plugin#contenttools).

| Field | Meaning |
|---|---|
| `objects` | The function that rewrites every object the pack's content holds, from the innermost out. It skips `prose`, `strings`, `variants` and `custom`, which hold words and code. |
| `calls` | The function that rewrites every call by name, however it's written, as a [`RawCall`](#rawcall). The rewrite gets every key with a `/` in it, so it checks the name, and a call given back as it came stays as it was. It skips the same keys as `objects`. A value, `{ value: 'loyalty/stamps', with }`, isn't a call, so `objects` reaches it. |
| `words` | The function that rewrites every line of the pack's `prose` and `strings`, with its key, for a token such as `{{loyalty/stamps}}` that changed. |
| `prose` | The function that returns a line of prose by key as written, the pack's own or else the game's under it, or `undefined` if neither has it. It serves a step that writes in place words that were a prose key. |
| `effects` | The function that rewrites every effect the pack holds, in plugin `data` and traits too, into the keyed form, so one written with `kind` becomes `{ stat, by }` and the rest. |
| `wordKeys` | The function that renames every key of the pack's [`words` table](/docs/reference/words), keeping the words, for a step that renames a field the table names. |
| `entries` | The function that rewrites each entry of one list of the plugin's `data`, named `<plugin>/<list>`, so `'loyalty/cards'` is `data.loyalty.cards`. A pack without the list comes back as it is. |

```ts fragment
tools.wordKeys(pack, (key) => key.replace(/^loyalty\/cards\.(.+)\.title$/, 'loyalty/cards.$1.name'))
```

## RawCall

A call as the `calls` tool gives it to a rewrite: its full name, its arguments as written, and its [`CallForm`](#callform). Every field is in [`RawCall`](/docs/api/engine-plugin#rawcall).

The rewrite returns the call's name and arguments, `{ name, with }`.

```ts fragment
{ name: 'loyalty/stamp', with: { count: 2 }, form: 'short' }
```

## CallForm

How a call was written in the pack. Its type is in [`CallForm`](/docs/api/engine-plugin#callform).

| Key | Meaning |
|---|---|
| `short` | The short form, `{ 'loyalty/stamp': { by: 1 } }`. |
| `long` | The long form, `{ custom: 'loyalty/stamp', with }` or `{ kind: 'custom', name, with }`. |
| `command` | A command, `{ type: 'custom', name, with }`. |

## commandVersion and commandMigrations

`commandVersion` is the version of the plugin's commands' arguments, and `commandMigrations` holds one [`CommandStep`](#commandstep) per version, which [`replay`](/docs/reference/runner#replay) runs on an older log's commands. Their types are the `commandVersion` and `commandMigrations` fields of [`Plugin`](/docs/api/engine-plugin#plugin).

`commandVersion` is 1 if left out. A [`CommandLog`](/docs/reference/runner#commandlog) records each plugin's `commandVersion`, and `replay` runs only the steps from there. A log that records no version for a plugin is read as the oldest, so every step runs on it. A command's arguments in content, such as a button's `command`, are content too, so a change to a command needs both a content step for packs and a command step for logs.

```ts
import { definePlugin } from '@ifloom/engine/plugin'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

export const loyalty = definePlugin<{ stamps: number }>({
  id: 'loyalty',
  version: 1,
  start: () => ({ stamps: 0 }),
  commandVersion: 2,
  commandMigrations: {
    // Version 1's redeem named the card `card`.
    1: (command) => {
      if (command.type !== 'custom' || command.name !== 'loyalty/redeem' || !isRecord(command.with)) return command
      const { card, ...rest } = command.with
      return { ...command, with: { ...rest, id: card } }
    },
  },
})
```

## CommandStep

One step of `commandMigrations`, which gets every command in an older log, the engine's and other plugins' too, and returns it as the next version writes it. Its type is in [`CommandStep`](/docs/api/engine-plugin#commandstep).

A step checks the command's `type` and `name`, and gives back as they came the commands that aren't the plugin's.

```ts
import type { CommandStep } from '@ifloom/engine/plugin'

export const step: CommandStep = (command) => (command.type === 'custom' && command.name === 'loyalty/stamp' ? { ...command, name: 'loyalty/add' } : command)
```

## RawCommand

A command as an older log wrote it, whose `type` is the only field known, so a step checks the rest before reading it. Its type is in [`RawCommand`](/docs/api/engine-plugin#rawcommand).

```ts fragment
{ type: 'custom', name: 'loyalty/redeem', with: { card: 'cafe' } }
```

## Checks

| Problem | Cause |
|---|---|
| `written for version 3 of the loyalty plugin's content, this game's reads 2` | A pack records a newer content version for the plugin than the game has, so `loadGame` skips the pack. |

## Strings

The engine's [saves strings](/docs/reference/strings#saves) word a save that a plugin's state can't be carried forward from, and a game can reword them:

| Key | Meaning |
|---|---|
| `pluginNewer` | The reason for a save made with a newer version of a plugin, `That save was made with a newer version of <id>.` |
| `pluginUnreadable` | The reason for a save whose plugin state needs a step that's missing, `That save's <id> is from a version this game cannot read.` |

## Caveats

- Every change to the shape of a plugin's state needs a version bump and a step, or the game refuses older saves with `pluginUnreadable`.
- A content step can run on a pack whose version is a guess, so it rewrites only the old shape.
- A command step gets every command in the log, not only the plugin's own.
