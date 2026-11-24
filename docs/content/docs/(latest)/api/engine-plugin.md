---
title: "@ifloom/engine/plugin"
description: "Every export of @ifloom/engine/plugin, the entry for writing a plugin: its signature and its fields."
---
Generated from the source of `@ifloom/engine/plugin` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

- Functions: [`actionReferences`](#actionreferences), [`anyOf`](#anyof), [`bindCurrent`](#bindcurrent), [`defineCalls`](#definecalls), [`defineData`](#definedata), [`definePlugin`](#defineplugin), [`defineTraitKind`](#definetraitkind), [`entityUi`](#entityui), [`list`](#list), [`lockedOut`](#lockedout), [`lockOn`](#lockon), [`panelOf`](#panelof), [`parseBeats`](#parsebeats), [`pictureView`](#pictureview), [`priceView`](#priceview), [`renderAction`](#renderaction), [`setTraitState`](#settraitstate), [`speakerOf`](#speakerof), [`styledBeats`](#styledbeats), [`traitState`](#traitstate)
- Constants: [`arg`](#arg-1)
- Types: [`AnyCalls`](#anycalls), [`Arg`](#arg), [`ArgIn`](#argin), [`ArgOut`](#argout), [`ArgShape`](#argshape), [`ArgsIn`](#argsin), [`ArgsOut`](#argsout), [`Asked`](#asked), [`CallArgs`](#callargs), [`CallForm`](#callform), [`CallIn`](#callin), [`CallShapes`](#callshapes), [`CallTable`](#calltable), [`CallWriter`](#callwriter), [`CastContact`](#castcontact), [`CheckTools`](#checktools), [`CommandsOf`](#commandsof), [`CommandStep`](#commandstep), [`ConditionsOf`](#conditionsof), [`ContentReferences`](#contentreferences), [`ContentStep`](#contentstep), [`ContentTools`](#contenttools), [`DataList`](#datalist), [`DefinedPlugin`](#definedplugin), [`EffectsOf`](#effectsof), [`ListSpec`](#listspec), [`Lock`](#lock), [`LockTarget`](#locktarget), [`Macro`](#macro), [`PackContext`](#packcontext), [`PartnerQueries`](#partnerqueries), [`Plugin`](#plugin), [`PluginArgs`](#pluginargs), [`PluginCalls`](#plugincalls), [`PluginCommand`](#plugincommand), [`PluginContext`](#plugincontext), [`PluginData`](#plugindata), [`PluginDef`](#plugindef), [`PluginEntry`](#pluginentry), [`PluginProblem`](#pluginproblem), [`PluginReferences`](#pluginreferences), [`PluginSlice`](#pluginslice), [`QueryAnswer`](#queryanswer), [`QueryArgs`](#queryargs), [`RawCall`](#rawcall), [`RawCommand`](#rawcommand), [`Reference`](#reference), [`Refusal`](#refusal), [`RoomScene`](#roomscene), [`SenderView`](#senderview), [`SpeakerFinder`](#speakerfinder), [`StatModifier`](#statmodifier), [`TraitDef`](#traitdef), [`TraitEntityDef`](#traitentitydef), [`TraitKind`](#traitkind), [`TraitKindSpec`](#traitkindspec), [`TraitTools`](#traittools), [`TurnContext`](#turncontext), [`WrittenAs`](#writtenas)

## actionReferences

Function. Explained in [Actions and buttons](/docs/reference/actions#actionreferences).

What an action names, for the content checker: its conditions, effects,
command and hints, and its words. For a plugin whose content holds actions
(a place's, an app's) to hand to its `references`.

```ts shape
import { actionReferences } from '@ifloom/engine/plugin'
function actionReferences(action: ActionDef): Reference[]
```

## AnyCalls

Type. Explained in [Writing a plugin](/docs/reference/plugins#plugincalls-and-anycalls).

What a plugin's calls' declaration says, by table, for any plugin.

```ts shape
import type { AnyCalls } from '@ifloom/engine/plugin'
type AnyCalls = {
  readonly id: string
  readonly conditions: Readonly<Record<string, { readonly call: string; readonly args: ArgShape }>>
  readonly effects: Readonly<Record<string, { readonly call: string; readonly args: ArgShape }>>
  readonly commands: Readonly<Record<string, { readonly call: string; readonly args: ArgShape }>>
}
```

## anyOf

Function. Explained in [Entities](/docs/reference/entities#anyof).

Any one of a kind, for checking content written with `'$'` before it runs.

```ts shape
import { anyOf } from '@ifloom/engine/plugin'
function anyOf(kind: string): EntityRef
```

## Arg

Type.

One argument of a call: what content writes for it (`In`), what the
implementation is handed (`Out`, read from whatever content wrote), whether
it may be left out, what the checker says of a value of the wrong shape, and
what a value names. Made with `arg`.

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
| `kind` | `string` |  |  | What a value must be, for the checker's problem: `'text'`, `'a number'`. |
| `isOptional` | `Optional` |  |  | May content leave it out? |
| `words` | `WordPart` | yes |  | Content's value is words a player reads, which a translation can replace. |
| `read` | `(value: unknown) => Out` |  |  | What the implementation is handed for content's value, whatever content wrote. |
| `fits` | `(value: unknown) => boolean` |  |  | Is content's value of the right shape? Asked only of a value content wrote. |
| `refs` | `(value: Out, game: Game) => readonly Reference[]` |  |  | What a value names, for the checker: a place, an entry, a `{ problem }`. |
| `optional` | `{ (): Arg<In, Out \| undefined, true>; <F extends Out>(fallback: F): Arg<In, Out, true>; }` |  |  | The same argument, which content may leave out: the implementation is handed `undefined` then, or `fallback` when one is given. |
| `naming` | `(refs: (value: Exclude<Out, undefined>, game: Game) => readonly Reference[]) => Arg<In, O…` |  |  | The same argument, naming these references too: `arg.string().naming(placeRefs)`. Inside `defineCalls`, give an inline function its return type, `(id): Reference[] => [...]`, or the registries built from the calls refer to themselves. |
| `rule` | `(problem: (value: Exclude<Out, undefined>) => string \| undefined) => Arg<In, Out, Optiona…` |  |  | The same argument, with a rule of the plugin's own about its value: what is wrong with it, in the checker's words, or undefined when nothing is. `arg.number().rule((n) => (n >= 1 ? undefined : 'count must be 1 or more'))`. |
| `_in` | `In` | yes |  | Phantom: what content writes. Never set. |

## arg

Const. Explained in [Writing a plugin](/docs/reference/plugins#arg).

The arguments a call can take, for `defineCalls`. Each reads what content
wrote into what the implementation is handed, whatever it was (a missing
text is `''`, a list of one is a list); the checker reports a value of the
wrong shape. `.optional()` lets content leave one out, `.optional(1)` with
what the implementation is handed then; `.naming(fn)` adds what a value
names, for the checker: `arg.string().naming((id) => [{ scene: id }])`.

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
| `string` | `() => Arg<string, string, false>` |  |  | Text: `'cafe'`. Read as text; `''` when missing. |
| `words` | `() => Arg<string, string, false>` |  |  | Words a player reads, which a translation can replace: a post's text. |
| `number` | `() => Arg<number, number, false>` |  |  | A number: `2`. Read as a number; `0` when missing or not one. |
| `boolean` | `() => Arg<boolean, boolean, false>` |  |  | True or false. |
| `strings` | `() => Arg<string \| readonly string[], string[], false>` |  |  | One text or a list of them, `'cafe'` or `['cafe', 'park']`, handed as a list. |
| `numbers` | `() => Arg<number \| readonly number[], number[], false>` |  |  | One number or a list of them, handed as a list. |
| `entity` | `(trait?: string \| undefined) => Arg<'${string}:${string}', '${string}:${string}', false>` |  |  | An entity, by reference: `'food:bun'`. Named to the checker, which must find it, carrying `trait` when one is given. |
| `holder` | `() => Arg<Holder, Holder, false>` |  |  | Who has things: `'player'`, `'you'` or a unique entity. Named to the checker. |
| `kv` | `() => Arg<KvValue, KvValue, false>` |  |  | A kv value: true or false, a number or text. |
| `amount` | `() => Arg<Amount, Amount, false>` |  |  | An `Amount`, worked out when it's read: read it with `amountOf`. Named to the checker. |
| `range` | `() => Arg<Range, Range, false>` |  |  | A range, `{ gte: 2 }`, as an argument of its own: `stacks: { gte: 2 }`. Its bounds are amounts, named to the checker. |
| `entry` | `(list: DataList<any>) => Arg<string, string, false>` |  |  | An entry of one of the plugin's data lists, by id: `arg.entry(DATA.jobs)`. Named to the checker, which reports one the list doesn't have. |
| `entries` | `(list: DataList<any>) => Arg<string \| readonly string[], string[], false>` |  |  | One entry of a data list or several, handed as a list. As `entry`. |
| `bounds` | `{ gte: Arg<Amount, Amount \| undefined, true>; gt: Arg<Amount, Amount \| undefined, true>;…` |  |  | A range's bounds as the call's own arguments, `{ job: 'cafe', gte: 3 }`: spread them into a shape, `{ job: arg.entry(DATA.jobs), ...arg.bounds }`. The core checks a call's bounds itself. |

## ArgIn

Type. Explained in [Writing a plugin](/docs/reference/plugins#argin-argout-argsin-and-argsout).

What content writes for an argument.

```ts shape
import type { ArgIn } from '@ifloom/engine/plugin'
type ArgIn<A> = A extends Arg<infer In, any, any> ? In : never
```

## ArgOut

Type. Explained in [Writing a plugin](/docs/reference/plugins#argin-argout-argsin-and-argsout).

What the implementation is handed for an argument.

```ts shape
import type { ArgOut } from '@ifloom/engine/plugin'
type ArgOut<A> = A extends Arg<any, infer Out, any> ? Out : never
```

## ArgShape

Type. Explained in [Writing a plugin](/docs/reference/plugins#argshape-and-callshapes).

What one call takes: its arguments by name. `{}` for a call with none, written `true`.

```ts shape
import type { ArgShape } from '@ifloom/engine/plugin'
type ArgShape = {
  [key: string]: Arg<any, any, boolean>
}
```

## ArgsIn

Type. Explained in [Writing a plugin](/docs/reference/plugins#argin-argout-argsin-and-argsout).

The arguments content writes for a call of this shape, as an object.

```ts fragment
type ArgsIn<S extends ArgShape> = { [K in keyof ({ [K in RequiredKeys<S>]: ArgIn<S[K]>; } & { [K in OptionalKeys<S>]?: ArgIn<S[K]>; })]: ({ [K in RequiredKeys<S>]: ArgIn<S[K]>; } & { [K in OptionalKeys<S>]?: ArgIn<S[K]>; })[K]; }
```

## ArgsOut

Type. Explained in [Writing a plugin](/docs/reference/plugins#argin-argout-argsin-and-argsout).

What the implementation of a call of this shape is handed: every argument, read.

```ts shape
import type { ArgsOut } from '@ifloom/engine/plugin'
type ArgsOut<S extends ArgShape> = {
  [key: string]: { [K in keyof S]: ArgOut<S[K]>; }[string]
}
```

## Asked

Type. Explained in [Writing a plugin](/docs/reference/plugins#asked-and-refusal).

What a guard is asked about: the command, and the effects it would apply.

```ts shape
import type { Asked } from '@ifloom/engine/plugin'
type Asked = {
  command: Command
  effects: readonly Effect[]
}
```

## bindCurrent

Function. Explained in [Entities](/docs/reference/entities#bindcurrent).

Put a real reference where content wrote `'$'`: in every `of`, `entity`,
`at` and `like` of a condition or an effect list, a `remove`, `move` or
`you` effect's target, a `move`'s `from` and `to`, and anywhere in a
plugin's or the game's call's arguments or what a `create` is made `with`
(`{ 'cast/met': { character: '$' } }`). A nested `each`'s effects and a
nested `count`'s `where` are left alone: their `'$'` is their own.

```ts shape
import { bindCurrent } from '@ifloom/engine/plugin'
function bindCurrent<T extends Condition | EffectRef | readonly EffectRef[] | undefined>(value: T, ref: EntityRef): T
```

## CallArgs

Type. Explained in [Writing a plugin](/docs/reference/plugins#callargs).

What the implementation of each call in a table is handed, by name.

```ts fragment
type CallArgs<C, T extends keyof CallShapes> = { [K in keyof ShapesOf<C, T>]: ShapesOf<C, T>[K] extends ArgShape ? { [K in keyof { [K in keyof ShapesOf<C, T>[K]]: ArgOut<ShapesOf<C, T>[K][K]>; }]: { [K in keyof ShapesOf<C, T>[K]]: ArgOut<ShapesOf<C, T>[K][K]>; }[K]; } : never; }
```

## CallForm

Type. Explained in [Writing a plugin](/docs/reference/plugins#callform).

How a plugin call is written in content: `short`, `long` or as a `command`. See `ContentTools.calls`.

```ts shape
import type { CallForm } from '@ifloom/engine/plugin'
type CallForm = 'short' | 'long' | 'command'
```

## CallIn

Type. Explained in [Writing a plugin](/docs/reference/plugins#callin).

A call in short, checked against a registry when its name is declared there, and loose otherwise.

```ts shape
import type { CallIn } from '@ifloom/engine/plugin'
type CallIn<R> =
  | { [K in keyof R & `${string}/${string}`]: { [P in K]: R[K]; }; }[keyof R & `${string}/${string}`]
  | PluginCall & { [K in keyof R & `${string}/${string}`]?: undefined; }
```

## CallShapes

Type. Explained in [Writing a plugin](/docs/reference/plugins#argshape-and-callshapes).

What a plugin's calls take, by table and name.

```ts shape
import type { CallShapes } from '@ifloom/engine/plugin'
type CallShapes = {
  conditions?: Readonly<Record<string, ArgShape>>
  effects?: Readonly<Record<string, ArgShape>>
  commands?: Readonly<Record<string, ArgShape>>
}
```

## CallTable

Type. Explained in [Writing a plugin](/docs/reference/plugins#pluginreferences-calltable-and-contentreferences).

Which of a plugin's tables a call is to: its `conditions`, its `effects` or its `commands`.

```ts shape
import type { CallTable } from '@ifloom/engine/plugin'
type CallTable = 'conditions' | 'effects' | 'commands'
```

## CallWriter

Type. Explained in [Writing a plugin](/docs/reference/plugins#callwriter).

A call's writer: its arguments in, the call in short out, `{ 'places/at': { location } }`.

```ts fragment
type CallWriter<Name extends string, S extends ArgShape> = ([RequiredKeys<S>] extends [never] ? (args?: { [K in keyof ({ [K in RequiredKeys<S>]: ArgIn<S[K]>; } & { [K in OptionalKeys<S>]?: ArgIn<S[K]>; })]: ({ [K in RequiredKeys<S>]: ArgIn<S[K]>; } & { [K in OptionalKeys<S>]?: ArgIn<S[K]>; })[K]; } | undefined) => { [N in Name]: WrittenAs<S>; } : (args: { [K in keyof ({ [K in RequiredKeys<S>]: ArgIn<S[K]>; } & { [K in OptionalKeys<S>]?: ArgIn<S[K]>; })]: ({ [K in RequiredKeys<S>]: ArgIn<S[K]>; } & { [K in OptionalKeys<S>]?: ArgIn<S[K]>; })[K]; }) => { [N in Name]: WrittenAs<S>; }) & { readonly call: Name; readonly args: S; read(args: unknown): { [K in keyof { [K in keyof S]: ArgOut<S[K]>; }]: { [K in keyof S]: ArgOut<S[K]>; }[K]; }; }
```

## CastContact

Type. Explained in [Writing a plugin](/docs/reference/plugins#castcontact-and-senderview).

Someone the player can call, as the cast's `cast/contacts` answers.

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
| `id` | `string` |  |  | Their id, as the cast names them: `'ava'`. |
| `name` | `string` |  |  |  |
| `description` | `string \| null` |  |  | A line about them, or null. |
| `image` | `string \| null` |  |  | Their picture, through `artSrc`, or null. |
| `portrait` | `string \| null` |  |  | Their face, for a small avatar, or null. |
| `command` | `CommandRef` |  |  | The cast's `cast/call` command for them, in short. |
| `disabled` | `string \| undefined` |  |  | Why the call can't go through now; undefined when it can. |

## CheckTools

Type. Explained in [Writing a plugin](/docs/reference/plugins#checktools).

What the content checker lends a plugin's `check`.

```ts shape
import type { CheckTools } from '@ifloom/engine/plugin'
type CheckTools = {
  problems: (refs: readonly Reference[]) => string[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `problems` | `(refs: readonly Reference[]) => string[]` |  |  | What these references name that the game doesn't have, in the checker's words. |

## CommandsOf

Type. Explained in [Writing a plugin](/docs/reference/plugins#conditionsof-effectsof-and-commandsof).

What a plugin's commands take, by full name, for its `CommandRegistry`. As `ConditionsOf`.

```ts fragment
type CommandsOf<C> = C extends PluginCalls<infer Id extends string, infer D extends CallShapes> ? { [K in keyof Table<D, 'commands'> & string as `${Id}/${K}`]: Table<D, 'commands'>[K] extends ArgShape ? WrittenAs<Table<D, 'commands'>[K]> : never; } : never
```

## CommandStep

Type. Explained in [Writing a plugin](/docs/reference/plugins#commandstep).

One step of a plugin's `commandMigrations`: a command from a log, as the
version it upgrades from wrote it, as the next version takes it. It is
given every command, the engine's and other plugins' too, so it checks the
type and name and gives back the ones that aren't its own as they came.

```ts shape
import type { CommandStep } from '@ifloom/engine/plugin'
type CommandStep = (command: RawCommand) => RawCommand
```

## ConditionsOf

Type. Explained in [Writing a plugin](/docs/reference/plugins#conditionsof-effectsof-and-commandsof).

What a plugin's conditions take, by full name, for its `ConditionRegistry`:

```ts fragment
declare module '@ifloom/engine' {
  interface ConditionRegistry extends ConditionsOf<typeof CALLS> {}
}
```

```ts fragment
type ConditionsOf<C> = C extends PluginCalls<infer Id extends string, infer D extends CallShapes> ? { [K in keyof Table<D, 'conditions'> & string as `${Id}/${K}`]: Table<D, 'conditions'>[K] extends ArgShape ? WrittenAs<Table<D, 'conditions'>[K]> : never; } : never
```

## ContentReferences

Type. Explained in [Writing a plugin](/docs/reference/plugins#pluginreferences-calltable-and-contentreferences).

What one entry of a plugin's content names. `list` and `id` say where, as a `PluginProblem` does.

```ts shape
import type { ContentReferences } from '@ifloom/engine/plugin'
type ContentReferences = {
  list: string
  id: string
  refs: readonly Reference[]
}
```

## ContentStep

Type. Explained in [Writing a plugin](/docs/reference/plugins#contentstep).

One step of a plugin's `contentMigrations`: the whole pack as the version
it upgrades from wrote it, as the next version writes it. It usually
changes only the plugin's own `data`, calls, strings and traits. It returns
a new pack and never changes the one it was given.

```ts shape
import type { ContentStep } from '@ifloom/engine/plugin'
type ContentStep = (pack: RawPack, tools: ContentTools) => RawPack
```

## ContentTools

Type. Explained in [Writing a plugin](/docs/reference/plugins#contenttools).

What a plugin's content step is given besides the pack: ways to rewrite
what a pack holds without walking it by hand. Each returns a new pack.
`objects` and `calls` leave words and code (`prose`, `strings`,
`variants`, `custom`) as they are, and `words` rewrites only those words.

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
| `objects` | `(pack: RawPack, rewrite: (value: Record<string, unknown>) => Record<string, unknown>) =>…` |  |  | Every object the pack's content holds, rewritten from the innermost out. |
| `calls` | `(pack: RawPack, rewrite: (call: RawCall) => { name: string; with: unknown }) => RawPack` |  |  | Every call to a condition, effect or command by name, however it is written: `short`, `{ 'places/at': { location } }` (any key with a `/`, so check the name); `long`, `{ custom: 'places/at', with }` or `{ kind: 'custom', name, with }`; or a `command`, `{ type: 'custom', name, with }`. Return its name and arguments: a call given back as it came stays as it was. A value (`{ value, with }`) is not a call; reach it with `objects`. |
| `words` | `(pack: RawPack, rewrite: (text: string, key: string) => string) => RawPack` |  |  | Every line of the pack's `prose` and `strings`, given with its key. |
| `wordKeys` | `(pack: RawPack, rename: (key: string) => string) => RawPack` |  |  | Every key of the pack's `words` table, the translation's other words for a field (`quests/quests.settle.title`), renamed: for a step that renames a field the table names. The words are kept. |
| `entries` | `(pack: RawPack, list: string, rewrite: (entry: Record<string, unknown>) => Record<string,…` |  |  | Each entry of one list of a plugin's `data`, named `<plugin>/<list>` (`'quests/quests'` is `data.quests.quests`), rewritten. A pack without the list comes back as it is. |
| `prose` | `(key: string) => string \| undefined` |  |  | A line of prose by key, as written: the pack's own, else the game's under it (its content's and the packs' before it). Undefined if neither has it. For a step that writes words in place that were a prose key. |
| `effects` | `(pack: RawPack) => RawPack` |  |  | Every effect the pack holds, in plugin `data` and traits too, in the form this engine reads: one written while effects were told apart by `kind` (`{ kind: 'stat', stat, by }`, before schema 21) in the keyed form (`{ stat, by }`). One already keyed is left as it is. For a plugin whose content holds effects somewhere the engine's own step can't see. |

## DataList

Type. Explained in [Writing a plugin](/docs/reference/plugins#datalist).

One of a plugin's data lists, as `defineData` declares it: where it is
(`data.<plugin>.<list>`), its noun and words, and its lookups.

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
| `plugin` | `string` |  |  | The plugin it is the data of. |
| `list` | `string` |  |  | Its name in the plugin's data: `'jobs'` for `data.jobs.jobs`. |
| `noun` | `string` |  |  | What one entry is called in a problem. |
| `words` | `WordShape` | yes |  | Which fields of an entry are words. |
| `all` | `(game: Game) => T[]` |  |  | Every entry the game has, in order: each an object with an id; anything else in the list is left out. |
| `get` | `(game: Game, id: unknown) => T \| undefined` |  |  | One entry by id, which may be anything content wrote; undefined when the game has none. |
| `ref` | `(id: string) => Reference` |  |  | The reference to one entry by id, for the checker: `unknown job "cafe"` when the game has none. |
| `content` | `(game: Game, refs: (entry: T) => readonly Reference[]) => ContentReferences[]` |  |  | What each entry names, for `references.content`, each at `<list> <id>`. |
| `problem` | `(id: string, what: string) => PluginProblem` |  |  | A problem with one entry, for `check`, at `<list> <id>`. |

## defineCalls

Function. Explained in [Writing a plugin](/docs/reference/plugins#definecalls).

Declare a plugin's calls once: each condition, effect and command by name,
with what it takes, built from `arg`.

```ts fragment
const CALLS = defineCalls('places', {
  conditions: { at: { location: arg.strings() } },
  commands: { go: { id: arg.string() } },
})
```

Give it to `definePlugin` as `calls`, so each implementation is handed its
arguments typed and read; build the helpers from its writers
(`CALLS.conditions.at({ location })`); and extend the registries from it
(`ConditionsOf<typeof CALLS>`), so content is checked against the same
declaration. The content checker reports an argument content left out, one
of the wrong shape and one the call doesn't take, and resolves what each
names.

```ts shape
import { defineCalls } from '@ifloom/engine/plugin'
function defineCalls<Id extends string, const D extends CallShapes>(id: Id, shapes: D): PluginCalls<Id, D>
```

## defineData

Function. Explained in [Writing a plugin](/docs/reference/plugins#definedata).

Declare a plugin's data lists once: each list of its pack `data` by name,
with its entry's type, the noun a problem names an entry by, and which
fields are words.

```ts fragment
const DATA = defineData('jobs', { jobs: list<JobDef>({ noun: 'job', words: { name: true } }) })
DATA.jobs.all(game)         // JobDef[]
DATA.jobs.get(game, 'cafe') // JobDef | undefined
arg.entry(DATA.jobs)        // an argument naming a job, checked
```

Give it to `definePlugin` as `data`, and the loader reaches each list's
words for a translation.

```ts shape
import { defineData } from '@ifloom/engine/plugin'
function defineData<const L extends Readonly<Record<string, ListSpec<any>>>>(plugin: string, lists: L): PluginData<L>
```

## DefinedPlugin

Type. Explained in [Writing a plugin](/docs/reference/plugins#definedplugin).

A plugin, plus typed access to its own state.

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
| `id` | `string` |  |  | Its name, and the prefix on everything it adds. Letters, digits and `-`. |
| `version` | `number` |  |  | The version of its state's shape. Bump it when the shape changes, and add the step that carries the previous version forward to `migrations`. |
| `start` | `((game: Game) => S)` | yes |  | Its state in a new game. A plugin with no state leaves this out. |
| `migrations` | `Record<number, (state: unknown, tools: MigrationTools) => unknown>` | yes |  | One step per version, keyed by the version it upgrades *from*, as the engine's own saves are. A save whose state has no route forward is refused. Each step gets the plugin's old state and the same `MigrationTools` a game's migration gets, and returns the plugin's new state. |
| `contentVersion` | `number` | yes |  | The version of the shape of what content and packs write for it: its `data`, its calls' arguments, its strings and its traits. 1 if left out. Bump it when that shape changes, and add the step that carries a pack of the previous version forward to `contentMigrations`. Packs record the version they were written for in `plugins`. |
| `contentMigrations` | `Record<number, ContentStep>` | yes |  | One step per content version, keyed by the version it upgrades *from*. `upgradePack` runs them on every pack the game loads, mods included, after the engine's own steps for the same schema. A version with no step changed nothing a pack holds. See `ContentStep` and `ContentTools`. |
| `commandVersion` | `number` | yes |  | The version of its commands' arguments, as command logs record them. 1 if left out. Bump it when a command is renamed or its arguments change, and add the step to `commandMigrations`, so an old log still replays. |
| `commandMigrations` | `Record<number, CommandStep>` | yes |  | One step per command version, keyed by the version it upgrades *from*: what `replay` plays an older log's commands through. See `CommandStep`. |
| `calls` | `AnyCalls` | yes |  | Its conditions, effects and commands, each declared once with what it takes (`defineCalls`): the implementations below are handed their arguments read by it, the content checker reports what a call leaves out, gets wrong or names that the game lacks, and a translation reaches the words in a call's arguments. Every declared call has an implementation, and every implementation a declaration. |
| `data` | `PluginData` | yes |  | The lists of its pack `data`, each declared once with its entry's noun and which of its fields are words a player reads (`defineData`), so a translation's `words` table reaches them, keyed `<plugin>/<list>.<id>.<field>`: `quests/quests.coffee.name`. |
| `conditions` | `Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => boolean>` | yes |  | Conditions content can test, by name, without the prefix. |
| `effects` | `Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => GameSta…` | yes |  | Effects content can apply, by name. Each takes the state as the effects before it left it and returns the next one, so two in one list compose. What one does is hidden from prices and guards until it runs; an effect that only stands for other effects is a `macro` instead. |
| `macros` | `Record<string, Macro<S, PluginArgs>>` | yes |  | Effects that stand for other effects, by name, called by content as any effect is: each returns the effects it stands for, worked out from the state, so a button's price and the guards see what it would do. A name is an effect's or a macro's, never both. See `Macro`. |
| `commands` | `Record<string, PluginCommand<S, PluginArgs>>` | yes |  | Commands a button can send, by name. |
| `strings` | `Record<string, string>` | yes |  | The plugin's player-facing lines, by name without the prefix, in English. A game overrides one as `strings['<id>/<name>']`; the plugin reads them with `stringOf(game, '<id>/<name>')`. |
| `queries` | `Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => unknown>` | yes |  | Answers other plugins can ask for by name, without importing this one: `context.query('calendar/whenNext', { when })`. For what a condition's yes or no cannot say — a place, a time, a list. |
| `cooperates` | `string[]` | yes |  | The plugins this one works with when the game has them, by id. Content may then name their conditions and effects even in a game without them: the loader lets it pass, and the condition is false and the effect does nothing. |
| `statModifiers` | `((state: GameState, context: PluginContext<S>) => readonly StatModifier[] \| undefined)` | yes |  | Changes to what the player's stats read right now, worked out from the plugin's state: a timed boost, say. Nothing is written into the state; every reading of the stat (conditions, derived stats, costs, the view) sees the changed value, and `stat` effects still write the kept value underneath. Must not read stats itself, or it reads itself. |
| `values` | `Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => string…` | yes |  | Words and numbers content can read by name, asked with arguments as a condition is: in prose as &lt;code v-pre>{{id/name channel=texts}}&lt;/code>, and as `{ value: 'id/name', with }` for a badge or a stat's ceiling. |
| `onTurn` | `((state: GameState, context: TurnContext<S>) => GameState)` | yes |  | A hook: the end of a turn, once the counter has moved on and `resets` are back, in the order the hooks run (the game's first). Returns the next state. `context.before` is the state as the turn ended, and a `turn` effect applied through `context.apply` does nothing. |
| `onTurnDone` | `((state: GameState, context: TurnContext<S>) => GameState)` | yes |  | A hook: the end of a turn, once every `onTurn` has run, so it sees what they did: the calendar's new day, a status worn off. In the same order and with the same context as `onTurn`. Returns the next state. |
| `onStat` | `((before: GameState, after: GameState, stat: string, by: number, context: PluginContext<S…` | yes |  | A hook: one of the player's stats just changed, by a `stat` effect. `before` is the state before it, `after` the state with it, `by` how far it moved. Return `before` to say it did not take, `after` to let it, or `after` with more besides. Runs in the order the hooks run (the game's first), each seeing what the one before returned. |
| `onCommand` | `((before: GameState, after: GameState, context: PluginContext<S>) => GameState)` | yes |  | A hook: after every command that took, with the state it started from and the state after. The context is the state after. Returns the next state. |
| `guard` | `((state: GameState, asked: Asked, context: PluginContext<S>) => Refusal \| undefined)` | yes |  | Whether a command may go ahead, given what it would do (`effectsOf`). Asked of every command but the ones that ignore locks, after the locks. |
| `price` | `((state: GameState, effects: readonly Effect[], context: PluginContext<S>) => string[] \|…` | yes |  | What a button costs that the engine cannot say, in the plugin's words: `['until evening']`. Asked with the effects the button would apply. |
| `label` | `((state: GameState, context: PluginContext<S>) => string \| undefined)` | yes |  | Where the game is, in a few words for a header or a save: "Day 3 · Wednesday morning". |
| `saveName` | `((state: GameState, context: PluginContext<S>) => string \| undefined)` | yes |  | The name a save is listed under, such as the name the player typed, kept as `SaveMeta.playerName` and shown for `@you`'s lines. The first that answers names it (the game's first); with none, saves have no name. |
| `scene` | `((state: GameState, context: PluginContext<S>) => RoomScene \| undefined)` | yes |  | What the screen shows while no scene is open: a room's description, a shop front, a dashboard's heading. The first plugin that answers fills it; with none, the screen is the game's title and its buttons. |
| `actions` | `((state: GameState, context: PluginContext<S>) => readonly ButtonDef[] \| undefined)` | yes |  | Actions offered while no scene is open, drawn as buttons before the game's own `actions` and exactly like them: a room's things to do, say. |
| `action` | `((state: GameState, id: string, context: PluginContext<S>) => ButtonDef \| undefined)` | yes |  | One of this plugin's actions that isn't among its `actions` now, by id without the prefix: an app's, say. `{ type: 'action', id: '<plugin>/<id>' }` does it, as for a button with a cost or effects, which is looked up among the `actions` when this has none. Undefined when there is none. |
| `content` | `Content` | yes |  | Content the plugin brings, merged first, under the game's content and packs, which can replace anything in it by id: its kinds of entity (the people of a cast, unlisted in the view unless the kind sets `listed`; a game that redeclares one keeps what it leaves out), and any scenes, prose, actions or `data` it ships with. |
| `traits` | `readonly TraitDef<any, any>[]` | yes |  | Traits this plugin gives meaning to: named data entities carry, written on a kind, an entity or content's `traits` table, which the plugin reads with `declaredTrait`. Each id is the plugin's id, `/` and a name. Data only: what a trait does is the plugin's code. |
| `audio` | `((state: GameState, context: PluginContext<S>) => Record<string, string \| null> \| undefin…` | yes |  | What plays on background channels, by channel: a place's ambience. Below an open scene's choice and an `audio` effect's, above the game's default. Null silences a channel; a channel left out is the next plugin's, then the default's. The first plugin that names a channel wins it. |
| `view` | `((state: GameState, context: PluginContext<S>) => V)` | yes |  | What the UI needs from this plugin, at `view.plugins[id]`. `V` is its type; declare it in `ViewRegistry` under the plugin's id, and every view types `view.plugins[id]` as `V`. |
| `profile` | `((state: GameState, previous: GameState, stored: unknown, context: PluginContext<S>) => u…` | yes |  | What the plugin keeps in the player's profile, which outlives saves and new games: earned achievements, a gallery of endings. The runner asks it after every command that took, with the state after, the state before and what the plugin's profile namespace (its id) holds now. Return a new value to store, or undefined to leave it. Only a runner with a `profile` asks; `apply` never does. |
| `references` | `PluginReferences` | yes |  | What this plugin's calls and content name, for the content checker to resolve as it resolves the engine's own. See `PluginReferences`. |
| `check` | `(game: Game, tools: CheckTools) => PluginProblem[]` | yes |  | Rules of this plugin's own that a reference can't say: two entries with one id, an exit to nowhere. Run by the content checker after the references; `tools` words anything else the plugin names as the checker does. |
| `read` | `(state: GameState, game: Game) => S` |  |  | This plugin's state, or its starting state if the save has none yet. |
| `write` | `(state: GameState, next: S) => GameState` |  |  | The game state with this plugin's state replaced. |

## definePlugin

Function. Explained in [Writing a plugin](/docs/reference/plugins#defineplugin).

Declare a plugin. Returns it with `read` and `write` for its own state, for
code outside the plugin (tests, a UI) that needs it typed. Its slice of a
view is typed by its `ViewRegistry` entry. Name the types, `definePlugin<State, View, typeof
CALLS>`, so the view's type is kept and each call's implementation is
handed its arguments as `CALLS` (`defineCalls`) declares them.

Throws when a declared call has no implementation, or an implemented one no
declaration: a mistake in the plugin's code, never in content.

```ts shape
import { definePlugin } from '@ifloom/engine/plugin'
function definePlugin<S, V = unknown, C extends AnyCalls = never>(def: PluginDef<S, V, C>): DefinedPlugin<S, V>
```

## defineTraitKind

Function.

Declare a kind of entity a plugin's trait makes, once.

```ts fragment
const PLACES = defineTraitKind({ kind: 'location', trait: 'places/location', fields: { exits: true, body: true, … } })
PLACES.ref('park')                 // 'location:park'
PLACES.get(state, game, 'park')    // its Place, or undefined
PLACES.define({ id: 'park', name: 'Riverside Park', exits: [], body: [] })
const CALLS = defineCalls('places', { effects: { move: { location: PLACES.arg() } } })
```

The kind itself is still the plugin's to declare in its `content.kinds`,
with its label and whether it's listed.

```ts shape
import { defineTraitKind } from '@ifloom/engine/plugin'
function defineTraitKind<K extends string>(spec: TraitKindSpec<K>): TraitKind<K>
```

## EffectsOf

Type. Explained in [Writing a plugin](/docs/reference/plugins#conditionsof-effectsof-and-commandsof).

What a plugin's effects take, by full name, for its `EffectRegistry`. As `ConditionsOf`.

```ts fragment
type EffectsOf<C> = C extends PluginCalls<infer Id extends string, infer D extends CallShapes> ? { [K in keyof Table<D, 'effects'> & string as `${Id}/${K}`]: Table<D, 'effects'>[K] extends ArgShape ? WrittenAs<Table<D, 'effects'>[K]> : never; } : never
```

## entityUi

Function. Explained in [Presentation hints](/docs/reference/ui-hints#entityui).

An entity's presentation hints: its kind's, with those of the one it was
created `like` over them, then its own declaration's, field by field.
Undefined when none has any. The engine carries them to the view as written.

```ts shape
import { entityUi } from '@ifloom/engine/plugin'
function entityUi(state: GameState, game: Game, ref: string): Ui<EntityUi> | undefined
```

## list

Function.

Declare one of a plugin's data lists, for `defineData`: the entry's type, its noun and its words.

```ts shape
import { list } from '@ifloom/engine/plugin'
function list<T extends { id: string }>(spec: { noun: string; words?: WordShape }): ListSpec<T>
```

## ListSpec

Type. Explained in [Writing a plugin](/docs/reference/plugins#listspec).

One list of a plugin's data, declared: `list<JobDef>({ noun: 'job', words:
{ name: true } })`. The type of an entry is the type argument.

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
| `noun` | `string` |  |  | What one entry is called in a problem: `unknown job "cafe"`. |
| `words` | `WordShape` | yes |  | Which fields of an entry are words a player reads, for a translation's `words` table. See `WordShape`. |
| `_entry` | `T` | yes |  | Phantom: an entry's type. Never set. |

## Lock

Type. Explained in [Locks](/docs/reference/locks#lock).

Something the player cannot do for now, and why.

A game's stretches — an intro that holds you in one room, a first morning
that only lets you get to work — are locks: data that says what is stopped,
while what holds, and the line the player reads. The reducer refuses on the
first lock that matches and the view greys the button out with the same
line, so the two cannot disagree.

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
| `id` | `string` | yes |  | A name for it, so a later pack can replace it: a pack's lock with the same id takes its place. Left out, a lock is simply added. |
| `when` | `Condition` |  |  | While this holds, the lock is on. |
| `deny` | `readonly LockTarget[]` |  |  | Commands it stops, by type. `'*'` stops everything not in `except`. A plugin's commands can be named one by one (`'quests/track'`) or all at once (`'quests/*'`); `'custom'` stops every plugin command. |
| `except` | `readonly LockTarget[]` | yes |  | Commands it lets through all the same, by the same names as `deny`. |
| `effect` | `string` | yes |  | Only commands that would apply this effect: the engine's by its key (`'turn'`) or a plugin's by name (`'calendar/pass'`). See `effectsOf`. |
| `hide` | `boolean` | yes |  | Leave a button this lock stops off the screen instead of greying it out: an exit, a room's action, a game or plugin button. Not one that ignores locks. |
| `reason` | `string` |  |  | Why. The refusal and the disabled text are this same line. |

## lockedOut

Function. Explained in [Locks](/docs/reference/locks#lockedout).

Is a lock on that stops everything? While one is, the player is in a
stretch that only moves through its scenes: there are no exits, no people
to approach, nothing to do in the room.

```ts shape
import { lockedOut } from '@ifloom/engine/plugin'
function lockedOut(state: GameState, game: Game): boolean
```

## lockOn

Function. Explained in [Locks](/docs/reference/locks#lockon).

The first lock that stops this command right now, if any.

```ts shape
import { lockOn } from '@ifloom/engine/plugin'
function lockOn(state: GameState, game: Game, command: Command): Lock | undefined
```

## LockTarget

Type. Explained in [Locks](/docs/reference/locks#locktarget).

What a lock's `deny` and `except` can name: a command type, `'*'`, or a plugin command or plugin.

```ts shape
import type { LockTarget } from '@ifloom/engine/plugin'
type LockTarget = Command['type'] | '*' | `${string}/${string}`
```

## Macro

Type. Explained in [Calls by name](/docs/reference/custom#macro).

An effect that stands for other effects, in a plugin's or the game's
`macros`: it works out from the state the effects it stands for and returns
them, anything content can write, another macro included. Content calls it
as any effect, `{ 'game/payRent': {} }`, and because what it returns is
effects, a button's price, the locks and the guards see what it would do
before it runs.

```ts shape
import type { Macro } from '@ifloom/engine/plugin'
type Macro<S = any, A = PluginArgs> = (state: GameState, args: A, context: PluginContext<S>) => EffectRef[]
```

## PackContext

Type. Explained in [Content, packs and loading](/docs/reference/loader#packcontext).

What a step may need of the game a pack is laid over, besides the pack:
the entities content and the plugins declare, the game's word for the
player (its string `you`), and the prose under the pack (the content's
and the packs' before it). The loader gives it; a step that has none
reads only the pack.

```ts shape
import type { PackContext } from '@ifloom/engine/plugin'
type PackContext = {
  entities?: readonly unknown[]
  you?: readonly string[]
  prose?: Readonly<Record<string, string>>
}
```

## panelOf

Function. Explained in [Panels](/docs/reference/panels#panelof).

The panel open over the story, as `view.panel` shows it: one the `panel`
effect opened, else the open scene's own, else null. For a plugin's view
that shows what its own panel holds, filtered by what it was opened with,
as the jobs plugin's `panel` is the jobs on the open board.

```ts shape
import { panelOf } from '@ifloom/engine/plugin'
function panelOf(state: GameState, game: Game): OpenPanel | null
```

## parseBeats

Function. Explained in [Prose and markup](/docs/reference/prose#parsebeats).

A body's beats, in order. `find` says who a line under `@id` is; left out,
`@you` and `@player` are the player's.

```ts shape
import { parseBeats } from '@ifloom/engine/plugin'
function parseBeats(body: string, find?: SpeakerFinder): SceneBeat[]
```

## PartnerQueries

Type. Explained in [Writing a plugin](/docs/reference/plugins#partnerqueries).

The queries first-party plugins answer that other plugins ask, by full
name. Part of `QueryRegistry`, so they are typed wherever a query is
asked; a plugin's own block declares the rest of its queries.

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
| `calendar/now` | `() => { day: number; period: string }` |  |  | The calendar's day, from 0, and period. |
| `calendar/periods` | `() => string[]` |  |  | The calendar's periods, in order. |
| `calendar/bedtime` | `() => boolean` |  |  | Whether it's a time the player could go to bed. |
| `places/here` | `() => string \| null` |  |  | The id of the place the player is in, or null for nowhere. |
| `places/holder` | `() => EntityRef \| null` |  |  | The entity of the place the player is in, which holds what is put down there; null when nowhere. |
| `places/known` | `(args: { location: string }) => boolean` |  |  | Whether the game has this place. |
| `cast/portrait` | `(args: { character: string }) => string \| undefined` |  |  | A character's face, their person's `portrait`; undefined for none. |
| `cast/contacts` | `() => CastContact[]` |  |  | Everyone met who can be called. |
| `cast/sender` | `(args: { from: string }) => SenderView` |  |  | Who a message or a post is from: the entity's name and picture, a person's `portrait` as the face. |

## pictureView

Function. Explained in [The view](/docs/reference/view#pictureview).

A picture as the UI draws it: the layers whose `when` holds, each with its
file (a pool's pick, kept per owner and layer as `picture:<index>`), and the
hotspots on them. A hotspot tied to a layer that isn't shown is left out. A
`choice` hotspot takes that choice's command and availability from
`choices`, the scene's rendered choices, and is left out when the choice is
not on offer; a `command` hotspot is worked out as any action's button is.
Exported for plugins that draw a picture of their own: a place's. A plugin's
`view` passes its context's `picks`, so the reducer records the layers' picks.

```ts shape
import { pictureView } from '@ifloom/engine/plugin'
function pictureView(state: GameState, game: Game, picture: PictureDef | undefined, owner: string, choices?: readonly RenderedChoice[] | null, picks?: Record<string, string>): PictureView | null
```

## Plugin

Type. Explained in [Writing a plugin](/docs/reference/plugins#plugin).

A system added to the engine: its own state, and the conditions, effects,
commands, hooks and view that work on it.

Its members follow one naming rule (ADR 0009). A hook runs at an event and
returns the next state, and is named `on` and the event: `onTurn`,
`onCommand`. A provider answers a question and never changes the state, and
is named by the noun it gives: `guard`, `price`, `label`, `scene`,
`actions`, `audio`, `statModifiers`, `view`, `profile`. Tables of
named functions (`conditions`, `effects`, `commands`, `queries`, `values`)
are plural nouns. Nothing is nested: there is no `hooks: {}`.

Content calls a plugin by name with its id in front, `{ 'quests/done':
{ quest: 'bakery' } }`, as a condition, an effect or a command, the same way
it calls the game's own code (`{ 'game/tired': true }`), so games and mods
learn one form. A plugin
usually exports typed helpers that write those for authors working in code.

Plugins are chosen when the game is built (`game.plugins`), never loaded while
it runs.

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
| `id` | `string` |  |  | Its name, and the prefix on everything it adds. Letters, digits and `-`. |
| `version` | `number` |  |  | The version of its state's shape. Bump it when the shape changes, and add the step that carries the previous version forward to `migrations`. |
| `start` | `(game: Game) => S` | yes |  | Its state in a new game. A plugin with no state leaves this out. |
| `migrations` | `Record<number, (state: unknown, tools: MigrationTools) => unknown>` | yes |  | One step per version, keyed by the version it upgrades *from*, as the engine's own saves are. A save whose state has no route forward is refused. Each step gets the plugin's old state and the same `MigrationTools` a game's migration gets, and returns the plugin's new state. |
| `contentVersion` | `number` | yes |  | The version of the shape of what content and packs write for it: its `data`, its calls' arguments, its strings and its traits. 1 if left out. Bump it when that shape changes, and add the step that carries a pack of the previous version forward to `contentMigrations`. Packs record the version they were written for in `plugins`. |
| `contentMigrations` | `Record<number, ContentStep>` | yes |  | One step per content version, keyed by the version it upgrades *from*. `upgradePack` runs them on every pack the game loads, mods included, after the engine's own steps for the same schema. A version with no step changed nothing a pack holds. See `ContentStep` and `ContentTools`. |
| `commandVersion` | `number` | yes |  | The version of its commands' arguments, as command logs record them. 1 if left out. Bump it when a command is renamed or its arguments change, and add the step to `commandMigrations`, so an old log still replays. |
| `commandMigrations` | `Record<number, CommandStep>` | yes |  | One step per command version, keyed by the version it upgrades *from*: what `replay` plays an older log's commands through. See `CommandStep`. |
| `calls` | `AnyCalls` | yes |  | Its conditions, effects and commands, each declared once with what it takes (`defineCalls`): the implementations below are handed their arguments read by it, the content checker reports what a call leaves out, gets wrong or names that the game lacks, and a translation reaches the words in a call's arguments. Every declared call has an implementation, and every implementation a declaration. |
| `data` | `PluginData` | yes |  | The lists of its pack `data`, each declared once with its entry's noun and which of its fields are words a player reads (`defineData`), so a translation's `words` table reaches them, keyed `<plugin>/<list>.<id>.<field>`: `quests/quests.coffee.name`. |
| `conditions` | `Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => boolean>` | yes |  | Conditions content can test, by name, without the prefix. |
| `effects` | `Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => GameSta…` | yes |  | Effects content can apply, by name. Each takes the state as the effects before it left it and returns the next one, so two in one list compose. What one does is hidden from prices and guards until it runs; an effect that only stands for other effects is a `macro` instead. |
| `macros` | `Record<string, Macro<S>>` | yes |  | Effects that stand for other effects, by name, called by content as any effect is: each returns the effects it stands for, worked out from the state, so a button's price and the guards see what it would do. A name is an effect's or a macro's, never both. See `Macro`. |
| `commands` | `Record<string, PluginCommand<S>>` | yes |  | Commands a button can send, by name. |
| `strings` | `Record<string, string>` | yes |  | The plugin's player-facing lines, by name without the prefix, in English. A game overrides one as `strings['<id>/<name>']`; the plugin reads them with `stringOf(game, '<id>/<name>')`. |
| `queries` | `Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => unknown>` | yes |  | Answers other plugins can ask for by name, without importing this one: `context.query('calendar/whenNext', { when })`. For what a condition's yes or no cannot say — a place, a time, a list. |
| `cooperates` | `string[]` | yes |  | The plugins this one works with when the game has them, by id. Content may then name their conditions and effects even in a game without them: the loader lets it pass, and the condition is false and the effect does nothing. |
| `statModifiers` | `((state: GameState, context: PluginContext<S>) => readonly StatModifier[] \| undefined)` | yes |  | Changes to what the player's stats read right now, worked out from the plugin's state: a timed boost, say. Nothing is written into the state; every reading of the stat (conditions, derived stats, costs, the view) sees the changed value, and `stat` effects still write the kept value underneath. Must not read stats itself, or it reads itself. |
| `values` | `Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => string…` | yes |  | Words and numbers content can read by name, asked with arguments as a condition is: in prose as &lt;code v-pre>{{id/name channel=texts}}&lt;/code>, and as `{ value: 'id/name', with }` for a badge or a stat's ceiling. |
| `onTurn` | `(state: GameState, context: TurnContext<S>) => GameState` | yes |  | A hook: the end of a turn, once the counter has moved on and `resets` are back, in the order the hooks run (the game's first). Returns the next state. `context.before` is the state as the turn ended, and a `turn` effect applied through `context.apply` does nothing. |
| `onTurnDone` | `(state: GameState, context: TurnContext<S>) => GameState` | yes |  | A hook: the end of a turn, once every `onTurn` has run, so it sees what they did: the calendar's new day, a status worn off. In the same order and with the same context as `onTurn`. Returns the next state. |
| `onStat` | `(before: GameState, after: GameState, stat: string, by: number, context: PluginContext<S>…` | yes |  | A hook: one of the player's stats just changed, by a `stat` effect. `before` is the state before it, `after` the state with it, `by` how far it moved. Return `before` to say it did not take, `after` to let it, or `after` with more besides. Runs in the order the hooks run (the game's first), each seeing what the one before returned. |
| `onCommand` | `(before: GameState, after: GameState, context: PluginContext<S>) => GameState` | yes |  | A hook: after every command that took, with the state it started from and the state after. The context is the state after. Returns the next state. |
| `guard` | `((state: GameState, asked: Asked, context: PluginContext<S>) => Refusal \| undefined)` | yes |  | Whether a command may go ahead, given what it would do (`effectsOf`). Asked of every command but the ones that ignore locks, after the locks. |
| `price` | `((state: GameState, effects: readonly Effect[], context: PluginContext<S>) => string[] \|…` | yes |  | What a button costs that the engine cannot say, in the plugin's words: `['until evening']`. Asked with the effects the button would apply. |
| `label` | `((state: GameState, context: PluginContext<S>) => string \| undefined)` | yes |  | Where the game is, in a few words for a header or a save: "Day 3 · Wednesday morning". |
| `saveName` | `((state: GameState, context: PluginContext<S>) => string \| undefined)` | yes |  | The name a save is listed under, such as the name the player typed, kept as `SaveMeta.playerName` and shown for `@you`'s lines. The first that answers names it (the game's first); with none, saves have no name. |
| `scene` | `((state: GameState, context: PluginContext<S>) => RoomScene \| undefined)` | yes |  | What the screen shows while no scene is open: a room's description, a shop front, a dashboard's heading. The first plugin that answers fills it; with none, the screen is the game's title and its buttons. |
| `actions` | `((state: GameState, context: PluginContext<S>) => readonly ButtonDef[] \| undefined)` | yes |  | Actions offered while no scene is open, drawn as buttons before the game's own `actions` and exactly like them: a room's things to do, say. |
| `action` | `((state: GameState, id: string, context: PluginContext<S>) => ButtonDef \| undefined)` | yes |  | One of this plugin's actions that isn't among its `actions` now, by id without the prefix: an app's, say. `{ type: 'action', id: '<plugin>/<id>' }` does it, as for a button with a cost or effects, which is looked up among the `actions` when this has none. Undefined when there is none. |
| `content` | `Content` | yes |  | Content the plugin brings, merged first, under the game's content and packs, which can replace anything in it by id: its kinds of entity (the people of a cast, unlisted in the view unless the kind sets `listed`; a game that redeclares one keeps what it leaves out), and any scenes, prose, actions or `data` it ships with. |
| `traits` | `readonly TraitDef<any, any>[]` | yes |  | Traits this plugin gives meaning to: named data entities carry, written on a kind, an entity or content's `traits` table, which the plugin reads with `declaredTrait`. Each id is the plugin's id, `/` and a name. Data only: what a trait does is the plugin's code. |
| `audio` | `((state: GameState, context: PluginContext<S>) => Record<string, string \| null> \| undefin…` | yes |  | What plays on background channels, by channel: a place's ambience. Below an open scene's choice and an `audio` effect's, above the game's default. Null silences a channel; a channel left out is the next plugin's, then the default's. The first plugin that names a channel wins it. |
| `view` | `(state: GameState, context: PluginContext<S>) => V` | yes |  | What the UI needs from this plugin, at `view.plugins[id]`. `V` is its type; declare it in `ViewRegistry` under the plugin's id, and every view types `view.plugins[id]` as `V`. |
| `profile` | `(state: GameState, previous: GameState, stored: unknown, context: PluginContext<S>) => un…` | yes |  | What the plugin keeps in the player's profile, which outlives saves and new games: earned achievements, a gallery of endings. The runner asks it after every command that took, with the state after, the state before and what the plugin's profile namespace (its id) holds now. Return a new value to store, or undefined to leave it. Only a runner with a `profile` asks; `apply` never does. |
| `references` | `PluginReferences` | yes |  | What this plugin's calls and content name, for the content checker to resolve as it resolves the engine's own. See `PluginReferences`. |
| `check` | `(game: Game, tools: CheckTools) => PluginProblem[]` | yes |  | Rules of this plugin's own that a reference can't say: two entries with one id, an exit to nowhere. Run by the content checker after the references; `tools` words anything else the plugin names as the checker does. |

## PluginArgs

Type. Explained in [Writing a plugin](/docs/reference/plugins#pluginargs).

What content passes to a plugin's condition, effect or command: `with`.

```ts shape
import type { PluginArgs } from '@ifloom/engine/plugin'
type PluginArgs = {
  [key: string]: unknown
}
```

## PluginCalls

Type. Explained in [Writing a plugin](/docs/reference/plugins#plugincalls-and-anycalls).

A plugin's calls, as `defineCalls` declares them: its id, what each call
takes, and a writer for each, by table: `calls.conditions.at({ location })`.
Give it to `definePlugin` as `calls`, and derive the registries from it.

```ts fragment
type PluginCalls<Id extends string = string, D extends CallShapes = CallShapes> = {
  readonly id: Id
  readonly conditions: Writers<Id, Table<D, 'conditions'>>
  readonly effects: Writers<Id, Table<D, 'effects'>>
  readonly commands: Writers<Id, Table<D, 'commands'>>
}
```

## PluginCommand

Type. Explained in [Writing a plugin](/docs/reference/plugins#plugincommand).

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
| `ignoresLocks` | `boolean` | yes |  | Run even while a lock would stop it. For tools that stand outside the story — a debugger — never for something the player does in it. |
| `whyNot` | `((state: GameState, args: A, context: PluginContext<S>) => string \| undefined)` | yes |  | Why it cannot be done now, as the player reads it; undefined if it can. |
| `run` | `(state: GameState, args: A, context: PluginContext<S>) => GameState` |  |  | Run it: the state after the command. Called only when `whyNot` gave no reason. |
| `effectsOf` | `(state: GameState, args: A, context: PluginContext<S>) => Effect[]` | yes |  | The effects running it would apply, for guards, prices and locks to see. None if left out. |
| `spends` | `((state: GameState, args: A, context: PluginContext<S>) => Record<string, number> \| undef…` | yes |  | The stats it spends, by id, for its button's price, as an action's `cost.stats` gives them: `{ coins: 4 }`. Only the price shows it; `run` does the spending, and `whyNot` says when there isn't enough. None if left out. |

## PluginContext

Type. Explained in [Writing a plugin](/docs/reference/plugins#plugincontext).

What every plugin function is handed besides the game state: what a game's
own functions get (the game, `query`, `value` and `roll`; see
`CustomContext`), the plugin's own state, typed, `get` to read it from a
later game state and `set` to return the game state with it replaced.

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
| `game` | `Game` |  |  | The loaded game. |
| `query` | `Query` |  |  | Ask a plugin something by its full name: `query('places/here')`. Undefined when the game does not have that plugin. |
| `value` | `(name: string, args?: PluginArgs) => string \| number \| undefined` |  |  | A value by name, a plugin's (`messages/unread`) or the game's own, asked with `args`. Undefined when nobody has it. |
| `roll` | `(max: number, name: string) => number` |  |  | A whole number from 0 to `max - 1`, drawn from the save's seed, the turn and `name`: the same save and turn always draw the same. |
| `slice` | `S` |  |  | The plugin's state in the game state the function was handed: `get()`. |
| `get` | `(on?: GameState) => S` |  |  | The plugin's state in the state the function was handed, or in `on`, for a function that has already changed the game state (applied effects, say) and wants the plugin's state as it is now. Its starting state (`start`) when the save has none yet. The read that matches `set`. |
| `set` | `(next: S, on?: GameState) => GameState` |  |  | The game state with the plugin's state replaced: on the state the function was handed, or on `on`, for a function that has already changed other parts of the game state and wants the plugin's state written onto that. |
| `apply` | `(effects: readonly EffectRef[], on?: GameState) => GameState` |  |  | Apply effects as content would — any effect, a custom one or another plugin's included — to the state the function was handed, or to `on`. How a plugin effect ends a turn: `apply([{ turn: true }])`. |
| `picks` | `Record<string, string>` | yes |  | Only in `view`: where the pool picks the view makes are written, for the reducer to record. Pass it to `pictureView` so a picture's pick stays the same on every visit (`beats` records its own). Undefined elsewhere. |
| `beats` | `(blocks: readonly Block[], id: string) => SceneBeat[]` |  |  | Blocks drawn as beats, as a scene's body is drawn: a message's words, a post's, an app's. The blocks whose `when` holds, their words filled in for this save, variants drawn and pools picked under `id` (so a block's pick stays the same on every visit), spoken lines with their speakers, and bold, italics and UI pieces as spans. Inline actions and tooltips stay in the words as written, since only a scene offers choices. In `view`, the pool picks it makes are recorded. |
| `profile` | `unknown` | yes |  | Only in `view`, and only when a runner with a profile builds it: what the plugin's own profile namespace (its id) held when the runner last read or wrote it. Frozen, so read it and never change it. Undefined elsewhere, in a view built by `view(state, game)` alone, and while nothing is stored. Conditions, effects, commands and hooks never see it, so a replay always plays the same. |

## PluginData

Type. Explained in [Writing a plugin](/docs/reference/plugins#plugindata).

A plugin's data lists, as `defineData` declares them, by name. Give them to `definePlugin` as `data`.

```ts fragment
type PluginData<L extends Readonly<Record<string, ListSpec<any>>> = Readonly<Record<string, ListSpec<any>>>> = { readonly [K in keyof L & string]: DataList<EntryOf<L[K]>>; }
```

## PluginDef

Type. Explained in [Writing a plugin](/docs/reference/plugins#plugindef).

What `definePlugin` takes: a plugin, whose conditions, effects, macros and
commands, when it declares its `calls`, are exactly the declared ones, each
handed its arguments typed. An effect is in `effects` or `macros`.

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
| `view` | `((state: GameState, context: PluginContext<S>) => V)` | yes |  | What the UI needs from this plugin, at `view.plugins[id]`. `V` is its type; declare it in `ViewRegistry` under the plugin's id, and every view types `view.plugins[id]` as `V`. |
| `references` | `PluginReferences` | yes |  | What this plugin's calls and content name, for the content checker to resolve as it resolves the engine's own. See `PluginReferences`. |
| `traits` | `readonly TraitDef<any, any>[]` | yes |  | Traits this plugin gives meaning to: named data entities carry, written on a kind, an entity or content's `traits` table, which the plugin reads with `declaredTrait`. Each id is the plugin's id, `/` and a name. Data only: what a trait does is the plugin's code. |
| `actions` | `((state: GameState, context: PluginContext<S>) => readonly ButtonDef[] \| undefined)` | yes |  | Actions offered while no scene is open, drawn as buttons before the game's own `actions` and exactly like them: a room's things to do, say. |
| `audio` | `((state: GameState, context: PluginContext<S>) => Record<string, string \| null> \| undefin…` | yes |  | What plays on background channels, by channel: a place's ambience. Below an open scene's choice and an `audio` effect's, above the game's default. Null silences a channel; a channel left out is the next plugin's, then the default's. The first plugin that names a channel wins it. |
| `scene` | `((state: GameState, context: PluginContext<S>) => RoomScene \| undefined)` | yes |  | What the screen shows while no scene is open: a room's description, a shop front, a dashboard's heading. The first plugin that answers fills it; with none, the screen is the game's title and its buttons. |
| `action` | `((state: GameState, id: string, context: PluginContext<S>) => ButtonDef \| undefined)` | yes |  | One of this plugin's actions that isn't among its `actions` now, by id without the prefix: an app's, say. `{ type: 'action', id: '<plugin>/<id>' }` does it, as for a button with a cost or effects, which is looked up among the `actions` when this has none. Undefined when there is none. |
| `id` | `string` |  |  | Its name, and the prefix on everything it adds. Letters, digits and `-`. |
| `label` | `((state: GameState, context: PluginContext<S>) => string \| undefined)` | yes |  | Where the game is, in a few words for a header or a save: "Day 3 · Wednesday morning". |
| `start` | `((game: Game) => S)` | yes |  | Its state in a new game. A plugin with no state leaves this out. |
| `version` | `number` |  |  | The version of its state's shape. Bump it when the shape changes, and add the step that carries the previous version forward to `migrations`. |
| `data` | `PluginData` | yes |  | The lists of its pack `data`, each declared once with its entry's noun and which of its fields are words a player reads (`defineData`), so a translation's `words` table reaches them, keyed `<plugin>/<list>.<id>.<field>`: `quests/quests.coffee.name`. |
| `content` | `Content` | yes |  | Content the plugin brings, merged first, under the game's content and packs, which can replace anything in it by id: its kinds of entity (the people of a cast, unlisted in the view unless the kind sets `listed`; a game that redeclares one keeps what it leaves out), and any scenes, prose, actions or `data` it ships with. |
| `values` | `Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => string…` | yes |  | Words and numbers content can read by name, asked with arguments as a condition is: in prose as &lt;code v-pre>{{id/name channel=texts}}&lt;/code>, and as `{ value: 'id/name', with }` for a badge or a stat's ceiling. |
| `strings` | `Record<string, string>` | yes |  | The plugin's player-facing lines, by name without the prefix, in English. A game overrides one as `strings['<id>/<name>']`; the plugin reads them with `stringOf(game, '<id>/<name>')`. |
| `migrations` | `Record<number, (state: unknown, tools: MigrationTools) => unknown>` | yes |  | One step per version, keyed by the version it upgrades *from*, as the engine's own saves are. A save whose state has no route forward is refused. Each step gets the plugin's old state and the same `MigrationTools` a game's migration gets, and returns the plugin's new state. |
| `cooperates` | `string[]` | yes |  | The plugins this one works with when the game has them, by id. Content may then name their conditions and effects even in a game without them: the loader lets it pass, and the condition is false and the effect does nothing. |
| `contentVersion` | `number` | yes |  | The version of the shape of what content and packs write for it: its `data`, its calls' arguments, its strings and its traits. 1 if left out. Bump it when that shape changes, and add the step that carries a pack of the previous version forward to `contentMigrations`. Packs record the version they were written for in `plugins`. |
| `contentMigrations` | `Record<number, ContentStep>` | yes |  | One step per content version, keyed by the version it upgrades *from*. `upgradePack` runs them on every pack the game loads, mods included, after the engine's own steps for the same schema. A version with no step changed nothing a pack holds. See `ContentStep` and `ContentTools`. |
| `commandVersion` | `number` | yes |  | The version of its commands' arguments, as command logs record them. 1 if left out. Bump it when a command is renamed or its arguments change, and add the step to `commandMigrations`, so an old log still replays. |
| `commandMigrations` | `Record<number, CommandStep>` | yes |  | One step per command version, keyed by the version it upgrades *from*: what `replay` plays an older log's commands through. See `CommandStep`. |
| `queries` | `Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => unknown>` | yes |  | Answers other plugins can ask for by name, without importing this one: `context.query('calendar/whenNext', { when })`. For what a condition's yes or no cannot say — a place, a time, a list. |
| `statModifiers` | `((state: GameState, context: PluginContext<S>) => readonly StatModifier[] \| undefined)` | yes |  | Changes to what the player's stats read right now, worked out from the plugin's state: a timed boost, say. Nothing is written into the state; every reading of the stat (conditions, derived stats, costs, the view) sees the changed value, and `stat` effects still write the kept value underneath. Must not read stats itself, or it reads itself. |
| `onTurn` | `((state: GameState, context: TurnContext<S>) => GameState)` | yes |  | A hook: the end of a turn, once the counter has moved on and `resets` are back, in the order the hooks run (the game's first). Returns the next state. `context.before` is the state as the turn ended, and a `turn` effect applied through `context.apply` does nothing. |
| `onTurnDone` | `((state: GameState, context: TurnContext<S>) => GameState)` | yes |  | A hook: the end of a turn, once every `onTurn` has run, so it sees what they did: the calendar's new day, a status worn off. In the same order and with the same context as `onTurn`. Returns the next state. |
| `onStat` | `((before: GameState, after: GameState, stat: string, by: number, context: PluginContext<S…` | yes |  | A hook: one of the player's stats just changed, by a `stat` effect. `before` is the state before it, `after` the state with it, `by` how far it moved. Return `before` to say it did not take, `after` to let it, or `after` with more besides. Runs in the order the hooks run (the game's first), each seeing what the one before returned. |
| `onCommand` | `((before: GameState, after: GameState, context: PluginContext<S>) => GameState)` | yes |  | A hook: after every command that took, with the state it started from and the state after. The context is the state after. Returns the next state. |
| `guard` | `((state: GameState, asked: Asked, context: PluginContext<S>) => Refusal \| undefined)` | yes |  | Whether a command may go ahead, given what it would do (`effectsOf`). Asked of every command but the ones that ignore locks, after the locks. |
| `price` | `((state: GameState, effects: readonly Effect[], context: PluginContext<S>) => string[] \|…` | yes |  | What a button costs that the engine cannot say, in the plugin's words: `['until evening']`. Asked with the effects the button would apply. |
| `saveName` | `((state: GameState, context: PluginContext<S>) => string \| undefined)` | yes |  | The name a save is listed under, such as the name the player typed, kept as `SaveMeta.playerName` and shown for `@you`'s lines. The first that answers names it (the game's first); with none, saves have no name. |
| `profile` | `((state: GameState, previous: GameState, stored: unknown, context: PluginContext<S>) => u…` | yes |  | What the plugin keeps in the player's profile, which outlives saves and new games: earned achievements, a gallery of endings. The runner asks it after every command that took, with the state after, the state before and what the plugin's profile namespace (its id) holds now. Return a new value to store, or undefined to leave it. Only a runner with a `profile` asks; `apply` never does. |
| `check` | `(game: Game, tools: CheckTools) => PluginProblem[]` | yes |  | Rules of this plugin's own that a reference can't say: two entries with one id, an exit to nowhere. Run by the content checker after the references; `tools` words anything else the plugin names as the checker does. |
| `conditions` | `Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => boolean…` | yes |  | Conditions content can test, by name, without the prefix. |
| `effects` | `Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => GameSta…` | yes |  | Effects content can apply, by name. Each takes the state as the effects before it left it and returns the next one, so two in one list compose. What one does is hidden from prices and guards until it runs; an effect that only stands for other effects is a `macro` instead. |
| `commands` | `Record<string, PluginCommand<S, PluginArgs>> \| { [K in keyof CallArgs<C, 'commands'>]: Pl…` | yes |  | Commands a button can send, by name. |
| `macros` | `Record<string, Macro<S, PluginArgs>> \| { [K in keyof CallArgs<C, 'effects'>]?: Macro<S, C…` | yes |  | Effects that stand for other effects, by name, called by content as any effect is: each returns the effects it stands for, worked out from the state, so a button's price and the guards see what it would do. A name is an effect's or a macro's, never both. See `Macro`. |

## PluginEntry

Type. Explained in [Writing a plugin](/docs/reference/plugins#pluginentry).

One entry of a plugin's content in a pack: an id, and whatever fields the plugin reads.

```ts shape
import type { PluginEntry } from '@ifloom/engine/plugin'
type PluginEntry = {
  id: string
}
```

It also takes any other key: `[key: string]: unknown`.

## PluginProblem

Type. Explained in [Writing a plugin](/docs/reference/plugins#pluginproblem).

Something wrong in a plugin's content: which list, which entry, what.

```ts shape
import type { PluginProblem } from '@ifloom/engine/plugin'
type PluginProblem = {
  list: string
  id: string
  what: string
}
```

## PluginReferences

Type. Explained in [Writing a plugin](/docs/reference/plugins#pluginreferences-calltable-and-contentreferences).

What a plugin's calls and content name. The content checker resolves every
reference against the game and reports what is missing, worded and placed
as its own problems are.

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
| `calls` | `(table: CallTable, name: string, args: PluginArgs, game: Game) => readonly Reference[]` | yes |  | What a call to one of its conditions, effects or commands names, by name without the prefix, from what content passes in `with`: a location, a character, a prose key. Asked of every call the checker finds. A rule of the plugin's own about the arguments is a `{ problem }`: `{ problem: 'count must be a whole number' }`. |
| `panels` | `(panel: string, args: PluginArgs, game: Game) => readonly Reference[]` | yes |  | What content opening one of the panels this plugin's UI draws names, from what it is opened with (`{ panel, with }`): `[{ entity: 'vendor:fish', carrying: 'shop/vendor' }]` for `panel: 'shop'`. Answer nothing for a panel that isn't this plugin's; a panel no plugin knows is the UI's business. Asked of every panel the checker finds. |
| `content` | `(game: Game) => readonly ContentReferences[]` | yes |  | What its content names, entry by entry: `{ list: 'locations', id: 'cafe', refs: [...] }`. A problem is reported against `<list> <id>`, and pinned on the pack that entry came from. |

## PluginSlice

Type. Explained in [Writing a plugin](/docs/reference/plugins#pluginslice).

A plugin's state as a save keeps it: the shape's version, and the state.

```ts shape
import type { PluginSlice } from '@ifloom/engine/plugin'
type PluginSlice = {
  version: number
  state: unknown
}
```

## priceView

Function. Explained in [The view](/docs/reference/view#priceview).

A price as the view shows one: the stats spent above 0, each worded as a
stat's value is, in the order given, then `notes`, plugins' words for
what else it costs, with the whole as one line in `text`. Null when it
costs nothing. What a plugin's view uses for a price of its own, such as
what a shift pays or a vendor's full price.

```ts shape
import { priceView } from '@ifloom/engine/plugin'
function priceView(game: Game, stats: Readonly<Record<string, number>>, notes?: readonly string[]): Price | null
```

## QueryAnswer

Type. Explained in [Writing a plugin](/docs/reference/plugins#queryargs-and-queryanswer).

```ts shape
import type { QueryAnswer } from '@ifloom/engine/plugin'
type QueryAnswer<K extends PropertyKey> = K extends keyof QueryRegistry ? QueryRegistry[K] extends (...args: never[]) => infer R ? R : unknown : unknown
```

## QueryArgs

Type. Explained in [Writing a plugin](/docs/reference/plugins#queryargs-and-queryanswer).

What a query takes and answers: its declared arguments and answer, or anything for a name nobody declares.

```ts shape
import type { QueryArgs } from '@ifloom/engine/plugin'
type QueryArgs<K extends PropertyKey> = K extends keyof QueryRegistry ? QueryRegistry[K] extends (...args: infer A) => unknown ? A : [ PluginArgs? ] : [ PluginArgs? ]
```

## RawCall

Type. Explained in [Writing a plugin](/docs/reference/plugins#rawcall).

A plugin call as `ContentTools.calls` hands it over: its full name, its arguments as written, and how it was written.

```ts shape
import type { RawCall } from '@ifloom/engine/plugin'
type RawCall = {
  name: string
  with: unknown
  form: CallForm
}
```

## RawCommand

Type. Explained in [Writing a plugin](/docs/reference/plugins#rawcommand).

A command as a log from an older engine or plugin kept it: some version's shape, with its `type`.

```ts shape
import type { RawCommand } from '@ifloom/engine/plugin'
type RawCommand = {
  type: string
}
```

It also takes any other key: `[key: string]: unknown`.

## Reference

Type. Explained in [Checking content](/docs/reference/checks#reference).

One thing a piece of content names, for the content checker to resolve.
Ids by what they are, files by kind, and content that names more (a
condition, effects, a command, blocks, a picture) to be looked inside.
Built from the core's kinds and each feature's (`references` in its
shape), as `Condition` is.

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

## Refusal

Type. Explained in [Writing a plugin](/docs/reference/plugins#asked-and-refusal).

Why a plugin will not let a command through. A string is a refusal, as a
lock's is: the button is greyed out with it. `soft` is a warning instead: the
button stays pressable and shows the warning, and the reducer refuses the
command all the same — running the clock past dawn, say, where a UI offers
bed in its place.

```ts shape
import type { Refusal } from '@ifloom/engine/plugin'
type Refusal = string | { reason: string; soft: true }
```

## renderAction

Function. Explained in [The view](/docs/reference/view#renderaction).

An action as a button: its label, its price, and why it is greyed out, if it
is. Availability comes from `whyNot`, so the button and the reducer always
agree. What a room's buttons are made with, for plugins that show actions
somewhere else, such as an app on a device. `owner` is the plugin whose
action it is, so one with a cost or effects is done as `'<owner>/<id>'`
(see `Plugin.action`); left out, it is one of the game's.

```ts shape
import { renderAction } from '@ifloom/engine/plugin'
function renderAction(state: GameState, game: Game, action: ActionDef, owner?: string): RenderedChoice
```

## RoomScene

Type. Explained in [Writing a plugin](/docs/reference/plugins#roomscene).

What the screen shows while no scene is open, from a plugin's `scene`.

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
| `title` | `string` |  |  | The heading: a room's name. |
| `body` | `readonly Block[]` | yes |  | What is written there, as a scene's blocks: prose keys, variants, conditions. |
| `id` | `string` | yes |  | The id its blocks are drawn under. Variants drawn here rotate per id, so a place gives its own id to keep its lines its own. The plugin's id if left out. |
| `ui` | `Ui<SceneUi>` | yes |  | Presentation hints for the room, carried to `view.scene.ui` as a scene's are. See `SceneUi`. |

## SenderView

Type. Explained in [Writing a plugin](/docs/reference/plugins#castcontact-and-senderview).

Who sent something, as the cast's `cast/sender` answers: a name, their picture and their face.

```ts shape
import type { SenderView } from '@ifloom/engine/plugin'
type SenderView = {
  name: string
  image: string | null
  portrait: string | null
}
```

## setTraitState

Function. Explained in [Entities](/docs/reference/entities#settraitstate).

The state with one entity's state for one trait replaced. An entity not in the game is left alone.

```ts shape
import { setTraitState } from '@ifloom/engine/plugin'
function setTraitState(state: GameState, game: Game, ref: string, id: string, next: unknown): GameState
```

## SpeakerFinder

Type. Explained in [Prose and markup](/docs/reference/prose#speakerfinder).

Who a spoken line under `@id` is: the player's own or someone else's, the
entity it is when the id names one, and the name to show. Given the id as
written. See `lineSpeakers` for the engine's.

```ts shape
import type { SpeakerFinder } from '@ifloom/engine/plugin'
type SpeakerFinder = (id: string) => { who: 'character' | 'player'; speaker?: EntityRef; name: string }
```

## speakerOf

Function. Explained in [Writing a plugin](/docs/reference/plugins#speakerof).

Who a speaker id is: their entity's name (its tokens filled), picture and
hints. Null when the id names no entity in the game. What a scene's
`speaker` becomes on screen, and what a plugin asks for the sender of a
message or a post.

```ts shape
import { speakerOf } from '@ifloom/engine/plugin'
function speakerOf(state: GameState, game: Game, id: string): SpeakerView | null
```

## StatModifier

Type. Explained in [Writing a plugin](/docs/reference/plugins#statmodifier).

A change to what one of the player's stats reads, from a plugin's
`statModifiers`. A stat's adds are summed and its multipliers multiplied
together, and it reads `(value + adds) × multipliers`, held to its range.

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
| `stat` | `string` |  |  | The stat it changes, by id. |
| `add` | `number` | yes |  | Added to the value. 0 if left out. |
| `multiply` | `number` | yes |  | What the value, with the adds, is multiplied by. 1 if left out. |

## styledBeats

Function. Explained in [Prose and markup](/docs/reference/prose#styledbeats).

Text and spoken beats with their bold, italics and UI pieces drawn: `spans`
with `bold`, `italic` and `ui` pieces, and `text` with the words alone. For
beats that don't go through a scene's view, such as a message's or a
post's. Inline actions and tooltips stay in the words as written, because
only the view knows the choices and the prose. A beat with none of these is
left as it is.

```ts shape
import { styledBeats } from '@ifloom/engine/plugin'
function styledBeats(beats: readonly SceneBeat[]): SceneBeat[]
```

## TraitDef

Type. Explained in [Writing a plugin](/docs/reference/plugins#traitdef).

A trait a plugin declares, in its `traits`: a named piece of data entities
carry, which the plugin gives meaning. Its id is the plugin's own id, `/`
and a name. The game declares its own in `rules.traits`, with ids that
have no `/`. Name `K` to have the data typed, as `TraitRegistry` says for it:
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
| `id` | `K` |  |  |  |
| `check` | `((data: TraitData<K>, tools: TraitTools) => readonly string[])` | yes |  | What is wrong with the data on one entity, by a rule of the plugin's own: `['a slot needs a name']`. Asked by the content checker. |
| `references` | `((data: TraitData<K>, tools: TraitTools) => readonly Reference[])` | yes |  | What the data names, for the content checker to resolve: a slot, a scene, a prose key. `tools.ref` is the entity it is on, for a condition in the data that names it as `'$'`. |
| `words` | `WordShape` | yes |  | Which fields of the data are words a player reads, for a translation's `words` table: `{ closed: true, body: 'blocks' }`. Each is keyed `entity.<ref>.traits.<id>.<field>`, or under the kind for a kind's default. See `WordShape`. |
| `state` | `{ start(data: TraitData<K>): S }` | yes |  | For the rare trait that keeps state of its own on each entity, such as the uses left in a torch: where it starts, from the entity's data. Read with `traitState` and written with `setTraitState`; the save keeps it only once it is written. |

## TraitEntityDef

Type. Explained in [Writing a plugin](/docs/reference/plugins#traitentitydef).

What a trait kind's definer takes: an entity's fields (its `of` is the
kind's if left out) and the trait's, side by side. A field both have, such
as a place's `ui`, is the trait's.

```ts shape
import type { TraitEntityDef } from '@ifloom/engine/plugin'
type TraitEntityDef<K extends string> = {
  of?: string
}
```

## TraitKind

Type. Explained in [Writing a plugin](/docs/reference/plugins#traitkind).

A kind of entity a plugin's trait makes, as `defineTraitKind` declares it.

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
| `trait` | `K` |  |  | The trait that makes an entity one. |
| `ref` | `(id: string) => '${string}:${string}'` |  |  | The entity an id names: a bare id is one of the kind (`'park'` is `'location:park'`), a reference is as written. |
| `id` | `(ref: string) => string` |  |  | How the plugin names one back: its bare id for one of the kind, else its whole reference. |
| `all` | `(state: GameState, game: Game) => '${string}:${string}'[]` |  |  | Every entity in the game now with the trait, as references: those content declares, in its order, then those made in play. |
| `get` | `(state: GameState, game: Game, id: string \| null \| undefined) => TraitData<K> \| undefined` |  |  | The trait of the entity an id or reference names, read through what it was made `like`; undefined for one that isn't in the game or has no trait. |
| `declaredAll` | `(game: Game) => '${string}:${string}'[]` |  |  | Every entity content declares with the trait, in its order: for a check, which has no state. |
| `declaredGet` | `(game: Game, id: string \| null \| undefined) => TraitData<K> \| undefined` |  |  | The trait of an entity content declares, by id or reference: for a check, which has no state. |
| `define` | `(def: TraitEntityDef<K>) => EntityDef` |  |  | An entity for content's `entities`, of the kind (or its `of`), with the trait's fields put in `traits[trait]` and the rest left on the entity. |
| `entry` | `(id: string) => Reference` |  |  | The reference to one, by id or reference, for the checker: an entity the game has, which must carry the trait. |
| `arg` | `() => Arg<string, string, false>` |  |  | A call's argument naming one by id or reference, `'park'` or `'location:park'`, checked as `entry`. |
| `args` | `() => Arg<string \| readonly string[], string[], false>` |  |  | A call's argument naming one or several, `'park'` or `['cafe', 'park']`, handed as a list. |

## TraitKindSpec

Type. Explained in [Writing a plugin](/docs/reference/plugins#traitkindspec).

What `defineTraitKind` takes.

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
| `kind` | `string` |  |  | The kind a bare id names: `'location'`, so `'park'` is `'location:park'`. |
| `trait` | `K` |  |  | The trait that makes an entity one: `'places/location'`. |
| `fields` | `{ readonly [F in keyof Required<TraitData<K>>]: true }` |  |  | Every field of the trait, as `{ exits: true, body: true, … }`: what the definer puts in the trait rather than on the entity. Typed complete, so a field added to the trait can't be left out. |

## traitState

Function. Explained in [Entities](/docs/reference/entities#traitstate).

The state one entity keeps for one of its traits: what play last wrote,
or else where the trait's `state.start` says it starts. Undefined when the
entity isn't in the game, lacks the trait, or the trait keeps no state.

```ts shape
import { traitState } from '@ifloom/engine/plugin'
function traitState<S = unknown>(state: GameState, game: Game, ref: string, id: string): S | undefined
```

## TraitTools

Type. Explained in [Writing a plugin](/docs/reference/plugins#traittools).

What a trait's `check` is handed beside the data: the game, and the entity the data is on.

```ts shape
import type { TraitTools } from '@ifloom/engine/plugin'
type TraitTools = {
  game: Game
  ref: EntityRef
}
```

## TurnContext

Type. Explained in [Rules and hooks](/docs/reference/rules#turncontext).

What `onTurn` and `onTurnDone` are handed, the game's and every plugin's:
the context, with `before`, the state as the turn ended, before the
counter moved on and `resets` were put back. Its `apply` ends no turn: a
`turn` effect applied here does nothing.

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
| `game` | `Game` |  |  | The loaded game. |
| `query` | `Query` |  |  | Ask a plugin something by its full name: `query('places/here')`. Undefined when the game does not have that plugin. |
| `value` | `(name: string, args?: PluginArgs) => string \| number \| undefined` |  |  | A value by name, a plugin's (`messages/unread`) or the game's own, asked with `args`. Undefined when nobody has it. |
| `roll` | `(max: number, name: string) => number` |  |  | A whole number from 0 to `max - 1`, drawn from the save's seed, the turn and `name`: the same save and turn always draw the same. |
| `slice` | `S` |  |  | The plugin's state in the game state the function was handed: `get()`. |
| `get` | `(on?: GameState \| undefined) => S` |  |  | The plugin's state in the state the function was handed, or in `on`, for a function that has already changed the game state (applied effects, say) and wants the plugin's state as it is now. Its starting state (`start`) when the save has none yet. The read that matches `set`. |
| `set` | `(next: S, on?: GameState \| undefined) => GameState` |  |  | The game state with the plugin's state replaced: on the state the function was handed, or on `on`, for a function that has already changed other parts of the game state and wants the plugin's state written onto that. |
| `apply` | `(effects: readonly EffectRef[], on?: GameState) => GameState` |  |  | Apply effects as content would — any effect, a custom one or another plugin's included — to the state the function was handed, or to `on`. How a plugin effect ends a turn: `apply([{ turn: true }])`. |
| `picks` | `Record<string, string>` | yes |  | Only in `view`: where the pool picks the view makes are written, for the reducer to record. Pass it to `pictureView` so a picture's pick stays the same on every visit (`beats` records its own). Undefined elsewhere. |
| `beats` | `(blocks: readonly Block[], id: string) => SceneBeat[]` |  |  | Blocks drawn as beats, as a scene's body is drawn: a message's words, a post's, an app's. The blocks whose `when` holds, their words filled in for this save, variants drawn and pools picked under `id` (so a block's pick stays the same on every visit), spoken lines with their speakers, and bold, italics and UI pieces as spans. Inline actions and tooltips stay in the words as written, since only a scene offers choices. In `view`, the pool picks it makes are recorded. |
| `profile` | `unknown` | yes |  | Only in `view`, and only when a runner with a profile builds it: what the plugin's own profile namespace (its id) held when the runner last read or wrote it. Frozen, so read it and never change it. Undefined elsewhere, in a view built by `view(state, game)` alone, and while nothing is stored. Conditions, effects, commands and hooks never see it, so a replay always plays the same. |
| `before` | `GameState` |  |  | The state as the turn ended, before the counter moved on and `resets` were put back. |

## WrittenAs

Type. Explained in [Writing a plugin](/docs/reference/plugins#writtenas).

What content writes as a call's value: its arguments; `true` for a call
with none (or `{}`); and either for a call whose arguments may all be left out.

```ts fragment
type WrittenAs<S extends ArgShape> = [keyof S] extends [never] ? true | Record<string, never> : [RequiredKeys<S>] extends [never] ? true | { [K in keyof ({ [K in RequiredKeys<S>]: ArgIn<S[K]>; } & { [K in OptionalKeys<S>]?: ArgIn<S[K]>; })]: ({ [K in RequiredKeys<S>]: ArgIn<S[K]>; } & { [K in OptionalKeys<S>]?: ArgIn<S[K]>; })[K]; } : { [K in keyof ({ [K in RequiredKeys<S>]: ArgIn<S[K]>; } & { [K in OptionalKeys<S>]?: ArgIn<S[K]>; })]: ({ [K in RequiredKeys<S>]: ArgIn<S[K]>; } & { [K in OptionalKeys<S>]?: ArgIn<S[K]>; })[K]; }
```
