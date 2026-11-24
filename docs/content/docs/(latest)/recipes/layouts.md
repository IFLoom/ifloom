---
title: "Layouts: sections, drawers and showing things in some rooms"
description: "Arrange the page in layout.tsx: sections that fold or open in a dialog, the side column as a drawer on phones, parts shown only in some rooms, panels opened from content, and where the story's text sits."
---
The page's layout lives in one file. In the React UI it's `src/layout.tsx`, a component made of regions (`Game`, `Sidebar`, `Story`, `Overlay`) with the parts inside them, passed to `mountGame` as `layout`. The vue, svelte and vanilla templates have the same regions in their own markup: `src/Layout.vue`, `src/Layout.svelte` and `src/layout.ts`. This page shows the changes most games make. [The React UI](/docs/reference/react#layouts) has the whole default layout.

## Sections that fold

A long side column is easier to read when the player can fold away what they don't need. In React, wrap the parts in a [`Section`](/docs/reference/react/components#section) with `collapsible`. The player's choice is kept in the profile, per `id`, so a folded section stays folded next time. The other templates use a `<details>`, which folds with no code.

```ts fragment tab="Plain JS" tab-group="framework"
// src/main.ts, with section() from the vanilla template's src/layout.ts
import { layout, section } from './layout.ts'

function draw(view: View): void {
  const { sidebar } = layout(root)
  const stats = add(section(sidebar, 'stats', 'Stats'), 'dl', '', 'stats')
  for (const stat of view.stats) {
    add(stats, 'dt', stat.label)
    add(stats, 'dd', stat.text)
  }
  // …the story, as before
}
```

```tsx tab="React" tab-group="framework"
// src/layout.tsx
import { Game, Inventory, Scene, Section, Sidebar, StatList, Story, Title } from '@ifloom/react'

export function Layout() {
  return (
    <Game>
      <Sidebar>
        <Title />
        <Section id="stats" title="Stats" collapsible open>
          <StatList />
        </Section>
        {/* Folded until the player opens it. */}
        <Section id="inventory" title="In your bag" collapsible open={false}>
          <Inventory title={false} />
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
<!-- src/Layout.vue -->
<script setup lang="ts">
import { view } from './runner.ts'
</script>

<template>
  <aside class="sidebar">
    <details v-if="view.stats.length" class="section" open>
      <summary>Stats</summary>
      <dl class="stats">
        <template v-for="stat in view.stats" :key="stat.key">
          <dt>{{ stat.label }}</dt>
          <dd>{{ stat.text }}</dd>
        </template>
      </dl>
    </details>
  </aside>
</template>
```

```svelte tab="Svelte" tab-group="framework"
<!-- src/Layout.svelte -->
<script lang="ts">
  import { view } from './runner.ts'
</script>

<aside class="sidebar">
  {#if $view.stats.length}
    <details class="section" open>
      <summary>Stats</summary>
      <dl class="stats">
        {#each $view.stats as stat (stat.key)}<dt>{stat.label}</dt><dd>{stat.text}</dd>{/each}
      </dl>
    </details>
  {/if}
</aside>
```

A `Section` hides itself when nothing in it draws anything. A Stats section in a game with no stats takes no room, and neither does a Quests section in a game without the quests plugin. The cards inside have titles of their own, so pass them `title={false}`.

## A section in a dialog

Some things are looked at now and then, not all the time: the quest log, the people the player has met. Give the `Section` `dialog` instead, and it's a button that opens its children in a dialog. `badge` puts a count on the button.

```ts fragment tab="Plain JS" tab-group="framework"
// A button that opens a <dialog> with the quests' names.

const quests = view.plugins.quests
if (quests) {
  const dialog = add(sidebar, 'dialog')
  for (const quest of quests.active) add(dialog, 'p', quest.name)
  add(dialog, 'button', 'Close').onclick = () => dialog.close()
  add(sidebar, 'button', quests.updates ? `Quests (${quests.updates})` : 'Quests').onclick = () => dialog.showModal()
}
```

```tsx tab="React" tab-group="framework"
import { Section } from '@ifloom/react'
import { QuestLog, useQuests } from '@ifloom/plugin-quests/react'
import { Relationships } from '@ifloom/plugin-cast/react'

function JournalSections() {
  const news = useQuests()?.updates
  return (
    <>
      <Section id="quests" title="Quests" dialog badge={news || null}>
        <QuestLog title={false} />
      </Section>
      <Section id="people" title="People" dialog>
        <Relationships />
      </Section>
    </>
  )
}
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import { computed, ref } from 'vue'
import { view } from './runner.ts'

const quests = computed(() => view.value.plugins.quests)
const dialog = ref<HTMLDialogElement | null>(null)
</script>

<template>
  <template v-if="quests">
    <button @click="dialog?.showModal()">Quests<template v-if="quests.updates"> ({{ quests.updates }})</template></button>
    <dialog ref="dialog">
      <p v-for="quest in quests.active" :key="quest.id">{{ quest.title }}</p>
      <button @click="dialog?.close()">Close</button>
    </dialog>
  </template>
</template>
```

```svelte tab="Svelte" tab-group="framework"
<script lang="ts">
  import { view } from './runner.ts'

  const quests = $derived($view.plugins.quests)
  let dialog: HTMLDialogElement | undefined = $state()
</script>

{#if quests}
  <button onclick={() => dialog?.showModal()}>Quests{#if quests.updates} ({quests.updates}){/if}</button>
  <dialog bind:this={dialog}>
    {#each quests.active as quest (quest.id)}<p>{quest.title}</p>{/each}
    <button onclick={() => dialog?.close()}>Close</button>
  </dialog>
{/if}
```

## Showing something only in some rooms

A wardrobe is something you look in at home. To show a section only in some rooms, give it `when`, any [condition](/docs/reference/conditions) content could write. [`When`](/docs/reference/react/components#when) does the same for anything else, and [`useHolds`](/docs/reference/react/components#useholds) answers in a hook. They read the state and change nothing, so saves and replays aren't affected. In the other frameworks, ask the engine's [`holds`](/docs/reference/conditions#holds) when you draw.

```ts fragment tab="Plain JS" tab-group="framework"
import { holds } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'

// In draw(), after the stats:
if (holds(runner.state, runner.game, places.at('flat'))) {
  const worn = section(sidebar, 'wardrobe', 'Wearing')
  // …what the player has on, from view.plugins.wardrobe
}
```

```tsx tab="React" tab-group="framework"
import { Section, When } from '@ifloom/react'
import { WardrobeCard } from '@ifloom/plugin-wardrobe/react'
import { places } from '@ifloom/plugin-places'

export function AtHome() {
  return (
    <>
      <Section id="wardrobe" title="Wearing" collapsible when={places.at('flat')}>
        <WardrobeCard title={false} />
      </Section>
      <When condition={{ kv: 'raining' }}>
        <p>Rain runs down the window.</p>
      </When>
    </>
  )
}
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import { computed } from 'vue'
import { holds } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'
import { runner, view } from './runner.ts'

// Read `view` so it's worked out again whenever the state changes.
const atHome = computed(() => view.value && holds(runner.state, runner.game, places.at('flat')))
</script>

<template>
  <details v-if="atHome" class="section" open>
    <summary>Wearing</summary>
    <!-- …what the player has on, from view.plugins.wardrobe -->
  </details>
</template>
```

```svelte tab="Svelte" tab-group="framework"
<script lang="ts">
  import { holds } from '@ifloom/engine'
  import { places } from '@ifloom/plugin-places'
  import { runner, view } from './runner.ts'

  // Read $view so it's worked out again whenever the state changes.
  const atHome = $derived($view && holds(runner.state, runner.game, places.at('flat')))
</script>

{#if atHome}
  <details class="section" open>
    <summary>Wearing</summary>
    <!-- …what the player has on, from view.plugins.wardrobe -->
  </details>
{/if}
```

You can also decide in plain code, from a hook. This draws the exits as a list only outdoors, using the [places](/docs/reference/plugins/places) plugin's view through [`usePlaces`](/docs/reference/plugins/places#useplaces):

```ts fragment tab="Plain JS" tab-group="framework"
const places = view.plugins.places
if (places?.location?.tags.includes('outdoors')) {
  const list = add(story, 'ul')
  for (const exit of places.exits) add(add(list, 'li'), 'button', exit.label).onclick = () => runner.apply(exit.command)
}
```

```tsx tab="React" tab-group="framework"
import { usePlaces } from '@ifloom/plugin-places/react'

function StreetMap() {
  const places = usePlaces()
  if (!places?.location?.tags.includes('outdoors')) return null
  return (
    <ul>
      {places.exits.map((exit) => (
        <li key={exit.id}>
          <button onClick={() => places.go(exit.id)}>{exit.label}</button>
        </li>
      ))}
    </ul>
  )
}
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import { computed } from 'vue'
import { runner, view } from './runner.ts'

const places = computed(() => view.value.plugins.places)
</script>

<template>
  <ul v-if="places?.location?.tags.includes('outdoors')">
    <li v-for="exit in places.exits" :key="exit.id">
      <button @click="runner.apply(exit.command)">{{ exit.label }}</button>
    </li>
  </ul>
</template>
```

```svelte tab="Svelte" tab-group="framework"
<script lang="ts">
  import { runner, view } from './runner.ts'

  const places = $derived($view.plugins.places)
</script>

{#if places?.location?.tags.includes('outdoors')}
  <ul>
    {#each places.exits as exit (exit.id)}
      <li><button onclick={() => runner.apply(exit.command)}>{exit.label}</button></li>
    {/each}
  </ul>
{/if}
```

## Opening a panel from the story

Some things shouldn't be on screen at all until the story asks for them, such as the wardrobe when the player opens the wardrobe door, or a shop's counter. Content opens them with the [`panel` effect](/docs/reference/panels), from a place's action, a choice, a thing the player uses or an app, and the UI draws the panel by its name:

```ts
import { places } from '@ifloom/plugin-places'

const flat = places.location({
  id: 'flat', name: 'Your flat', description: 'Home', exits: ['high-street'],
  body: [{ prose: 'place.flat' }],
  actions: [{ id: 'wardrobe', label: 'Open the wardrobe', effects: [{ panel: 'wardrobe' }] }],
})
```

The React UI's [`PanelHost`](/docs/reference/react/components#panelhost) draws the built-in `wardrobe`, `inventory`, `quests`, `people`, `stats`, `statuses`, `achievements`, `shop` and `jobs` panels, and a game's own `panels` of the same name go over them. Keep a `PanelHost` in your layout. In the prose, `[[act:wardrobe|the wardrobe]]` turns words into a button for the same action (see [Inline actions](/docs/recipes/inline-actions)). The other frameworks read `view.panel` and draw what they like for each name, as the templates' `Panel` does. [Opening a shop or a job board from anywhere](/docs/recipes/shops-and-job-boards) shows the effect in every kind of content.

## Where the story's text sits

On a wide screen the story is much wider than a comfortable line of text. The React UI keeps the scene's title, its prose, the choices, the inputs, the exits and the people here to a reading column `--width-prose` wide, and centres that column in the story. Pictures, a place's layered picture and panels still use the whole width.

To keep the column to the start of the story instead, give [`Story`](/docs/reference/react/components#story) `align="start"`. The vue, svelte and vanilla templates keep their text to the start already, and a few lines in `src/styles.css` centre it:

```css tab="Plain JS" tab-group="framework"
/* src/styles.css: the story's text in a column in the middle, as the React UI draws it */
.story > h2,
.prose,
.inputs,
.choices {
  width: 100%;
  max-width: 70ch;
  margin-inline: auto;
}
```

```tsx tab="React" tab-group="framework"
// src/layout.tsx
import { Game, Scene, Story } from '@ifloom/react'

export function Layout() {
  return (
    <Game>
      {/* Centred when align is left out. */}
      <Story align="start">
        <Scene />
      </Story>
    </Game>
  )
}
```

```css tab="Vue" tab-group="framework"
/* src/styles.css: the story's text in a column in the middle, as the React UI draws it */
.story > h2,
.prose,
.inputs,
.choices {
  width: 100%;
  max-width: 70ch;
  margin-inline: auto;
}
```

```css tab="Svelte" tab-group="framework"
/* src/styles.css: the story's text in a column in the middle, as the React UI draws it */
.story > h2,
.prose,
.inputs,
.choices {
  width: 100%;
  max-width: 70ch;
  margin-inline: auto;
}
```

In the React UI you can also leave the layout alone and set the [`--margin-prose`](/docs/reference/react/customising#2-set-tokens-and-colours) token, which is the column's `margin-inline`. That suits a preset or a game's stylesheet. `auto` centres the column and `0 auto` keeps it to the start. An `align` on `Story` wins over the token.

```css
:root {
  --margin-prose: 0 auto;
}
```

The paper preset already draws its story as a book's page, with the column in the middle. It follows the token and `align` as well.

## The side column on a phone

In the React UI, the `Sidebar` becomes a drawer below 48rem with no work from you. A slim top bar holds the title, the clock and a menu button, and the button slides the side column in over the story. Focus stays in it, Escape closes it, and it closes by itself once the player picks something. Style it with its parts:

```css
[data-part="top-bar"] { background: var(--card); }
[data-part="drawer"] { width: 20rem; }
[data-part="drawer-button"] { border-radius: 999px; }
```

The other templates stack the side column above the story on a phone, with a media query in `src/styles.css`. A section that folds keeps that short.

**Gotchas.**

- **The breakpoint is Tailwind's `md`.** It's read with `matchMedia`, so the drawer opens and closes as the window crosses it, and the side column's contents are drawn again.
- **A dialog opened from the drawer stays open.** A phone or a section's dialog doesn't close when the player acts inside it, and the drawer stays open behind it.
