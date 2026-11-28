---
title: "Arrange the layout"
description: "Arrange the page around the story, with sections that fold or open in a dialog and a side column that becomes a drawer on a phone."
---
Use this to change how the page is laid out around the story. The layout is one file: in the React UI, `src/layout.tsx`, a component made of regions (`Game`, `Sidebar`, `Story`, `Overlay`) with the parts inside them, passed to `mountGame` as `layout`. The vanilla and vue templates have the same regions in `src/layout.ts` and `src/Layout.vue`. [`DefaultLayout`](/docs/reference/react/components#defaultlayout) is the whole default layout.

## Fold a section

Wrap the parts in a [`Section`](/docs/reference/react/components#section) with `collapsible`. The profile keeps the player's choice per `id`, so a folded section stays folded next time. With a UI of your own, use a `<details>`, which folds with no code:

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
import { Game, Scene, Section, Sidebar, StatList, Story, Title } from '@ifloom/react'
import { InventoryCard } from '@ifloom/plugin-inventory/react'

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
          <InventoryCard title={false} />
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

A `Section` hides itself when nothing in it renders anything, so a Quests section in a game without the quests plugin takes no space. The cards inside have titles of their own, so pass them `title={false}`.

## Open a section in a dialog

Give the `Section` `dialog` instead of `collapsible` for something the player looks at now and then, such as the quest log or the people they've met. It becomes a button that opens its children in a dialog, and `badge` puts a count on the button:

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
      <p v-for="quest in quests.active" :key="quest.id">{{ quest.name }}</p>
      <button @click="dialog?.close()">Close</button>
    </dialog>
  </template>
</template>
```

A dialog opened from the side column stays open while the player acts inside it.

## Show a part only at some locations

Give a `Section` a `when`, any [condition](/docs/reference/conditions) content could write, such as a wardrobe shown only at home. [`When`](/docs/reference/react/components#when) does the same for anything else, and [`useHolds`](/docs/reference/react/components#useholds) answers in a hook. They read the state and change nothing, so saves and replays aren't affected. With a UI of your own, ask the engine's [`holds`](/docs/reference/conditions#holds) as you render:

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

To decide in plain code instead, read a plugin's view. This lists the exits only outdoors, from the [places](/docs/reference/plugins/places) plugin's view, read in React with [`usePlaces`](/docs/reference/plugins/places#useplaces):

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

## Open a panel from the story

For something that shouldn't be on screen until the story asks, such as the wardrobe when the player opens the wardrobe door, put the [`panel` effect](/docs/reference/effects#panel) on an action:

```ts
import { places } from '@ifloom/plugin-places'

const flat = places.location({
  id: 'flat', name: 'Your flat', description: 'Home', exits: ['high-street'],
  body: [{ prose: 'place.flat' }],
  actions: [{ id: 'wardrobe', label: 'Open the wardrobe', effects: [{ panel: 'wardrobe' }] }],
})
```

The React UI's [`PanelHost`](/docs/reference/react/components#panelhost) renders the built-in panels by name, so keep one in your layout. [Open a shop, a job board or another panel](/docs/how-to/open-a-panel) shows the effect in every kind of content, and [Render a panel](/docs/how-to/render/timers-minigames-panels#render-a-panel) renders `view.panel` in a UI of your own.

## Place the story's text

The React UI keeps the scene's title, its words, the choices, the inputs, the exits and the people here to a reading column `--width-prose` wide, centred in the story. Pictures, a location's layered picture and panels still use the whole width. To keep the column to the start of the story instead, give [`Story`](/docs/reference/react/components#story) `align="start"`. The vanilla and vue templates keep their text to the start already, and a few lines in `src/styles.css` centre it:

```css tab="Plain JS" tab-group="framework"
/* src/styles.css: the story's text in a column in the middle, as the React UI renders it */
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
/* src/styles.css: the story's text in a column in the middle, as the React UI renders it */
.story > h2,
.prose,
.inputs,
.choices {
  width: 100%;
  max-width: 70ch;
  margin-inline: auto;
}
```

In the React UI you can also leave the layout alone and set the `--margin-prose` token, the column's `margin-inline`, in a preset or your stylesheet. `auto` centres the column and `0 auto` keeps it to the start. An `align` on `Story` wins over the token:

```css
:root {
  --margin-prose: 0 auto;
}
```

## Style the side column on a phone

The React UI's `Sidebar` becomes a drawer below 48rem, Tailwind's `md`, with no work from you. A slim top bar holds the title, the clock and a menu button, and the button slides the side column in over the story. Focus stays in it, Escape closes it, and it closes once the player chooses something. Style it with its parts:

```css
[data-part="top-bar"] { background: var(--card); }
[data-part="drawer"] { width: 20rem; }
[data-part="drawer-button"] { border-radius: 999px; }
```

The vanilla and vue templates stack the side column above the story on a phone, with a media query in `src/styles.css`. A section that folds keeps that short.

## Check it worked

Play in `npm run dev`. Fold the Stats section and reload: it stays folded. Go home to the flat, and the Wearing section shows. Narrow the window below 48rem, and the side column moves into the drawer behind the menu button.

For more, see:

- [Layouts](/docs/reference/react/components#layouts), with `Game`, `Sidebar`, `Story`, `Overlay`, `Section` and `When`.
- [Parts](/docs/reference/react/parts), for every `data-part` to style.
- [Rearrange or replace the React UI's parts](/docs/how-to/react/replace-parts), for a layout of a different shape.
- [Build a HUD](/docs/how-to/build-a-hud), for pieces of your own to place in it.
