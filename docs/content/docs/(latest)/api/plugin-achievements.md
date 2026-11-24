---
title: "@ifloom/plugin-achievements"
description: "Every export of @ifloom/plugin-achievements and its /react subpath, if it has one: its signature and its fields."
---
Generated from the source of `@ifloom/plugin-achievements` and `@ifloom/plugin-achievements/react` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

## @ifloom/plugin-achievements

- Functions: [`achievements`](#achievements), [`achievementsOf`](#achievementsof)
- Types: [`AchievementDef`](#achievementdef), [`AchievementEntry`](#achievemententry), [`AchievementsProfile`](#achievementsprofile), [`AchievementsState`](#achievementsstate), [`AchievementsView`](#achievementsview), [`ProgressDef`](#progressdef)

### AchievementDef

Type. Explained in [Achievements](/docs/plugins/achievements#achievementdef).

An achievement, as content declares it.

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
| `id` | `string` |  |  |  |
| `name` | `string` |  |  | What the player reads: "First loaf". |
| `description` | `string` | yes |  | What it's for, for the list. |
| `image` | `string` | yes |  | A picture for it, for a UI to show. |
| `secret` | `boolean` | yes |  | Shown as `???`, with no description or progress, until it's earned. |
| `when` | `Condition` | yes |  | Earned the first time this holds, checked after every command. Leave it out to earn it when `progress` reaches its target, or only with the `achievements/grant` effect. |
| `progress` | `ProgressDef` | yes |  | A count towards it, such as 4 of 10. Without `when`, reaching the target earns it. |

### AchievementEntry

Type. Explained in [Achievements](/docs/plugins/achievements#achievemententry).

An achievement as the UI shows it.

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
| `id` | `string` |  |  |  |
| `name` | `string` |  |  | Its name, or `???` while it's secret and not earned. |
| `description` | `string` |  |  | Its description, or `''` while it's secret and not earned. |
| `image` | `string \| null` |  |  | Its picture's path, through `artSrc`; null with none, or while it's secret and not earned. |
| `secret` | `boolean` |  |  |  |
| `earned` | `boolean` |  |  |  |
| `earnedOn` | `number \| null` |  |  | The turn this save earned it, or null. Null too for one earned only in another save. |
| `progress` | `{ value: number; target: number } \| null` |  |  | How far towards it, or null if it has no progress or is a secret not yet earned. Earned, it reads as full. |

### achievements

Function. Explained in [Achievements](/docs/plugins/achievements#achievements).

The plugin, with its helpers on it: `achievements()` makes the plugin for the
game's `plugins`, and content is written with `achievements.earned('first-loaf')`.

```ts shape
import { achievements } from '@ifloom/plugin-achievements'
function achievements(): DefinedPlugin<AchievementsState, AchievementsView>
```

| Helper | Signature | Description |
|---|---|---|
| `achievements.earned` | `(id: string): Condition` |  |
| `achievements.grant` | `(id: string): EffectRef` |  |

### achievementsOf

Function. Explained in [Achievements](/docs/plugins/achievements#achievementsof).

The game's achievements: `data.achievements.achievements`, from its packs.

```ts shape
import { achievementsOf } from '@ifloom/plugin-achievements'
function achievementsOf(game: Game): AchievementDef[]
```

### AchievementsProfile

Type. Explained in [Achievements](/docs/plugins/achievements#achievementsprofile).

What the plugin keeps in the player's profile, under its id: every achievement earned in any save, in the order they were first earned.

```ts shape
import type { AchievementsProfile } from '@ifloom/plugin-achievements'
type AchievementsProfile = {
  earned: string[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `earned` | `string[]` |  |  |  |

### AchievementsState

Type. Explained in [Achievements](/docs/plugins/achievements#achievementsstate).

What the plugin keeps in a save.

```ts shape
import type { AchievementsState } from '@ifloom/plugin-achievements'
type AchievementsState = {
  earned: Record<string, number>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `earned` | `Record<string, number>` |  |  | Achievements earned in this save, with the turn each was earned. |

### AchievementsView

Type. Explained in [Achievements](/docs/plugins/achievements#achievementsview).

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
| `achievements` | `AchievementEntry[]` |  |  | Every achievement, in the order the game declares them. |
| `earned` | `number` |  |  | How many are earned. |
| `total` | `number` |  |  |  |

### ProgressDef

Type. Explained in [Achievements](/docs/plugins/achievements#progressdef).

How far towards an achievement the player is: the value, out of `target`.
The value is an `Amount`, such as a stat's id, a kv key (`{ kv: 'coffees' }`)
or a value by name (`{ value: 'quests/updates' }`).

```ts shape
import type { ProgressDef } from '@ifloom/plugin-achievements'
type ProgressDef = {
  value: Amount
  target: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `value` | `Amount` |  |  |  |
| `target` | `number` |  |  |  |

## @ifloom/plugin-achievements/react

- Functions: [`useAchievements`](#useachievements)
- Constants: [`AchievementList`](#achievementlist), [`ACHIEVEMENTS_WORDS`](#achievements_words), [`AchievementsButton`](#achievementsbutton), [`AchievementsPage`](#achievementspage), [`achievementsUi`](#achievementsui)

### AchievementList

Const. Explained in [Achievements](/docs/plugins/achievements#achievementlist).

Every achievement the game has: earned ones marked, secret ones not yet
earned as `???`, and a progress bar on any with a count to reach. Earned in
any save counts, as the profile remembers it. `title` replaces the heading;
`false` leaves it out. A thin default on `useAchievements`.

```ts shape
import { AchievementList } from '@ifloom/plugin-achievements/react'
const AchievementList: ComponentType<{ className?: string; title?: string | false; }>
```

### ACHIEVEMENTS_WORDS

Const.

The achievements plugin's words, in English. A game rewords any with `ui.<key>` in its strings.

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
| `achievementEarned` | `'Earned'` |  |  |  |
| `achievementProgress` | `'{value} of {target}'` |  |  |  |
| `achievements` | `'Achievements'` |  |  |  |
| `achievementsCount` | `'{earned} of {total}'` |  |  |  |
| `noAchievements` | `'No achievements yet.'` |  |  |  |

### AchievementsButton

Const. Explained in [Achievements](/docs/plugins/achievements#achievementsbutton).

The button that shows the achievements, with how many are earned: the
`'achievements-button'` part. With pages on it goes to the achievements
page (unless the game left that page out); otherwise it opens them in a
dialog. Nothing in a game without the plugin.

```ts shape
import { AchievementsButton } from '@ifloom/plugin-achievements/react'
const AchievementsButton: ComponentType<{ className?: string; }>
```

### AchievementsPage

Const. Explained in [Achievements](/docs/plugins/achievements#achievementspage).

The achievements page, among the pages around the game: an `AchievementList` and a way back.

```ts shape
import { AchievementsPage } from '@ifloom/plugin-achievements/react'
const AchievementsPage: ComponentType<{ className?: string; }>
```

### achievementsUi

Const. Explained in [Achievements](/docs/plugins/achievements#achievementsui).

The achievements plugin's React UI, for `plugins` on `mountGame` or
`GameProvider`: the `AchievementsButton` in the side column, the
`achievements` page (with its title-screen button) when pages are on, the
`achievements` panel, and the achievements' words. To keep them in a
dialog with pages on, leave the page out: `{ ...achievementsUi, pages: undefined }`.

```ts shape
import { achievementsUi } from '@ifloom/plugin-achievements/react'
const achievementsUi: PluginUi
```

### useAchievements

Function. Explained in [Achievements](/docs/plugins/achievements#useachievements).

The achievements plugin's view: every achievement in the order the game
declares them, with how many are earned, or null in a game without the
plugin. A secret one not yet earned comes titled `???` with no description.
`AchievementList` is drawn from it.

```ts shape
import { useAchievements } from '@ifloom/plugin-achievements/react'
function useAchievements(): AchievementsView | null
```
