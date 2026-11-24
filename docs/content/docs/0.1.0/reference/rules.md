---
title: "Rules and hooks"
description: "The game's own code, GameRules, which the engine runs as the first plugin, with its state, commands, turn hooks and migrations."
---
`rules` is the game's own code, a [`GameRules`](#gamerules) you pass on the base to [`loadGame`](/docs/0.1.0/reference/content#loadgame), beside the plugins. The engine calls its functions in place of knowing about your game, and content calls its conditions, effects, macros and values by name with `game/` in front. [Content, packs and the base](/docs/0.1.0/explanation/content-and-packs#rules-are-the-games-code) explains why the game's code is a plugin, and [Run code at the end of a turn](/docs/0.1.0/how-to/run-code-at-the-end-of-a-turn) writes a turn hook.

In the showcase: `examples/showcase/src/rules.ts`, whose `onTurn` puts energy back to 100.

```ts
import type { GameRules } from '@ifloom/engine'
import type { TurnContext } from '@ifloom/engine/plugin'
```

## GameRules

The game's own code, a plain object with the members a plugin has. Every member is in [`GameRules`](/docs/0.1.0/api/engine#gamerules).

The engine runs it as the first plugin, with the id `game`, so no plugin can take that id. Its providers answer before every plugin's, its hooks run before theirs, and each function gets the same [`PluginContext`](/docs/0.1.0/reference/plugin-api#plugincontext) a plugin's does. Every member is optional, and each means what a plugin's member of that name means, except `migrations`. A plugin's id, versions, content, strings, declared calls and data lists are the game's own content, so `GameRules` leaves them out. Content's [`locks`](/docs/0.1.0/reference/locks) and [`resets`](#resets) are data, so a mod can change them.

| Field | Meaning |
|---|---|
| `conditions`, `macros`, `effects`, `values` | The functions content calls by name with `game/` in front, described in [Calls by name](/docs/0.1.0/reference/custom). |
| `guard`, `price`, `label`, `scene`, `actions`, `action`, `statModifiers`, `audio`, `view`, `profile`, `queries`, `traits`, `references`, `check`, `onCommand` | The same members as a plugin's, described in the [Plugin API](/docs/0.1.0/reference/plugin-api). The game's view is at `view.plugins.game`. |

Each hook returns a new state and never changes the one it's given. A game whose `onTurn` puts energy back to full overnight, and whose prose prints the cat's name, has these rules:

```ts
import type { GameRules } from '@ifloom/engine'

export const rules: GameRules = {
  onTurn: (state, { apply }) => apply([{ stat: 'energy', to: 100 }]),
  values: { catName: (state) => (typeof state.kv.catName === 'string' ? state.kv.catName : 'The cat') },
}
```

### start

Returns the game's own state in a new game, kept in saves at `state.plugins.game`. Every function in `rules` reads it as `context.slice` and writes it with `context.set`, and `GameRules<S>` names its type.

```ts
import type { GameRules } from '@ifloom/engine'

type Diary = { entries: string[] }

export const rules: GameRules<Diary> = {
  start: () => ({ entries: [] }),
  commands: {
    write: { run: (state, args, { slice, set }) => set({ entries: [...slice.entries, String(args.text ?? '')] }) },
  },
  view: (_state, { slice }) => ({ entries: slice.entries.length }),
}
```

The game's own state holds what isn't a stat, a kv key or an entity, such as a history the game's code builds up. A save made before the game had a `start` loads with it fresh.

### commands

The game's own commands by name, each a [`PluginCommand`](/docs/0.1.0/reference/plugin-api#plugincommand) as a plugin's is. A choice or an action sends one as `{ 'game/nap': true }`, and the runner's log keeps it as `{ type: 'custom', name: 'game/nap' }`.

`run` returns the next state, and `whyNot` returns the refusal in the player's words, or `undefined`. `effectsOf` lists the effects it would apply, for guards, prices and [locks](/docs/0.1.0/reference/locks), and `spends` lists the stats it spends, for its button's price. `ignoresLocks` runs it through any lock, for tools outside the story. The engine calls `run` and `whyNot` more than once for one command, so both must be pure.

```ts
import type { ActionDef, GameRules } from '@ifloom/engine'

export const rules: GameRules = {
  commands: {
    nap: {
      whyNot: (state) => ((state.stats.energy ?? 0) >= 80 ? 'You are not tired.' : undefined),
      effectsOf: () => [{ stat: 'energy', by: 20 }],
      run: (state, _args, { apply }) => apply([{ stat: 'energy', by: 20 }]),
    },
  },
}

export const nap: ActionDef = { id: 'nap', label: 'Take a nap', command: { 'game/nap': true } }
```

A command of the game's own can't take over one of the engine's, such as `leave`. A lock or a `guard` refuses those.

### onTurn

A hook that runs at the end of each turn and returns the next state. It gets a [`TurnContext`](#turncontext), whose `before` is the state the turn ended on.

A turn ends each time a [`turn`](/docs/0.1.0/reference/effects#turn) effect applies, from a choice, an action or a plugin such as the [calendar](/docs/0.1.0/reference/plugins/calendar). The engine then runs these steps in order:

1. The turn counter goes up by one, and the engine writes content's [`resets`](#resets) into the kv store.
2. The game's `onTurn` runs.
3. Each plugin's `onTurn` runs, in the order `game.plugins` lists them. The calendar moves its clock on here.
4. The game's [`onTurnDone`](#onturndone) runs.
5. Each plugin's `onTurnDone` runs, in the same order.

Each hook gets the state the one before it returned, and all of them get the same `before`. `state.turn` is the turn that's beginning. `before` is from before the counter moved and `resets` were written, so `before.kv.hadCoffee` still holds what it held that day. Without `onTurn`, ending a turn changes no stat.

```ts
import type { GameRules } from '@ifloom/engine'

export const rules: GameRules = {
  onTurn: (state, { apply, before }) =>
    apply([
      { stat: 'energy', to: before.kv.lateCoffee ? 80 : 100 },
      { kv: 'lateCoffee', to: false },
    ]),
}
```

`apply` with no `on` applies to the state the hook was handed. A hook that has changed the state itself passes that state as `on`.

### onTurnDone

A hook that runs at the end of each turn after every plugin's `onTurn`, so the state it's handed has the calendar's new day and any [status](/docs/0.1.0/reference/plugins/statuses) that has just worn off. It gets the same `TurnContext` as `onTurn`. Without it, nothing happens.

```ts
import type { GameRules } from '@ifloom/engine'

export const rules: GameRules = {
  onTurnDone: (state, { apply, query }) => (query('calendar/now')?.period === 'morning' ? apply([{ kv: 'marketStocked', to: true }]) : state),
}
```

### onStat

A hook that runs after every [`stat`](/docs/0.1.0/reference/effects#stat) effect on one of the player's stats, with the state before and after it. It returns `before` to veto the change, `after` to let it stand, or `after` with changes of its own made through `context.apply`. Each plugin's `onStat` runs after it, on what it returned.

`after` is already held to the stat's range. With `by`, its `by` is the effect's own, even when the range cut it short, and with `to` it's the change the effect made. It isn't called for an entity's stat or when an action's `cost` is paid. Without it, the change stands.

```ts
import type { GameRules } from '@ifloom/engine'

export const rules: GameRules = {
  onStat: (before, after, stat) => (stat === 'charm' && (before.stats.energy ?? 0) < 10 ? before : after),
}
```

### saveName

Returns the name a save is listed under, or `undefined` for none. Each save records it as [`SaveMeta.playerName`](/docs/0.1.0/reference/saves#savemeta), and a spoken line under `@you` or `@player` shows it.

A plugin can have a `saveName` too, and the first that answers names the save, the game's before any plugin's. With none, every save's `playerName` is `null`. The engine keeps no player name of its own, so a game keeps one in the kv store, written by an [input](/docs/0.1.0/reference/inputs).

```ts
import type { GameRules } from '@ifloom/engine'

export const rules: GameRules = {
  saveName: (state) => (typeof state.kv.playerName === 'string' ? state.kv.playerName : undefined),
}
```

### migrations

Steps that carry a save from one version of the game to the next, keyed by the version each upgrades from, so step 1 takes a version-1 save to version 2. The version is the base's `version`. Each step gets the whole state and the [`MigrationTools`](/docs/0.1.0/api/engine#migrationtools), and returns the next state.

They run when an older save loads, after the engine's and the plugins' own steps. A plugin's `migrations` carry only its own state, so this is the one member that means something else on the game. [Saves](/docs/0.1.0/reference/saves) describes how a save loads.

```ts
import type { GameRules } from '@ifloom/engine'

export const rules: GameRules = {
  migrations: { 1: (state) => ({ ...state, kv: { ...state.kv, catName: state.kv.catName ?? 'Biscuit' } }) },
}
```

## TurnContext

The context every `onTurn` and `onTurnDone` hook gets, the game's and each plugin's, with `before` added. Every field is in [`TurnContext`](/docs/0.1.0/api/engine-plugin#turncontext).

`before` is the state the turn ended on. Its `apply` ends no turn, so a `turn` effect applied through it does nothing. Its other fields are the [`PluginContext`](/docs/0.1.0/reference/plugin-api#plugincontext)'s, with the game's own state as `slice` and the seeded `roll` that [`CustomContext`](/docs/0.1.0/reference/custom#customcontext) describes.

```ts
import type { GameState } from '@ifloom/engine'
import type { TurnContext } from '@ifloom/engine/plugin'

export const hadCoffee = (_state: GameState, { before }: TurnContext) => before.kv.hadCoffee === true
```

## resets

A content key that lists the kv keys the engine puts back at the end of each turn, with the value each goes back to. It's content, not a member of `rules`, so a mod can add a key, and a pack's keys replace content's key by key.

The engine writes them into `state.kv` as the counter moves on, before `onTurn`. Without `resets`, no key goes back. A once-a-turn key is the usual entry.

```ts
import type { Content } from '@ifloom/engine'

export const actions: Content = {
  resets: { hadCoffee: false, postedToday: false },
}
```

## Caveats

- A `turn` effect applied in `onTurn` or `onTurnDone` does nothing, so a turn's hooks can never end another turn.
- The content checker can't look inside a function, so a stat, scene or call that `onTurn` names with a typo isn't reported.
- The game's `onTurn` runs before the calendar moves its clock, so it reads the day that's ending. `onTurnDone` reads the new one.
