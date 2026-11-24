---
title: "@ifloom/engine/testing"
description: "Every export of @ifloom/engine/testing, the engine's test helpers: its signature and its fields."
---
Generated from the source of `@ifloom/engine/testing` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

- Functions: [`boundaryProblems`](#boundaryproblems), [`exportedNames`](#exportednames), [`freshState`](#freshstate), [`loadChecked`](#loadchecked), [`partnerCases`](#partnercases), [`play`](#play), [`undocumentedExports`](#undocumentedexports)
- Types: [`PartnerCase`](#partnercase)

## boundaryProblems

Function. Explained in [Testing helpers](/docs/0.1.0/reference/testing#boundaryproblems).

Returns one line for each break of the plugin rules in a plugin package's source, or none. Give each file's text by
its path, any path with `src/` in it, such as a glob's keys.

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

Function. Explained in [Testing helpers](/docs/0.1.0/reference/testing#exportednames).

Returns the names a source exports, sorted, from its `export function`, `const`, `type` and the rest, and each export list.

```ts shape
import { exportedNames } from '@ifloom/engine/testing'
function exportedNames(source: string): string[]
```

## freshState

Function. Explained in [Testing helpers](/docs/0.1.0/reference/testing#freshstate).

Returns a new game's state from `startingState` with no scene open, so the room shows a plugin's actions and panels.

```ts shape
import { freshState } from '@ifloom/engine/testing'
function freshState(game: Game, options?: StartOptions): GameState
```

Uses: [`Game`](/docs/0.1.0/api/engine#game), [`StartOptions`](/docs/0.1.0/api/engine#startoptions), [`GameState`](/docs/0.1.0/api/engine#gamestate).

## loadChecked

Function. Explained in [Testing helpers](/docs/0.1.0/reference/testing#loadchecked).

Returns the game `loadGame` builds, for a test. It throws an `Error` listing every problem the content checker finds.

```ts shape
import { loadChecked } from '@ifloom/engine/testing'
function loadChecked(content: readonly Content[], base: GameBase, options?: LoadOptions): Game
```

Uses: [`Content`](/docs/0.1.0/api/engine#content), [`GameBase`](/docs/0.1.0/api/engine#gamebase), [`LoadOptions`](/docs/0.1.0/api/engine#loadoptions), [`Game`](/docs/0.1.0/api/engine#game).

## PartnerCase

Type. Explained in [Testing helpers](/docs/0.1.0/reference/testing#partnercase).

One way to load a plugin for a test, alone or with one of the plugins it cooperates with.

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
| `name` | `string` |  |  | The case's name for a test, `alone` or `with <id>`. |
| `partner` | `string \| null` |  |  | The partner's id, or `null` for the plugin alone. |
| `plugins` | [`Plugin[]`](/docs/0.1.0/api/engine-plugin#plugin) |  |  | The plugins to load, the partner first if there is one, then the plugin under test. |
| `has` | `(id: string) => boolean` |  |  | Returns true when the case loads the plugin `id`, the plugin under test or the partner. |

## partnerCases

Function. Explained in [Testing helpers](/docs/0.1.0/reference/testing#partnercases).

Returns the `PartnerCase`s of a plugin, alone and then with each partner in turn, for a test to run in each. It
throws for a partner missing from `cooperates` or listed twice.

```ts shape
import { partnerCases } from '@ifloom/engine/testing'
function partnerCases(plugin: Plugin, partners: readonly Plugin[]): PartnerCase[]
```

Uses: [`Plugin`](/docs/0.1.0/api/engine-plugin#plugin), [`PartnerCase`](#partnercase).

## play

Function. Explained in [Testing helpers](/docs/0.1.0/reference/testing#play).

Returns the state after each command in turn. It throws on the first command refused, naming it and the reason.

```ts shape
import { play } from '@ifloom/engine/testing'
function play(state: GameState, game: Game, ...commands: readonly CommandRef[]): GameState
```

Uses: [`GameState`](/docs/0.1.0/api/engine#gamestate), [`Game`](/docs/0.1.0/api/engine#game), [`CommandRef`](/docs/0.1.0/api/engine#commandref).

## undocumentedExports

Function. Explained in [Testing helpers](/docs/0.1.0/reference/testing#undocumentedexports).

Returns the names the entries' sources export that a docs page never mentions as a word, sorted.

```ts shape
import { undocumentedExports } from '@ifloom/engine/testing'
function undocumentedExports(sources: readonly string[], page: string): string[]
```
