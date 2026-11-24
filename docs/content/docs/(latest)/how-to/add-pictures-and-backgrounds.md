---
title: "Add pictures and backgrounds"
description: "How-to for pictures and clips: where the files go, a picture in a scene's words, a scene's background, a picture picked from a pool by tags, a layered picture with a hotspot, a location's picture, video, and a placeholder for art that isn't made yet."
---
Use this to put pictures and short clips in your game: in a scene's words, behind a scene, picked from a set by tags, or stacked in layers with a part the player clicks. The engine renders none of them itself. It lists them in the view, and a UI shows them, the React UI with no setup.

## Put the files in public/art

Put every picture and clip in your game's `public/art/` folder. Content names a file by its path under `art/`, and [`artSrc`](/docs/reference/prose#artsrc) turns that path into the one the page loads:

- **A name with an extension** is that file: `'photo/ava.svg'` is `public/art/photo/ava.svg`.
- **A bare name** is a `.jpg`, or an `.mp4` where a video is asked for: `'scene/market-morning'` is `public/art/scene/market-morning.jpg`.
- **A URL** is used as it is, but a game opened from disk can't fetch one, so keep your files in `art/`.

`ifloom build` copies `public/` beside the page, so the paths work from disk and from a static host.

## Show a picture in a scene

Put a `{ media }` block in the scene's body where the picture goes. `size: 'wide'` spans the column, and `at: 'lead'` puts it before the words as an establishing picture:

```ts
import type { DataScene } from '@ifloom/engine'

export const market: DataScene = {
  id: 'market.morning',
  title: 'The market',
  body: [{ media: { src: 'scene/market-morning', size: 'wide', at: 'lead', alt: 'Stalls going up in the square' } }, { text: 'The bread stall is already half sold.' }],
  choices: [{ id: 'leave', label: 'Walk on', effects: [{ scene: null }] }],
}
```

In words, write the [image markup](/docs/reference/prose#images) as a paragraph of its own: `[[img:scene/market-morning|Stalls going up]]` in the column, or `[[wide:…]]` across it.

## Give a scene a background

Give the scene a [`picture`](/docs/reference/scenes#picture) with one layer. The engine lists it in `view.scene.picture`:

```ts
import type { DataScene } from '@ifloom/engine'

export const knock: DataScene = {
  id: 'flat.knock',
  title: 'A knock at the door',
  picture: { aspect: '16/9', layers: [{ id: 'hall', src: 'flat/hall' }] },
  body: [{ text: 'Someone knocks, three times, not loud.' }],
  choices: [{ id: 'close', label: 'Close the door', effects: [{ scene: null }] }],
}
```

The React UI's `Scene` renders the picture above the words. To put it behind the words instead, set the bottom layer as the background of the box round the scene:

::include[../../../../snippets/plain/background.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../snippets/react/background.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../snippets/vue/Background.vue]{meta='tab="Vue" tab-group="framework"'}

A video layer can't be a CSS background, so leave it to the code that renders the picture, as [Render the scene's picture](/docs/how-to/render/pictures-and-sound#render-the-scenes-picture) shows.

## Pick a picture from a pool

Declare a pool in your content's `media.pools`, a named list of files, each with the tags you sort them by:

```ts
import type { Content } from '@ifloom/engine'

export const doors: Content = {
  media: {
    pools: {
      door: [
        { src: 'door/blue-day.jpg', tags: ['blue', 'day'], weight: 4 },
        { src: 'door/blue-night.jpg', tags: ['blue', 'night'] },
        { src: 'door/red-day.jpg', tags: ['red', 'day'] },
        { src: 'door/red-night.jpg', tags: ['red', 'night'] },
      ],
    },
  },
}
```

Ask the pool for a file by tags, in a block as `{ media: { pool: 'door', tags: ['red', 'night'], alt: 'The front door' } }`, or in words as `[[img:@door|red,night|The front door]]`. The engine draws among the files with every tag, by `weight`. With none, it drops the last tag and tries again, so put the tag that matters most first. The save keeps each pick, so the same request in the same place shows the same file on every visit.

## Build a layered picture with a hotspot

Give a scene's `picture` several layers, bottom first, each shown while its `when` holds. A layer can ask a pool too. A hotspot is a part of the picture the player clicks, placed by its `rect` (left, top, width and height, in percent), and its `choice` chooses one of the scene's choices:

```ts
import type { DataScene } from '@ifloom/engine'

export const answer: DataScene = {
  id: 'flat.knock',
  picture: {
    aspect: '16/9',
    layers: [
      { id: 'hall', src: 'flat/hall' },
      { id: 'rain', pool: 'window', tags: ['rain'], when: { kv: 'raining' } },
    ],
    hotspots: [{ id: 'door', rect: [60, 10, 25, 85], label: 'The front door', choice: 'answer' }],
  },
  body: [{ text: 'Someone knocks, three times, not loud.' }],
  choices: [
    { id: 'answer', label: 'Answer it', effects: [{ scene: 'flat.visitor' }] },
    { id: 'ignore', label: 'Pretend you’re out', effects: [{ scene: null }] },
  ],
}
```

The hotspot is greyed out and hidden exactly when its choice's button is. Give a hotspot `command` instead of `choice` to send any command.

## Give a location a picture

With the [places plugin](/docs/reference/plugins/places), give the location an `image` for one picture, or a `picture` for layers and hotspots. A location's hotspot sends a `command`. The showcase café shows Ava at the counter while she's there, and clicking her talks to her:

```ts
import { cast } from '@ifloom/plugin-cast'
import { places } from '@ifloom/plugin-places'

export const cafe = places.location({
  id: 'cafe',
  name: 'The Corner Café',
  exits: ['high-street'],
  picture: {
    aspect: '16/10',
    layers: [{ id: 'counter', src: 'photo/ava.svg', when: cast.here('ava') }],
    hotspots: [{ id: 'ava', rect: [36, 22, 28, 44], label: 'Talk to Ava', command: cast.talk('ava'), layer: 'counter' }],
  },
  body: [{ text: 'Six tables, one of them wobbly.' }],
})
```

`layer: 'counter'` hides the hotspot while that layer isn't shown.

## Add a video

Name an `.mp4` or `.webm` file wherever a picture goes, or write `[[video:clips/kettle]]` in words. A clip plays by itself, loops, is muted and has no controls, as a GIF does. The [video flags](/docs/reference/prose#videos) change that, in markup or on a `{ media }` block or a layer:

```ts fragment
{ media: { src: 'clips/high-street.mp4', controls: true, sound: true, poster: 'clips/high-street-still', alt: 'The high street on market day' } }
```

Browsers refuse to start a clip with sound by itself, so give one with `sound` the `controls` flag, and the player presses play. The React UI's clips follow the game's mute and volume settings.

## Check it worked

Run `npm run check`. It lists every picture and clip the game names that isn't in `public/art/`, and reports an unknown pool, a tag no file in the pool has, and a hotspot whose choice the scene lacks. Then play in `npm run dev`. In the React UI, clicking a picture or a clip opens it large in the [`MediaViewer`](/docs/reference/react/components#mediaviewer). Pass `viewer: false` to `mountGame` to turn that off.

## Variations

**A placeholder for art that isn't made yet.** A labelled box is easier to spot than a gap. Replace the picture with one when its file fails to load:

```css
.art-placeholder { display: grid; place-items: center; aspect-ratio: 16 / 9; border: 2px dashed #bbb; color: #888; font: 0.85rem monospace; }
```

```ts tab="Plain JS" tab-group="framework"
// src/picture.ts: use it where the vanilla template makes an <img>.
export function picture(src: string, alt = ''): HTMLElement {
  const img = document.createElement('img')
  img.src = src
  img.alt = alt
  img.onerror = () => {
    const box = document.createElement('div')
    box.className = 'art-placeholder'
    box.setAttribute('role', 'img')
    box.setAttribute('aria-label', alt)
    box.textContent = alt || src
    img.replaceWith(box)
  }
  return img
}
```

```tsx tab="React" tab-group="framework"
// src/components.tsx: pass it to mountGame as `components`.
import { useState } from 'react'
import type { Components } from '@ifloom/react'

export const components: Components = {
  Picture: function Placeholder({ Default, ...props }) {
    const [missing, setMissing] = useState<string>()
    if (props.src && missing === props.src) {
      return (
        <div className="art-placeholder" role="img" aria-label={props.alt}>
          {props.alt || props.src}
        </div>
      )
    }
    return <Default {...props} onError={(event) => { setMissing(props.src); props.onError?.(event) }} />
  },
}
```

```vue tab="Vue" tab-group="framework"
<!-- src/Picture.vue: use it in Beat.vue in place of the <img>. -->
<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ src: string; alt?: string }>()
const missing = ref<string>()
</script>

<template>
  <div v-if="missing === props.src" class="art-placeholder" role="img" :aria-label="props.alt">{{ props.alt || props.src }}</div>
  <img v-else :src="props.src" :alt="props.alt ?? ''" @error="missing = props.src" />
</template>
```

Every picture the React UI renders is a `Picture`, so the replacement covers scenes, portraits, notices and layered pictures. Render the built-in one through `Default`, since importing `Picture` from `@ifloom/react` inside the replacement gives you the replacement again.

**Pictures a player can turn off.** Name a toggle setting in the game's `ui.settings.images` hint, and the React UI leaves the story's pictures and clips out while it's off, as [Add a settings page](/docs/how-to/add-a-settings-page#apply-it-to-the-whole-page) shows.

For more, see:

- [Media](/docs/reference/media), with [`PictureDef`](/docs/reference/media#picturedef), [`HotspotDef`](/docs/reference/media#hotspotdef) and [`PoolFile`](/docs/reference/media#poolfile).
- [`SceneMedia`](/docs/reference/scenes#scenemedia) and the [image markup](/docs/reference/prose#images).
- [Render pictures and play sound](/docs/how-to/render/pictures-and-sound), for a UI of your own.
