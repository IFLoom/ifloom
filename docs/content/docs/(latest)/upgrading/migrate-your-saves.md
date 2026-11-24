---
title: "Migrate your players' saves"
description: "Carry players' saves forward when an update changes your game's content, with a version and a migration step for each change."
---
Use this when an update to your game changes its content in a way an old save has to know about, such as a kv key renamed or a stat added with a `start` above 0. The engine carries saves across its own changes. Your game's `rules.migrations` carry them across yours. You need a game that already saves, and a save from the version before to test with.

The Letter, the novel in `examples/novel`, does this. Its `src/game.ts` is version 2, with a step that renames version 1's `lies` to `fibs`.

## Give the game a version

Set `version` on the base that [`loadGame`](/docs/reference/content#loadgame) takes, as a whole number from 1. A game that leaves it out is at version 1, so the first update that needs a step sets `version: 2`.

```ts fragment
version: 2,
```

A new game records the version in [`state.gameVersion`](/docs/reference/state#gameversion), and each save records it in [`SaveMeta.gameVersion`](/docs/reference/saves#savemeta). A save with no `gameVersion`, from before the game declared one, is at version 1.

## Write the step

Add a step to [`migrations`](/docs/reference/rules#migrations) in the game's `rules`, keyed by the version it upgrades from. Step 1 takes a version-1 save to version 2, step 2 takes it from 2 to 3, and so on. A step gets the state and returns a new one, and it never changes the state it's given.

The Letter counted the reader's lies in the kv key `lies`, and version 2 calls it `fibs`. This step moves the count across:

```ts
// src/rules.ts
import type { GameRules } from '@ifloom/engine'

export const rules: GameRules = {
  migrations: {
    1: (state) => {
      const { lies, ...kv } = state.kv
      return lies === undefined ? state : { ...state, kv: { ...kv, fibs: lies } }
    },
  },
}
```

Pass `rules` and the new `version` in the base, beside `id` and `title`:

```ts
import { loadGame, type Content } from '@ifloom/engine'
import { rules } from './rules.ts'

declare const content: Content[]

export const loaded = loadGame(content, { id: 'the-letter', title: 'The Letter', version: 2, rules })
```

A reader who saved at the door after two lies under version 1 now loads with `fibs: 2`, so the door scene still shows the line for two or more.

When a save loads, [`loadState`](/docs/reference/saves#loadstate) runs every step from the save's version up to the game's, in order, and stamps the state with the game's version. A version-1 save in a version-3 game runs step 1 and then step 2. The steps run after the engine's own steps and the plugins' migrations, so a step always reads a state in the engine's current shape. A version with no step is carried forward unchanged, so write steps only for the versions that need one.

## Fill new stats and settings

Call `tools.fill()` in a step to add what the game now declares and an old save lacks. Once a game declares a `version`, even `version: 1`, the engine fills nothing new into a loaded save by itself. `fill` takes the parts to fill, each a [`FillPart`](/docs/reference/saves#fillpart): `'stats'`, `'kv'` and `'settings'`.

Say version 3 adds a `patience` stat that starts at 5. Raise the version and fill the new stat in step 2:

```ts
import type { GameRules } from '@ifloom/engine'

export const rules: GameRules = {
  migrations: {
    1: (state) => {
      const { lies, ...kv } = state.kv
      return lies === undefined ? state : { ...state, kv: { ...kv, fibs: lies } }
    },
    2: (_state, tools) => tools.fill(['stats']),
  },
}
```

Fill every new stat whose `start` isn't 0. A stat the save lacks reads as its `start` in conditions and the view, but a `stat` effect adds to the kept value, which is 0. So `{ stat: 'patience', by: 1 }` on a save without `patience` gives 1, not 6.

`fill` works on the state the step was given and leaves out anything the step has done since. A step that fills and changes calls `fill` first, then changes its result:

```ts fragment
2: (_state, tools) => {
  const filled = tools.fill(['stats'])
  return { ...filled, kv: { ...filled.kv, metCleo: false } }
},
```

A declared [entity](/docs/reference/entities) never needs filling. An entity an update adds is in every old save, held where its `at` says, because a save keeps only what play changed. [Older saves](/docs/upgrading/old-saves#entities-in-old-saves) says more.

## Keep every old step

Leave each step in `migrations` when you add the next one. A missing step is skipped without a word, so a save from before it skips that change. The [content checker](/docs/reference/checks) reports a `version` that isn't a whole number of 1 or more, and a step keyed outside 1 to `version - 1`.

## Test a save from the version before

Build a state as the old version wrote it, then load it with [`loadState`](/docs/reference/saves#loadstate), which runs your steps as the save store does:

```ts
// tests/migrations.test.ts
import { expect, it } from 'vitest'
import { loadState, startingState } from '@ifloom/engine'
import module from '../src/game.ts'

const { game } = module.build()

it('reads a save from version 1, when the count was called lies', () => {
  const { gameVersion: _version, ...fresh } = startingState(game)
  const loaded = loadState({ ...fresh, kv: { playerName: 'Robin', lies: 2 } }, game)
  expect(loaded.ok && loaded.value.kv.fibs).toBe(2)
})
```

Leaving out `gameVersion` makes the state a version-1 save. The Letter's test `reads a save from version 1, when the count was called lies`, in `examples/novel/tests/novel.test.ts`, does the same through a whole save file.

## Variations

**A save from a newer version.** A player who goes back to an older build can't load a save the newer one made. [`loadState`](/docs/reference/saves#loadstate) refuses it with the [`gameNewer`](/docs/reference/saves#strings) string, `That save was made with a newer version of this game.`

**A game with no version.** A game that never declares a `version` gives each loaded save the default of each `play` setting it lacks, and fills nothing else. Setting `version` for the first time, even to 1, stops that, so fill settings in a step from then on.

**Reshaping the game's own state.** A save keeps the state `rules.start` makes in `state.plugins.game.state`. A step rewrites it there, as it would any other part of the state.

These pages describe what the steps use:

- [`migrations`](/docs/reference/rules#migrations) and [`MigrationTools`](/docs/reference/saves#migrationtools)
- [`loadState`](/docs/reference/saves#loadstate), the order a save loads in
- [Older saves](/docs/upgrading/old-saves), the engine's own steps
- [Plugin migrations](/docs/reference/plugin-migrations), the same for a plugin's state
