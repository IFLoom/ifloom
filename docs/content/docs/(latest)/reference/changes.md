---
title: "Changes"
description: "Reference for ChangesDef, Change and ChangeView: the tracked stats the last command moved, the player's and those kept on entities, listed in view.changes for feedback such as a +3 coins pill."
---
After each command the engine compares the stats your content tracks in `changes`, before and after, and lists what moved in `view.changes`. A UI shows it as feedback after a choice, such as `+3 coins` or `+4 Ava`, without working out the difference itself.

In the showcase: `examples/showcase/src/world/stats.ts`, which tracks coins, energy, charm and each character's friendship.

```ts
import type { Change, ChangesDef, ChangeView } from '@ifloom/engine'
```

## ChangesDef

The stats whose changes the view lists, the `changes` key of content and packs. Every field is in [`ChangesDef`](/docs/api/engine#changesdef).

`stats` lists stat ids. An entity stat's id, one declared with [`of`](/docs/reference/stats#of), covers that stat on every entity, so `friendship` tracks Ava's and Sam's alike. Every content file's and pack's lists are added together, so a mod can track a stat it adds without repeating yours. With no stat named anywhere, `view.changes` is always empty.

The engine lists the changes in this way:

- The player's stats come first, in the order the game declares them, then each entity's, for every entity with stats in the save before or after the command.
- A stat whose [`visible`](/docs/reference/stats#statdef) condition doesn't hold after the command is left out, so the list never gives away a hidden number.
- A stat with `listed: false` is still listed here, for a UI that renders that stat its own way.
- The comparison runs after the triggers and plugins' hooks, so what they moved in the same command counts.

```ts
import type { Content } from '@ifloom/engine'

export const stats: Content = {
  stats: [
    { id: 'coins', label: 'Coins', start: 12, max: 999, format: { one: '{n} coin', other: '{n} coins' } },
    { id: 'energy', label: 'Energy', start: 80, format: '{n}%' },
    { id: 'friendship', label: 'Friendship', of: 'character' },
  ],
  changes: { stats: ['coins', 'energy', 'friendship'] },
}
```

## State

### Change

One tracked stat the last command moved, as the save keeps it in [`state.changes`](/docs/reference/state#changes). Every field is in [`Change`](/docs/api/engine#change).

`from` and `to` are the stat as [`statValue`](/docs/reference/stats#statvalue) reads it before and after, with derived stats worked out and modifiers and rounding applied. `by` is `to - from`. `text` is the change in the stat's own [`format`](/docs/reference/stats#statwords) with a sign, such as `+3 coins`, `-1 coin` or `-5%`, and the bare signed number when the stat has no format. `of` names the entity for a stat kept on one, and is left out for the player's.

Every command replaces the list, with an empty one when it moved no tracked stat. A `tick` that moved nothing keeps the list as it was, so a clock ticking a [timer](/docs/reference/timers) doesn't wipe the feedback from the choice before it. Because the save keeps the list, a loaded save, an undo and a [replay](/docs/reference/runner#replay) show the same feedback.

## View

### ChangeView

A [`Change`](#change) with the words to show after its `text`, as [`view.changes`](/docs/reference/changes#view) lists it. Every field is in [`ChangeView`](/docs/api/engine#changeview).

`name` says what moved when `text` doesn't:

| Field | Meaning |
|---|---|
| `name` for an entity's stat | The entity's name, such as `Ava`, as the view names entities for this save. |
| `name` for the player's stat | The stat's `label`, such as `Energy`, when its format has no words besides the number, such as `{n}%`, or it has no format. |
| no `name` | The stat's format already says it in words, such as `{n} coins`. |

So `+3 coins`, `-1 Energy` and `+4 Ava` are each a change's `text` followed by its `name`. The view works out `name` each time it renders, so a translation or a renamed entity shows at once. To render the list, see [Render what changed](/docs/how-to/render/stats-and-things#render-what-changed).

## Checks

The [content checker](/docs/reference/checks) reports an id in `changes.stats` that is no stat, as `stats names "cions", which is no stat`.

## Caveats

- Nothing is listed until content names some stats in `changes.stats`. A UI that renders `view.changes` in a game that tracks nothing shows no pills.
- A stat that went up and back down in one command isn't listed, since the engine compares only the before and after.
- An entity made or removed by the command has no change listed, because it isn't there on one side.
- A stat that a plugin's modifier moves, such as a status starting, is listed, since the list compares what the player reads.
