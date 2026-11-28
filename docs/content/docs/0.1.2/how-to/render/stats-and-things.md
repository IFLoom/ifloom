---
title: "Render stats, things and what changed"
description: "Render the stats, the things the player holds, what the last command changed, notices and dice rolls in a UI of your own."
---
Render the numbers and lists around the story: the player's stats, the [things](/docs/0.1.2/reference/glossary#thing) the player holds, what the last command changed, notices and dice. Set up the runner first, as [Start your own UI](/docs/0.1.2/how-to/render/start) shows.

## Render the stats

`view.stats` lists the player's stats that are listed and visible now, in the order the game declares them, each a [`StatView`](/docs/0.1.2/api/engine#statview). The React UI's [`StatList`](/docs/0.1.2/api/react#statlist) renders them in the side column of the default layout, as bars or pips when a stat's `display` hint asks.

```ts tab="Plain JS" tab-group="framework"
import type { RunnerSnapshot } from '@ifloom/engine'
// add, as in the vanilla template's src/main.ts.
import { add } from './runner.ts'

/** The listed stats: each label and value, a bar from min to max, and how far to the next level. */
export function drawStats(parent: HTMLElement, { view }: RunnerSnapshot): void {
  const list = add(parent, 'dl', '', 'stats')
  for (const stat of view.stats) {
    add(list, 'dt', stat.level ? `${stat.label} (level ${stat.level.level})` : stat.label)
    const value = add(list, 'dd', stat.text)
    const bar = add(value, 'meter')
    Object.assign(bar, { min: stat.min, max: stat.max, value: stat.value })
    // Towards the next level, from 0 to 1; there's no next one at the top.
    if (stat.level?.next != null) Object.assign(add(value, 'progress'), { max: 1, value: stat.level.progress })
  }
}
```

```tsx tab="React" tab-group="framework"
import { Game, Scene, Section, Sidebar, StatList, Story, useGame, useWords } from '@ifloom/react'

// A layout of your own, for mountGame's `layout`, with the stats in the side column as the default layout has them.
export function Layout() {
  const words = useWords()
  return (
    <Game>
      <Sidebar>
        <Section id="stats" title={words('stats')} collapsible open>
          {/* Each listed stat, with a bar or pips by its `display` hint, and its level. */}
          <StatList />
        </Section>
        <Purse />
      </Sidebar>
      <Story>
        <Scene />
      </Story>
    </Game>
  )
}

// One stat your own way, from statsById, which has every stat, listed or not.
export function Purse() {
  const { view } = useGame()
  return <p className="purse">{view.statsById.coins?.text}</p>
}
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import { view } from './runner.ts'

// The listed stats: each label and value, a bar from min to max, and how far to the next level.
</script>

<template>
  <dl class="stats">
    <template v-for="stat in view.stats" :key="stat.key">
      <dt>
        {{ stat.label }}<template v-if="stat.level"> (level {{ stat.level.level }})</template>
      </dt>
      <dd>
        {{ stat.text }}
        <meter :min="stat.min" :max="stat.max" :value="stat.value" />
        <!-- Towards the next level, from 0 to 1; there's no next one at the top. -->
        <progress v-if="stat.level?.next != null" :max="1" :value="stat.level.progress" />
      </dd>
    </template>
  </dl>
</template>
```

Each stat has its `label`, its value written through its `format` as `text`, such as "12 coins", and its `min` and `max` for a bar. A stat with levels has `level`, with its level, the value the next one starts at, and `progress` towards it from 0 to 1. `view.statsById` has every stat by id, listed or not, for one you render your own way, such as a purse in the corner.

## Render what the player holds

The engine keeps no list of what the player holds. A plugin that keeps things puts its own in the view, such as the inventory's `view.plugins.inventory.things`, which [Render things to use and drop](/docs/0.1.2/how-to/render/things-plugins#render-things-to-use-and-drop) renders, and a game that keeps things in kv keys reads them as any key. `view.entities` lists each listed [kind](/docs/0.1.2/reference/glossary#kind) with its entities, as [`EntitiesView`](/docs/0.1.2/api/engine#entitiesview)s, and the React UI's [`EntityTable`](/docs/0.1.2/api/react#entitytable) renders a listed kind as a table wherever you place it.

```ts tab="Plain JS" tab-group="framework"
import type { RunnerSnapshot } from '@ifloom/engine'
// add, as in the vanilla template's src/main.ts.
import { add } from './runner.ts'

/** Each listed kind, with its entities and the stats the player can see on each. */
export function drawEntities(parent: HTMLElement, { view }: RunnerSnapshot): void {
  for (const kind of view.entities) {
    if (!kind.entries.length) continue
    add(parent, 'h3', kind.plural)
    const list = add(parent, 'ul', '', 'entities')
    for (const entity of kind.entries) {
      const row = add(list, 'li', entity.name)
      row.dataset.entity = entity.ref
      // A kind's flags, such as { met: true }, to split or style the list by.
      for (const [flag, holds] of Object.entries(entity.flags)) if (holds) row.classList.add(flag)
      for (const stat of entity.stats) add(row, 'span', `${stat.label} ${stat.text}`, 'stat')
    }
  }
}
```

```tsx tab="React" tab-group="framework"
import { EntityTable, Game, Scene, Section, Sidebar, Story } from '@ifloom/react'

// A layout of your own, for mountGame's `layout`. A table of a kind is yours to place.
export function Layout() {
  return (
    <Game>
      <Sidebar>
        <Section id="people" title="People you know" collapsible>
          {/* A listed kind's entities and their stats, from view.entities. */}
          <EntityTable kinds={['character']} />
        </Section>
      </Sidebar>
      <Story>
        <Scene />
      </Story>
    </Game>
  )
}
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import { view } from './runner.ts'

// Each listed kind with its entities and the stats the player can see on each.
// A kind's flags, such as { met: true }, become classes to split or style the list by.
const flagged = (flags: Record<string, boolean>) => Object.keys(flags).filter((flag) => flags[flag])
</script>

<template>
  <template v-for="kind in view.entities" :key="kind.id">
    <template v-if="kind.entries.length">
      <h3>{{ kind.plural }}</h3>
      <ul class="entities">
        <li v-for="entity in kind.entries" :key="entity.ref" :class="flagged(entity.flags)" :data-entity="entity.ref">
          {{ entity.name }}
          <span v-for="stat in entity.stats" :key="stat.key" class="stat">{{ stat.label }} {{ stat.text }}</span>
        </li>
      </ul>
    </template>
  </template>
</template>
```

Each entity in `view.entities` carries the stats the player can see on it and its kind's [flags](/docs/0.1.2/reference/glossary#flags), such as `{ met: true }`. Split or style the list by its flags, such as the people you've met and the rest. The engine has already left out every entity that isn't listed, so your UI hides nothing more.

## Render what changed

`view.changes` lists the stats the last command moved, each a [`ChangeView`](/docs/0.1.2/api/engine#changeview) with its signed `text`, the `name` of what moved, and `by`, which is positive when it went up. The React UI's [`Changes`](/docs/0.1.2/api/react#changes) renders them as pills, and the default layout leaves it out, so the React tab places it after the scene.

```ts tab="Plain JS" tab-group="framework"
import type { RunnerSnapshot } from '@ifloom/engine'
// add, as in the vanilla template's src/main.ts.
import { add } from './runner.ts'

/** What the last command moved, as pills: `+30 coins`, `-1 Energy`, `+4 Ava`, marked up or down for styling. */
export function drawChanges(parent: HTMLElement, { view }: RunnerSnapshot): void {
  if (!view.changes.length) return
  const list = add(parent, 'ul', '', 'changes')
  for (const change of view.changes) {
    const pill = add(list, 'li', change.name ? `${change.text} ${change.name}` : change.text, 'change')
    pill.dataset.stat = change.stat
    if (change.of) pill.dataset.of = change.of
    pill.dataset.dir = change.by > 0 ? 'up' : 'down'
  }
}
```

```tsx tab="React" tab-group="framework"
import { Changes, Scene } from '@ifloom/react'

// What the last command moved, as pills under the scene: `+30 coins`, `-5%`, `+2 Ava`.
// Each pill is a `change` part with data-stat, data-of and data-dir="up" or "down" for your CSS.
export function StoryWithChanges() {
  return (
    <>
      <Scene />
      <Changes />
    </>
  )
}
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import { view } from './runner.ts'

// What the last command moved, as pills: `+30 coins`, `-1 Energy`, `+4 Ava`, marked up or down for styling.
</script>

<template>
  <ul v-if="view.changes.length" class="changes">
    <li
      v-for="change in view.changes"
      :key="`${change.of ?? 'player'} ${change.stat}`"
      class="change"
      :data-stat="change.stat"
      :data-of="change.of"
      :data-dir="change.by > 0 ? 'up' : 'down'"
    >
      {{ change.text }} {{ change.name }}
    </li>
  </ul>
</template>
```

The list stays empty until the game names the stats to track in its content's `changes.stats` ([`ChangesDef`](/docs/0.1.2/api/engine#changesdef)). It compares the stats before and after the command, so a stat that went up and back down in one command isn't listed. A change from a plugin's modifier, such as a status starting, is listed too.

## Render notices

`view.notices.unseen` lists every [notice](/docs/0.1.2/reference/notices) the player hasn't dismissed, newest first, each a [`NoticeView`](/docs/0.1.2/api/engine#noticeview) with its `title`, `text`, `image` and `tag`. The React UI's [`Notices`](/docs/0.1.2/api/react#notices) renders them as toasts in a corner, in the default layout's `Overlay`, and [`NoticeStrip`](/docs/0.1.2/api/react#noticestrip) renders them as a strip over the story instead.

```ts tab="Plain JS" tab-group="framework"
import type { RunnerSnapshot } from '@ifloom/engine'
// runner and add, as in the vanilla template's src/main.ts.
import { add, runner } from './runner.ts'

/** The notices not yet dismissed, newest first, each with a button that marks it seen. */
export function drawNotices(parent: HTMLElement, { view }: RunnerSnapshot): void {
  const toasts = add(parent, 'div', '', 'notices')
  toasts.setAttribute('role', 'status')
  for (const notice of view.notices.unseen) {
    const toast = add(toasts, 'div', '', 'notice')
    if (notice.tag) toast.dataset.tag = notice.tag
    add(toast, 'strong', notice.title)
    if (notice.text) add(toast, 'p', notice.text)
    add(toast, 'button', 'Dismiss').onclick = () => runner.apply({ type: 'dismiss', id: notice.id })
  }
}

/** A badge with how many are unseen under a tag, such as the post. */
export function drawPostBadge(parent: HTMLElement, { view }: RunnerSnapshot): void {
  const count = view.notices.byTag.post ?? 0
  if (count) add(parent, 'span', String(count), 'badge')
}
```

```tsx tab="React" tab-group="framework"
import { Game, NoticeStrip, Notices, Overlay, Scene, Sidebar, Story, useGame } from '@ifloom/react'
import { Badge } from '@ifloom/react/kit'

// A layout of your own, for mountGame's `layout`. The default layout has Notices in its Overlay.
export function Layout() {
  return (
    <Game>
      <Sidebar>
        <PostBadge />
      </Sidebar>
      <Story>
        {/* Or the unseen notices in a strip over the story. */}
        <NoticeStrip />
        <Scene />
      </Story>
      <Overlay>
        {/* Toasts in a corner, each with a button that dismisses it. */}
        <Notices />
      </Overlay>
    </Game>
  )
}

// How many are unseen under a tag, from view.notices.byTag.
export function PostBadge() {
  const { view } = useGame()
  const count = view.notices.byTag.post ?? 0
  return count ? <Badge>{count} new</Badge> : null
}
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import { runner, view } from './runner.ts'

// The notices not yet dismissed, newest first, each with a button that marks it seen, and a badge for the post.
</script>

<template>
  <span v-if="view.notices.byTag.post" class="badge">{{ view.notices.byTag.post }}</span>
  <div class="notices" role="status">
    <div v-for="notice in view.notices.unseen" :key="notice.id" class="notice" :data-tag="notice.tag ?? undefined">
      <strong>{{ notice.title }}</strong>
      <p v-if="notice.text">{{ notice.text }}</p>
      <button @click="runner.apply({ type: 'dismiss', id: notice.id })">Dismiss</button>
    </div>
  </div>
</template>
```

Send `{ type: 'dismiss', id }` when the player has read a notice, or `{ type: 'dismiss' }` to dismiss them all. `view.notices.byTag` counts the unseen notices by tag, for a badge on the post or the phone.

## Render dice rolls

`view.rolls` lists the rolls the last command made, in order, each a [`Roll`](/docs/0.1.2/api/engine#roll) with its dice, each die's face, what was added, the total and, with a target, whether it passed. The React UI's `Scene` renders a [`DiceRoll`](/docs/0.1.2/api/react#diceroll) above a block whose `dice` hint names the roll, and the other rolls over the scene for a moment.

```ts tab="Plain JS" tab-group="framework"
import type { RunnerSnapshot } from '@ifloom/engine'
// add, as in the vanilla template's src/main.ts.
import { add } from './runner.ts'

/** The rolls the last command made, as they landed: `2d6: 4 + 5 + 1 = 10 (passed)`. The next command clears them. */
export function drawRolls(parent: HTMLElement, { view }: RunnerSnapshot): void {
  for (const roll of view.rolls) {
    const plus = roll.plus ? ` + ${roll.plus}` : ''
    const outcome = roll.passed === undefined ? '' : roll.passed ? ' (passed)' : ' (failed)'
    const line = add(parent, 'p', `${roll.dice}: ${roll.faces.join(' + ')}${plus} = ${roll.total}${outcome}`, 'roll')
    line.dataset.roll = roll.key
    if (roll.critical) line.dataset.critical = roll.critical
  }
}
```

```tsx tab="React" tab-group="framework"
import { DiceRoll, useScene } from '@ifloom/react'

// Scene renders a roll above the block whose `dice` hint names it, and the others over the scene for a moment.
// To show them somewhere of your own: the last command's rolls while they're new, so each tumbles once.
export function LastRolls() {
  const { rolls } = useScene()
  return (
    <div key={rolls.at} className="rolls">
      {rolls.fresh.map((roll) => (
        <DiceRoll key={roll.key} roll={roll} />
      ))}
    </div>
  )
}
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import type { Roll } from '@ifloom/engine'
import { view } from './runner.ts'

// The rolls the last command made, as they landed: `2d6: 4 + 5 + 1 = 10 (passed)`. The next command clears them.
const line = (roll: Roll) =>
  `${roll.dice}: ${roll.faces.join(' + ')}${roll.plus ? ` + ${roll.plus}` : ''} = ${roll.total}${roll.passed === undefined ? '' : roll.passed ? ' (passed)' : ' (failed)'}`
</script>

<template>
  <p v-for="(roll, at) in view.rolls" :key="at" class="roll" :data-roll="roll.key" :data-critical="roll.critical">{{ line(roll) }}</p>
</template>
```

The next command clears `view.rolls`, so each roll shows once. To put the dice beside the line that tells the outcome, find the beat whose block names the roll in its hint, `beat.ui?.dice`. Put the rolls in an element with `aria-live="polite"`, so a screen reader reads the result.

For more on what these sections render, see:

- [Stats](/docs/0.1.2/reference/stats), [Entities](/docs/0.1.2/reference/entities), [Changes](/docs/0.1.2/reference/changes), [Notices](/docs/0.1.2/reference/notices) and [Rolls](/docs/0.1.2/reference/rolls).
- [The view](/docs/0.1.2/reference/view).
- [Give the player things to hold and use](/docs/0.1.2/how-to/give-the-player-things), [Tell the player when something happens](/docs/0.1.2/how-to/show-a-notice) and [Roll dice for a check](/docs/0.1.2/how-to/roll-dice).
