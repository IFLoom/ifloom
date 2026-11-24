---
title: "Reference"
description: "The reference pages for every IFLoom export, grouped by package from the engine to the plugins, the React UI, the browser helpers and the CLI."
---
The reference documents every export of every IFLoom package, one page per feature. Each entry gives a definition, its behaviour and one example, and links to the generated [API](/docs/0.1.0/api) for the full signature and every field. [The glossary](/docs/0.1.0/reference/glossary) defines the words the pages use, and [Common types](/docs/0.1.0/reference/common) covers the types every page relies on.

## Entries of @ifloom/engine

`@ifloom/engine` has three entries, and a page's import line says which one its exports come from:

- **`@ifloom/engine`** holds what a game declares and runs: [`Content`](/docs/0.1.0/reference/content#content), the scene builders such as [`text`](/docs/0.1.0/reference/flows), [conditions](/docs/0.1.0/reference/conditions), [effects](/docs/0.1.0/reference/effects), lookups such as [`statValue`](/docs/0.1.0/reference/stats#statvalue), [`loadGame`](/docs/0.1.0/reference/content#loadgame), [`checkGame`](/docs/0.1.0/reference/checks#checkgame), the [runner](/docs/0.1.0/reference/runner), saves and the [view](/docs/0.1.0/reference/view). The registries a plugin or a game augments to type its calls are here too.
- **`@ifloom/engine/plugin`** holds what a plugin adds: [`definePlugin`](/docs/0.1.0/reference/plugin-api#defineplugin) and the contexts a hook gets, [`defineCalls`](/docs/0.1.0/reference/plugin-calls) and the other declarations, [`renderAction`](/docs/0.1.0/reference/view#renderaction), [locks](/docs/0.1.0/reference/locks), and the steps that carry a plugin's content forward.
- **`@ifloom/engine/testing`** holds the [testing helpers](/docs/0.1.0/reference/testing), such as `loadChecked`, `freshState`, `play` and `partnerCases`.

A plugin imports from the first two. A game with no plugin of its own never imports `@ifloom/engine/plugin`.

```ts
import { holds, type GameState } from '@ifloom/engine'
import { definePlugin, renderAction } from '@ifloom/engine/plugin'
```

## Other packages

Each package has its own section of the reference:

- [First-party plugins](/docs/0.1.0/reference/plugins), one page per plugin, from the calendar to debug.
- [The React UI](/docs/0.1.0/reference/react), `@ifloom/react` and its kit.
- [Browser](/docs/0.1.0/reference/browser), `@ifloom/browser` and the audio player `@ifloom/audio`.
- [The CLI](/docs/0.1.0/reference/cli), `@ifloom/cli` and its game module.

[Examples](/docs/0.1.0/reference/examples) maps each feature to the example file that uses it.
