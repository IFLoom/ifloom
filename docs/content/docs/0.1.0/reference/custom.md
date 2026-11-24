---
title: "Calls by name"
description: "The conditions, effects, macros and values a game writes in code and content calls by name with game/ in front."
---
A call by name is a condition, effect, macro, value or command written in code and named from content, such as `{ 'game/marketDay': true }`. The game declares its own in its [`rules`](/docs/0.1.0/reference/rules) and content calls them with `game/` in front, while a plugin's take the plugin's id in front, as in `{ 'quests/done': { quest: 'bread' } }`. [Content, packs and the base](/docs/0.1.0/explanation/content-and-packs#rules-are-the-games-code) explains why the game's code is called this way, and [Write your own condition, effect or macro](/docs/0.1.0/how-to/write-your-own-condition-or-effect) writes one.

In the showcase: `examples/showcase/src/rules.ts`, whose value `catName` the flat's prose prints and whose macro `postLatest` the phone's camera runs.

```ts
import { buildEffects, callOf, commandOf, type CommandRef, type CustomContext, type EffectRef, type PluginCall, type ValueRef } from '@ifloom/engine'
import type { Macro } from '@ifloom/engine/plugin'
```

Each game owns its functions, with no registry shared between games, so two games on one page never see each other's. Every function that reads a call takes the game, and finds nothing without it.

| Key | Meaning |
|---|---|
| `conditions` | Tests content writes as `{ 'game/marketDay': true }` in any [condition](/docs/0.1.0/reference/conditions#conditioncall). |
| `macros` | Effects that stand for other effects, written as `{ 'game/tip': { by: 2 } }` in any list of [effects](/docs/0.1.0/reference/effects#effectcall). |
| `effects` | Effects that return the next state, written in the same places as a macro. |
| `values` | Numbers or words, printed in prose as `{{breadPrice}}` and named elsewhere as `{ value: 'game/breadPrice' }`. |

## CustomContext

The part of every function's context that needs no plugin: the game, queries, values and seeded draws. Every field is in [`CustomContext`](/docs/0.1.0/api/engine#customcontext).

Every condition, macro, effect and value of the game's gets the state, its arguments as `args` (`{}` for `true`), and a [`PluginContext`](/docs/0.1.0/reference/plugin-api#plugincontext), which extends `CustomContext` with `slice`, `get`, `set`, `apply` and `beats`.

| Field | Meaning |
|---|---|
| `query` | The function that asks a plugin's query by its full name, `undefined` when the game lacks that plugin. `query('calendar/now')` answers a `{ day, period }`, since the engine declares the queries first-party plugins ask each other in [`PartnerQueries`](/docs/0.1.0/reference/plugin-queries#partnerqueries). |
| `value` | The function that reads a [value](#values) by its full name, a plugin's (`messages/unread`) or the game's (`game/breadPrice`), or `undefined` when nobody has one. |
| `roll` | The function that draws a whole number from 0 to `max - 1` from the save's seed, the turn and `name`, so a replay draws the same. Each draw takes its own `name`. |

This macro reads the calendar's clock through `query`:

```ts
import type { Macro } from '@ifloom/engine/plugin'

export const tips: Macro = (_state, _args, { query }) => {
  const evening = query('calendar/now')?.period === 'evening'
  return [{ stat: 'coins', by: evening ? 4 : 2 }]
}
```

## conditions

The game's own conditions, each a function that returns whether it holds. Content calls one as `{ 'game/name': true }`, or with arguments in place of `true`, anywhere a [`Condition`](/docs/0.1.0/reference/conditions#condition) goes, such as a block's `when`, a lock or a schedule entry.

A name the game doesn't declare is false, so a broken mod hides content in place of crashing, and the checker reports it.

```ts
import type { GameRules } from '@ifloom/engine'

export const rules: GameRules = {
  conditions: {
    isRegular: (state) => (state.seen['ava.hi']?.n ?? 0) >= 3,
    visitedAtLeast: (state, args) => (state.seen['ava.hi']?.n ?? 0) >= Number(args.times ?? 1),
  },
}
```

## macros

The game's own macros, each a [`Macro`](#macro) that returns the effects it stands for. Content calls one as any effect, `{ 'game/tip': { by: 2 } }`.

A macro runs in its turn. When the effects before it have applied, the engine calls its function with the state they left, and the effects it returns apply there. It can return any effect content can write, a plugin's call or another macro included, so two macros in a row compose.

A button's price, a guard and a [lock](/docs/0.1.0/reference/locks) see a macro before it runs. For those the engine calls it with the state on screen, so a macro that ends a turn is priced as one. In play the engine calls it again in its turn, and it can return something different there. Inside an [`each`](/docs/0.1.0/reference/effects#each), it runs once per entity.

```ts
import type { Effect, GameRules } from '@ifloom/engine'

export const rules: GameRules = {
  macros: {
    bumpVisits: (state, args) => {
      const now = Number(state.storylines.ava?.kv.visits ?? 0)
      return [{ kv: 'visits', of: 'storyline:ava', to: now + Number(args.by ?? 1) }]
    },
  },
}

export const effects: Effect[] = [{ 'game/bumpVisits': { by: 1 } }, { scene: null }]
```

## Macro

The function behind a macro, in the game's or a plugin's `macros`, which returns the effects the macro stands for. Its signature is in [`Macro`](/docs/0.1.0/api/engine-plugin#macro).

It gets the state, the arguments content wrote, and the `PluginContext`. A macro that returns a call to another macro runs it too, up to 10 deep, so a macro that names itself stops there in place of hanging.

## effects

The game's own effects, each a function that returns the next state, as a plugin's effect does. Content calls one as any effect, `{ 'game/keepDiary': { text: 'Met Ava.' } }`.

An effect suits a change that isn't a list of effects, such as writing the game's own state with `context.set`. It can still apply effects with `context.apply`. Prices, guards and locks can't see inside it, since it returns a state, so one that stands only for other effects is better as a macro.

```ts
import type { GameRules } from '@ifloom/engine'

type Diary = { entries: string[] }

export const rules: GameRules<Diary> = {
  start: () => ({ entries: [] }),
  effects: {
    keepDiary: (state, args, { slice, set, apply }) => apply([{ stat: 'energy', by: 5 }], set({ entries: [...slice.entries, String(args.text ?? '')] })),
  },
}
```

## values

The game's own values, each a function that returns a number or a word. Prose prints one as `{{breadPrice}}`, with arguments after the name as `key=value`, such as `{{messages/unread channel=texts}}`. Anywhere else a value is a [`ValueRef`](#valueref), such as a stat's `max`, an app's badge or an achievement's progress.

An unknown name in prose stays on screen as `{{breadPrice}}`. An unknown name in a stat's `max` reads as 100, and the checker reports it.

```ts
import type { GameRules } from '@ifloom/engine'

export const rules: GameRules = {
  values: {
    breadPrice: (state) => (state.kv.marketDay ? 4 : 5),
    energyCeiling: (state, args) => 80 + (state.stats.fitness ?? 0) * Number(args.per ?? 1),
  },
}
```

## ValueRef

A value named outside prose, by its full name and its arguments. Every field is in [`ValueRef`](/docs/0.1.0/api/engine#valueref).

```ts fragment
max: { value: 'game/energyCeiling', with: { per: 2 } }
```

## PluginCall

A call by name, with its full name as the only key and its arguments as the value. Every form is in [`PluginCall`](/docs/0.1.0/api/engine#plugincall).

It works anywhere a condition, an effect or a [`CommandRef`](#commandref) goes, and a plugin's helpers write it, such as `quests.done('bread')`. The value is the arguments as an object, named by the [content naming rule](/docs/0.1.0/reference/effects#effect), or `true` for none. In code, a call whose name a plugin or the game declares is checked against that declaration, so `{ 'quests/done': { qeust: 'bread' } }` fails to compile. `Condition`, `Effect` and `CommandRef` hold calls as a `ConditionCall`, an `EffectCall` and a `CommandCall`.

```ts fragment
{ 'quests/done': { quest: 'bread' } }
{ 'places/at': { location: ['cafe', 'park'] } }
{ 'calendar/weekend': true }
```

The engine reads an object as a call only when it has exactly one key and that key has a `/`. A second key, such as a stray `when`, makes it no call, so it's false as a condition and does nothing as an effect. A name with no `/` isn't a call either, and the checker says to write it with `game/` in front.

## CommandRef

A command in either form, the long [`Command`](/docs/0.1.0/reference/commands#command) or a call by name. Every form is in [`CommandRef`](/docs/0.1.0/api/engine#commandref).

`{ 'places/go': { id: 'cafe' } }` is `{ type: 'custom', name: 'places/go', with: { id: 'cafe' } }`. An action's and a choice's `command` take one, and so do [`apply`](/docs/0.1.0/reference/commands#apply), [`whyNot`](/docs/0.1.0/reference/actions#whynot), [`effectsOf`](/docs/0.1.0/reference/actions#effectsof) and the runner's `apply`. The [view](/docs/0.1.0/reference/view) always gives the long form.

## EffectRef

An effect in content, the same type as [`Effect`](/docs/0.1.0/reference/effects#effect). Every form is in [`EffectRef`](/docs/0.1.0/api/engine#effectref).

## Functions

### callOf

Returns the name and arguments of a call by name, or `undefined` for one of the engine's own conditions or effects. Its signature is in [`callOf`](/docs/0.1.0/api/engine#callof).

```ts
import { callOf } from '@ifloom/engine'

callOf({ 'quests/done': { quest: 'bread' } }) // { name: 'quests/done', with: { quest: 'bread' } }
```

### commandOf

Returns a command in the long form. A call becomes `{ type: 'custom', name, with }`, and any other command comes back as it is. Its signature is in [`commandOf`](/docs/0.1.0/api/engine#commandof).

```ts
import { commandOf } from '@ifloom/engine'

commandOf({ 'places/go': { id: 'cafe' } }) // { type: 'custom', name: 'places/go', with: { id: 'cafe' } }
```

### buildEffects

Returns the effects the reducer would run, leaving out a call to an effect or macro that neither the game nor its plugins declare. Its signature is in [`buildEffects`](/docs/0.1.0/api/engine#buildeffects).

It works nothing out, so it needs no state, and keeps every other effect as written.

```ts given
import { buildEffects } from '@ifloom/engine'

buildEffects(game, [{ 'game/tip': { by: 2 } }, { 'game/typo': true }]) // [{ 'game/tip': { by: 2 } }]
```

## Checks

The [content checker](/docs/0.1.0/reference/checks) checks every call content writes:

| Problem | Cause |
|---|---|
| `no game condition named "game/marketDy"` | A call names a function the game doesn't declare. |
| `no game value named "marketDay"; the game's own code is called with "game/" in front, as "game/marketDay"` | A call's name has no `game/` or plugin id in front. |
| `"places/at" takes its arguments as an object, such as { "places/at": { … } }, or true for none; this one has ["cafe"]` | A call's value is a list, a string, a number or `false`. The engine still makes the call, with no arguments. |
| `"game/tip" is both an effect and a macro; give one of them another name` | The same name is in `effects` and in `macros`. |
