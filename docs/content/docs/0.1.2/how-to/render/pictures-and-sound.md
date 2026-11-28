---
title: "Render pictures and play sound"
description: "Render a scene's layered picture with its hotspots, and play the game's music, sounds and voices, in a UI of your own."
---
Render a scene's [picture](/docs/0.1.2/reference/glossary#picture), its layers and hotspots, and play the game's music, sounds and voiced lines. Set up the runner first, as [Start your own UI](/docs/0.1.2/how-to/render/start) shows. A picture or a clip inside the prose is a beat, which [Render the scene](/docs/0.1.2/how-to/render/scene#render-the-scene) covers.

## Render the scene's picture

`view.scene.picture` holds the scene's layered picture as a [`PictureView`](/docs/0.1.2/api/engine#pictureview), and `view.scene.image` a single picture when the scene has no layers. The React UI's `Scene` renders the picture above the words with [`LayeredPicture`](/docs/0.1.2/api/react#layeredpicture), which you can also place yourself.

```ts tab="Plain JS" tab-group="framework"
import type { PictureView, RunnerSnapshot } from '@ifloom/engine'
// runner and add, as in the vanilla template's src/main.ts.
import { add, runner } from './runner.ts'

/** The scene's layered picture, else its image. */
export function drawPicture(parent: HTMLElement, { view }: RunnerSnapshot): void {
  if (view.scene.picture) drawLayers(parent, view.scene.picture)
  else if (view.scene.image) Object.assign(add(parent, 'img'), { src: view.scene.image, alt: '' })
}

/** Layers stacked bottom first, with each hotspot a button placed by its rect, in percent of the picture. */
function drawLayers(parent: HTMLElement, picture: PictureView): void {
  const box = add(parent, 'div', '', 'picture')
  Object.assign(box.style, { position: 'relative', aspectRatio: picture.aspect ?? 'auto' })
  for (const layer of picture.layers) {
    const shown = add(box, layer.video ? 'video' : 'img')
    Object.assign(shown, { src: layer.src, alt: '' })
    Object.assign(shown.style, { position: 'absolute', inset: '0', width: '100%', height: '100%' })
  }
  for (const hotspot of picture.hotspots) {
    const [left, top, width, height] = hotspot.rect
    const button = add(box, 'button', '', 'hotspot')
    button.setAttribute('aria-label', hotspot.label)
    button.title = hotspot.disabled ?? hotspot.label
    button.disabled = Boolean(hotspot.disabled)
    Object.assign(button.style, { position: 'absolute', left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` })
    button.onclick = () => runner.apply(hotspot.command)
  }
}
```

```tsx tab="React" tab-group="framework"
import { LayeredPicture, Picture, useGame } from '@ifloom/react'

// Scene renders the scene's picture above its words. To put it somewhere else, render it from the view yourself:
// LayeredPicture stacks the layers and places each hotspot as a button.
export function ScenePicture() {
  const { view } = useGame()
  if (view.scene.picture) return <LayeredPicture picture={view.scene.picture} />
  return view.scene.image ? <Picture src={view.scene.image} alt="" /> : null
}
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import { runner, view } from './runner.ts'

// The scene's layered picture, else its image: layers stacked bottom first, and each hotspot a button placed by its rect, in percent.
const fill = { position: 'absolute', inset: '0', width: '100%', height: '100%' } as const
const at = ([left, top, width, height]: [number, number, number, number]) =>
  ({ position: 'absolute', left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }) as const
</script>

<template>
  <div v-if="view.scene.picture" class="picture" :style="{ position: 'relative', aspectRatio: view.scene.picture.aspect ?? 'auto' }">
    <template v-for="(layer, index) in view.scene.picture.layers" :key="index">
      <video v-if="layer.video" :src="layer.src" :style="fill" autoplay loop muted />
      <img v-else :src="layer.src" alt="" :style="fill" />
    </template>
    <button
      v-for="hotspot in view.scene.picture.hotspots"
      :key="hotspot.id"
      class="hotspot"
      :aria-label="hotspot.label"
      :title="hotspot.disabled ?? hotspot.label"
      :disabled="Boolean(hotspot.disabled)"
      :style="at(hotspot.rect)"
      @click="runner.apply(hotspot.command)"
    />
  </div>
  <img v-else-if="view.scene.image" :src="view.scene.image" alt="" />
</template>
```

Stack the `layers` bottom first. A layer with `video` set is a clip rather than a picture. The engine lists only the layers whose `when` holds and resolves a pool's pick, so render each layer in the list. Put each of the `hotspots` over the layers as a button, placed by its `rect`, the left, top, width and height in percent of the picture. A hotspot is a [`HotspotView`](/docs/0.1.2/api/engine#hotspotview), greyed out with `disabled` like any button, and it sends its `command`.

The places plugin gives a location's picture in its own view, and [Render the calendar, locations and people](/docs/0.1.2/how-to/render/world-plugins) renders it the same way.

## Play sound

`view.audio` holds what each channel should play and the sounds that are due, as an [`AudioView`](/docs/0.1.2/api/engine#audioview), and the audio player plays it. The React UI's `mountGame` plays the game's sound itself, and `Scene` puts a replay button on each spoken line with a voice.

```ts tab="Plain JS" tab-group="framework"
import { startAudio } from '@ifloom/audio'
import { audioSrc, type RunnerSnapshot } from '@ifloom/engine'
// runner and add, as in the vanilla template's src/main.ts.
import { add, runner } from './runner.ts'

// Once, beside the runner: plays what view.audio asks for, from the player's first click or key press.
// Keep the player it returns to play a file on demand.
const player = startAudio(runner)

/** A Play again button for each spoken line in the scene that has a voice. */
export function drawVoices(parent: HTMLElement, { view }: RunnerSnapshot): void {
  for (const beat of view.scene.beats) {
    if (beat.type !== 'say' || !beat.voice) continue
    // The voice names a track in the game's audio.tracks: a file, or a playlist, which has no one file to play.
    const track = runner.game.audio?.tracks[beat.voice]
    if (track && 'src' in track) add(parent, 'button', 'Play again').onclick = () => player.play(audioSrc(track.src), 'voice', track.volume ?? 1)
  }
}
```

```tsx tab="React" tab-group="framework"
import { useAudio } from '@ifloom/react'

// mountGame plays the game's sound, and Scene puts a replay button on each spoken line with a voice.
// To give the player options, place useAudio once in your layout: it takes over from mountGame's player.
export function SoundLog() {
  // Each thing the player does, as a line in the console.
  useAudio({ log: console.debug })
  return null
}
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import { computed } from 'vue'
import { audioSrc } from '@ifloom/engine'
import { player, runner, view } from './runner.ts'

// The vue template's runner.ts starts the player once, beside the runner: `export const player = startAudio(runner)`.
// A Play again button for each spoken line in the scene that has a voice.
const voices = computed(() => view.value.scene.beats.flatMap((beat) => (beat.type === 'say' && beat.voice ? [beat.voice] : [])))

function replay(voice: string) {
  // The voice names a track in the game's audio.tracks: a file, or a playlist, which has no one file to play.
  const track = runner.game.audio?.tracks[voice]
  if (track && 'src' in track) player.play(audioSrc(track.src), 'voice', track.volume ?? 1)
}
</script>

<template>
  <button v-for="(voice, at) in voices" :key="at" @click="replay(voice)">Play again</button>
</template>
```

Start [`startAudio`](/docs/0.1.2/api/audio#startaudio) once, beside the runner, never inside a component that comes and goes. It follows the runner rather than your components, so it plays the same whatever renders the page. Nothing plays until the player first clicks or presses a key, because browsers allow no sound sooner. Pass `{ log: console.debug }` to see each thing the player does in the console.

The player sets each channel's volume from the ui setting the game's `audio` names for it, so a volume slider on your settings screen works with no code of yours. A spoken line with a voice is a `say` beat with `voice`, a track id. To play it again, look the track up in the game's `audio.tracks` and call the player's [`play`](/docs/0.1.2/api/audio#audioplayer) with its file, through `audioSrc`.

For more on what these sections render, see:

- [Media](/docs/0.1.2/reference/media) and [Audio](/docs/0.1.2/reference/audio).
- [The audio player](/docs/0.1.2/api/audio).
- [Add pictures and backgrounds](/docs/0.1.2/how-to/add-pictures-and-backgrounds) and [Add music and sound](/docs/0.1.2/how-to/add-music-and-sound).
