---
title: "Add music and sound"
description: "Give a game music, ambience, one-shot sounds and voiced lines, and play them with the audio player in plain JS, React or Vue."
---
Use this to give your game music, background sound, one-shot sounds and voiced lines. Your content lists the tracks and says when each plays. The engine works out what should be playing and lists it in `view.audio`, and the [audio player](/docs/0.1.0/reference/browser/audio-player), `@ifloom/audio`, plays it in the browser.

## Put the files in public/audio

Put every sound file in your game's `public/audio/` folder. A track names its file by its path under `audio/`, and a bare name is an `.ogg`: `'music/calm'` is `public/audio/music/calm.ogg`. `ifloom build` copies `public/` beside the page. Ship the `audio/` folder with the game, since `--inline-assets` puts pictures into the page but never sound.

## Declare the tracks

List each file in your content's `audio.tracks` by id, with the channel it plays on. Declare a volume setting for each channel and a mute box, as `ui` [settings](/docs/0.1.0/reference/settings) the player changes:

```ts
import type { Content } from '@ifloom/engine'

export const sound: Content = {
  settings: [
    { id: 'musicVolume', label: 'Music', affects: 'ui', type: 'range', min: 0, max: 100, default: 70 },
    { id: 'sfxVolume', label: 'Sounds', affects: 'ui', type: 'range', min: 0, max: 100, default: 90 },
    { id: 'muted', label: 'Mute', affects: 'ui', type: 'toggle', default: false },
  ],
  audio: {
    tracks: {
      calm: { src: 'music/calm.ogg', channel: 'music' },
      evening: { src: 'music/evening.ogg', channel: 'music', volume: 0.8 },
      radio: { playlist: ['calm', 'evening'], order: 'shuffle' },
      'cafe.murmur': { src: 'cafe-murmur.ogg', channel: 'ambience' },
      knock: { src: 'knock.ogg' },
      'ava.hello': { src: 'voice/ava-hello.ogg', channel: 'voice' },
    },
    channels: {
      music: { mode: 'background', volume: 'musicVolume' },
      sfx: { mode: 'cue', volume: 'sfxVolume' },
    },
    mute: 'muted',
    default: { music: 'calm' },
  },
}
```

The game has four channels without declaring any. `music` and `ambience` are background channels, which play one track or playlist until it changes. `sfx` and `voice` are cue channels, which play each sound once. A track with no `channel` plays on `sfx`. `default` is the music that plays when nothing else names a track.

## Change the music

Name a background track wherever the music should change:

- **A scene's `audio`** plays while the scene is open, such as `audio: { music: 'evening' }`. `{ music: null }` is silence, and the music comes back when the scene closes.
- **The [`audio` effect](/docs/0.1.0/reference/effects#audio)** puts a track on a channel until another changes it, and the save keeps it: `{ audio: 'music', to: 'radio' }`.
- **A location's `audio`**, with the [places plugin](/docs/0.1.0/reference/plugins/places), plays while the player is there.

The open scene wins over an `audio` effect, which wins over the location, which wins over `default`. The café has a murmur of its own:

```ts
import { places } from '@ifloom/plugin-places'

export const cafe = places.location({
  id: 'cafe',
  name: 'The Corner Café',
  exits: ['high-street'],
  body: [{ text: 'Six tables, one of them wobbly.' }],
  audio: { ambience: 'cafe.murmur' },
})
```

## Play a sound or a voiced line

Play a one-shot sound with the [`sound` effect](/docs/0.1.0/reference/effects#sound), on a choice or an action: `{ sound: 'knock' }`. In a scene's words, `[[sound:knock]]` plays it while the scene is on screen, and `[[voice:ava.hello]]` after a spoken line voices it:

```ts
import type { DataScene } from '@ifloom/engine'

export const hello: DataScene = {
  id: 'ava.hi',
  speaker: 'ava',
  body: [{ text: '@ava: "Hi! You must be the new neighbour." [[voice:ava.hello]]' }],
  choices: [{ id: 'bye', label: 'Leave her to it', effects: [{ scene: null }] }],
}
```

Each sound plays once. Entering the scene again plays its sounds again, and loading a save doesn't replay old ones. A voice always goes to the `voice` channel, where each line waits for the one before it. A location's words don't cue sounds, so use its `audio`, or a `sound` effect on the action that brings the player there.

## Start the audio player

The React UI's `mountGame` starts the player when the game lists any tracks, and its settings page renders the volume and mute settings. With a UI of your own, call [`startAudio`](/docs/0.1.0/reference/browser/audio-player#startaudio) once, beside the runner. The `vanilla` and `vue` templates already do:

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

Nothing plays until the player first clicks or presses a key, because browsers allow no sound sooner. Then the music for where the player is starts. A game with a start button of its own calls the player's `unlock()` from its handler. Start only one player per runner, or everything plays twice. In React, `useAudio` takes over from `mountGame`'s player instead of adding a second.

The player reads each channel's volume from the setting its `volume` names, so moving a slider changes the volume at once. It reads a range from its `min` to its `max` as 0 to 1, times the track's own `volume`. For a box ticked for sound, name it in `audio.sound` instead of `mute`.

## Check it worked

Run `npm run check`. It lists every track's file that isn't in `public/audio/`, and reports a track, a channel or a setting that content names and the game lacks. Then play in `npm run dev` and pass `{ log: console.debug }` to `startAudio`, or `audio: { log: console.debug }` to `mountGame`. The browser's console shows each thing the player does:

```text
started, 0 cues already heard; waiting for a click or key press
unlocked
music: play audio/music/calm.ogg
sfx: play cue:1234:1 knock
```

A `play refused` line is the browser saying no before the first click. The player tries refused music again on the next click.

## Variations

**Quieter music under a voice.** Give the music channel a `duck`, `{ mode: 'background', volume: 'musicVolume', duck: { under: ['voice'], to: 0.4 } }`, and it drops to 0.4 while a voiced line plays.

**Sound in the opening scene.** The player counts every sound already in the view as heard when it starts, so the first scene's `[[sound:…]]` doesn't play. Start that sound from a choice, or put music on its channel, which plays as soon as sound is unlocked.

**No sound in the React UI.** Pass `audio: false` to `mountGame` for a game that plays sound some other way.

For more, see:

- [Audio](/docs/0.1.0/reference/audio), with [`GameAudio`](/docs/0.1.0/reference/audio#gameaudio), [`TrackDef`](/docs/0.1.0/reference/audio#trackdef), [`PlaylistDef`](/docs/0.1.0/reference/audio#playlistdef) and [`ChannelDef`](/docs/0.1.0/reference/audio#channeldef).
- [The audio player](/docs/0.1.0/reference/browser/audio-player).
- The [sound and voice markup](/docs/0.1.0/reference/prose#sound-and-voice).
- [Render pictures and play sound](/docs/0.1.0/how-to/render/pictures-and-sound#play-sound), with a button that plays a voiced line again.
