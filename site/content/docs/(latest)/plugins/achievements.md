---
title: "Achievements"
description: "Achievements earned by a condition or an effect, secret ones, progress counts, and a record in the player's profile that outlives saves."
---
`@ifloom/plugin-achievements` marks things the player has done: finishing a storyline, saving up 100 coins, finding a secret. Each achievement is earned the first time its condition holds, or by an effect. Secret ones show as `???` until they're earned, and one with a target shows how close the player is, such as 4 of 10.

What a save has earned is kept in the save. Everything earned in any save is also kept in the player's [profile](/docs/reference/profile), which outlives saves and new games. The view, built by a runner with a profile, shows both, so a UI can show everything the player has ever earned.

```ts
import {
  achievements, achievementEarned, grantAchievement,
  achievementDefs, achievementsView, progressValue,
  type AchievementDef, type ProgressDef, type ProgressValue,
  type AchievementsState, type AchievementsProfile,
  type AchievementsView, type AchievementEntry,
} from '@ifloom/plugin-achievements'
```

The plugin has no UI of its own. Its view lists every achievement, earned or not, and [Building UI for plugins](/docs/recipes/plugin-ui#an-achievements-page) builds an achievements page on it.

## Install

List the package in your game's `package.json`, beside the engine:

```json
{
  "dependencies": {
    "@ifloom/engine": "^0.0.0",
    "@ifloom/plugin-achievements": "^0.0.0"
  }
}
```

Then add `achievements()` to the game's `plugins`. [Adding one](/docs/plugins#adding-one) has the details. The plugin works on its own and cooperates with no other. Its conditions can use any plugin's conditions, which need their plugin in the game.

## achievements

```ts
function achievements(): DefinedPlugin<AchievementsState, AchievementsView>
```

Builds the plugin, with the id `achievements`. Nothing is earned in a new game.

## Writing achievements

Achievements are content. They go in your content's [`data`](/docs/reference/loader#content) under `achievements.achievements`, and are merged by id, so a mod can add one or replace one. These are the showcase's two:

```ts
import type { Content } from '@ifloom/engine'
import { type AchievementDef } from '@ifloom/plugin-achievements'

const nestEgg: AchievementDef = {
  id: 'nest-egg',
  title: 'Nest egg',
  description: 'Have 100 coins at once.',
  progress: { value: 'coins', target: 100 },
}

const river: AchievementDef = {
  id: 'river',
  title: 'Dusk by the river',
  description: 'Spend an evening by the river with Ava.',
  secret: true,
  when: { seen: 'ava.river' },
}

const town: Content = {
  stats: [{ id: 'coins', label: 'Coins', start: 12, max: 999 }],
  data: { achievements: { achievements: [nestEgg, river] } },
}
```

### AchievementDef

```ts
type AchievementDef = {
  id: string
  title: string
  description?: string
  image?: string
  secret?: boolean
  when?: Condition
  progress?: ProgressDef
}
```

| Field | What it is |
|---|---|
| `id` | Unique among achievements. Content names it by this. |
| `title` | Its name in the list, and in the notice when it's earned. |
| `description` | What it's for. |
| `image` | A picture for a UI to show, through [`artSrc`](/docs/reference/prose#artsrc). Checked by `ifloom check`. |
| `secret` | Shown as `???`, with no description, picture or progress, until it's earned. |
| `when` | Earned the first time this [condition](/docs/reference/conditions) holds after a command. |
| `progress` | A count towards it. See [Progress](#progress). |

An achievement is earned:

- the first time `when` holds, if it has one
- otherwise, the first time `progress` reaches its target, if it has one
- at any time by the [`achievements/grant`](#effects) effect, so one with neither is earned only that way

### Progress

```ts
type ProgressDef = { value: ProgressValue; target: number }
type ProgressValue = Formula | { stat: string; of?: string } | { kv: string } | ValueRef
```

`value` says where the count comes from:

| `value` | Reads |
|---|---|
| `'coins'` | A stat of the player's, by id. |
| `{ sum: ['coins', 'savings'] }` | A [formula](/docs/reference/stats#formula) over the player's stats, the same kind a derived stat uses. |
| `{ stat: 'friendship', of: 'character:ava' }` | One stat of an [entity](/docs/reference/entities). |
| `{ kv: 'coffees' }` | A key in the [kv store](/docs/reference/state#kv). One that isn't a number reads 0. |
| `{ value: 'quests/updates' }` | A [custom value](/docs/reference/custom#values), the game's or a plugin's, asked with `with` if it has one: `{ value: 'messages/unread', with: { channel: 'texts' } }`. |

Stats read as [`statValue`](/docs/reference/stats#statvalue) reads them, so a timed status's boost counts. The view holds the count between 0 and `target`, and shows it full once the achievement is earned.

With both `when` and `progress`, `when` decides and the progress is only shown. That suits a count the player watches that isn't what earns it, such as coins saved towards a goal that a scene checks.

## When they're earned

The plugin checks every achievement not yet earned after each command that takes, in its `onCommand` [hook](/docs/reference/plugins#hooks-and-providers). Each one earned is recorded with the [turn](/docs/reference/state#turn), and raises a [notice](/docs/reference/notices) tagged `achievements` with the id `achievement.<id>` and the title `Achievement: <title>`.

A condition that holds only partway through a command, and not at its end, isn't seen.

## The profile

After every command, the plugin's [`profile`](/docs/reference/plugins#the-profile) provider adds anything newly earned to the player's profile, under the namespace `achievements`. Only a runner with a `profile` asks it, which the React UI's `mountGame` and [`browserRunner`](/docs/reference/runner#browserrunner) both have. [`apply`](/docs/reference/commands#apply) and [`replay`](/docs/reference/runner#replay) never write to it.

### AchievementsProfile

```ts
type AchievementsProfile = { earned: string[] }
```

Every achievement earned in any save, in the order it was first earned. Read it with `await runner.profile?.get('achievements')`.

The plugin's view reads it as [`context.profile`](/docs/reference/plugins#the-profile), so [`runner.view()`](/docs/reference/runner#the-view-cache) shows every achievement earned in any save as earned. When an achievement is written to the profile, the runner builds a new view and tells its listeners, so the UI updates without reading the profile itself.

`view(state, game)` called without a runner has no profile, so its slice holds only what this save has earned.

## Conditions

| Content writes | Helper | Holds when |
|---|---|---|
| `{ 'achievements/earned': { achievement } }` | `achievementEarned(id)` | This save has earned the achievement. |

It reads what this save has earned, not the profile, so a replay of a save always reads the same. An unknown achievement is never earned.

## Effects

| Content writes | Helper | Does |
|---|---|---|
| `{ 'achievements/grant': { achievement } }` | `grantAchievement(id)` | Earns it now, with its notice, if this save hasn't earned it. |

It works in any effect list, an item's use included. In a plugin's [`effectsOf`](/docs/reference/plugins#saying-what-a-command-does), which lists plain effects, write the long form, `{ kind: 'custom', name: 'achievements/grant', with: { achievement: 'regular' } }`.

## Value

| Prose writes | Prints |
|---|---|
| `{{v:achievements/earned}}` | How many achievements this save has earned. |

## Strings

| Key | English |
|---|---|
| `achievements/earned` | `Achievement: {title}`, the notice's title. |
| `achievements/secret` | `???`, a secret achievement's title until it's earned. |

## The view

`runner.view().plugins.achievements` is an `AchievementsView`. With a runner that has a profile, an achievement counts as earned if this save earned it or any save did. Without one, as in `view(state, game)`, only this save's count.

The [React UI](/docs/react) draws it with [`AchievementList`](/docs/react/components#achievementlist), on a page or in a dialog opened from the sidebar, and [`useAchievements`](/docs/react/components#useachievements) gives this view with no markup.

### AchievementsView

```ts
type AchievementsView = {
  achievements: AchievementEntry[]
  earned: number
  total: number
}
```

| Field | What it is |
|---|---|
| `achievements` | Every achievement, earned or not, in the order the game declares them. |
| `earned` | How many are earned, in this save or, through the runner's profile, in any. |
| `total` | How many there are, secret ones included. |

### AchievementEntry

```ts
type AchievementEntry = {
  id: string
  title: string
  description: string
  image: string | null
  secret: boolean
  earned: boolean
  earnedOn: number | null
  progress: { value: number; target: number } | null
}
```

| Field | What it is |
|---|---|
| `title` | Its title, or `???` while it's secret and not earned. |
| `description` | Its description, or `''` if it has none or is a secret not yet earned. |
| `image` | Its picture as written, or `null`. Always `null` for a secret not yet earned. |
| `earned` | Whether this save earned it, or any save did, as the profile records. |
| `earnedOn` | The turn this save earned it, or `null`. Also `null` for one earned only in another save. |
| `progress` | How far towards it, or `null` if it has no progress or is a secret not yet earned. |

## The state

### AchievementsState

```ts
type AchievementsState = { earned: Record<string, number> }
```

What the plugin keeps in a save, at `state.plugins.achievements`: each achievement this save has earned, with the turn. A save from before the plugin was added loads with nothing earned, and earns what it qualifies for after its next command.

## For code

### Helpers

```ts
const achievementEarned: (id: string) => Condition
const grantAchievement: (id: string) => EffectRef
```

### achievementDefs

```ts
function achievementDefs(game: Game): AchievementDef[]
```

The game's achievements, merged from its content and packs: `game.data.achievements.achievements`.

### achievementsView

```ts
function achievementsView(record: AchievementsState, state: GameState, game: Game, stored?: unknown): AchievementsView
```

The `AchievementsView` for a record. It needs the state to read progress. `stored` is what the profile's `achievements` namespace holds, an [`AchievementsProfile`](#achievementsprofile). Each achievement in it shows as earned, with `earnedOn` `null` unless this save earned it too. The plugin's view is `achievementsView(slice, state, game, context.profile)`.

```ts
import type { Game, GameState, Runner } from '@ifloom/engine'
import { achievements, achievementsView } from '@ifloom/plugin-achievements'

declare const runner: Runner
declare const game: Game
declare const state: GameState

const plugin = achievements()
const stored = await runner.profile?.get('achievements')
const ever = achievementsView(plugin.read(state, game), state, game, stored)
```

You need it only for a state the runner isn't playing, such as a save's preview. For the current game, read `runner.view()`.

### progressValue

```ts
function progressValue(value: ProgressValue, state: GameState, game: Game): number
```

A progress value read now. Anything that isn't a finite number reads 0.

## Checks

When the game loads, the plugin reports these problems against the content or pack each achievement came from, with `where` as `achievements <id>`:

- Anything `when` names that the game doesn't have (`when: unknown item "…"`).
- A progress value naming a stat or custom value the game doesn't have (`progress: unknown stat "…"`).
- A progress target of 0 or less (`progress target must be more than 0`).
- A missing `image` file, when `ifloom check` looks for files.

A call that names an achievement the game doesn't have gives `unknown achievement "…"` where it's written.

## Gotchas

- **Earned after the command, not during it.** A trigger that asks `achievementEarned` on the same command sees it on the next one.
- **Earned stays earned.** Nothing takes an achievement back, even if its condition stops holding.
- **`seen` counts a scene as soon as it's on screen.** An achievement with `when: { seen: 'ava.river' }` is earned when the scene opens, not when the player leaves it.
- **A new game starts with nothing earned in its save.** The runner's view still shows everything from the profile, but `achievementEarned` and `{{v:achievements/earned}}` read this save only.

## See it in an example

Small Town: `nest-egg` in [`examples/showcase/src/world/achievements.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/world/achievements.ts) is a progress count of coins out of 100, and `river` in [`examples/showcase/src/story/ava.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/ava.ts) is a secret one earned by a condition. With pages on, the title screen and the sidebar's Achievements button open the React UI's achievements page.
