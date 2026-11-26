---
title: "Stability before 1.0"
description: "IFLoom has no stable API before 1.0, but saves and packs already carry old data forward when the engine changes."
---
IFLoom hasn't reached 1.0, so it has no stable API yet. Names, shapes and defaults can change between releases, and the [changelog](/docs/changelog) lists each change. Saves and packs already carry old data forward, as this page explains.

## The API

The API is what the packages export from their entries. A deep path into a package, such as `@ifloom/engine/scene.ts` or `@ifloom/engine/dist/scene.js`, doesn't resolve, and anything an entry doesn't export is internal. An internal can change or go away without notice.

The engine has three entries:

- **`@ifloom/engine`** exports the types you declare a game with, scenes and prose, conditions and effects, the shape of the game's `rules`, the reducer, the loader, the runner, saves and the view.
- **`@ifloom/engine/plugin`** exports the plugin API, such as `definePlugin` and `defineCalls`.
- **`@ifloom/engine/testing`** exports the test helpers, such as `loadChecked` and `play`.

```ts
import { loadGame, startingState, apply, view, type DataScene, type StorylineDef } from '@ifloom/engine'
```

The [reference](/docs/reference) documents every export of the three entries, and a test fails on an export no reference page names. Each [first-party plugin](/docs/reference/plugins) is a package of its own, imported the same way, and so are the [CLI](/docs/reference/cli), `@ifloom/cli`, the [browser helpers](/docs/reference/browser), `@ifloom/browser`, and the [React UI](/docs/reference/react), `@ifloom/react`.

The engine has no DOM and no UI framework. The React UI is one package among possible others, and a game renders without it in any framework, as [Start your own UI](/docs/how-to/render/start) shows.

## What already carries old data forward

Two parts of the engine already handle change, so an engine update keeps old data working:

- **Saves record their version.** Each save records the version of its format, [`SAVE_VERSION`](/docs/reference/saves#save_version). When the format changes, [`loadState`](/docs/reference/saves#loadstate) carries an older save forward one step at a time, so a player's saves survive an engine update. Plugins version their own state the same way. [Older saves](/docs/upgrading/old-saves) lists each version.
- **Packs record their schema.** A pack, such as a mod, records the version of the content format it was written for in `schema`. The loader upgrades a pack written for an older schema, and skips one written for a newer schema with a problem, so it never misreads one. Your own content has no schema, because you build it with the engine it runs on. [Schema history](/docs/upgrading/schema-history) lists each schema.

Everything else can still change, including function names, option names and the shapes of content. When one changes, the reference pages change with it. A known gap is described on the reference page it affects, under its caveats, such as the lack of plurals in [strings](/docs/reference/strings#caveats). The [changelog](/docs/changelog) says what to write instead of anything renamed or removed, and [Upgrade IFLoom](/docs/upgrading) describes how to move a game to a new release.
