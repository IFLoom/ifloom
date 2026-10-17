---
title: "API status"
description: What you can rely on in pre-release IFLoom, what isn't published yet, and the renames still planned.
---
IFLoom is pre-release. There's no stable API yet, so names, shapes and defaults can change between commits. This page says what you can rely on today, what isn't published, and what's planned to change.

## Not on npm yet

None of the packages are published, and this docs site isn't public yet. You build games from a checkout of the repository, as [Installation](/docs/guide/installation) shows, and start one with [`npm run new`](/docs/cli#ifloom-new). Before the first release, the plan is to:

- publish the packages under the `@ifloom` scope
- build them to JavaScript, so they install and run without a Node that strips TypeScript types

## What the API is

`@ifloom/engine` is the API. It exports everything a game needs: the types you declare a game with, data scenes and prose, conditions and effects, custom functions, the reducer, the loader, the runner, saves and the view. Everything it exports is documented in the [reference](/docs/reference/game), and a test fails if an export isn't named there.

```ts
import { loadGame, startingState, apply, view, type DataScene, type StorylineDef } from '@ifloom/engine'
```

Each [first-party plugin](/docs/plugins) is a package of its own, imported the same way, and so is the [CLI](/docs/cli), `@ifloom/cli`.

The engine has no DOM and no framework. The React UI is its own package, `@ifloom/react`, so that a UI for another framework can be a package of its own too. Until one exists, the `vue`, `svelte` and `vanilla` templates draw a game without it, and [Using another framework](/docs/guide/frameworks) walks through them.

The engine has one entry point, `@ifloom/engine`. A deep path such as `@ifloom/engine/scene.ts` doesn't resolve: anything not exported from the entry is internal, isn't documented, and can change or vanish without notice.

## What's settled and what isn't

Nothing is promised until the first release, but some parts are built to survive change:

- **Saves carry their version.** The format is at version 13 (`SAVE_VERSION`). When the format changes, an older save is carried forward a step at a time when it's loaded, so a player's saves survive an engine update. Plugins version their own state the same way. See [Saves](/docs/reference/saves).
- **Packs carry their schema.** A pack says which version of the content format it was written for with `schema: SCHEMA`. The loader upgrades a pack written for an older version, so old packs and mod files keep loading, and leaves out one written for a newer version with a problem, rather than misreading it. See [Packs and loading](/docs/reference/loader).

Everything else can still change, including function names, option names and the shapes of content. When one does, the reference pages change with it. Known gaps are described on the reference page they affect, usually under its gotchas.

## Planned renames

| Today | Planned |
|---|---|
| `oncePerTurn` and the once-per-turn helpers, and a choice's `once` | `once` and `cooldown` |

The reference pages use the names exported today.
