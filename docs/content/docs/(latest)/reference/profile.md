---
title: "The profile"
description: "The profile keeps what outlives a save, such as the player's settings, a finished game and achievements, for every save on a device."
---
The profile holds what outlives a save: the player's settings, whether they've finished the game, and what plugins keep across games, such as achievements. Every save of a game on one device shares it, and a new game still sees it. [State, commands and the view](/docs/explanation/state-and-commands#the-runner-adds-what-every-ui-wants) explains what the runner keeps beside the state, and [Add a settings page](/docs/how-to/add-a-settings-page) stores the player's settings in it.

In the showcase: `examples/showcase/src/main.tsx`, which makes a profile, gives it to the runner, and reads `core:settings` to set the text size.

```ts
import { profile, type Profile } from '@ifloom/engine'
```

[`browserRunner`](/docs/reference/browser#browserrunner) makes one in `localStorage`, and the runner exposes it as [`runner.profile`](/docs/reference/runner#profile).

## Profile

One game's profile, a JSON object that holds a value for each namespace. Every member is in [`Profile`](/docs/api/engine#profile).

`get(namespace)` answers what a namespace holds, or `undefined`, and `set(namespace, value)` replaces it, with `undefined` clearing it. `update(namespace, change)` calls `change` with what the namespace holds and stores what it returns, with no other write in between, and leaves the namespace alone when `change` returns `undefined` or the same value. `subscribe(listener)` calls the listener with the namespace and its value after every write, and returns the function that stops it.

Reads and writes run one at a time, in the order they're made. The first one reads the stored object, and later reads come from memory. When the driver fails, `get`, `set` and `update` reject with its error, and the profile carries on with the next call. [`runner.profile`](/docs/reference/runner#profile) is the same profile but never rejects, so UI code uses it.

```ts given
import { localStorageDriver } from '@ifloom/browser'
import { profile } from '@ifloom/engine'

const stored = profile(game, localStorageDriver())
await stored.update<Record<string, unknown>>('core:settings', (current) => ({ ...current, textSize: 'large' }))
await stored.get('core:settings') // { textSize: 'large' }
```

A namespace's name says who writes it. The engine's start with `core:`, a UI's with `ui:`, and a plugin's is its bare id. A plugin id can't hold a `:` and can't be `core` or `ui`, so the three never clash. Values are plain JSON.

| Key | Meaning |
|---|---|
| `core:settings` | The player's last value for every [setting](/docs/reference/settings) by id, such as `{ hints: false, textSize: 'large' }`. The runner writes it when a [`setting`](/docs/reference/commands#setting) command takes and on [`setSetting`](/docs/reference/runner#setsetting). |
| `core:finished` | `{ at }`, the time in milliseconds when the content's `finished` condition first held, which the runner writes once. It's unset until then. |
| `ui:gate` | `{ confirmedAt }`, the time the player confirmed the React UI's [gate page](/docs/reference/react/components#gatepage). |
| `ui:sections` | Which of the React UI's folding [sections](/docs/reference/react/components#section) the player left open, by id. |
| a plugin's id | What the plugin keeps, such as earned achievements, which the runner writes from the plugin's [`profile`](/docs/reference/plugin-api#plugin) provider. |

A UI keeps its own records under a `ui:` name, such as `ui:volume` for the volume a music player last used.

## Functions

### profile

Returns the profile for a game, kept in a [driver](/docs/reference/saves#savedriver) at the key `<game id>.profile`. Every parameter is in [`profile`](/docs/api/engine#profile-1).

It reads only the game's `id`, so code opens the profile before the game is built, with `profile({ id: 'small-town' }, driver)`, as the [unlocks plugin](/docs/reference/plugins/unlocks) does to find the content to load. A stored value that isn't valid JSON reads as an empty profile. The profile can share the saves' driver or use another.

```ts given
import { indexedDbDriver } from '@ifloom/browser'
import { profile } from '@ifloom/engine'

const early = profile({ id: game.id }, indexedDbDriver())
const finished = await early.get<{ at: number }>('core:finished')
```

## Checks

The [content checker](/docs/reference/checks) reports a plugin whose id is `core` or `ui`, or starts with `core:` or `ui:`, since its profile namespace would clash with the engine's or a UI's.

## Caveats

- Nothing in the game state reads the profile, so conditions and effects can't see it and a replay always gives the same game. A plugin's view reads its own namespace when a runner builds it, which changes what's rendered but never the state.
- A new game copies the stored `play` settings into its state when it starts, through [`startingState`](/docs/reference/commands#startingstate)'s `settings`, so changing `core:settings` later changes only the next game.
- Clearing the browser's storage clears the profile with the saves.
