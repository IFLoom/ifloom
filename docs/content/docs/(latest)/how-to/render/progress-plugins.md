---
title: "Render quests, achievements and statuses"
description: "Render a quest log, an achievements page and the statuses in play in a UI of your own, in plain JS, React or Vue."
---
Render how far the player has come and what's affecting them now: the [quests](/docs/reference/plugins/quests) in a log, the [achievements](/docs/reference/plugins/achievements) on a page, and the [statuses](/docs/reference/plugins/statuses) beside the stats. Set up the runner first, as [Start your own UI](/docs/how-to/render/start) shows. In the React tabs, each plugin's UI comes from its `/react` subpath and goes in `mountGame`'s `plugins`, as [Show plugins in the React UI](/docs/how-to/react/show-plugin-uis) explains.

## Render the quest log

`view.plugins.quests` holds the quests as a [`QuestsView`](/docs/api/plugin-quests#questsview), with the `active` quests, the tracked one first, and the `done` ones, each a [`QuestEntry`](/docs/api/plugin-quests#questentry). The React UI's `questsUi` puts a Quests section in the side column that opens the [`QuestLog`](/docs/api/plugin-quests#questlog) in a dialog, with the count of news on its button.

::include[../../../../../snippets/plain/quests.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/mount-quests.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/Quests.vue]{meta='tab="Vue" tab-group="framework"'}

Each active quest has its `hint`, the count of its `stages` done in `stage`, and `updated` while it has news. Its `track` button tracks it, so it comes first, and the same button untracks it once it's tracked. `updates` counts the quests with news, for a badge, and the view's `seen` button marks them all seen. Both are ready buttons, so send their `command` as you would any other. [`useQuests`](/docs/api/plugin-quests#usequests) gives the quests' view to a React component of your own.

## Render an achievements page

`view.plugins.achievements` holds every achievement as an [`AchievementsView`](/docs/api/plugin-achievements#achievementsview), earned or not, with how many are `earned` of the `total`. The React UI's `achievementsUi` puts an [`AchievementsButton`](/docs/api/plugin-achievements#achievementsbutton) in the side column and opens the [`AchievementList`](/docs/api/plugin-achievements#achievementlist) as the `achievements` panel, and the title screen offers an achievements page when pages are on.

::include[../../../../../snippets/plain/achievements.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/mount-achievements.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/Achievements.vue]{meta='tab="Vue" tab-group="framework"'}

Render every entry. A secret achievement the player hasn't earned reads `???`, with no description or progress, so the page gives nothing away. An achievement that counts towards a target has `progress`, with its `value` and `target`, for a bar. The view counts an achievement as earned when the player has earned it in any save, from the [profile](/docs/reference/profile) the runner keeps. When the runner records a new one there, it makes a new snapshot, so the page renders again.

A view you make yourself with `view(state, game)` has no profile, so it shows only the save's own achievements. The plugin also raises a notice tagged `achievements` when one is earned, which [Render notices](/docs/how-to/render/stats-and-things#render-notices) shows. [`useAchievements`](/docs/api/plugin-achievements#useachievements) gives the achievements' view to a React component of your own.

## Render the statuses

`view.plugins.statuses` holds the statuses in play as a [`StatusesView`](/docs/api/plugin-statuses#statusesview), with each active one in `active`, in the order they were first applied. The React UI's [`StatusList`](/docs/api/plugin-statuses#statuslist), from `statusesUi`, goes under the stats in the side column, and the `statuses` panel renders it too.

::include[../../../../../snippets/plain/statuses.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/mount-statuses.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/Statuses.vue]{meta='tab="Vue" tab-group="framework"'}

Each status has its `name`, its `description`, the turns it has left in `turnsLeft`, and its `stacks`. Render them beside the stats, because `view.stats` already includes what each status adds, and the stats a status moves as it starts are listed in `view.changes`. [`useStatuses`](/docs/api/plugin-statuses#usestatuses) gives the statuses' view to a React component of your own.

For more on what these sections render, see:

- [Quests](/docs/reference/plugins/quests), [Achievements](/docs/reference/plugins/achievements) and [Statuses](/docs/reference/plugins/statuses).
- [The view](/docs/reference/view).
- [Add a quest](/docs/how-to/add-a-quest).
