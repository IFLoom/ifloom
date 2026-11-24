---
title: "Achievements"
description: "Reference for @ifloom/plugin-achievements: achievements earned by a condition, progress or an effect, secret ones, the earned condition, the grant effect, the earned value, the profile record, state, view, React UI, helpers, checks and strings."
---
`@ifloom/plugin-achievements` marks things the player has done, such as finishing a storyline, saving up 100 coins or finding a secret. The player earns each achievement the first time its condition holds, when its progress reaches its target, or through an effect. A secret one shows as `???` until it's earned. The save keeps what it has earned, and the player's [profile](/docs/reference/profile), which outlives saves, keeps everything earned in any save. Achievements needs no other plugin and cooperates with none, and its conditions can use any plugin's conditions. [Add a plugin](/docs/how-to/add-a-plugin) installs it.

In the showcase: `examples/showcase/src/world/achievements.ts`, whose `nest-egg` counts coins towards 100, and `examples/showcase/src/story/ava.ts`, whose secret `river` is earned by seeing a scene.

```ts
import {
  achievements,
  achievementsOf,
  type AchievementDef,
  type AchievementEntry,
  type AchievementsProfile,
  type AchievementsState,
  type AchievementsView,
  type ProgressDef,
} from '@ifloom/plugin-achievements'
```

## achievements

The plugin's factory, which returns the plugin with the id `achievements`. It takes no options. Every field of its result is in [`achievements`](/docs/api/plugin-achievements#achievements), and its helpers are listed under [Functions](#functions).

Nothing is earned in a new game. After each command that goes through, the plugin's [`onCommand`](/docs/reference/plugin-api#oncommand) hook checks every achievement not yet earned and records each one earned with the [turn](/docs/reference/state#turn). Each one raises a [notice](/docs/reference/notices) with the id `achievement.<id>`, the tag `achievements` and the title `Achievement: <name>`. Then the plugin's [`profile`](/docs/reference/plugin-api#profile) provider adds what's newly earned to the profile.

```ts
import { loadGame, type Content } from '@ifloom/engine'
import { achievements } from '@ifloom/plugin-achievements'

declare const town: Content

export const { game } = loadGame([town], { id: 'small-town', title: 'Small Town', plugins: [achievements()] })
```

## Content

### AchievementDef

An achievement the game declares in `data.achievements.achievements`. Every field is in [`AchievementDef`](/docs/api/plugin-achievements#achievementdef).

The loader merges achievements by id, so a mod adds one or replaces one whole. The player earns an achievement in one of three ways:

- The first time `when` holds after a command, if it has a `when`.
- Otherwise, the first time `progress` reaches its target, if it has a `progress`.
- At any time through the [`achievements/grant`](#achievementsgrant) effect, so one with neither is earned only that way.

A `secret` achievement shows as `???`, with no description, picture or progress, until it's earned. `image` goes through [`artSrc`](/docs/reference/prose#artsrc), and `ifloom check` looks for its file.

```ts
import type { Content } from '@ifloom/engine'
import type { AchievementDef } from '@ifloom/plugin-achievements'

const nestEgg: AchievementDef = { id: 'nest-egg', name: 'Nest egg', description: 'Have 100 coins at once.', progress: { value: 'coins', target: 100 } }

const river: AchievementDef = {
  id: 'river',
  name: 'Dusk by the river',
  description: 'Spend an evening by the river with Ava.',
  secret: true,
  when: { seen: 'ava.river' },
}

export const town: Content = {
  stats: [{ id: 'coins', label: 'Coins', start: 12, max: 999 }],
  data: { achievements: { achievements: [nestEgg, river] } },
}
```

### ProgressDef

A count towards an achievement, an achievement's `progress`, shown as a bar until it's earned. Every field is in [`ProgressDef`](/docs/api/plugin-achievements#progressdef).

`value` is an [`Amount`](/docs/reference/amounts#amount), so it reads any number the game keeps: a stat by id (`'coins'`), an entity's stat (`{ stat: 'friendship', of: 'character:ava' }`), a kv key (`{ kv: 'coffees' }`), a count (`{ count: 'photo' }`), a value (`{ value: 'quests/updates' }`) or a formula of them. It reads stats as [`statValue`](/docs/reference/stats#statvalue) does, so a timed status's boost counts. `target` must be more than 0.

With both `when` and `progress`, `when` decides and the progress is only shown. That suits a count the player watches that isn't what earns the achievement, such as coins saved towards a goal that a scene checks.

## Conditions

### achievements/earned

Holds when this save has earned the achievement. It reads the save, never the profile, so a replay of a save always reads the same. An achievement the game doesn't have is never earned. It's a [plugin call](/docs/reference/custom#plugincall), and works anywhere a condition goes.

```ts fragment
{ 'achievements/earned': { achievement: 'river' } } // achievements.earned('river')
```

## Effects

### achievements/grant

Earns the achievement now, with its notice, unless this save has earned it. An achievement the game doesn't have does nothing. It works in any effect list, such as a choice's, an action's or a thing's use in the [inventory](/docs/reference/plugins/inventory).

```ts fragment
{ 'achievements/grant': { achievement: 'regular' } } // achievements.grant('regular')
```

## Values

Prose prints this as a token.

| Key | Meaning |
|---|---|
| `{{achievements/earned}}` | The number of achievements this save has earned. |

## State

### AchievementsState

The achievements a save keeps at `state.plugins.achievements`, each id this save has earned with the turn it was earned. Every field is in [`AchievementsState`](/docs/api/plugin-achievements#achievementsstate).

The save keeps no achievement's name or condition, which the plugin reads from content. A save made before the game had the plugin loads with nothing earned, and earns what it qualifies for after its next command. A UI reads [`AchievementsView`](#achievementsview) instead.

### AchievementsProfile

The achievements the player's profile keeps under the namespace `achievements`: the id of every achievement earned in any save, in the order each was first earned. Every field is in [`AchievementsProfile`](/docs/api/plugin-achievements#achievementsprofile).

Only a runner with a `profile` asks the plugin's provider, and the React UI's `mountGame` and [`browserRunner`](/docs/reference/browser#browserrunner) both have one. [`apply`](/docs/reference/commands#apply) and [`replay`](/docs/reference/runner#replay) never write to it. A game reads it with `await runner.profile?.get('achievements')`.

## View

### AchievementsView

The achievements as the player sees them, in `view.plugins.achievements`. Every field is in [`AchievementsView`](/docs/api/plugin-achievements#achievementsview).

`achievements` lists every achievement, earned or not, in the order the game declares them. `total` counts them all, secret ones included, and `earned` counts those earned. The plugin's view reads the profile from its context, so the [runner's view](/docs/reference/runner#view) counts an achievement as earned when this save or any other earned it. When the runner writes a new achievement to the profile, it builds a new view and tells its listeners. A view built with [`view(state, game)`](/docs/reference/view#view-1) has no profile, so it counts only this save's.

A preview of a state the runner isn't playing, such as a save's, passes the profile's `achievements` namespace to `view`, so achievements earned in other saves show as earned:

```ts
import { view, type Game, type GameState, type Runner } from '@ifloom/engine'
import '@ifloom/plugin-achievements'

declare const runner: Runner
declare const game: Game
declare const state: GameState

const stored = await runner.profile?.get('achievements')
export const ever = view(state, game, { profile: { achievements: stored } }).plugins.achievements
```

### AchievementEntry

One achievement, an entry of `achievements`. Every field is in [`AchievementEntry`](/docs/api/plugin-achievements#achievemententry).

A secret achievement not yet earned has the name `???` (the `achievements/secret` string), an empty `description`, and `null` for `image` and `progress`. `earned` is `true` when this save or, through the profile, any save earned it. `earnedOn` is the turn this save earned it, and `null` for one earned only in another save. `progress` holds `value` and `target`, with `value` held between 0 and `target`, and full once the achievement is earned.

[Render an achievements page](/docs/how-to/render/progress-plugins#render-an-achievements-page) renders this view in Plain JS, React and Vue.

## React UI

The React UI is optional: the `@ifloom/plugin-achievements/react` subpath renders the achievements for a game that uses [`@ifloom/react`](/docs/reference/react), and a game rendered another way never loads it. [Show plugins in the React UI](/docs/how-to/react/show-plugin-uis) adds it to a game.

### achievementsUi

The plugin's [`PluginUi`](/docs/reference/react/kit#pluginui), listed in `mountGame`'s `plugins`. It puts [`AchievementsButton`](#achievementsbutton) in the side column, adds the `achievements` page with a button on the title screen when [pages](/docs/reference/react/components#pages) are on, and renders [`AchievementList`](#achievementlist) as the `achievements` panel. Its type is in [`achievementsUi`](/docs/api/plugin-achievements#achievementsui).

A game that keeps the list in a dialog with pages on leaves the page out with `{ ...achievementsUi, pages: undefined }`.

### ACHIEVEMENTS_WORDS

The words the achievements UI uses, by key, which a game rewords as `ui.<key>` in its strings as it does the React UI's own. Its value is in [`ACHIEVEMENTS_WORDS`](/docs/api/plugin-achievements#achievements_words).

| Key | Meaning |
|---|---|
| `ui.achievementEarned` | `Earned`, the badge on an earned achievement. |
| `ui.achievementProgress` | `{value} of {target}`, the line under a progress bar. |
| `ui.achievements` | `Achievements`, the title of the list, its page, its dialog and its button. |
| `ui.achievementsCount` | `{earned} of {total}`, the count of achievements earned. |
| `ui.noAchievements` | `No achievements yet.`, the line for a game with none to show. |

### AchievementList

Renders `view.plugins.achievements` under a heading with the count earned. Each achievement shows its picture, its name and its description, and an earned one has an **Earned** badge. Its props are in [`AchievementList`](/docs/api/plugin-achievements#achievementlist).

A secret achievement not yet earned shows as `???`. One with progress not yet earned has a bar, a `progressbar` labelled with its name, and `5 of 20` under it. `title` replaces the heading, and `false` leaves it out, as the page and the dialog do. It renders nothing in a game without the plugin. A game replaces it as `AchievementList` in [`components`](/docs/reference/react/components#components). Its parts are `achievements`, `achievements-title`, `achievements-count`, `achievements-empty`, `achievement` (with `data-achievement`, `data-earned` and `data-secret`), `achievement-image`, `achievement-title`, `achievement-text`, `achievement-progress`, `achievement-progress-text` and `badge`.

### AchievementsButton

Renders a button labelled **Achievements** with the count earned on a badge. Its props are in [`AchievementsButton`](/docs/api/plugin-achievements#achievementsbutton).

With pages on and the achievements page present, it goes to the [`AchievementsPage`](#achievementspage). Otherwise it opens an `AchievementList` in a [`Dialog`](/docs/reference/react/components#dialog). Opening it sends no command, and it renders nothing in a game without the plugin. A game replaces it as `AchievementsButton` in `components`. Its parts are `achievements-button` and `badge`, and its dialog's are `dialog`, `dialog-overlay`, `dialog-title` and `dialog-close`.

### AchievementsPage

Renders the `achievements` page, one of the pages around the game, with a heading, an `AchievementList` and a **Back** button. Its props are in [`AchievementsPage`](/docs/api/plugin-achievements#achievementspage).

On the title screen, the progress counts come from the state the runner holds and the earned ones from the profile too, so the page is right before a game starts. The section carries `data-page="achievements"`. A game replaces it as `AchievementsPage` in `components`, or with a page of its own with the id `achievements` in [`PagesOptions`](/docs/reference/react/components#pagesoptions)' `pages`. Its parts are `achievements-page`, `page-heading` and `page-back`.

### useAchievements

Returns the achievements' [`AchievementsView`](#achievementsview) from the running game, or `null` in a game without the plugin. It re-renders when the view changes. Its signature is in [`useAchievements`](/docs/api/plugin-achievements#useachievements).

::include[../../../../../snippets/react/use-achievements.tsx]

## Functions

The helpers are properties of `achievements` and write its calls, typed:

- **`achievements.earned(id)`** returns the [`achievements/earned`](#achievementsearned) condition.
- **`achievements.grant(id)`** returns the [`achievements/grant`](#achievementsgrant) effect.

A choice grants an achievement that no condition describes:

```ts
import type { Choice } from '@ifloom/engine'
import { achievements } from '@ifloom/plugin-achievements'

export const usual: Choice = { id: 'usual', label: 'Order "the usual"', effects: [achievements.grant('regular')] }
```

### achievementsOf

Returns the game's achievements from `data.achievements.achievements`, merged from its content and packs, in order. Its signature is in [`achievementsOf`](/docs/api/plugin-achievements#achievementsof).

Code that reads an achievement's count itself passes its `progress.value` to [`amountOf`](/docs/reference/amounts#amountof):

```ts given
import { amountOf } from '@ifloom/engine'
import { achievementsOf } from '@ifloom/plugin-achievements'

const nestEgg = achievementsOf(game).find((def) => def.id === 'nest-egg')
const coins = nestEgg?.progress ? amountOf(state, game, nestEgg.progress.value) : 0
```

## Checks

When the game loads, the plugin reports problems with each achievement against the content or pack it came from, with `where` as `achievements <id>`:

| Problem | Cause |
|---|---|
| `when: unknown kind "pet"` | `when` names something the game doesn't have. |
| `progress: unknown stat "savings"` | `progress.value` names a stat, kv owner or value the game doesn't have, or isn't an amount. |
| `progress target must be more than 0` | `progress.target` is 0 or less. |

`ifloom check` also reports an `image` with no file. A call that names an achievement the game doesn't have gives `unknown achievement "…"` where it's written.

## Strings

A game, a pack or a translation rewords these by their full key in its [strings](/docs/reference/strings#stringkey-and-strings).

| Key | Meaning |
|---|---|
| `achievements/earned` | `Achievement: {title}`, the notice's title, with the achievement's name as `{title}`. |
| `achievements/secret` | `???`, the name of a secret achievement not yet earned. |

## Caveats

- An achievement earned by a command isn't earned until the command ends, so a trigger that asks `achievements.earned` on the same command sees it on the next one.
- Nothing takes an achievement back, even when its condition stops holding.
- The `seen` condition holds as soon as a scene is on screen, so `when: { seen: 'ava.river' }` earns the achievement as the scene opens.
- A new game's runner view shows every achievement in the profile as earned, while `achievements.earned` and `{{achievements/earned}}` read this save only.
