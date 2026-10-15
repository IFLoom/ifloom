# The profile

The profile holds what should outlive a save: the player's settings, whether they've finished the game, and whatever plugins keep across games, such as achievements. A new game, or a different save, still sees it.

```ts
import { profile, localStorageDriver, type Profile } from '@ifloom/engine'

const stored = profile(game, localStorageDriver())
await stored.set('settings', { hints: false, textSize: 'large' })
await stored.get('settings') // { hints: false, textSize: 'large' }
```

[`browserRunner`](/reference/runner#browserrunner) makes one for you in `localStorage`, and the runner exposes it as `runner.profile`.

## profile

```ts
function profile(game: Game, driver: SaveDriver): Profile
```

Makes the profile for a game, kept wherever the [driver](/reference/saves#drivers) keeps things. It's one JSON object, stored at the key `<game id>.profile`, holding a value for each namespace. Use the same driver as your saves or a different one.

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
await stored.update<Record<string, unknown>>('settings', (current) => ({ ...current, textSize: 'large' }))
```

## Namespaces

Values must be plain JSON. The engine uses two namespaces itself, and each plugin can have one named after its id.

| Namespace | What it holds | Written by |
|---|---|---|
| `settings` | The player's last value for every [setting](/reference/settings), play and ui alike, by id: `{ hints: false, textSize: 'large' }`. | The runner, when a [`setting`](/reference/commands#setting) command takes and on [`setUiSetting`](/reference/runner#setuisetting). |
| `finished` | `{ at }`, when the game was first [finished](/reference/state#new-game), in milliseconds. Unset until then. | The runner, the first time `game.finished` holds. |
| a plugin's id | Whatever the plugin keeps, such as earned achievements. | The runner, from the plugin's [`profile.onCommand`](/reference/plugins#the-profile). |

Your own UI code can use any other name for its own things, such as the volume a music player last used.

**Gotchas.**
- The profile is shared by every save of the game on that device. Clearing the browser's storage clears it with the saves.
- Nothing in the game state reads the profile. Conditions, effects and views can't see it, so a replay always gives the same game. A new game copies the stored play settings into its state when it starts, through [`startingState`](/reference/commands#startingstate)'s `settings`.
