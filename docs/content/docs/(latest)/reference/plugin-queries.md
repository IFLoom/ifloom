---
title: "Queries and partners"
description: "A query is an answer one plugin gives and another asks for by name, so plugins work together without importing each other."
---
A query is an answer one plugin gives and another asks for by full name, such as `places/here`, so plugins work together without importing each other. A plugin declares its answers in its [`queries`](#queries) and names the plugins it works with in [`cooperates`](#cooperates). [How plugins work](/docs/explanation/plugins#plugins-cooperate-by-name) explains why plugins reach each other only by name, and [Make plugins work together](/docs/how-to/make-plugins-work-together) puts two together.

In the showcase: `examples/showcase/src/game.ts` lists the calendar, places and cast, whose queries the shop, jobs, messages and feed plugins ask.

```ts
import { pluginQuery, type Query, type QueryRegistry } from '@ifloom/engine'
import type { QueryAnswer, QueryArgs } from '@ifloom/engine/plugin'
```

## queries

The plugin's answers by name without the prefix, each a function of the state, the arguments and the plugin's own context. Its type is the `queries` field of [`Plugin`](/docs/api/engine-plugin#plugin).

The asker calls its context's [`query`](#query) with the full name, and the engine works the answer out with the answering plugin's own context, so it reads its own `slice`. A query suits what a condition's yes or no can't say, such as a location, a time or a list. Content can't call a query, since it has no condition, effect or prose form, so queries are for plugin code and the game's own code only.

```ts fragment
// The loyalty plugin answers how many stamps are left to fill the card.
queries: {
  stampsLeft: (_state, _args, { slice }) => 5 - slice.stamps,
},

// A café-menu plugin asks, and does without when the game has no loyalty card.
view: (_state, { query }) => ({ footer: query('loyalty/stampsLeft') ?? null }),
```

A query's answer is typed for code that imports the answering plugin, through its [`QueryRegistry`](/docs/reference/plugin-calls#conditionregistry-effectregistry-commandregistry-queryregistry-and-viewregistry) entry. An asker that doesn't import it names the answer's type, `query<number>('loyalty/stampsLeft')`. The first-party plugins ask each other this way too, as the shop does to count days without a calendar:

```ts fragment
const day = query<{ day: number }>('calendar/now')?.day ?? state.turn
```

The engine declares no plugin's answers. A plugin declares its own, and a game that imports it reads them typed. A query answers `undefined` in a game without its plugin.

## cooperates

The ids of plugins this one works with when the game has them. Its type is the `cooperates` field of [`Plugin`](/docs/api/engine-plugin#plugin).

Content written for the plugin may then name those plugins' conditions, effects and commands, in full or in the short form, in a game without them. The [content checker](/docs/reference/checks#checks) doesn't report them there, and in play the condition is false, the effect does nothing and the command is refused. A value in prose from an absent partner stays on screen as written.

```ts
import { definePlugin } from '@ifloom/engine/plugin'

export const loyalty = definePlugin<{ stamps: number }>({
  id: 'loyalty',
  version: 1,
  // Content can gate double stamps on `calendar/weekend` in a game with a calendar.
  cooperates: ['calendar'],
  start: () => ({ stamps: 0 }),
})
```

`cooperates` covers only plugins the game doesn't have. In a game that has the partner, the checker reports a name the partner doesn't declare as usual. A plugin nobody lists is reported too, as `no plugin condition named "calendar/weekend"; the game has no plugin "calendar"`.

## Query

The type of a context's `query`: a query declared in `QueryRegistry` takes its arguments and answers its type, and any other name answers the type the caller gives it. Its type is in [`Query`](/docs/api/engine#query).

`query(name, args?)` asks about the state the function was handed, and returns `undefined` when the game lacks that plugin or that query. `args` is `{}` when left out. [`pluginQuery`](#pluginquery) is typed the same way.

```ts given
import type { Query } from '@ifloom/engine'

declare const query: Query

const here = query<string | null>('places/here') ?? null
const left = query<number>('bakery/loaves') ?? 0
```

## QueryArgs and QueryAnswer

A query's arguments and its answer by name: what [`QueryRegistry`](/docs/reference/plugin-calls#conditionregistry-effectregistry-commandregistry-queryregistry-and-viewregistry) declares, or anything for a name it doesn't. Their types are in [`QueryArgs`](/docs/api/engine-plugin#queryargs) and [`QueryAnswer`](/docs/api/engine-plugin#queryanswer).

They type a function that passes a query on, such as a test helper that asks one by name.

```ts
import { pluginQuery, type Game, type GameState, type QueryRegistry } from '@ifloom/engine'
import type { QueryAnswer, QueryArgs } from '@ifloom/engine/plugin'

export const ask = <K extends keyof QueryRegistry>(game: Game, state: GameState, name: K, ...args: QueryArgs<K>): QueryAnswer<K> | undefined =>
  pluginQuery(game, name)?.(state, ...args)
```

## Functions

### pluginQuery

Returns a function that asks a plugin's query by full name, for code outside any plugin, such as a tool, a test or the [CLI](/docs/reference/cli). Its signature is in [`pluginQuery`](/docs/api/engine#pluginquery).

The function it returns runs the query with the owning plugin's own context for the state it's given, with `args` `{}` when left out. `pluginQuery` returns `undefined` when the game lacks the plugin or the query, so the caller checks for it with `?.`. A plugin's own code uses its context's [`query`](#query) instead.

```ts given
import { pluginQuery } from '@ifloom/engine'
import '@ifloom/plugin-calendar'

// Is it late enough for bed? Only a game with the calendar can say.
const bedtime = pluginQuery(game, 'calendar/bedtime')?.(state) ?? false
```

## Checks

| Problem | Cause |
|---|---|
| `no plugin condition named "calendar/weekend"; the game has no plugin "calendar"` | Content names a call of a plugin the game doesn't have, and no plugin the game has lists it in `cooperates`. |
| `no plugin condition named "calendar/weekdn"` | The game has the plugin, which declares no call by that name. |

## Caveats

- `query` and `pluginQuery` answer `undefined` when the game lacks the plugin or the query, so every asker writes a fallback.
- `cooperates` lets content name a partner's conditions, effects and commands, but not its queries, which content can't call.
