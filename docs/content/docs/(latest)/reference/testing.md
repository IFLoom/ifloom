---
title: "Testing helpers"
description: "The helpers in @ifloom/engine/testing that game and plugin tests use, from loadChecked and play to the package checks."
---
`@ifloom/engine/testing` holds the helpers that plugin tests and game tests would otherwise each write for themselves. They sit at their own subpath of the engine package, so a game's page never loads them, and none of them uses a test runner. Each returns a value or throws a plain `Error`, so they work the same with [Vitest](https://vitest.dev), `node:test` or anything else. [Test a route through your game](/docs/how-to/test-a-route) tests a whole game, and [Write a plugin](/docs/how-to/write-a-plugin) tests a plugin.

In the showcase: none, since its tests play a whole game. The `plugin` template's `tests/` uses these helpers, and so does each first-party plugin's, such as `packages/plugin-shop/tests/shop.test.ts`.

```ts
import { boundaryProblems, exportedNames, freshState, loadChecked, partnerCases, play, undocumentedExports, type PartnerCase } from '@ifloom/engine/testing'
```

This test loads a café whose action stamps a loyalty card, a plugin of the game's own, and plays five coffees:

```ts
import { describe, expect, it } from 'vitest'
import { holds, type Command, type Content } from '@ifloom/engine'
import { freshState, loadChecked, play } from '@ifloom/engine/testing'
import { loyalty } from '../src/loyalty.ts'

const cafe: Content = {
  actions: [{ id: 'coffee', label: 'Buy a coffee', effects: [{ 'loyalty/stamp': true }] }],
}

const game = loadChecked([cafe], { id: 'corner-cafe', title: 'The Corner Café', plugins: [loyalty] })
const coffee: Command = { type: 'action', id: 'coffee' }

describe('the loyalty card', () => {
  it('fills after five coffees', () => {
    const state = play(freshState(game), game, coffee, coffee, coffee, coffee, coffee)
    expect(holds(state, game, { 'loyalty/full': true })).toBe(true)
  })
})
```

## PartnerCase

One way [`partnerCases`](#partnercases) loads a plugin for a test, alone or with one partner. Every field is in [`PartnerCase`](/docs/api/engine-testing#partnercase).

`name` is `alone` or `with <id>`, such as `with places`, for the test's name. `partner` is the partner's id, or `null` alone. `plugins` is the list for `loadGame`'s `plugins`, the partner first when there is one, then the plugin under test. `has(id)` says whether the case loads the plugin `id`, for content that makes sense only with a partner.

## Functions

### loadChecked

Returns the game [`loadGame`](/docs/reference/content#loadgame) makes from the content and base, or throws an `Error` listing every problem the [content checker](/docs/reference/checks) found. Every parameter is in [`loadChecked`](/docs/api/engine-testing#loadchecked).

The error has one problem per line, as [`describeProblem`](/docs/reference/checks#describeproblem) writes it:

```text
The game has 1 content problem(s):
  content · action coffee · no plugin effect named "loyalty/stomp"
```

A test of the checker's own problems calls `loadGame` and reads `problems` instead.

### freshState

Returns a new game as [`startingState`](/docs/reference/commands#startingstate) makes it, with no scene open. Every parameter is in [`freshState`](/docs/api/engine-testing#freshstate).

With no scene open the player is in the room, where a plugin's actions and panels are. A game with an `introScene` would start in it, and the intro's locks or choices would get in the way of a plugin's test. The options are `startingState`'s, such as `{ seed: 7 }` for a test that depends on a draw.

### play

Returns the state after applying each command in turn with [`apply`](/docs/reference/commands#apply), or throws on the first one refused. Every parameter is in [`play`](/docs/api/engine-testing#play).

The error names the command, its place in the list and the reason the player would read:

```text
Command 2, {"jobs/work":{"id":"cafe"}}, was refused: You aren’t at work.
```

A command can be any [`CommandRef`](/docs/reference/custom#commandref), so a plugin helper's command goes in as it is, such as `play(state, game, places.go('cafe'), jobs.work('cafe'))`. A test of a refusal calls `apply` or [`whyNot`](/docs/reference/actions#whynot) instead and checks the reason.

### partnerCases

Returns the ways to load a plugin for a test, alone and then with each partner in turn, as a list of [`PartnerCase`](#partnercase)s. Every parameter is in [`partnerCases`](/docs/api/engine-testing#partnercases).

A plugin that [cooperates](/docs/reference/plugin-queries) with another has to work both with it and without it, so its tests run the same block in each case. It throws on a partner the plugin's `cooperates` doesn't list, and on one listed twice. This runs one test alone and once with places, giving `the loyalty card, alone` and `the loyalty card, with places`:

```ts continues
import { partnerCases } from '@ifloom/engine/testing'
import { places } from '@ifloom/plugin-places'

for (const { name, plugins, has } of partnerCases(loyalty, [places({ start: 'cafe' })])) {
  describe(`the loyalty card, ${name}`, () => {
    it('stamps a coffee', () => {
      const map: Content = { entities: has('places') ? [places.location({ id: 'cafe', name: 'Café', exits: [], body: [] })] : [] }
      const game = loadChecked([cafe, map], { id: 'corner-cafe', title: 'The Corner Café', plugins })
      expect(holds(play(freshState(game), game, coffee), game, { 'loyalty/full': true })).toBe(false)
    })
  })
}
```

[Make plugins work together](/docs/how-to/make-plugins-work-together) tests a partner's part in its own block.

### boundaryProblems

Returns each break of the plugin boundary in a package's source, one line each, or none. Every parameter is in [`boundaryProblems`](/docs/api/engine-testing#boundaryproblems).

`sources` is each file's text by its path, and any path with `src/` in it works, such as `src/index.ts` or `../src/index.ts`. Files under `src/react/` are the plugin's [React UI](/docs/reference/react/kit), its `/react` subpath. It checks three rules:

- Outside `src/react/`, a file imports only `@ifloom/engine`, `@ifloom/engine/plugin` and its own files beside it, never its React UI.
- Outside `src/react/`, no code uses `window.` or `document.`, so the plugin runs in Node and in a game with no page. Strings and comments don't count.
- In `src/react/`, a file imports only `@ifloom/engine`, `react`, `react-dom`, `@ifloom/react`, `@ifloom/react/kit`, its own files and `../index.ts`, never a deep path into a package.

A line names the file and what broke the rule, such as `src/rain.ts → @ifloom/plugin-places` or `src/rain.ts: uses a browser global outside src/react/`. An empty `sources` gives `no source files to check`, so a wrong path can't pass. The [plugin template](/docs/reference/cli#ifloom-new) runs it in `tests/contracts.test.ts`, and IFLoom's own plugins are held to the same rules:

```ts
/// <reference types="node" />
import { readFileSync, readdirSync } from 'node:fs'
import { expect, it } from 'vitest'
import { boundaryProblems } from '@ifloom/engine/testing'

const root = new URL('../', import.meta.url)
const sources = Object.fromEntries(
  readdirSync(new URL('src/', root), { recursive: true, encoding: 'utf8' })
    .filter((path) => /\.tsx?$/.test(path))
    .map((path) => [`src/${path.replaceAll('\\', '/')}`, readFileSync(new URL(`src/${path}`, root), 'utf8')]),
)

it('keeps to the plugin boundary', () => {
  expect(boundaryProblems(sources)).toEqual([])
})
```

### exportedNames

Returns every name a source exports, sorted. Every parameter is in [`exportedNames`](/docs/api/engine-testing#exportednames).

It finds each `export function`, `const`, `let`, `class`, `type` and `interface` at the start of a line, and each name in an `export { … }` or `export type { … }`, after any `as`. It reads the text, so it finds no name a module re-exports with `export *`.

### undocumentedExports

Returns each name the sources export that a page never has as a whole word, sorted. Every parameter is in [`undocumentedExports`](/docs/api/engine-testing#undocumentedexports).

It reads the names with [`exportedNames`](#exportednames). A plugin passes its entries, `src/index.ts` and `src/react/index.tsx` when it has one, and its docs page or README. An export the docs never name is one nobody finds.

```ts
/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { undocumentedExports } from '@ifloom/engine/testing'

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

it('names every export in the README', () => {
  expect(undocumentedExports([read('src/index.ts'), read('src/react/index.tsx')], read('README.md'))).toEqual([])
})
```
