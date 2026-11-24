---
title: "Changes"
description: "The tracked stats the last command moved, the player's and those kept on entities, in view.changes, for feedback such as a +30 coins pill."
---
After every command the engine compares the stats you track as the player reads them, before and after, and lists what moved in [`view.changes`](/docs/reference/view#changes). Use it to show feedback after a choice, such as `+30 coins` or `Ava's trust -1`, without working out the difference yourself.

Name the stats to track in your content's `changes`:

```ts
import type { Content } from '@ifloom/engine'

const stats: Content = {
  stats: [
    { id: 'coins', label: 'Coins', start: 12, format: { one: '{n} coin', other: '{n} coins' } },
    { id: 'energy', label: 'Energy', start: 80, format: '{n}%' },
    { id: 'friendship', label: 'Friendship', of: 'character' },
  ],
  changes: { stats: ['coins', 'energy', 'friendship'] },
}
```

Then each command leaves what it moved in the view:

```ts given
runner.apply({ type: 'choose', id: 'sell' })
runner.view().changes
// [{ stat: 'coins', from: 10, to: 40, by: 30, label: 'Coins', text: '+30 coins' },
//  { stat: 'energy', from: 80, to: 75, by: -5, label: 'Energy', text: '-5%' }]
```

## changes

```ts fragment
changes?: { stats: string[] }
```

The `changes` key of [`Content`](/docs/reference/content#content) and of a [`Pack`](/docs/reference/content#pack), and of [`Game`](/docs/reference/game#game) once loaded. `stats` lists the ids of the stats whose changes are tracked.

- An entity stat's id, one declared with [`of`](/docs/reference/stats#statdef), covers that stat on every entity, so `friendship` tracks Ava's and Sam's alike.
- Every file's and every pack's lists are added together, so a mod can track a stat it adds without repeating yours.
- With no stat named anywhere, nothing is tracked and `view.changes` is always empty.

### ChangesDef

```ts shape
import type { ChangesDef } from '@ifloom/engine'

type ChangesDef = { stats: string[] }
```

The type of the `changes` key, exported for code that builds content.

The [content checker](/docs/reference/checks) reports an id that is no stat, as `stats names "cions", which is no stat`.

## Change

```ts shape
type Change = {
  stat: string
  of?: EntityRef
  from: number
  to: number
  by: number
  label: string
  text: string
}
```

| Field | What it is |
|---|---|
| `stat` | The stat's id. |
| `of` | The entity whose stat it is, such as `character:ava`. Left out for the player's. |
| `from`, `to` | What the stat read before the command and after it, as [`statValue`](/docs/reference/stats#statvalue) reads it: derived stats worked out, plugins' modifiers applied and rounded as the stat says. |
| `by` | `to - from`. Above 0 when it went up. |
| `label` | The stat's `label`. |
| `text` | The change in the stat's own [`format`](/docs/reference/stats#statdef), with a sign: `+30 coins`, `-1 coin`, `-5%`. Just the number with no format. |

## ChangeView

```ts shape
type ChangeView = Change & { name?: string }
```

What [`view.changes`](/docs/reference/view#changes) lists: each [`Change`](#change) with the words to show after its `text`, so the change says what moved.

| `name` is | When |
|---|---|
| The entity's name, such as `Ava` | For a stat kept on an entity (`of`), filled for this save as the view names entities. |
| The stat's `label`, such as `Energy` | For the player's stat when `text` doesn't say what it is: its format has no words besides the number, such as `{n}%` or `£{n}`, or it has no format. |
| Left out | When the stat's format already says it in words, such as `{n} coins`. |

So `+30 coins`, `-1 Energy` and `+4 Ava` are each a change's `text` followed by its `name`. The save keeps the bare `Change`, and the view works out `name` each time it's drawn, so a translation or a renamed entity shows straight away.

## Which stats are listed

- Only the stats named in [`changes.stats`](#changes) are listed.
- The player's stats come first, in the order the game declares them. Then each entity's stats, for every entity with stats kept in the save before or after the command.
- A stat whose [`visible`](/docs/reference/stats#statdef) condition doesn't hold after the command is left out, so the list never gives away a hidden number.
- A stat the view doesn't list (`listed: false`) is still there, since a game that draws one its own way may want its feedback too.
- What a trigger or a plugin's hook moved in the same command counts, because the comparison runs after everything else.

## When it's replaced

Any command replaces the list, with nothing in it when the command moved no stat. A `tick` that moved nothing is the exception and keeps the list as it was, so a clock ticking a [timer](/docs/reference/timers) doesn't wipe the feedback from the choice before it. A tick that does move a stat, because a timer ran out, replaces it.

The save keeps the list in [`state.changes`](/docs/reference/state#changes), so a loaded save, an undo and a [replay](/docs/reference/runner#replay) show the same feedback.

## Drawing it

`view.changes` is a list of [`ChangeView`](#changeview), ready to draw: each has its signed `text`, the `name` that says what moved when the text doesn't, and `by`, which says whether it went up or down. It's empty when the last command moved nothing. A UI usually draws them as small pills under the scene, and lets them fade.

The React UI has a ready list for it, [`Changes`](/docs/react/components#changes), which the default layout leaves out. The React tab places it after [`Scene`](/docs/react/components#scene) in a story you write. The Plain JS tab uses `runner` and `add` from the vanilla template's `src/main.ts`, whose `draw` hands each part the runner's [snapshot](/docs/reference/runner#runnersnapshot), and the Vue tab reads `view` from the vue template's `src/runner.ts` (see [Start the runner](/docs/guide/frameworks#start-the-runner)).

::include[../../../../snippets/plain/changes.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../snippets/react/changes.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../snippets/vue/Changes.vue]{meta='tab="Vue" tab-group="framework"'}

**Gotchas.**
- Nothing shows until you name some stats in `changes.stats`. A game that places `<Changes />` and tracks nothing draws no pills.
- A stat that went up and back down in one command isn't listed, since only the before and after are compared.
- An entity made or removed by the command has no change listed, because it isn't there on one side.
- A stat that a plugin's modifier moves, such as a status starting, is listed too, since the list compares what the player reads.

## See it in an example

- Small Town: `src/world/stats.ts` tracks coins, energy, charm and each character's friendship, so every choice that pays or spends coins or energy, such as buying at the café counter, leaves its change in `view.changes`.
