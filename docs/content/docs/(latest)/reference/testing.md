---
title: "Testing helpers"
description: "@ifloom/engine/testing: load a game that fails on content problems, start with no scene open, play commands that fail on a refusal, run a plugin alone and with each partner, and check a plugin package's imports and docs."
---
`@ifloom/engine/testing` has the few helpers every plugin test and most game tests write for themselves. They're in the engine package, at their own subpath, so a game's page never loads them.

```ts
import { boundaryProblems, exportedNames, freshState, loadChecked, partnerCases, play, undocumentedExports, type PartnerCase } from '@ifloom/engine/testing'
```

None of them uses a test runner. Each returns a value or throws a plain `Error`, so they work the same with [Vitest](https://vitest.dev), `node:test` or anything else. A failed `loadChecked` or `play` fails the test with the problem or the refusal in its message.

Here's the loyalty card from [Writing a plugin](/docs/reference/plugins#your-first-plugin), tested in a small café:

```ts
// tests/loyalty.test.ts
import { describe, expect, it } from 'vitest'
import { holds, type Command, type Content } from '@ifloom/engine'
import { freshState, loadChecked, play } from '@ifloom/engine/testing'
import { loyalty } from '../src/loyalty.ts'

const cafe: Content = {
  name: 'cafe',
  actions: [{ id: 'coffee', label: 'Buy a coffee', effects: [{ 'loyalty/stamp': true }] }],
}

const game = loadChecked([cafe], { id: 'corner-cafe', title: 'The Corner Café', plugins: [loyalty] })
const coffee: Command = { type: 'action', id: 'coffee' }

describe('the loyalty card', () => {
  it('fills after five coffees', () => {
    const state = play(freshState(game), game, coffee, coffee, coffee, coffee, coffee)
    expect(loyalty.read(state, game)).toEqual({ stamps: 5 })
    expect(holds(state, game, { 'loyalty/full': true })).toBe(true)
  })
})
```

[Testing your game](/docs/guide/testing) covers testing a whole game, with routes, saves, playtests and snapshots.

## loadChecked

```ts shape
function loadChecked(content: readonly Content[], base: GameBase, options?: LoadOptions): Game
```

[`loadGame`](/docs/reference/content#loadgame), for a test. It returns the game, or throws an `Error` listing every problem the [content checker](/docs/reference/checks) found, one per line as [`describeProblem`](/docs/reference/checks#problem-and-describeproblem) writes it:

```text
The game has 1 content problem(s):
  cafe · action coffee · no plugin effect named "loyalty/stomp"
```

A test of what the checker reports needs the problems themselves, so it calls `loadGame` and reads `problems`.

## freshState

```ts shape
function freshState(game: Game, options?: StartOptions): GameState
```

A new game, as [`startingState`](/docs/reference/commands#startingstate) makes it, with no scene open. That's the room, where a plugin's actions and panels are. A game with an `introScene` starts in it, and the intro's locks or choices would get in the way of a plugin's test. `options` is `startingState`'s, such as `{ seed: 7 }` for a test that depends on a random draw.

## play

```ts shape
function play(state: GameState, game: Game, ...commands: readonly CommandRef[]): GameState
```

Applies each command in turn with [`apply`](/docs/reference/commands#apply) and returns the state after the last. If one is refused it throws, naming the command, its place in the list and the reason the player would read:

```text
Command 2, {"jobs/work":{"id":"cafe"}}, was refused: You aren’t at work.
```

A command can be any [`CommandRef`](/docs/reference/custom#commandref), so a plugin helper's command goes in as it is: `play(state, game, places.go('cafe'), jobs.work('cafe'))`. To test a refusal, call `apply` or [`whyNot`](/docs/reference/actions#whynot) instead and check the reason.

## partnerCases

```ts shape
function partnerCases(plugin: Plugin, partners: readonly Plugin[]): PartnerCase[]
```

The ways to load a plugin for a test: alone, then with each partner in turn. A plugin that [cooperates](/docs/reference/plugins#cooperates) with another has to work both with it and without it, so its tests run the same block in each case.

Suppose the loyalty card cooperates with places, and stamps only in the café when the game has places:

```ts continues
import { partnerCases } from '@ifloom/engine/testing'
import { places } from '@ifloom/plugin-places'

for (const { name, plugins, has } of partnerCases(loyalty, [places({ start: 'cafe' })])) {
  describe(`the loyalty card, ${name}`, () => {
    it('stamps a coffee', () => {
      const map: Content = { name: 'map', entities: has('places') ? [places.location({ id: 'cafe', name: 'Café', exits: [], body: [] })] : [] }
      const game = loadChecked([cafe, map], { id: 'corner-cafe', title: 'The Corner Café', plugins })
      expect(loyalty.read(play(freshState(game), game, coffee), game).stamps).toBe(1)
    })
  })
}
```

That makes `the loyalty card, alone` and `the loyalty card, with places`. What a partner changes gets a block of its own, with the partner set up as that test needs.

Every partner has to be in the plugin's `cooperates`, since a plugin reaches no other. `partnerCases` throws on one that isn't, or on one listed twice.

### PartnerCase

```ts shape
type PartnerCase = {
  name: string
  partner: string | null
  plugins: Plugin[]
  has: (id: string) => boolean
}
```

| Field | What it is |
|---|---|
| `name` | `alone`, or `with <id>`, such as `with places`, for the test's name. |
| `partner` | The partner's id, or `null` alone. |
| `plugins` | The plugins to load, for `loadGame`'s `plugins`: the partner, if there is one, then the plugin under test. |
| `has` | Whether this case loads the plugin `id`, the partner or the plugin under test, for content that only makes sense with a partner. |

## Checking a plugin package

Two helpers read a plugin package's source as text, for a contract test that holds it to the rules [Community plugins](/docs/plugins/community) lists. The [plugin template](/docs/cli#a-plugin-package) has that test in `tests/contracts.test.ts`, and IFLoom's own plugins are held to the same checks.

```ts
/// <reference types="node" />
import { readFileSync, readdirSync } from 'node:fs'
import { expect, it } from 'vitest'
import { boundaryProblems, undocumentedExports } from '@ifloom/engine/testing'

const root = new URL('../', import.meta.url)
const read = (path: string) => readFileSync(new URL(path, root), 'utf8')
const sources = Object.fromEntries(
  readdirSync(new URL('src/', root), { recursive: true, encoding: 'utf8' })
    .filter((path) => /\.tsx?$/.test(path))
    .map((path) => [`src/${path.replaceAll('\\', '/')}`, read(`src/${path}`)]),
)

it('keeps to the plugin boundary', () => {
  expect(boundaryProblems(sources)).toEqual([])
})

it('names every export in the README', () => {
  expect(undocumentedExports([read('src/index.ts'), read('src/react/index.tsx')], read('README.md'))).toEqual([])
})
```

### boundaryProblems

```ts shape
function boundaryProblems(sources: Readonly<Record<string, string>>): string[]
```

What breaks the plugin boundary in a package's source, one line each, or none. `sources` is each file's text by its path, and any path with `src/` in it works, such as `src/index.ts` or a glob's `../src/index.ts`. Files under `src/react/` are the plugin's [React UI](/docs/react/kit), the `/react` subpath. It checks three things:

- Outside `src/react/`, a file imports only `@ifloom/engine`, `@ifloom/engine/plugin` and its own files beside it (`./x.ts`), never its React UI.
- Outside `src/react/`, nothing uses `window.` or `document.`, so the plugin runs in Node and in a game with no page. Strings and comments don't count, so a page's script written as text is fine.
- In `src/react/`, a file imports only `@ifloom/engine`, `react`, `react-dom`, `@ifloom/react` and `@ifloom/react/kit` (never a deep path into the package), its own files and `../index.ts`.

A line names the file and what it imported, such as `src/rain.ts → @ifloom/plugin-places`, or `src/rain.ts: uses a browser global outside src/react/`. An empty `sources` is a problem too, `no source files to check`, so a wrong path can't pass.

### exportedNames

```ts shape
function exportedNames(source: string): string[]
```

Every name a source exports, sorted: each `export function`, `const`, `let`, `class`, `type` and `interface` at the start of a line, and each name in an `export { … }` or `export type { … }`, after any `as`. It reads the text, so it finds no name a module re-exports with `export *`.

### undocumentedExports

```ts shape
function undocumentedExports(sources: readonly string[], page: string): string[]
```

Each name the sources export, by `exportedNames`, that `page` never has as a whole word, sorted. Pass the package's entries (`src/index.ts`, and `src/react/index.tsx` if it has one) and its docs page or README. An export the docs don't name is one nobody finds.
