---
title: "Plugin API"
description: "A plugin's shape, from its id, version and state to its commands, hooks and providers, and definePlugin, which declares one."
---
A plugin adds one system to the engine, such as a loyalty card, a quest list or a phone, with its own state in the save and the conditions, effects, commands, values, hooks and view that work on that state. A game lists its plugins in the base's [`plugins`](/docs/reference/content#gamebase) when it calls `loadGame`, and content calls each plugin's functions by name, as it calls the game's own [`rules`](/docs/reference/rules). [How plugins work](/docs/explanation/plugins) explains hooks, providers and cooperation, and [Write a plugin](/docs/how-to/write-a-plugin) builds one from the `plugin` template.

None of the examples writes a plugin of its own. The showcase's `examples/showcase/src/game.ts` lists the first-party plugins in the order they need, and [Examples](/docs/reference/examples) maps the rest.

```ts
import { definePlugin, type Asked, type DefinedPlugin, type Plugin, type PluginArgs, type PluginCommand, type PluginContext, type PluginDef, type Refusal, type StatModifier } from '@ifloom/engine/plugin'
```

These pages document the rest of `@ifloom/engine/plugin`:

- [Declaring a plugin's calls](/docs/reference/plugin-calls) covers `defineCalls`, `arg`, `defineData` and the registries that type content.
- [Queries and partners](/docs/reference/plugin-queries) covers `queries`, `cooperates` and `PartnerQueries`.
- [A plugin's view, scene and actions](/docs/reference/plugin-views) covers `view`, `scene`, `actions`, `audio`, `content` and `traits`.
- [Plugin migrations](/docs/reference/plugin-migrations) covers `migrations`, `contentMigrations` and `commandMigrations`.
- [A plugin's content checks](/docs/reference/plugin-checks) covers `references` and `check`.

The game's own `rules` takes the same hooks and providers as a plugin, and the engine runs it first. A plugin is the right choice when the system needs saved state of its own that is carried forward when its shape changes, or when more than one game should use it.

## Plugin

A system the game lists in its base's `plugins`, as a plain object of hooks, providers, tables of calls and data. Every field is in [`Plugin`](/docs/api/engine-plugin#plugin).

Every field but `id` and `version` is optional, and nothing is nested. The fields follow one naming rule, which [How plugins work](/docs/explanation/plugins#hooks-change-the-state-providers-answer) explains:

- **Hooks** run at an event and return the next state: [`onTurn` and `onTurnDone`](#onturn-and-onturndone), [`onStat`](#onstat) and [`onCommand`](#oncommand).
- **Providers** answer a question and change nothing: [`guard`](#guard), [`price`](#price), [`label`](#label), [`saveName`](#savename), [`statModifiers`](#statmodifiers), [`profile`](#profile), and [`scene`](/docs/reference/plugin-views#scene), [`actions`](/docs/reference/plugin-views#actions), [`action`](/docs/reference/plugin-views#action), [`audio`](/docs/reference/plugin-views#audio) and [`view`](/docs/reference/plugin-views#view).
- **Tables** of functions content calls by name: `conditions`, [`effects`](#effects), [`macros`](/docs/reference/custom#macros), [`commands`](#plugincommand), [`queries`](/docs/reference/plugin-queries#queries) and [`values`](/docs/reference/custom#values).
- **Data**: [`calls` and `data`](/docs/reference/plugin-calls), [`content`](/docs/reference/plugin-views#content), [`traits`](/docs/reference/plugin-views#traits), [`strings`](#strings), [`cooperates`](/docs/reference/plugin-queries#cooperates), [`references`](/docs/reference/plugin-checks#pluginreferences-calltable-and-contentreferences) and [`check`](/docs/reference/plugin-checks#check).
- **Versions** and their steps: [`version` and `migrations`](/docs/reference/plugin-migrations#migrations), [`contentVersion` and `contentMigrations`](/docs/reference/plugin-migrations#contentversion-and-contentmigrations), and [`commandVersion` and `commandMigrations`](/docs/reference/plugin-migrations#commandversion-and-commandmigrations).

Each hook and provider runs over one list: the game's own `rules` first, then the plugins in the order `game.plugins` lists them, each given the state the one before it returned. Every function gets the state, what content passed it, and a [`PluginContext`](#plugincontext).

This plugin keeps a loyalty card at the café, where each coffee adds a stamp and five stamps fill the card:

```ts
import { definePlugin } from '@ifloom/engine/plugin'

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

Content then writes `{ 'loyalty/stamp': true }` in an action's effects, `{ 'loyalty/full': true }` in a choice's `when`, and prints `{{loyalty/stamps}}` in prose.

### id

The plugin's name and the prefix on everything it adds, so the plugin `loyalty` gives the effect `loyalty/stamp`. It holds letters, digits and `-`, and it's never `game`, `core` or `ui`.

Content calls a plugin by its full name: the plugin's id, a `/`, and the name in the plugin's table. The game's own code takes the same form with `game` in front (`{ 'game/tired': true }`), so a pack author learns one form for both. A name with no `/` calls nothing.

| Kind | Meaning |
|---|---|
| condition | Content writes `{ 'loyalty/full': true }` wherever a [condition](/docs/reference/conditions#conditioncall) goes. |
| effect | Content writes `{ 'loyalty/stamp': true }` in a choice's, an action's or a trigger's effects. |
| command | A choice's or an action's `command` is `{ 'loyalty/redeem': { id: 'cafe' } }`, or written out as `{ type: 'custom', name: 'loyalty/redeem', with: { id: 'cafe' } }`. |
| value | Prose prints `{{loyalty/stamps}}`, or `{{loyalty/stamps card=gold}}` with arguments, and a badge or a stat's ceiling names `{ value: 'loyalty/stamps', with: { card: 'gold' } }`. |

The short form has the full name as its only key, and the call's arguments as its value, or `true` for none (see [`PluginCall`](/docs/reference/custom#plugincall)). A value's name in prose is letters, digits, `_` and `-` after the `/`, followed by `key=value` arguments, and anything else stays on screen as written.

A plugin package gives helpers that write these calls, as properties of its factory named after the calls they write, such as [`quests.done`](/docs/reference/plugins/quests). It puts them there with `Object.assign(questsPlugin, { done })`, so `quests()` still makes the plugin and the helpers' names never clash with another plugin's.

### version

The version of the shape of the plugin's state, a whole number from 1. Bump it when the shape changes and add a step to [`migrations`](/docs/reference/plugin-migrations#migrations).

A save records each plugin's version in [`meta.plugins`](/docs/reference/saves#savemeta) and in each [`PluginSlice`](/docs/reference/plugin-migrations#pluginslice). A save made with a plugin the game no longer has still loads, keeps that plugin's state untouched, and names the plugin in [`missingPlugins`](/docs/reference/saves#loadedsave).

### start

Returns the plugin's state in a new game, from the game. [`startingState`](/docs/reference/commands#startingstate) calls it, and so does [`loadState`](/docs/reference/saves#loadstate) for a save made before the game had the plugin. A plugin with no state leaves it out, and its `slice` is then `undefined`.

The state must be plain JSON, because the save keeps it.

### effects

The plugin's effects by name without the prefix, each returning the next state. Content writes one in any list of [effects](/docs/reference/effects#effectcall), where it runs in its turn on the state the effects before it left, so two stamps in one list give two stamps.

A [macro](/docs/reference/custom#macros), the game's or a plugin's, runs in order the same way: the engine calls its function in its turn, and the effects it returns apply there. Inside an action, every effect runs after the action's command and cost.

```ts fragment
effects: [
  { 'loyalty/stamp': true },
  { 'game/countStamps': true }, // sees the card with the stamp on it
]
```

An effect can't refuse. To stop the player, give the command a [`whyNot`](#whynot), give the action a [`blocked`](/docs/reference/actions#blocked) entry, or have a [guard](#guard) refuse any command that would apply the effect.

### strings

The plugin's lines for the player in English, by name without the prefix, such as `{ notFull: 'Your card is not full yet.' }`. The plugin reads one with [`stringOf(game, 'loyalty/notFull')`](/docs/reference/strings#stringof), and a game rewords it with `strings: { 'loyalty/notFull': 'Five stamps first.' }` in its content (see [`StringKey` and `Strings`](/docs/reference/strings#stringkey-and-strings)).

### onTurn and onTurnDone

Hooks that run at the end of each turn and return the next state. Each gets a [`TurnContext`](/docs/reference/rules#turncontext), whose `before` is the state the turn ended on.

Every plugin's `onTurn` runs after the game's own [`rules.onTurn`](/docs/reference/rules#onturn), then the game's `rules.onTurnDone`, then every plugin's `onTurnDone`, so an `onTurnDone` sees what every `onTurn` did, such as the calendar's new day. A turn ends on each [`turn`](/docs/reference/effects#turn) effect, including those the calendar's `calendar/pass` applies. [`rules.onTurn`](/docs/reference/rules#onturn) lists the steps in full.

```ts
import { definePlugin } from '@ifloom/engine/plugin'

export const diary = definePlugin<{ days: number }>({
  id: 'diary',
  version: 1,
  start: () => ({ days: 0 }),
  onTurn: (_state, { slice, set }) => set({ days: slice.days + 1 }),
})
```

### onStat

A hook that runs after a [`stat`](/docs/reference/effects#stat) effect on one of the player's stats, once the game's own [`rules.onStat`](/docs/reference/rules#onstat) has run. It returns `before` to undo the change, `after` to let it stand, or `after` with more changes.

`by` is as `rules.onStat` gets it. The engine doesn't call it for an entity's stat or for an action's cost.

### onCommand

A hook that runs after every command that took, with the state the command started from as `before` and a context for `after`. To notice the player moving, a plugin uses `onCommand` and asks `places/here`.

Within one command, the engine runs these steps in order:

1. The command runs, with the end of any turn it causes and its turn hooks.
2. The game's [triggers](/docs/reference/triggers) fire.
3. The scene left on screen counts as [seen](/docs/reference/state#seen), its [minigame](/docs/reference/minigames) starts, and its sounds get [keys of their own](/docs/reference/audio#audiocue).
4. The game's `rules.onCommand` runs, then each plugin's `onCommand`. Triggers see what they change only on the next command.
5. A stat that went up a level raises its [notice](/docs/reference/stats#statlevels), so a hook's reward that reaches a level is noticed too.
6. The engine records the [pool picks](/docs/reference/media#mediastate) and background audio the new screen shows.

[`apply`](/docs/reference/commands#apply) lists the checks that come before a command runs. `onCommand` runs only through `apply` and only when the command took, so it doesn't run on `start`, on a refused command or under [`applyEffects`](/docs/reference/effects#applyeffects).

```ts
import { definePlugin } from '@ifloom/engine/plugin'

export const visits = definePlugin<{ places: string[] }>({
  id: 'visits',
  version: 1,
  start: () => ({ places: [] }),
  onCommand: (_before, after, { slice, set, query }) => {
    const here = query('places/here') ?? null
    return here === null || slice.places.includes(here) ? after : set({ places: [...slice.places, here] })
  },
})
```

### guard

A provider that says whether a command may go ahead, from the command and the effects it would apply. It returns `undefined` to let the command through, or a [`Refusal`](#asked-and-refusal).

The guard gets an [`Asked`](#asked-and-refusal), whose `effects` come from [`effectsOf`](/docs/reference/actions#effectsof), with the state before the command. A string refuses the command, as a [lock](/docs/reference/locks) does: [`whyNot`](/docs/reference/actions#whynot) returns the line, the view greys the button out with it, and the reducer refuses with it. `{ reason, soft: true }` is a warning: the button stays pressable and carries `reason` as its [`warning`](/docs/reference/view#renderedchoice), and the reducer still refuses the command with `reason`. The [calendar](/docs/reference/plugins/calendar)'s past-dawn warning works this way, so the UI shows it and offers something else.

The engine asks the game's own `rules.guard`, then every plugin's guard, about every command except one that sets [`ignoresLocks`](#ignoreslocks). It asks after the locks, and before an action's `blocked` entries and cost. A refusal from any plugin wins over a warning, and among warnings the first wins. Every button carries a guard's refusal and warning: the game's and plugins' actions, scene choices (after the choice's own `disabled`), the cast's Talk buttons and the places plugin's exits.

A sink of dirty dishes in the flat refuses baking while it's full, and warns before cooking piles it higher:

```ts
import { callOf, stringOf, type Effect } from '@ifloom/engine'
import { definePlugin } from '@ifloom/engine/plugin'

const added = (effects: readonly Effect[]) =>
  effects.reduce((n, effect) => (callOf(effect)?.name === 'dishes/add' ? n + Number(callOf(effect)?.with.by ?? 1) : n), 0)

export const dishes = definePlugin<{ dirty: number }>({
  id: 'dishes',
  version: 1,
  start: () => ({ dirty: 0 }),
  strings: { full: 'Not with the sink this full.', piling: 'The dishes would pile up. Wash up first.' },
  effects: { add: (_state, args, { slice, set }) => set({ dirty: slice.dirty + Number(args.by ?? 1) }) },
  guard: (_state, { command, effects }, { slice, game }) => {
    if (command.type === 'action' && command.id === 'places/bake' && slice.dirty >= 3) return stringOf(game, 'dishes/full')
    if (slice.dirty + added(effects) > 3) return { reason: stringOf(game, 'dishes/piling'), soft: true }
    return undefined
  },
  price: (_state, effects) => (added(effects) ? [`${added(effects)} to wash`] : undefined),
  label: (_state, { slice }) => (slice.dirty ? `${slice.dirty} in the sink` : undefined),
})
```

`effects` is empty for a built-in command whose effects the engine can't know before it runs, such as `scene`, `leave` or `input`, so a guard tests `command` for those. An effect applied inside another effect isn't in the list either.

### price

A provider that returns what a button costs that the engine can't say, in the plugin's words, such as `['2 to wash']`. Every plugin's notes go in the button's [`price.notes`](/docs/reference/view#price), in the order `game.plugins` lists them.

The engine asks with the effects of each button's command, from `effectsOf`, and of each scene choice. It doesn't ask about a button whose effects are empty, and a button with notes but no cost gets a price of only `{ notes }`. An action's effects begin with its cost, as a negative `stat` effect for each stat it spends, which the engine already shows in `stats`, so a price doesn't repeat them.

The engine works out a command's effects for guards and prices only when some plugin in the game has a `guard` or a `price`, or a [lock](/docs/reference/locks#lock) names an `effect`.

### label

A provider that returns where the game is in a few words, for a header or a save, such as `'Day 3 · Wednesday morning'`. Every plugin's label, in the order `game.plugins` lists them and joined with ` · `, makes [`view.when`](/docs/reference/view#view), which is `null` when no plugin gives one.

Returning `undefined` adds nothing. With two dishes in the sink and the places plugin listed first, `view.when` is `'Your flat · 2 in the sink'`.

### saveName

A provider that returns the name a save is listed under, such as the name the player typed. The first answer names the save, and the game's [`rules.saveName`](/docs/reference/rules#savename) comes before any plugin's.

### statModifiers

A provider that returns changes to what the player's stats read now, such as a timed boost to energy, without writing to them. Each change is a [`StatModifier`](#statmodifier).

Everything that reads a stat sees the changed value: [`statValue`](/docs/reference/stats#statvalue), the `stat` and `level` conditions, a [formula](/docs/reference/stats#formula), an action's cost check and `view.stats`. A stat with a formula reads its inputs changed, then gets its own modifiers. When the plugin stops returning a modifier, the stat reads its kept value again.

```ts
import { definePlugin } from '@ifloom/engine/plugin'

// Reading glasses: worn, they add 4 to intelligence.
export const glasses = definePlugin<{ on: boolean }>({
  id: 'glasses',
  version: 1,
  start: () => ({ on: false }),
  effects: { wear: (_state, _args, { set }) => set({ on: true }) },
  statModifiers: (_state, { slice }) => (slice.on ? [{ stat: 'intelligence', add: 4 }] : undefined),
})
```

`statModifiers` works the modifiers out from the plugin's own state. A `statValue` or `stat` condition inside it would ask for the modifiers again.

### profile

A provider that returns what the plugin keeps in its namespace of the player's [profile](/docs/reference/profile), which outlives saves and new games, such as the endings the player has reached. It gets the state after the command, the state before it, what the namespace holds now (`undefined` if nothing), and the context, and returns the new value or `undefined` to leave it as it is.

A plugin's functions are pure and do no I/O, so the [runner](/docs/reference/runner#profile) writes the answer after every command that took. It writes each plugin's answer in order, so each call sees the value the one before it stored. Only a runner with a `profile` asks, and [`apply`](/docs/reference/commands#apply) and [`replay`](/docs/reference/runner#replay) never do, so a replayed log awards nothing twice.

```ts
import { definePlugin } from '@ifloom/engine/plugin'

export const endings = definePlugin({
  id: 'endings',
  version: 1,
  profile: (state, previous, stored) => {
    const reached = (stored as string[] | undefined) ?? []
    const scene = state.sceneId
    if (!scene?.startsWith('ending.') || scene === previous.sceneId || reached.includes(scene)) return undefined
    return [...reached, scene]
  },
  view: (_state, { profile }) => ({ reached: (profile as string[] | undefined) ?? [] }),
})
```

The plugin's `view` reads the namespace as `context.profile`, so a UI gets everything from the view. Conditions, effects, commands, hooks and the `profile` provider's own context never see `context.profile`, because a condition that read the profile could hold in one playthrough and not in a replay of it. Anything the story branches on belongs in the plugin's state.

## PluginContext

The third argument of every plugin function, and of every function in the game's own `rules`, whose `slice` is the game's own state. Every field is in [`PluginContext`](/docs/api/engine-plugin#plugincontext).

It extends the [`CustomContext`](/docs/reference/custom#customcontext) every called function gets (`game`, `query`, `value` and `roll`) with these members:

| Field | Meaning |
|---|---|
| `slice` | The plugin's own state, typed, which is `start(game)` while the save has none yet. |
| `picks` | The record the view's new pool picks go into for the reducer to record, set only in [`view`](/docs/reference/plugin-views#view). |
| `beats` | The function that renders blocks as beats, as a scene's body is rendered (see [`beats`](/docs/reference/plugin-views#beats)). |
| `profile` | The plugin's namespace of the [profile](#profile), frozen, set only in `view` and only when a runner with a profile builds it. |

```ts fragment
stamp: (_state, _args, { slice, set }) => set({ ...slice, stamps: slice.stamps + 1 }),
```

### get and set

`get(on?)` reads the plugin's state from `on`, and `set(next, on?)` returns a game state with the plugin's state replaced by `next`. `on` defaults to the state the function was handed, so `get()` is `slice`, and `get` returns `start(game)` while `on` has no state for the plugin.

`set` without `on` builds on the state the function was handed, not one changed since. A command or an effect that changes other parts of the state makes those changes first and passes the result as `on`. To read the plugin's state after something else may have changed it, such as effects that run the plugin's own effects, it reads with `get(next)` and writes with `set(…, next)`:

```ts fragment
const next = apply([{ stat: 'energy', by: 15 }])
return set({ ...get(next), free: get(next).free - 1 }, next)
```

`get` and `set` know the plugin's starting state and the save's layout, so a plugin never reads `state.plugins[id]` itself.

### apply

`apply(effects, on?)` applies a list of [effects](/docs/reference/effects#effect) as content would and returns the next state, built from `on`. The list takes anything content can write, the plugin's own effects included, and each effect applies on the state the one before it left.

This is how a plugin's effect or command ends a turn: `apply([{ turn: true }])` runs the whole end of a turn with every [`onTurn` and `onTurnDone`](#onturn-and-onturndone). A `turn` effect applied while a turn is already ending does nothing, so an `onTurn` hook can't end a second turn. `apply` runs no triggers and no `onCommand` hooks, which run once the command is done.

```ts fragment
// Empty the sink first, so the turn's hooks see it empty.
wash: (_state, _args, { set, apply }) => apply([{ turn: true }], set({ dirty: 0 })),
```

## PluginArgs

The arguments content passes a call in its `with`, or as its value in the short form, as written and unchecked. Its type is in [`PluginArgs`](/docs/api/engine-plugin#pluginargs).

It's `{}` when content passes none. A call the plugin declares in [`calls`](/docs/reference/plugin-calls#definecalls) never sees it, since its function gets the arguments the declaration reads, typed. A value, a query and a call nobody declares get `PluginArgs`, so they read each field defensively, such as `typeof args.card === 'string' ? args.card : undefined`, because a mod can pass anything.

## PluginCommand

A command a button can send as `{ 'loyalty/redeem': { id: 'cafe' } }`, in the plugin's `commands`. Every field is in [`PluginCommand`](/docs/api/engine-plugin#plugincommand).

`run` returns the next state, and the engine calls it only once nothing has refused. Each function gets a declared command's arguments, read (see [Declaring a plugin's calls](/docs/reference/plugin-calls)), or [`PluginArgs`](#pluginargs).

```ts
import { stringOf } from '@ifloom/engine'
import { definePlugin } from '@ifloom/engine/plugin'

export const loyalty = definePlugin<{ stamps: number; free: number }>({
  id: 'loyalty',
  version: 2,
  start: () => ({ stamps: 0, free: 0 }),
  strings: { notFull: 'Your card is not full yet.', onlyAtCafe: 'Only at the café.' },
  commands: {
    redeem: {
      whyNot: (_state, _args, { slice, game, query }) => {
        if (slice.free === 0) return stringOf(game, 'loyalty/notFull')
        if (query('places/here') !== 'cafe') return stringOf(game, 'loyalty/onlyAtCafe')
        return undefined
      },
      run: (_state, _args, { slice, set, apply }) => set({ ...slice, free: slice.free - 1 }, apply([{ stat: 'energy', by: 15 }])),
    },
  },
})
```

### whyNot

Returns why the command can't be done now, in the player's words, or `undefined` when it can. A command without `whyNot` can always be done, apart from locks and guards.

The engine's [`whyNot`](/docs/reference/actions#whynot) asks these in order, and the first answer wins:

1. The [locks](/docs/reference/locks), as for every command, unless the command sets `ignoresLocks`.
2. The game's own [`rules.guard`](/docs/reference/rules#gamerules), then every plugin's [guard](#guard), unless the command sets `ignoresLocks`.
3. The [`noSuchAction`](/docs/reference/strings#refusals) string, `There is no such thing to do.`, when no plugin and no `rules.commands` has a command by that name.
4. The command's own `whyNot`.
5. For a declared command, the [`badArgument`](/docs/reference/strings#refusals) string when an argument doesn't fit its declaration, such as text where it takes a number.

The reducer refuses with that reason, and the view greys out the button with it. The plugin keeps the line in its [`strings`](#strings), so a game can reword it.

### ignoresLocks

Takes the command out of the [locks](/docs/reference/locks), off by default. No lock stops it, whatever its `deny` says, and the engine asks no guard about it.

The command's own `whyNot` still refuses, and `run` goes through [`apply`](/docs/reference/commands#apply) with triggers and every `onCommand` hook. It's for tools outside the story that must work at any point in it, such as the [debug plugin](/docs/reference/plugins/debug)'s commands, never for a move the player makes in the story. [`lockOn`](/docs/reference/locks#lockon) doesn't read it, so it still names the lock that matches the command.

```ts fragment
commands: {
  refill: { ignoresLocks: true, run: (_state, _args, { slice, set }) => set({ ...slice, free: slice.free + 1 }) },
}
```

A lock stops one plugin command by its full name (`deny: ['loyalty/redeem']`), every command of a plugin (`deny: ['loyalty/*']`), or every plugin's (`deny: ['custom']`).

### effectsOf

Returns the effects running the command would apply, worked out before it runs, since the engine can't see inside `run`. [Guards](#guard), [prices](#price) and [locks with `effect`](/docs/reference/locks#lock) read this list, which is empty without `effectsOf`.

The list holds [effects](/docs/reference/effects#effect) in the form content writes them, a plugin's in the short form. Nothing checks that it agrees with `run`.

```ts fragment
wash: {
  run: (_state, _args, { apply }) => apply([{ 'dishes/wash': true }]),
  effectsOf: () => [{ 'dishes/wash': true }],
},
```

### spends

Returns the stats the command spends by id, such as `{ coins: 4 }`, for its button's price. A button that sends the command lists them in its [`price`](/docs/reference/view#renderedchoice), through each stat's `format`, as an action's cost is.

It only labels the button. `run` does the spending, and `whyNot` refuses when there isn't enough.

## `Asked` and `Refusal`

`Asked` is the command a [guard](#guard) is asked about and the effects it would apply, and `Refusal` is the guard's answer when it won't let the command through. Their types are in [`Asked`](/docs/api/engine-plugin#asked) and [`Refusal`](/docs/api/engine-plugin#refusal).

A string `Refusal` refuses, and `{ reason, soft: true }` warns. A plugin names them when it writes a guard apart from `definePlugin`, and so does the game's own [`rules.guard`](/docs/reference/rules#gamerules).

```ts
import { stringOf, type GameState } from '@ifloom/engine'
import type { Asked, PluginContext, Refusal } from '@ifloom/engine/plugin'

export const noBakingAtNight = (state: GameState, { command }: Asked, { game }: PluginContext<unknown>): Refusal | undefined =>
  command.type === 'action' && command.id === 'places/bake' && state.kv.night === true ? stringOf(game, 'dishes/full') : undefined
```

## StatModifier

One change to what one of the player's stats reads, from a [`statModifiers`](#statmodifiers) provider. Every field is in [`StatModifier`](/docs/api/engine-plugin#statmodifier).

`add` is 0 and `multiply` is 1 when left out. The engine gathers the game's own `rules.statModifiers` and every plugin's, the game's first. For each stat it sums the adds, multiplies the total by every multiplier, then holds the result to the stat's range. With a kept value of 5, `{ add: 3 }`, `{ multiply: 2 }` and `{ add: 2, multiply: 1.5 }` read as `(5 + 3 + 2) × 2 × 1.5 = 30`.

```ts fragment
{ stat: 'energy', add: 10 }
```

A modifier changes only the player's stats, never an entity's stats read with `of`. A [level](/docs/reference/stats#statlevels) reached through a modifier raises its notice, as one reached through an effect does.

## DefinedPlugin

The [`Plugin`](#plugin) that [`definePlugin`](#defineplugin) returns, with `read` and `write` for its state. Every field is in [`DefinedPlugin`](/docs/api/engine-plugin#definedplugin).

`read(state, game)` returns the plugin's state, or its starting state while the save has none. `write(state, next)` returns the game state with the plugin's state replaced, labelled with the plugin's current version. A plugin package's factory names `DefinedPlugin` as its return type.

```ts given
import { loyalty } from './loyalty.ts'

const withFreeCoffee = loyalty.write(state, { stamps: 0, free: 1 })
```

## PluginDef

The object [`definePlugin`](#defineplugin) takes. Every field is in [`PluginDef`](/docs/api/engine-plugin#plugindef).

Without declared calls it's a [`Plugin`](#plugin). With them, `calls` is required, and `conditions`, `effects`, `macros` (see [`Macro`](/docs/reference/custom#macro)) and `commands` hold exactly the declared calls, each handed its arguments typed. Every declared condition and command needs a function, and every declared effect needs one in `effects` or `macros`.

## Functions

### definePlugin

Returns the plugin it's given as a [`DefinedPlugin`](#definedplugin), with typed `read` and `write` for its own state. Its signature is in [`definePlugin`](/docs/api/engine-plugin#defineplugin).

`S` is the plugin's state, `V` what its `view` returns, and `C` its declared calls, `typeof CALLS` (see [`defineCalls`](/docs/reference/plugin-calls#definecalls)). TypeScript can't work out one of the three when you name the others, so a plugin with declared calls names all three: `definePlugin<Card, CardView, typeof CALLS>(...)`.

It throws when a declared call has no function, a function has no declaration, or the declaration's id isn't the plugin's, since each is a mistake in the plugin's code. The `read` and `write` it adds are for code outside the plugin, such as a test or a UI. Inside the plugin, the context's `slice`, `get` and `set` need no game.

```ts given
import { loyalty } from './loyalty.ts'

loyalty.read(state, game).stamps
runner.view().plugins.loyalty // typed by the plugin's ViewRegistry entry
```

A plugin is a plain object, so `definePlugin` is optional, but it types `S` and `V` throughout. A plugin package exports a factory that returns one, such as [`quests()`](/docs/reference/plugins/quests).

## Caveats

- A game chooses its plugins in the base it passes to [`loadGame`](/docs/reference/content#loadgame). A mod can bring `data` for a plugin the game has, but it can't add a plugin.
- A call to a name nobody has fails quietly in play: a condition is false, an effect does nothing, a value stays on screen as written, and a command is refused with `There is no such thing to do.` The [content checker](/docs/reference/checks) reports most of them when the game loads.
- Content names a plugin's calls by name, so renaming one breaks every game and mod that uses it.
- A hook that changes nothing returns the state it was given. `set` with an equal slice still makes a new state object.
