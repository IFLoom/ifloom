---
title: "@ifloom/plugin-achievements"
description: "Every export of @ifloom/plugin-achievements and its /react subpath: its signature and its fields."
---
Generated from the source of `@ifloom/plugin-achievements` and `@ifloom/plugin-achievements/react` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

## @ifloom/plugin-achievements

- Functions: [`achievements`](#achievements), [`achievementsOf`](#achievementsof)
- Types: [`AchievementDef`](#achievementdef), [`AchievementEntry`](#achievemententry), [`AchievementsProfile`](#achievementsprofile), [`AchievementsState`](#achievementsstate), [`AchievementsView`](#achievementsview), [`ProgressDef`](#progressdef)

### AchievementDef

Type. Explained in [Achievements](/docs/reference/plugins/achievements#achievementdef).

An achievement the game declares in `data.achievements.achievements`. The player earns it once, by its condition, its progress or an effect.

```ts shape
import type { AchievementDef } from '@ifloom/plugin-achievements'
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

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The achievement's id, unique among the game's achievements. |
| `name` | `string` |  |  | The achievement's name, such as "First loaf". |
| `description` | `string` | yes |  | The achievement's line in the list of achievements. |
| `image` | `string` | yes |  | The achievement's picture, a path in the game's `art/` folder. |
| `secret` | `boolean` | yes |  | Hides the achievement until it's earned, when true. The view shows it as `???`, with no description, picture or progress. |
| `when` | [`Condition`](/docs/api/engine#condition) | yes |  | The achievement's condition, checked after every command. The player earns it the first time the condition holds. Leave it out to earn the achievement when `progress` reaches its target, or only with the `achievements/grant` effect. |
| `progress` | [`ProgressDef`](#progressdef) | yes |  | The achievement's count to reach, such as 4 of 10. Without `when`, reaching the target earns it. |

### AchievementEntry

Type. Explained in [Achievements](/docs/reference/plugins/achievements#achievemententry).

An achievement as the player sees it, in `view.plugins.achievements.achievements`. A secret one not yet earned
shows no name, description, picture or progress.

```ts shape
import type { AchievementEntry } from '@ifloom/plugin-achievements'
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

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The achievement's id. |
| `name` | `string` |  |  | The achievement's name, or the `achievements/secret` string (`???`) while it's secret and not earned. |
| `description` | `string` |  |  | The achievement's description, or `''` when it has none or while it's secret and not earned. |
| `image` | `string \| null` |  |  | The achievement's picture's path, through `artSrc`. It's null when there is none, or while it's secret and not earned. |
| `secret` | `boolean` |  |  | The achievement's `secret` flag from content, true even after it's earned. |
| `earned` | `boolean` |  |  | True when this save earned the achievement, or any save the profile remembers did. |
| `earnedOn` | `number \| null` |  |  | The turn this save earned the achievement. It's null when this save hasn't, even if another save has. |
| `progress` | `{ value: number; target: number } \| null` |  |  | The achievement's progress, clamped to between 0 and its target. Once earned, it reads as full. It's null when the achievement has no `progress`, or while it's secret and not earned. |

### achievements

Function. Explained in [Achievements](/docs/reference/plugins/achievements#achievements).

Returns the achievements plugin, for the game's `plugins`. Its helpers write its calls, such as
`achievements.earned('first-loaf')`.

Content declares the achievements in `data.achievements.achievements`.

```ts shape
import { achievements } from '@ifloom/plugin-achievements'
function achievements(): DefinedPlugin<AchievementsState, AchievementsView>
```

Uses: [`DefinedPlugin`](/docs/api/engine-plugin#definedplugin), [`AchievementsState`](#achievementsstate), [`AchievementsView`](#achievementsview).

| Helper | Signature | Description |
|---|---|---|
| `achievements.earned` | `(id: string):` [`Condition`](/docs/api/engine#condition) | Returns the `achievements/earned` condition, which holds when this save has earned the achievement. |
| `achievements.grant` | `(id: string):` [`EffectRef`](/docs/api/engine#effectref) | Returns the `achievements/grant` effect, which earns the achievement now unless it's already earned. |

### achievementsOf

Function. Explained in [Achievements](/docs/reference/plugins/achievements#achievementsof).

Returns the game's achievements, `data.achievements.achievements` from its content and packs, in declared order.

```ts shape
import { achievementsOf } from '@ifloom/plugin-achievements'
function achievementsOf(game: Game): AchievementDef[]
```

Uses: [`Game`](/docs/api/engine#game), [`AchievementDef`](#achievementdef).

### AchievementsProfile

Type. Explained in [Achievements](/docs/reference/plugins/achievements#achievementsprofile).

The achievements the player's profile keeps under the plugin's id. The profile outlives saves, so it lists achievements earned in any save.

```ts shape
import type { AchievementsProfile } from '@ifloom/plugin-achievements'
type AchievementsProfile = {
  earned: string[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `earned` | `string[]` |  |  | The ids of every achievement earned in any save, in the order they were first earned. |

### AchievementsState

Type. Explained in [Achievements](/docs/reference/plugins/achievements#achievementsstate).

The achievements a save keeps for the player. Definitions are read from content, so only the earned ones are kept.

```ts shape
import type { AchievementsState } from '@ifloom/plugin-achievements'
type AchievementsState = {
  earned: Record<string, number>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `earned` | `Record<string, number>` |  |  | The save's earned achievements, each id mapped to the turn it was earned. |

### AchievementsView

Type. Explained in [Achievements](/docs/reference/plugins/achievements#achievementsview).

The achievements as the player sees them, in `view.plugins.achievements`. Earned counts take in the profile when the runner has one.

```ts shape
import type { AchievementsView } from '@ifloom/plugin-achievements'
type AchievementsView = {
  achievements: AchievementEntry[]
  earned: number
  total: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `achievements` | [`AchievementEntry[]`](#achievemententry) |  |  | The game's achievements, in the order the game declares them. |
| `earned` | `number` |  |  | The number of achievements earned, in this save or any save the profile remembers. |
| `total` | `number` |  |  | The number of achievements the game declares, secret ones included. |

### ProgressDef

Type. Explained in [Achievements](/docs/reference/plugins/achievements#progressdef).

A count towards an achievement, an achievement's `progress`. The player's progress is `value` out of `target`.

`value` is an `Amount`, such as a stat's id, a kv key (`{ kv: 'coffees' }`) or a value by name
(`{ value: 'quests/updates' }`).

```ts shape
import type { ProgressDef } from '@ifloom/plugin-achievements'
type ProgressDef = {
  value: Amount
  target: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `value` | [`Amount`](/docs/api/engine#amount) |  |  | The count so far, an `Amount` the plugin works out after each command. |
| `target` | `number` |  |  | The count that completes the achievement. It must be more than 0. |

## @ifloom/plugin-achievements/react

- Functions: [`useAchievements`](#useachievements)
- Constants: [`AchievementList`](#achievementlist), [`ACHIEVEMENTS_WORDS`](#achievements_words), [`AchievementsButton`](#achievementsbutton), [`AchievementsPage`](#achievementspage), [`achievementsUi`](#achievementsui)

### AchievementList

Const. Explained in [Achievements](/docs/reference/plugins/achievements#achievementlist).

Renders the list of achievements from `view.plugins.achievements`, marking earned ones. A preset styles its
`achievements`, `achievement`, `achievement-title`, `achievement-progress` and related parts.

An achievement earned in any save the profile remembers counts as earned. A secret one not yet earned shows as
`???`, and one with a count to reach shows a progress bar. `title` replaces the heading, and `false` leaves it out.
It renders nothing in a game without the plugin.

```ts shape
import { AchievementList } from '@ifloom/plugin-achievements/react'
const AchievementList: ComponentType<{ className?: string; title?: string | false; }>
```

### ACHIEVEMENTS_WORDS

Const.

The achievements plugin's words in English, keyed by name. A game rewords any of them with `ui.<key>` in its strings.

```ts shape
import { ACHIEVEMENTS_WORDS } from '@ifloom/plugin-achievements/react'
const ACHIEVEMENTS_WORDS: {
  achievementEarned: 'Earned'
  achievementProgress: '{value} of {target}'
  achievements: 'Achievements'
  achievementsCount: '{earned} of {total}'
  noAchievements: 'No achievements yet.'
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `achievementEarned` | `'Earned'` |  |  | The badge on an achievement the player has earned. |
| `achievementProgress` | `'{value} of {target}'` |  |  | The line under an achievement's progress bar, with `{value}` and `{target}`. |
| `achievements` | `'Achievements'` |  |  | The title of the achievement list, its page, its dialog and the button that opens them. |
| `achievementsCount` | `'{earned} of {total}'` |  |  | The count of achievements earned, with `{earned}` and `{total}`. |
| `noAchievements` | `'No achievements yet.'` |  |  | The line the list shows while the game has no achievements to show. |

### AchievementsButton

Const. Explained in [Achievements](/docs/reference/plugins/achievements#achievementsbutton).

Renders the button that opens the achievements, with the number earned. A preset styles its `achievements-button`
part.

With pages on and the achievements page present, the button goes to that page. Otherwise it opens the list in a
dialog. It renders nothing in a game without the plugin.

```ts shape
import { AchievementsButton } from '@ifloom/plugin-achievements/react'
const AchievementsButton: ComponentType<{ className?: string; }>
```

### AchievementsPage

Const. Explained in [Achievements](/docs/reference/plugins/achievements#achievementspage).

Renders the achievements page, one of the pages around the game, with an `AchievementList` and a back button. A
preset styles its `achievements-page` part.

```ts shape
import { AchievementsPage } from '@ifloom/plugin-achievements/react'
const AchievementsPage: ComponentType<{ className?: string; }>
```

### achievementsUi

Const. Explained in [Achievements](/docs/reference/plugins/achievements#achievementsui).

The achievements plugin's React UI, for `plugins` on `mountGame` or `GameProvider`. It adds the
`AchievementsButton` to the sidebar, the `achievements` page and panel, and the plugin's words.

The page appears only when pages are on, with a button on the title screen. To keep the list in a dialog with pages
on, leave the page out with `{ ...achievementsUi, pages: undefined }`.

```ts shape
import { achievementsUi } from '@ifloom/plugin-achievements/react'
const achievementsUi: PluginUi
```

Uses: [`PluginUi`](/docs/api/react-kit#pluginui).

### useAchievements

Function. Explained in [Achievements](/docs/reference/plugins/achievements#useachievements).

Returns the achievements plugin's view from the running game, or null in a game without the plugin. It re-renders
when the view changes.

A secret achievement not yet earned comes named `???`, with no description. `AchievementList` renders from it.

```ts shape
import { useAchievements } from '@ifloom/plugin-achievements/react'
function useAchievements(): AchievementsView | null
```

Uses: [`AchievementsView`](#achievementsview).
