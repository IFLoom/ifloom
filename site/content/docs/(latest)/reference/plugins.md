---
title: "Writing a plugin"
description: "Writing a plugin: state, conditions, effects, commands, hooks, queries, guards, prices, buttons, view, checks and tests."
---
A plugin adds a whole system to the engine, such as a loyalty card, a quest list or a phone. It keeps its own state in the save, and brings the conditions, effects, commands, prose values, hooks and view that work on that state. Content calls these by name, the same way it [calls the game's own](/docs/reference/custom) (`game/…`), so packs and mods can use a plugin without shipping any code.

You choose a game's plugins when you build it, in [`game.plugins`](/docs/reference/game#game). Nothing is loaded while the game runs. The first-party plugins are separate packages, listed under [First-party plugins](/docs/plugins).

Do you need a plugin, or only the game's own [`rules`](/docs/reference/rules)? `rules` can have what a plugin has (conditions, effects, values, commands, hooks, a guard, a view), for this one game, and keeps its memory in the kv store. Write a plugin when the system needs a memory of its own, state that has to be saved and carried forward when its shape changes, or when more than one game should use it.

A plugin can live in your game's own source, as the loyalty card below does, or in [a package of its own](#a-plugin-package) that any game can install. Plugins written by others are on [Community plugins](/docs/plugins/community), which also says how to get yours listed.

## A plugin package

A plugin you mean to publish lives in its own folder and repository. Start one from the `plugin` template:

```sh tab="npm" tab-group="package-manager"
npm create ifloom@latest ifloom-plugin-loyalty -- --template plugin
cd ifloom-plugin-loyalty
npm install
npm test
```

```sh tab="pnpm" tab-group="package-manager"
pnpm create ifloom ifloom-plugin-loyalty --template plugin
cd ifloom-plugin-loyalty
pnpm install
pnpm test
```

```sh tab="yarn" tab-group="package-manager"
yarn create ifloom ifloom-plugin-loyalty --template plugin
cd ifloom-plugin-loyalty
yarn install
yarn run test
```

```sh tab="bun" tab-group="package-manager"
bun create ifloom ifloom-plugin-loyalty --template plugin
cd ifloom-plugin-loyalty
bun install
bun run test
```

That makes the plugin `loyalty` with a condition, an effect, a command and a view, a Vitest test, a complete `tsconfig.json` and a README. [A plugin package](/docs/cli#a-plugin-package) lists what's in it. The engine is a caret peer dependency, so a game brings its own copy, and a dev dependency for the tests.

The scripts are `test`, `typecheck` and `build`. `build` compiles `src/` into `dist/` with [tsdown](https://tsdown.dev), as JavaScript with type declarations like IFLoom's own packages, and `npm publish` runs it first.

## Your first plugin

This plugin keeps a loyalty card at the café. Each coffee adds a stamp, and five stamps fill the card.

```ts
// loyalty.ts
import { definePlugin } from '@ifloom/engine'

type Card = { stamps: number }

export const loyalty = definePlugin<Card>({
  id: 'loyalty',
  version: 1,
  start: () => ({ stamps: 0 }),
  effects: {
    stamp: (_state, _args, { slice, set }) => set({ stamps: slice.stamps + 1 }),
  },
  conditions: {
    full: (_state, _args, { slice }) => slice.stamps >= 5,
  },
  values: {
    stamps: (_state, _args, { slice }) => slice.stamps,
  },
})
```

Each function gets the game state, what content passed it, and a [context](#plugincontext). `slice` is the plugin's own state, and `set` returns the game state with that state replaced.

List the plugin in the game's `plugins`, then call it from content with `loyalty/` in front of each name:

```ts
import { loadGame, type Content } from '@ifloom/engine'
import { loyalty } from './loyalty.ts'

const cafe: Content = {
  stats: [{ id: 'energy', label: 'Energy', start: 50 }],
  actions: [
    // Each coffee gives energy and a stamp.
    { id: 'coffee', label: 'Buy a coffee', effects: [{ stat: 'energy', by: 15 }, { 'loyalty/stamp': true }] },
    { id: 'counter', label: 'Go to the counter', command: { type: 'scene', id: 'counter' } },
  ],
  scenes: [
    {
      id: 'counter',
      body: [{ prose: 'counter' }],
      choices: [
        // Only offered once the card is full.
        { id: 'free-coffee', label: 'Claim a free coffee', when: { 'loyalty/full': true }, effects: [{ scene: null }] },
        { id: 'leave', label: 'Not today', effects: [{ scene: null }] },
      ],
    },
  ],
  prose: {
    counter: 'Your card has {{v:loyalty/stamps}} stamps.',
  },
}

const { game } = loadGame([cafe], {
  id: 'corner-cafe',
  title: 'The Corner Café',
  plugins: [loyalty],
})
```

After five coffees, `loyalty.read(state, game)` is `{ stamps: 5 }`, the counter says `Your card has 5 stamps.`, and Claim a free coffee is on offer.

That's a working plugin. The engine saves its state with the game, and the [content checker](/docs/reference/checks) reports a call to a name the plugin doesn't have, such as `content · action coffee · no plugin effect named "loyalty/stomp"`. To have a typo caught as you type rather than when the game loads, declare what each call takes, as [Typed calls, queries and views](#typed-calls-queries-and-views) shows. The rest of this page builds on the same card: a command the player can press, a migration for when the state changes shape, and the hooks, guards and view a bigger system needs.

## A worked example

The full card also counts free coffees, and lets the player redeem one at the café. Its state gained a field, so its version goes up to 2 with a migration for saves made with version 1.

```ts
import { applyEffects, definePlugin, stringOf } from '@ifloom/engine'

type Card = { stamps: number; free: number }

export const loyalty = definePlugin<Card>({
  id: 'loyalty',
  version: 2,
  start: () => ({ stamps: 0, free: 0 }),
  migrations: {
    // Version 1 only counted stamps.
    1: (old) => ({ stamps: (old as { stamps: number }).stamps, free: 0 }),
  },
  conditions: {
    stamps: (_state, args, { slice }) => slice.stamps >= Number(args.atLeast ?? 1),
    hasFree: (_state, _args, { slice }) => slice.free > 0,
  },
  effects: {
    stamp: (_state, _args, { slice, set }) =>
      slice.stamps === 4 ? set({ stamps: 0, free: slice.free + 1 }) : set({ ...slice, stamps: slice.stamps + 1 }),
  },
  strings: {
    notFull: 'Your card is not full yet.',
    onlyAtCafe: 'Only at the café.',
  },
  commands: {
    redeem: {
      whyNot: (_state, _args, { slice, game, query }) => {
        if (slice.free === 0) return stringOf(game, 'loyalty/notFull')
        // Where the player is, asked of the places plugin by name.
        if (query('places/here') !== 'cafe') return stringOf(game, 'loyalty/onlyAtCafe')
        return undefined
      },
      run: (state, _args, { slice, set, game }) =>
        set({ ...slice, free: slice.free - 1 }, applyEffects(state, game, [{ stat: 'energy', by: 15 }])),
    },
  },
  values: {
    stamps: (_state, _args, { slice }) => slice.stamps,
  },
  view: (_state, { slice }) => ({ stamps: slice.stamps, free: slice.free }),
})
```

A button sends the command, here as one of the café's actions in the places plugin's content:

```ts
{ id: 'redeem', label: 'Redeem a free coffee', command: { 'loyalty/redeem': true } }
```

Five coffees later:

```ts
import { apply, holds, view, whyNot } from '@ifloom/engine'

loyalty.read(state, game)                                       // { stamps: 0, free: 1 }
holds(state, game, { 'loyalty/hasFree': true })               // true
whyNot(state, game, { type: 'custom', name: 'loyalty/redeem' }) // undefined: it can be done
view(state, game).plugins.loyalty                               // { stamps: 0, free: 1 }

const out = apply(state, game, { type: 'custom', name: 'loyalty/redeem' })
view(out.state, game).plugins.loyalty                           // { stamps: 0, free: 0 }
```

On a new game the same command is refused with `Your card is not full yet.`, and the view greys out its button with the same line. A game that wants different wording gives `strings: { 'loyalty/notFull': 'Five stamps first.' }`. See [Strings](/docs/reference/strings#plugins-strings).

## Plugin

```ts
import {
  definePlugin, pluginQuery, speakerOf,
  type Plugin, type DefinedPlugin, type PluginContext, type PluginArgs,
  type PluginCommand, type PluginEntry, type PluginProblem, type PluginSlice,
  type Asked, type Refusal, type RoomScene, type SpeakerView, type CheckTools,
  type PluginReferences, type ContentReferences, type StatModifier,
  type TraitDef, type TraitTools, type ContentStep, type ContentTools, type WordShape,
  type CommandStep, type RawPack, type RawCommand,
  type ConditionRegistry, type EffectRegistry, type CommandRegistry, type QueryRegistry, type ViewRegistry,
  type ConditionCall, type EffectCall, type CommandCall, type Query, type ViewsIn,
} from '@ifloom/engine'

type Plugin<S = any, V = unknown> = {
  id: string
  version: number
  start?: (game: Game) => S
  migrations?: Record<number, (state: unknown, tools: MigrationTools) => unknown>
  contentVersion?: number
  contentMigrations?: Record<number, ContentStep>
  commandVersion?: number
  commandMigrations?: Record<number, CommandStep>
  conditions?: Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => boolean>
  effects?: Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => GameState>
  commands?: Record<string, PluginCommand<S>>
  strings?: Record<string, string>
  queries?: Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => unknown>
  cooperates?: string[]
  statModifiers?: (state: GameState, context: PluginContext<S>) => readonly StatModifier[] | undefined
  values?: Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => string | number>
  onTurn?: (state: GameState, context: PluginContext<S>) => GameState
  onTurnDone?: (state: GameState, context: PluginContext<S>) => GameState
  onStat?: (before: GameState, after: GameState, stat: string, by: number, context: PluginContext<S>) => GameState
  onCommand?: (before: GameState, after: GameState, context: PluginContext<S>) => GameState
  guard?: (state: GameState, asked: Asked, context: PluginContext<S>) => Refusal | undefined
  price?: (state: GameState, effects: readonly Effect[], context: PluginContext<S>) => string[] | undefined
  label?: (state: GameState, context: PluginContext<S>) => string | undefined
  scene?: (state: GameState, context: PluginContext<S>) => RoomScene | undefined
  actions?: (state: GameState, context: PluginContext<S>) => readonly ActionDef[] | undefined
  action?: (state: GameState, id: string, context: PluginContext<S>) => ActionDef | undefined
  content?: Content
  traits?: readonly TraitDef[]
  words?: Readonly<Record<string, WordShape>>
  callWords?: Readonly<Record<string, WordShape>>
  audio?: (state: GameState, context: PluginContext<S>) => Record<string, string | null> | undefined
  view?: (state: GameState, context: PluginContext<S>) => V
  profile?: (state: GameState, previous: GameState, stored: unknown, context: PluginContext<S>) => unknown
  references?: PluginReferences
  check?: (game: Game, tools: CheckTools) => PluginProblem[]
}
```

`S` is the shape of the plugin's own state. Every field but `id` and `version` is optional. Every one is flat: there's no table of hooks and no table under `profile`.

| Field | What it is |
|---|---|
| `id` | Its name, and the prefix on everything it adds: `loyalty` gives `loyalty/stamp`. Letters, digits and `-` only, and never `game`, which is the game's own [`rules`](/docs/reference/rules). The [content checker](/docs/reference/checks) reports any other id, and two plugins with the same one. |
| `version` | The version of its state's shape. Bump it when the shape changes, and add a step to `migrations`. Saves record it. |
| `start` | Its state in a new game. A plugin with no state leaves this out. |
| `migrations` | One step per version, keyed by the version it upgrades from. See [State and migrations](#state-and-migrations). |
| `contentVersion` | The version of what content and packs write for it: its `data`, its calls' arguments, its strings and its traits. 1 if left out. Packs record it. See [Content and command migrations](#content-and-command-migrations). |
| `contentMigrations` | One step per content version, keyed by the version it upgrades from, which [`upgradePack`](/docs/reference/loader#upgradepack) runs on every pack the game loads. |
| `commandVersion` | The version of its commands' arguments. 1 if left out. [Command logs](/docs/reference/runner#commandlog) record it. |
| `commandMigrations` | One step per command version, which [`replay`](/docs/reference/runner#replay) runs on an older log's commands. |
| `conditions` | Tests that content can use anywhere a [condition](/docs/reference/conditions#calls) goes, by name without the prefix. |
| `effects` | Changes that content can make in a choice's, an action's or a trigger's effects. Each takes the game state and returns the next one. |
| `commands` | Commands a button can send. See [`PluginCommand`](#plugincommand). |
| `strings` | The plugin's player-facing lines in English, by name without the prefix, such as `{ notFull: 'Your card is not full yet.' }`. The plugin says one with [`stringOf(game, 'loyalty/notFull')`](/docs/reference/strings#stringof), and a game rewords it as `strings: { 'loyalty/notFull': '…' }`. See [Plugins' strings](/docs/reference/strings#plugins-strings). |
| `queries` | Answers other plugins can ask for by name, with their context's `query`. See [Queries](#queries). |
| `cooperates` | Ids of plugins it works with when the game has them. Content may name their conditions, effects and commands in a game without them. See [Cooperates](#cooperates). |
| `statModifiers` | Changes to what the player's stats read right now, such as a timed boost to energy. Nothing is written into the state. See [Stat modifiers](#stat-modifiers). |
| `values` | Words and numbers that prose prints with `{{v:loyalty/stamps}}`, and a badge or a stat's ceiling reads as `{ value: 'loyalty/stamps', with }`. Asked with arguments, as a condition is. |
| `onTurn` | A hook: runs at the end of each turn. See [Hooks and providers](#hooks-and-providers). |
| `onTurnDone` | A hook: runs at the end of each turn, once every plugin's `onTurn` and the game's `rules.onTurnDone` have run. See [Hooks and providers](#hooks-and-providers). |
| `onStat` | A hook: runs when one of the player's stats has just changed, and can let it stand, undo it or add to it. See [Hooks and providers](#hooks-and-providers). |
| `onCommand` | A hook: runs after every command that took. See [Hooks and providers](#hooks-and-providers). |
| `guard` | Whether a command may go ahead, given the effects it would apply. Returns a refusal, a warning or `undefined`. See [Guards](#guards). |
| `price` | What a button costs that the engine can't say, in the plugin's words. See [Prices](#prices). |
| `label` | Where the game is, in a few words, for [`view.when`](/docs/reference/view#the-clock-and-the-player). See [Labels](#labels). |
| `scene` | What the screen shows while no scene is open: a title and prose blocks. See [Scene](#scene). |
| `actions` | Actions offered as buttons while no scene is open, before the content's `actions`. See [Actions](#actions). |
| `action` | One of its actions that isn't among its `actions` right now, by id, for `{ type: 'action', id: '<plugin>/<id>' }`. See [Actions](#actions). |
| `content` | [Content](/docs/reference/loader#content) the plugin brings, such as its kinds of entity, merged under the game's. See [Kinds and entities](#kinds-and-entities). |
| `traits` | [Traits](/docs/reference/entities#traits) the plugin gives meaning to: named data that entities carry. See [Traits](#traits). |
| `words` | Which fields of each list of its `data` are words a player reads, for a translation's words table. See [Words](#words). |
| `callWords` | Which arguments of its effects are words a player reads. See [Words](#words). |
| `audio` | What plays on background audio channels, such as a place's ambience. See [Audio](#audio). |
| `view` | What the UI needs from the plugin, at [`view.plugins[id]`](/docs/reference/view#plugins). See [The view](#the-view). |
| `profile` | What the plugin keeps in the player's [profile](/docs/reference/profile), which outlives saves and new games. See [The profile](#the-profile). |
| `references` | What its calls, its panels and its content name, for the [content checker](/docs/reference/checks) to resolve, and any rule of its own about a call's arguments. See [References](#references). |
| `check` | Rules of its own about its content, checked with the rest of the game. See [check](#check). |

## PluginContext

```ts
type PluginContext<S> = CustomContext & {
  slice: S
  set: (next: S, on?: GameState) => GameState
  apply: (effects: readonly EffectRef[], on?: GameState) => GameState
  picks?: Record<string, string>
  beats: (blocks: readonly Block[], id: string) => SceneBeat[]
  profile?: unknown
}
```

Every plugin function gets this alongside the game state. It has everything one of the game's own [functions](/docs/reference/custom#customcontext) gets, and more:

- `game` is the game.
- `value(name, args?)` reads a [value](/docs/reference/custom#values) by name, a plugin's or the game's own, about the state the function was handed.
- `roll(max, name)` draws a whole number from 0 to `max - 1`, from the save's seed, the turn and `name`.
- `slice` is the plugin's own state, typed. If the save has none yet, it's `start(game)`, or `undefined` for a plugin with no `start`.
- `set(next, on?)` returns a game state with the plugin's state replaced by `next`. It writes onto `on`, which defaults to the state the function was handed.
- `query(name, args?)` asks another plugin's [query](#queries) by its full name, about the state the function was handed. It returns `undefined` when the game doesn't have that plugin or that query. `args` is `{}` when left out.
- `apply(effects, on?)` applies a list of [effects](/docs/reference/effects) as content would, and returns the next state. See [Applying effects](#applying-effects).
- `picks` is only there in [`view`](#the-view). It's where the view's new pool picks go, for the reducer to record. See [The view](#the-view).
- `beats(blocks, id)` draws [blocks](/docs/reference/scenes#block) as [beats](/docs/reference/prose#scenebeat), as a scene's body is drawn. See [beats](#beats).
- `profile` is only there in `view`, and only when a [runner](/docs/reference/runner#the-view-cache) with a profile builds it. It's what the plugin's own namespace in the [profile](/docs/reference/profile) holds, frozen so you can't change it, or `undefined` while nothing is stored. See [The profile](#the-profile).

**Gotcha.** Without `on`, `set` builds on the state the function was handed, not on one you've changed since. When a command or effect changes other parts of the game state too, make those changes first and pass the result as `on`. The `redeem` command above does this with [`applyEffects`](/docs/reference/effects#applyeffects):

```ts
// Wrong: the kv key is lost, because set builds on `state`.
const moved = { ...state, kv: { ...state.kv, stamped: true } }
return set({ ...slice, stamps: slice.stamps + 1 })

// Right.
const moved = { ...state, kv: { ...state.kv, stamped: true } }
return set({ ...slice, stamps: slice.stamps + 1 }, moved)
```

`slice` is still the plugin's state as it was in the state handed in. `on` only changes where the new state is written.

## PluginArgs

```ts
type PluginArgs = Record<string, unknown>
```

What content passes in `with`, unchecked. It's `{}` when `with` is left out. Read it defensively, for example `Number(args.atLeast ?? 1)` or `String(args.quest ?? '')`, because content is data and a mod can pass anything. To have the names it passes checked when the game loads, give the plugin [`references`](#references), with a `{ problem }` among them for a rule of its own.

## PluginCommand

```ts
type PluginCommand<S = any> = {
  ignoresLocks?: boolean
  whyNot?: (state: GameState, args: PluginArgs, context: PluginContext<S>) => string | undefined
  run: (state: GameState, args: PluginArgs, context: PluginContext<S>) => GameState
  effectsOf?: (state: GameState, args: PluginArgs, context: PluginContext<S>) => Effect[]
  spends?: (state: GameState, args: PluginArgs, context: PluginContext<S>) => Record<string, number> | undefined
}
```

A command a button can send as `{ type: 'custom', name: 'loyalty/redeem', with: {...} }`.

| Field | What it is |
|---|---|
| `ignoresLocks` | Run even while a [lock](/docs/reference/locks) would stop it. Off by default. See [Commands outside the story](#commands-outside-the-story). |
| `whyNot` | Why it can't be done right now, written for the player, or `undefined` if it can. |
| `run` | Returns the next state. It's only called once nothing has refused. |
| `effectsOf` | The effects running it would apply, worked out before it runs, for [guards](#guards), [prices](#prices) and [locks by effect](/docs/reference/locks#lock) to see. None if left out. See [Saying what a command does](#saying-what-a-command-does). |
| `spends` | The stats it spends, by id, such as `{ coins: 4 }`, for its button's price. A button that sends it lists them in its [`price`](/docs/reference/view#renderedchoice), written through each stat's `format`, as an action's cost is. It only labels the button: `run` does the spending and `whyNot` refuses when there isn't enough. None if left out. |

The engine's [`whyNot`](/docs/reference/actions#whynot) asks these in order, and the first answer wins:

1. The [locks](/docs/reference/locks), as for every command, unless the command sets `ignoresLocks`.
2. The game's own [`rules.guard`](/docs/reference/rules#gamerules), then every plugin's [guard](#guards), unless the command sets `ignoresLocks`.
3. `There is no such thing to do.` (the [`noSuchAction`](/docs/reference/strings#refusals) string) if no plugin, nor the game's [`rules.commands`](/docs/reference/rules#commands), has a command by that name.
4. The command's own `whyNot`.

The reducer refuses with that reason, and the view greys out the button with it. Put the line in the plugin's [`strings`](/docs/reference/strings#plugins-strings) and return `stringOf(game, 'loyalty/notFull')`, so a game can reword it.

**Gotchas.**
- A command without `whyNot` can always be done, apart from locks and guards.
- A [lock](/docs/reference/locks) can stop one plugin command by its full name (`deny: ['loyalty/redeem']`), all of a plugin's commands (`deny: ['loyalty/*']`), or every plugin's (`deny: ['custom']`). `'*'` stops them too, like everything else.

### Commands outside the story

`ignoresLocks: true` takes a command out of the [locks](/docs/reference/locks). No lock stops it, whatever its `deny` says, and the view never greys out its button for one. No plugin's [guard](#guards) is asked about it either. Everything else still applies: the command's own `whyNot` still refuses, and `run` goes through [`apply`](/docs/reference/commands#apply) as usual, with triggers and every plugin's `onCommand` hook.

It's for tools that stand outside the story and must work at any point in it. The [debug plugin](/docs/plugins/debug), for example, sets a stat by hand in the middle of an intro that only moves through its scenes. Never use it for something the player does in the story. A lock is how a game says "not now", and a player command that slips past it breaks the order the story is told in.

```ts
commands: {
  // A tool for the person testing the game, not a move the player makes.
  refill: {
    ignoresLocks: true,
    run: (_state, _args, { slice, set }) => set({ ...slice, free: slice.free + 1 }),
  },
}
```

[`lockOn`](/docs/reference/locks#lockon) doesn't look at `ignoresLocks`, so it still says which lock matches the command. Only `whyNot`, and so the reducer and the view, lets it through.

## Naming

Content calls a plugin by its full name: the plugin's id, a `/`, and the name in the plugin's table. It's the same form content uses for the game's own code, with `game` in front (`{ 'game/tired': true }`), so a pack author only learns one.

| Kind | Content writes |
|---|---|
| condition | `{ 'loyalty/stamps': { atLeast: 3 } }` |
| effect | `{ 'loyalty/stamp': true }`, in a data scene choice's, an action's or a trigger's effects |
| command | `{ 'loyalty/redeem': {...} }`, or written out, `{ type: 'custom', name: 'loyalty/redeem', with: {...} }`, on an [`ActionDef`](/docs/reference/actions#actiondef)'s or a choice's `command`: a place's action, one of the content's actions or a plugin's [action](#actions) |
| value | `{{v:loyalty/stamps}}` in prose, `{{v:loyalty/stamps card=gold}}` with arguments, or `{ value: 'loyalty/stamps', with: { card: 'gold' } }` as a badge or a stat's ceiling |

The short form has the plugin's full name as its only key, and the call's arguments as an object as the value, or `true` for none. See [`PluginCall`](/docs/reference/custom#plugincall).

A name with a `/` is a call: the part before it is a plugin's id, or `game` for the game's own [`rules`](/docs/reference/rules). A name with no `/` calls nothing, and the checker reports it.

A plugin usually gives small typed helpers that write these objects for authors who work in code, as properties of its factory named after the calls they write, such as the quests plugin's [`quests.done`](/docs/plugins/quests#helpers). Put them on the factory with `Object.assign(questsPlugin, { done, ... })`, so `quests()` still makes the plugin and the helpers' names never clash with another plugin's or the engine's.

**Gotchas.**
- A value name in prose is letters, digits, `_` and `-` after the `/`, so `{{v:loyalty/stamps-left}}` prints. Its arguments follow as `key=value`. Anything else isn't a token and is left on screen as written.
- Don't put an id in a value's name, such as `loyalty/stamps-gold`. Take it as an argument, so one value serves every card and a mod's new card needs no code.
- A name nobody has fails quietly in play. A condition is false, an effect does nothing, a value is left on screen, and a command is refused with `There is no such thing to do.` The [content checker](/docs/reference/checks) reports most of them when the game loads.

## Typed calls, queries and views

A plugin can say what each of its calls takes, what its queries answer and what its view holds, so content written in code is checked as it's typed. Declare them in the plugin's main entry by adding to the engine's registries, the way a plugin types its [traits](#traits):

```ts
import { definePlugin, type DefinedPlugin } from '@ifloom/engine'

export type LoyaltyView = { stamps: number; free: number }

declare module '@ifloom/engine' {
  interface ConditionRegistry {
    'loyalty/stamps': { gte?: number }
  }
  interface EffectRegistry {
    'loyalty/stamp': { by?: number } | true
  }
  interface CommandRegistry {
    'loyalty/redeem': { card: string }
  }
  interface QueryRegistry {
    'loyalty/stampsLeft': () => number
  }
  interface ViewRegistry {
    loyalty: LoyaltyView
  }
}
```

Each registry is keyed by the call's full name, and each entry is what content writes as the call's value: its arguments, or `true` for none, or both as a union when the arguments are all optional. A query's entry is a function from its arguments to its answer. `ViewRegistry` is keyed by the plugin's id.

Once a game imports the plugin's package, those calls are checked wherever a [`Condition`](/docs/reference/conditions#condition), an [`Effect`](/docs/reference/effects#effect) or a [`CommandRef`](/docs/reference/custom#commandref) goes:

```ts
const full: Condition = { 'loyalty/stamps': { gte: 5 } }
const typo: Condition = { 'loyalty/stamps': { gtee: 5 } }   // fails to compile
const left = context.query('loyalty/stampsLeft')           // number | undefined
const card = view.plugins.loyalty                          // LoyaltyView | undefined
```

A call whose name nobody declares takes any arguments, as a [`PluginCall`](/docs/reference/custom#plugincall), so a plugin that declares nothing still compiles, and so does content naming a partner the game doesn't have. A query nobody declares answers whatever type you name, `query<number>('loyalty/stampsLeft')`. Every first-party plugin declares all of its calls, queries and its view.

### The game's own calls

The game's own code is called the same way, with `game` in front, and the game can declare its calls in the same registries. Put the declarations beside [`rules`](/docs/reference/rules), in `src/rules.ts`:

```ts
import type { GameRules } from '@ifloom/engine'

declare module '@ifloom/engine' {
  interface EffectRegistry {
    'game/payRent': { by?: number } | true
  }
  interface ConditionRegistry {
    'game/tired': true
  }
}

export const rules: GameRules = {
  conditions: { tired: (state) => (state.stats.energy ?? 0) < 20 },
  effects: { payRent: (_state, args) => [{ stat: 'coins', by: -Number(args.by ?? 10) }] },
}
```

Small Town declares its `game/postLatest` this way, and the café its `game/takings` and `game/wages`.

**Gotchas.**
- The registries type content written in TypeScript. A pack loaded from JSON, or a mod, isn't compiled, so the [content checker](/docs/reference/checks) is still what reports a bad call there, through the plugin's [`references`](#references).
- A plugin's own functions still get their arguments as [`PluginArgs`](#pluginargs), since a mod can pass them anything. Read each one as you would unchecked data.
- A plugin sees only the declarations of the packages it imports. It can't rely on a partner's, since it never imports the partner, so its calls to a partner are loose in its own code and checked in a game that has both.
- Keep each entry true to what the plugin reads. A game that imports the plugin is checked against it, so a field you forget to declare fails to compile there.

### ConditionCall, EffectCall and CommandCall

```ts
type ConditionCall = CallIn<ConditionRegistry>
type EffectCall = CallIn<EffectRegistry>
type CommandCall = CallIn<CommandRegistry>
```

A call in short, checked against its registry when its name is declared there, and loose otherwise. [`Condition`](/docs/reference/conditions#condition) and [`Effect`](/docs/reference/effects#effect) end in a `ConditionCall` and an `EffectCall`, and a [`CommandRef`](/docs/reference/custom#commandref) is a command or a `CommandCall`. The registries themselves are the interfaces `ConditionRegistry`, `EffectRegistry`, `CommandRegistry`, `QueryRegistry` and `ViewRegistry`, empty in the engine, which knows no plugin.

### Query

```ts
type Query = {
  <K extends keyof QueryRegistry>(name: K, ...args: QueryArgs<K>): QueryAnswer<K> | undefined
  <T = unknown>(name: string, args?: PluginArgs): T | undefined
}
```

What a context's `query` is: a declared query takes its arguments and answers its type, and any other name answers the type you give it.

### ViewsIn

```ts
type ViewsIn = { readonly [K in keyof ViewRegistry]?: ViewRegistry[K] } & Readonly<Record<string, unknown>>
```

The type of [`view.plugins`](/docs/reference/view#plugins): each plugin's slice typed as it declares it in `ViewRegistry`, and `unknown` for a plugin that doesn't.

## Queries

```ts
queries?: Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => unknown>
```

Answers another plugin can ask for by full name, without importing this one. Use a query for what a condition's yes or no can't say, such as a place, a time or a list. The asker calls its context's `query`, and the answer is worked out with this plugin's own context, so it reads its own `slice`.

```ts
// The loyalty plugin answers how many stamps are left to fill the card.
queries: {
  stampsLeft: (_state, _args, { slice }) => 5 - slice.stamps,
},

// A café-menu plugin asks, and does without when the game has no loyalty card.
view: (_state, { query }) => ({
  footer: query<number>('loyalty/stampsLeft') ?? null,
}),
```

The asker names the answer's type, since it doesn't import the loyalty plugin. Code that does import it, such as the game's, gets the type the plugin [declares](#typed-calls-queries-and-views).

**Gotchas.**
- `query` returns `undefined` when the game lacks the plugin or the query, so always give a fallback. Name the partner in [`cooperates`](#cooperates) if content should be able to call its conditions and effects too.
- Content can't call a query. There's no condition, effect or prose form, so it's for plugin code only.

### pluginQuery

```ts
import { pluginQuery } from '@ifloom/engine'

function pluginQuery(game: Game | undefined, name: string): ((state: GameState, args?: PluginArgs) => unknown) | undefined
```

A plugin's query by its full name, for code outside any plugin, such as a tool, a test or the [CLI](/docs/cli). It returns a function to ask it with, which runs with the owning plugin's own context for that state. It returns `undefined` when the game lacks the plugin or the query. `args` is `{}` if left out. A plugin's own code uses its context's `query` instead.

```ts
// Is it late enough for bed? Only a game with the calendar can say.
const bedtime = pluginQuery(game, 'calendar/bedtime')?.(state) ?? false
```

**Gotcha.** The answer is `unknown`. Cast it to what the plugin documents, and check it's there first, as `?.` does above.

## Cooperates

```ts
cooperates?: string[]
```

The ids of plugins this one works with when the game has them. Content written for this plugin may then name those plugins' conditions, effects and commands, in full or [in short](/docs/reference/custom#plugincall), even in a game without them. The [content checker](/docs/reference/checks#absent-partners) doesn't report them, and in play the condition is false, the effect does nothing and the command is refused.

```ts
export const loyalty = definePlugin<Card>({
  id: 'loyalty',
  version: 2,
  // Works with a calendar when there is one: content can gate double stamps on `calendar/weekend`.
  cooperates: ['calendar'],
  // ...
})
```

**Gotchas.**
- It only covers plugins the game doesn't have. In a game that has the partner, a name the partner doesn't declare is reported as usual.
- A plugin nobody lists in `cooperates` is still reported, as `no plugin condition named "calendar/weekend"; the game has no plugin "calendar"`.
- It covers a condition, an effect and a command. See [Absent partners](/docs/reference/checks#absent-partners).
- A value in prose from an absent partner is left on screen.

## Effects run in order

A plugin's effect is a real step in its list, written as content writes it, `{ 'loyalty/stamp': true }`. When the list applies, each plugin effect runs on the state the effects before it left, so two stamps in one list give two stamps.

One of the game's own [effects](/docs/reference/custom#effects) runs in order the same way. Its function is called in its turn, with the state the effects before it left:

```ts
effects: [
  { 'loyalty/stamp': true },
  { 'game/countStamps': true }, // the game's own: sees the card with the stamp on it
]
```

Inside an action, every effect runs after its command and its cost and after every effect before it.

## State and migrations

```ts
type PluginSlice = { version: number; state: unknown }
```

Each plugin's state lives in [`state.plugins`](/docs/reference/state#plugins), keyed by plugin id, along with the version of its shape. For the card, `state.plugins.loyalty` is `{ version: 2, state: { stamps: 0, free: 0 } }`. [`startingState`](/docs/reference/commands#startingstate) fills it from each plugin's `start`. Like the rest of the [state](/docs/reference/state), it must be plain JSON.

When the shape changes, bump `version` and add a step keyed by the version it upgrades from. The engine's own [saves](/docs/reference/saves#loadstate) follow the same rule. A step gets the plugin's old state and the same [`MigrationTools`](/docs/reference/saves#migrationtools) a game's own migration gets, and returns the plugin's new state.

```ts
version: 2,
migrations: {
  1: (old) => ({ stamps: (old as { stamps: number }).stamps, free: 0 }),
},
```

`tools.fill()` gives the whole game state with what the game declares and the save lacks filled in, for a step that needs to read the game: a stat's start value, say.

### When a save loads

[`loadState`](/docs/reference/saves#loadstate) brings every plugin's state up to the version the game has. It runs after the engine's own steps and before the game's [migrations](/docs/reference/saves#the-games-own-migrations):

- A plugin added since the save was made starts fresh from `start`.
- An older state is carried forward one step at a time.
- The state of a plugin the game no longer has is kept as it is, unused.

A save it can't carry forward is refused with one of these reasons:

| Returns | When |
|---|---|
| `That save was made with a newer version of <id>.` | The saved version is higher than the plugin's. |
| `That save's <id> is from a version this game cannot read.` | A step on the way is missing. |

Both are the engine's [`pluginNewer` and `pluginUnreadable`](/docs/reference/strings#saves) strings, so a game can reword them. The [save store](/docs/reference/saves#saves), the runner and [`replay`](/docs/reference/runner#replay) all load through `loadState`, so a plugin never sees a state it couldn't read.

## Content and command migrations

What content writes for a plugin can change shape too: a call's argument is renamed, an entry in its `data` gains a field, a string gets a new key. A pack written for the old shape (a mod a player installed, say) should still load, and a [command log](/docs/reference/runner#commandlog) from before the change should still replay. A plugin carries both forward itself, the way it carries its saved state.

Say version 1 of the card's `loyalty/stamp` effect took `{ count }`, and version 2 takes `{ by }` as the [naming rule](#naming) asks, while `loyalty/redeem` took the card as `{ card }` and now takes `{ id }`:

```ts
import { definePlugin, type RawPack } from '@ifloom/engine'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

export const loyalty = definePlugin<Card>({
  id: 'loyalty',
  version: 2,
  // ...
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

Bump `contentVersion` when what content writes for the plugin changes, and add the step keyed by the version it upgrades from. Do the same with `commandVersion` and `commandMigrations` when a command or its arguments change. A command's arguments in content (a button's `command`) are content, so a change to a command usually needs both: the content step for packs, and the command step for logs. A version with no step changed nothing, so the steps can have gaps.

Write each step so it rewrites only the old shape and leaves anything else as it was. A step is run once per pack, but a pack that doesn't say which version it was written for is read as a guess (see below), and a careful step makes that guess harmless.

### Which version a pack was written for

A pack records the version of each plugin's content it was written for in [`plugins`](/docs/reference/loader#pack), beside its `schema`:

```ts
import { SCHEMA, type Pack } from '@ifloom/engine'

const pack: Pack = { id: 'mod:double-stamps', schema: SCHEMA, plugins: { loyalty: 2 }, /* ... */ }
```

Write it in any pack that has content for your plugin, and ask the people making mods for your game to do the same. [`upgradePack`](/docs/reference/loader#upgradepack) runs the plugin's steps from that version up to the plugin's own, and records where it got to.

A pack that doesn't record a version for a plugin is read as written for its `schema`, or for the plugin's own version if that's lower, and at least version 1. For a pack written today without a record, that's the plugin's current version, so nothing runs. The first-party plugins number their content versions by the engine's schema, because the engine used to carry their content forward itself: the shop's content is at version 13 because it last changed when the engine went from schema 12 to 13. So a pack from before packs recorded versions lines up with their steps.

A pack written for a newer version of a plugin than the game has is refused, as one for a newer engine is: `loadGame` skips it with the problem `written for version 3 of the loyalty plugin's content, this game's reads 2`.

### When a pack loads

`upgradePack` takes the game's plugins and runs, for each schema the pack is behind:

1. every plugin's steps keyed by that schema or below, in the order of the game's `plugins`;
2. then the engine's own step from that schema.

Then each plugin's remaining steps run. A plugin's step for schema 12 therefore meets the pack as the engine had it at schema 12, which is what the first-party plugins' history needs. A plugin that numbers its versions from 1 has its steps run early in an old pack, and then on its way.

[`loadGame`](/docs/reference/loader#loadgame) upgrades every pack it's given with the game's plugins, and that includes installed [mods](/docs/reference/mods), which the store keeps as their files wrote them. So when you release a new version of a plugin with a content step, every mod your players have installed is carried forward the next time the game loads.

### ContentStep

```ts
type RawPack = Record<string, unknown> & { schema: number }
type ContentStep = (pack: RawPack, tools: ContentTools) => RawPack
```

A step is given the whole pack, as the version it upgrades from wrote it, and returns the pack as the next version writes it. It usually changes only the plugin's own `data`, calls, strings and traits. A `RawPack` is some version's shape, not necessarily this engine's, so its fields are `unknown` until you check them. Return a new pack and never change the one you were given.

### ContentTools

```ts
type ContentTools = {
  objects: (pack: RawPack, rewrite: (value: Record<string, unknown>) => Record<string, unknown>) => RawPack
  calls: (pack: RawPack, rewrite: (call: { name: string; with: unknown; form: 'short' | 'long' | 'command' }) => { name: string; with: unknown }) => RawPack
  words: (pack: RawPack, rewrite: (text: string, key: string) => string) => RawPack
  effects: (pack: RawPack) => RawPack
  wordKeys: (pack: RawPack, rename: (key: string) => string) => RawPack
  entries: (pack: RawPack, list: string, rewrite: (entry: Record<string, unknown>) => Record<string, unknown>) => RawPack
  prose: (key: string) => string | undefined
}
```

Ways to rewrite a pack without walking it by hand. Each returns a new pack.

| Tool | What it rewrites |
|---|---|
| `objects` | Every object the pack's content holds, from the innermost out. It skips `prose`, `strings`, `variants` and `custom`, which hold words and code. |
| `calls` | Every call by name, however it's written. `short` is `{ 'loyalty/stamp': { by: 1 } }`, and it is handed every key with a `/` in it, so check the name. `long` is a form packs wrote before schema 18 and 21, `{ custom: 'loyalty/stamp', with }` or `{ kind: 'custom', name, with }`. `command` is `{ type: 'custom', name, with }`. Return the call's name and arguments; give a call back as it came and it stays as it was. It skips the same keys as `objects`. A value, `{ value: 'loyalty/stamps', with }`, isn't a call: reach it with `objects`. |
| `words` | Every line of the pack's `prose` and `strings`, handed with its key, for a token such as <code v-pre>{{v:loyalty/stamps}}</code> that changed. |
| `prose` | A line of prose by key, as written: the pack's own, else the game's under it (its content's and the packs' loaded before it). `undefined` if neither has it. For a step that writes words in place that were a prose key, as the messages plugin's step to version 25 gives a reply the words of its old `<message>#<reply>` prose. |
| `effects` | Every effect the pack holds, in plugin `data` and traits too, in the keyed form: one still written with `kind`, as before schema 21, becomes `{ stat, by }` and the rest. For a plugin whose content holds effects where the engine's own step can't see them, as the first-party plugins' steps to version 21 do. |
| `wordKeys` | Every key of the pack's [`words` table](/docs/reference/words), renamed, the words kept: for a step that renames a field the table names, as the quests plugin's step to version 26 makes `quests/quests.settle.title` `quests/quests.settle.name`. |
| `entries` | Each entry of one list of the plugin's `data`, named `<plugin>/<list>`: `'loyalty/cards'` is `data.loyalty.cards`. A pack without the list comes back as it is. |

### CommandStep

```ts
type RawCommand = Record<string, unknown> & { type: string }
type CommandStep = (command: RawCommand) => RawCommand
```

A step of `commandMigrations` is given every command in an older log, the engine's and other plugins' too, so check the `type` and `name` and give back the ones that aren't yours as they came. A log records each plugin's `commandVersion` (see [`CommandLog`](/docs/reference/runner#commandlog)), and [`replay`](/docs/reference/runner#replay) runs only the steps from there. A log from before logs kept versions is read as the oldest, so every step runs on it.

## Hooks and providers

A plugin's members follow one naming rule, as the game's [rules](/docs/reference/rules) do:

- **A hook** runs at an event and returns the next state. It's named `on` and the event: `onTurn`, `onTurnDone`, `onStat`, `onCommand`.
- **A provider** answers a question and never changes the state. It's named by the noun it gives: `guard`, `price`, `label`, `scene`, `actions`, `action`, `audio`, `statModifiers`, `view`, `profile`.
- **A table** of named functions content calls is a plural noun: `conditions`, `effects`, `commands`, `queries`, `values`.
- **Data** is named by its noun too: `content`, `traits`, `strings`.

Nothing is nested, so every hook sits beside the rest of the plugin.

| Hook | When |
|---|---|
| `onTurn(state, context)` | At the end of each turn, after the game's own [`rules.onTurn`](/docs/reference/rules#onturn) and before its [`rules.onTurnDone`](/docs/reference/rules#onturndone). A turn ends on each [`turn`](/docs/reference/effects#turn) effect, including those the [calendar](/docs/plugins/calendar#what-a-turn-is)'s `calendar/pass` and `calendar.sleep()` apply. See [The end of a turn](/docs/reference/rules#the-end-of-a-turn). |
| `onTurnDone(state, context)` | At the end of each turn, last: after every plugin's `onTurn` and the game's `rules.onTurnDone`. It sees what every `onTurn` did, such as the calendar's new day. |
| `onStat(before, after, stat, by, context)` | After a [`stat`](/docs/reference/effects#stat) effect on one of the player's stats, once the game's own [`rules.onStat`](/docs/reference/rules#onstat) has had its say. Return `before` to undo the change, `after` to let it stand, or `after` with more. `by` is as `rules.onStat` gets it. It isn't called for an entity's stat or an action's cost. |
| `onCommand(before, after, context)` | After every command that took. `before` is the state the command started from, and the context belongs to `after`. |

Those are the only hooks. Plugins' hooks run in the order `game.plugins` lists them, and each gets the state the one before it left. To notice the player moving, use `onCommand` and ask `places/here`, as the example below does.

Within one command, the order is:

1. The command runs, including the end of any turn it causes (the game's `rules.onTurn`, each plugin's `onTurn`, the game's `rules.onTurnDone`, then each plugin's `onTurnDone`).
2. The game's [triggers](/docs/reference/triggers) fire.
3. The scene left on screen is counted as [seen](/docs/reference/state#seen), its [minigame](/docs/reference/minigames) starts if it has one, and its sounds get [keys of their own](/docs/reference/audio#sounds-and-voices).
4. The game's `rules.onCommand`, then each plugin's `onCommand`, runs. Triggers don't see what it changes until the next command.
5. A stat that went up a level raises its [notice](/docs/reference/stats#the-notice), so a level a hook's reward reached is noticed too.
6. The engine records the [pool picks](/docs/reference/media#remembered-picks) and background audio the new screen shows.

The full list, with the checks before a command runs, is in [What happens, in order](/docs/reference/commands#what-happens-in-order).

A plugin that keeps a diary of the player's days might use both:

```ts
import { definePlugin } from '@ifloom/engine'

type Diary = { days: number; places: string[]; commands: number }

export const diary = definePlugin<Diary>({
  id: 'diary',
  version: 1,
  start: () => ({ days: 0, places: [], commands: 0 }),
  onTurn: (_state, { slice, set }) => set({ ...slice, days: slice.days + 1 }),
  onCommand: (_before, _after, { slice, set, query }) => {
    // Where the player is now, if the game has the places plugin.
    const here = query<string | null>('places/here') ?? null
    const places = here === null || slice.places.includes(here) ? slice.places : [...slice.places, here]
    return set({ ...slice, places, commands: slice.commands + 1 })
  },
})
```

**Gotchas.**
- `onCommand` only runs through [`apply`](/docs/reference/commands#apply), and only when the command took. It doesn't run on `start`, on a refused command, or under [`applyEffects`](/docs/reference/effects#applyeffects). A plugin whose view or conditions must be right on the first frame should work out what it needs from the state, as the [quests plugin](/docs/plugins/quests) does, rather than rely on `onCommand` having run.
- Return the state you were given when nothing changes. Calling `set` with an equal slice still makes a new state object.

## The profile

Some things a plugin tracks should outlive a save, such as achievements the player has earned or endings they've seen. Those go in the player's [profile](/docs/reference/profile), in a namespace named after the plugin's id. A plugin can't write there itself, because its functions are pure and never do I/O. Instead, it declares a `profile` provider, and the [runner](/docs/reference/runner#finished) asks it after every command that takes:

```ts
import { definePlugin } from '@ifloom/engine'

// Remembers every ending the player has reached, across every game they play.
export const endings = definePlugin({
  id: 'endings',
  version: 1,
  profile: (state, previous, stored) => {
    const reached = (stored as string[] | undefined) ?? []
    const scene = state.sceneId
    if (!scene?.startsWith('ending.') || scene === previous.sceneId || reached.includes(scene)) return undefined
    return [...reached, scene]
  },
})
```

It's called with the state after the command, the state before it, what the plugin's namespace holds now (`undefined` if nothing), and the plugin's context. Return the new value to store, or `undefined` to leave it as it is. The runner writes each answer in order, so each call sees the value the one before it stored.

The plugin's view can read its namespace as `context.profile`, so a UI gets everything from the view:

```ts
view: (state, { profile }) => ({ reached: (profile as string[] | undefined) ?? [] }),
```

Only the view sees it, and only when a runner with a profile builds the view. The runner reads each plugin's namespace when it starts and follows every write after that, so `context.profile` is the value last read or written. When it changes, the runner's view becomes a new object, with that plugin's view built again, and the runner's listeners are told. See [The view cache](/docs/reference/runner#the-view-cache). Outside the runner, `view(state, game)` has no profile, and `context.profile` is `undefined`.

**Gotchas.**
- Only a runner with a `profile` asks it. [`apply`](/docs/reference/commands#apply) and [`replay`](/docs/reference/runner#replay) never do, so a replayed log doesn't award anything twice.
- Conditions, effects, commands, hooks and the `profile` provider's own context never see `context.profile`. That's on purpose: a condition that read the profile could hold in one playthrough and not in a replay of it. Anything the story needs to branch on belongs in the plugin's state.
- `context.profile` is frozen. Changing it throws in strict mode, and it would never reach the profile anyway. Return a new value from `profile` instead.
- Right after a runner starts, before the profile has been read, the view has no profile yet. `await runner.settled()` waits for the first read.

## Stat modifiers

A plugin can change what the player's stats read without writing to them. Use it for a boost that wears off, such as a coffee that adds 10 energy for a couple of turns. The plugin keeps what's active in its own state, and `statModifiers` turns that into a list of changes:

```ts
import { definePlugin } from '@ifloom/engine'

// Reading glasses: worn, they add 4 to intelligence.
export const glasses = definePlugin<{ on: boolean }>({
  id: 'glasses',
  version: 1,
  start: () => ({ on: false }),
  effects: { wear: (_state, _args, { set }) => set({ on: true }) },
  statModifiers: (_state, { slice }) => (slice.on ? [{ stat: 'intelligence', add: 4 }] : undefined),
})
```

### StatModifier

```ts
type StatModifier = { stat: string; add?: number; multiply?: number }
```

| Field | What it is |
|---|---|
| `stat` | The id of one of the player's stats. |
| `add` | Added to the value. 0 if left out. |
| `multiply` | What the value is multiplied by, after the adds. 1 if left out. |

The game's own `rules.statModifiers` and every plugin's modifiers are gathered, the game's first, then in the order `game.plugins` lists them. For each stat, the adds are summed, then the total is multiplied by every multiplier, then the result is held to the stat's range. So with a kept value of 5, `{ add: 3 }`, `{ multiply: 2 }` and `{ add: 2, multiply: 1.5 }` read as `(5 + 3 + 2) × 2 × 1.5 = 30`.

Everything that reads a stat sees the changed value: [`statValue`](/docs/reference/stats#statvalue), the `stat` and `level` conditions, a [derived stat](/docs/reference/stats#derived-stats)'s formula, an action's cost check and `view.stats`. A derived stat reads its inputs changed, then has its own modifiers applied.

**Gotchas.**
- Modifiers are never written. A `stat` effect changes the kept value in `state.stats`, underneath. When the plugin stops returning a modifier, the stat reads its kept value again.
- An action's cost is checked against the changed value but paid from the kept one. With 5 energy kept and a boost of 10, a cost of 12 is allowed, and the kept value goes to 0 (held to the range). The boost still adds 10 on top while it lasts.
- Only the player's stats. An entity's stats, read with `of`, are never changed.
- `statModifiers` must not read stats itself, with `statValue` or a `stat` condition, because that read would ask for the modifiers again. Work them out from the plugin's own state.
- A [level](/docs/reference/stats#levels) reached through a modifier raises the level's notice, as one reached through an effect does.

## Guards, prices and labels

Three more fields let a plugin watch every command, not only its own. A guard says whether a command may go ahead, a price adds to what a button says it costs, and a label says where the game is. A guard and a price are both handed the effects the command would apply, worked out before it runs by [`effectsOf`](/docs/reference/actions#effectsof).

As an example, take a sink of dirty dishes in the flat. Cooking and baking add to it, and washing up takes the rest of the turn.

```ts
import { callOf, definePlugin, stringOf, type Effect } from '@ifloom/engine'

type Sink = { dirty: number }

// How many dishes these effects would add.
const added = (effects: readonly Effect[]) =>
  effects.reduce((n, effect) => {
    const call = callOf(effect)
    return call?.name === 'dishes/add' ? n + Number(call.with.by ?? 1) : n
  }, 0)

export const dishes = definePlugin<Sink>({
  id: 'dishes',
  version: 1,
  start: () => ({ dirty: 0 }),
  strings: {
    full: 'Not with the sink this full.',
    piling: 'The dishes would pile up. Wash up first.',
  },
  effects: {
    add: (_state, args, { slice, set }) => set({ dirty: slice.dirty + Number(args.by ?? 1) }),
    // Empty the sink, then end the turn, so the turn's hooks see the clean sink.
    wash: (_state, _args, { set, apply }) => apply([{ turn: true }], set({ dirty: 0 })),
  },
  commands: {
    wash: {
      run: (_state, _args, { apply }) => apply([{ 'dishes/wash': true }]),
      effectsOf: () => [{ 'dishes/wash': true }],
    },
  },
  guard: (_state, { command, effects }, { slice, game }) => {
    if (command.type === 'action' && command.id === 'places/bake' && slice.dirty >= 3) return stringOf(game, 'dishes/full')
    if (slice.dirty + added(effects) > 3) return { reason: stringOf(game, 'dishes/piling'), soft: true }
    return undefined
  },
  price: (_state, effects) => {
    const n = added(effects)
    return n ? [n === 1 ? 'a dish to wash' : `${n} dishes to wash`] : undefined
  },
  label: (_state, { slice }) => (slice.dirty ? `${slice.dirty} in the sink` : undefined),
})
```

The flat offers the buttons, as a location of the [places plugin](/docs/plugins/places#the-location-trait):

```ts
// on the flat, in its places.location({ ... }) in entities
actions: [
  { id: 'cook', label: 'Cook dinner', effects: [{ stat: 'energy', by: 20 }, { 'dishes/add': { by: 2 } }] },
  { id: 'bake', label: 'Bake bread', effects: [{ entity: 'food:loaf', by: 1 }, { 'dishes/add': true }] },
  { id: 'wash', label: 'Wash up', command: { 'dishes/wash': true } },
],
```

Cook dinner and Bake bread carry effects, so they send `{ type: 'action', id: 'places/cook' }` and the like. Wash up only sends its command.

With two dishes in the sink:

```ts
import { apply, view } from '@ifloom/engine'

const screen = view(state, game)
screen.when                                  // 'Your flat · 2 in the sink', with places listed before dishes
const cook = screen.actions.find((a) => a.id === 'cook')!
cook.disabled                                // undefined: it can be pressed
cook.warning                                 // 'The dishes would pile up. Wash up first.'
cook.price                                   // { notes: ['2 dishes to wash'] }
apply(state, game, { type: 'action', id: 'places/cook' }).reason // 'The dishes would pile up. Wash up first.'
```

With three, Bake bread is greyed out with `Not with the sink this full.` Wash up empties the sink and ends the turn.

### Guards

```ts
guard?: (state: GameState, asked: Asked, context: PluginContext<S>) => Refusal | undefined

type Asked = { command: Command; effects: readonly Effect[] }
type Refusal = string | { reason: string; soft: true }
```

Whether a command may go ahead. `asked.command` is the [command](/docs/reference/commands#command), and `asked.effects` is what it would apply, from [`effectsOf`](/docs/reference/actions#effectsof). `state` and the context are the state before the command. Return one of these:

- `undefined` to let it through.
- A string to refuse it, as a [lock](/docs/reference/locks) does. [`whyNot`](/docs/reference/actions#whynot) returns the line, so the view greys the button out with it and the reducer refuses with it.
- `{ reason, soft: true }` for a warning. The button can still be pressed and carries `reason` as its [`warning`](/docs/reference/view#renderedchoice), but the reducer refuses the command with `reason` all the same. The [calendar](/docs/plugins/calendar#the-guard)'s past-dawn warning works this way: the UI shows the warning and offers something else, here washing up.

The game's own `rules.guard`, then every plugin's guard, is asked about every command, in the order `game.plugins` lists them, except a command that sets [`ignoresLocks`](#commands-outside-the-story). Guards are asked after the locks, and before what the command itself needs, such as an action's `blocked` entries and cost. A refusal from any plugin wins over a warning from any plugin, and among warnings the first wins. See [`warningOf`](/docs/reference/actions#warningof).

**Gotchas.**
- `effects` is empty for a built-in command whose effects can't be known before it runs, such as `scene`, `leave` or `input`. Test `command` for those. A plugin command's list is what its [`effectsOf`](#saying-what-a-command-does) says. The calendar's `calendar.sleep()` gives the `calendar/pass` it makes, but not the turns that pass ends.
- Every button shows a guard's refusal and its warning. That includes the game's and plugins' buttons, scene choices (after the choice's own `disabled`), the [cast](/docs/plugins/cast)'s Talk buttons and the [places plugin](/docs/plugins/places#exitview)'s exits.
- An effect applied inside another effect isn't in the list. The turn `dishes/wash` ends isn't there, only `dishes/wash` itself.

### Prices

```ts
price?: (state: GameState, effects: readonly Effect[], context: PluginContext<S>) => string[] | undefined
```

What a button costs that the engine can't say, in the plugin's words, such as `['2 dishes to wash']`. Every plugin's notes go in the button's [`price.notes`](/docs/reference/view#price), in the order `game.plugins` lists them. The engine asks with the effects of each button's command, from [`effectsOf`](/docs/reference/actions#effectsof), and of each scene choice. A button whose effects are empty isn't asked about. A button with notes but no cost gets a price of only `{ notes }`.

**Gotcha.** An action's effects begin with its cost, as a negative `stat` effect for each stat it spends. The engine already shows those in `stats`, so a price shouldn't repeat them.

### Labels

```ts
label?: (state: GameState, context: PluginContext<S>) => string | undefined
```

Where the game is, in a few words for a header or a save, such as `'Day 3 · Wednesday morning'`. Every plugin's label, in the order `game.plugins` lists them and joined with ` · `, makes [`view.when`](/docs/reference/view#the-clock-and-the-player). It's `null` when no plugin gives one. Return `undefined` to say nothing.

### Performance

The engine only works out a command's effects for guards and prices when some plugin in the game has a `guard` or a `price`. A game without one pays nothing for them, apart from a [lock with `effect`](/docs/reference/locks#lock).

## Saying what a command does

```ts
effectsOf?: (state: GameState, args: PluginArgs, context: PluginContext<S>) => Effect[]
```

The engine can't see inside a [`PluginCommand`](#plugincommand)'s `run`, so the command says what it would apply. Guards, prices and [locks with `effect`](/docs/reference/locks#lock) read this list. Without `effectsOf`, the command applies nothing they can see.

```ts
wash: {
  run: (_state, _args, { apply }) => apply([{ 'dishes/wash': true }]),
  effectsOf: () => [{ 'dishes/wash': true }],
},
```

**Gotchas.**
- The list is [`Effect`](/docs/reference/effects)s as content writes them, a plugin's in short: `{ 'dishes/wash': true }`.
- Keep it in step with `run`. Nothing checks that the two agree.

## Applying effects

```ts
apply: (effects: readonly EffectRef[], on?: GameState) => GameState
```

On the [context](#plugincontext), `apply` applies a list of effects as content would and returns the next state. Anything content can write goes in the list: built-in effects, the game's [own](/docs/reference/custom#effects) and plugins' effects (this plugin's own included), [in short](/docs/reference/custom#plugincall). They apply in order, each on the state the one before it left. The list is built from `on`, which defaults to the state the function was handed.

This is how a plugin's effect or command ends a turn. `apply([{ turn: true }])` runs the whole [end of a turn](/docs/reference/rules#the-end-of-a-turn), with the game's `rules.onTurn`, every plugin's `onTurn` hook, the game's `rules.onTurnDone` and every plugin's `onTurnDone`.

```ts
// Empty the sink first, so the turn's hooks see it empty.
wash: (_state, _args, { set, apply }) => apply([{ turn: true }], set({ dirty: 0 })),
```

**Gotchas.**
- As with `set`, without `on` it builds on the state the function was handed, not one you've changed since. Chain them by passing the result as `on`.
- A `turn` effect applied while a turn is already ending does nothing. From an `onTurn` hook, the game's or a plugin's, `apply([{ turn: true }])` leaves the turn as it is.
- It applies effects and nothing more. Triggers and `onCommand` hooks run once the command is done, as they do for any command.

## The view

`view(state, context)` returns whatever the plugin's UI needs, whether that's your own code or a React UI the plugin ships in its `/react` subpath (see [Plugin UIs and the kit](/docs/react/kit)). The engine's [`view()`](/docs/reference/view#plugins) collects each one at `plugins[id]`, and a plugin without `view` has no entry. The engine never looks inside it. Declare its type in [`ViewRegistry`](#typed-calls-queries-and-views) and code that imports your package reads it typed:

```ts
import { view } from '@ifloom/engine'

const card = view(state, game).plugins.loyalty // LoyaltyView | undefined, once the plugin declares it
```

If your view draws pictures from a [pool](/docs/reference/media#pools), pass the context's `picks` to [`pictureView`](/docs/reference/view#pictureview). Words drawn with [`beats`](#beats) record their own. Each new pick is written there, and the reducer records them after the command, so the same picture shows on every visit. The places plugin does this for a room's layered picture:

```ts
view: (state, { game, slice, picks }) => {
  const place = locationOf(state, game, slice.at)
  return { picture: place && slice.at ? pictureView(state, game, place.picture, slice.at, null, picks) : null }
},
```

### beats

```ts
beats: (blocks: readonly Block[], id: string) => SceneBeat[]
```

Your plugin's content can hold words as a scene's [blocks](/docs/reference/scenes#block), as a message's body does. `context.beats` draws them as beats, the way a scene's body is drawn:

- the blocks whose `when` holds, with their words filled in for this save
- variants drawn and pools picked under `id`, so the same block shows the same line or picture on every visit
- spoken lines with their [speakers](/docs/reference/prose#speech)
- bold, italics and [UI pieces](/docs/reference/prose#ui-pieces) as spans, through [`styledBeats`](/docs/reference/prose#styledbeats)

```ts
view: (state, { beats, game }) => ({
  notes: notesOf(game).map((note) => ({ id: note.id, beats: beats(note.body, note.id) })),
}),
```

Inline actions and tooltips stay in the words as written, because only a scene offers choices. In `view`, the pool picks it makes are recorded with the rest.

## Scene

```ts
scene?: (state: GameState, context: PluginContext<S>) => RoomScene | undefined

type RoomScene = {
  title: string
  body?: readonly Block[]
  id?: string
  ui?: Ui<SceneUi>
}
```

What the screen shows while no scene is open, such as a room's description, a shop front or a heading over a dashboard. The view asks the game's own `rules.scene`, then each plugin in the order `game.plugins` lists them, and the first that returns a `RoomScene` fills [`view.scene`](/docs/reference/view#the-scene). `title` becomes the title, and `body` is rendered as a data scene's body would be (its words, lines by key, variants and conditions), with `id: null` and no choices. Return `undefined` to let the next plugin answer.

| Field | What it is |
|---|---|
| `title` | The heading, such as a room's name. |
| `body` | What's written there, as [blocks](/docs/reference/scenes#block). Left out, the body is empty. |
| `id` | The id its blocks are drawn under. A [`variants`](/docs/reference/scenes#block) block rotates per id, so a plugin that shows several places gives each its own id to keep its lines separate. The plugin's id if left out. It's also in the room's [`view.scene.key`](/docs/reference/view#the-scene), `room:<id>`. |
| `ui` | [Presentation hints](/docs/reference/ui-hints) for the room, carried to `view.scene.ui` as a scene's are. Name it in [`references`](#references) as `{ ui }` so the checker sees it's data. |

With no plugin answering, the screen is the game's `title` and an empty body. The [places plugin](/docs/plugins/places#the-room-scene)'s room scene is the room the player is in, with its name and its `body`.

A market stall on the high street fills the screen while it's open:

```ts
import { definePlugin } from '@ifloom/engine'

const stall = definePlugin<{ open: boolean }>({
  id: 'stall',
  version: 1,
  start: () => ({ open: true }),
  commands: { haggle: { run: (state) => state } },
  scene: (_state, { slice }) =>
    slice.open
      ? { id: 'market', title: 'The market stall', body: [{ prose: 'stall.open' }, { variants: 'stall.cries' }] }
      : undefined,
  actions: () => [{ id: 'haggle', label: 'Haggle', command: { 'stall/haggle': true } }],
})

// in your content
prose: { 'stall.open': 'Crates of eggs and a heap of loaves.', 'stall.cries/1': '“Fresh bread!”', 'stall.cries/2': '“Eggs, a dozen!”' },
variants: { 'stall.cries': ['stall.cries/1', 'stall.cries/2'] },
```

```ts
view(state, game).scene
// { id: null, key: 'room:market', title: 'The market stall',
//   body: 'Crates of eggs and a heap of loaves.\n\n“Fresh bread!”', choices: [], ... }

view(stall.write(state, { open: false }), game).scene.title // the next plugin's room scene title, or the game's title
```

**Gotchas.**
- The first answer wins, so a plugin listed earlier in `game.plugins` hides a later one's room scene. Only answer when the room is yours. The stall's is `undefined` once it's packed up.
- A scene with no title of its own takes the room scene's title, then the game's. The stall's scenes are headed The market stall while it's open.
- Only `view.scene` changes. In a game with the [places plugin](/docs/plugins/places) listed after the stall, the stall covers the room's description, but `view.plugins.places` still says where the player is and the exits are still drawn.
- The content checker doesn't see a room scene's blocks, because they're worked out in play. Say what they name in [`references`](#references), as `{ blocks }`.

## Actions

```ts
actions?: (state: GameState, context: PluginContext<S>) => readonly ActionDef[] | undefined
```

Actions the plugin offers as buttons while no scene is open, such as the stall's Haggle. Each is an [`ActionDef`](/docs/reference/actions#actiondef), the same shape as the content's actions, so a button can carry a cost and effects of its own. The view puts the game's own `rules.actions` first, then every plugin's, in the order `game.plugins` lists them, then the content's [`actions`](/docs/reference/actions#actiondef). The [places plugin](/docs/plugins/places#the-buttons)'s are the current location's `actions`. All of them are drawn alike with [`renderAction`](/docs/reference/view#renderaction), which gives each a price, `blocked`, a [guard](#guards)'s warning and [`whyNot`](/docs/reference/actions#whynot)'s reason.

```ts
// The stall above, with an action of the content's to buy bread:
view(state, game).actions.map((action) => action.id) // ['haggle', 'buy']
```

**Gotchas.**
- A button whose `when` doesn't hold is left out, and so is one whose command is stopped by a [lock](/docs/reference/locks) with `hide: true`. Any other lock greys it out with its line, like any button.
- Like the content's actions, they aren't offered while a scene is open or while a lock that stops everything is on ([`lockedOut`](/docs/reference/locks#lockedout)).
- The content checker doesn't see them. Say what they name in [`references`](#references), with [`actionReferences`](/docs/reference/actions#actionreferences).
- A button that only sends a command is that command. One with a cost, effects or `once` sends `{ type: 'action', id: '<plugin>/<id>' }`, and the engine finds it again among the plugin's `actions` in that state, or by asking its [`action`](#action).

### action

```ts
action?: (state: GameState, id: string, context: PluginContext<S>) => ActionDef | undefined
```

One of the plugin's actions by id, for `{ type: 'action', id: '<plugin>/<id>' }`, when it isn't among the plugin's `actions` in this state. The [devices plugin](/docs/plugins/devices) answers this way for an app's buttons, which it draws in the app rather than in the room. Return `undefined` for an id that isn't yours. Without it, only the plugin's current `actions` can be done.

```ts
// An app's button, found by its id whether or not the app is open.
action: (_state, id, { game }) => appActions(game).find((entry) => entry.id === id),
```

## Audio

```ts
audio?: (state: GameState, context: PluginContext<S>) => Record<string, string | null> | undefined
```

What the plugin puts on background [audio channels](/docs/reference/audio#channels), by channel, such as `{ ambience: 'cafe.murmur' }`. Return `undefined` or `{}` to leave every channel alone. The [places plugin](/docs/plugins/places#audio) uses it to play the location's `audio` while the player is there.

```ts
// The stall rings its bell while the market is on.
audio: (state) => (state.kv.marketOpen ? { ambience: 'market.bell' } : undefined),
```

It comes third of [four levels](/docs/reference/audio#what-plays-on-a-background-channel). An open scene's `audio` and an [`audio` effect](/docs/reference/effects#audio) both win over it, and it wins over the game's default. When several plugins name the same channel, the first in `game.plugins` wins. `null` silences a channel, and a channel you leave out goes to the next plugin, then the default.

**Gotchas.**
- The engine asks it on every [`view`](/docs/reference/view) and after every command, so keep it cheap.
- The content checker doesn't see the tracks it names. Say them in [`references`](#references), as `{ channel, track }`.

## Who someone is

A plugin doesn't say who a scene's speaker is. People are [entities](/docs/reference/entities), so the engine reads their name, picture and hints from the entity itself (see [Speakers](/docs/reference/scenes#speakers)). A plugin that brings people gives them as entities, in its [`content`](#kinds-and-entities), and a scene names one as its `speaker`.

A plugin that shows who sent something, as the messages and feed plugins do, asks the same way with [`speakerOf`](#speakerof).

### speakerOf

```ts
import { speakerOf } from '@ifloom/engine'

function speakerOf(state: GameState, game: Game, id: string): SpeakerView | null
```

Who an id is, as the view draws a scene's speaker: a [`SpeakerView`](/docs/reference/view#speakerview) with the entity's name (tokens filled), picture and hints, or `null` when the id names no entity. A bare id is `character:<id>`, else the one entity the game declares with that id. A reference is read as written, and `'you'` is whoever the player is playing.

```ts
speakerOf(state, game, 'ava')      // { id: 'ava', ref: 'character:ava', name: 'Ava', image: 'art/character/ava.svg', ui: { hue: 20 } }
speakerOf(state, game, 'Council')  // null: show the name as written
```

## Kinds and entities

```ts
content?: Content
```

A plugin can bring the [kinds](/docs/reference/entities#kinddef) of thing it keeps, and the [entities](/docs/reference/entities#entitydef) of those kinds there at the start, in its `content`. Each entity then has stats and a kv store that content works on with `of`, `each` and `count`, like any the game declares. The cast does this: each character is an entity of the kind `character`, which is how the showcase's `friendship` stat belongs to Ava and Sam.

- **`content`** is a [`Content`](/docs/reference/loader#content) the plugin brings, merged by the [loader](/docs/reference/loader#loadgame) first, plugin by plugin in the order `game.plugins` lists them, under the game's content and packs. It can hold anything content can: kinds, entities, scenes, prose, actions or `data`. A plugin's kind isn't [listed](/docs/reference/entities#listing) in the view unless it sets `listed`, so its entities don't show before the plugin says. A kind the game's content declares with the same id replaces the plugin's, and keeps the plugin's fields it leaves out. That's how a game renames one. A pack can replace anything in it by id. A plugin with options builds it in its factory, from those options.
- **An entity the game writes** is the way to give a plugin something per entity, such as a place or a vendor: the plugin declares a [trait](#traits), content writes the entity with it (often through a helper of the plugin's, as the places plugin's [`places.location()`](/docs/plugins/places#location) is), and the plugin finds them with [`withTrait`](/docs/reference/entities#withtrait). A mod then adds one as it adds any entity.

The [phone](/docs/plugins/phone) bundle, which is no plugin, returns its content the same way, as `{ plugins, content }`, for the game to load beside its own.

The regulars above, each also an entity with a stat of their own:

```ts
const regulars = definePlugin<null>({
  id: 'regulars',
  version: 1,
  // Listed in the view: everyone at the bar is known to the player.
  content: {
    kinds: [{ id: 'regular', label: 'Regular', plural: 'Regulars', listed: true }],
    entities: [
      { id: 'mo', of: 'regular', name: 'Mo' },
      { id: 'sal', of: 'regular', name: 'Sal' },
    ],
  },
})

// in your content
stats: [{ id: 'fondness', label: 'Fondness', of: 'regular', start: 3 }],
entities: [{ id: 'mo', of: 'regular', name: 'Mo from next door', stats: { fondness: 8 } }],
```

```ts
const state = startingState(game)
view(state, game).entities.find((kind) => kind.id === 'regular')!.entries.map((entry) => [entry.name, entry.stats[0].value])
// [['Mo from next door', 8], ['Sal', 3]]
```

The content's own Mo replaces the plugin's, in the plugin's place in the list.

**Gotchas.**
- **Only through `loadGame`.** A game built by hand, without the [loader](/docs/reference/loader#loadgame), gets neither. List the kinds in `game.kinds` and the entities in `game.entities` yourself.
- **A plugin's content isn't counted as declared by yours.** Your content can redeclare one of its kinds without a [`declared twice`](/docs/reference/loader#one-key-declared-twice) problem.
- **A save carries them in.** A declared entity a save doesn't have, such as one a new entry in the plugin's content makes, joins the save when it loads, unless it was removed in play. See [Entities in old saves](/docs/reference/entities#entities-in-old-saves).

## Traits

```ts
traits?: readonly TraitDef[]
```

A plugin that works on things the game declares, such as clothes to wash or tools to use, reads what it needs from [traits](/docs/reference/entities#traits). Content writes a trait on a kind, an entity or the `traits` table, and the plugin reads it back with [`traitOf`](/docs/reference/entities#traitof) and [`withTrait`](/docs/reference/entities#withtrait), or, with no state to hand, [`declaredTrait`](/docs/reference/entities#declaredtrait). A trait is data only. What it does is the plugin's own conditions, effects and commands.

Declaring one takes three things: the data's type, added to the engine's `TraitRegistry`, the trait in `traits`, and the code that reads it.

```ts
import { definePlugin, traitOf, type TraitDef } from '@ifloom/engine'

declare module '@ifloom/engine' {
  interface TraitRegistry {
    'laundry/washable': { temp: number; gentle?: boolean }
  }
}

const washable: TraitDef<'laundry/washable'> = {
  id: 'laundry/washable',
  // data is { temp: number; gentle?: boolean }
  check: (data) => (data.temp > 90 ? [`${data.temp} degrees would shrink it`] : []),
}

export function laundry() {
  return definePlugin<null>({
    id: 'laundry',
    version: 1,
    traits: [washable],
    conditions: {
      // { 'laundry/delicate': { entity: 'clothing:scarf' } }
      delicate: (state, args, context) => traitOf(state, context.game, String(args.entity), 'laundry/washable')?.gentle === true,
    },
  })
}
```

With the `declare module` block in the plugin's source, every game that imports the plugin gets the type. `traitOf(state, game, ref, 'laundry/washable')` returns `{ temp: number; gentle?: boolean } | undefined`, and content that writes `{ 'laundry/washable': { temp: 'hot' } }` is a type error. Name the trait in `TraitDef<'laundry/washable'>` so its `check` and `references` get the data typed too.

**Ids.** A trait's id is the plugin's id, a `/` and a name, like its conditions and effects. The [content checker](/docs/reference/checks#traits) reports a trait named otherwise, and two with one id.

**Checks.** The checker asks the plugin's trait about the data on every declared entity that has it, after the kind's default and the entity's own are combined. If the game has the plugin but content names a trait it doesn't declare, such as `laundry/washabel`, that's a problem too, so a typo doesn't go quietly unread. A game without the plugin can carry its traits unchecked, as with any [cooperating](#cooperates) plugin's content.

### TraitDef

```ts
type TraitDef<K extends string = string, S = unknown> = {
  id: K
  check?(data: TraitData<K>, tools: TraitTools): readonly string[]
  references?(data: TraitData<K>, tools: TraitTools): readonly Reference[]
  words?: WordShape
  state?: { start(data: TraitData<K>): S }
}
```

| Field | What it does |
|---|---|
| `id` | The trait's id: the plugin's id, `/` and a name. |
| `check` | What's wrong with the data on one entity, by a rule of the plugin's own. Each string is reported at `trait <id> on <entity>`. |
| `references` | What the data names, such as a scene or a prose key, for the checker to resolve like any [reference](#references). `tools.ref` is the entity it's on, so a condition in the data that names it as `'$'` can be bound to it first with [`bindCurrent`](/docs/reference/entities#bindcurrent), as the [cast](/docs/plugins/cast#person-1)'s `cast/person` does. |
| `words` | Which fields of the data are words a player reads, as a [`WordShape`](/docs/reference/words#wordshape): `{ closed: true, body: 'blocks' }`. A translation's [words table](/docs/reference/words) gives them other words under `entity.<ref>.traits.<id>.<field>`, or `kind.<kind>.traits.<id>.<field>` for a kind's default. |
| `state` | For the rare trait that keeps state on each entity, such as the uses left in a torch: `start` says where it begins, from the entity's data. Read and write it with [`traitState`](/docs/reference/entities#traitstate) and [`setTraitState`](/docs/reference/entities#settraitstate). Leave it out for a trait that is only data, which is most of them. |

### TraitTools

```ts
type TraitTools = { game: Game; ref: EntityRef }
```

What a trait's `check` and `references` get beside the data: the game, and the entity the data is on.

**Gotchas.**
- **Data, never functions.** A trait is written in content, and packs and mods can write it as JSON. Put behaviour in the plugin.
- **The kind's default comes first.** A trait's data on an entity is the kind's default with the entity's own laid over it, field by field, so make a field optional in `Traits` when a kind is expected to supply it.
- **Things made in play.** A thing [created](/docs/reference/effects#create) in play has the traits it was given over those of the entity it was made `like`, or its kind's default, and `traitOf` and `withTrait` read it so. `declaredTrait` and `declaredWithTrait` read content only, for a check, which has no state, so they know only the entities content declares.

## Words

A plugin says which fields of its content are words a player reads, so a translation can give them other words in a pack's [`words` table](/docs/reference/words). `words` gives a [`WordShape`](/docs/reference/words#wordshape) for each list of its `data`, and a trait's `words` one for its data:

```ts
definePlugin({
  id: 'loyalty',
  version: 1,
  words: { cards: { name: true, perks: [{ label: true }], effects: { full: 'effects' } } },
  traits: [{ id: 'loyalty/till', words: { greeting: true } }],
})
```

Each field is keyed `<plugin>/<list>.<id>.<field>`, so a card's name is `loyalty/cards.cafe.name` and a perk's label `loyalty/cards.cafe.perks.coffee.label`. [`translatableFields`](/docs/reference/words#translatablefields) lists them with the rest of the game's. A field the plugin doesn't name isn't in the table. The plugin's own lines, such as refusals, stay in its [`strings`](/docs/reference/strings#plugins-strings).

An effect of the plugin's can carry words too, such as the text of a post the player makes. `callWords` gives a `WordShape` for each such effect's arguments, by its name without the prefix:

```ts
definePlugin({ id: 'loyalty', version: 1, callWords: { stamp: { note: true } } })

// In content: { id: 'buy', label: 'Buy a coffee', effects: [{ 'loyalty/stamp': { card: 'cafe', note: 'One more for a free one!' } }] }
// Keyed under where the effect is: action.buy.loyalty/stamp.<hash>.note
```

Each is keyed under the entry the effect is written in, then the call's full name and a hash of its words, as a [notice](/docs/reference/words#keys) is. The [feed plugin](/docs/plugins/feed) declares a post's and a comment's `text` this way. Words a function of the game's works out in play aren't content, so they aren't in the table.

## Content and checks

A plugin's content, such as quests or recipes, lives in your content's `data`, by plugin id and then by list name. Each entry has an `id`:

```ts
import type { Content } from '@ifloom/engine'

const town: Content = {
  data: { loyalty: { cards: [{ id: 'cafe', stampsToFill: 5 }, { id: 'market', stampsToFill: 8 }] } },
}
```

The [loader](/docs/reference/loader#content) merges `data` as it merges scenes: each entry is declared once across the content, and a pack's entry replaces one with the same id, whole. The result is at `game.data.loyalty.cards`. The base game can carry `data` too, ahead of the content.

### PluginEntry

```ts
type PluginEntry = { id: string; [field: string]: unknown }
```

One entry in a plugin's content: an `id`, and whatever fields the plugin reads. `game.data` and content's `data` are `Record<string, Record<string, readonly PluginEntry[]>>`, so content writes entries without a cast. The engine reads only `id`. The plugin gives the other fields their types where it reads them, says what they name in [`references`](#references), and checks its own rules in [`check`](#check).

### References

```ts
references?: PluginReferences

type PluginReferences = {
  calls?: (table: CallTable, name: string, args: PluginArgs, game: Game) => readonly Reference[]
  panels?: (panel: string, args: PluginArgs, game: Game) => readonly Reference[]
  content?: (game: Game) => readonly ContentReferences[]
}

type CallTable = 'conditions' | 'effects' | 'commands'

type ContentReferences = { list: string; id: string; refs: readonly Reference[] }
```

What the plugin's calls, panels and content name, so the [content checker](/docs/reference/checks) checks them as it checks the engine's own, in the same words. Each is optional.

- **`calls`** says what one call to the plugin's conditions, effects or commands names. `table` says which, `name` is the name without the prefix, and `args` is what the call passes in `with`. It's `{}` if nothing is passed, or if a [short call](/docs/reference/custom#plugincall)'s value isn't an object (which the checker reports). The checker asks it about every call it finds, wherever the call is.
- **`panels`** says what opening one of the [panels](/docs/reference/panels) the plugin's UI draws names, from what it's opened with: a [`panel` effect](/docs/reference/effects#panel)'s `with`, or a scene's `panel`. The checker asks every plugin about every panel it finds, so answer `[]` for a name that isn't yours. A name no plugin answers for is allowed, because the UI decides what it draws.
- **`content`** says what each entry of the plugin's content names, as `{ list, id, refs }`. A problem is reported as `<list> <id>`, pinned on the content or pack that entry came from.

Each returns a list of [`Reference`](/docs/reference/checks#plugin-references)s: ids by what they are (`{ scene }`, `{ entity }`, `{ storyline }`), content to look inside (`{ when }`, `{ effects }`, `{ blocks }`, `{ command }`, `{ layered }`), files (`{ picture }`, `{ video }`), and an entry in a plugin's own content (`{ entry, plugin, list, noun }`). [Plugin references](/docs/reference/checks#plugin-references) lists them all.

The loyalty plugin's cards each have a condition, and its `stamp` effect names a card:

```ts
references: {
  calls: (table, name, args) =>
    table === 'effects' && name === 'stamp' ? [{ entry: String(args.card), plugin: 'loyalty', list: 'cards', noun: 'card' }] : [],
  content: (game) =>
    (game.data?.loyalty?.cards ?? []).map((card) => ({ list: 'cards', id: card.id, refs: [{ when: (card as { when?: Condition }).when }] })),
},
// mod:sunday-market · cards market · unknown storyline "sam"
// town · action buy · unknown card "bakery"
```

A rule of the plugin's own about what a call or a panel is given, which no id can say, is a `{ problem }` reference: the checker reports its words where the call is. The stall says it sells only bread, eggs and cheese, and the shop needs a vendor for its panel:

```ts
references: {
  calls: (table, name, args) =>
    table === 'conditions' && name === 'sells' && !['bread', 'eggs', 'cheese'].includes(String(args.item))
      ? [{ problem: `nobody sells "${String(args.item)}"` }]
      : [],
  panels: (panel, args) => {
    if (panel !== 'shop') return []
    return typeof args.vendor === 'string' ? [{ entity: `vendor:${args.vendor}`, carrying: 'shop/vendor' }] : [{ problem: 'the shop panel needs a vendor: { vendor: "<id>" }' }]
  },
},
// town · action ask · nobody sells "fish"
// town · action counter · unknown entity "vendor:kiosk"
```

A field of the plugin's own that takes an [`Amount`](/docs/reference/amounts), such as a badge or a target, is named as `{ amount: field }`: the checker reads its shape and what it names, as it does an effect's `by`. Read it in play with [`amountOf`](/docs/reference/amounts#amountof).

A `{ within: 'action dig', refs }` reference puts `action dig: ` in front of the problems inside, so a list of buttons reads as the places plugin's do: `locations yard · action dig · unknown location "moon"`. A file a reference names, such as a post's picture, goes into the checker's [`files`](/docs/reference/checks#fileref).

**Gotchas.**
- A call to a plugin the game doesn't have isn't asked about. The name is reported or let through as [Absent partners](/docs/reference/checks#absent-partners) says.
- An `{ entry }` reference to a plugin the game doesn't have isn't checked. That's how the cast can name the places plugin's locations without needing it.

### check

```ts
check?: (game: Game, tools: CheckTools) => PluginProblem[]
```

Rules of the plugin's own that a reference can't say, such as two stages of one quest with the same id, or an exit to a place that isn't there. It runs after the references, once the game is loaded. It returns a [`PluginProblem`](#pluginproblem) for each fault.

```ts
check: (game) =>
  (game.data?.loyalty?.cards ?? []).flatMap((card) =>
    Number((card as { stampsToFill?: number }).stampsToFill) > 0 ? [] : [{ list: 'cards', id: card.id, what: 'stampsToFill must be above 0' }],
  ),
```

### CheckTools

```ts
type CheckTools = {
  problems: (refs: readonly Reference[]) => string[]
}
```

What the content checker lends `check`. `problems` resolves references as `references` does and returns the problems, worded as the checker words its own, or an empty list. Use it for something `check` works out, which a reference list can't hold until then. The stall checks the sign it hangs and the scene its closing button opens:

```ts
check: (game, { problems }) =>
  (game.data?.stall?.signs ?? []).flatMap((sign) => {
    const { text, closing } = sign as { id: string; text: string; closing: string }
    return problems([{ blocks: [{ text }] }, { command: { type: 'scene', id: closing } }])
      .map((what) => ({ list: 'signs', id: sign.id, what }))
  }),
// mod:sunday-market · signs early · no prose for "stall.sign"
// mod:sunday-market · signs early · opens unknown scene "stall.closing"
```

### callOf

```ts
import { callOf } from '@ifloom/engine'

function callOf(entry: object): { name: string; with: Record<string, unknown> } | undefined
```

The name and arguments of a call written in short, or `undefined` for one of the engine's own effects or conditions. Use it in code that looks through a list of effects, such as a guard or a price.

```ts
callOf({ 'calendar/pass': { by: 2 } }) // { name: 'calendar/pass', with: { by: 2 } }
callOf({ stat: 'coins', by: -2 })      // undefined
```

### PluginProblem

```ts
type PluginProblem = { list: string; id: string; what: string }
```

Which list, which entry, and what's wrong. The content checker turns it into a [`Problem`](/docs/reference/checks#problem-and-describeproblem) whose `where` is `<list> <id>`, pinned on the content or pack that entry came from, or on `base` if it came from no pack:

```text
mod:sunday-market · cards market · unknown storyline "sam"
```

## Saves

A save records each plugin's version in [`meta.plugins`](/docs/reference/saves#savemeta). A save made with a plugin the game no longer has still loads, keeps that plugin's state untouched, and names the plugin in [`missingPlugins`](/docs/reference/saves#loadedsave). A save whose plugin state can't be carried forward is refused with one of the reasons in [When a save loads](#when-a-save-loads).

## definePlugin

```ts
import { definePlugin } from '@ifloom/engine'

function definePlugin<S, V = unknown>(plugin: Plugin<S, V>): DefinedPlugin<S, V>

type DefinedPlugin<S, V = unknown> = Plugin<S, V> & {
  read(state: GameState, game: Game): S
  write(state: GameState, next: S): GameState
  viewIn(view: { readonly plugins: Readonly<Record<string, unknown>> }): V | undefined
}
```

Declares a plugin, and returns it with typed `read` and `write` for its own state and `viewIn` for its slice of the view. These are for code outside the plugin, such as tests or a UI. Inside the plugin, use the context's `slice` and `set`. `S` is the plugin's state and `V` what its `view` returns. Name both, `definePlugin<LoyaltyState, LoyaltyView>(...)`, since TypeScript can't work out one when you give the other.

`read` returns the plugin's state, or its starting state if the save has none yet. `write` returns the game state with the plugin's state replaced, labelled with the plugin's current version.

`viewIn` returns `view.plugins[id]`, typed as `V`, or `undefined` when the view has none: a game without the plugin, or a plugin with no `view`.

```ts
loyalty.read(state, game).stamps
const full = loyalty.write(state, { stamps: 0, free: 1 }) // a test that starts with a free coffee
loyalty.viewIn(runner.view())?.stamps                       // a number, typed, in a UI or a test
```

A plugin is a plain object, so `definePlugin` is optional, but it types `S` and `V` throughout and gives you `read`, `write` and `viewIn`. A plugin package usually exports a factory that returns one, such as [`quests()`](/docs/plugins/quests#quests).

## Gotchas

- **Plugins are chosen when the game is built.** They go on the base you pass to [`loadGame`](/docs/reference/loader#loadgame), not in content or a pack. A mod can bring data for a plugin the game has, but it can't add a plugin.
- **A plugin's state is part of the save.** Keep it plain JSON. Every shape change needs a version bump and a migration step, or older saves are refused.
- **Effects can't refuse.** An effect returns a new state. To stop the player, give the command a `whyNot`, give the action a `blocked` entry, or have a [guard](#guards) refuse any command that would apply the effect.
- **Every list of effects is written one way.** A plugin's `effectsOf`, `applyEffects` and every list content writes (a choice's, an action's, a trigger's) take the same [effects](/docs/reference/effects#effect), a plugin's in short: `{ 'loyalty/stamp': true }`. The [content checker](/docs/reference/checks) reports a name no plugin has.
- **Keep names stable.** Content refers to plugin conditions, effects and commands by name, so renaming one breaks every game and mod that uses it.

## See it in an example

None of the examples writes a plugin of its own. Small Town's [`examples/showcase/src/game.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/game.ts) uses the first-party ones, and its `plugins` list shows the order they need.
