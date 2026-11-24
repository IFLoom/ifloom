---
title: "Write a plugin"
description: "Write a plugin package with its own state, calls and tests, and publish it."
---
Use this to add a whole system of your own, such as a loyalty card, a sink of dirty dishes or a diary. A [plugin](/docs/0.1.0/reference/glossary#plugin) keeps state in the save and brings the conditions, effects, commands, values, hooks and view that work on it. Content calls them by name with the plugin's id in front, so a mod can use them without shipping code.

Write a plugin when the system needs state of its own that saves carry forward, or when more than one game should use it. For code only one game needs, write [the game's own rules](/docs/0.1.0/how-to/write-your-own-condition-or-effect) instead, which can have what a plugin has.

## Start a package

A plugin can sit in your game's `src/`, as the loyalty card below does. To publish one, start a package of its own from the `plugin` template:

```sh tab="npm" tab-group="package-manager"
npm create ifloom@latest ifloom-plugin-loyalty -- --template plugin
cd ifloom-plugin-loyalty
npm install
npm test
```

```sh tab="pnpm" tab-group="package-manager"
pnpm create ifloom ifloom-plugin-loyalty --template plugin
cd ifloom-plugin-loyalty
pnpm install
pnpm test
```

```sh tab="yarn" tab-group="package-manager"
yarn create ifloom ifloom-plugin-loyalty --template plugin
cd ifloom-plugin-loyalty
yarn install
yarn run test
```

```sh tab="bun" tab-group="package-manager"
bun create ifloom ifloom-plugin-loyalty --template plugin
cd ifloom-plugin-loyalty
bun install
bun run test
```

The plugin's id is the package's name without `ifloom-plugin-` or `plugin-` in front, so this makes `loyalty`. The template's files are:

- **`src/index.ts`**: the plugin, with a list of entries in `data.loyalty.entries`, a condition, an effect, a command, a view and a check, each marked `TODO`.
- **`src/react/`**: its optional React UI, the `/react` subpath. [Write a plugin's React UI](/docs/0.1.0/how-to/react/write-a-plugins-react-ui) covers it.
- **`tests/`**: Vitest tests that play the plugin in a small game, alone and with each partner, and a contract test that holds the source to the plugin rules and the README to the exports.
- **`package.json`**: the engine as a caret peer dependency, and the scripts `test`, `typecheck` and `build`.

## Write the first plugin

Make the plugin with [`definePlugin`](/docs/0.1.0/reference/plugin-api#defineplugin). `start` gives a new game's state, and each function gets the game state, its arguments and a [context](/docs/0.1.0/reference/plugin-api#plugincontext) whose `slice` is the plugin's own state:

```ts
// src/loyalty.ts
import { definePlugin } from '@ifloom/engine/plugin'

type Card = { stamps: number }

export const loyalty = definePlugin<Card>({
  id: 'loyalty',
  version: 1,
  start: () => ({ stamps: 0 }),
  effects: {
    stamp: (_state, _args, { slice, set }) => set({ stamps: slice.stamps + 1 }),
  },
  conditions: {
    full: (_state, _args, { slice }) => slice.stamps >= 5,
  },
  values: {
    stamps: (_state, _args, { slice }) => slice.stamps,
  },
})
```

`set` returns the game state with the plugin's state replaced. An effect returns that state, a condition true or false, and a value a number or a word for prose.

## Call it from content

List the plugin in the game's `plugins`, then call each name with `loyalty/` in front:

```ts
import { loadGame, type Content } from '@ifloom/engine'
import { loyalty } from './loyalty.ts'

const cafe: Content = {
  actions: [{ id: 'coffee', label: 'Buy a coffee', effects: [{ stat: 'energy', by: 15 }, { 'loyalty/stamp': true }] }],
  scenes: [
    {
      id: 'counter',
      body: [{ text: 'Your card has {{loyalty/stamps}} stamps.' }],
      choices: [
        { id: 'free', label: 'Claim a free coffee', when: { 'loyalty/full': true }, effects: [{ scene: null }] },
        { id: 'leave', label: 'Not today', effects: [{ scene: null }] },
      ],
    },
  ],
}

export const { game, problems } = loadGame([cafe], { id: 'corner-cafe', title: 'The Corner Café', plugins: [loyalty] })
```

After five coffees, `loyalty.read(state, game)` is `{ stamps: 5 }` and the counter offers the free coffee. The [content checker](/docs/0.1.0/reference/checks) reports a name the plugin doesn't have, such as `no plugin effect named "loyalty/stomp"`.

## Declare its calls and add a command

Declare each call once with [`defineCalls`](/docs/0.1.0/reference/plugin-calls#definecalls), and pass it as `calls`. Each function then gets its arguments typed and read from whatever content wrote. A command the player sends has a `run`, and a `whyNot` that refuses it in the player's words, kept in `strings` so a game can reword them:

```ts
import { applyEffects, stringOf } from '@ifloom/engine'
import { arg, defineCalls, definePlugin } from '@ifloom/engine/plugin'

type Card = { stamps: number; free: number }

const CALLS = defineCalls('loyalty', {
  conditions: { stamps: { atLeast: arg.number().optional(1) }, hasFree: {} },
  effects: { stamp: {} },
  commands: { redeem: {} },
})

export const loyalty = definePlugin<Card, unknown, typeof CALLS>({
  id: 'loyalty',
  version: 2,
  calls: CALLS,
  start: () => ({ stamps: 0, free: 0 }),
  // A version 1 save kept only stamps.
  migrations: { 1: (old) => ({ stamps: (old as { stamps: number }).stamps, free: 0 }) },
  conditions: {
    stamps: (_state, { atLeast }, { slice }) => slice.stamps >= atLeast,
    hasFree: (_state, _args, { slice }) => slice.free > 0,
  },
  effects: {
    stamp: (_state, _args, { slice, set }) => (slice.stamps === 4 ? set({ stamps: 0, free: slice.free + 1 }) : set({ ...slice, stamps: slice.stamps + 1 })),
  },
  strings: { notFull: 'Your card is not full yet.', onlyAtCafe: 'Only at the café.' },
  commands: {
    redeem: {
      whyNot: (_state, _args, { slice, game, query }) =>
        slice.free === 0 ? stringOf(game, 'loyalty/notFull') : query('places/here') !== 'cafe' ? stringOf(game, 'loyalty/onlyAtCafe') : undefined,
      run: (state, _args, { slice, set, game }) => set({ ...slice, free: slice.free - 1 }, applyEffects(state, game, [{ stat: 'energy', by: 15 }])),
    },
  },
  view: (_state, { slice }) => ({ stamps: slice.stamps, free: slice.free }),
})
```

The state gained a field, so `version` went up and `migrations` carries a version 1 save forward. `query('places/here')` asks the [places plugin](/docs/0.1.0/reference/plugins/places) where the player is without importing it, and answers `undefined` in a game without it. A button sends the command as `{ 'loyalty/redeem': true }`. Its view greys the button out with the same `whyNot` line, and a game rewords it with `strings: { 'loyalty/notFull': 'Five stamps first.' }`.

Give the factory helpers that write each call, named after it, with the declaration's writers (`CALLS.effects.stamp({})`). See [`CallWriter`](/docs/0.1.0/reference/plugin-calls#callwriter).

## Watch other commands

A [guard](/docs/0.1.0/reference/plugin-api#guard) refuses any command, a [price](/docs/0.1.0/reference/plugin-api#price) adds a note to a button's cost, and a [label](/docs/0.1.0/reference/plugin-api#label) adds to the header. Each is handed the effects a command would apply. This sink of dishes refuses cooking once three dishes would pile up:

```ts
import { callOf, stringOf, type Effect } from '@ifloom/engine'
import { definePlugin } from '@ifloom/engine/plugin'

const added = (effects: readonly Effect[]) => effects.reduce((n, effect) => (callOf(effect)?.name === 'dishes/add' ? n + 1 : n), 0)

export const dishes = definePlugin<{ dirty: number }>({
  id: 'dishes',
  version: 1,
  start: () => ({ dirty: 0 }),
  strings: { piling: 'The dishes would pile up. Wash up first.' },
  effects: { add: (_state, _args, { slice, set }) => set({ dirty: slice.dirty + 1 }) },
  guard: (_state, { effects }, { slice, game }) => (slice.dirty + added(effects) > 3 ? stringOf(game, 'dishes/piling') : undefined),
  price: (_state, effects) => (added(effects) ? ['a dish to wash'] : undefined),
  label: (_state, { slice }) => (slice.dirty ? `${slice.dirty} in the sink` : undefined),
})
```

A guard that returns `{ reason, soft: true }` leaves the button pressable with the line as its `warning`, as the calendar warns before dawn.

## Run code as turns end and commands take

A [hook](/docs/0.1.0/reference/glossary#hook) runs at an event and returns the next state. `onTurn` and `onTurnDone` run as each turn ends, and `onCommand` after every command that took:

```ts
import { definePlugin } from '@ifloom/engine/plugin'

type Diary = { days: number; places: string[] }

export const diary = definePlugin<Diary>({
  id: 'diary',
  version: 1,
  start: () => ({ days: 0, places: [] }),
  onTurn: (_state, { slice, set }) => set({ ...slice, days: slice.days + 1 }),
  onCommand: (_before, after, { slice, set, query }) => {
    const here = query('places/here') ?? null
    return here === null || slice.places.includes(here) ? after : set({ ...slice, places: [...slice.places, here] })
  },
})
```

Return the state you were given when nothing changes. `onCommand` runs only for a command that took, so work out what the first screen needs from the state rather than from it.

## Test it

Test the plugin in a small game with [`@ifloom/engine/testing`](/docs/0.1.0/reference/testing). `loadChecked` fails on any content problem, `freshState` starts with no scene open, and `play` fails on the first refused command:

```ts
// tests/loyalty.test.ts
import { describe, expect, it } from 'vitest'
import { apply, type Command, type Content } from '@ifloom/engine'
import { freshState, loadChecked, play } from '@ifloom/engine/testing'
import { loyalty } from '../src/loyalty.ts'

const cafe: Content = { actions: [{ id: 'coffee', label: 'Buy a coffee', effects: [{ 'loyalty/stamp': true }] }] }
const game = loadChecked([cafe], { id: 'corner-cafe', title: 'The Corner Café', plugins: [loyalty] })
const coffee: Command = { type: 'action', id: 'coffee' }

describe('the loyalty card', () => {
  it('gives a free coffee after five', () => {
    const state = play(freshState(game), game, coffee, coffee, coffee, coffee, coffee)
    expect(loyalty.read(state, game)).toEqual({ stamps: 0, free: 1 })
  })

  it('refuses to redeem an empty card', () => {
    expect(apply(freshState(game), game, { type: 'custom', name: 'loyalty/redeem' }).reason).toBe('Your card is not full yet.')
  })
})
```

A plugin that works with others runs the same tests alone and with each partner, as [Make plugins work together](/docs/0.1.0/how-to/make-plugins-work-together#test-it-alone-and-with-each-partner) shows.

## Publish it

Run `npm run typecheck` and `npm test`, then `npm publish`, which builds `dist/` with [tsdown](https://tsdown.dev) first. To have it listed on [Community plugins](/docs/0.1.0/reference/plugins/community), meet the criteria the template's README lists.

When a release changes what content writes for the plugin, such as an argument's name, bump its `contentVersion` and give it a step in `contentMigrations`, so packs and mods written for the last release still load. A renamed command gets a step in `commandMigrations` too, so old command logs still replay. See [Plugin migrations](/docs/0.1.0/reference/plugin-migrations).

For more, see:

- [Plugin API](/docs/0.1.0/reference/plugin-api), with [`Plugin`](/docs/0.1.0/reference/plugin-api#plugin), [`PluginContext`](/docs/0.1.0/reference/plugin-api#plugincontext) and [`definePlugin`](/docs/0.1.0/reference/plugin-api#defineplugin).
- [Plugin calls](/docs/0.1.0/reference/plugin-calls), [plugin queries](/docs/0.1.0/reference/plugin-queries) and [plugin views](/docs/0.1.0/reference/plugin-views).
- [Plugins](/docs/0.1.0/explanation/plugins), on hooks, providers and why content goes in `data`.
- [Add a plugin](/docs/0.1.0/how-to/add-a-plugin), for a game that uses one.
