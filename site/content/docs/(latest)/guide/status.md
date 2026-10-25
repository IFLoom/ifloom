---
title: "API status"
description: What you can rely on in IFLoom before 1.0, what the API is, and the renames still planned.
---
IFLoom hasn't reached 1.0, so there's no stable API yet. Names, shapes and defaults can change between releases, and the [changelog](/docs/changelog) says what changed. Saves and packs are already built to carry old data forward, and a few renames are planned.

## What the API is

`@ifloom/engine` is the API. It exports everything a game needs: the types you declare a game with, data scenes and prose, conditions and effects, the shape of the game's own code in `rules`, the reducer, the loader, the runner, saves and the view. Everything it exports is documented in the [reference](/docs/reference/game), and a test fails if an export isn't named there.

```ts
import { loadGame, startingState, apply, view, type DataScene, type StorylineDef } from '@ifloom/engine'
```

Each [first-party plugin](/docs/plugins) is a package of its own, imported the same way, and so is the [CLI](/docs/cli), `@ifloom/cli`.

The engine has no DOM and no framework. The React UI is its own package, `@ifloom/react`, so that a UI for another framework can be a package of its own too. Until one exists, the `vue`, `svelte` and `vanilla` templates draw a game without it, and [Your own UI in any framework](/docs/guide/frameworks) walks through them.

The engine has one entry point, `@ifloom/engine`. A deep path such as `@ifloom/engine/scene.ts` or `@ifloom/engine/dist/scene.js` doesn't resolve. Anything the entry doesn't export is internal and undocumented, and it can change or go away without notice.

## What's settled and what isn't

Nothing is promised until 1.0, but two parts already handle change for you:

- **Saves carry their version.** The format is at version 22 (`SAVE_VERSION`). When the format changes, an older save is carried forward a step at a time when it's loaded, so a player's saves survive an engine update. Plugins version their own state the same way. See [Saves](/docs/reference/saves).
- **Packs carry their schema.** A pack, such as a mod, says which version of the content format it was written for with `schema: SCHEMA`. Your own content has none, since it's built with the engine it runs on. The loader upgrades a pack written for an older version, so old packs and mod files keep loading. It leaves out a pack written for a newer version and reports a problem, so it never misreads one. See [Packs and loading](/docs/reference/loader).

Everything else can still change, including function names, option names and the shapes of content. When one does, the reference pages change with it. Known gaps are described on the reference page they affect, usually under its gotchas.

## Planned renames

| Today | Planned |
|---|---|
| A choice's and an action's `once` | `once` and `cooldown` |

The reference pages use the names exported today.
