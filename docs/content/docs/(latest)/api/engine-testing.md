---
title: "@ifloom/engine/testing"
description: "Every export of @ifloom/engine/testing, the engine's test helpers: its signature and its fields."
---
Generated from the source of `@ifloom/engine/testing` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

- Functions: [`boundaryProblems`](#boundaryproblems), [`exportedNames`](#exportednames), [`freshState`](#freshstate), [`loadChecked`](#loadchecked), [`partnerCases`](#partnercases), [`play`](#play), [`undocumentedExports`](#undocumentedexports)
- Types: [`PartnerCase`](#partnercase)

## boundaryProblems

Function. Explained in [Testing helpers](/docs/reference/testing#boundaryproblems).

What breaks the plugin rules in a plugin package's source, given as each
file's text by its path (any path with `src/` in it, such as a glob's keys):
one line for each, or none.

- The main entry, everything in `src/` but `src/react/`, imports only
  `@ifloom/engine`, `@ifloom/engine/plugin` and its own files beside it,
  never its React UI.
- It uses no browser global (`window.`, `document.`) outside strings and comments.
- `src/react/`, the `/react` subpath, imports only the engine's main
  entry, `react`, `react-dom`, `@ifloom/react` and `@ifloom/react/kit`,
  its own files and `../index.ts`.

```ts shape
import { boundaryProblems } from '@ifloom/engine/testing'
function boundaryProblems(sources: Readonly<Record<string, string>>): string[]
```

## exportedNames

Function. Explained in [Testing helpers](/docs/reference/testing#exportednames).

Every name a source exports, sorted: its `export function`, `const`, `type` and the rest, and each name in an export list.

```ts shape
import { exportedNames } from '@ifloom/engine/testing'
function exportedNames(source: string): string[]
```

## freshState

Function. Explained in [Testing helpers](/docs/reference/testing#freshstate).

A new game, as `startingState` makes it, with no scene open: the room, where a plugin's actions and panels are.

```ts shape
import { freshState } from '@ifloom/engine/testing'
function freshState(game: Game, options?: StartOptions): GameState
```

Uses: [`Game`](/docs/api/engine#game), [`StartOptions`](/docs/api/engine#startoptions), [`GameState`](/docs/api/engine#gamestate).

## loadChecked

Function. Explained in [Testing helpers](/docs/reference/testing#loadchecked).

`loadGame`, for a test: the game, or an `Error` listing every problem the content checker found.

```ts shape
import { loadChecked } from '@ifloom/engine/testing'
function loadChecked(content: readonly Content[], base: GameBase, options?: LoadOptions): Game
```

Uses: [`Content`](/docs/api/engine#content), [`GameBase`](/docs/api/engine#gamebase), [`LoadOptions`](/docs/api/engine#loadoptions), [`Game`](/docs/api/engine#game).

## PartnerCase

Type. Explained in [Testing helpers](/docs/reference/testing#partnercase).

One way to load a plugin for a test: alone, or with one of the plugins it cooperates with.

```ts shape
import type { PartnerCase } from '@ifloom/engine/testing'
type PartnerCase = {
  name: string
  partner: string | null
  plugins: Plugin[]
  has: (id: string) => boolean
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `name` | `string` |  |  | `alone`, or `with <id>`, for a test's name. |
| `partner` | `string \| null` |  |  | The partner's id, or `null` alone. |
| `plugins` | [`Plugin[]`](/docs/api/engine-plugin#plugin) |  |  | The plugins to load: the partner, if any, then the plugin under test. |
| `has` | `(id: string) => boolean` |  |  | Whether this case loads the plugin `id`: the plugin under test or the partner. |

## partnerCases

Function. Explained in [Testing helpers](/docs/reference/testing#partnercases).

The plugin alone, then with each partner in turn, for a test to run a block
in each. Every partner must be in the plugin's `cooperates`, since a plugin
reaches no other; one that isn't, or is listed twice, throws.

```ts shape
import { partnerCases } from '@ifloom/engine/testing'
function partnerCases(plugin: Plugin, partners: readonly Plugin[]): PartnerCase[]
```

Uses: [`Plugin`](/docs/api/engine-plugin#plugin), [`PartnerCase`](#partnercase).

## play

Function. Explained in [Testing helpers](/docs/reference/testing#play).

The state after each command in turn. Throws on the first one refused, naming it and its reason.

```ts shape
import { play } from '@ifloom/engine/testing'
function play(state: GameState, game: Game, ...commands: readonly CommandRef[]): GameState
```

Uses: [`GameState`](/docs/api/engine#gamestate), [`Game`](/docs/api/engine#game), [`CommandRef`](/docs/api/engine#commandref).

## undocumentedExports

Function. Explained in [Testing helpers](/docs/reference/testing#undocumentedexports).

Each name the entries' sources export that the page never mentions as a word, sorted.

```ts shape
import { undocumentedExports } from '@ifloom/engine/testing'
function undocumentedExports(sources: readonly string[], page: string): string[]
```
