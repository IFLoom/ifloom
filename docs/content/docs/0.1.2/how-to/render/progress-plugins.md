---
title: "Render quests, achievements and statuses"
description: "Render a quest log, an achievements page and the statuses in play in a UI of your own, in plain JS, React or Vue."
---
Render how far the player has come and what's affecting them now: the [quests](/docs/0.1.2/reference/plugins/quests) in a log, the [achievements](/docs/0.1.2/reference/plugins/achievements) on a page, and the [statuses](/docs/0.1.2/reference/plugins/statuses) beside the stats. Set up the runner first, as [Start your own UI](/docs/0.1.2/how-to/render/start) shows. In the React tabs, each plugin's UI comes from its `/react` subpath and goes in `mountGame`'s `plugins`, as [Show plugins in the React UI](/docs/0.1.2/how-to/react/show-plugin-uis) explains.

## Render the quest log

`view.plugins.quests` holds the quests as a [`QuestsView`](/docs/0.1.2/api/plugin-quests#questsview), with the `active` quests, the tracked one first, and the `done` ones, each a [`QuestEntry`](/docs/0.1.2/api/plugin-quests#questentry). The React UI's `questsUi` puts a Quests section in the side column that opens the [`QuestLog`](/docs/0.1.2/api/plugin-quests#questlog) in a dialog, with the count of news on its button.

```ts tab="Plain JS" tab-group="framework"
import type { RunnerSnapshot } from '@ifloom/engine'
// add and drawChoices, as in the vanilla template's src/main.ts.
import { add, drawChoices } from './runner.ts'

/** The quest log: the active quests, the tracked one first, each with its hint and how far along it is, then the finished ones. */
export function drawQuests(parent: HTMLElement, { view }: RunnerSnapshot): void {
  const quests = view.plugins.quests
  if (!quests) return
  for (const quest of quests.active) {
    const entry = add(parent, 'section', '', 'quest')
    if (quest.updated) entry.dataset.updated = ''
    add(entry, 'h3', `${quest.name} (${quest.stage} of ${quest.stages})`)
    add(entry, 'p', quest.hint)
    // Track it, so it comes first; the same button says Untrack once it's tracked.
    if (quest.track) drawChoices(entry, [quest.track])
  }
  if (quests.done.length) add(parent, 'p', `Done: ${quests.done.map((quest) => quest.name).join(', ')}`, 'done')
  // Mark all seen, while there is news: it clears the "updated" marks.
  if (quests.seen) drawChoices(parent, [quests.seen])
}
```

```tsx tab="React" tab-group="framework"
import { mountGame } from '@ifloom/react'
import { questsUi } from '@ifloom/plugin-quests/react'
import module from './game.ts'

// A Quests section in the side column opens the quest log, with the count of news on its button.
mountGame(module.build(), { plugins: [questsUi] })
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import { computed } from 'vue'
import { runner, view } from './runner.ts'

// The quest log: the active quests, the tracked one first, each with its hint and how far along it is, then the finished ones.
const quests = computed(() => view.value.plugins.quests)
</script>

<template>
  <template v-if="quests">
    <section v-for="quest in quests.active" :key="quest.id" class="quest" :data-updated="quest.updated ? '' : undefined">
      <h3>{{ quest.name }} ({{ quest.stage }} of {{ quest.stages }})</h3>
      <p>{{ quest.hint }}</p>
      <!-- Track it, so it comes first; the same button says Untrack once it's tracked. -->
      <button v-if="quest.track" @click="runner.apply(quest.track.command)">{{ quest.track.label }}</button>
    </section>
    <p v-if="quests.done.length" class="done">Done: {{ quests.done.map((quest) => quest.name).join(', ') }}</p>
    <!-- Mark all seen, while there is news: it clears the "updated" marks. -->
    <button v-if="quests.seen" @click="runner.apply(quests.seen.command)">{{ quests.seen.label }}</button>
  </template>
</template>
```

Each active quest has its `hint`, the count of its `stages` done in `stage`, and `updated` while it has news. Its `track` button tracks it, so it comes first, and the same button untracks it once it's tracked. `updates` counts the quests with news, for a badge, and the view's `seen` button marks them all seen. Both are ready buttons, so send their `command` as you would any other. [`useQuests`](/docs/0.1.2/api/plugin-quests#usequests) gives the quests' view to a React component of your own.

## Render an achievements page

`view.plugins.achievements` holds every achievement as an [`AchievementsView`](/docs/0.1.2/api/plugin-achievements#achievementsview), earned or not, with how many are `earned` of the `total`. The React UI's `achievementsUi` puts an [`AchievementsButton`](/docs/0.1.2/api/plugin-achievements#achievementsbutton) in the side column and opens the [`AchievementList`](/docs/0.1.2/api/plugin-achievements#achievementlist) as the `achievements` panel, and the title screen offers an achievements page when pages are on.

```ts tab="Plain JS" tab-group="framework"
import type { RunnerSnapshot } from '@ifloom/engine'
// add, as in the vanilla template's src/main.ts.
import { add } from './runner.ts'

/** Every achievement, earned or not, with progress towards the ones that count. A secret one reads ??? until it's earned. */
export function drawAchievements(parent: HTMLElement, { view }: RunnerSnapshot): void {
  const achievements = view.plugins.achievements
  if (!achievements) return
  add(parent, 'h3', `Achievements: ${achievements.earned} of ${achievements.total}`)
  const list = add(parent, 'ul', '', 'achievements')
  for (const entry of achievements.achievements) {
    const item = add(list, 'li', entry.name)
    if (entry.earned) item.dataset.earned = ''
    if (entry.description) add(item, 'p', entry.description)
    if (entry.progress) Object.assign(add(item, 'progress'), { max: entry.progress.target, value: entry.progress.value })
  }
}
```

```tsx tab="React" tab-group="framework"
import { mountGame } from '@ifloom/react'
import { achievementsUi } from '@ifloom/plugin-achievements/react'
import module from './game.ts'

// An Achievements button goes in the side column, and the title screen offers an achievements page when pages are on.
mountGame(module.build(), { plugins: [achievementsUi] })
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import { view } from './runner.ts'

// Every achievement, earned or not, with progress towards the ones that count. A secret one reads ??? until it's earned.
</script>

<template>
  <template v-if="view.plugins.achievements">
    <h3>Achievements: {{ view.plugins.achievements.earned }} of {{ view.plugins.achievements.total }}</h3>
    <ul class="achievements">
      <li v-for="entry in view.plugins.achievements.achievements" :key="entry.id" :data-earned="entry.earned ? '' : undefined">
        {{ entry.name }}
        <p v-if="entry.description">{{ entry.description }}</p>
        <progress v-if="entry.progress" :max="entry.progress.target" :value="entry.progress.value" />
      </li>
    </ul>
  </template>
</template>
```

Render every entry. A secret achievement the player hasn't earned reads `???`, with no description or progress, so the page gives nothing away. An achievement that counts towards a target has `progress`, with its `value` and `target`, for a bar. The view counts an achievement as earned when the player has earned it in any save, from the [profile](/docs/0.1.2/reference/profile) the runner keeps. When the runner records a new one there, it makes a new snapshot, so the page renders again.

A view you make yourself with `view(state, game)` has no profile, so it shows only the save's own achievements. The plugin also raises a notice tagged `achievements` when one is earned, which [Render notices](/docs/0.1.2/how-to/render/stats-and-things#render-notices) shows. [`useAchievements`](/docs/0.1.2/api/plugin-achievements#useachievements) gives the achievements' view to a React component of your own.

## Render the statuses

`view.plugins.statuses` holds the statuses in play as a [`StatusesView`](/docs/0.1.2/api/plugin-statuses#statusesview), with each active one in `active`, in the order they were first applied. The React UI's [`StatusList`](/docs/0.1.2/api/plugin-statuses#statuslist), from `statusesUi`, goes under the stats in the side column, and the `statuses` panel renders it too.

```ts tab="Plain JS" tab-group="framework"
import type { RunnerSnapshot } from '@ifloom/engine'
// add, as in the vanilla template's src/main.ts.
import { add } from './runner.ts'

/** The active statuses, under the stats: each with how many turns it has left. The stats already include what they add. */
export function drawStatuses(parent: HTMLElement, { view }: RunnerSnapshot): void {
  const active = view.plugins.statuses?.active ?? []
  if (!active.length) return
  const list = add(parent, 'ul', '', 'statuses')
  for (const status of active) {
    const item = add(list, 'li', `${status.name} (${status.turnsLeft} left)`)
    item.title = status.description
    if (status.stacks > 1) add(item, 'span', ` ×${status.stacks}`)
  }
}
```

```tsx tab="React" tab-group="framework"
import { mountGame } from '@ifloom/react'
import { statusesUi } from '@ifloom/plugin-statuses/react'
import module from './game.ts'

// The StatusList goes under the stats in the side column.
mountGame(module.build(), { plugins: [statusesUi] })
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import { view } from './runner.ts'

// The active statuses, under the stats: each with how many turns it has left. The stats already include what they add.
</script>

<template>
  <ul v-if="view.plugins.statuses?.active.length" class="statuses">
    <li v-for="status in view.plugins.statuses.active" :key="status.id" :title="status.description">
      {{ status.name }} ({{ status.turnsLeft }} left)<template v-if="status.stacks > 1"> ×{{ status.stacks }}</template>
    </li>
  </ul>
</template>
```

Each status has its `name`, its `description`, the turns it has left in `turnsLeft`, and its `stacks`. Render them beside the stats, because `view.stats` already includes what each status adds, and the stats a status moves as it starts are listed in `view.changes`. [`useStatuses`](/docs/0.1.2/api/plugin-statuses#usestatuses) gives the statuses' view to a React component of your own.

For more on what these sections render, see:

- [Quests](/docs/0.1.2/reference/plugins/quests), [Achievements](/docs/0.1.2/reference/plugins/achievements) and [Statuses](/docs/0.1.2/reference/plugins/statuses).
- [The view](/docs/0.1.2/reference/view).
- [Add a quest](/docs/0.1.2/how-to/add-a-quest).
