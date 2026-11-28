---
title: "5. Add locations to walk between"
description: "Add the house, the high street and the café as locations with exits, so the player can walk between them."
---
By the end of this step the player steps out of the house and walks down the high street to the café and back.

## Install the places plugin

The engine's core has no map. The places plugin adds one, with locations, the exits between them, and where the player is. Stop the dev server, install the plugin, and start the server again:

```sh
npm install @ifloom/plugin-places
npm run dev
```

[How plugins work](/docs/0.1.2/explanation/plugins#the-core-and-the-plugins-a-game-chooses) says why the map is a plugin.

## Add the house and step outside

A location is an entity, one of the things the game keeps, written with the plugin's `places.location()`. The house goes in `src/story/opening.ts`, beside the scenes that happen in it. Replace the file with this:

```ts
// src/story/opening.ts
import { text, type Content } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'

export const opening: Content = {
  introScene: 'bedroom',
  scenes: [
    {
      id: 'bedroom',
      title: 'Moving day',
      body: [text('The last box is in. The bed is a mattress on the floor, and the window looks down on the high street.')],
      choices: [
        { id: 'unpack', label: 'Unpack a box', once: { per: 'turn', reason: 'Enough boxes for now.' }, effects: [{ stat: 'energy', by: -10 }] },
        { id: 'down', label: 'Go down to the kitchen', effects: [{ kv: 'kitchenVisits', by: 1 }, { scene: 'kitchen' }] },
      ],
    },
    {
      id: 'kitchen',
      title: 'The kitchen',
      body: [
        text('A kettle, two mugs and a fridge that hums to itself.'),
        text('You know where the tea bags are now.', { when: { kv: 'kitchenVisits', gte: 2 } }),
      ],
      choices: [
        {
          id: 'tea',
          label: 'Make a cup of tea',
          when: { kv: 'kitchenVisits', gte: 2 },
          once: { per: 'turn', reason: 'One cup is plenty.' },
          effects: [{ stat: 'energy', by: 10 }],
        },
        { id: 'up', label: 'Go back upstairs', effects: [{ scene: 'bedroom' }] },
        { id: 'out', label: 'Step outside', effects: [{ scene: null }] },
      ],
    },
  ],
  entities: [
    places.location({
      id: 'house',
      name: 'Your house',
      description: 'Home',
      exits: ['high-street'],
      body: [text('The front step, a bike against the wall, and the street at the end of the path.')],
    }),
  ],
}
```

The kitchen has a new choice, **Step outside**, whose effect is `{ scene: null }`. That closes the scene. With no scene open, the page shows the room, which is the location the player is at, with its `body` as the words, its exits as buttons, and its `image`, when it has one, as a banner above the words. [Turns, scenes and the room](/docs/0.1.2/explanation/turns-and-time#a-scene-and-the-room) has a picture of it.

The house's `exits` list the locations the player can walk to from it. An exit goes one way, so the street lists the house and the house lists the street. `description` is the short line under a location's name.

## Add the high street and the café

Each location gets a file of its own in `src/story/`, which holds its scenes as the story grows. Create `src/story/high-street.ts`:

```ts
// src/story/high-street.ts
import { text, type Content } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'

export const highStreet: Content = {
  entities: [
    places.location({
      id: 'high-street',
      name: 'The high street',
      description: 'Town',
      exits: ['house', 'cafe'],
      body: [text('Shopfronts, a bus stop, and a smell of bread from the corner.')],
    }),
  ],
}
```

Then create `src/story/cafe.ts`:

```ts
// src/story/cafe.ts
import { text, type Content } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'

export const cafe: Content = {
  entities: [
    places.location({
      id: 'cafe',
      name: 'The corner café',
      description: 'Café',
      exits: ['high-street'],
      body: [text('Steam on the windows, and a counter with nobody behind it yet.')],
    }),
  ],
}
```

## Put the plugin in the game

`src/game.ts` names the game's plugins, and lists the new files with the others. Replace it with this:

```ts
// src/game.ts
import { loadGame } from '@ifloom/engine'
import { defineGame } from '@ifloom/cli/game'
import { places } from '@ifloom/plugin-places'
import { stats } from './world/stats.ts'
import { opening } from './story/opening.ts'
import { highStreet } from './story/high-street.ts'
import { cafe } from './story/cafe.ts'

export default defineGame({
  build: ({ unlocked }) =>
    loadGame([stats, opening, highStreet, cafe], { id: 'my-town', title: 'My Town', plugins: [places({ start: 'house' })] }, { packs: unlocked }),
})
```

`loadGame` merges the files in its list into one game. Its second argument holds the game's `id`, its `title` and its `plugins`. `places({ start: 'house' })` makes the plugin, with the player starting at the house. The `id` is the folder's name, `my-town`, as the template wrote it, and the browser keeps the game's saves under it.

## Render the exits

The places plugin puts the exits in the view, the data the page renders, at `view.plugins.places.exits`. Each exit is a button like a choice, labelled with where it goes. The template renders scenes and choices already, so it needs only the exits added.

- **Plain JS.** Create `src/town.ts`, which returns the exits as buttons. Then add two lines to `src/main.ts`, which pass them to the template's own `drawChoices`.
- **React.** Replace `src/main.ts`. It lists the plugin's React UI, `placesUi`, in `plugins`, and the React UI renders the location and its exits.
- **Vue.** Create `src/Town.vue`, which renders the exits as buttons. Then add two lines to `src/Layout.vue`, which put it under the scene's choices.

```ts tab="Plain JS" tab-group="framework"
// src/town.ts
import type { RenderedChoice, View } from '@ifloom/engine'

/** The places plugin's buttons: the ways out of the location the player is at. */
export function townButtons(view: View): RenderedChoice[] {
  return view.plugins.places?.exits ?? []
}
```

```ts fragment tab="Plain JS" tab-group="framework"
// src/main.ts: add this line under the other imports
import { townButtons } from './town.ts'

// src/main.ts: in draw(), add this line under the one that renders view.scene.choices
drawChoices(add(story, 'nav', '', 'choices'), townButtons(view))
```

```ts tab="React" tab-group="framework"
// src/main.ts
import { mountGame } from '@ifloom/react'
import { placesUi } from '@ifloom/plugin-places/react'
import module from './game.ts'
import { Layout } from './layout.tsx'
import './styles.css'

mountGame(module.build(), { layout: Layout, pages: true, plugins: [placesUi] })
```

```vue tab="Vue" tab-group="framework"
<!-- src/Town.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { runner, view } from './runner.ts'

// The places plugin's buttons: the ways out of the location the player is at.
const buttons = computed(() => view.value.plugins.places?.exits ?? [])
</script>

<template>
  <nav class="bottom choices">
    <button v-for="button in buttons" :key="button.id" :disabled="Boolean(button.disabled)" :title="button.disabled" @click="runner.apply(button.command)">
      {{ button.label }}
    </button>
  </nav>
</template>
```

```vue tab="Vue" tab-group="framework"
<!-- src/Layout.vue: add this line in <script setup>, under the other imports -->
import Town from './Town.vue'

<!-- src/Layout.vue: add this line inside <main class="story">, under <div class="choices">…</div> -->
<Town />
```

[Render the calendar, locations and people](/docs/0.1.2/how-to/render/world-plugins) renders more of the plugin, such as the location's picture.

:::tip[Checkpoint]
Start a new game (reload the page, and in React press **New game**). Go down to the kitchen and press **Step outside**. The page shows "Your house" with an exit, **The high street**. Press it, then **The corner café**. The café's words show, and **The high street** takes you back the way you came.
:::
