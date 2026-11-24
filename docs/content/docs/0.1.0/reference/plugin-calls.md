---
title: "Declaring a plugin's calls"
description: "The defineCalls and defineData functions declare a plugin's calls and data lists once, and type every call content makes to it."
---
A plugin declares each of its conditions, effects and commands once with [`defineCalls`](#definecalls), with what each takes, and each list of its `data` once with [`defineData`](#definedata-and-list). The engine builds the rest from those declarations: the arguments each function gets, typed, the registry entries content is type-checked against, a writer for each call, the words a translation reaches, and what the [content checker](/docs/0.1.0/reference/checks) reports. [Plugin API](/docs/0.1.0/reference/plugin-api) covers the plugin these go in, and [Write a plugin](/docs/0.1.0/how-to/write-a-plugin) declares a plugin's calls step by step.

None of the examples writes a plugin of its own. Each first-party plugin declares its calls in its main entry, such as `packages/plugin-quests/src/index.ts`.

```ts
import type { CommandCall, CommandRegistry, ConditionCall, ConditionRegistry, EffectCall, EffectRegistry, QueryRegistry, ViewRegistry } from '@ifloom/engine'
import {
  arg, defineCalls, defineData, list,
  type AnyCalls, type Arg, type ArgIn, type ArgOut, type ArgShape, type ArgsIn, type ArgsOut, type CallArgs, type CallIn, type CallShapes,
  type CallWriter, type CommandsOf, type ConditionsOf, type DataList, type EffectsOf, type ListSpec, type PluginCalls, type PluginData, type WrittenAs,
} from '@ifloom/engine/plugin'
```

This declaration gives the loyalty card a condition, an effect and a command, each naming a card from the plugin's `cards` list:

```ts
import { arg, defineCalls, defineData, list } from '@ifloom/engine/plugin'

type CardDef = { id: string; name: string; stampsToFill: number }

export const DATA = defineData('loyalty', { cards: list<CardDef>({ noun: 'card', words: { name: true } }) })

export const CALLS = defineCalls('loyalty', {
  conditions: {
    stamps: { card: arg.entry(DATA.cards), gte: arg.number().optional(1) },
  },
  effects: {
    stamp: { card: arg.entry(DATA.cards).optional('cafe'), note: arg.words().optional() },
  },
  commands: {
    redeem: { id: arg.entry(DATA.cards) },
  },
})
```

## PluginCalls and AnyCalls

`PluginCalls` is the declaration [`defineCalls`](#definecalls) returns, with the plugin's id and a [`CallWriter`](#callwriter) for each call by table, such as `CALLS.effects.stamp`. `AnyCalls` is the type every plugin's `PluginCalls` fits. Their types are in [`PluginCalls`](/docs/0.1.0/api/engine-plugin#plugincalls) and [`AnyCalls`](/docs/0.1.0/api/engine-plugin#anycalls).

A plugin passes its declaration as its [`calls`](/docs/0.1.0/reference/plugin-api#plugin) and names `typeof CALLS` as `definePlugin`'s third type. Each of its functions then gets its arguments as the declaration reads them, and the plugin must implement exactly the calls it declares, an effect in `effects` or `macros`. Code that works on any plugin's declaration, such as a test that walks every call, takes `AnyCalls`.

```ts continues
import { definePlugin } from '@ifloom/engine/plugin'

export const loyalty = definePlugin<{ stamps: Record<string, number> }, unknown, typeof CALLS>({
  id: 'loyalty',
  version: 1,
  calls: CALLS,
  data: DATA,
  start: () => ({ stamps: {} }),
  conditions: {
    stamps: (_state, { card, gte }, { slice }) => (slice.stamps[card] ?? 0) >= gte,
  },
  effects: {
    stamp: (_state, { card }, { slice, set }) => set({ stamps: { ...slice.stamps, [card]: (slice.stamps[card] ?? 0) + 1 } }),
  },
  commands: { redeem: { run: (state) => state } },
})
```

In the condition above, `card` is a string and `gte` a number, whatever content wrote. A list of one is a list, missing text is `''`, an optional argument left out is `undefined` or its fallback, and the function never sees an argument the call doesn't declare.

## CallWriter

One call's writer, such as `CALLS.conditions.stamps`, which returns the call in the short form from its arguments. Its type is in [`CallWriter`](/docs/0.1.0/api/engine-plugin#callwriter).

`CALLS.conditions.stamps({ card: 'cafe', gte: 5 })` returns `{ 'loyalty/stamps': { card: 'cafe', gte: 5 } }`, keyed by the call's full name, with its arguments type-checked. A call that takes no arguments writes `true`, and the arguments may be left out when every one is optional. A plugin's helpers write their calls with these writers, never with a key built from the plugin's id.

The writer also has `call`, the full name (`'loyalty/stamps'`), `args`, the call's [`ArgShape`](#callshapes-and-argshape), and `read(args)`, which reads arguments as content wrote them the way the call's function gets them. A [guard](/docs/0.1.0/reference/plugin-api#guard) or a [price](/docs/0.1.0/reference/plugin-api#price) that looks through a list of effects uses `call` and `read`:

```ts given
import { callOf, type Effect } from '@ifloom/engine'
import { CALLS } from './calls.ts'

declare const effects: readonly Effect[]

const stamps = effects.filter((effect) => callOf(effect)?.name === CALLS.effects.stamp.call).length
const full = CALLS.conditions.stamps({ card: 'cafe', gte: 5 })
```

## CallShapes and ArgShape

`ArgShape` is what one call takes, its [arguments](#arg) by name, and `CallShapes` is what [`defineCalls`](#definecalls) is given, an `ArgShape` per call by table. Their types are in [`CallShapes`](/docs/0.1.0/api/engine-plugin#callshapes) and [`ArgShape`](/docs/0.1.0/api/engine-plugin#argshape).

`{}` is a call that takes no arguments, which content writes as `true`. The tables are `conditions`, `effects` and `commands`. A plugin's values and queries aren't declared here: a value gets [`PluginArgs`](/docs/0.1.0/reference/plugin-api#pluginargs), and a query's answer is typed in [`QueryRegistry`](#conditionregistry-effectregistry-commandregistry-queryregistry-and-viewregistry).

```ts fragment
{ conditions: { full: {} }, effects: { stamp: { card: arg.string() } } }
```

## Arg

One argument of a call, as [`arg`](#arg-1) makes it, which reads what content wrote (`In`) into what the function gets (`Out`). Every member is in [`Arg`](/docs/0.1.0/api/engine-plugin#arg).

`read(value)` returns what the function gets for whatever content wrote, `fits(value)` says whether content's value has the right shape, and `refs(value, game)` lists what the value names, for the checker. `kind` names what a value must be in the checker's words, such as `'a number'`, and `words` is set when the value is words a player reads. A plugin writes `Arg` itself only to type a helper that makes arguments, as a [trait kind](/docs/0.1.0/reference/plugin-views#traitkind)'s `arg()` does.

```ts
import { arg, type Arg } from '@ifloom/engine/plugin'

export const count = (): Arg<number, number, false> => arg.number().rule((n) => (n >= 1 ? undefined : 'count must be 1 or more'))
```

## ArgIn, ArgOut, ArgsIn and ArgsOut

The two sides of one argument and of a whole call. `ArgIn` and `ArgsIn` are what content writes, with an optional argument optional, and `ArgOut` and `ArgsOut` are what the function gets, every argument read. Their types are in [`ArgIn`](/docs/0.1.0/api/engine-plugin#argin), [`ArgOut`](/docs/0.1.0/api/engine-plugin#argout), [`ArgsIn`](/docs/0.1.0/api/engine-plugin#argsin) and [`ArgsOut`](/docs/0.1.0/api/engine-plugin#argsout).

A helper types its parameter with `ArgsIn`, and code that reads a call's arguments as the plugin's function would uses `ArgsOut`.

```ts
import type { ArgsIn } from '@ifloom/engine/plugin'
import { CALLS } from './calls.ts'

export const stamp = (args: ArgsIn<typeof CALLS.effects.stamp.args> = {}) => CALLS.effects.stamp(args)
```

## WrittenAs

What content writes as a call's value: `true` (or `{}`) for a call that takes nothing, its arguments or `true` when every argument may be left out, and its arguments otherwise. Its type is in [`WrittenAs`](/docs/0.1.0/api/engine-plugin#writtenas).

Each registry entry that [`ConditionsOf`, `EffectsOf` and `CommandsOf`](#conditionsof-effectsof-and-commandsof) build is a `WrittenAs`, so `'loyalty/stamp'` accepts `true` and `'loyalty/stamps'` needs `{ card }`.

```ts fragment
{ 'loyalty/stamp': true }
{ 'loyalty/stamp': { card: 'market' } }
```

## CallArgs

What each call's function in one table gets, by call name, so `CallArgs<typeof CALLS, 'conditions'>['stamps']` is `{ card: string; gte: number }`. Its type is in [`CallArgs`](/docs/0.1.0/api/engine-plugin#callargs).

A plugin uses it to type a function written apart from `definePlugin`, such as a condition kept in a file of its own.

```ts
import type { GameState } from '@ifloom/engine'
import { arg, defineCalls, type CallArgs } from '@ifloom/engine/plugin'

const CALLS = defineCalls('loyalty', { conditions: { stamps: { card: arg.string(), gte: arg.number().optional(1) } } })

export const hasStamps = (_state: GameState, { gte }: CallArgs<typeof CALLS, 'conditions'>['stamps']) => gte > 0
```

## ConditionsOf, EffectsOf and CommandsOf

A declaration's registry entries for one table, each call by full name with its [`WrittenAs`](#writtenas). Their types are in [`ConditionsOf`](/docs/0.1.0/api/engine-plugin#conditionsof), [`EffectsOf`](/docs/0.1.0/api/engine-plugin#effectsof) and [`CommandsOf`](/docs/0.1.0/api/engine-plugin#commandsof).

A plugin extends the [registries](#conditionregistry-effectregistry-commandregistry-queryregistry-and-viewregistry) with them in its main entry, so it never writes those entries by hand and they can't drift from what its functions get:

```ts
import { arg, defineCalls, type CommandsOf, type ConditionsOf, type EffectsOf } from '@ifloom/engine/plugin'

const CALLS = defineCalls('loyalty', {
  conditions: { stamps: { card: arg.string(), gte: arg.number().optional(1) } },
  effects: { stamp: { card: arg.string().optional('cafe'), note: arg.words().optional() } },
  commands: { redeem: { id: arg.string() } },
})

declare module '@ifloom/engine' {
  interface ConditionRegistry extends ConditionsOf<typeof CALLS> {}
  interface EffectRegistry extends EffectsOf<typeof CALLS> {}
  interface CommandRegistry extends CommandsOf<typeof CALLS> {}
}
```

## ConditionRegistry, EffectRegistry, CommandRegistry, QueryRegistry and ViewRegistry

The interfaces in `@ifloom/engine` that a plugin, or the game, adds to so that content written in TypeScript has its calls type-checked. Their types are in [`ConditionRegistry`](/docs/0.1.0/api/engine#conditionregistry), [`EffectRegistry`](/docs/0.1.0/api/engine#effectregistry), [`CommandRegistry`](/docs/0.1.0/api/engine#commandregistry), [`QueryRegistry`](/docs/0.1.0/api/engine#queryregistry) and [`ViewRegistry`](/docs/0.1.0/api/engine#viewregistry).

| Key | Meaning |
|---|---|
| `ConditionRegistry` | Each condition by full name, with what content writes as its value, from [`ConditionsOf`](#conditionsof-effectsof-and-commandsof). |
| `EffectRegistry` | Each effect the same way, from `EffectsOf`. |
| `CommandRegistry` | Each command the same way, from `CommandsOf`. |
| `QueryRegistry` | Each query by full name, as a function from its arguments to its answer, such as `'loyalty/stampsLeft': () => number`. It extends [`PartnerQueries`](/docs/0.1.0/reference/plugin-queries#partnerqueries). |
| `ViewRegistry` | Each plugin's entry in [`view.plugins`](/docs/0.1.0/reference/view#view), keyed by plugin id, such as `loyalty: LoyaltyView`. The game's own `rules.view` is `game`. |

The engine declares them empty, apart from `QueryRegistry`'s partner queries. A name nobody declares stays loose and takes any arguments, as a [`PluginCall`](/docs/0.1.0/reference/custom#plugincall), so a plugin that declares nothing still compiles. A plugin sees only the declarations of the packages it imports, so its calls to a partner it doesn't import stay loose in its own code and are checked in a game that has both. Every first-party plugin declares all its calls, its queries and its view.

```ts
export type LoyaltyView = { stamps: number; free: number }

declare module '@ifloom/engine' {
  interface QueryRegistry {
    'loyalty/stampsLeft': () => number
  }
  interface ViewRegistry {
    loyalty: LoyaltyView
  }
}
```

The game declares its own `game/…` calls by hand beside its [`rules`](/docs/0.1.0/reference/rules), in `src/rules.ts`, since `rules` has no `calls`. The showcase declares its `game/postLatest` this way, and the café its `game/takings` and `game/wages`:

```ts
import type { GameRules } from '@ifloom/engine'

declare module '@ifloom/engine' {
  interface EffectRegistry {
    'game/payRent': { by?: number } | true
  }
}

export const rules: GameRules = {
  macros: { payRent: (_state, args) => [{ stat: 'coins', by: -Number(args.by ?? 10) }] },
}
```

## ConditionCall, EffectCall and CommandCall

A plugin's or the game's call in the short form, type-checked against its registry when its name is declared there and loose otherwise. Their types are in [`ConditionCall`](/docs/0.1.0/api/engine#conditioncall), [`EffectCall`](/docs/0.1.0/api/engine#effectcall) and [`CommandCall`](/docs/0.1.0/api/engine#commandcall).

[`Condition`](/docs/0.1.0/reference/conditions#condition) and [`Effect`](/docs/0.1.0/reference/effects#effect) end in a `ConditionCall` and an `EffectCall`, and a [`CommandRef`](/docs/0.1.0/reference/custom#commandref) is a command or a `CommandCall`. So once a game imports the plugin's package, its calls are checked wherever a condition, an effect or a command goes:

```ts
import type { Condition } from '@ifloom/engine'

export const full: Condition = { 'loyalty/stamps': { card: 'cafe', gte: 5 } }
```

## CallIn

One call in the short form per name a registry `R` declares, with what that name takes, or a [`PluginCall`](/docs/0.1.0/reference/custom#plugincall) to any name `R` doesn't declare. Its type is in [`CallIn`](/docs/0.1.0/api/engine-plugin#callin).

`ConditionCall` is `CallIn<ConditionRegistry>`. A plugin uses `CallIn` to type content against a registry of its own.

```ts
import type { CallIn } from '@ifloom/engine/plugin'

interface Signs {
  'stall/sign': { text: string }
}

export const sign: CallIn<Signs> = { 'stall/sign': { text: 'Fresh bread' } }
```

## ListSpec

One list of the plugin's `data` as [`list`](#definedata-and-list) declares it, before `defineData` makes it a [`DataList`](#datalist). Every field is in [`ListSpec`](/docs/0.1.0/api/engine-plugin#listspec).

`noun` names one entry in a problem, as in `unknown card "gold"`. `words` is a [`WordShape`](/docs/0.1.0/reference/words#wordshape) naming the fields of an entry that are words a player reads, so a translation's [words table](/docs/0.1.0/reference/words) reaches them under `<plugin>/<list>.<id>.<field>`. A card's name is then `loyalty/cards.cafe.name`, and a perk's label `loyalty/cards.cafe.perks.coffee.label`.

```ts
import { list } from '@ifloom/engine/plugin'

type CardDef = { id: string; name: string; perks: { id: string; label: string }[] }

export const cards = list<CardDef>({ noun: 'card', words: { name: true, perks: [{ label: true }] } })
```

[`translatableFields`](/docs/0.1.0/reference/words#translatablefields) lists these fields with the rest of the game's. A field the list's `words` leaves out isn't in the words table, and the plugin's own lines, such as refusals, stay in its [`strings`](/docs/0.1.0/reference/plugin-api#strings).

## DataList

One of the plugin's lists, as [`defineData`](#definedata-and-list) makes it, with where it is, its noun, its words and its lookups. Every member is in [`DataList`](/docs/0.1.0/api/engine-plugin#datalist).

| Field | Meaning |
|---|---|
| `all(game)` | The method that returns every entry of `data.<plugin>.<list>` in order, typed, leaving out anything that isn't an object with an id. |
| `get(game, id)` | The method that returns one entry by id, or `undefined` for an id that isn't text or that the game doesn't have. |
| `ref(id)` | The method that returns the [reference](/docs/0.1.0/reference/checks#reference) to one entry, so the checker reports `unknown card "gold"`. |
| `content(game, fn)` | The method that returns what each entry names for [`references.content`](/docs/0.1.0/reference/plugin-checks#pluginreferences-calltable-and-contentreferences), at `cards <id>`. |
| `problem(id, what)` | The method that returns a [`PluginProblem`](/docs/0.1.0/reference/plugin-checks#pluginproblem) about one entry, for [`check`](/docs/0.1.0/reference/plugin-checks#check). |

An argument names an entry with [`arg.entry(DATA.cards)`](#arg-1). A plugin's lookups are its lists' `all` and `get`:

```ts
import type { Game } from '@ifloom/engine'
import { DATA } from './calls.ts'

export const cardsOf = (game: Game) => DATA.cards.all(game)
export const cardOf = (game: Game, id: string) => DATA.cards.get(game, id)
```

## PluginData

What [`defineData`](#definedata-and-list) returns: a [`DataList`](#datalist) for each list by name, typed by its entry. Its type is in [`PluginData`](/docs/0.1.0/api/engine-plugin#plugindata).

A plugin passes it as its [`data`](/docs/0.1.0/reference/plugin-api#plugin), which is how a translation reaches each list's words.

```ts fragment
definePlugin({ id: 'loyalty', version: 1, data: DATA })
```

## Functions

### defineCalls

Returns a [`PluginCalls`](#plugincalls-and-anycalls) from the plugin's id and its [`CallShapes`](#callshapes-and-argshape). Its signature is in [`defineCalls`](/docs/0.1.0/api/engine-plugin#definecalls).

`definePlugin` throws when the id isn't the plugin's own. The declaration goes at the top of the plugin's module, outside its factory, since the registries are built from its type. A factory's options are read inside the functions, or in [`references.calls`](/docs/0.1.0/reference/plugin-checks#pluginreferences-calltable-and-contentreferences) for what an argument names that depends on them, as the cast does with the kind its people are.

```ts
import { arg, defineCalls } from '@ifloom/engine/plugin'

export const CALLS = defineCalls('loyalty', {
  conditions: { full: {} },
  effects: { stamp: { card: arg.string().optional('cafe') } },
})
```

### arg

The arguments a call can take, each an [`Arg`](#arg) that reads what content wrote into what the function gets. Its members are in [`arg`](/docs/0.1.0/api/engine-plugin#arg-1).

| Key | Meaning |
|---|---|
| `string()` | Text, handed as `''` when missing. |
| `words()` | Words a player reads, handed as text, which a translation's words table reaches. |
| `number()` | A number, handed as `0` when it isn't one. |
| `boolean()` | `true` or `false`, handed as `true` only for `true`. |
| `strings()`, `numbers()` | One or a list, handed as a list. |
| `entity(trait?)` | An entity reference, which the checker resolves, carrying `trait` if one is given. |
| `holder()` | `'player'`, `'you'` or a unique entity, which the checker resolves. |
| `kv()` | A true or false, a number or text. |
| `amount()` | An [`Amount`](/docs/0.1.0/reference/amounts#amount), handed for [`amountOf`](/docs/0.1.0/reference/amounts#amountof), whose shape and names the checker reads. |
| `range()` | A [`Range`](/docs/0.1.0/reference/common#range) such as `{ gte: 2 }`, whose amount bounds the checker reads. |
| `entry(list)`, `entries(list)` | An entry's id from a [`DataList`](#datalist), or a list of them, which the checker resolves as `unknown card "gold"`. |
| `bounds` | `gte`, `gt`, `lte` and `lt` beside the call's own arguments, each `undefined` when missing, which the engine checks and works out before asking. |

Each argument has three methods that return a new argument:

- `.optional()` lets content leave it out, and the function gets `undefined` then. `.optional(1)` gives `1` instead.
- `.naming(fn)` adds what a value names, as references: `arg.string().naming((id): Reference[] => [{ scene: id }])`.
- `.rule(fn)` adds a rule of the plugin's own about a value, returning the checker's words or `undefined` when nothing is wrong.

A function passed to `.naming()` inside `defineCalls` needs its return type, `(id): Reference[] => [...]`, or the registries built from the declaration refer to themselves and TypeScript gives up. A function declared outside with its return type doesn't, and `.rule()` returns words, so it doesn't either.

```ts
import { arg } from '@ifloom/engine/plugin'

export const note = arg.words().optional()
export const count = arg.number().rule((n) => (n >= 1 ? undefined : 'count must be 1 or more'))
```

An argument made with `arg.words()` in an effect is keyed in the words table under the entry the effect is written in, then the call's full name and a hash of its words, as a notice is: `action.buy.loyalty/stamp.<hash>.note`. The [feed plugin](/docs/0.1.0/reference/plugins/feed) declares a post's and a comment's `text` this way.

### defineData and list

`defineData` returns a [`PluginData`](#plugindata) from the plugin's id and its lists by name, and `list<T>` declares one list, whose type argument is an entry's type. Their signatures are in [`defineData`](/docs/0.1.0/api/engine-plugin#definedata) and [`list`](/docs/0.1.0/api/engine-plugin#list).

Content writes the entries in its `data`, by plugin id and then by list name (see [`data`](/docs/0.1.0/reference/content#data)). The engine reads only each entry's `id`, and the list's type gives its other fields theirs.

```ts
import { defineData, list } from '@ifloom/engine/plugin'

export const DATA = defineData('loyalty', {
  cards: list<{ id: string; name: string; stampsToFill: number }>({ noun: 'card', words: { name: true } }),
})
```

## Checks

The [content checker](/docs/0.1.0/reference/checks) checks every call to a declared condition, effect or command, wherever content writes it, before it asks the plugin's [`references.calls`](/docs/0.1.0/reference/plugin-checks#pluginreferences-calltable-and-contentreferences):

| Problem | Cause |
|---|---|
| `"loyalty/stamps" needs "card"` | Content leaves out an argument the call doesn't mark optional. |
| `"loyalty/stamps"'s "gte" must be a number` | An argument has the wrong shape. |
| `"loyalty/stamps" takes no "gtee"` | Content passes an argument the call doesn't declare. |
| `unknown card "gold"` | An argument names an entry, entity or other thing the game doesn't have. |
| `no plugin effect named "loyalty/stomp"` | The plugin declares no call by that name. |

A command sent with an argument of the wrong shape is refused before it runs, with the [`badArgument`](/docs/0.1.0/reference/strings#refusals) string.

## Caveats

- The registries type content written in TypeScript only. A pack loaded from JSON, or a mod, isn't compiled, so the content checker reports its bad calls from the declarations.
- A plugin's calls to a partner are loose in the plugin's own code, since it never imports the partner. The queries first-party plugins ask each other are typed everywhere through [`PartnerQueries`](/docs/0.1.0/reference/plugin-queries#partnerqueries).
