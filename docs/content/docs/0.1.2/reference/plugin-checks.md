---
title: "A plugin's content checks"
description: "The content checker checks a plugin's data, calls and panels from the plugin's references and its own check."
---
A plugin's content is the entries content writes in its `data`, the calls content makes to it and the panels its UI renders. The [content checker](/docs/0.1.2/reference/checks) checks them with the engine's own, in the same words, from what the plugin's [`references`](#pluginreferences-calltable-and-contentreferences) say each one names and the rules in its [`check`](#check). [`ifloom check`](/docs/0.1.2/reference/cli#ifloom-check) runs the checker, and [Declaring a plugin's calls](/docs/0.1.2/reference/plugin-calls) covers the checks a call's declaration brings.

None of the examples writes a plugin of its own. The first-party plugins' references and checks are in each package's main entry, such as `packages/plugin-shop/src/index.ts`.

```ts
import type { CallTable, CheckTools, ContentReferences, PluginEntry, PluginProblem, PluginReferences } from '@ifloom/engine/plugin'
```

Content writes a plugin's entries in its [`data`](/docs/0.1.2/reference/content#data), by plugin id and then by list name, and each entry has an `id`. The loader merges `data` as it merges scenes: each entry is declared once across the content, and a pack's entry replaces one with the same id, whole. The result is at `game.data.loyalty.cards`.

```ts
import type { Content } from '@ifloom/engine'

export const town: Content = {
  data: { loyalty: { cards: [{ id: 'cafe', stampsToFill: 5 }, { id: 'market', stampsToFill: 8 }] } },
}
```

## PluginEntry

One entry in a plugin's `data`: an `id`, and whatever fields the plugin reads. Its type is in [`PluginEntry`](/docs/0.1.2/api/engine-plugin#pluginentry).

`game.data` and content's `data` hold lists of `PluginEntry`, so content writes entries without a cast. The engine reads only `id`. The plugin types the other fields in its [data lists](/docs/0.1.2/reference/plugin-calls#listspec), names what they name in `references`, and checks its own rules in `check`.

```ts fragment
{ id: 'cafe', stampsToFill: 5 }
```

## PluginReferences, CallTable and ContentReferences

`PluginReferences` is the plugin's `references` field: three optional functions that return what its calls, its panels and its content name, as lists of [`Reference`](/docs/0.1.2/reference/checks#reference)s. Their types are in [`PluginReferences`](/docs/0.1.2/api/engine-plugin#pluginreferences), [`CallTable`](/docs/0.1.2/api/engine-plugin#calltable) and [`ContentReferences`](/docs/0.1.2/api/engine-plugin#contentreferences).

A reference names ids by what they are (`{ scene }`, `{ entity }`, `{ storyline }`), content to look inside (`{ when }`, `{ effects }`, `{ blocks }`, `{ command }`, `{ layered }`), files (`{ picture }`, `{ video }`) and an entry in a plugin's own content (`{ entry, plugin, list, noun }`). [`Reference`](/docs/0.1.2/reference/checks#reference) lists them all.

| Field | Meaning |
|---|---|
| `calls` | The function that returns what one call to the plugin's conditions, effects or commands names, beyond its [declaration](/docs/0.1.2/reference/plugin-calls#definecalls). It gets the `CallTable` (`'conditions'`, `'effects'` or `'commands'`), the name without the prefix and the arguments as written, `{}` when there are none. The checker asks it about every call it finds, after the declaration's own checks. |
| `panels` | The function that returns what opening one of the [panels](/docs/0.1.2/reference/panels) the plugin's UI renders names, from a [`panel` effect](/docs/0.1.2/reference/effects#panel)'s `with` or a scene's `panel`. The checker asks every plugin about every panel, so it answers `[]` for a name that isn't its own. |
| `content` | The function that returns what each entry of the plugin's content names, as `ContentReferences`: the `list` and `id` that say where, and the `refs`. A problem is reported as `<list> <id>`, on the content or pack the entry came from. |

The loyalty plugin's cards each have a condition. A [`DataList`](/docs/0.1.2/reference/plugin-calls#datalist)'s `content` builds the answer:

```ts fragment
references: {
  content: (game) => DATA.cards.content(game, (card) => [{ when: card.when }]),
},
// mod:sunday-market · cards market · unknown storyline "sam"
```

A rule of the plugin's own about what a call or a panel is given, which no id can say, is a `{ problem }` reference, whose words the checker reports where the call is. A rule about one argument goes on the argument with [`.rule()`](/docs/0.1.2/reference/plugin-calls#arg-1), and one about two arguments or about a panel goes here. Most plugins leave `calls` out, keeping it for a rule that depends on more than one argument or on the factory's options:

```ts fragment
references: {
  calls: (table, name, args) =>
    table === 'commands' && name === 'swap' && args.give !== undefined && args.give === args.take ? [{ problem: 'swaps a thing for itself' }] : [],
  panels: (panel, args) => {
    if (panel !== 'shop') return []
    return typeof args.vendor === 'string' ? [{ entity: `vendor:${args.vendor}`, carrying: 'shop/vendor' }] : [{ problem: 'the shop panel needs a vendor: { vendor: "<id>" }' }]
  },
},
// town · action ask · swaps a thing for itself
// town · action counter · unknown entity "vendor:kiosk"
```

A field of the plugin's own that takes an [`Amount`](/docs/0.1.2/reference/amounts#amount), such as a badge or a target, is named as `{ amount: field }`, so the checker reads its shape and what it names, as it does an effect's `by`. A `{ within: 'action dig', refs }` reference puts `action dig · ` in front of the problems inside, so a list of buttons reads as the places plugin's do: `locations yard · action dig · unknown location "moon"`. A file a reference names, such as a post's picture, goes into the checker's [`files`](/docs/0.1.2/reference/checks#fileref).

A plugin's room scene, actions and audio are worked out in play, so the checker doesn't see them unless the plugin names them here: `{ blocks }` for a room scene's body, `{ ui }` for its hints, [`actionReferences`](/docs/0.1.2/reference/actions#actionreferences) for its actions, and `{ channel, track }` for its tracks.

## check

A function of the plugin's own that returns a [`PluginProblem`](#pluginproblem) for each fault that a reference can't say, such as two stages of one quest with the same id, or an exit to a location that isn't there. Its type is the `check` field of [`Plugin`](/docs/0.1.2/api/engine-plugin#plugin).

The checker runs it after the references, once the game is loaded, with the game and [`CheckTools`](#checktools). A data list's `problem` writes each `PluginProblem`:

```ts fragment
check: (game) => DATA.cards.all(game).flatMap((card) => (card.stampsToFill > 0 ? [] : [DATA.cards.problem(card.id, 'stampsToFill must be above 0')])),
```

## CheckTools

The tools the content checker lends a plugin's `check`. Every member is in [`CheckTools`](/docs/0.1.2/api/engine-plugin#checktools).

`problems(refs)` resolves references as `references` does and returns the problems, worded as the checker words its own, or an empty list. It serves references that `check` works out, which a `references` list can't hold until then. The stall checks the sign it hangs and the scene its closing button opens:

```ts fragment
check: (game, { problems }) =>
  (game.data?.stall?.signs ?? []).flatMap((sign) => {
    const { text, closing } = sign as { id: string; text: string; closing: string }
    return problems([{ blocks: [{ text }] }, { command: { type: 'scene', id: closing } }]).map((what) => ({ list: 'signs', id: sign.id, what }))
  }),
// mod:sunday-market · signs early · opens unknown scene "stall.closing"
```

## PluginProblem

One fault a plugin's `check` finds: which list, which entry, and what's wrong. Every field is in [`PluginProblem`](/docs/0.1.2/api/engine-plugin#pluginproblem).

The content checker turns it into a [`Problem`](/docs/0.1.2/reference/checks#problem) whose `where` is `<list> <id>`, on the content or pack that entry came from, or on `base` if it came from no pack.

```text
mod:sunday-market · cards market · stampsToFill must be above 0
```

## Checks

The content checker reports these problems about a game's plugins themselves:

| Problem | Cause |
|---|---|
| `a plugin id is letters, digits and "-" only` | A plugin's `id` holds another character, such as `/`. |
| `"core" and "ui" are reserved for the engine and the UI` | A plugin's id is `core` or `ui`, the profile's own namespaces. |
| `"game" is reserved for the game's own rules` | A plugin's id is `game`, which content uses to call the game's own [`rules`](/docs/0.1.2/reference/rules). |
| `two plugins share this id` | The game lists two plugins with one id. |
| `the game has no plugin named "loyalty"` | Content's `data` has a list for a plugin the game doesn't have. |

## Caveats

- The checker asks no plugin about a call to a plugin the game doesn't have. It reports the name or lets it through as [`cooperates`](/docs/0.1.2/reference/plugin-queries#cooperates) says.
- The checker doesn't check an `{ entry }` reference to a plugin the game doesn't have, which is how the cast names the places plugin's locations without needing it.
- A name no plugin answers for in `panels` is allowed, because the UI decides what it renders.
