---
title: "Queries and partners"
description: "A query is an answer one plugin gives and another asks for by name, so plugins work together without importing each other."
---
A query is an answer one plugin gives and another asks for by full name, such as `places/here`, so plugins work together without importing each other. A plugin declares its answers in its [`queries`](#queries) and names the plugins it works with in [`cooperates`](#cooperates). [How plugins work](/docs/0.1.0/explanation/plugins#plugins-cooperate-by-name) explains why plugins reach each other only by name, and [Make plugins work together](/docs/0.1.0/how-to/make-plugins-work-together) puts two together.

In the showcase: `examples/showcase/src/game.ts` lists the calendar, places and cast, whose queries the shop, jobs, messages and feed plugins ask.

```ts
import { pluginQuery, type Query, type QueryRegistry } from '@ifloom/engine'
import type { CastContact, PartnerQueries, QueryAnswer, QueryArgs, SenderView } from '@ifloom/engine/plugin'
```

## queries

The plugin's answers by name without the prefix, each a function of the state, the arguments and the plugin's own context. Its type is the `queries` field of [`Plugin`](/docs/0.1.0/api/engine-plugin#plugin).

The asker calls its context's [`query`](#query) with the full name, and the engine works the answer out with the answering plugin's own context, so it reads its own `slice`. A query suits what a condition's yes or no can't say, such as a location, a time or a list. Content can't call a query, since it has no condition, effect or prose form, so queries are for plugin code and the game's own code only.

```ts fragment
// The loyalty plugin answers how many stamps are left to fill the card.
queries: {
  stampsLeft: (_state, _args, { slice }) => 5 - slice.stamps,
},

// A café-menu plugin asks, and does without when the game has no loyalty card.
view: (_state, { query }) => ({ footer: query('loyalty/stampsLeft') ?? null }),
```

A query's answer is typed for code that imports the answering plugin, through its [`QueryRegistry`](/docs/0.1.0/reference/plugin-calls#conditionregistry-effectregistry-commandregistry-queryregistry-and-viewregistry) entry. An asker that doesn't import it names the answer's type, `query<number>('loyalty/stampsLeft')`, unless the query is one of the [`PartnerQueries`](#partnerqueries).

## cooperates

The ids of plugins this one works with when the game has them. Its type is the `cooperates` field of [`Plugin`](/docs/0.1.0/api/engine-plugin#plugin).

Content written for the plugin may then name those plugins' conditions, effects and commands, in full or in the short form, in a game without them. The [content checker](/docs/0.1.0/reference/checks#checks) doesn't report them there, and in play the condition is false, the effect does nothing and the command is refused. A value in prose from an absent partner stays on screen as written.

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

The type of a context's `query`: a query declared in `QueryRegistry` takes its arguments and answers its type, and any other name answers the type the caller gives it. Its type is in [`Query`](/docs/0.1.0/api/engine#query).

`query(name, args?)` asks about the state the function was handed, and returns `undefined` when the game lacks that plugin or that query. `args` is `{}` when left out. [`pluginQuery`](#pluginquery) is typed the same way.

```ts given
import type { Query } from '@ifloom/engine'

declare const query: Query

const here = query('places/here') ?? null // string | null
const left = query<number>('bakery/loaves') ?? 0
```

## QueryArgs and QueryAnswer

A query's arguments and its answer by name: what [`QueryRegistry`](/docs/0.1.0/reference/plugin-calls#conditionregistry-effectregistry-commandregistry-queryregistry-and-viewregistry) declares, or anything for a name it doesn't. Their types are in [`QueryArgs`](/docs/0.1.0/api/engine-plugin#queryargs) and [`QueryAnswer`](/docs/0.1.0/api/engine-plugin#queryanswer).

They type a function that passes a query on, such as a test helper that asks one by name.

```ts
import { pluginQuery, type Game, type GameState, type QueryRegistry } from '@ifloom/engine'
import type { QueryAnswer, QueryArgs } from '@ifloom/engine/plugin'

export const ask = <K extends keyof QueryRegistry>(game: Game, state: GameState, name: K, ...args: QueryArgs<K>): QueryAnswer<K> | undefined =>
  pluginQuery(game, name)?.(state, ...args)
```

## PartnerQueries

The answers the first-party plugins ask each other for, declared in the engine as types only, which `QueryRegistry` extends. Its entries are in [`PartnerQueries`](/docs/0.1.0/api/engine-plugin#partnerqueries).

A plugin never imports its partner, so the partner's own declarations aren't in its program. The engine declares these answers instead, so `query('places/here')` is a `string | null | undefined` in any plugin, the game's own code or a tool. Nothing in `PartnerQueries` runs. Each answer comes from the owning plugin's query, and an asker writes its own fallback after `??`, as the shop does to count days without a calendar:

```ts fragment
const day = query('calendar/now')?.day ?? state.turn
```

| Key | Meaning |
|---|---|
| `calendar/now`, `calendar/periods`, `calendar/bedtime` | The [calendar](/docs/0.1.0/reference/plugins/calendar#queries)'s day and period, its periods in order, and whether it's late enough for bed. |
| `places/here`, `places/holder`, `places/known` | The [places plugin](/docs/0.1.0/reference/plugins/places#queries)'s location the player is at, the holder a dropped thing goes to, and whether the player knows a location. |
| `cast/portrait`, `cast/contacts`, `cast/sender` | The [cast](/docs/0.1.0/reference/plugins/cast#queries)'s face for a character, the people the player can call, and who a message or post is from. |

A plugin's other queries, such as `places/all`, are declared in its own package. A query answers `undefined` in a game without its plugin.

## CastContact and SenderView

`CastContact` is one person the player can call, as `cast/contacts` answers, and `SenderView` is who a message or a post is from, as `cast/sender` answers. Their fields are in [`CastContact`](/docs/0.1.0/api/engine-plugin#castcontact) and [`SenderView`](/docs/0.1.0/api/engine-plugin#senderview).

A contact's `command` is the cast's `cast/call` for them in the short form, ready for an action's `command`, and its `disabled` says why the call can't go through now, or is `undefined` when it can. A phone's contacts app lists them. The [messages](/docs/0.1.0/reference/plugins/messages) and [feed](/docs/0.1.0/reference/plugins/feed) plugins ask `cast/sender` for a sender's name and face, and fall back to [`speakerOf`](/docs/0.1.0/reference/plugin-views#speakerof) in a game without the cast.

```ts given
import { pluginQuery } from '@ifloom/engine'

const contacts = pluginQuery(game, 'cast/contacts')?.(state) ?? []
const names = contacts.filter((contact) => !contact.disabled).map((contact) => contact.name)
```

## Functions

### pluginQuery

Returns a function that asks a plugin's query by full name, for code outside any plugin, such as a tool, a test or the [CLI](/docs/0.1.0/reference/cli). Its signature is in [`pluginQuery`](/docs/0.1.0/api/engine#pluginquery).

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
