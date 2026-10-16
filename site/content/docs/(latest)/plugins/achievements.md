---
title: "Achievements"
description: "Achievements earned by a condition or an effect, secret ones, progress counts, and a record in the player's profile that outlives saves."
---
`@ifloom/plugin-achievements` marks things the player has done: finishing a storyline, saving up 100 coins, finding a secret. Each achievement is earned the first time its condition holds, or by an effect. Secret ones show as `???` until they're earned, and one with a target shows how close the player is, such as 4 of 10.

What a save has earned is kept in the save. Everything earned in any save is also kept in the player's [profile](/docs/reference/profile), which outlives saves and new games, so a UI can show what the player has ever earned.

```ts
import {
  achievements, achievementEarned, grantAchievement,
  achievementDefs, achievementsView, withProfile, progressValue,
  type AchievementDef, type ProgressDef, type ProgressValue,
  type AchievementsState, type AchievementsProfile,
  type AchievementsView, type AchievementEntry,
} from '@ifloom/plugin-achievements'
```

The plugin has no UI of its own. Its view lists every achievement, earned or not, and [Building UI for plugins](/docs/guide/plugin-ui#an-achievements-page) builds an achievements page on it.

## Install

List the package in your game's `package.json`, beside the engine:

```json
{
  "dependencies": {
    "@ifloom/engine": "0.0.0",
    "@ifloom/plugin-achievements": "0.0.0"
  }
}
```

Then add `achievements()` to the game's `plugins`. [Adding one](/docs/plugins#adding-one) has the details. The plugin works on its own and cooperates with no other. Its conditions can use any plugin's conditions, which need their plugin in the game.

## achievements

```ts
function achievements(): DefinedPlugin<AchievementsState>
```

Builds the plugin, with the id `achievements`. Nothing is earned in a new game.

## Writing achievements

Achievements are content. They go in a pack's [`data`](/docs/reference/loader#pack) under `achievements.achievements`, and are merged by id, so a mod can add one or replace one. These are the showcase's two:

```ts
import { SCHEMA, type Pack } from '@ifloom/engine'
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

const town: Pack = {
  id: 'town',
  schema: SCHEMA,
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

- the first time `when` holds, if it has one;
- otherwise, the first time `progress` reaches its target, if it has one;
- and always by the [`achievements/grant`](#effects) effect, so one with neither is earned only that way.

### Progress

```ts
type ProgressDef = { value: ProgressValue; target: number }
type ProgressValue = Formula | { stat: string; of?: string } | { flag: string } | { value: string }
```

`value` says where the count comes from:

| `value` | Reads |
|---|---|
| `'coins'` | A stat of the player's, by id. |
| `{ sum: ['coins', 'savings'] }` | A [formula](/docs/reference/stats#formula) over the player's stats, the same kind a derived stat uses. |
| `{ stat: 'friendship', of: 'character:ava' }` | One stat of an [entity](/docs/reference/entities). |
| `{ flag: 'coffees' }` | A [variable](/docs/reference/state#flags). One that isn't a number reads 0. |
| `{ value: 'quests/updates' }` | A [custom value](/docs/reference/custom), the game's or a plugin's. |

Stats read as [`statValue`](/docs/reference/stats#statvalue) reads them, so a timed effect's boost counts. The view holds the count between 0 and `target`, and shows it full once the achievement is earned.

With both `when` and `progress`, `when` decides and the progress is only shown. That suits a count the player watches that isn't what earns it, such as coins saved towards a goal that a scene checks.

## When they're earned

The plugin checks every achievement not yet earned after each command that takes, in its `after` [hook](/docs/reference/plugins#hooks). Each one earned is recorded with the [turn](/docs/reference/state#turn), and raises a [notice](/docs/reference/notices) tagged `achievements` with the id `achievement.<id>` and the title `Achievement: <title>`.

A condition that holds only partway through a command, and not at its end, isn't seen.

## The profile

After every command, the plugin's `profile.onCommand` adds anything newly earned to the player's profile, under the namespace `achievements`. Only a runner with a `profile` calls it, which the React UI's `mountGame` and [`browserRunner`](/docs/reference/runner#browserrunner) both have. [`apply`](/docs/reference/commands#apply) and [`replay`](/docs/reference/runner#replay) never write to it.

### AchievementsProfile

```ts
type AchievementsProfile = { earned: string[] }
```

Every achievement earned in any save, in the order it was first earned. Read it with `await runner.profile?.get('achievements')`.

A plugin's view can't read the profile, because the profile is read asynchronously and the view is built from the state alone. So the view shows what this save has earned, and [`withProfile`](#withprofile) adds what the profile holds.

## Conditions

| Content writes | Helper | Holds when |
|---|---|---|
| `{ custom: 'achievements/earned', with: { id } }` | `achievementEarned(id)` | This save has earned the achievement. |

It reads what this save has earned, not the profile, so a replay of a save always reads the same. An unknown achievement is never earned.

## Effects

| Content writes | Helper | Does |
|---|---|---|
| `{ custom: 'achievements/grant', with: { id } }` | `grantAchievement(id)` | Earns it now, with its notice, if this save hasn't earned it. |

In a plain-effect list (an item's use, or what `rules.turn` returns), write the long form, `{ kind: 'custom', name: 'achievements/grant', with: { id } }`.

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

`view(state, game).plugins.achievements` is an `AchievementsView`.

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
| `earned` | How many are earned. |
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

The game's achievements, merged from its packs: `game.data.achievements.achievements`.

### achievementsView

```ts
function achievementsView(record: AchievementsState, state: GameState, game: Game): AchievementsView
```

The `AchievementsView` for a record. The plugin's view is `achievementsView(slice, state, game)`. It needs the state to read progress.

### withProfile

```ts
function withProfile(view: AchievementsView, stored: unknown, state: GameState, game: Game): AchievementsView
```

The view with every achievement the profile holds shown as earned, with its title, description and progress. Pass what `runner.profile.get('achievements')` gives. With nothing stored, it returns the view as it is.

```ts
import { type Game, type Runner } from '@ifloom/engine'
import { withProfile, type AchievementsView } from '@ifloom/plugin-achievements'

declare const runner: Runner
declare const game: Game

const stored = await runner.profile?.get('achievements')
const ever = withProfile(runner.view().plugins.achievements as AchievementsView, stored, runner.state, game)
```

### progressValue

```ts
function progressValue(value: ProgressValue, state: GameState, game: Game): number
```

A progress value read now. Anything that isn't a finite number reads 0.

## Checks

When the game loads, the plugin reports these problems against the pack each achievement came from, with `where` as `achievements <id>`:

- Anything `when` names that the game doesn't have (`when: unknown item "…"`).
- A progress value naming a stat or custom value the game doesn't have (`progress: unknown stat "…"`).
- A progress target of 0 or less (`progress target must be more than 0`).
- A missing `image` file, when `ifloom check` looks for files.

A call that names an achievement the game doesn't have gives `unknown achievement "…"` where it's written.

## Gotchas

- **Earned after the command, not during it.** A trigger that asks `achievementEarned` on the same command sees it on the next one.
- **Earned stays earned.** Nothing takes an achievement back, even if its condition stops holding.
- **`seen` counts a scene as soon as it's on screen.** An achievement with `when: { seen: 'ava.river' }` is earned when the scene opens, not when the player leaves it.
- **A new game starts with nothing earned in its save.** The profile still has everything, which is what `withProfile` is for.
