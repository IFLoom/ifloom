---
title: "The engine's entries"
description: "Where each export of @ifloom/engine lives: the main entry for writing and running a game, @ifloom/engine/plugin for writing a plugin, and @ifloom/engine/testing for tests."
---
`@ifloom/engine` has three entries. Which one you import from depends on what you're writing.

| Import | For | What's in it |
|---|---|---|
| `@ifloom/engine` | Writing a game and running it | The content you declare ([`Content`](/docs/reference/loader#content), scenes and the builders such as [`text`](/docs/reference/flows) and [`decide`](/docs/reference/flows)), the state, [conditions](/docs/reference/conditions) and [effects](/docs/reference/effects), lookups such as [`entityName`](/docs/reference/entities) and [`statValue`](/docs/reference/stats), [`loadGame`](/docs/reference/loader#loadgame) and [`checkGame`](/docs/reference/checks), the [runner](/docs/reference/runner), saves, and the [view](/docs/reference/view) a UI draws. The registries a plugin or your game augments to type its calls are here too. |
| `@ifloom/engine/plugin` | Writing a plugin | [`definePlugin`](/docs/reference/plugins) and a plugin's types, the contexts its hooks are given (your game's `rules` hooks get the same ones), [`defineCalls`](/docs/reference/plugins#declaring-calls) and the other declaration helpers, the helpers that build a plugin's view such as [`renderAction`](/docs/reference/view#renderaction), [locks](/docs/reference/locks), and the steps that carry a plugin's content forward. |
| `@ifloom/engine/testing` | Tests | The [testing helpers](/docs/reference/testing): `loadChecked`, `freshState`, `play`, `partnerCases`, and the checks a plugin package's contract tests run. |

A plugin imports from both of the first two. The second only adds what you need to package a system as a plugin, so a game that has no plugins of its own never imports it.

```ts
import { holds, type GameState } from '@ifloom/engine'
import { definePlugin, renderAction } from '@ifloom/engine/plugin'
```

Each page in this section says which entry its exports come from in its import line. The [React UI](/docs/react) has entries of its own.
