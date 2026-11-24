---
title: "Reference"
description: "Where each export lives: the three entries of @ifloom/engine, the plugins, the React UI, the browser packages and the CLI, with the shared types and the glossary."
---
The reference documents every export of every IFLoom package, one page per feature. Each entry gives a definition, its behaviour and one example, and links to the generated [API](/docs/api) for the full signature and every field. [The glossary](/docs/reference/glossary) defines the words the pages use, and [Common types](/docs/reference/common) covers the types every page relies on.

## Entries of @ifloom/engine

`@ifloom/engine` has three entries, and a page's import line says which one its exports come from:

- **`@ifloom/engine`** holds what a game declares and runs: [`Content`](/docs/reference/content#content), the scene builders such as [`text`](/docs/reference/flows), [conditions](/docs/reference/conditions), [effects](/docs/reference/effects), lookups such as [`statValue`](/docs/reference/stats#statvalue), [`loadGame`](/docs/reference/content#loadgame), [`checkGame`](/docs/reference/checks#checkgame), the [runner](/docs/reference/runner), saves and the [view](/docs/reference/view). The registries a plugin or a game augments to type its calls are here too.
- **`@ifloom/engine/plugin`** holds what a plugin adds: [`definePlugin`](/docs/reference/plugin-api#defineplugin) and the contexts a hook gets, [`defineCalls`](/docs/reference/plugin-calls) and the other declarations, [`renderAction`](/docs/reference/view#renderaction), [locks](/docs/reference/locks), and the steps that carry a plugin's content forward.
- **`@ifloom/engine/testing`** holds the [testing helpers](/docs/reference/testing), such as `loadChecked`, `freshState`, `play` and `partnerCases`.

A plugin imports from the first two. A game with no plugin of its own never imports `@ifloom/engine/plugin`.

```ts
import { holds, type GameState } from '@ifloom/engine'
import { definePlugin, renderAction } from '@ifloom/engine/plugin'
```

## Other packages

Each package has its own section of the reference:

- [First-party plugins](/docs/reference/plugins), one page per plugin, from the calendar to debug.
- [The React UI](/docs/reference/react), `@ifloom/react` and its kit.
- [Browser](/docs/reference/browser), `@ifloom/browser` and the audio player `@ifloom/audio`.
- [The CLI](/docs/reference/cli), `@ifloom/cli` and its game module.

[Examples](/docs/reference/examples) maps each feature to the example file that uses it.
