---
title: "The profile"
description: "The player's profile: settings, a finished flag and other records kept outside any save, in namespaces."
---
The profile holds what should outlive a save: the player's settings, whether they've finished the game, and whatever plugins keep across games, such as achievements. A new game, or a different save, still sees it.

```ts
import { localStorageDriver } from '@ifloom/browser'
import { profile, type Profile } from '@ifloom/engine'

const stored = profile(game, localStorageDriver())
await stored.set('core:settings', { hints: false, textSize: 'large' })
await stored.get('core:settings') // { hints: false, textSize: 'large' }
```

[`browserRunner`](/docs/browser#browserrunner) makes one for you in `localStorage`, and the runner exposes it as `runner.profile`.

## profile

```ts
function profile(game: Pick<Game, 'id'>, driver: SaveDriver): Profile
```

Makes the profile for a game, kept wherever the [driver](/docs/reference/saves#drivers) keeps things. It's one JSON object, stored at the key `<game id>.profile`, holding a value for each namespace. Use the same driver as your saves or a different one.

Only the game's `id` is read, so you can open the profile before the game is built, with `profile({ id: 'small-town' }, driver)`. The [unlocks plugin](/docs/plugins/unlocks) does this to find the supporter content to load.

Reads and writes run one at a time, in the order you make them. The first one reads the stored object, and later reads come from memory. A stored value that isn't valid JSON is treated as an empty profile.

## Profile

```ts
type Profile = {
  get: <T = unknown>(namespace: string) => Promise<T | undefined>
  set: (namespace: string, value: unknown) => Promise<void>
  update: <T = unknown>(namespace: string, change: (current: T | undefined) => T | undefined) => Promise<T | undefined>
  subscribe: (listener: (namespace: string, value: unknown) => void) => () => void
}
```

| Member | What it does |
|---|---|
| `get(namespace)` | What the namespace holds, or `undefined`. |
| `set(namespace, value)` | Stores a value in the namespace, replacing what was there. `undefined` clears it. |
| `update(namespace, change)` | Calls `change` with what the namespace holds now and stores what it returns, with no other write in between. Returning `undefined` or the same value leaves it alone. Resolves to what it holds afterwards. |
| `subscribe(listener)` | Calls `listener(namespace, value)` after every write. Returns a function that stops it. |

Use `update` whenever the new value depends on the old one, so two writes at once don't lose each other:

```ts
await stored.update<Record<string, unknown>>('core:settings', (current) => ({ ...current, textSize: 'large' }))
```

## Namespaces

Values must be plain JSON. A namespace's name says who owns it: the engine's start with `core:`, a UI's with `ui:`, and a plugin's is its bare id. A plugin id can't hold a `:` and can't be `core` or `ui`, so the three never clash. The [content checker](/docs/reference/checks) reports a plugin that tries.

| Namespace | What it holds | Written by |
|---|---|---|
| `core:settings` | The player's last value for every [setting](/docs/reference/settings), play and ui alike, by id: `{ hints: false, textSize: 'large' }`. | The runner, when a [`setting`](/docs/reference/commands#setting) command takes and on [`setSetting`](/docs/reference/runner#setsetting). |
| `core:finished` | `{ at }`, when the game was first [finished](/docs/reference/state#new-game), in milliseconds. Unset until then. | The runner, the first time the content's `finished` holds. |
| `ui:gate` | `{ confirmedAt }`, when the player confirmed the React UI's [gate](/docs/react/components#gatepage). | The React UI. |
| `ui:sections` | `{ [id]: open }`, which of the React UI's folding [sections](/docs/react/components#section) the player left open or folded. | The React UI. |
| a plugin's id | Whatever the plugin keeps, such as earned achievements. | The runner, from the plugin's [`profile`](/docs/reference/plugins#the-profile). |

Your own UI code can keep its own things under a `ui:` name, such as `ui:volume` for the volume a music player last used.

A profile stored before the prefixes had `settings`, `finished` and `gate`. The first read moves them to the new names and writes the profile back, once.

**Gotchas.**
- The profile is shared by every save of the game on that device. Clearing the browser's storage clears it with the saves.
- Nothing in the game state reads the profile. Conditions and effects can't see it, so a replay always gives the same game. A plugin's view can read its own namespace when a runner builds it (see [the plugin's profile](/docs/reference/plugins#the-profile)), which changes what's drawn but never the state. A new game copies the stored play settings into its state when it starts, through [`startingState`](/docs/reference/commands#startingstate)'s `settings`.

## See it in an example

Small Town: [`examples/showcase/src/main.tsx`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/main.tsx) makes a profile with `profile(game, driver)`, gives it to the runner, and reads the `core:settings` namespace with `get` and `subscribe` to apply the text size.
