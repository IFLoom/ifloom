---
title: "Writing a plugin"
description: "Writing a plugin: state, conditions, effects, commands, hooks, queries, guards, prices, buttons, view, checks and tests."
---
A plugin adds a whole system to the engine, such as a loyalty card, a quest list or a phone. It keeps its own state in the save, and brings the conditions, effects, commands, prose values, hooks and view that work on that state. Content calls these by name, the same way it calls the game's [custom functions](/docs/reference/custom), so packs and mods can use a plugin without shipping any code.

You choose a game's plugins when you build it, in [`game.plugins`](/docs/reference/game#game). Nothing is loaded while the game runs. The first-party plugins are separate packages, listed under [First-party plugins](/docs/plugins).

Do you need a plugin or a custom function? A custom function gives one computed answer, such as whether it's market day or what a sandwich costs. Write a plugin when the system needs a memory of its own: state that has to be saved, carried forward when its shape changes, and shown to the player.

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
  activities: [
    // Each coffee gives energy and a stamp.
    { id: 'coffee', effects: [{ kind: 'stat', stat: 'energy', by: 15 }, { custom: 'loyalty/stamp' }] },
  ],
  scenes: [
    {
      id: 'counter',
      body: [{ text: 'counter' }],
      choices: [
        // Only offered once the card is full.
        { id: 'free-coffee', when: { custom: 'loyalty/full' }, effects: [{ kind: 'scene', scene: null }] },
        { id: 'leave', effects: [{ kind: 'scene', scene: null }] },
      ],
    },
  ],
  prose: {
    counter: 'Your card has {{v:loyalty/stamps}} stamps.',
    'counter#free-coffee': 'Claim a free coffee',
    'counter#leave': 'Not today',
  },
}

const { game } = loadGame([cafe], {
  id: 'corner-cafe',
  title: 'The Corner Café',
  plugins: [loyalty],
  actions: [
    { id: 'coffee', label: 'Buy a coffee', command: { type: 'activity', id: 'coffee' } },
    { id: 'counter', label: 'Go to the counter', command: { type: 'scene', id: 'counter' } },
  ],
})
```

After five coffees, `loyalty.read(state, game)` is `{ stamps: 5 }`, the counter says `Your card has 5 stamps.`, and Claim a free coffee is on offer.

That's a working plugin. The engine saves its state with the game, and the [content checker](/docs/reference/checks) reports a call to a name the plugin doesn't have, such as `cafe · activity coffee · no custom effect named "loyalty/stomp"`. The rest of this page builds on the same card: a command the player can press, a migration for when the state changes shape, and the hooks, guards and view a bigger system needs.

## A worked example

The full card also counts free coffees, and lets the player redeem one at the café. Its state gained a field, so its version goes up to 2 with a migration for saves made with version 1.

```ts
import { applyEffects, definePlugin, say } from '@ifloom/engine'

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
        if (slice.free === 0) return say(game, 'loyalty/notFull')
        // Where the player is, asked of the places plugin by name.
        if (query('places/here') !== 'cafe') return say(game, 'loyalty/onlyAtCafe')
        return undefined
      },
      run: (state, _args, { slice, set, game }) =>
        set({ ...slice, free: slice.free - 1 }, applyEffects(state, game, [{ kind: 'stat', stat: 'energy', by: 15 }])),
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
{ id: 'redeem', label: 'Redeem a free coffee', command: { type: 'custom', name: 'loyalty/redeem' } }
```

Five coffees later:

```ts
import { apply, holds, view, whyNot } from '@ifloom/engine'

loyalty.read(state, game)                                       // { stamps: 0, free: 1 }
holds(state, { custom: 'loyalty/hasFree' }, game)               // true
whyNot(state, game, { type: 'custom', name: 'loyalty/redeem' }) // undefined: it can be done
view(state, game).plugins.loyalty                               // { stamps: 0, free: 1 }

const out = apply(state, game, { type: 'custom', name: 'loyalty/redeem' })
view(out.state, game).plugins.loyalty                           // { stamps: 0, free: 0 }
```

On a new game the same command is refused with `Your card is not full yet.`, and the view greys out its button with the same line. A game that wants different wording gives `strings: { 'loyalty/notFull': 'Five stamps first.' }`. See [Strings](/docs/reference/strings#plugins-strings).

## Plugin

```ts
import {
  definePlugin, pluginById, pluginQuery, pluginSpeaker,
  type Plugin, type DefinedPlugin, type PluginContext, type PluginArgs,
  type PluginCommand, type PluginEntry, type PluginProblem, type PluginSlice,
  type Asked, type Refusal, type StageDef, type SpeakerView, type CheckTools,
  type PluginReferences, type ContentReferences, type StatModifier,
  type TraitDef, type TraitTools, type ContentStep, type ContentTools,
  type CommandStep, type RawPack, type RawCommand,
} from '@ifloom/engine'

type Plugin<S = any> = {
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
  onCommand?: (before: GameState, after: GameState, context: PluginContext<S>) => GameState
  guard?: (state: GameState, asked: Asked, context: PluginContext<S>) => Refusal | undefined
  price?: (state: GameState, effects: readonly Effect[], context: PluginContext<S>) => string[] | undefined
  label?: (state: GameState, context: PluginContext<S>) => string | undefined
  stage?: (state: GameState, context: PluginContext<S>) => StageDef | undefined
  buttons?: (state: GameState, context: PluginContext<S>) => readonly ActionDef[] | undefined
  speaker?: (id: string, state: GameState, context: PluginContext<S>) => SpeakerView | undefined
  kinds?: readonly KindDef[]
  entities?: (game: Game) => readonly EntityDef[]
  traits?: readonly TraitDef[]
  audio?: (state: GameState, context: PluginContext<S>) => Record<string, string | null> | undefined
  view?: (state: GameState, context: PluginContext<S>) => unknown
  profile?: (state: GameState, previous: GameState, stored: unknown, context: PluginContext<S>) => unknown
  references?: PluginReferences
  check?: (game: Game, tools: CheckTools) => PluginProblem[]
  argProblems?: (table: CallTable, name: string, args: PluginArgs, game: Game) => string[]
  panelProblems?: (panel: string, args: PluginArgs, game: Game, tools: CheckTools) => string[]
}
```

`S` is the shape of the plugin's own state. Every field but `id` and `version` is optional. Every one is flat: there's no table of hooks and no table under `profile`.

| Field | What it is |
|---|---|
| `id` | Its name, and the prefix on everything it adds: `loyalty` gives `loyalty/stamp`. Letters, digits and `-` only. The [content checker](/docs/reference/checks) reports any other id, and two plugins with the same one. |
| `version` | The version of its state's shape. Bump it when the shape changes, and add a step to `migrations`. Saves record it. |
| `start` | Its state in a new game. A plugin with no state leaves this out. |
| `migrations` | One step per version, keyed by the version it upgrades from. See [State and migrations](#state-and-migrations). |
| `contentVersion` | The version of what content and packs write for it: its `data`, its calls' arguments, its strings and its traits. 1 if left out. Packs record it. See [Content and command migrations](#content-and-command-migrations). |
| `contentMigrations` | One step per content version, keyed by the version it upgrades from, which [`upgradePack`](/docs/reference/loader#upgradepack) runs on every pack the game loads. |
| `commandVersion` | The version of its commands' arguments. 1 if left out. [Command logs](/docs/reference/runner#commandlog) record it. |
| `commandMigrations` | One step per command version, which [`replay`](/docs/reference/runner#replay) runs on an older log's commands. |
| `conditions` | Tests that content can use anywhere a [condition](/docs/reference/conditions#custom) goes, by name without the prefix. |
| `effects` | Changes that content can make in a choice's, an activity's or a trigger's effects. Each takes the game state and returns the next one. |
| `commands` | Commands a button can send. See [`PluginCommand`](#plugincommand). |
| `strings` | The plugin's player-facing lines in English, by name without the prefix, such as `{ notFull: 'Your card is not full yet.' }`. The plugin says one with [`say(game, 'loyalty/notFull')`](/docs/reference/strings#say), and a game rewords it as `strings: { 'loyalty/notFull': '…' }`. See [Plugins' strings](/docs/reference/strings#plugins-strings). |
| `queries` | Answers other plugins can ask for by name, with their context's `query`. See [Queries](#queries). |
| `cooperates` | Ids of plugins it works with when the game has them. Content may name their conditions, effects and commands in a game without them. See [Cooperates](#cooperates). |
| `statModifiers` | Changes to what the player's stats read right now, such as a timed boost to energy. Nothing is written into the state. See [Stat modifiers](#stat-modifiers). |
| `values` | Words and numbers that prose prints with `{{v:loyalty/stamps}}`, and a badge or a stat's ceiling reads as `{ value: 'loyalty/stamps', with }`. Asked with arguments, as a condition is. |
| `onTurn` | A hook: runs at the end of each turn. See [Hooks and providers](#hooks-and-providers). |
| `onCommand` | A hook: runs after every command that took. See [Hooks and providers](#hooks-and-providers). |
| `guard` | Whether a command may go ahead, given the effects it would apply. Returns a refusal, a warning or `undefined`. See [Guards](#guards). |
| `price` | What a button costs that the engine can't say, in the plugin's words. See [Prices](#prices). |
| `label` | Where the game is, in a few words, for [`view.when`](/docs/reference/view#the-clock-and-the-player). See [Labels](#labels). |
| `stage` | What the screen shows while no scene is open: a title and prose blocks. See [Stage](#stage). |
| `buttons` | Buttons offered while no scene is open, before the game's own `actions`. See [Buttons](#buttons). |
| `speaker` | Who a scene's `speaker` id is: a name, a colour and a picture. See [Speakers](#speakers). |
| `kinds` | [Kinds](/docs/reference/entities#kinddef) of entity the plugin brings. See [Kinds and entities](#kinds-and-entities). |
| `entities` | [Entities](/docs/reference/entities#entitydef) there at the start, made from the plugin's content when the game is loaded. See [Kinds and entities](#kinds-and-entities). |
| `traits` | [Traits](/docs/reference/entities#traits) the plugin gives meaning to: named data that entities carry. See [Traits](#traits). |
| `audio` | What plays on background audio channels, such as a place's ambience. See [Audio](#audio). |
| `view` | What the UI needs from the plugin, at [`view.plugins[id]`](/docs/reference/view#plugins). See [The view](#the-view). |
| `profile` | What the plugin keeps in the player's [profile](/docs/reference/profile), which outlives saves and new games. See [The profile](#the-profile). |
| `references` | What its calls and content name, for the [content checker](/docs/reference/checks) to resolve. See [References](#references). |
| `check` | Rules of its own about its content, checked with the rest of the game. See [check](#check). |
| `argProblems` | What's wrong with what content passes to one of its conditions, effects or commands, by a rule of its own. See [Checking calls](#checking-calls). |
| `panelProblems` | What's wrong with what content opens one of its [panels](/docs/reference/panels) with. See [Checking panels](#checking-panels). |

## PluginContext

```ts
type PluginContext<S> = CustomContext & {
  slice: S
  set: (next: S, on?: GameState) => GameState
  apply: (effects: readonly EffectRef[], on?: GameState) => GameState
  picks?: Record<string, string>
  profile?: unknown
}
```

Every plugin function gets this alongside the game state. It has everything a game's own [custom function](/docs/reference/custom#customcontext) gets, and more:

- `game` is the game.
- `value(name, args?)` reads a [value](/docs/reference/custom#values) by name, a plugin's or the game's own, about the state the function was handed.
- `roll(max, name)` draws a whole number from 0 to `max - 1`, from the save's seed, the turn and `name`.
- `slice` is the plugin's own state, typed. If the save has none yet, it's `start(game)`, or `undefined` for a plugin with no `start`.
- `set(next, on?)` returns a game state with the plugin's state replaced by `next`. It writes onto `on`, which defaults to the state the function was handed.
- `query(name, args?)` asks another plugin's [query](#queries) by its full name, about the state the function was handed. It returns `undefined` when the game doesn't have that plugin or that query. `args` is `{}` when left out.
- `apply(effects, on?)` applies a list of [effects](/docs/reference/effects) as content would, and returns the next state. See [Applying effects](#applying-effects).
- `picks` is only there in [`view`](#the-view). It's where the view's new pool picks go, for the reducer to record. See [The view](#the-view).
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

What content passes in `with`, unchecked. It's `{}` when `with` is left out. Read it defensively, for example `Number(args.atLeast ?? 1)` or `String(args.quest ?? '')`, because content is data and a mod can pass anything. To have the names it passes checked when the game loads, give the plugin [`references`](#references), and for rules of its own, [`argProblems`](#checking-calls).

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
| `spends` | The stats it spends, by id, such as `{ coins: 4 }`, for its button's price. A button that sends it lists them in its [`price`](/docs/reference/view#renderedchoice), written through each stat's `format`, as an activity's cost is. It only labels the button: `run` does the spending and `whyNot` refuses when there isn't enough. None if left out. |

The engine's [`whyNot`](/docs/reference/actions#whynot) asks these in order, and the first answer wins:

1. The [locks](/docs/reference/locks), as for every command, unless the command sets `ignoresLocks`.
2. Every plugin's [guard](#guards), unless the command sets `ignoresLocks`.
3. The game's own [`rules.commands.custom`](/docs/reference/rules#commands), if it has one. Its answer is then final, and the next two steps never run.
4. `There is no such thing to do.` (the [`noSuchAction`](/docs/reference/strings#refusals) string) if no plugin has a command by that name.
5. The plugin's `whyNot`.

The reducer refuses with that reason, and the view greys out the button with it. Put the line in the plugin's [`strings`](/docs/reference/strings#plugins-strings) and return `say(game, 'loyalty/notFull')`, so a game can reword it.

**Gotchas.**
- A command without `whyNot` can always be done, apart from locks and guards.
- A [lock](/docs/reference/locks) can stop one plugin command by its full name (`deny: ['loyalty/redeem']`), all of a plugin's commands (`deny: ['loyalty/*']`), or every plugin's (`deny: ['custom']`). `'*'` stops them too, like everything else.
- A `custom` entry in `rules.commands` takes over every plugin command, so leave it out.

### Commands outside the story

`ignoresLocks: true` takes a command out of the [locks](/docs/reference/locks). No lock stops it, whatever its `deny` says, and the view never greys out its button for one. No plugin's [guard](#guards) is asked about it either. Everything else still applies: the game's `rules.commands.custom` is still asked, the command's own `whyNot` still refuses, and `run` goes through [`apply`](/docs/reference/commands#apply) as usual, with triggers and every plugin's `onCommand` hook.

It's for tools that stand outside the story and must work at any point in it. The [debug plugin](/docs/plugins/debug), for example, sets a stat by hand in the middle of an intro that only moves through its scenes. Never use it for something the player does in the story. A lock is how a game says "not now", and a player command that slips past it breaks the game's stages.

```ts
commands: {
  // A tool for the person testing the game, not a move the player makes.
  refill: {
    ignoresLocks: true,
    run: (_state, _args, { slice, set }) => set({ ...slice, free: slice.free + 1 }),
  },
}
```

[`lockOn`](/docs/reference/locks#lockon) and [`lockedBy`](/docs/reference/locks#lockedby) don't look at `ignoresLocks`, so they still say which lock matches the command. Only `whyNot`, and so the reducer and the view, lets it through.

## Naming

Content calls a plugin by its full name: the plugin's id, a `/`, and the name in the plugin's table. It's the same form content uses for the game's own custom functions, so a pack author only learns one.

| Kind | Content writes |
|---|---|
| condition | `{ custom: 'loyalty/stamps', with: { atLeast: 3 } }`, or in short `{ 'loyalty/stamps': { atLeast: 3 } }` |
| effect | `{ custom: 'loyalty/stamp' }`, or in short `{ 'loyalty/stamp': true }`, in a data scene choice's, an activity's or a trigger's effects |
| command | `{ type: 'custom', name: 'loyalty/redeem', with: {...} }`, or in short `{ 'loyalty/redeem': {...} }`, on an [`ActionDef`](/docs/reference/actions#actiondef): a place's action, a game action or a plugin's [button](#buttons) |
| value | `{{v:loyalty/stamps}}` in prose, `{{v:loyalty/stamps card=gold}}` with arguments, or `{ value: 'loyalty/stamps', with: { card: 'gold' } }` as a badge or a stat's ceiling |

The short form has the plugin's full name as its only key, and the call's arguments as an object as the value, or `true` for none. See [`PluginCall`](/docs/reference/custom#plugincall).

A name with a `/` belongs to a plugin. The engine looks it up among the plugins first, and only then among the game's [custom functions](/docs/reference/custom), so keep `/` out of the game's own names.

A plugin usually exports small typed helpers that write these objects for authors who work in code, such as the quests plugin's [`questDone`](/docs/plugins/quests#helpers).

**Gotchas.**
- A value name in prose is letters, digits, `_` and `-` after the `/`, so `{{v:loyalty/stamps-left}}` prints. Its arguments follow as `key=value`. Anything else isn't a token and is left on screen as written.
- Don't put an id in a value's name, such as `loyalty/stamps-gold`. Take it as an argument, so one value serves every card and a mod's new card needs no code.
- A name nobody has fails quietly in play. A condition is false, an effect does nothing, a value is left on screen, and a command is refused with `There is no such thing to do.` The [content checker](/docs/reference/checks) reports most of them when the game loads.

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
- A plugin nobody lists in `cooperates` is still reported, as `no custom condition named "calendar/weekend"`.
- It covers every form: a condition, an effect in either form, and a command. See [Absent partners](/docs/reference/checks#absent-partners).
- A value in prose from an absent partner is left on screen.

## Effects run in order

A plugin's effect is a real step in its list. [`buildEffects`](/docs/reference/custom#buildeffects) turns `{ custom: 'loyalty/stamp', with }` into an [`Effect`](/docs/reference/effects#custom), `{ kind: 'custom', name: 'loyalty/stamp', with }`. When the list applies, each plugin effect runs on the state the effects before it left, so two stamps in one list give two stamps.

A game's own [custom effect](/docs/reference/custom#effects) runs in order the same way. Its function is called in its turn, with the state the effects before it left:

```ts
effects: [
  { custom: 'loyalty/stamp' },
  { custom: 'countStamps' }, // the game's own: sees the card with the stamp on it
]
```

Inside an activity, every effect runs after the cost is paid and after every effect before it.

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
}
```

Ways to rewrite a pack without walking it by hand. Each returns a new pack.

| Tool | What it rewrites |
|---|---|
| `objects` | Every object the pack's content holds, from the innermost out. It skips `prose`, `strings`, `variants` and `custom`, which hold words and code. |
| `calls` | Every call by name, however it's written. `short` is `{ 'loyalty/stamp': { by: 1 } }`, and it is handed every key with a `/` in it, so check the name. `long` is `{ custom: 'loyalty/stamp', with }` or `{ kind: 'custom', name, with }`. `command` is `{ type: 'custom', name, with }`. Return the call's name and arguments; give a call back as it came and it stays as it was. It skips the same keys as `objects`. A value, `{ value: 'loyalty/stamps', with }`, isn't a call: reach it with `objects`. |
| `words` | Every line of the pack's `prose` and `strings`, handed with its key, for a token such as <code v-pre>{{v:loyalty/stamps}}</code> that changed. |

### CommandStep

```ts
type RawCommand = Record<string, unknown> & { type: string }
type CommandStep = (command: RawCommand) => RawCommand
```

A step of `commandMigrations` is given every command in an older log, the engine's and other plugins' too, so check the `type` and `name` and give back the ones that aren't yours as they came. A log records each plugin's `commandVersion` (see [`CommandLog`](/docs/reference/runner#commandlog)), and [`replay`](/docs/reference/runner#replay) runs only the steps from there. A log from before logs kept versions is read as the oldest, so every step runs on it.

## Hooks and providers

A plugin's members follow one naming rule, as the game's [rules](/docs/reference/rules) do:

- **A hook** runs at an event and returns the next state. It's named `on` and the event: `onTurn`, `onCommand`.
- **A provider** answers a question and never changes the state. It's named by the noun it gives: `guard`, `price`, `label`, `stage`, `buttons`, `speaker`, `audio`, `statModifiers`, `view`, `profile`, `kinds`, `entities`.
- **A table** of named functions content calls is a plural noun: `conditions`, `effects`, `commands`, `queries`, `values`.

Nothing is nested, so every hook sits beside the rest of the plugin.

| Hook | When |
|---|---|
| `onTurn(state, context)` | At the end of each turn, after the game's own [`rules.onTurn`](/docs/reference/rules#onturn) and before its [`rules.onTurnDone`](/docs/reference/rules#onturndone). A turn ends on each [`turn`](/docs/reference/effects#turn) effect, including those the [calendar](/docs/plugins/calendar#what-a-turn-is)'s `calendar/pass` and `sleep()` apply. See [The end of a turn](/docs/reference/rules#the-end-of-a-turn). |
| `onCommand(before, after, context)` | After every command that took. `before` is the state the command started from, and the context belongs to `after`. |

Those are the only two hooks. Plugins' hooks run in the order `game.plugins` lists them, and each gets the state the one before it left. To notice the player moving, use `onCommand` and ask `places/here`, as the example below does.

Within one command, the order is:

1. The command runs, including the end of any turn it causes (the game's `rules.onTurn`, each plugin's `onTurn`, then the game's `rules.onTurnDone`).
2. The game's [triggers](/docs/reference/triggers) fire.
3. The scene left on screen is counted as [seen](/docs/reference/state#seen), its [minigame](/docs/reference/minigames) starts if it has one, and its sounds get [keys of their own](/docs/reference/audio#sounds-and-voices).
4. Each plugin's `onCommand` runs. Triggers don't see what it changes until the next command.
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
- `onCommand` only runs through [`apply`](/docs/reference/commands#apply) and `dispatch`, and only when the command took. It doesn't run on `start`, on a refused command, or under [`applyEffects`](/docs/reference/effects#applyeffects). A plugin whose view or conditions must be right on the first frame should work out what it needs from the state, as the [quests plugin](/docs/plugins/quests) does, rather than rely on `onCommand` having run.
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
- Only a runner with a `profile` asks it. [`apply`](/docs/reference/commands#apply), `dispatch` and [`replay`](/docs/reference/runner#replay) never do, so a replayed log doesn't award anything twice.
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

Every plugin's modifiers are gathered, in the order `game.plugins` lists them. For each stat, the adds are summed, then the total is multiplied by every multiplier, then the result is held to the stat's range. So with a kept value of 5, `{ add: 3 }`, `{ multiply: 2 }` and `{ add: 2, multiply: 1.5 }` read as `(5 + 3 + 2) × 2 × 1.5 = 30`.

Everything that reads a stat sees the changed value: [`statValue`](/docs/reference/stats#statvalue), the `stat` and `level` conditions, a [derived stat](/docs/reference/stats#derived-stats)'s formula, an activity's cost check and `view.stats`. A derived stat reads its inputs changed, then has its own modifiers applied.

**Gotchas.**
- Modifiers are never written. A `stat` effect changes the kept value in `state.stats`, underneath. When the plugin stops returning a modifier, the stat reads its kept value again.
- An activity's cost is checked against the changed value but paid from the kept one. With 5 energy kept and a boost of 10, a cost of 12 is allowed, and the kept value goes to 0 (held to the range). The boost still adds 10 on top while it lasts.
- Only the player's stats. An entity's stats, read with `of`, are never changed.
- `statModifiers` must not read stats itself, with `statValue` or a `stat` condition, because that read would ask for the modifiers again. Work them out from the plugin's own state.
- A [level](/docs/reference/stats#levels) reached through a modifier raises the level's notice, as one reached through an effect does.

## Guards, prices and labels

Three more fields let a plugin watch every command, not only its own. A guard says whether a command may go ahead, a price adds to what a button says it costs, and a label says where the game is. A guard and a price are both handed the effects the command would apply, worked out before it runs by [`effectsOf`](/docs/reference/actions#effectsof).

As an example, take a sink of dirty dishes in the flat. Cooking and baking add to it, and washing up takes the rest of the turn.

```ts
import { definePlugin, say, type Effect } from '@ifloom/engine'

type Sink = { dirty: number }

// How many dishes these effects would add.
const added = (effects: readonly Effect[]) =>
  effects.reduce((n, effect) => (effect.kind === 'custom' && effect.name === 'dishes/add' ? n + Number(effect.with?.by ?? 1) : n), 0)

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
    wash: (_state, _args, { set, apply }) => apply([{ kind: 'turn' }], set({ dirty: 0 })),
  },
  commands: {
    wash: {
      run: (_state, _args, { apply }) => apply([{ 'dishes/wash': true }]),
      effectsOf: () => [{ kind: 'custom', name: 'dishes/wash' }],
    },
  },
  guard: (_state, { command, effects }, { slice, game }) => {
    if (command.type === 'activity' && command.id === 'bake' && slice.dirty >= 3) return say(game, 'dishes/full')
    if (slice.dirty + added(effects) > 3) return { reason: say(game, 'dishes/piling'), soft: true }
    return undefined
  },
  price: (_state, effects) => {
    const n = added(effects)
    return n ? [n === 1 ? 'a dish to wash' : `${n} dishes to wash`] : undefined
  },
  label: (_state, { slice }) => (slice.dirty ? `${slice.dirty} in the sink` : undefined),
})
```

The flat offers the buttons, as a location of the [places plugin](/docs/plugins/places#locationdef):

```ts
import { onlyAt } from '@ifloom/plugin-places'

// in the content
activities: [
  { id: 'cook', blocked: [onlyAt(['flat'])], effects: [{ kind: 'stat', stat: 'energy', by: 20 }, { 'dishes/add': { by: 2 } }] },
  { id: 'bake', blocked: [onlyAt(['flat'])], effects: [{ kind: 'entity', entity: 'food:loaf', by: 1 }, { 'dishes/add': true }] },
],
// on the flat, in data.places.locations
actions: [
  { id: 'cook', label: 'Cook dinner', command: { type: 'activity', id: 'cook' } },
  { id: 'bake', label: 'Bake bread', command: { type: 'activity', id: 'bake' } },
  { id: 'wash', label: 'Wash up', command: { type: 'custom', name: 'dishes/wash' } },
],
```

With two dishes in the sink:

```ts
import { apply, view } from '@ifloom/engine'

const screen = view(state, game)
screen.when                                  // 'Your flat · 2 in the sink', with places listed before dishes
const cook = screen.actions.find((a) => a.id === 'cook')!
cook.disabled                                // undefined: it can be pressed
cook.warning                                 // 'The dishes would pile up. Wash up first.'
cook.price                                   // { notes: ['2 dishes to wash'] }
apply(state, game, { type: 'activity', id: 'cook' }).reason // 'The dishes would pile up. Wash up first.'
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

Every plugin's guard is asked about every command, in the order `game.plugins` lists them, except a plugin command that sets [`ignoresLocks`](#commands-outside-the-story). Guards are asked after the locks, and before the game's own [`rules.commands`](/docs/reference/rules#commands) and what the command itself needs, such as an activity's `blocked` entries and cost. A refusal from any plugin wins over a warning from any plugin, and among warnings the first wins. See [`warningOf`](/docs/reference/actions#warningof).

**Gotchas.**
- `effects` is empty for a built-in command whose effects can't be known before it runs, such as `scene`, `leave` or `input`. Test `command` for those. A plugin command's list is what its [`effectsOf`](#saying-what-a-command-does) says. The calendar's `sleep()` gives the `calendar/pass` it makes, but not the turns that pass ends.
- Every button shows a guard's refusal and its warning. That includes the game's and plugins' buttons, scene choices (after the choice's own `disabled`), the [cast](/docs/plugins/cast)'s Talk buttons and the [places plugin](/docs/plugins/places#exitview)'s exits.
- An effect applied inside another effect isn't in the list. The turn `dishes/wash` ends isn't there, only `dishes/wash` itself.

### Prices

```ts
price?: (state: GameState, effects: readonly Effect[], context: PluginContext<S>) => string[] | undefined
```

What a button costs that the engine can't say, in the plugin's words, such as `['2 dishes to wash']`. Every plugin's notes go in the button's [`price.notes`](/docs/reference/view#price), in the order `game.plugins` lists them. The engine asks with the effects of each button's command, from [`effectsOf`](/docs/reference/actions#effectsof), and of each scene choice. A button whose effects are empty isn't asked about. A button with notes but no cost gets a price of only `{ notes }`.

**Gotcha.** An activity's effects begin with its cost, as a negative `stat` effect for each stat it spends. The engine already shows those in `stats`, so a price shouldn't repeat them.

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
  effectsOf: () => [{ kind: 'custom', name: 'dishes/wash' }],
},
```

**Gotchas.**
- The list is plain [`Effect`](/docs/reference/effects)s, so write a plugin's effect in the long form, `{ kind: 'custom', name, with }`, not the short form.
- Keep it in step with `run`. Nothing checks that the two agree.

## Applying effects

```ts
apply: (effects: readonly EffectRef[], on?: GameState) => GameState
```

On the [context](#plugincontext), `apply` applies a list of effects as content would and returns the next state. Anything content can write goes in the list: built-in effects, the game's [custom effects](/docs/reference/custom#effects) and plugins' effects (this plugin's own included), in the long form or [in short](/docs/reference/custom#plugincall). They apply in order, each on the state the one before it left. The list is built from `on`, which defaults to the state the function was handed.

This is how a plugin's effect or command ends a turn. `apply([{ kind: 'turn' }])` runs the whole [end of a turn](/docs/reference/rules#the-end-of-a-turn), with the game's `rules.onTurn`, every plugin's `onTurn` hook and the game's `rules.onTurnDone`.

```ts
// Empty the sink first, so the turn's hooks see it empty.
wash: (_state, _args, { set, apply }) => apply([{ kind: 'turn' }], set({ dirty: 0 })),
```

**Gotchas.**
- As with `set`, without `on` it builds on the state the function was handed, not one you've changed since. Chain them by passing the result as `on`.
- A `turn` effect applied while a turn is already ending does nothing. From an `onTurn` hook, the game's or a plugin's, `apply([{ kind: 'turn' }])` leaves the turn as it is.
- It applies effects and nothing more. Triggers and `onCommand` hooks run once the command is done, as they do for any command.

## The view

`view(state, context)` returns whatever the plugin's UI needs, whether that's your own code or a React UI the plugin ships in its `/react` subpath (see [Plugin UIs and the kit](/docs/react/kit)). The engine's [`view()`](/docs/reference/view#plugins) collects each one at `plugins[id]`, and a plugin without `view` has no entry. The engine never looks inside it, so type it where you read it:

```ts
import { view } from '@ifloom/engine'

const card = view(state, game).plugins.loyalty as { stamps: number; free: number } | undefined
```

If your view draws pictures from a [pool](/docs/reference/media#pools), pass the context's `picks` to [`stageView`](/docs/reference/view#stageview) or [`renderScene`](/docs/reference/scenes#renderscene). Each new pick is written there, and the reducer records them after the command, so the same picture shows on every visit. The places plugin does this for a room's stage:

```ts
view: (state, { game, slice, picks }) => {
  const place = locationById(game, slice.at)
  return { stage: place ? stageView(state, game, place.stage, place.id, null, picks) : null }
},
```

## Stage

```ts
stage?: (state: GameState, context: PluginContext<S>) => StageDef | undefined

type StageDef = {
  title: string
  body?: readonly Block[]
  id?: string
  ui?: Ui<SceneUi>
}
```

What the screen shows while no scene is open, such as a room's description, a shop front or a heading over a dashboard. The view asks each plugin in the order `game.plugins` lists them, and the first that returns a `StageDef` fills [`view.scene`](/docs/reference/view#the-scene). `title` becomes the title, and `body` is rendered as a data scene's body would be (prose keys, variants, conditions and the game's prose), with `id: null` and no choices. Return `undefined` to let the next plugin answer.

| Field | What it is |
|---|---|
| `title` | The heading, such as a room's name. |
| `body` | What's written there, as [blocks](/docs/reference/scenes#block). Left out, the body is empty. |
| `id` | The id its blocks are drawn under. A [`variants`](/docs/reference/scenes#block) block rotates per id, so a plugin that stages several places gives each its own id to keep its lines separate. The plugin's id if left out. It's also in the room's [`view.scene.key`](/docs/reference/view#the-scene), `room:<id>`. |
| `ui` | [Presentation hints](/docs/reference/ui-hints) for the room, carried to `view.scene.ui` as a scene's are. Name it in [`references`](#references) as `{ ui }` so the checker sees it's data. |

With no plugin answering, the screen is the game's `title` and an empty body. The [places plugin](/docs/plugins/places#the-stage)'s stage is the room the player is in, with its name and its `body`.

A market stall on the high street fills the screen while it's open:

```ts
import { definePlugin } from '@ifloom/engine'

const stall = definePlugin<{ open: boolean }>({
  id: 'stall',
  version: 1,
  start: () => ({ open: true }),
  commands: { haggle: { run: (state) => state } },
  stage: (_state, { slice }) =>
    slice.open
      ? { id: 'market', title: 'The market stall', body: [{ text: 'stall.open' }, { variants: 'stall.cries' }] }
      : undefined,
  buttons: () => [{ id: 'haggle', label: 'Haggle', command: { type: 'custom', name: 'stall/haggle' } }],
})

// in your content
prose: { 'stall.open': 'Crates of eggs and a heap of loaves.', 'stall.cries/1': '“Fresh bread!”', 'stall.cries/2': '“Eggs, a dozen!”' },
variants: { 'stall.cries': ['stall.cries/1', 'stall.cries/2'] },
```

```ts
view(state, game).scene
// { id: null, key: 'room:market', title: 'The market stall',
//   body: 'Crates of eggs and a heap of loaves.\n\n“Fresh bread!”', choices: [], ... }

view(stall.write(state, { open: false }), game).scene.title // the next plugin's stage title, or the game's title
```

**Gotchas.**
- The first answer wins, so a plugin listed earlier in `game.plugins` hides a later one's stage. Only answer when the stage is yours. The stall's is `undefined` once it's packed up.
- A scene with no title of its own takes the stage's title, then the game's. The stall's scenes are headed The market stall while it's open.
- Only `view.scene` changes. In a game with the [places plugin](/docs/plugins/places) listed after the stall, the stall covers the room's description, but `view.plugins.places` still says where the player is and the exits are still drawn.
- The content checker doesn't see a stage's blocks, because they're worked out in play. Say what they name in [`references`](#references), as `{ blocks }`.

## Buttons

```ts
buttons?: (state: GameState, context: PluginContext<S>) => readonly ActionDef[] | undefined
```

Buttons the plugin offers while no scene is open, such as the stall's Haggle. Each is an [`ActionDef`](/docs/reference/actions#actiondef), the same shape as the game's own actions. The view puts every plugin's buttons first, in the order `game.plugins` lists them, then the game's own [`actions`](/docs/reference/game#game). The [places plugin](/docs/plugins/places#the-buttons)'s buttons are the current location's `actions`. All of them are drawn alike with [`renderAction`](/docs/reference/view#renderaction), which gives each a price, `blocked`, a [guard](#guards)'s warning and [`whyNot`](/docs/reference/actions#whynot)'s reason.

```ts
// The stall above, with a game action to buy bread:
view(state, game).actions.map((action) => action.id) // ['haggle', 'buy']
```

**Gotchas.**
- A button whose `when` doesn't hold is left out, and so is one whose command is stopped by a [lock](/docs/reference/locks) with `hide: true`. Any other lock greys it out with its line, like any button.
- Like the game's own actions, they aren't offered while a scene is open or while a lock that stops everything is on ([`lockedOut`](/docs/reference/locks#lockedout)).
- The content checker doesn't see them. Say what their commands name in [`references`](#references), as `{ command }`.

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

## Speakers

```ts
speaker?: (id: string, state: GameState, context: PluginContext<S>) => SpeakerView | undefined

type SpeakerView = {
  id: string
  name: string
  portrait: string | null
  ui?: Ui<EntityUi>
}
```

Who a scene's [`speaker`](/docs/reference/scenes#sceneview) id is, for the screen. The view asks each plugin in the order `game.plugins` lists them, and the first that returns a [`SpeakerView`](/docs/reference/view#speakerview) becomes [`view.scene.speaker`](/docs/reference/view#the-scene). Return `undefined` for an id that isn't yours, so the next plugin can answer.

| Field | What it is |
|---|---|
| `id` | The speaker id, as the scene named it. |
| `name` | What the player reads over their lines. |
| `portrait` | Their picture, as a path or URL. `null` for none. |
| `ui` | Their [presentation hints](/docs/reference/ui-hints), such as the React UI's [`hue`](/docs/react/hints#hue). A plugin whose speakers are entities passes on [`entityUi`](/docs/reference/ui-hints#entityui). |

With no plugin answering, the scene has no speaker. The [cast](/docs/plugins/cast#speakers) answers for its characters, such as Ava in the showcase. The id is never guessed from the scene's id.

A plugin that keeps the café's regulars says who's talking from its own content:

```ts
import { definePlugin, type EntityUi, type Ui } from '@ifloom/engine'

type Regular = { id: string; name: string; portrait?: string; ui?: Ui<EntityUi> }

const regulars = definePlugin<null>({
  id: 'regulars',
  version: 1,
  speaker: (id, _state, { game }) => {
    const regular = (game.data?.regulars?.people as readonly Regular[] | undefined)?.find((entry) => entry.id === id)
    return regular ? { id, name: regular.name, portrait: regular.portrait ?? null, ...(regular.ui ? { ui: regular.ui } : {}) } : undefined
  },
})

// in your content
data: { regulars: { people: [{ id: 'mo', name: 'Mo', ui: { hue: 200 } }] } },
scenes: [{ id: 'counter', speaker: 'mo', body: [{ text: 'counter' }], choices: [] }],
```

```ts
view(state, game).scene.speaker   // { id: 'mo', name: 'Mo', portrait: null, ui: { hue: 200 } }
```

### pluginSpeaker

```ts
import { pluginSpeaker } from '@ifloom/engine'

function pluginSpeaker(game: Game, state: GameState, id: string): SpeakerView | undefined
```

What the first plugin that knows `id` says it is, or `undefined` if none does. The view calls it for every scene with a speaker. A tool or a UI drawing a speaker outside a scene, such as a list of who's in the room, can call it the same way.

```ts
pluginSpeaker(game, state, 'mo')?.name   // 'Mo'
pluginSpeaker(game, state, 'nobody')     // undefined
```

**Gotchas.**
- The first answer wins, so for an id two plugins both know, the one listed earlier in `game.plugins` decides.
- The loader doesn't check a scene's `speaker` against any plugin. An id nobody knows gives no speaker, without a problem.

## Kinds and entities

```ts
kinds?: readonly KindDef[]
entities?: (game: Game) => readonly EntityDef[]
```

A plugin can bring the [kinds](/docs/reference/entities#kinddef) of thing it keeps, and the [entities](/docs/reference/entities#entitydef) of those kinds there at the start. Each entity then has stats and a kv store that content works on with `of`, `each` and `count`, like any the game declares. The cast does this: each character is an entity of the kind `character`, which is how the showcase's `friendship` stat belongs to Ava and Sam.

- **`kinds`** are merged by the [loader](/docs/reference/loader#loadgame) before the game's own, plugin by plugin in the order `game.plugins` lists them. A plugin's kind isn't [listed](/docs/reference/entities#listing) in the view unless it sets `listed`, so its entities don't show before the plugin says. A kind the game declares with the same id, on the base or in its content, replaces the plugin's, and keeps the plugin's fields it leaves out. That's how a game renames one.
- **`entities(game)`** is called once the game is loaded, with the content and every pack merged, so a plugin makes its entities from its own `data`, a mod's entries included. An entity the game declares itself with the same kind and id wins, whole. The rest join [`game.entities`](/docs/reference/game#game) and are [checked](/docs/reference/checks) like any declared entity, against the plugin's id.

The regulars above, each also an entity with a stat of their own:

```ts
const regulars = definePlugin<null>({
  id: 'regulars',
  version: 1,
  // Listed in the view: everyone at the bar is known to the player.
  kinds: [{ id: 'regular', label: 'Regular', plural: 'Regulars', listed: true }],
  entities: (game) =>
    ((game.data?.regulars?.people ?? []) as readonly Regular[]).map((person) => ({ id: person.id, of: 'regular', name: person.name })),
  // speaker as above
})

// in your content
stats: [{ id: 'fondness', label: 'Fondness', of: 'regular', start: 3 }],
entities: [{ id: 'mo', of: 'regular', name: 'Mo from next door', stats: { fondness: 8 } }],
data: { regulars: { people: [{ id: 'mo', name: 'Mo' }, { id: 'sal', name: 'Sal' }] } },
```

```ts
const state = startingState(game)
view(state, game).entities.regular.entries.map((entry) => [entry.name, entry.stats[0].value])
// [['Mo from next door', 8], ['Sal', 3]]
```

The content's own Mo wins over the plugin's. Sal comes from the plugin, after the declared ones.

**Gotchas.**
- **Only through `loadGame`.** A game built by hand, without the [loader](/docs/reference/loader#loadgame), gets neither. List the kinds in `game.kinds` and the entities in `game.entities` yourself.
- **`entities` runs before the prose is ready.** `game.prose` isn't set yet when it's called, so read only `game.data` and the other content lists.
- **A save carries them in.** A declared entity a save doesn't have, such as one a new entry in the plugin's content makes, joins the save when it loads, unless it was removed in play. See [Entities in old saves](/docs/reference/entities#entities-in-old-saves).

## Traits

```ts
traits?: readonly TraitDef[]
```

A plugin that works on things the game declares, such as clothes to wash or tools to use, reads what it needs from [traits](/docs/reference/entities#traits). Content writes a trait on a kind, an entity or the `traits` table, and the plugin reads it back with [`entityTrait`](/docs/reference/entities#entitytrait), [`traitOf`](/docs/reference/entities#traitof) and [`withTrait`](/docs/reference/entities#withtrait). A trait is data only. What it does is the plugin's own conditions, effects and commands.

Declaring one takes three things: the data's type, added to the engine's `Traits`, the trait in `traits`, and the code that reads it.

```ts
import { definePlugin, entityTrait, type TraitDef } from '@ifloom/engine'

declare module '@ifloom/engine' {
  interface Traits {
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
      delicate: (state, args, context) => entityTrait(state, context.game, String(args.entity), 'laundry/washable')?.gentle === true,
    },
  })
}
```

With the `declare module` block in the plugin's source, every game that imports the plugin gets the type. `traitOf(game, ref, 'laundry/washable')` returns `{ temp: number; gentle?: boolean } | undefined`, and content that writes `{ 'laundry/washable': { temp: 'hot' } }` is a type error. Name the trait in `TraitDef<'laundry/washable'>` so its `check` and `references` get the data typed too.

**Ids.** A trait's id is the plugin's id, a `/` and a name, like its conditions and effects. The [content checker](/docs/reference/checks#traits) reports a trait named otherwise, and two with one id.

**Checks.** The checker asks the plugin's trait about the data on every declared entity that has it, after the kind's default and the entity's own are combined. If the game has the plugin but content names a trait it doesn't declare, such as `laundry/washabel`, that's a problem too, so a typo doesn't go quietly unread. A game without the plugin can carry its traits unchecked, as with any [cooperating](#cooperates) plugin's content.

### TraitDef

```ts
type TraitDef<K extends string = string, S = unknown> = {
  id: K
  check?(data: TraitData<K>, tools: TraitTools): readonly string[]
  references?(data: TraitData<K>, tools: TraitTools): readonly Reference[]
  state?: { start(data: TraitData<K>): S }
}
```

| Field | What it does |
|---|---|
| `id` | The trait's id: the plugin's id, `/` and a name. |
| `check` | What's wrong with the data on one entity, by a rule of the plugin's own. Each string is reported at `trait <id> on <entity>`. |
| `references` | What the data names, such as a scene or a prose key, for the checker to resolve like any [reference](#references). `tools.ref` is the entity it's on, so a condition in the data that names it as `'$'` can be bound to it first with [`bindCurrent`](/docs/reference/entities#bindcurrent), as the [cast](/docs/plugins/cast#person-1)'s `cast/person` does. |
| `state` | For the rare trait that keeps state on each entity, such as the uses left in a torch: `start` says where it begins, from the entity's data. Read and write it with [`traitState`](/docs/reference/entities#traitstate) and [`setTraitState`](/docs/reference/entities#settraitstate). Leave it out for a trait that is only data, which is most of them. |

### TraitTools

```ts
type TraitTools = { game: Game; ref: EntityRef }
```

What a trait's `check` and `references` get beside the data: the game, and the entity the data is on.

**Gotchas.**
- **Data, never functions.** A trait is written in content, and packs and mods can write it as JSON. Put behaviour in the plugin.
- **The kind's default comes first.** A trait's data on an entity is the kind's default with the entity's own laid over it, field by field, so make a field optional in `Traits` when a kind is expected to supply it.
- **Things made in play.** `traitOf` and `withTrait(game, id)` read content, so they know the entities content declares. A thing [created](/docs/reference/effects#create) in play has the traits it was given over those of the entity it was made `like`, or its kind's default: read it with [`entityTrait`](/docs/reference/entities#entitytrait), and list them with `withTrait(game, id, state)`.

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
  calls?: (kind: 'conditions' | 'effects' | 'commands', name: string, args: PluginArgs, game: Game) => readonly Reference[]
  content?: (game: Game) => readonly ContentReferences[]
}

type ContentReferences = { list: string; id: string; refs: readonly Reference[] }
```

What the plugin's calls and content name, so the [content checker](/docs/reference/checks) checks them as it checks the engine's own, in the same words. Both are optional.

- **`calls`** says what one call to the plugin's conditions, effects or commands names. `kind` says which, `name` is the name without the prefix, and `args` is what the call passes in `with`. It's `{}` if nothing is passed, or if a [short call](/docs/reference/custom#plugincall)'s value isn't an object (which the checker reports). The checker asks it about every call it finds, wherever the call is.
- **`content`** says what each entry of the plugin's content names, as `{ list, id, refs }`. A problem is reported as `<list> <id>`, pinned on the content or pack that entry came from.

Each returns a list of [`Reference`](/docs/reference/checks#plugin-references)s: ids by what they are (`{ scene }`, `{ entity }`, `{ storyline }`), content to look inside (`{ when }`, `{ effects }`, `{ blocks }`, `{ command }`, `{ stage }`), files (`{ picture }`, `{ video }`), and an entry in a plugin's own content (`{ entry, plugin, list, noun }`). [Plugin references](/docs/reference/checks#plugin-references) lists them all.

The loyalty plugin's cards each have a condition, and its `stamp` effect names a card:

```ts
references: {
  calls: (kind, name, args) =>
    kind === 'effects' && name === 'stamp' ? [{ entry: String(args.card), plugin: 'loyalty', list: 'cards', noun: 'card' }] : [],
  content: (game) =>
    (game.data?.loyalty?.cards ?? []).map((card) => ({ list: 'cards', id: card.id, refs: [{ when: (card as { when?: Condition }).when }] })),
},
// mod:sunday-market · cards market · unknown storyline "sam"
// town · activity buy · unknown card "bakery"
```

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

### Checking calls

```ts
import type { CallTable } from '@ifloom/engine'

type CallTable = 'conditions' | 'effects' | 'commands'

argProblems?: (table: CallTable, name: string, args: PluginArgs, game: Game) => string[]
```

What's wrong with how content calls one of this plugin's conditions, effects or commands, by a rule of the plugin's own. It takes what `references.calls` takes. Return the problems, worded for the author, or `[]`. A name the call gives, such as a location, belongs in `references.calls` instead.

```ts
argProblems: (table, name, args) =>
  table === 'conditions' && name === 'sells' && !['bread', 'eggs', 'cheese'].includes(String(args.item))
    ? [`nobody sells "${String(args.item)}"`]
    : [],
```

```ts
activities: [{ id: 'ask', blocked: [{ when: { not: { 'stall/sells': { item: 'fish' } } }, reason: 'Not today.' }] }]
// town · activity ask · nobody sells "fish"
```

The checker asks it about every call it finds and reports each problem as the call's own, where the call is.

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

### Checking panels

```ts
panelProblems?: (panel: string, args: PluginArgs, game: Game, tools: CheckTools) => string[]
```

What's wrong with the `with` of a [`panel` effect](/docs/reference/effects#panel), for a panel the plugin's UI draws. The checker asks every plugin about every `panel` effect it finds, so answer `[]` for a name that isn't yours. A name no plugin answers for is allowed, because the UI decides what it draws. `tools.problems` words the ids it names as the checker does.

The shop plugin checks its `shop` panel like this:

```ts
panelProblems: (panel, args, _game, tools) => {
  if (panel !== 'shop') return []
  if (typeof args.vendor !== 'string') return ['the shop panel needs a vendor: { vendor: "<id>" }']
  return tools.problems([{ entry: args.vendor, plugin: 'shop', list: 'vendors', noun: 'vendor' }])
}
```

Each problem is reported where the effect is, such as `activity counter: unknown vendor "kiosk"`.

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
  viewIn(view: { plugins: Record<string, unknown> }): V | undefined
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

## pluginById

```ts
import { pluginById } from '@ifloom/engine'

function pluginById(game: Game | undefined, id: string): Plugin | undefined
```

The plugin with this id, if the game has it. Use it in a tool or a UI that needs to know whether a game has a plugin before it draws that plugin's panel.

```ts
if (pluginById(game, 'loyalty')) drawCard(view(state, game).plugins.loyalty)
```

## Gotchas

- **Plugins are chosen when the game is built.** They go on the base you pass to [`loadGame`](/docs/reference/loader#loadgame), not in content or a pack. A mod can bring data for a plugin the game has, but it can't add a plugin.
- **A plugin's state is part of the save.** Keep it plain JSON. Every shape change needs a version bump and a migration step, or older saves are refused.
- **Effects can't refuse.** An effect returns a new state. To stop the player, give the command a `whyNot`, give the activity a `blocked` entry, or have a [guard](#guards) refuse any command that would apply the effect.
- **A plain-effect list takes the long form.** A plugin's `effectsOf` and `applyEffects` take plain [effects](/docs/reference/effects#custom), not `{ custom }` or the short form. There, write `{ kind: 'custom', name: 'loyalty/stamp', with }`, which runs the same way. Every list content writes (a choice's, an activity's, a trigger's) takes any form. The [content checker](/docs/reference/checks) reports a name no plugin has.
- **Keep names stable.** Content refers to plugin conditions, effects and commands by name, so renaming one breaks every game and mod that uses it.

## See it in an example

None of the examples writes a plugin of its own. Small Town's [`examples/showcase/src/game.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/game.ts) uses the first-party ones, and its `plugins` list shows the order they need.
