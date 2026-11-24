---
title: "Achievements"
description: "Achievements earned by a condition or an effect, secret ones, progress counts, and a record in the player's profile that outlives saves."
---
`@ifloom/plugin-achievements` marks things the player has done: finishing a storyline, saving up 100 coins, finding a secret. Each achievement is earned the first time its condition holds, or by an effect. Secret ones show as `???` until they're earned, and one with a target shows how close the player is, such as 4 of 10.

What a save has earned is kept in the save. Everything earned in any save is also kept in the player's [profile](/docs/reference/profile), which outlives saves and new games. The view, built by a runner with a profile, shows both, so a UI can show everything the player has ever earned.

```ts
import { achievements, achievementsOf, type AchievementDef, type ProgressDef, type AchievementsState, type AchievementsProfile, type AchievementsView, type AchievementEntry } from '@ifloom/plugin-achievements'
```

The plugin's engine side draws nothing: its React UI is a [subpath of its own](#drawing-it), and any UI can draw it. Its view lists every achievement, earned or not, and [Building UI for plugins](/docs/recipes/plugin-ui#an-achievements-page) builds an achievements page on it.

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

```ts shape
function achievements(): DefinedPlugin<AchievementsState, AchievementsView>
```

Builds the plugin, with the id `achievements`. Nothing is earned in a new game.

## Writing achievements

Achievements are content. They go in your content's [`data`](/docs/reference/loader#content) under `achievements.achievements` (the plugin's id, then [its list](/docs/reference/loader#plugin-data) of achievements) and are merged by id, so a mod can add one or replace one. These are the showcase's two:

```ts
import type { Content } from '@ifloom/engine'
import { type AchievementDef } from '@ifloom/plugin-achievements'

const nestEgg: AchievementDef = {
  id: 'nest-egg',
  name: 'Nest egg',
  description: 'Have 100 coins at once.',
  progress: { value: 'coins', target: 100 },
}

const river: AchievementDef = {
  id: 'river',
  name: 'Dusk by the river',
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

```ts shape
type AchievementDef = {
  id: string
  name: string
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
| `name` | Its name in the list, and in the notice when it's earned. |
| `description` | What it's for. |
| `image` | A picture for a UI to show, through [`artSrc`](/docs/reference/prose#artsrc). Checked by `ifloom check`. |
| `secret` | Shown as `???`, with no description, picture or progress, until it's earned. |
| `when` | Earned the first time this [condition](/docs/reference/conditions) holds after a command. |
| `progress` | A count towards it. See [`ProgressDef`](#progressdef). |

An achievement is earned:

- the first time `when` holds, if it has one
- otherwise, the first time `progress` reaches its target, if it has one
- at any time by the [`achievements/grant`](#effects) effect, so one with neither is earned only that way

### ProgressDef

A count towards an achievement, shown as a bar until it's earned.

```ts shape
type ProgressDef = { value: Amount; target: number }
```

`value` says where the count comes from. It's an [`Amount`](/docs/reference/amounts#amount), so it can be any number the game keeps:

| `value` | Reads |
|---|---|
| `'coins'` | A stat of the player's, by id. |
| `{ sum: ['coins', 'savings'] }` | A [formula](/docs/reference/stats#formula) over the player's stats, the same kind a derived stat uses. |
| `{ stat: 'friendship', of: 'character:ava' }` | One stat of an [entity](/docs/reference/entities). |
| `{ kv: 'coffees' }` | A key in the [kv store](/docs/reference/state#kv), or with `of` someone else's. One that isn't a number reads 0. |
| `{ count: 'photo' }` | How many entities of a kind there are, or a selection's, as the [`count` condition](/docs/reference/conditions#count) counts them. |
| `{ value: 'quests/updates' }` | A [value](/docs/reference/custom#values), the game's own (`game/…`) or a plugin's, asked with `with` if it has one: `{ value: 'messages/unread', with: { channel: 'texts' } }`. |

Stats read as [`statValue`](/docs/reference/stats#statvalue) reads them, so a timed status's boost counts. The view holds the count between 0 and `target`, and shows it full once the achievement is earned.

With both `when` and `progress`, `when` decides and the progress is only shown. That suits a count the player watches that isn't what earns it, such as coins saved towards a goal that a scene checks.

## When they're earned

The plugin checks every achievement not yet earned after each command that takes, in its `onCommand` [hook](/docs/reference/plugins#hooks-and-providers). Each one earned is recorded with the [turn](/docs/reference/state#turn), and raises a [notice](/docs/reference/notices) tagged `achievements` with the id `achievement.<id>` and the title `Achievement: <title>`.

A condition that holds only partway through a command, and not at its end, isn't seen.

## The profile

After every command, the plugin's [`profile`](/docs/reference/plugins#the-profile) provider adds anything newly earned to the player's profile, under the namespace `achievements`. Only a runner with a `profile` asks it, which the React UI's `mountGame` and [`browserRunner`](/docs/browser#browserrunner) both have. [`apply`](/docs/reference/commands#apply) and [`replay`](/docs/reference/runner#replay) never write to it.

### AchievementsProfile

```ts shape
type AchievementsProfile = { earned: string[] }
```

Every achievement earned in any save, in the order it was first earned. Read it with `await runner.profile?.get('achievements')`.

The plugin's view reads it as [`context.profile`](/docs/reference/plugins#the-profile), so [`runner.view()`](/docs/reference/runner#the-view-cache) shows every achievement earned in any save as earned. When an achievement is written to the profile, the runner builds a new view and tells its listeners, so the UI updates without reading the profile itself.

`view(state, game)` called without a runner has no profile, so its slice holds only what this save has earned.

## Conditions

| Content writes | Helper | Holds when |
|---|---|---|
| `{ 'achievements/earned': { achievement } }` | `achievements.earned(id)` | This save has earned the achievement. |

It reads what this save has earned, not the profile, so a replay of a save always reads the same. An unknown achievement is never earned.

## Effects

| Content writes | Helper | Does |
|---|---|---|
| `{ 'achievements/grant': { achievement } }` | `achievements.grant(id)` | Earns it now, with its notice, if this save hasn't earned it. |

It works in any effect list, a thing's use in the [inventory](/docs/plugins/inventory) included. So does a plugin's [`effectsOf`](/docs/reference/plugins#saying-what-a-command-does). Written out, it's `{ 'achievements/grant': { achievement: 'regular' } }`.

## Value

| Prose writes | Prints |
|---|---|
| `{{achievements/earned}}` | How many achievements this save has earned. |

## Strings

| Key | English |
|---|---|
| `achievements/earned` | `Achievement: {title}`, the notice's title, with the achievement's name. |
| `achievements/secret` | `???`, a secret achievement's name until it's earned. |

## The view

`runner.view().plugins.achievements` is an `AchievementsView`. With a runner that has a profile, an achievement counts as earned if this save earned it or any save did. Without one, as in `view(state, game)`, only this save's count.

Its [React UI](#drawing-it) draws it with [`AchievementList`](#achievementlist), on a page or in a dialog opened from the sidebar, and [`useAchievements`](#useachievements) gives this view with no markup.

### AchievementsView

```ts shape
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

```ts shape
type AchievementEntry = {
  id: string
  name: string
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
| `name` | Its name, or `???` while it's secret and not earned. |
| `description` | Its description, or `''` if it has none or is a secret not yet earned. |
| `image` | Its picture, through [`artSrc`](/docs/reference/prose#artsrc), or `null`. Always `null` for a secret not yet earned. |
| `earned` | Whether this save earned it, or any save did, as the profile records. |
| `earnedOn` | The turn this save earned it, or `null`. Also `null` for one earned only in another save. |
| `progress` | How far towards it, or `null` if it has no progress or is a secret not yet earned. |

## Drawing it

`view.plugins.achievements` is an [`AchievementsView`](#achievementsview): every achievement, earned or not, with progress for one that counts, and how many are earned. A secret one reads `???` until it's earned, so drawing every entry gives nothing away.

`@ifloom/plugin-achievements/react` draws the achievements, for a game drawn with [`@ifloom/react`](/docs/react). List `achievementsUi` in the game's [`plugins`](/docs/react/kit#the-plugins-option) and an [`AchievementsButton`](#achievementsbutton) goes in the side column, the title screen offers an achievements page when [pages](/docs/react/components#pages) are on, and the `achievements` panel draws the [`AchievementList`](#achievementlist). The Plain JS tab uses `runner`, `add` and `drawChoices` from the vanilla template's `src/main.ts`, whose `draw` hands each part the runner's [snapshot](/docs/reference/runner#runnersnapshot), and the Vue tab reads `view`, `snapshot` and `runner` from the vue template's `src/runner.ts` (see [Start the runner](/docs/guide/frameworks#start-the-runner)).

::include[../../../../snippets/plain/achievements.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../snippets/react/mount-achievements.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../snippets/vue/Achievements.vue]{meta='tab="Vue" tab-group="framework"'}

The React UI is yours to leave out. Draw the plugin yourself from `view.plugins.achievements`, or from [`useAchievements`](#useachievements) with your own markup, and nothing of ours is drawn: that's as much a way to use the plugin as ours. React and `@ifloom/react` are optional peers of the plugin, and a game drawn with another UI never loads this subpath.

### achievementsUi

```ts shape
const achievementsUi: PluginUi
```

The plugin's [`PluginUi`](/docs/react/kit#pluginui): an [`AchievementsButton`](#achievementsbutton) goes in the side column, the title screen offers an achievements page when [pages](/docs/react/components#pages) are on, and the `achievements` panel draws the [`AchievementList`](#achievementlist).

Its words are in `ACHIEVEMENTS_WORDS`. A game rewords any of them with `ui.<key>` in its strings, as it does the React UI's own: `{ 'ui.achievementEarned': '…' }`.

| Key | English |
|---|---|
| `ui.achievementEarned` | `Earned` |
| `ui.achievementProgress` | `{value} of {target}` |
| `ui.achievements` | `Achievements` |
| `ui.achievementsCount` | `{earned} of {total}` |
| `ui.noAchievements` | `No achievements yet.` |

### AchievementList

```tsx shape
function AchievementList(props: { className?: string; title?: string | false }): JSX.Element | null
```

Every [achievement](/docs/plugins/achievements) the game has, in the order it declares them, under a heading with how many are earned (`ui.achievements` and `ui.achievementsCount`, `1 of 3`). Each one (`data-achievement`) shows its picture, its title and its description. An earned one carries `data-earned` and an **Earned** badge (`ui.achievementEarned`). It counts as earned when this save or any other earned it, since the profile remembers it. A secret one not yet earned carries `data-secret` and shows as `???`, with no description or progress. One with [progress](/docs/plugins/achievements#progressdef) not yet earned has a bar (a `progressbar` labelled with its title) and `5 of 20` under it (`ui.achievementProgress`).

`title` replaces the heading, and `false` leaves it out, as the page and the dialog do. It draws nothing in a game without the plugin.

Replaceable as `AchievementList` in [`components`](/docs/react/components#components). Parts: `achievements`, `achievements-title`, `achievements-count`, `achievements-empty`, `achievement` (with `data-achievement`, `data-earned` and `data-secret`), `achievement-image`, `achievement-title`, `achievement-text`, `achievement-progress`, `achievement-progress-text` and `badge`.

### AchievementsButton

```tsx shape
function AchievementsButton(props: { className?: string }): JSX.Element | null
```

What the `'achievements'` part draws: a button labelled **Achievements** with the count (`1 of 3`) on a badge. With [pages](/docs/react/components#pages) on, it goes to the [`AchievementsPage`](#achievementspage). Without them, or when the game leaves the achievements page out (`{ ...achievementsUi, pages: undefined }`), it opens an [`AchievementList`](#achievementlist) in a [`Dialog`](/docs/react/components#dialog). Opening it sends no command. It draws nothing in a game without the plugin.

Replaceable as `AchievementsButton` in [`components`](/docs/react/components#components). Parts: `achievements-button`, `badge`, and for its dialog `dialog`, `dialog-overlay`, `dialog-title` and `dialog-close`.

### AchievementsPage

```tsx shape
function AchievementsPage(props: { className?: string }): JSX.Element
```

The `achievements` page, among the [pages](/docs/react/components#pages) around the game: a heading (`ui.achievements`), the [`AchievementList`](#achievementlist), and a **Back** button. The title screen has a button for it when the game lists `achievementsUi`. On the title screen the progress counts come from whatever state the runner holds, and what's earned comes from the profile too, so it's right before a game starts. The section carries `data-page="achievements"`.

Replaceable as `AchievementsPage` in [`components`](/docs/react/components#components), or by a page of your own with the id `achievements` in [`PagesOptions.pages`](/docs/react/components#pagesoptions). Parts: `achievements-page`, `page-heading` and `page-back`.

### useAchievements

```ts shape
function useAchievements(): AchievementsView | null
```

The achievements plugin's view ([`AchievementsView`](/docs/plugins/achievements#achievementsview): `achievements`, `earned` and `total`), or `null` in a game without the plugin. [`AchievementList`](#achievementlist) and the button are drawn from it.

::include[../../../../snippets/react/use-achievements.tsx]

## The state

### AchievementsState

```ts shape
type AchievementsState = { earned: Record<string, number> }
```

What the plugin keeps in a save, at `state.plugins.achievements`: each achievement this save has earned, with the turn. A save from before the plugin was added loads with nothing earned, and earns what it qualifies for after its next command.

## For code

### Helpers

```ts shape
const achievements: {
  (): DefinedPlugin<AchievementsState, AchievementsView>
  earned(id: string): Condition
  grant(id: string): EffectRef
}
```

### achievementsOf

```ts shape
function achievementsOf(game: Game): AchievementDef[]
```

The game's achievements, merged from its content and packs: `game.data.achievements.achievements`.

### Reading the view yourself

The plugin's view is at `view.plugins.achievements`, typed as an `AchievementsView` once your game imports the plugin, since the plugin declares it in [`ViewRegistry`](/docs/reference/plugins#typed-calls-queries-and-views). For a state the runner isn't playing, such as a save's preview, build its view with the profile's `achievements` namespace, an [`AchievementsProfile`](#achievementsprofile), so what was earned in other saves shows as earned:

```ts
import { view, type Game, type GameState, type Runner } from '@ifloom/engine'
import '@ifloom/plugin-achievements'

declare const runner: Runner
declare const game: Game
declare const state: GameState

const stored = await runner.profile?.get('achievements')
const ever = view(state, game, { profile: { achievements: stored } }).plugins.achievements
```

Each achievement the profile holds shows as earned, with `earnedOn` `null` unless this save earned it too. For the current game, read `runner.view()`.

To read a progress value yourself, use [`amountOf`](/docs/reference/amounts#amountof): `amountOf(state, game, def.progress.value)`.

## Checks

When the game loads, the plugin reports these problems against the content or pack each achievement came from, with `where` as `achievements <id>`:

- Anything `when` names that the game doesn't have (`when: unknown kind "…"`).
- A progress value naming a stat, kv owner or value the game doesn't have (`progress: unknown stat "…"`), or one that isn't an amount.
- A progress target of 0 or less (`progress target must be more than 0`).
- A missing `image` file, when `ifloom check` looks for files.

A call that names an achievement the game doesn't have gives `unknown achievement "…"` where it's written.

## Gotchas

- **Earned after the command, not during it.** A trigger that asks `achievements.earned` on the same command sees it on the next one.
- **Earned stays earned.** Nothing takes an achievement back, even if its condition stops holding.
- **`seen` counts a scene as soon as it's on screen.** An achievement with `when: { seen: 'ava.river' }` is earned when the scene opens, not when the player leaves it.
- **A new game starts with nothing earned in its save.** The runner's view still shows everything from the profile, but `achievements.earned` and `{{achievements/earned}}` read this save only.

## See it in an example

Small Town: `nest-egg` in [`examples/showcase/src/world/achievements.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/world/achievements.ts) is a progress count of coins out of 100, and `river` in [`examples/showcase/src/story/ava.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/ava.ts) is a secret one earned by a condition. With pages on, the title screen and the sidebar's Achievements button open the React UI's achievements page.
