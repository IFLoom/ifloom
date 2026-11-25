---
title: "@ifloom/engine/plugin"
description: "Every export of @ifloom/engine/plugin, the entry for writing a plugin: its signature and its fields."
---
Generated from the source of `@ifloom/engine/plugin` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

- Functions: [`actionReferences`](#actionreferences), [`anyOf`](#anyof), [`bindCurrent`](#bindcurrent), [`defineCalls`](#definecalls), [`defineData`](#definedata), [`definePlugin`](#defineplugin), [`defineTraitKind`](#definetraitkind), [`entityUi`](#entityui), [`list`](#list), [`lockedOut`](#lockedout), [`lockOn`](#lockon), [`panelOf`](#panelof), [`parseBeats`](#parsebeats), [`pictureView`](#pictureview), [`priceView`](#priceview), [`renderAction`](#renderaction), [`setTraitState`](#settraitstate), [`speakerOf`](#speakerof), [`styledBeats`](#styledbeats), [`traitState`](#traitstate)
- Constants: [`arg`](#arg-1)
- Types: [`AnyCalls`](#anycalls), [`Arg`](#arg), [`ArgIn`](#argin), [`ArgOut`](#argout), [`ArgShape`](#argshape), [`ArgsIn`](#argsin), [`ArgsOut`](#argsout), [`Asked`](#asked), [`CallArgs`](#callargs), [`CallForm`](#callform), [`CallIn`](#callin), [`CallShapes`](#callshapes), [`CallTable`](#calltable), [`CallWriter`](#callwriter), [`CastContact`](#castcontact), [`CheckTools`](#checktools), [`CommandsOf`](#commandsof), [`CommandStep`](#commandstep), [`ConditionsOf`](#conditionsof), [`ContentReferences`](#contentreferences), [`ContentStep`](#contentstep), [`ContentTools`](#contenttools), [`DataList`](#datalist), [`DefinedPlugin`](#definedplugin), [`EffectsOf`](#effectsof), [`ListSpec`](#listspec), [`Lock`](#lock), [`LockTarget`](#locktarget), [`Macro`](#macro), [`PackContext`](#packcontext), [`PartnerQueries`](#partnerqueries), [`Plugin`](#plugin), [`PluginArgs`](#pluginargs), [`PluginCalls`](#plugincalls), [`PluginCommand`](#plugincommand), [`PluginContext`](#plugincontext), [`PluginData`](#plugindata), [`PluginDef`](#plugindef), [`PluginEntry`](#pluginentry), [`PluginProblem`](#pluginproblem), [`PluginReferences`](#pluginreferences), [`PluginSlice`](#pluginslice), [`QueryAnswer`](#queryanswer), [`QueryArgs`](#queryargs), [`RawCall`](#rawcall), [`RawCommand`](#rawcommand), [`Reference`](#reference), [`Refusal`](#refusal), [`RoomScene`](#roomscene), [`SenderView`](#senderview), [`SpeakerFinder`](#speakerfinder), [`StatModifier`](#statmodifier), [`TraitDef`](#traitdef), [`TraitEntityDef`](#traitentitydef), [`TraitKind`](#traitkind), [`TraitKindSpec`](#traitkindspec), [`TraitTools`](#traittools), [`TurnContext`](#turncontext), [`WrittenAs`](#writtenas)

## actionReferences

Function. Explained in [Actions](/docs/reference/actions#actionreferences).

Returns the references an action makes, for the content checker. They cover its words, conditions, effects, command
and hints.

A plugin whose content holds actions (a location's, an app's) passes these to its `references`.

```ts shape
import { actionReferences } from '@ifloom/engine/plugin'
function actionReferences(action: ActionDef): Reference[]
```

Uses: [`ActionDef`](/docs/api/engine#actiondef), [`Reference`](#reference).

## AnyCalls

Type. Explained in [Declaring a plugin's calls](/docs/reference/plugin-calls#plugincalls-and-anycalls).

Any plugin's `PluginCalls`, with each call's full name and arguments, by table.

```ts shape
import type { AnyCalls } from '@ifloom/engine/plugin'
type AnyCalls = {
  readonly id: string
  readonly conditions: Readonly<Record<string, { readonly call: string; readonly args: ArgShape }>>
  readonly effects: Readonly<Record<string, { readonly call: string; readonly args: ArgShape }>>
  readonly commands: Readonly<Record<string, { readonly call: string; readonly args: ArgShape }>>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The plugin's id. |
| `conditions` | `Readonly<Record<string, { readonly call: string; readonly args:` [`ArgShape`](#argshape) `}>>` |  |  | The plugin's conditions, by name. |
| `effects` | `Readonly<Record<string, { readonly call: string; readonly args:` [`ArgShape`](#argshape) `}>>` |  |  | The plugin's effects, by name. |
| `commands` | `Readonly<Record<string, { readonly call: string; readonly args:` [`ArgShape`](#argshape) `}>>` |  |  | The plugin's commands, by name. |

## anyOf

Function. Explained in [Entities](/docs/reference/entities#anyof).

Returns a stand-in reference for any entity of a kind, for checking content written with `'$'` before it runs.

```ts shape
import { anyOf } from '@ifloom/engine/plugin'
function anyOf(kind: string): EntityRef
```

Uses: [`EntityRef`](/docs/api/engine#entityref).

## Arg

Type. Explained in [Declaring a plugin's calls](/docs/reference/plugin-calls#arg).

One argument of a plugin's call, made with `arg`. `In` is the type content writes, and `Out` the type the
implementation gets, read from whatever content wrote.

It also says whether content may leave it out, how the checker describes the right shape, and what a value names.

```ts shape
import type { Arg } from '@ifloom/engine/plugin'
type Arg<In = unknown, Out = In, Optional extends boolean = boolean> = {
  readonly kind: string
  readonly isOptional: Optional
  readonly words?: WordPart
  read: (value: unknown) => Out
  fits: (value: unknown) => boolean
  refs: (value: Out, game: Game) => readonly Reference[]
  optional: { (): Arg<In, Out | undefined, true>; <F extends Out>(fallback: F): Arg<In, Out, true>; }
  naming: (refs: (value: Exclude<Out, undefined>, game: Game) => readonly Reference[]) => Arg<In, Out, Optional>
  rule: (problem: (value: Exclude<Out, undefined>) => string | undefined) => Arg<In, Out, Optional>
  readonly _in?: In
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `kind` | `string` |  |  | The shape a value must have, in the checker's words, such as `'text'` or `'a number'`. |
| `isOptional` | `Optional` |  |  | True when content may leave the argument out. |
| `words` | [`WordPart`](/docs/api/engine#wordpart) | yes |  | The argument's word shape, set when its value is words a player reads that a translation can replace. |
| `read` | `(value: unknown) => Out` |  |  | Returns the value the implementation gets for content's value, whatever content wrote. |
| `fits` | `(value: unknown) => boolean` |  |  | Returns true when content's value has the right shape. The checker asks it only of a value content wrote. |
| `refs` | `(value: Out, game:` [`Game`](/docs/api/engine#game)`) => readonly` [`Reference[]`](#reference) |  |  | Returns the references a value makes for the checker, such as a location, an entry or a `{ problem }`. |
| `optional` | `{ ():` [`Arg`](#arg)`<In, Out \| undefined, true>; <F extends Out>(fallback: F):` [`Arg`](#arg)`<In, Out, true>; }` |  |  | Returns the same argument, which content may leave out. The implementation then gets `undefined`, or `fallback` when one is given. |
| `naming` | `(refs: (value: Exclude<Out, undefined>, game:` [`Game`](/docs/api/engine#game)`) => readonly` [`Reference[]`](#reference)`) =>` [`Arg`](#arg)`<In,…` |  |  | Returns the same argument, making these references too, as in `arg.string().naming(placeRefs)`. Inside `defineCalls`, give an inline function its return type, `(id): Reference[] => [...]`, or the registries built from the calls refer to themselves. |
| `rule` | `(problem: (value: Exclude<Out, undefined>) => string \| undefined) =>` [`Arg`](#arg)`<In, Out,…` |  |  | Returns the same argument with a rule of the plugin's own about its value. The rule returns the problem in the checker's words, or undefined when there is none. `arg.number().rule((n) => (n >= 1 ? undefined : 'count must be 1 or more'))`. |
| `_in` | `In` | yes |  | The type content writes, for type inference only. It is never set. |

## arg

Const. Explained in [Declaring a plugin's calls](/docs/reference/plugin-calls#arg-1).

The makers of the `Arg`s a call can take, for `defineCalls`. Each reads content's value into the value the
implementation gets, whatever content wrote, and the checker reports a value of the wrong shape.

A missing text reads as `''`, and a single value as a list of one. `.optional()` lets content leave an argument out,
`.optional(1)` with the value the implementation then gets. `.naming(fn)` adds the references a value makes, as in
`arg.string().naming((id) => [{ scene: id }])`.

```ts shape
import { arg } from '@ifloom/engine/plugin'
const arg: {
  string: () => Arg<string, string, false>
  words: () => Arg<string, string, false>
  number: () => Arg<number, number, false>
  boolean: () => Arg<boolean, boolean, false>
  strings: () => Arg<string | readonly string[], string[], false>
  numbers: () => Arg<number | readonly number[], number[], false>
  entity: (trait?: string | undefined) => Arg<`${string}:${string}`, `${string}:${string}`, false>
  holder: () => Arg<Holder, Holder, false>
  kv: () => Arg<KvValue, KvValue, false>
  amount: () => Arg<Amount, Amount, false>
  range: () => Arg<Range, Range, false>
  entry: (list: DataList<any>) => Arg<string, string, false>
  entries: (list: DataList<any>) => Arg<string | readonly string[], string[], false>
  bounds: { gte: Arg<Amount, Amount | undefined, true>; gt: Arg<Amount, Amount | undefined, true>; lte: Arg<Amount, Amount | undefined, true>; lt: Arg<Amount, Amount | undefined, true>; }
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `string` | `() =>` [`Arg`](#arg)`<string, string, false>` |  |  | Returns a text argument, such as `'cafe'`. It reads as `''` when missing. |
| `words` | `() =>` [`Arg`](#arg)`<string, string, false>` |  |  | Returns a text argument of words a player reads, such as a post's text, which a translation can replace. |
| `number` | `() =>` [`Arg`](#arg)`<number, number, false>` |  |  | Returns a number argument, such as `2`. It reads as `0` when missing or not a number. |
| `boolean` | `() =>` [`Arg`](#arg)`<boolean, boolean, false>` |  |  | Returns a true or false argument. It reads as false unless content wrote `true`. |
| `strings` | `() =>` [`Arg`](#arg)`<string \| readonly string[], string[], false>` |  |  | Returns an argument of one text or a list, `'cafe'` or `['cafe', 'park']`, which the implementation gets as a list. |
| `numbers` | `() =>` [`Arg`](#arg)`<number \| readonly number[], number[], false>` |  |  | Returns an argument of one number or a list, which the implementation gets as a list. |
| `entity` | `(trait?: string \| undefined) =>` [`Arg`](#arg)`<'${string}:${string}', '${string}:${string}', false>` |  |  | Returns an entity reference argument, such as `'food:bun'`. The checker must find the entity, carrying `trait` when one is given. |
| `holder` | `() =>` [`Arg`](#arg)`<`[`Holder`](/docs/api/engine#holder)`,` [`Holder`](/docs/api/engine#holder)`, false>` |  |  | Returns a holder argument, `'player'`, `'you'` or a unique entity. The checker must find the holder. |
| `kv` | `() =>` [`Arg`](#arg)`<`[`KvValue`](/docs/api/engine#kvvalue)`,` [`KvValue`](/docs/api/engine#kvvalue)`, false>` |  |  | Returns a kv value argument, true or false, a number or text. |
| `amount` | `() =>` [`Arg`](#arg)`<`[`Amount`](/docs/api/engine#amount)`,` [`Amount`](/docs/api/engine#amount)`, false>` |  |  | Returns an `Amount` argument, worked out when the implementation reads it with `amountOf`. The checker resolves the references it makes. |
| `range` | `() =>` [`Arg`](#arg)`<`[`Range`](/docs/api/engine#range)`,` [`Range`](/docs/api/engine#range)`, false>` |  |  | Returns a range argument, such as `stacks: { gte: 2 }`. Its bounds are amounts, and the checker resolves the references they make. |
| `entry` | `(list:` [`DataList`](#datalist)`<any>) =>` [`Arg`](#arg)`<string, string, false>` |  |  | Returns an argument naming an entry of one of the plugin's data lists by id, as in `arg.entry(DATA.jobs)`. The checker reports an id the list doesn't have. |
| `entries` | `(list:` [`DataList`](#datalist)`<any>) =>` [`Arg`](#arg)`<string \| readonly string[], string[], false>` |  |  | Returns an argument naming one entry of a data list or several, which the implementation gets as a list. The checker reports each as `entry` does. |
| `bounds` | `{ gte:` [`Arg`](#arg)`<`[`Amount`](/docs/api/engine#amount)`,` [`Amount`](/docs/api/engine#amount) `\| undefined, true>; gt:` [`Arg`](#arg)`<`[`Amount`](/docs/api/engine#amount)`,` [`Amount`](/docs/api/engine#amount) `\| undefined, true>;…` |  |  | The optional `gte`, `gt`, `lte` and `lt` arguments of a range, as the call's own arguments (`{ job: 'cafe', gte: 3 }`). Spread them into a shape, as in `{ job: arg.entry(DATA.jobs), ...arg.bounds }`. The core checks a call's bounds itself. |

## ArgIn

Type. Explained in [Declaring a plugin's calls](/docs/reference/plugin-calls#argin-argout-argsin-and-argsout).

The type content writes for an `Arg`.

```ts shape
import type { ArgIn } from '@ifloom/engine/plugin'
type ArgIn<A> = A extends Arg<infer In, any, any> ? In : never
```

Uses: [`Arg`](#arg).

## ArgOut

Type. Explained in [Declaring a plugin's calls](/docs/reference/plugin-calls#argin-argout-argsin-and-argsout).

The type the implementation gets for an `Arg`.

```ts shape
import type { ArgOut } from '@ifloom/engine/plugin'
type ArgOut<A> = A extends Arg<any, infer Out, any> ? Out : never
```

Uses: [`Arg`](#arg).

## ArgShape

Type. Explained in [Declaring a plugin's calls](/docs/reference/plugin-calls#callshapes-and-argshape).

The arguments one call takes, by name. It is `{}` for a call with none, which content writes as `true`.

```ts shape
import type { ArgShape } from '@ifloom/engine/plugin'
type ArgShape = {
  [key: string]: Arg<any, any, boolean>
}
```

## ArgsIn

Type. Explained in [Declaring a plugin's calls](/docs/reference/plugin-calls#argin-argout-argsin-and-argsout).

The arguments content writes for a call of an `ArgShape`, as an object.

```ts fragment
type ArgsIn<S extends ArgShape> = { [K in keyof ({ [K in RequiredKeys<S>]: ArgIn<S[K]>; } & { [K in OptionalKeys<S>]?: ArgIn<S[K]>; })]: ({ [K in RequiredKeys<S>]: ArgIn<S[K]>; } & { [K in OptionalKeys<S>]?: ArgIn<S[K]>; })[K]; }
```

Uses: [`ArgIn`](#argin).

## ArgsOut

Type. Explained in [Declaring a plugin's calls](/docs/reference/plugin-calls#argin-argout-argsin-and-argsout).

The arguments the implementation of a call of an `ArgShape` gets, every one read.

```ts shape
import type { ArgsOut } from '@ifloom/engine/plugin'
type ArgsOut<S extends ArgShape> = {
  [key: string]: { [K in keyof S]: ArgOut<S[K]>; }[string]
}
```

## Asked

Type. Explained in [Plugin API](/docs/reference/plugin-api#asked-and-refusal).

The question a plugin's `guard` gets, a command with the effects it would apply.

```ts shape
import type { Asked } from '@ifloom/engine/plugin'
type Asked = {
  command: Command
  effects: readonly Effect[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `command` | [`Command`](/docs/api/engine#command) |  |  | The command the guard is asked about. |
| `effects` | `readonly` [`Effect[]`](/docs/api/engine#effect) |  |  | The effects the command would apply. |

## bindCurrent

Function. Explained in [Entities](/docs/reference/entities#bindcurrent).

Returns a condition or effects with `ref` in place of each `'$'`. A nested `each`'s effects and a nested `count`'s
`where` keep their own `'$'`.

It replaces `'$'` in every `of`, `entity`, `at` and `like`, in a `remove`, `move` or `you` effect's target, in a
`move`'s `from` and `to`, and anywhere in a call's arguments or a `create`'s `with`
(`{ 'cast/met': { character: '$' } }`).

```ts shape
import { bindCurrent } from '@ifloom/engine/plugin'
function bindCurrent<T extends Condition | EffectRef | readonly EffectRef[] | undefined>(value: T, ref: EntityRef): T
```

Uses: [`Condition`](/docs/api/engine#condition), [`EffectRef`](/docs/api/engine#effectref), [`EntityRef`](/docs/api/engine#entityref).

## CallArgs

Type. Explained in [Declaring a plugin's calls](/docs/reference/plugin-calls#callargs).

The arguments the implementation of each call in a table gets, by name.

```ts fragment
type CallArgs<C, T extends keyof CallShapes> = { [K in keyof ShapesOf<C, T>]: ShapesOf<C, T>[K] extends ArgShape ? { [K in keyof { [K in keyof ShapesOf<C, T>[K]]: ArgOut<ShapesOf<C, T>[K][K]>; }]: { [K in keyof ShapesOf<C, T>[K]]: ArgOut<ShapesOf<C, T>[K][K]>; }[K]; } : never; }
```

Uses: [`ArgShape`](#argshape), [`ArgOut`](#argout).

## CallForm

Type. Explained in [Plugin migrations](/docs/reference/plugin-migrations#callform).

The form a plugin call is written in, `short`, `long` or `command`. See `ContentTools.calls`.

```ts shape
import type { CallForm } from '@ifloom/engine/plugin'
type CallForm = 'short' | 'long' | 'command'
```

## CallIn

Type. Explained in [Declaring a plugin's calls](/docs/reference/plugin-calls#callin).

A call in the short form, type-checked against registry `R` when its name is declared there and loose otherwise.

```ts shape
import type { CallIn } from '@ifloom/engine/plugin'
type CallIn<R> =
  | { [K in keyof R & `${string}/${string}`]: { [P in K]: R[K]; }; }[keyof R & `${string}/${string}`]
  | PluginCall & { [K in (keyof R & `${string}/${string}`) | 'achievements/earned' | 'calendar/period' | 'calendar/weekday' | 'calendar/weekend' | 'calendar/day' | 'calendar/curfew' | 'cast/at' | 'cast/here' | 'cast/met' | 'devices/open' | 'feed/appeared' | 'feed/posted' | 'feed/likes' | 'jobs/hired' | 'jobs/fired' | 'jobs/worked' | 'jobs/shifts' | 'messages/since' | 'messages/read' | 'messages/arrived' | 'messages/replied' | 'places/within' | 'places/at' | 'places/away' | 'quests/active' | 'quests/done' | 'quests/reached' | 'shop/open' | 'shop/outside' | 'shop/inStock' | 'statuses/active' | 'unlocks/has' | 'unlocks/cheated' | 'wardrobe/wearing' | 'achievements/grant' | 'calendar/pass' | 'calendar/set' | 'feed/post' | 'feed/react' | 'generators/generate' | 'jobs/hire' | 'jobs/fire' | 'messages/draw' | 'messages/due' | 'places/move' | 'quests/start' | 'statuses/apply' | 'statuses/remove' | 'calendar/sleep' | 'cast/call' | 'cast/talk' | 'debug/kv' | 'debug/turn' | 'debug/stat' | 'debug/scene' | 'debug/go' | 'debug/held' | 'debug/time' | 'devices/home' | 'devices/close' | 'feed/seen' | 'inventory/use' | 'inventory/drop' | 'inventory/give' | 'jobs/apply' | 'jobs/work' | 'jobs/quit' | 'messages/reply' | 'places/go' | 'places/pickUp' | 'quests/seen' | 'quests/track' | 'shop/buy' | 'shop/sell' | 'unlocks/cheat' | 'unlocks/record' | 'wardrobe/wear' | 'wardrobe/takeOff']?: undefined; }
```

Uses: [`PluginCall`](/docs/api/engine#plugincall).

## CallShapes

Type. Explained in [Declaring a plugin's calls](/docs/reference/plugin-calls#callshapes-and-argshape).

The arguments a plugin's calls take, by table and name, as `defineCalls` is given them.

```ts shape
import type { CallShapes } from '@ifloom/engine/plugin'
type CallShapes = {
  conditions?: Readonly<Record<string, ArgShape>>
  effects?: Readonly<Record<string, ArgShape>>
  commands?: Readonly<Record<string, ArgShape>>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `conditions` | `Readonly<Record<string,` [`ArgShape`](#argshape)`>>` | yes |  | The arguments of each of the plugin's conditions, by name. |
| `effects` | `Readonly<Record<string,` [`ArgShape`](#argshape)`>>` | yes |  | The arguments of each of the plugin's effects, by name. |
| `commands` | `Readonly<Record<string,` [`ArgShape`](#argshape)`>>` | yes |  | The arguments of each of the plugin's commands, by name. |

## CallTable

Type. Explained in [A plugin's content checks](/docs/reference/plugin-checks#pluginreferences-calltable-and-contentreferences).

The name of a plugin's table of calls, `conditions`, `effects` or `commands`.

```ts shape
import type { CallTable } from '@ifloom/engine/plugin'
type CallTable = 'conditions' | 'effects' | 'commands'
```

## CallWriter

Type. Explained in [Declaring a plugin's calls](/docs/reference/plugin-calls#callwriter).

A function that writes one call in the short form from its arguments, such as `{ 'places/at': { location } }`.

```ts fragment
type CallWriter<Name extends string, S extends ArgShape> = ([RequiredKeys<S>] extends [never] ? (args?: { [K in keyof ({ [K in RequiredKeys<S>]: ArgIn<S[K]>; } & { [K in OptionalKeys<S>]?: ArgIn<S[K]>; })]: ({ [K in RequiredKeys<S>]: ArgIn<S[K]>; } & { [K in OptionalKeys<S>]?: ArgIn<S[K]>; })[K]; } | undefined) => { [N in Name]: WrittenAs<S>; } : (args: { [K in keyof ({ [K in RequiredKeys<S>]: ArgIn<S[K]>; } & { [K in OptionalKeys<S>]?: ArgIn<S[K]>; })]: ({ [K in RequiredKeys<S>]: ArgIn<S[K]>; } & { [K in OptionalKeys<S>]?: ArgIn<S[K]>; })[K]; }) => { [N in Name]: WrittenAs<S>; }) & { readonly call: Name; readonly args: S; read(args: unknown): { [K in keyof { [K in keyof S]: ArgOut<S[K]>; }]: { [K in keyof S]: ArgOut<S[K]>; }[K]; }; }
```

Uses: [`ArgIn`](#argin), [`WrittenAs`](#writtenas), [`ArgOut`](#argout).

## CastContact

Type. Explained in [Queries and partners](/docs/reference/plugin-queries#castcontact-and-senderview).

A character the player can call, as the cast's `cast/contacts` query answers.

```ts shape
import type { CastContact } from '@ifloom/engine/plugin'
type CastContact = {
  id: string
  name: string
  description: string | null
  image: string | null
  portrait: string | null
  command: CommandRef
  disabled: string | undefined
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The character's id, as the cast names them, such as `'ava'`. |
| `name` | `string` |  |  | The character's name. |
| `description` | `string \| null` |  |  | The character's description, a line about them, or null. |
| `image` | `string \| null` |  |  | The character's picture, through `artSrc`, or null. |
| `portrait` | `string \| null` |  |  | The character's face for a small avatar, or null. |
| `command` | [`CommandRef`](/docs/api/engine#commandref) |  |  | The cast's `cast/call` command for the character, in the short form. |
| `disabled` | `string \| undefined` |  |  | The reason the call can't go through now, or undefined when it can. |

## CheckTools

Type. Explained in [A plugin's content checks](/docs/reference/plugin-checks#checktools).

The tools the content checker gives a plugin's `check`.

```ts shape
import type { CheckTools } from '@ifloom/engine/plugin'
type CheckTools = {
  problems: (refs: readonly Reference[]) => string[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `problems` | `(refs: readonly` [`Reference[]`](#reference)`) => string[]` |  |  | Returns the checker's words for each reference in a list that names something the game doesn't have. |

## CommandsOf

Type. Explained in [Declaring a plugin's calls](/docs/reference/plugin-calls#conditionsof-effectsof-and-commandsof).

The arguments a plugin's commands take, by full name, for its `CommandRegistry`. Use it as `ConditionsOf` is used.

```ts fragment
type CommandsOf<C> = C extends PluginCalls<infer Id extends string, infer D extends CallShapes> ? { [K in keyof Table<D, 'commands'> & string as `${Id}/${K}`]: Table<D, 'commands'>[K] extends ArgShape ? WrittenAs<Table<D, 'commands'>[K]> : never; } : never
```

Uses: [`PluginCalls`](#plugincalls), [`CallShapes`](#callshapes), [`ArgShape`](#argshape), [`WrittenAs`](#writtenas).

## CommandStep

Type. Explained in [Plugin migrations](/docs/reference/plugin-migrations#commandstep).

A step of a plugin's `commandMigrations`, which returns a log's command reshaped from one command version to the
next. It gets every command, so it returns the ones that aren't its own unchanged.

```ts shape
import type { CommandStep } from '@ifloom/engine/plugin'
type CommandStep = (command: RawCommand) => RawCommand
```

Uses: [`RawCommand`](#rawcommand).

## ConditionsOf

Type. Explained in [Declaring a plugin's calls](/docs/reference/plugin-calls#conditionsof-effectsof-and-commandsof).

The arguments a plugin's conditions take, by full name, for its `ConditionRegistry`. Extend the registry from it.

```ts fragment
declare module '@ifloom/engine' {
  interface ConditionRegistry extends ConditionsOf<typeof CALLS> {}
}
```

```ts fragment
type ConditionsOf<C> = C extends PluginCalls<infer Id extends string, infer D extends CallShapes> ? { [K in keyof Table<D, 'conditions'> & string as `${Id}/${K}`]: Table<D, 'conditions'>[K] extends ArgShape ? WrittenAs<Table<D, 'conditions'>[K]> : never; } : never
```

Uses: [`PluginCalls`](#plugincalls), [`CallShapes`](#callshapes), [`ArgShape`](#argshape), [`WrittenAs`](#writtenas).

## ContentReferences

Type. Explained in [A plugin's content checks](/docs/reference/plugin-checks#pluginreferences-calltable-and-contentreferences).

The references one entry of a plugin's content makes.

```ts shape
import type { ContentReferences } from '@ifloom/engine/plugin'
type ContentReferences = {
  list: string
  id: string
  refs: readonly Reference[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `list` | `string` |  |  | The name of the plugin's list the entry is in. |
| `id` | `string` |  |  | The entry's id. |
| `refs` | `readonly` [`Reference[]`](#reference) |  |  | The references the entry makes. |

## ContentStep

Type. Explained in [Plugin migrations](/docs/reference/plugin-migrations#contentstep).

A step of a plugin's `contentMigrations`, which returns the whole pack reshaped from one content version to the
next. It returns a new pack and never changes the one it was given.

A step changes only the plugin's own `data`, calls, strings and traits as a rule.

```ts shape
import type { ContentStep } from '@ifloom/engine/plugin'
type ContentStep = (pack: RawPack, tools: ContentTools) => RawPack
```

Uses: [`RawPack`](/docs/api/engine#rawpack), [`ContentTools`](#contenttools).

## ContentTools

Type. Explained in [Plugin migrations](/docs/reference/plugin-migrations#contenttools).

The tools a plugin's content step gets beside the pack, which rewrite a pack without walking it by hand. Each returns
a new pack.

`objects` and `calls` leave words and code (`prose`, `strings`, `variants`, `custom`) unchanged, and `words` rewrites
only those words.

```ts shape
import type { ContentTools } from '@ifloom/engine/plugin'
type ContentTools = {
  objects: (pack: RawPack, rewrite: (value: Record<string, unknown>) => Record<string, unknown>) => RawPack
  calls: (pack: RawPack, rewrite: (call: RawCall) => { name: string; with: unknown }) => RawPack
  words: (pack: RawPack, rewrite: (text: string, key: string) => string) => RawPack
  wordKeys: (pack: RawPack, rename: (key: string) => string) => RawPack
  entries: (pack: RawPack, list: string, rewrite: (entry: Record<string, unknown>) => Record<string, unknown>) => RawPack
  prose: (key: string) => string | undefined
  effects: (pack: RawPack) => RawPack
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `objects` | `(pack:` [`RawPack`](/docs/api/engine#rawpack)`, rewrite: (value: Record<string, unknown>) => Record<string, unknown>) =>…` |  |  | Returns the pack with every object in its content rewritten by `rewrite`, from the innermost out. |
| `calls` | `(pack:` [`RawPack`](/docs/api/engine#rawpack)`, rewrite: (call:` [`RawCall`](#rawcall)`) => { name: string; with: unknown }) =>` [`RawPack`](/docs/api/engine#rawpack) |  |  | Returns the pack with every call to a condition, effect or command by name rewritten by `rewrite`. A call returned with the same name and arguments stays as it was. The forms are `short` (`{ 'places/at': { location } }`, any key with a `/`, so check the name), `long` (`{ custom: 'places/at', with }` or `{ kind: 'custom', name, with }`) and `command` (`{ type: 'custom', name, with }`). A value (`{ value, with }`) is not a call, so reach it with `objects`. |
| `words` | `(pack:` [`RawPack`](/docs/api/engine#rawpack)`, rewrite: (text: string, key: string) => string) =>` [`RawPack`](/docs/api/engine#rawpack) |  |  | Returns the pack with every line of its `prose` and `strings` rewritten by `rewrite`, which gets each line's key. |
| `wordKeys` | `(pack:` [`RawPack`](/docs/api/engine#rawpack)`, rename: (key: string) => string) =>` [`RawPack`](/docs/api/engine#rawpack) |  |  | Returns the pack with every key of its words table (`quests/quests.settle.title`) renamed by `rename`, keeping the words. A step that renames a field uses it. |
| `entries` | `(pack:` [`RawPack`](/docs/api/engine#rawpack)`, list: string, rewrite: (entry: Record<string, unknown>) => Record<string,…` |  |  | Returns the pack with each entry of one plugin `data` list rewritten by `rewrite`. The list is named `<plugin>/<list>` (`'quests/quests'` is `data.quests.quests`), and a pack without it comes back unchanged. |
| `prose` | `(key: string) => string \| undefined` |  |  | Returns a prose key's line, the pack's own or else the game's under it, or undefined when neither has it. A step that turns a prose key into words in place uses it. |
| `effects` | `(pack:` [`RawPack`](/docs/api/engine#rawpack)`) =>` [`RawPack`](/docs/api/engine#rawpack) |  |  | Returns the pack with every effect written with a `kind` field (before schema 21) in the keyed form, in plugin `data` and traits too. `{ kind: 'stat', stat, by }` becomes `{ stat, by }`. A plugin whose content holds effects the engine's own step can't reach uses it. |

## DataList

Type. Explained in [Declaring a plugin's calls](/docs/reference/plugin-calls#datalist).

One of a plugin's data lists as `defineData` declares it, kept at `data.<plugin>.<list>`, with its noun, its words and
its lookups.

```ts shape
import type { DataList } from '@ifloom/engine/plugin'
type DataList<T extends { id: string } = PluginEntry> = {
  readonly plugin: string
  readonly list: string
  readonly noun: string
  readonly words?: WordShape
  all: (game: Game) => T[]
  get: (game: Game, id: unknown) => T | undefined
  ref: (id: string) => Reference
  content: (game: Game, refs: (entry: T) => readonly Reference[]) => ContentReferences[]
  problem: (id: string, what: string) => PluginProblem
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `plugin` | `string` |  |  | The id of the plugin whose data the list is. |
| `list` | `string` |  |  | The list's name in the plugin's data, such as `'jobs'` for `data.jobs.jobs`. |
| `noun` | `string` |  |  | The noun a problem calls one entry by. |
| `words` | [`WordShape`](/docs/api/engine#wordshape) | yes |  | The fields of an entry that are words a player reads. |
| `all` | `(game:` [`Game`](/docs/api/engine#game)`) => T[]` |  |  | Returns the game's entries in order. An entry that isn't an object with an id is left out. |
| `get` | `(game:` [`Game`](/docs/api/engine#game)`, id: unknown) => T \| undefined` |  |  | Returns one entry by id, or undefined when the game has none. The id may be anything content wrote. |
| `ref` | `(id: string) =>` [`Reference`](#reference) |  |  | Returns the reference to one entry by id, which the checker reports as `unknown job "cafe"` when the game has none. |
| `content` | `(game:` [`Game`](/docs/api/engine#game)`, refs: (entry: T) => readonly` [`Reference[]`](#reference)`) =>` [`ContentReferences[]`](#contentreferences) |  |  | Returns the references each entry makes, for `references.content`, each reported at `<list> <id>`. |
| `problem` | `(id: string, what: string) =>` [`PluginProblem`](#pluginproblem) |  |  | Returns a problem with one entry, for `check`, reported at `<list> <id>`. |

## defineCalls

Function. Explained in [Declaring a plugin's calls](/docs/reference/plugin-calls#definecalls).

Returns the `PluginCalls` declaration of a plugin's conditions, effects and commands, each by name with its
arguments built from `arg`.

A plugin calls it once, and its helpers, the content checker and its registries read that one declaration.

```ts fragment
const CALLS = defineCalls('places', {
  conditions: { at: { location: arg.strings() } },
  commands: { go: { id: arg.string() } },
})
```

Give it to `definePlugin` as `calls`, so each implementation gets its arguments typed and read. Build the helpers
from its writers (`CALLS.conditions.at({ location })`), and extend the registries from it
(`ConditionsOf<typeof CALLS>`), so content is checked against the same declaration.

The content checker reports an argument content left out, one of the wrong shape and one the call doesn't take, and
resolves the references each makes.

```ts shape
import { defineCalls } from '@ifloom/engine/plugin'
function defineCalls<Id extends string, const D extends CallShapes>(id: Id, shapes: D): PluginCalls<Id, D>
```

Uses: [`CallShapes`](#callshapes), [`PluginCalls`](#plugincalls).

## defineData

Function. Explained in [Declaring a plugin's calls](/docs/reference/plugin-calls#definedata-and-list).

Returns the `PluginData` declaration of a plugin's data lists, each by name with its entry's type, its noun and
its word fields.

A plugin calls it once, and its lookups, the content checker and the words table read that one declaration.

```ts fragment
const DATA = defineData('jobs', { jobs: list<JobDef>({ noun: 'job', words: { name: true } }) })
DATA.jobs.all(game)         // JobDef[]
DATA.jobs.get(game, 'cafe') // JobDef | undefined
arg.entry(DATA.jobs)        // an argument naming a job, checked
```

Give it to `definePlugin` as `data`, so the loader reaches each list's words for a translation.

```ts shape
import { defineData } from '@ifloom/engine/plugin'
function defineData<const L extends Readonly<Record<string, ListSpec<any>>>>(plugin: string, lists: L): PluginData<L>
```

Uses: [`ListSpec`](#listspec), [`PluginData`](#plugindata).

## DefinedPlugin

Type. Explained in [Plugin API](/docs/reference/plugin-api#definedplugin).

A plugin returned by `definePlugin`, with typed `read` and `write` for its own state.

```ts shape
import type { DefinedPlugin } from '@ifloom/engine/plugin'
type DefinedPlugin<S, V = unknown> = {
  id: string
  version: number
  start?: ((game: Game) => S)
  migrations?: Record<number, (state: unknown, tools: MigrationTools) => unknown>
  contentVersion?: number
  contentMigrations?: Record<number, ContentStep>
  commandVersion?: number
  commandMigrations?: Record<number, CommandStep>
  calls?: AnyCalls
  data?: PluginData
  conditions?: Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => boolean>
  effects?: Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => GameState>
  macros?: Record<string, Macro<S, PluginArgs>>
  commands?: Record<string, PluginCommand<S, PluginArgs>>
  strings?: Record<string, string>
  queries?: Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => unknown>
  cooperates?: string[]
  statModifiers?: ((state: GameState, context: PluginContext<S>) => readonly StatModifier[] | undefined)
  values?: Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => string | number>
  onTurn?: ((state: GameState, context: TurnContext<S>) => GameState)
  onTurnDone?: ((state: GameState, context: TurnContext<S>) => GameState)
  onStat?: ((before: GameState, after: GameState, stat: string, by: number, context: PluginContext<S>) => GameState)
  onCommand?: ((before: GameState, after: GameState, context: PluginContext<S>) => GameState)
  guard?: ((state: GameState, asked: Asked, context: PluginContext<S>) => Refusal | undefined)
  price?: ((state: GameState, effects: readonly Effect[], context: PluginContext<S>) => string[] | undefined)
  label?: ((state: GameState, context: PluginContext<S>) => string | undefined)
  saveName?: ((state: GameState, context: PluginContext<S>) => string | undefined)
  scene?: ((state: GameState, context: PluginContext<S>) => RoomScene | undefined)
  actions?: ((state: GameState, context: PluginContext<S>) => readonly ButtonDef[] | undefined)
  action?: ((state: GameState, id: string, context: PluginContext<S>) => ButtonDef | undefined)
  content?: Content
  traits?: readonly TraitDef<any, any>[]
  audio?: ((state: GameState, context: PluginContext<S>) => Record<string, string | null> | undefined)
  view?: ((state: GameState, context: PluginContext<S>) => V)
  profile?: ((state: GameState, previous: GameState, stored: unknown, context: PluginContext<S>) => unknown)
  references?: PluginReferences
  check?: (game: Game, tools: CheckTools) => PluginProblem[]
  read: (state: GameState, game: Game) => S
  write: (state: GameState, next: S) => GameState
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The plugin's id, the prefix on everything it adds. It holds letters, digits and `-`. |
| `version` | `number` |  |  | The version of the plugin's state's shape. Bump it when the shape changes, and add the step that carries the previous version forward to `migrations`. |
| `start` | `((game:` [`Game`](/docs/api/engine#game)`) => S)` | yes |  | Returns the plugin's state in a new game. A plugin with no state leaves it out. |
| `migrations` | `Record<number, (state: unknown, tools:` [`MigrationTools`](/docs/api/engine#migrationtools)`) => unknown>` | yes |  | The plugin's state migrations, one step per version, keyed by the version each upgrades from. A save whose state has no route forward is refused. Each step gets the plugin's old state and the same `MigrationTools` a game's migration gets, and returns the plugin's new state. |
| `contentVersion` | `number` | yes |  | The version of the shape of the content and packs written for the plugin, its `data`, calls' arguments, strings and traits. 1 if left out. Bump it when that shape changes, and add the step that carries a pack of the previous version forward to `contentMigrations`. Packs record the version they were written for in `plugins`. |
| `contentMigrations` | `Record<number,` [`ContentStep`](#contentstep)`>` | yes |  | The plugin's content migrations, one step per content version, keyed by the version each upgrades from. A version with no step changed nothing a pack holds. `upgradePack` runs them on every pack the game loads, mods included, after the engine's own steps for the same schema. See `ContentStep` and `ContentTools`. |
| `commandVersion` | `number` | yes |  | The version of the plugin's commands' arguments, which command logs record. 1 if left out. Bump it when a command is renamed or its arguments change, and add the step to `commandMigrations`, so an old log still replays. |
| `commandMigrations` | `Record<number,` [`CommandStep`](#commandstep)`>` | yes |  | The plugin's command migrations, one step per command version, keyed by the version each upgrades from. `replay` runs an older log's commands through them. See `CommandStep`. |
| `calls` | [`AnyCalls`](#anycalls) | yes |  | The declaration of the plugin's conditions, effects and commands, each with the arguments it takes, from `defineCalls`. Every declared call needs an implementation, and every implementation a declaration. The implementations get their arguments read by it. The content checker reports a call that leaves an argument out, gets one wrong or names something the game lacks, and a translation reaches the words in a call's arguments. |
| `data` | [`PluginData`](#plugindata) | yes |  | The declaration of the lists in the plugin's `data`, each with its entry's noun and its fields a player reads, from `defineData`. A translation's `words` table reaches those fields by `<plugin>/<list>.<id>.<field>`, such as `quests/quests.coffee.name`. |
| `conditions` | `Record<string, (state:` [`GameState`](/docs/api/engine#gamestate)`, args:` [`PluginArgs`](#pluginargs)`, context:` [`PluginContext`](#plugincontext)`<S>) => boolean>` | yes |  | The plugin's conditions content can test, by name without the prefix. |
| `effects` | `Record<string, (state:` [`GameState`](/docs/api/engine#gamestate)`, args:` [`PluginArgs`](#pluginargs)`, context:` [`PluginContext`](#plugincontext)`<S>) =>…` | yes |  | The plugin's effects content can apply, by name without the prefix. Each takes the state the effects before it left and returns the next one, so two in one list compose. Prices and guards can't see what an effect does until it runs. An effect that only stands for other effects belongs in `macros` instead. |
| `macros` | `Record<string,` [`Macro`](#macro)`<S,` [`PluginArgs`](#pluginargs)`>>` | yes |  | The plugin's macros, effects that stand for other effects, by name without the prefix. A name is an effect's or a macro's, never both. Content calls one as any effect. It returns the effects it stands for, worked out from the state, so a button's price and the guards see what it would do. See `Macro`. |
| `commands` | `Record<string,` [`PluginCommand`](#plugincommand)`<S,` [`PluginArgs`](#pluginargs)`>>` | yes |  | The plugin's commands a choice or action can send, by name without the prefix. |
| `strings` | `Record<string, string>` | yes |  | The plugin's strings, the lines a player reads, by name without the prefix, in English. A game overrides one as `strings['<id>/<name>']`, and the plugin reads them with `stringOf(game, '<id>/<name>')`. |
| `queries` | `Record<string, (state:` [`GameState`](/docs/api/engine#gamestate)`, args:` [`PluginArgs`](#pluginargs)`, context:` [`PluginContext`](#plugincontext)`<S>) => unknown>` | yes |  | The plugin's queries, answers other plugins ask for by name without importing it, such as `context.query('calendar/whenNext', { when })`. A query answers what a condition's yes or no can't, such as a location, a time or a list. |
| `cooperates` | `string[]` | yes |  | The ids of the plugins this one works with when the game has them. Content may name their calls in a game without them, where the condition is false and the effect does nothing. The content checker lets those calls pass. |
| `statModifiers` | `((state:` [`GameState`](/docs/api/engine#gamestate)`, context:` [`PluginContext`](#plugincontext)`<S>) => readonly` [`StatModifier[]`](#statmodifier) `\| undefined)` | yes |  | Returns the changes to what the player's stats read now, worked out from the plugin's state, such as a timed boost. It must not read stats itself, or it reads itself. Nothing is written into the state. Every reading of the stat (conditions, derived stats, costs, the view) sees the changed value, and `stat` effects still write the kept value underneath. |
| `values` | `Record<string, (state:` [`GameState`](/docs/api/engine#gamestate)`, args:` [`PluginArgs`](#pluginargs)`, context:` [`PluginContext`](#plugincontext)`<S>) => string…` | yes |  | The plugin's values, words and numbers content reads by name with arguments, as a condition is asked. Prose prints one as `{{id/name channel=texts}}`, and an `Amount` reads one as `{ value: 'id/name', with }`. |
| `onTurn` | `((state:` [`GameState`](/docs/api/engine#gamestate)`, context:` [`TurnContext`](#turncontext)`<S>) =>` [`GameState`](/docs/api/engine#gamestate)`)` | yes |  | The hook run at the end of a turn, once the counter has moved on and `resets` are back. It returns the next state, and the hooks run in order, the game's first. `context.before` is the state as the turn ended, and a `turn` effect applied through `context.apply` does nothing. |
| `onTurnDone` | `((state:` [`GameState`](/docs/api/engine#gamestate)`, context:` [`TurnContext`](#turncontext)`<S>) =>` [`GameState`](/docs/api/engine#gamestate)`)` | yes |  | The hook run once every `onTurn` has run, so it sees their changes, such as the calendar's new day. It returns the next state and runs in the same order and context as `onTurn`. |
| `onStat` | `((before:` [`GameState`](/docs/api/engine#gamestate)`, after:` [`GameState`](/docs/api/engine#gamestate)`, stat: string, by: number, context:` [`PluginContext`](#plugincontext)`<…` | yes |  | The hook run when a `stat` effect changes one of the player's stats. `before` is the state before it, `after` the state with it, and `by` how far it moved. Return `before` to undo the change, `after` to keep it, or `after` with more changes. The hooks run in order, the game's first, each seeing what the one before returned. |
| `onCommand` | `((before:` [`GameState`](/docs/api/engine#gamestate)`, after:` [`GameState`](/docs/api/engine#gamestate)`, context:` [`PluginContext`](#plugincontext)`<S>) =>` [`GameState`](/docs/api/engine#gamestate)`)` | yes |  | The hook run after every command that took, with the state before and the state after. It returns the next state, and its context is the state after. |
| `guard` | `((state:` [`GameState`](/docs/api/engine#gamestate)`, asked:` [`Asked`](#asked)`, context:` [`PluginContext`](#plugincontext)`<S>) =>` [`Refusal`](#refusal) `\| undefined)` | yes |  | Returns a `Refusal` for a command, given the effects it would apply, or undefined to let it through. The engine asks it after the locks, of every command but the ones that ignore locks. |
| `price` | `((state:` [`GameState`](/docs/api/engine#gamestate)`, effects: readonly` [`Effect[]`](/docs/api/engine#effect)`, context:` [`PluginContext`](#plugincontext)`<S>) => string[] \|…` | yes |  | Returns the plugin's words for what a button costs that the engine can't say, such as `['until evening']`. The engine asks it with the effects the button would apply. |
| `label` | `((state:` [`GameState`](/docs/api/engine#gamestate)`, context:` [`PluginContext`](#plugincontext)`<S>) => string \| undefined)` | yes |  | Returns a few words on the time or place in the game for a header or a save, such as "Day 3 · Wednesday morning". |
| `saveName` | `((state:` [`GameState`](/docs/api/engine#gamestate)`, context:` [`PluginContext`](#plugincontext)`<S>) => string \| undefined)` | yes |  | Returns the name a save is listed under, such as the name the player typed. It is kept as `SaveMeta.playerName` and shown for `@you`'s lines. The first that answers names it, the game's first. With none, saves have no player name. |
| `scene` | `((state:` [`GameState`](/docs/api/engine#gamestate)`, context:` [`PluginContext`](#plugincontext)`<S>) =>` [`RoomScene`](#roomscene) `\| undefined)` | yes |  | Returns the `RoomScene` the screen shows while no scene is open, such as a location's description or a dashboard's heading. The first plugin that answers fills it. With none, the room shows the game's title and its actions. |
| `actions` | `((state:` [`GameState`](/docs/api/engine#gamestate)`, context:` [`PluginContext`](#plugincontext)`<S>) => readonly` [`ButtonDef[]`](/docs/api/engine#buttondef) `\| undefined)` | yes |  | Returns the actions offered while no scene is open, such as a location's things to do. The view lists them before the game's own `actions`, rendered the same way. |
| `action` | `((state:` [`GameState`](/docs/api/engine#gamestate)`, id: string, context:` [`PluginContext`](#plugincontext)`<S>) =>` [`ButtonDef`](/docs/api/engine#buttondef) `\| undefined)` | yes |  | Returns one of the plugin's actions that isn't among its `actions` now, by id without the prefix, such as an app's. Undefined when there is none. `{ type: 'action', id: '<plugin>/<id>' }` runs it, as for an action with a cost or effects. Without this provider, the engine looks the id up among the plugin's `actions`. |
| `content` | [`Content`](/docs/api/engine#content) | yes |  | The content the plugin brings, merged first, under the game's content and packs, which can replace anything in it by id. It holds the plugin's kinds of entity, such as the cast's `character`, unlisted in the view unless the kind sets `listed`. A game that redeclares a kind keeps the fields it leaves out. It can also hold scenes, prose, actions or `data`. |
| `traits` | `readonly` [`TraitDef`](#traitdef)`<any, any>[]` | yes |  | The traits the plugin gives meaning to, each id the plugin's id, `/` and a name. A trait is data only, and the plugin's code decides what it does. Content writes them on a kind, an entity or content's `traits` table, and the plugin reads them with `traitOf` or `declaredTrait`. |
| `audio` | `((state:` [`GameState`](/docs/api/engine#gamestate)`, context:` [`PluginContext`](#plugincontext)`<S>) => Record<string, string \| null> \|…` | yes |  | Returns the tracks the plugin plays on background channels, by channel, such as a location's ambience. Null silences a channel, and the first plugin that names a channel wins it. A plugin's track is below an open scene's and an `audio` effect's, and above the game's default. A channel left out is the next plugin's, then the default's. |
| `view` | `((state:` [`GameState`](/docs/api/engine#gamestate)`, context:` [`PluginContext`](#plugincontext)`<S>) => V)` | yes |  | Returns the plugin's view, which a UI reads at `view.plugins[id]`. Declare its type `V` in `ViewRegistry` under the plugin's id, and every view types `view.plugins[id]` as `V`. |
| `profile` | `((state:` [`GameState`](/docs/api/engine#gamestate)`, previous:` [`GameState`](/docs/api/engine#gamestate)`, stored: unknown, context:` [`PluginContext`](#plugincontext)`<S>) =>…` | yes |  | Returns the value the plugin keeps in the player's profile, which outlives saves and new games, such as earned achievements. Return undefined to leave the stored value. The runner asks it after every command that took, with the state after, the state before and the value the plugin's profile namespace (its id) holds now. Only a runner with a `profile` asks, and `apply` never does. |
| `references` | [`PluginReferences`](#pluginreferences) | yes |  | The references the plugin's calls and content make, which the content checker resolves as it resolves the engine's own. See `PluginReferences`. |
| `check` | `(game:` [`Game`](/docs/api/engine#game)`, tools:` [`CheckTools`](#checktools)`) =>` [`PluginProblem[]`](#pluginproblem) | yes |  | Returns the problems the plugin's own rules find that a reference can't express, such as two entries with one id or an exit to nowhere. The content checker runs it after the references. `tools` words problems with anything else the plugin names as the checker does. |
| `read` | `(state:` [`GameState`](/docs/api/engine#gamestate)`, game:` [`Game`](/docs/api/engine#game)`) => S` |  |  | Returns the plugin's state in a game state, or its starting state if the save has none yet. |
| `write` | `(state:` [`GameState`](/docs/api/engine#gamestate)`, next: S) =>` [`GameState`](/docs/api/engine#gamestate) |  |  | Returns the game state with the plugin's state replaced. |

## definePlugin

Function. Explained in [Plugin API](/docs/reference/plugin-api#defineplugin).

Returns a plugin with `read` and `write` for its own state, for code outside it such as tests. It throws when a
declared call has no implementation or an implemented one has no declaration.

Name the types, `definePlugin<State, View, typeof CALLS>`, so the view's type is kept and each call's implementation
gets its arguments as `CALLS` (`defineCalls`) declares them. The plugin's view is typed by its `ViewRegistry` entry.

```ts shape
import { definePlugin } from '@ifloom/engine/plugin'
function definePlugin<S, V = unknown, C extends AnyCalls = never>(def: PluginDef<S, V, C>): DefinedPlugin<S, V>
```

Uses: [`AnyCalls`](#anycalls), [`PluginDef`](#plugindef), [`DefinedPlugin`](#definedplugin).

## defineTraitKind

Function. Explained in [A plugin's view, scene and actions](/docs/reference/plugin-views#definetraitkind).

Returns the `TraitKind` of a kind of entity a plugin's trait makes. Declare each such kind once, with this.

```ts fragment
const PLACES = defineTraitKind({ kind: 'location', trait: 'places/location', fields: { exits: true, body: true, … } })
PLACES.ref('park')                 // 'location:park'
PLACES.get(state, game, 'park')    // its Place, or undefined
PLACES.define({ id: 'park', name: 'Riverside Park', exits: [], body: [] })
const CALLS = defineCalls('places', { effects: { move: { location: PLACES.arg() } } })
```

The plugin still declares the kind itself in its `content.kinds`, with its label and whether it's listed.

```ts shape
import { defineTraitKind } from '@ifloom/engine/plugin'
function defineTraitKind<K extends string>(spec: TraitKindSpec<K>): TraitKind<K>
```

Uses: [`TraitKindSpec`](#traitkindspec), [`TraitKind`](#traitkind).

## EffectsOf

Type. Explained in [Declaring a plugin's calls](/docs/reference/plugin-calls#conditionsof-effectsof-and-commandsof).

The arguments a plugin's effects take, by full name, for its `EffectRegistry`. Use it as `ConditionsOf` is used.

```ts fragment
type EffectsOf<C> = C extends PluginCalls<infer Id extends string, infer D extends CallShapes> ? { [K in keyof Table<D, 'effects'> & string as `${Id}/${K}`]: Table<D, 'effects'>[K] extends ArgShape ? WrittenAs<Table<D, 'effects'>[K]> : never; } : never
```

Uses: [`PluginCalls`](#plugincalls), [`CallShapes`](#callshapes), [`ArgShape`](#argshape), [`WrittenAs`](#writtenas).

## entityUi

Function. Explained in [Presentation hints](/docs/reference/ui-hints#entityui).

Returns an entity's ui hints, its kind's with its `like`'s and then its definition's laid over them field by field.
Returns undefined when none has any.

```ts shape
import { entityUi } from '@ifloom/engine/plugin'
function entityUi(state: GameState, game: Game, ref: string): Ui<EntityUi> | undefined
```

Uses: [`GameState`](/docs/api/engine#gamestate), [`Game`](/docs/api/engine#game), [`Ui`](/docs/api/engine#ui), [`EntityUi`](/docs/api/engine#entityui).

## list

Function. Explained in [Declaring a plugin's calls](/docs/reference/plugin-calls#definedata-and-list).

Returns the `ListSpec` of one of a plugin's data lists, for `defineData`, with the entry's type, its noun and its words.

```ts shape
import { list } from '@ifloom/engine/plugin'
function list<T extends { id: string }>(spec: { noun: string; words?: WordShape }): ListSpec<T>
```

Uses: [`WordShape`](/docs/api/engine#wordshape), [`ListSpec`](#listspec).

## ListSpec

Type. Explained in [Declaring a plugin's calls](/docs/reference/plugin-calls#listspec).

One list of a plugin's data as `list` declares it, such as `list<JobDef>({ noun: 'job', words: { name: true } })`. The
type argument is an entry's type.

```ts shape
import type { ListSpec } from '@ifloom/engine/plugin'
type ListSpec<T extends { id: string } = PluginEntry> = {
  noun: string
  words?: WordShape
  readonly _entry?: T
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `noun` | `string` |  |  | The noun a problem calls one entry by, as in `unknown job "cafe"`. |
| `words` | [`WordShape`](/docs/api/engine#wordshape) | yes |  | The fields of an entry that are words a player reads, for a translation's `words` table. See `WordShape`. |
| `_entry` | `T` | yes |  | An entry's type, for type inference only. It is never set. |

## Lock

Type. Explained in [Locks](/docs/reference/locks#lock).

A lock the game declares in `locks`, which stops some commands while its `when` holds. The engine refuses the
command with `reason`, and the view greys out its button with the same line.

A game's stretches are locks, such as an intro that keeps you at one location or a first morning that only lets you
get to work. The reducer and the view read the same first lock that matches, so they can't disagree.

```ts shape
import type { Lock } from '@ifloom/engine/plugin'
type Lock = {
  id?: string
  when: Condition
  deny: readonly LockTarget[]
  except?: readonly LockTarget[]
  effect?: string
  hide?: boolean
  reason: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` | yes |  | The lock's id, so a later pack can replace it. A lock with no id is always added. |
| `when` | [`Condition`](/docs/api/engine#condition) |  |  | The lock's condition. The lock is on while it holds. |
| `deny` | `readonly` [`LockTarget[]`](#locktarget) |  |  | The commands the lock stops, by type. `'*'` stops every command not in `except`. A plugin's commands can be named one by one (`'quests/track'`) or all at once (`'quests/*'`), and `'custom'` stops every plugin command. |
| `except` | `readonly` [`LockTarget[]`](#locktarget) | yes |  | The commands the lock lets through all the same, named as in `deny`. |
| `effect` | `string` | yes |  | The effect a command must apply for the lock to stop it, named by its key. That's the engine's key (`'turn'`) or a plugin's name (`'calendar/pass'`), checked against `effectsOf`. |
| `hide` | `boolean` | yes |  | The lock's hide mark, true to leave the buttons it stops off the screen rather than greyed out. It covers the room's buttons, the places plugin's exits included, and never a command that ignores locks. |
| `reason` | `string` |  |  | The lock's reason, the line both the refusal and the greyed-out button show. |

## lockedOut

Function. Explained in [Locks](/docs/reference/locks#lockedout).

Returns true while a lock that stops everything is on. Until it lifts, the player moves only through its scenes,
with no exits, characters or actions in the room.

```ts shape
import { lockedOut } from '@ifloom/engine/plugin'
function lockedOut(state: GameState, game: Game): boolean
```

Uses: [`GameState`](/docs/api/engine#gamestate), [`Game`](/docs/api/engine#game).

## lockOn

Function. Explained in [Locks](/docs/reference/locks#lockon).

Returns the first lock that stops this command now, or undefined when none does.

```ts shape
import { lockOn } from '@ifloom/engine/plugin'
function lockOn(state: GameState, game: Game, command: Command): Lock | undefined
```

Uses: [`GameState`](/docs/api/engine#gamestate), [`Game`](/docs/api/engine#game), [`Command`](/docs/api/engine#command), [`Lock`](#lock).

## LockTarget

Type. Explained in [Locks](/docs/reference/locks#locktarget).

A name a lock's `deny` and `except` take. It's a command type, `'*'`, a plugin command (`'quests/track'`) or a whole plugin (`'quests/*'`).

```ts shape
import type { LockTarget } from '@ifloom/engine/plugin'
type LockTarget = Command['type'] | '*' | `${string}/${string}`
```

Uses: [`Command`](/docs/api/engine#command).

## Macro

Type. Explained in [Calls by name](/docs/reference/custom#macro).

An effect that stands for other effects, in a plugin's or the game's `macros`. It returns those effects from the
state, so prices, locks and guards see them before it runs.

Content calls it as any effect, `{ 'game/payRent': {} }`. It can return any effect content can write, another macro
included.

```ts shape
import type { Macro } from '@ifloom/engine/plugin'
type Macro<S = any, A = PluginArgs> = (state: GameState, args: A, context: PluginContext<S>) => EffectRef[]
```

Uses: [`GameState`](/docs/api/engine#gamestate), [`PluginContext`](#plugincontext), [`EffectRef`](/docs/api/engine#effectref).

## PackContext

Type. Explained in [Content and packs](/docs/reference/content#packcontext).

The parts of the game under a pack that an upgrade step may read beside the pack. `loadGame` passes it, and a step
without it reads only the pack.

```ts shape
import type { PackContext } from '@ifloom/engine/plugin'
type PackContext = {
  entities?: readonly unknown[]
  you?: readonly string[]
  prose?: Readonly<Record<string, string>>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `entities` | `readonly unknown[]` | yes |  | The entities the content, the plugins and earlier packs declare. |
| `you` | `readonly string[]` | yes |  | The game's words for the player, from its string `you`. |
| `prose` | `Readonly<Record<string, string>>` | yes |  | The prose keys' lines under the pack, from the content and earlier packs. |

## panelOf

Function. Explained in [Panels](/docs/reference/panels#panelof).

Returns the panel open over the story, as in `view.panel`. It is the one the `panel` effect opened, else the open
scene's own, else null.

A plugin's view uses it to show what its own panel holds, filtered by the panel's `with`, as the jobs plugin lists the
jobs on the open board.

```ts shape
import { panelOf } from '@ifloom/engine/plugin'
function panelOf(state: GameState, game: Game): OpenPanel | null
```

Uses: [`GameState`](/docs/api/engine#gamestate), [`Game`](/docs/api/engine#game), [`OpenPanel`](/docs/api/engine#openpanel).

## parseBeats

Function. Explained in [Prose and markup](/docs/reference/prose#parsebeats).

Returns a body's beats, in order. `find` names the speaker of a line under `@id`, and without it `@you` and `@player`
are the player's.

```ts shape
import { parseBeats } from '@ifloom/engine/plugin'
function parseBeats(body: string, find?: SpeakerFinder): SceneBeat[]
```

Uses: [`SpeakerFinder`](#speakerfinder), [`SceneBeat`](/docs/api/engine#scenebeat).

## PartnerQueries

Type. Explained in [Queries and partners](/docs/reference/plugin-queries#partnerqueries).

The queries first-party plugins answer for other plugins, by full name. `QueryRegistry` includes them, so they are
typed wherever a query is asked.

A plugin's own registry block declares the rest of its queries.

```ts shape
import type { PartnerQueries } from '@ifloom/engine/plugin'
type PartnerQueries = {
  'calendar/now': () => { day: number; period: string }
  'calendar/periods': () => string[]
  'calendar/bedtime': () => boolean
  'places/here': () => string | null
  'places/holder': () => EntityRef | null
  'places/known': (args: { location: string }) => boolean
  'cast/portrait': (args: { character: string }) => string | undefined
  'cast/contacts': () => CastContact[]
  'cast/sender': (args: { from: string }) => SenderView
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `calendar/now` | `() => { day: number; period: string }` |  |  | Returns the calendar's day, from 0, and its period. |
| `calendar/periods` | `() => string[]` |  |  | Returns the calendar's periods, in order. |
| `calendar/bedtime` | `() => boolean` |  |  | Returns true at a time the player could go to bed. |
| `places/here` | `() => string \| null` |  |  | Returns the id of the location the player is at, or null when they are at none. |
| `places/holder` | `() =>` [`EntityRef`](/docs/api/engine#entityref) `\| null` |  |  | Returns the entity of the location the player is at, which holds the things put down there, or null when they are at none. |
| `places/known` | `(args: { location: string }) => boolean` |  |  | Returns true when the game has the location. |
| `cast/portrait` | `(args: { character: string }) => string \| undefined` |  |  | Returns a character's face, their person's `portrait`, or undefined for none. |
| `cast/contacts` | `() =>` [`CastContact[]`](#castcontact) |  |  | Returns the characters the player has met who can be called. |
| `cast/sender` | `(args: { from: string }) =>` [`SenderView`](#senderview) |  |  | Returns the `SenderView` of the entity a message or a post is from, with a person's `portrait` as the face. |

## pictureView

Function. Explained in [The view](/docs/reference/view#pictureview).

Returns the `PictureView` of a picture, with its layers whose `when` holds and their hotspots, or null without
a picture. A plugin calls it to render a picture of its own.

Each layer's file can be a pool's pick, kept per owner and layer as `picture:<index>`. A hotspot tied to a layer that
isn't shown is left out. A `choice` hotspot takes that choice's command and availability from `choices`, the scene's
rendered choices, and is left out when the choice is not on offer. A `command` hotspot is rendered as any action is.
A plugin's `view` passes its context's `picks`, so the reducer records the layers' picks.

```ts shape
import { pictureView } from '@ifloom/engine/plugin'
function pictureView(state: GameState, game: Game, picture: PictureDef | undefined, owner: string, choices?: readonly RenderedChoice[] | null, picks?: Record<string, string>): PictureView | null
```

Uses: [`GameState`](/docs/api/engine#gamestate), [`Game`](/docs/api/engine#game), [`PictureDef`](/docs/api/engine#picturedef), [`RenderedChoice`](/docs/api/engine#renderedchoice), [`PictureView`](/docs/api/engine#pictureview).

## Plugin

Type. Explained in [Plugin API](/docs/reference/plugin-api#plugin).

A system added to the engine, with its own state and the conditions, effects, commands, hooks and view that work on
it. A game lists its plugins in `plugins` and never loads one later.

Its members follow one naming rule. A hook runs at an event, returns the next state and is named `on` and the event
(`onTurn`, `onCommand`). A provider answers a question, never changes the state and is named by the noun it gives
(`guard`, `price`, `label`, `scene`, `actions`, `audio`, `statModifiers`, `view`, `profile`). Tables of named
functions (`conditions`, `effects`, `commands`, `queries`, `values`) are plural nouns, and nothing is nested.

Content calls a plugin by name with its id in front, as in `{ 'quests/done': { quest: 'bakery' } }`, the same way it
calls the game's own code (`{ 'game/tired': true }`). A plugin's helpers write those calls for authors working in
code.

```ts shape
import type { Plugin } from '@ifloom/engine/plugin'
type Plugin<S = any, V = unknown> = {
  id: string
  version: number
  start?: (game: Game) => S
  migrations?: Record<number, (state: unknown, tools: MigrationTools) => unknown>
  contentVersion?: number
  contentMigrations?: Record<number, ContentStep>
  commandVersion?: number
  commandMigrations?: Record<number, CommandStep>
  calls?: AnyCalls
  data?: PluginData
  conditions?: Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => boolean>
  effects?: Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => GameState>
  macros?: Record<string, Macro<S>>
  commands?: Record<string, PluginCommand<S>>
  strings?: Record<string, string>
  queries?: Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => unknown>
  cooperates?: string[]
  statModifiers?: ((state: GameState, context: PluginContext<S>) => readonly StatModifier[] | undefined)
  values?: Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => string | number>
  onTurn?: (state: GameState, context: TurnContext<S>) => GameState
  onTurnDone?: (state: GameState, context: TurnContext<S>) => GameState
  onStat?: (before: GameState, after: GameState, stat: string, by: number, context: PluginContext<S>) => GameState
  onCommand?: (before: GameState, after: GameState, context: PluginContext<S>) => GameState
  guard?: ((state: GameState, asked: Asked, context: PluginContext<S>) => Refusal | undefined)
  price?: ((state: GameState, effects: readonly Effect[], context: PluginContext<S>) => string[] | undefined)
  label?: ((state: GameState, context: PluginContext<S>) => string | undefined)
  saveName?: ((state: GameState, context: PluginContext<S>) => string | undefined)
  scene?: ((state: GameState, context: PluginContext<S>) => RoomScene | undefined)
  actions?: ((state: GameState, context: PluginContext<S>) => readonly ButtonDef[] | undefined)
  action?: ((state: GameState, id: string, context: PluginContext<S>) => ButtonDef | undefined)
  content?: Content
  traits?: readonly TraitDef<any, any>[]
  audio?: ((state: GameState, context: PluginContext<S>) => Record<string, string | null> | undefined)
  view?: (state: GameState, context: PluginContext<S>) => V
  profile?: (state: GameState, previous: GameState, stored: unknown, context: PluginContext<S>) => unknown
  references?: PluginReferences
  check?: (game: Game, tools: CheckTools) => PluginProblem[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The plugin's id, the prefix on everything it adds. It holds letters, digits and `-`. |
| `version` | `number` |  |  | The version of the plugin's state's shape. Bump it when the shape changes, and add the step that carries the previous version forward to `migrations`. |
| `start` | `(game:` [`Game`](/docs/api/engine#game)`) => S` | yes |  | Returns the plugin's state in a new game. A plugin with no state leaves it out. |
| `migrations` | `Record<number, (state: unknown, tools:` [`MigrationTools`](/docs/api/engine#migrationtools)`) => unknown>` | yes |  | The plugin's state migrations, one step per version, keyed by the version each upgrades from. A save whose state has no route forward is refused. Each step gets the plugin's old state and the same `MigrationTools` a game's migration gets, and returns the plugin's new state. |
| `contentVersion` | `number` | yes |  | The version of the shape of the content and packs written for the plugin, its `data`, calls' arguments, strings and traits. 1 if left out. Bump it when that shape changes, and add the step that carries a pack of the previous version forward to `contentMigrations`. Packs record the version they were written for in `plugins`. |
| `contentMigrations` | `Record<number,` [`ContentStep`](#contentstep)`>` | yes |  | The plugin's content migrations, one step per content version, keyed by the version each upgrades from. A version with no step changed nothing a pack holds. `upgradePack` runs them on every pack the game loads, mods included, after the engine's own steps for the same schema. See `ContentStep` and `ContentTools`. |
| `commandVersion` | `number` | yes |  | The version of the plugin's commands' arguments, which command logs record. 1 if left out. Bump it when a command is renamed or its arguments change, and add the step to `commandMigrations`, so an old log still replays. |
| `commandMigrations` | `Record<number,` [`CommandStep`](#commandstep)`>` | yes |  | The plugin's command migrations, one step per command version, keyed by the version each upgrades from. `replay` runs an older log's commands through them. See `CommandStep`. |
| `calls` | [`AnyCalls`](#anycalls) | yes |  | The declaration of the plugin's conditions, effects and commands, each with the arguments it takes, from `defineCalls`. Every declared call needs an implementation, and every implementation a declaration. The implementations get their arguments read by it. The content checker reports a call that leaves an argument out, gets one wrong or names something the game lacks, and a translation reaches the words in a call's arguments. |
| `data` | [`PluginData`](#plugindata) | yes |  | The declaration of the lists in the plugin's `data`, each with its entry's noun and its fields a player reads, from `defineData`. A translation's `words` table reaches those fields by `<plugin>/<list>.<id>.<field>`, such as `quests/quests.coffee.name`. |
| `conditions` | `Record<string, (state:` [`GameState`](/docs/api/engine#gamestate)`, args:` [`PluginArgs`](#pluginargs)`, context:` [`PluginContext`](#plugincontext)`<S>) => boolean>` | yes |  | The plugin's conditions content can test, by name without the prefix. |
| `effects` | `Record<string, (state:` [`GameState`](/docs/api/engine#gamestate)`, args:` [`PluginArgs`](#pluginargs)`, context:` [`PluginContext`](#plugincontext)`<S>) =>…` | yes |  | The plugin's effects content can apply, by name without the prefix. Each takes the state the effects before it left and returns the next one, so two in one list compose. Prices and guards can't see what an effect does until it runs. An effect that only stands for other effects belongs in `macros` instead. |
| `macros` | `Record<string,` [`Macro`](#macro)`<S>>` | yes |  | The plugin's macros, effects that stand for other effects, by name without the prefix. A name is an effect's or a macro's, never both. Content calls one as any effect. It returns the effects it stands for, worked out from the state, so a button's price and the guards see what it would do. See `Macro`. |
| `commands` | `Record<string,` [`PluginCommand`](#plugincommand)`<S>>` | yes |  | The plugin's commands a choice or action can send, by name without the prefix. |
| `strings` | `Record<string, string>` | yes |  | The plugin's strings, the lines a player reads, by name without the prefix, in English. A game overrides one as `strings['<id>/<name>']`, and the plugin reads them with `stringOf(game, '<id>/<name>')`. |
| `queries` | `Record<string, (state:` [`GameState`](/docs/api/engine#gamestate)`, args:` [`PluginArgs`](#pluginargs)`, context:` [`PluginContext`](#plugincontext)`<S>) => unknown>` | yes |  | The plugin's queries, answers other plugins ask for by name without importing it, such as `context.query('calendar/whenNext', { when })`. A query answers what a condition's yes or no can't, such as a location, a time or a list. |
| `cooperates` | `string[]` | yes |  | The ids of the plugins this one works with when the game has them. Content may name their calls in a game without them, where the condition is false and the effect does nothing. The content checker lets those calls pass. |
| `statModifiers` | `((state:` [`GameState`](/docs/api/engine#gamestate)`, context:` [`PluginContext`](#plugincontext)`<S>) => readonly` [`StatModifier[]`](#statmodifier) `\| undefined)` | yes |  | Returns the changes to what the player's stats read now, worked out from the plugin's state, such as a timed boost. It must not read stats itself, or it reads itself. Nothing is written into the state. Every reading of the stat (conditions, derived stats, costs, the view) sees the changed value, and `stat` effects still write the kept value underneath. |
| `values` | `Record<string, (state:` [`GameState`](/docs/api/engine#gamestate)`, args:` [`PluginArgs`](#pluginargs)`, context:` [`PluginContext`](#plugincontext)`<S>) => string…` | yes |  | The plugin's values, words and numbers content reads by name with arguments, as a condition is asked. Prose prints one as `{{id/name channel=texts}}`, and an `Amount` reads one as `{ value: 'id/name', with }`. |
| `onTurn` | `(state:` [`GameState`](/docs/api/engine#gamestate)`, context:` [`TurnContext`](#turncontext)`<S>) =>` [`GameState`](/docs/api/engine#gamestate) | yes |  | The hook run at the end of a turn, once the counter has moved on and `resets` are back. It returns the next state, and the hooks run in order, the game's first. `context.before` is the state as the turn ended, and a `turn` effect applied through `context.apply` does nothing. |
| `onTurnDone` | `(state:` [`GameState`](/docs/api/engine#gamestate)`, context:` [`TurnContext`](#turncontext)`<S>) =>` [`GameState`](/docs/api/engine#gamestate) | yes |  | The hook run once every `onTurn` has run, so it sees their changes, such as the calendar's new day. It returns the next state and runs in the same order and context as `onTurn`. |
| `onStat` | `(before:` [`GameState`](/docs/api/engine#gamestate)`, after:` [`GameState`](/docs/api/engine#gamestate)`, stat: string, by: number, context:` [`PluginContext`](#plugincontext)`<S>…` | yes |  | The hook run when a `stat` effect changes one of the player's stats. `before` is the state before it, `after` the state with it, and `by` how far it moved. Return `before` to undo the change, `after` to keep it, or `after` with more changes. The hooks run in order, the game's first, each seeing what the one before returned. |
| `onCommand` | `(before:` [`GameState`](/docs/api/engine#gamestate)`, after:` [`GameState`](/docs/api/engine#gamestate)`, context:` [`PluginContext`](#plugincontext)`<S>) =>` [`GameState`](/docs/api/engine#gamestate) | yes |  | The hook run after every command that took, with the state before and the state after. It returns the next state, and its context is the state after. |
| `guard` | `((state:` [`GameState`](/docs/api/engine#gamestate)`, asked:` [`Asked`](#asked)`, context:` [`PluginContext`](#plugincontext)`<S>) =>` [`Refusal`](#refusal) `\| undefined)` | yes |  | Returns a `Refusal` for a command, given the effects it would apply, or undefined to let it through. The engine asks it after the locks, of every command but the ones that ignore locks. |
| `price` | `((state:` [`GameState`](/docs/api/engine#gamestate)`, effects: readonly` [`Effect[]`](/docs/api/engine#effect)`, context:` [`PluginContext`](#plugincontext)`<S>) => string[] \|…` | yes |  | Returns the plugin's words for what a button costs that the engine can't say, such as `['until evening']`. The engine asks it with the effects the button would apply. |
| `label` | `((state:` [`GameState`](/docs/api/engine#gamestate)`, context:` [`PluginContext`](#plugincontext)`<S>) => string \| undefined)` | yes |  | Returns a few words on the time or place in the game for a header or a save, such as "Day 3 · Wednesday morning". |
| `saveName` | `((state:` [`GameState`](/docs/api/engine#gamestate)`, context:` [`PluginContext`](#plugincontext)`<S>) => string \| undefined)` | yes |  | Returns the name a save is listed under, such as the name the player typed. It is kept as `SaveMeta.playerName` and shown for `@you`'s lines. The first that answers names it, the game's first. With none, saves have no player name. |
| `scene` | `((state:` [`GameState`](/docs/api/engine#gamestate)`, context:` [`PluginContext`](#plugincontext)`<S>) =>` [`RoomScene`](#roomscene) `\| undefined)` | yes |  | Returns the `RoomScene` the screen shows while no scene is open, such as a location's description or a dashboard's heading. The first plugin that answers fills it. With none, the room shows the game's title and its actions. |
| `actions` | `((state:` [`GameState`](/docs/api/engine#gamestate)`, context:` [`PluginContext`](#plugincontext)`<S>) => readonly` [`ButtonDef[]`](/docs/api/engine#buttondef) `\| undefined)` | yes |  | Returns the actions offered while no scene is open, such as a location's things to do. The view lists them before the game's own `actions`, rendered the same way. |
| `action` | `((state:` [`GameState`](/docs/api/engine#gamestate)`, id: string, context:` [`PluginContext`](#plugincontext)`<S>) =>` [`ButtonDef`](/docs/api/engine#buttondef) `\| undefined)` | yes |  | Returns one of the plugin's actions that isn't among its `actions` now, by id without the prefix, such as an app's. Undefined when there is none. `{ type: 'action', id: '<plugin>/<id>' }` runs it, as for an action with a cost or effects. Without this provider, the engine looks the id up among the plugin's `actions`. |
| `content` | [`Content`](/docs/api/engine#content) | yes |  | The content the plugin brings, merged first, under the game's content and packs, which can replace anything in it by id. It holds the plugin's kinds of entity, such as the cast's `character`, unlisted in the view unless the kind sets `listed`. A game that redeclares a kind keeps the fields it leaves out. It can also hold scenes, prose, actions or `data`. |
| `traits` | `readonly` [`TraitDef`](#traitdef)`<any, any>[]` | yes |  | The traits the plugin gives meaning to, each id the plugin's id, `/` and a name. A trait is data only, and the plugin's code decides what it does. Content writes them on a kind, an entity or content's `traits` table, and the plugin reads them with `traitOf` or `declaredTrait`. |
| `audio` | `((state:` [`GameState`](/docs/api/engine#gamestate)`, context:` [`PluginContext`](#plugincontext)`<S>) => Record<string, string \| null> \|…` | yes |  | Returns the tracks the plugin plays on background channels, by channel, such as a location's ambience. Null silences a channel, and the first plugin that names a channel wins it. A plugin's track is below an open scene's and an `audio` effect's, and above the game's default. A channel left out is the next plugin's, then the default's. |
| `view` | `(state:` [`GameState`](/docs/api/engine#gamestate)`, context:` [`PluginContext`](#plugincontext)`<S>) => V` | yes |  | Returns the plugin's view, which a UI reads at `view.plugins[id]`. Declare its type `V` in `ViewRegistry` under the plugin's id, and every view types `view.plugins[id]` as `V`. |
| `profile` | `(state:` [`GameState`](/docs/api/engine#gamestate)`, previous:` [`GameState`](/docs/api/engine#gamestate)`, stored: unknown, context:` [`PluginContext`](#plugincontext)`<S>) =>…` | yes |  | Returns the value the plugin keeps in the player's profile, which outlives saves and new games, such as earned achievements. Return undefined to leave the stored value. The runner asks it after every command that took, with the state after, the state before and the value the plugin's profile namespace (its id) holds now. Only a runner with a `profile` asks, and `apply` never does. |
| `references` | [`PluginReferences`](#pluginreferences) | yes |  | The references the plugin's calls and content make, which the content checker resolves as it resolves the engine's own. See `PluginReferences`. |
| `check` | `(game:` [`Game`](/docs/api/engine#game)`, tools:` [`CheckTools`](#checktools)`) =>` [`PluginProblem[]`](#pluginproblem) | yes |  | Returns the problems the plugin's own rules find that a reference can't express, such as two entries with one id or an exit to nowhere. The content checker runs it after the references. `tools` words problems with anything else the plugin names as the checker does. |

## PluginArgs

Type. Explained in [Plugin API](/docs/reference/plugin-api#pluginargs).

The arguments content passes to a plugin's condition, effect or command, as an object.

```ts shape
import type { PluginArgs } from '@ifloom/engine/plugin'
type PluginArgs = {
  [key: string]: unknown
}
```

## PluginCalls

Type. Explained in [Declaring a plugin's calls](/docs/reference/plugin-calls#plugincalls-and-anycalls).

A plugin's calls as `defineCalls` declares them, with a `CallWriter` for each, by table, such as
`calls.conditions.at({ location })`. Give it to `definePlugin` as `calls`, and derive the registries from it.

```ts fragment
type PluginCalls<Id extends string = string, D extends CallShapes = CallShapes> = {
  readonly id: Id
  readonly conditions: Writers<Id, Table<D, 'conditions'>>
  readonly effects: Writers<Id, Table<D, 'effects'>>
  readonly commands: Writers<Id, Table<D, 'commands'>>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `Id` |  |  | The plugin's id. |
| `conditions` | `Writers<Id, Table<D, 'conditions'>>` |  |  | The writers of the plugin's conditions, by name. |
| `effects` | `Writers<Id, Table<D, 'effects'>>` |  |  | The writers of the plugin's effects, by name. |
| `commands` | `Writers<Id, Table<D, 'commands'>>` |  |  | The writers of the plugin's commands, by name. |

## PluginCommand

Type. Explained in [Plugin API](/docs/reference/plugin-api#plugincommand).

A command a plugin declares in its `commands`, with its refusal, its run and what it would apply.

```ts shape
import type { PluginCommand } from '@ifloom/engine/plugin'
type PluginCommand<S = any, A = PluginArgs> = {
  ignoresLocks?: boolean
  whyNot?: ((state: GameState, args: A, context: PluginContext<S>) => string | undefined)
  run: (state: GameState, args: A, context: PluginContext<S>) => GameState
  effectsOf?: (state: GameState, args: A, context: PluginContext<S>) => Effect[]
  spends?: ((state: GameState, args: A, context: PluginContext<S>) => Record<string, number> | undefined)
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `ignoresLocks` | `boolean` | yes |  | The setting that runs the command even while a lock would stop it. Use it for tools outside the story, such as a debugger, never for something the player does in it. |
| `whyNot` | `((state:` [`GameState`](/docs/api/engine#gamestate)`, args: A, context:` [`PluginContext`](#plugincontext)`<S>) => string \| undefined)` | yes |  | Returns the reason the command can't run now, in the player's words, or undefined if it can. |
| `run` | `(state:` [`GameState`](/docs/api/engine#gamestate)`, args: A, context:` [`PluginContext`](#plugincontext)`<S>) =>` [`GameState`](/docs/api/engine#gamestate) |  |  | Returns the state after the command. The engine calls it only when `whyNot` gave no reason. |
| `effectsOf` | `(state:` [`GameState`](/docs/api/engine#gamestate)`, args: A, context:` [`PluginContext`](#plugincontext)`<S>) =>` [`Effect[]`](/docs/api/engine#effect) | yes |  | Returns the effects running the command would apply, for guards, prices and locks to see. None if left out. |
| `spends` | `((state:` [`GameState`](/docs/api/engine#gamestate)`, args: A, context:` [`PluginContext`](#plugincontext)`<S>) => Record<string, number> \|…` | yes |  | Returns the stats the command spends, by id, for its button's price, as an action's `cost.stats` gives them, such as `{ coins: 4 }`. None if left out. Only the price shows it. `run` does the spending, and `whyNot` refuses when there isn't enough. |

## PluginContext

Type. Explained in [Plugin API](/docs/reference/plugin-api#plugincontext).

The context every plugin function gets besides the game state. It adds the plugin's own state, typed, to the
`CustomContext` a game's own functions get.

`get` reads the plugin's state from a later game state, and `set` returns the game state with it replaced.

```ts shape
import type { PluginContext } from '@ifloom/engine/plugin'
type PluginContext<S> = {
  game: Game
  query: Query
  value: (name: string, args?: PluginArgs) => string | number | undefined
  roll: (max: number, name: string) => number
  slice: S
  get: (on?: GameState) => S
  set: (next: S, on?: GameState) => GameState
  apply: (effects: readonly EffectRef[], on?: GameState) => GameState
  picks?: Record<string, string>
  beats: (blocks: readonly Block[], id: string) => SceneBeat[]
  profile?: unknown
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `game` | [`Game`](/docs/api/engine#game) |  |  | The context's loaded game. |
| `query` | [`Query`](/docs/api/engine#query) |  |  | The context's query function, which asks a plugin or the game by full name (`query('places/here')`). |
| `value` | `(name: string, args?:` [`PluginArgs`](#pluginargs)`) => string \| number \| undefined` |  |  | The context's value function, which returns a value by full name, a plugin's (`messages/unread`) or the game's, asked with `args`. It returns undefined when no plugin or game has that value. |
| `roll` | `(max: number, name: string) => number` |  |  | The context's roll function, which returns a whole number from 0 to `max - 1`, drawn from the save's seed, the turn and `name`. The same save and turn always draw the same number. |
| `slice` | `S` |  |  | The plugin's state in the game state the function was given, the same as `get()`. |
| `get` | `(on?:` [`GameState`](/docs/api/engine#gamestate)`) => S` |  |  | Returns the plugin's state in the game state the function was given, or in `on`. Its starting state (`start`) when the save has none yet. Pass `on` from a function that has already changed the game state, such as by applying effects, to read the plugin's state as it is now. It is the read that matches `set`. |
| `set` | `(next: S, on?:` [`GameState`](/docs/api/engine#gamestate)`) =>` [`GameState`](/docs/api/engine#gamestate) |  |  | Returns the game state with the plugin's state replaced, on the state the function was given or on `on`. Pass `on` from a function that has already changed other parts of the game state. |
| `apply` | `(effects: readonly` [`EffectRef[]`](/docs/api/engine#effectref)`, on?:` [`GameState`](/docs/api/engine#gamestate)`) =>` [`GameState`](/docs/api/engine#gamestate) |  |  | Returns the state after a list of effects, applied to the state the function was given or to `on`. Any effect works, a custom one or another plugin's included. A plugin's effect ends a turn with `apply([{ turn: true }])`. |
| `picks` | `Record<string, string>` | yes |  | The record of the pool picks a `view` makes, for the reducer to keep. It is set only in `view`. Pass it to `pictureView` so a picture's pick stays the same on every visit. `beats` records its own. |
| `beats` | `(blocks: readonly` [`Block[]`](/docs/api/engine#block)`, id: string) =>` [`SceneBeat[]`](/docs/api/engine#scenebeat) |  |  | Returns blocks rendered as beats, the way a scene's body is, for a message's words, a post's or an app's. Only the blocks whose `when` holds are rendered. Words are filled in for this save, variants and pools drawn under `id` so a block's pick stays the same on every visit, spoken lines given their speakers, and bold, italics and UI pieces made spans. Inline actions and tooltips stay as plain words, since only a scene offers choices. In `view`, the reducer records the pool picks it makes. |
| `profile` | `unknown` | yes |  | The value the plugin's own profile namespace (its id) held when the runner last read or wrote it. It is set only in `view`, when a runner with a profile builds the view. It is frozen, so read it and never change it. It is undefined in a view built by `view(state, game)` alone and while nothing is stored. Conditions, effects, commands and hooks never see it, so a replay always plays the same. |

## PluginData

Type. Explained in [Declaring a plugin's calls](/docs/reference/plugin-calls#plugindata).

A plugin's `DataList`s as `defineData` declares them, by name. Give them to `definePlugin` as `data`.

```ts fragment
type PluginData<L extends Readonly<Record<string, ListSpec<any>>> = Readonly<Record<string, ListSpec<any>>>> = { readonly [K in keyof L & string]: DataList<EntryOf<L[K]>>; }
```

Uses: [`DataList`](#datalist).

## PluginDef

Type. Explained in [Plugin API](/docs/reference/plugin-api#plugindef).

The plugin `definePlugin` takes. When it declares its `calls`, its conditions, effects, macros and commands must be
exactly the declared ones, each given its arguments typed.

A declared effect is implemented in `effects` or `macros`.

```ts fragment
type PluginDef<S, V, C extends AnyCalls> = {
  view?: ((state: GameState, context: PluginContext<S>) => V)
  references?: PluginReferences
  traits?: readonly TraitDef<any, any>[]
  actions?: ((state: GameState, context: PluginContext<S>) => readonly ButtonDef[] | undefined)
  audio?: ((state: GameState, context: PluginContext<S>) => Record<string, string | null> | undefined)
  scene?: ((state: GameState, context: PluginContext<S>) => RoomScene | undefined)
  action?: ((state: GameState, id: string, context: PluginContext<S>) => ButtonDef | undefined)
  id: string
  label?: ((state: GameState, context: PluginContext<S>) => string | undefined)
  start?: ((game: Game) => S)
  version: number
  data?: PluginData
  content?: Content
  values?: Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => string | number>
  strings?: Record<string, string>
  migrations?: Record<number, (state: unknown, tools: MigrationTools) => unknown>
  cooperates?: string[]
  contentVersion?: number
  contentMigrations?: Record<number, ContentStep>
  commandVersion?: number
  commandMigrations?: Record<number, CommandStep>
  queries?: Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => unknown>
  statModifiers?: ((state: GameState, context: PluginContext<S>) => readonly StatModifier[] | undefined)
  onTurn?: ((state: GameState, context: TurnContext<S>) => GameState)
  onTurnDone?: ((state: GameState, context: TurnContext<S>) => GameState)
  onStat?: ((before: GameState, after: GameState, stat: string, by: number, context: PluginContext<S>) => GameState)
  onCommand?: ((before: GameState, after: GameState, context: PluginContext<S>) => GameState)
  guard?: ((state: GameState, asked: Asked, context: PluginContext<S>) => Refusal | undefined)
  price?: ((state: GameState, effects: readonly Effect[], context: PluginContext<S>) => string[] | undefined)
  saveName?: ((state: GameState, context: PluginContext<S>) => string | undefined)
  profile?: ((state: GameState, previous: GameState, stored: unknown, context: PluginContext<S>) => unknown)
  check?: (game: Game, tools: CheckTools) => PluginProblem[]
  conditions?: Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => boolean> | Implemented<S, C, 'conditions', boolean>
  effects?: Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => GameState> | Partial<Implemented<S, C, 'effects', GameState>>
  commands?: Record<string, PluginCommand<S, PluginArgs>> | { [K in keyof CallArgs<C, 'commands'>]: PluginCommand<S, CallArgs<C, 'commands'>[K]>; }
  macros?: Record<string, Macro<S, PluginArgs>> | { [K in keyof CallArgs<C, 'effects'>]?: Macro<S, CallArgs<C, 'effects'>[K]>; }
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `view` | `((state:` [`GameState`](/docs/api/engine#gamestate)`, context:` [`PluginContext`](#plugincontext)`<S>) => V)` | yes |  | Returns the plugin's view, which a UI reads at `view.plugins[id]`. Declare its type `V` in `ViewRegistry` under the plugin's id, and every view types `view.plugins[id]` as `V`. |
| `references` | [`PluginReferences`](#pluginreferences) | yes |  | The references the plugin's calls and content make, which the content checker resolves as it resolves the engine's own. See `PluginReferences`. |
| `traits` | `readonly` [`TraitDef`](#traitdef)`<any, any>[]` | yes |  | The traits the plugin gives meaning to, each id the plugin's id, `/` and a name. A trait is data only, and the plugin's code decides what it does. Content writes them on a kind, an entity or content's `traits` table, and the plugin reads them with `traitOf` or `declaredTrait`. |
| `actions` | `((state:` [`GameState`](/docs/api/engine#gamestate)`, context:` [`PluginContext`](#plugincontext)`<S>) => readonly` [`ButtonDef[]`](/docs/api/engine#buttondef) `\| undefined)` | yes |  | Returns the actions offered while no scene is open, such as a location's things to do. The view lists them before the game's own `actions`, rendered the same way. |
| `audio` | `((state:` [`GameState`](/docs/api/engine#gamestate)`, context:` [`PluginContext`](#plugincontext)`<S>) => Record<string, string \| null> \|…` | yes |  | Returns the tracks the plugin plays on background channels, by channel, such as a location's ambience. Null silences a channel, and the first plugin that names a channel wins it. A plugin's track is below an open scene's and an `audio` effect's, and above the game's default. A channel left out is the next plugin's, then the default's. |
| `scene` | `((state:` [`GameState`](/docs/api/engine#gamestate)`, context:` [`PluginContext`](#plugincontext)`<S>) =>` [`RoomScene`](#roomscene) `\| undefined)` | yes |  | Returns the `RoomScene` the screen shows while no scene is open, such as a location's description or a dashboard's heading. The first plugin that answers fills it. With none, the room shows the game's title and its actions. |
| `action` | `((state:` [`GameState`](/docs/api/engine#gamestate)`, id: string, context:` [`PluginContext`](#plugincontext)`<S>) =>` [`ButtonDef`](/docs/api/engine#buttondef) `\| undefined)` | yes |  | Returns one of the plugin's actions that isn't among its `actions` now, by id without the prefix, such as an app's. Undefined when there is none. `{ type: 'action', id: '<plugin>/<id>' }` runs it, as for an action with a cost or effects. Without this provider, the engine looks the id up among the plugin's `actions`. |
| `id` | `string` |  |  | The plugin's id, the prefix on everything it adds. It holds letters, digits and `-`. |
| `label` | `((state:` [`GameState`](/docs/api/engine#gamestate)`, context:` [`PluginContext`](#plugincontext)`<S>) => string \| undefined)` | yes |  | Returns a few words on the time or place in the game for a header or a save, such as "Day 3 · Wednesday morning". |
| `start` | `((game:` [`Game`](/docs/api/engine#game)`) => S)` | yes |  | Returns the plugin's state in a new game. A plugin with no state leaves it out. |
| `version` | `number` |  |  | The version of the plugin's state's shape. Bump it when the shape changes, and add the step that carries the previous version forward to `migrations`. |
| `data` | [`PluginData`](#plugindata) | yes |  | The declaration of the lists in the plugin's `data`, each with its entry's noun and its fields a player reads, from `defineData`. A translation's `words` table reaches those fields by `<plugin>/<list>.<id>.<field>`, such as `quests/quests.coffee.name`. |
| `content` | [`Content`](/docs/api/engine#content) | yes |  | The content the plugin brings, merged first, under the game's content and packs, which can replace anything in it by id. It holds the plugin's kinds of entity, such as the cast's `character`, unlisted in the view unless the kind sets `listed`. A game that redeclares a kind keeps the fields it leaves out. It can also hold scenes, prose, actions or `data`. |
| `values` | `Record<string, (state:` [`GameState`](/docs/api/engine#gamestate)`, args:` [`PluginArgs`](#pluginargs)`, context:` [`PluginContext`](#plugincontext)`<S>) => string…` | yes |  | The plugin's values, words and numbers content reads by name with arguments, as a condition is asked. Prose prints one as `{{id/name channel=texts}}`, and an `Amount` reads one as `{ value: 'id/name', with }`. |
| `strings` | `Record<string, string>` | yes |  | The plugin's strings, the lines a player reads, by name without the prefix, in English. A game overrides one as `strings['<id>/<name>']`, and the plugin reads them with `stringOf(game, '<id>/<name>')`. |
| `migrations` | `Record<number, (state: unknown, tools:` [`MigrationTools`](/docs/api/engine#migrationtools)`) => unknown>` | yes |  | The plugin's state migrations, one step per version, keyed by the version each upgrades from. A save whose state has no route forward is refused. Each step gets the plugin's old state and the same `MigrationTools` a game's migration gets, and returns the plugin's new state. |
| `cooperates` | `string[]` | yes |  | The ids of the plugins this one works with when the game has them. Content may name their calls in a game without them, where the condition is false and the effect does nothing. The content checker lets those calls pass. |
| `contentVersion` | `number` | yes |  | The version of the shape of the content and packs written for the plugin, its `data`, calls' arguments, strings and traits. 1 if left out. Bump it when that shape changes, and add the step that carries a pack of the previous version forward to `contentMigrations`. Packs record the version they were written for in `plugins`. |
| `contentMigrations` | `Record<number,` [`ContentStep`](#contentstep)`>` | yes |  | The plugin's content migrations, one step per content version, keyed by the version each upgrades from. A version with no step changed nothing a pack holds. `upgradePack` runs them on every pack the game loads, mods included, after the engine's own steps for the same schema. See `ContentStep` and `ContentTools`. |
| `commandVersion` | `number` | yes |  | The version of the plugin's commands' arguments, which command logs record. 1 if left out. Bump it when a command is renamed or its arguments change, and add the step to `commandMigrations`, so an old log still replays. |
| `commandMigrations` | `Record<number,` [`CommandStep`](#commandstep)`>` | yes |  | The plugin's command migrations, one step per command version, keyed by the version each upgrades from. `replay` runs an older log's commands through them. See `CommandStep`. |
| `queries` | `Record<string, (state:` [`GameState`](/docs/api/engine#gamestate)`, args:` [`PluginArgs`](#pluginargs)`, context:` [`PluginContext`](#plugincontext)`<S>) => unknown>` | yes |  | The plugin's queries, answers other plugins ask for by name without importing it, such as `context.query('calendar/whenNext', { when })`. A query answers what a condition's yes or no can't, such as a location, a time or a list. |
| `statModifiers` | `((state:` [`GameState`](/docs/api/engine#gamestate)`, context:` [`PluginContext`](#plugincontext)`<S>) => readonly` [`StatModifier[]`](#statmodifier) `\| undefined)` | yes |  | Returns the changes to what the player's stats read now, worked out from the plugin's state, such as a timed boost. It must not read stats itself, or it reads itself. Nothing is written into the state. Every reading of the stat (conditions, derived stats, costs, the view) sees the changed value, and `stat` effects still write the kept value underneath. |
| `onTurn` | `((state:` [`GameState`](/docs/api/engine#gamestate)`, context:` [`TurnContext`](#turncontext)`<S>) =>` [`GameState`](/docs/api/engine#gamestate)`)` | yes |  | The hook run at the end of a turn, once the counter has moved on and `resets` are back. It returns the next state, and the hooks run in order, the game's first. `context.before` is the state as the turn ended, and a `turn` effect applied through `context.apply` does nothing. |
| `onTurnDone` | `((state:` [`GameState`](/docs/api/engine#gamestate)`, context:` [`TurnContext`](#turncontext)`<S>) =>` [`GameState`](/docs/api/engine#gamestate)`)` | yes |  | The hook run once every `onTurn` has run, so it sees their changes, such as the calendar's new day. It returns the next state and runs in the same order and context as `onTurn`. |
| `onStat` | `((before:` [`GameState`](/docs/api/engine#gamestate)`, after:` [`GameState`](/docs/api/engine#gamestate)`, stat: string, by: number, context:` [`PluginContext`](#plugincontext)`<…` | yes |  | The hook run when a `stat` effect changes one of the player's stats. `before` is the state before it, `after` the state with it, and `by` how far it moved. Return `before` to undo the change, `after` to keep it, or `after` with more changes. The hooks run in order, the game's first, each seeing what the one before returned. |
| `onCommand` | `((before:` [`GameState`](/docs/api/engine#gamestate)`, after:` [`GameState`](/docs/api/engine#gamestate)`, context:` [`PluginContext`](#plugincontext)`<S>) =>` [`GameState`](/docs/api/engine#gamestate)`)` | yes |  | The hook run after every command that took, with the state before and the state after. It returns the next state, and its context is the state after. |
| `guard` | `((state:` [`GameState`](/docs/api/engine#gamestate)`, asked:` [`Asked`](#asked)`, context:` [`PluginContext`](#plugincontext)`<S>) =>` [`Refusal`](#refusal) `\| undefined)` | yes |  | Returns a `Refusal` for a command, given the effects it would apply, or undefined to let it through. The engine asks it after the locks, of every command but the ones that ignore locks. |
| `price` | `((state:` [`GameState`](/docs/api/engine#gamestate)`, effects: readonly` [`Effect[]`](/docs/api/engine#effect)`, context:` [`PluginContext`](#plugincontext)`<S>) => string[] \|…` | yes |  | Returns the plugin's words for what a button costs that the engine can't say, such as `['until evening']`. The engine asks it with the effects the button would apply. |
| `saveName` | `((state:` [`GameState`](/docs/api/engine#gamestate)`, context:` [`PluginContext`](#plugincontext)`<S>) => string \| undefined)` | yes |  | Returns the name a save is listed under, such as the name the player typed. It is kept as `SaveMeta.playerName` and shown for `@you`'s lines. The first that answers names it, the game's first. With none, saves have no player name. |
| `profile` | `((state:` [`GameState`](/docs/api/engine#gamestate)`, previous:` [`GameState`](/docs/api/engine#gamestate)`, stored: unknown, context:` [`PluginContext`](#plugincontext)`<S>) =>…` | yes |  | Returns the value the plugin keeps in the player's profile, which outlives saves and new games, such as earned achievements. Return undefined to leave the stored value. The runner asks it after every command that took, with the state after, the state before and the value the plugin's profile namespace (its id) holds now. Only a runner with a `profile` asks, and `apply` never does. |
| `check` | `(game:` [`Game`](/docs/api/engine#game)`, tools:` [`CheckTools`](#checktools)`) =>` [`PluginProblem[]`](#pluginproblem) | yes |  | Returns the problems the plugin's own rules find that a reference can't express, such as two entries with one id or an exit to nowhere. The content checker runs it after the references. `tools` words problems with anything else the plugin names as the checker does. |
| `conditions` | `Record<string, (state:` [`GameState`](/docs/api/engine#gamestate)`, args:` [`PluginArgs`](#pluginargs)`, context:` [`PluginContext`](#plugincontext)`<S>) =>…` | yes |  | The plugin's conditions content can test, by name without the prefix. |
| `effects` | `Record<string, (state:` [`GameState`](/docs/api/engine#gamestate)`, args:` [`PluginArgs`](#pluginargs)`, context:` [`PluginContext`](#plugincontext)`<S>) =>…` | yes |  | The plugin's effects content can apply, by name without the prefix. Each takes the state the effects before it left and returns the next one, so two in one list compose. Prices and guards can't see what an effect does until it runs. An effect that only stands for other effects belongs in `macros` instead. |
| `commands` | `Record<string,` [`PluginCommand`](#plugincommand)`<S,` [`PluginArgs`](#pluginargs)`>> \| { [K in keyof` [`CallArgs`](#callargs)`<C, 'commands'>]:…` | yes |  | The plugin's commands a choice or action can send, by name without the prefix. |
| `macros` | `Record<string,` [`Macro`](#macro)`<S,` [`PluginArgs`](#pluginargs)`>> \| { [K in keyof` [`CallArgs`](#callargs)`<C, 'effects'>]?:` [`Macro`](#macro)`<S,…` | yes |  | The plugin's macros, effects that stand for other effects, by name without the prefix. A name is an effect's or a macro's, never both. Content calls one as any effect. It returns the effects it stands for, worked out from the state, so a button's price and the guards see what it would do. See `Macro`. |

## PluginEntry

Type. Explained in [A plugin's content checks](/docs/reference/plugin-checks#pluginentry).

One entry of a plugin's content in a pack, with an id and the fields the plugin reads.

```ts shape
import type { PluginEntry } from '@ifloom/engine/plugin'
type PluginEntry = {
  id: string
}
```

It also takes any other key: `[key: string]: unknown`.

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The entry's id. |

## PluginProblem

Type. Explained in [A plugin's content checks](/docs/reference/plugin-checks#pluginproblem).

A fault a plugin's `check` finds in its content, with the list and entry it is in.

```ts shape
import type { PluginProblem } from '@ifloom/engine/plugin'
type PluginProblem = {
  list: string
  id: string
  what: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `list` | `string` |  |  | The name of the plugin's list the entry is in. |
| `id` | `string` |  |  | The entry's id. |
| `what` | `string` |  |  | The fault, in the words the report shows. |

## PluginReferences

Type. Explained in [A plugin's content checks](/docs/reference/plugin-checks#pluginreferences-calltable-and-contentreferences).

The references a plugin's calls and content make. The content checker resolves each against the game and reports
what is missing, worded and placed as its own problems are.

```ts shape
import type { PluginReferences } from '@ifloom/engine/plugin'
type PluginReferences = {
  calls?: (table: CallTable, name: string, args: PluginArgs, game: Game) => readonly Reference[]
  panels?: (panel: string, args: PluginArgs, game: Game) => readonly Reference[]
  content?: (game: Game) => readonly ContentReferences[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `calls` | `(table:` [`CallTable`](#calltable)`, name: string, args:` [`PluginArgs`](#pluginargs)`, game:` [`Game`](/docs/api/engine#game)`) => readonly` [`Reference[]`](#reference) | yes |  | Returns the references a call to one of the plugin's conditions, effects or commands makes, by name without the prefix, from the call's arguments. The checker asks it of every call it finds. A reference can be a location, a character or a prose key. A rule of the plugin's own about the arguments is a `{ problem }`, such as `{ problem: 'count must be a whole number' }`. |
| `panels` | `(panel: string, args:` [`PluginArgs`](#pluginargs)`, game:` [`Game`](/docs/api/engine#game)`) => readonly` [`Reference[]`](#reference) | yes |  | Returns the references opening one of the plugin's panels makes, from its `with`, such as `[{ entity: 'vendor:fish', carrying: 'shop/vendor' }]` for `panel: 'shop'`. The checker asks it of every panel it finds. Return nothing for a panel that isn't the plugin's. A UI checks a panel no plugin claims. |
| `content` | `(game:` [`Game`](/docs/api/engine#game)`) => readonly` [`ContentReferences[]`](#contentreferences) | yes |  | Returns the references the plugin's content makes, entry by entry, such as `{ list: 'locations', id: 'cafe', refs: [...] }`. The checker reports a problem against `<list> <id>`, on the pack the entry came from. |

## PluginSlice

Type. Explained in [Plugin migrations](/docs/reference/plugin-migrations#pluginslice).

The state a save keeps for one plugin, with the version of its shape.

```ts shape
import type { PluginSlice } from '@ifloom/engine/plugin'
type PluginSlice = {
  version: number
  state: unknown
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `version` | `number` |  |  | The plugin's `version` the state was written in. |
| `state` | `unknown` |  |  | The plugin's state. |

## priceView

Function. Explained in [The view](/docs/reference/view#priceview).

Returns the `Price` of some stats and notes, or null when it costs nothing. A plugin's view calls it for a
price of its own, such as a vendor's full price.

It lists each stat spent above 0 in the order given, worded as the stat's value is, then the `notes`, and joins them
into one line in `text`.

```ts shape
import { priceView } from '@ifloom/engine/plugin'
function priceView(game: Game, stats: Readonly<Record<string, number>>, notes?: readonly string[]): Price | null
```

Uses: [`Game`](/docs/api/engine#game), [`Price`](/docs/api/engine#price).

## QueryAnswer

Type. Explained in [Queries and partners](/docs/reference/plugin-queries#queryargs-and-queryanswer).

The answer a query gives, as `QueryRegistry` declares it, or `unknown` for an undeclared name.

```ts shape
import type { QueryAnswer } from '@ifloom/engine/plugin'
type QueryAnswer<K extends PropertyKey> = K extends keyof QueryRegistry ? QueryRegistry[K] extends (...args: never[]) => infer R ? R : unknown : unknown
```

Uses: [`QueryRegistry`](/docs/api/engine#queryregistry).

## QueryArgs

Type. Explained in [Queries and partners](/docs/reference/plugin-queries#queryargs-and-queryanswer).

The arguments a query takes, as `QueryRegistry` declares them, or an optional object for an undeclared name.

```ts shape
import type { QueryArgs } from '@ifloom/engine/plugin'
type QueryArgs<K extends PropertyKey> = K extends keyof QueryRegistry ? QueryRegistry[K] extends (...args: infer A) => unknown ? A : [ PluginArgs? ] : [ PluginArgs? ]
```

Uses: [`QueryRegistry`](/docs/api/engine#queryregistry), [`PluginArgs`](#pluginargs).

## RawCall

Type. Explained in [Plugin migrations](/docs/reference/plugin-migrations#rawcall).

A plugin call passed to a `ContentTools.calls` rewrite.

```ts shape
import type { RawCall } from '@ifloom/engine/plugin'
type RawCall = {
  name: string
  with: unknown
  form: CallForm
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `name` | `string` |  |  | The call's full name, such as `'places/at'`. |
| `with` | `unknown` |  |  | The call's arguments, unchanged from the pack. |
| `form` | [`CallForm`](#callform) |  |  | The call's form in the pack. |

## RawCommand

Type. Explained in [Plugin migrations](/docs/reference/plugin-migrations#rawcommand).

A command from a command log, in the shape of the engine or plugin version that wrote it.

```ts shape
import type { RawCommand } from '@ifloom/engine/plugin'
type RawCommand = {
  type: string
}
```

It also takes any other key: `[key: string]: unknown`.

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `type` | `string` |  |  | The command's type, such as `choose` or a plugin's `quests/track`. |

## Reference

Type. Explained in [Checking content](/docs/reference/checks#reference).

One name a piece of content uses, such as an id, a file or a nested condition, for the content checker to resolve.

The checker looks inside content that names more, such as a condition, effects, a command, blocks or a picture.

The type is built from the core's kinds and each feature's (`references` in its shape), as `Condition` is.

```ts shape
import type { Reference } from '@ifloom/engine/plugin'
type Reference =
  | { effects: readonly Effect[] | undefined; }
  | { audio: string; }
  | { media: SceneMedia; }
  | { ui: unknown; on: UiTarget; id?: string; }
  | { entity: string; carrying?: string; }
  | { storyline: string; }
  | { setting: string; is?: KvValue; }
  | { stat: string; of?: string; writes?: boolean; }
  | { stat: string; starts: string; }
  | { scene: string; as?: 'open' | 'go' | 'gate'; }
  | { timer: string; to?: unknown; by?: unknown; }
  | { blocks: readonly Block[] | undefined; }
  | { prose: string; }
  | { words: string | undefined; field: string; oldKey?: string; }
  | { outdated: string; }
  | { problem: string; }
  | { variants: string; }
  | { value: string; }
  | { amount: unknown; }
  | { call: CallTable; name: string; with?: PluginArgs; }
  | { entry: string; plugin: string; list: string; noun: string; }
  | { reason: string | { string: string; } | undefined; }
  | { picture: string; }
  | { video: string; }
  | { markup: string; shownWhen?: Condition; }
  | { when: Condition | undefined; }
  | { command: CommandRef | undefined; }
  | { within: string; refs: readonly Reference[]; }
  | { kind: string; }
  | { speaker: string; }
  | { holder: string; holds?: string; protagonist?: boolean; }
  | { like: string; of?: string; }
  | { trait: string; }
  | { action: string; }
  | { input: string; }
  | { choice: string; }
  | { drawnFrom: string; }
  | { actionsIn: string | readonly Block[] | undefined; offers: readonly string[]; }
  | { minigame: string; }
  | { minigameKv: string; }
  | { jump: string; }
  | { channel: string; track: string | null | undefined; }
  | { sound: string; }
  | { pool: string; tags?: readonly string[]; }
  | { layered: PictureDef | undefined; choices: readonly string[] | null; }
  | { openPanel: string; with?: PluginArgs; }
  | { dice: unknown; key?: unknown; }
```

Uses: [`Effect`](/docs/api/engine#effect), [`SceneMedia`](/docs/api/engine#scenemedia), [`UiTarget`](/docs/api/engine#uitarget), [`KvValue`](/docs/api/engine#kvvalue), [`Block`](/docs/api/engine#block), [`CallTable`](#calltable), [`PluginArgs`](#pluginargs), [`Condition`](/docs/api/engine#condition), [`CommandRef`](/docs/api/engine#commandref), [`PictureDef`](/docs/api/engine#picturedef).

## Refusal

Type. Explained in [Plugin API](/docs/reference/plugin-api#asked-and-refusal).

A plugin guard's reason for refusing a command. A string refuses it as a lock does, and the button is disabled with
that reason.

`{ reason, soft: true }` is a warning instead. The button stays pressable and shows the warning, but the reducer
still refuses the command, such as running the clock past dawn, where a UI offers bed in its place.

```ts shape
import type { Refusal } from '@ifloom/engine/plugin'
type Refusal = string | { reason: string; soft: true }
```

## renderAction

Function. Explained in [The view](/docs/reference/view#renderaction).

Returns an action as a `RenderedChoice`, with its label, its price and the reason it's refused now, if any. A
plugin calls it to offer actions outside the room, such as in a device's app.

Availability comes from `whyNot`, so the button and the reducer always agree. `owner` is the id of the plugin whose
action it is, so one with a cost or effects runs as `'<owner>/<id>'` (see `Plugin.action`). Left out, the action is the
game's.

```ts shape
import { renderAction } from '@ifloom/engine/plugin'
function renderAction(state: GameState, game: Game, action: ActionDef, owner?: string): RenderedChoice
```

Uses: [`GameState`](/docs/api/engine#gamestate), [`Game`](/docs/api/engine#game), [`ActionDef`](/docs/api/engine#actiondef), [`RenderedChoice`](/docs/api/engine#renderedchoice).

## RoomScene

Type. Explained in [A plugin's view, scene and actions](/docs/reference/plugin-views#roomscene).

The screen shown while no scene is open, from a plugin's `scene` provider.

```ts shape
import type { RoomScene } from '@ifloom/engine/plugin'
type RoomScene = {
  title: string
  body?: readonly Block[]
  id?: string
  ui?: Ui<SceneUi>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `title` | `string` |  |  | The room's title, such as a location's name. |
| `body` | `readonly` [`Block[]`](/docs/api/engine#block) | yes |  | The room's body, as a scene's blocks, such as prose keys, variants and conditions. |
| `id` | `string` | yes |  | The id the room's blocks are rendered under. The plugin's id if left out. Variants drawn here rotate per id, so a location gives its own id to keep its lines its own. |
| `ui` | [`Ui`](/docs/api/engine#ui)`<`[`SceneUi`](/docs/api/engine#sceneui)`>` | yes |  | The room's `ui` hints, carried to `view.scene.ui` as a scene's are. See `SceneUi`. |

## SenderView

Type. Explained in [Queries and partners](/docs/reference/plugin-queries#castcontact-and-senderview).

The sender of a message or a post, as the cast's `cast/sender` query answers.

```ts shape
import type { SenderView } from '@ifloom/engine/plugin'
type SenderView = {
  name: string
  image: string | null
  portrait: string | null
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `name` | `string` |  |  | The sender's name. |
| `image` | `string \| null` |  |  | The sender's picture, or null. |
| `portrait` | `string \| null` |  |  | The sender's face for a small avatar, a person's `portrait`, or null. |

## setTraitState

Function. Explained in [Entities](/docs/reference/entities#settraitstate).

Returns the state with one entity's state for one trait replaced. The state is unchanged for an entity not in the game.

```ts shape
import { setTraitState } from '@ifloom/engine/plugin'
function setTraitState(state: GameState, game: Game, ref: string, id: string, next: unknown): GameState
```

Uses: [`GameState`](/docs/api/engine#gamestate), [`Game`](/docs/api/engine#game).

## SpeakerFinder

Type. Explained in [Prose and markup](/docs/reference/prose#speakerfinder).

A function that returns the speaker of a line written under `@id`, given the id. It returns whether the line is the
player's, the entity the id names, and the name to show.

`lineSpeakers` returns the engine's.

```ts shape
import type { SpeakerFinder } from '@ifloom/engine/plugin'
type SpeakerFinder = (id: string) => { who: 'character' | 'player'; speaker?: EntityRef; name: string }
```

Uses: [`EntityRef`](/docs/api/engine#entityref).

## speakerOf

Function. Explained in [A plugin's view, scene and actions](/docs/reference/plugin-views#speakerof).

Returns the speaker a speaker id names, with their entity's name, picture and hints. Returns null when the id names
no entity in the game.

The view renders a scene's `speaker` with it, and a plugin calls it for the sender of a message or a post.

```ts shape
import { speakerOf } from '@ifloom/engine/plugin'
function speakerOf(state: GameState, game: Game, id: string): SpeakerView | null
```

Uses: [`GameState`](/docs/api/engine#gamestate), [`Game`](/docs/api/engine#game), [`SpeakerView`](/docs/api/engine#speakerview).

## StatModifier

Type. Explained in [Plugin API](/docs/reference/plugin-api#statmodifier).

A change to what one of the player's stats reads, from a plugin's `statModifiers`. The stat reads
`(value + adds) × multipliers`, held to its range, with its adds summed and its multipliers multiplied together.

```ts shape
import type { StatModifier } from '@ifloom/engine/plugin'
type StatModifier = {
  stat: string
  add?: number
  multiply?: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `stat` | `string` |  |  | The id of the stat the modifier changes. |
| `add` | `number` | yes |  | The amount added to the stat's value. 0 if left out. |
| `multiply` | `number` | yes |  | The factor the stat's value, with the adds, is multiplied by. 1 if left out. |

## styledBeats

Function. Explained in [Prose and markup](/docs/reference/prose#styledbeats).

Returns text and spoken beats with their bold, italics and UI pieces read into `spans`, and `text` with the words
alone. A beat with none of these is returned unchanged.

Use it for beats rendered outside a scene's view, such as a message's or a post's. Inline actions and tooltips stay
in the words as written, since only the view has the choices and the prose.

```ts shape
import { styledBeats } from '@ifloom/engine/plugin'
function styledBeats(beats: readonly SceneBeat[]): SceneBeat[]
```

Uses: [`SceneBeat`](/docs/api/engine#scenebeat).

## TraitDef

Type. Explained in [A plugin's view, scene and actions](/docs/reference/plugin-views#traitdef).

A trait a plugin declares in its `traits`, a named piece of data entities carry that the plugin gives meaning. The
game declares its own in `rules.traits`, with ids that have no `/`.

Name `K` to type the data as `TraitRegistry` declares it, as in
`const washable: TraitDef<'laundry/washable'> = { id: 'laundry/washable', ... }`.

```ts shape
import type { TraitDef } from '@ifloom/engine/plugin'
type TraitDef<K extends string = string, S = unknown> = {
  id: K
  check?: ((data: TraitData<K>, tools: TraitTools) => readonly string[])
  references?: ((data: TraitData<K>, tools: TraitTools) => readonly Reference[])
  words?: WordShape
  state?: { start(data: TraitData<K>): S }
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `K` |  |  | The trait's id, the plugin's id, `/` and a name, such as `'laundry/washable'`. |
| `check` | `((data:` [`TraitData`](/docs/api/engine#traitdata)`<K>, tools:` [`TraitTools`](#traittools)`) => readonly string[])` | yes |  | Returns the problems with the data on one entity by the plugin's own rules, such as `['a slot needs a name']`. The content checker calls it. |
| `references` | `((data:` [`TraitData`](/docs/api/engine#traitdata)`<K>, tools:` [`TraitTools`](#traittools)`) => readonly` [`Reference[]`](#reference)`)` | yes |  | Returns the references the trait's data makes, such as a slot, a scene or a prose key, for the content checker to resolve. `tools.ref` is the entity the data is on, for a condition that names it as `'$'`. |
| `words` | [`WordShape`](/docs/api/engine#wordshape) | yes |  | The fields of the data a player reads, for a translation's words table, such as `{ closed: true, body: 'blocks' }`. Each is keyed `entity.<ref>.traits.<id>.<field>`, or under the kind for a kind's default. See `WordShape`. |
| `state` | `{ start(data:` [`TraitData`](/docs/api/engine#traitdata)`<K>): S }` | yes |  | The trait's own state on each entity, such as the uses left in a torch, with `start` giving its value from the data. The save keeps it only once play writes it. Read it with `traitState` and write it with `setTraitState`. |

## TraitEntityDef

Type. Explained in [A plugin's view, scene and actions](/docs/reference/plugin-views#traitentitydef).

The definition a `TraitKind`'s `define` takes, with an entity's fields and the trait's side by side. A field
both have, such as a location's `ui`, goes to the trait.

```ts shape
import type { TraitEntityDef } from '@ifloom/engine/plugin'
type TraitEntityDef<K extends string> = {
  of?: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `of` | `string` | yes |  | The entity's kind, the trait kind's `kind` if left out. |

## TraitKind

Type. Explained in [A plugin's view, scene and actions](/docs/reference/plugin-views#traitkind).

A kind of entity a plugin's trait makes, as `defineTraitKind` declares it, such as the places plugin's locations.

It reads a bare id as an entity of its kind and gives the lookups, the definer and the checked arguments.

```ts shape
import type { TraitKind } from '@ifloom/engine/plugin'
type TraitKind<K extends string> = {
  readonly kind: string
  readonly trait: K
  ref: (id: string) => `${string}:${string}`
  id: (ref: string) => string
  all: (state: GameState, game: Game) => `${string}:${string}`[]
  get: (state: GameState, game: Game, id: string | null | undefined) => TraitData<K> | undefined
  declaredAll: (game: Game) => `${string}:${string}`[]
  declaredGet: (game: Game, id: string | null | undefined) => TraitData<K> | undefined
  define: (def: TraitEntityDef<K>) => EntityDef
  entry: (id: string) => Reference
  arg: () => Arg<string, string, false>
  args: () => Arg<string | readonly string[], string[], false>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `kind` | `string` |  |  | The kind a bare id names. |
| `trait` | `K` |  |  | The id of the trait that makes an entity one of these. |
| `ref` | `(id: string) => '${string}:${string}'` |  |  | Returns the entity reference an id names. A bare id is one of the kind (`'park'` is `'location:park'`), and a reference stays as written. |
| `id` | `(ref: string) => string` |  |  | Returns the id the plugin names an entity by, its bare id for one of the kind, else its whole reference. |
| `all` | `(state:` [`GameState`](/docs/api/engine#gamestate)`, game:` [`Game`](/docs/api/engine#game)`) => '${string}:${string}'[]` |  |  | Returns every entity in the game now with the trait, those content declares in its order, then those made in play. |
| `get` | `(state:` [`GameState`](/docs/api/engine#gamestate)`, game:` [`Game`](/docs/api/engine#game)`, id: string \| null \| undefined) =>` [`TraitData`](/docs/api/engine#traitdata)`<K> \| undefined` |  |  | Returns the trait of the entity an id or reference names, read through the entity it was made `like`. Undefined for an entity that isn't in the game or has no trait. |
| `declaredAll` | `(game:` [`Game`](/docs/api/engine#game)`) => '${string}:${string}'[]` |  |  | Returns every entity content declares with the trait, in its order, for a check, which has no state. |
| `declaredGet` | `(game:` [`Game`](/docs/api/engine#game)`, id: string \| null \| undefined) =>` [`TraitData`](/docs/api/engine#traitdata)`<K> \| undefined` |  |  | Returns the trait of an entity content declares, by id or reference, for a check, which has no state. |
| `define` | `(def:` [`TraitEntityDef`](#traitentitydef)`<K>) =>` [`EntityDef`](/docs/api/engine#entitydef) |  |  | Returns an entity for content's `entities`, of the kind unless `of` says otherwise. The trait's fields go in `traits[trait]` and the rest stay on the entity. |
| `entry` | `(id: string) =>` [`Reference`](#reference) |  |  | Returns the reference to an entity by id or reference, which the checker resolves to one the game has that carries the trait. |
| `arg` | `() =>` [`Arg`](#arg)`<string, string, false>` |  |  | Returns a call's argument naming one entity by id or reference, `'park'` or `'location:park'`, checked as `entry` is. |
| `args` | `() =>` [`Arg`](#arg)`<string \| readonly string[], string[], false>` |  |  | Returns a call's argument naming one entity or several, `'park'` or `['cafe', 'park']`, which the implementation gets as a list. |

## TraitKindSpec

Type. Explained in [A plugin's view, scene and actions](/docs/reference/plugin-views#traitkindspec).

Settings for `defineTraitKind`.

```ts shape
import type { TraitKindSpec } from '@ifloom/engine/plugin'
type TraitKindSpec<K extends string> = {
  kind: string
  trait: K
  fields: { readonly [F in keyof Required<TraitData<K>>]: true }
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `kind` | `string` |  |  | The kind a bare id names, such as `'location'`, so `'park'` is `'location:park'`. |
| `trait` | `K` |  |  | The id of the trait that makes an entity one of these, such as `'places/location'`. |
| `fields` | `{ readonly [F in keyof Required<`[`TraitData`](/docs/api/engine#traitdata)`<K>>]: true }` |  |  | The trait's fields, as `{ exits: true, body: true, … }`, which `define` puts in the trait rather than on the entity. The type requires every field, so a field added to the trait can't be left out. |

## traitState

Function. Explained in [Entities](/docs/reference/entities#traitstate).

Returns the state one entity keeps for one of its traits, the value play last wrote or else the trait's
`state.start`.

It returns undefined when the entity isn't in the game, lacks the trait, or the trait keeps no state.

```ts shape
import { traitState } from '@ifloom/engine/plugin'
function traitState<S = unknown>(state: GameState, game: Game, ref: string, id: string): S | undefined
```

Uses: [`GameState`](/docs/api/engine#gamestate), [`Game`](/docs/api/engine#game).

## TraitTools

Type. Explained in [A plugin's view, scene and actions](/docs/reference/plugin-views#traittools).

The tools a trait's `check` and `references` get beside the data.

```ts shape
import type { TraitTools } from '@ifloom/engine/plugin'
type TraitTools = {
  game: Game
  ref: EntityRef
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `game` | [`Game`](/docs/api/engine#game) |  |  | The loaded game. |
| `ref` | [`EntityRef`](/docs/api/engine#entityref) |  |  | The entity the data is on. |

## TurnContext

Type. Explained in [Rules and hooks](/docs/reference/rules#turncontext).

The context `onTurn` and `onTurnDone` get, the game's and every plugin's, with `before` added. Its `apply` ends no
turn, so a `turn` effect applied through it does nothing.

```ts shape
import type { TurnContext } from '@ifloom/engine/plugin'
type TurnContext<S = any> = {
  game: Game
  query: Query
  value: (name: string, args?: PluginArgs) => string | number | undefined
  roll: (max: number, name: string) => number
  slice: S
  get: (on?: GameState | undefined) => S
  set: (next: S, on?: GameState | undefined) => GameState
  apply: (effects: readonly EffectRef[], on?: GameState) => GameState
  picks?: Record<string, string>
  beats: (blocks: readonly Block[], id: string) => SceneBeat[]
  profile?: unknown
  before: GameState
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `game` | [`Game`](/docs/api/engine#game) |  |  | The context's loaded game. |
| `query` | [`Query`](/docs/api/engine#query) |  |  | The context's query function, which asks a plugin or the game by full name (`query('places/here')`). |
| `value` | `(name: string, args?:` [`PluginArgs`](#pluginargs)`) => string \| number \| undefined` |  |  | The context's value function, which returns a value by full name, a plugin's (`messages/unread`) or the game's, asked with `args`. It returns undefined when no plugin or game has that value. |
| `roll` | `(max: number, name: string) => number` |  |  | The context's roll function, which returns a whole number from 0 to `max - 1`, drawn from the save's seed, the turn and `name`. The same save and turn always draw the same number. |
| `slice` | `S` |  |  | The plugin's state in the game state the function was given, the same as `get()`. |
| `get` | `(on?:` [`GameState`](/docs/api/engine#gamestate) `\| undefined) => S` |  |  | Returns the plugin's state in the game state the function was given, or in `on`. Its starting state (`start`) when the save has none yet. Pass `on` from a function that has already changed the game state, such as by applying effects, to read the plugin's state as it is now. It is the read that matches `set`. |
| `set` | `(next: S, on?:` [`GameState`](/docs/api/engine#gamestate) `\| undefined) =>` [`GameState`](/docs/api/engine#gamestate) |  |  | Returns the game state with the plugin's state replaced, on the state the function was given or on `on`. Pass `on` from a function that has already changed other parts of the game state. |
| `apply` | `(effects: readonly` [`EffectRef[]`](/docs/api/engine#effectref)`, on?:` [`GameState`](/docs/api/engine#gamestate)`) =>` [`GameState`](/docs/api/engine#gamestate) |  |  | Returns the state after a list of effects, applied to the state the function was given or to `on`. Any effect works, a custom one or another plugin's included. A plugin's effect ends a turn with `apply([{ turn: true }])`. |
| `picks` | `Record<string, string>` | yes |  | The record of the pool picks a `view` makes, for the reducer to keep. It is set only in `view`. Pass it to `pictureView` so a picture's pick stays the same on every visit. `beats` records its own. |
| `beats` | `(blocks: readonly` [`Block[]`](/docs/api/engine#block)`, id: string) =>` [`SceneBeat[]`](/docs/api/engine#scenebeat) |  |  | Returns blocks rendered as beats, the way a scene's body is, for a message's words, a post's or an app's. Only the blocks whose `when` holds are rendered. Words are filled in for this save, variants and pools drawn under `id` so a block's pick stays the same on every visit, spoken lines given their speakers, and bold, italics and UI pieces made spans. Inline actions and tooltips stay as plain words, since only a scene offers choices. In `view`, the reducer records the pool picks it makes. |
| `profile` | `unknown` | yes |  | The value the plugin's own profile namespace (its id) held when the runner last read or wrote it. It is set only in `view`, when a runner with a profile builds the view. It is frozen, so read it and never change it. It is undefined in a view built by `view(state, game)` alone and while nothing is stored. Conditions, effects, commands and hooks never see it, so a replay always plays the same. |
| `before` | [`GameState`](/docs/api/engine#gamestate) |  |  | The state as the turn ended, before the counter moved on and `resets` were put back. |

## WrittenAs

Type. Explained in [Declaring a plugin's calls](/docs/reference/plugin-calls#writtenas).

The value content writes for a call of an `ArgShape`. It is the arguments, `true` or `{}` for a call with none,
and either for a call whose arguments may all be left out.

```ts fragment
type WrittenAs<S extends ArgShape> = [keyof S] extends [never] ? true | Record<string, never> : [RequiredKeys<S>] extends [never] ? true | { [K in keyof ({ [K in RequiredKeys<S>]: ArgIn<S[K]>; } & { [K in OptionalKeys<S>]?: ArgIn<S[K]>; })]: ({ [K in RequiredKeys<S>]: ArgIn<S[K]>; } & { [K in OptionalKeys<S>]?: ArgIn<S[K]>; })[K]; } : { [K in keyof ({ [K in RequiredKeys<S>]: ArgIn<S[K]>; } & { [K in OptionalKeys<S>]?: ArgIn<S[K]>; })]: ({ [K in RequiredKeys<S>]: ArgIn<S[K]>; } & { [K in OptionalKeys<S>]?: ArgIn<S[K]>; })[K]; }
```

Uses: [`ArgIn`](#argin).
