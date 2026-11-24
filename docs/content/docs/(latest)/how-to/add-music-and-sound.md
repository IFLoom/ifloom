---
title: "Add music and sound"
description: "How-to for giving a game sound: the files in public/audio, tracks and playlists, music by default and per scene, a location's ambience, one-shot sounds and voiced lines, volume and mute settings, and starting the audio player in plain JS, React or Vue."
---
Use this to give your game music, background sound, one-shot sounds and voiced lines. Your content lists the tracks and says when each plays. The engine works out what should be playing and lists it in `view.audio`, and the [audio player](/docs/reference/browser/audio-player), `@ifloom/audio`, plays it in the browser.

## Put the files in public/audio

Put every sound file in your game's `public/audio/` folder. A track names its file by its path under `audio/`, and a bare name is an `.ogg`: `'music/calm'` is `public/audio/music/calm.ogg`. `ifloom build` copies `public/` beside the page. Ship the `audio/` folder with the game, since `--inline-assets` puts pictures into the page but never sound.

## Declare the tracks

List each file in your content's `audio.tracks` by id, with the channel it plays on. Declare a volume setting for each channel and a mute box, as `ui` [settings](/docs/reference/settings) the player changes:

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
- **The [`audio` effect](/docs/reference/effects#audio)** puts a track on a channel until another changes it, and the save keeps it: `{ audio: 'music', to: 'radio' }`.
- **A location's `audio`**, with the [places plugin](/docs/reference/plugins/places), plays while the player is there.

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

Play a one-shot sound with the [`sound` effect](/docs/reference/effects#sound), on a choice or an action: `{ sound: 'knock' }`. In a scene's words, `[[sound:knock]]` plays it while the scene is on screen, and `[[voice:ava.hello]]` after a spoken line voices it:

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

The React UI's `mountGame` starts the player when the game lists any tracks, and its settings page renders the volume and mute settings. With a UI of your own, call [`startAudio`](/docs/reference/browser/audio-player#startaudio) once, beside the runner. The `vanilla` and `vue` templates already do:

::include[../../../../snippets/plain/audio.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../snippets/react/audio.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../snippets/vue/Audio.vue]{meta='tab="Vue" tab-group="framework"'}

Nothing plays until the player first clicks or presses a key, because browsers allow no sound sooner. Then the music for where the player is starts. A game with a start button of its own calls the player's `unlock()` from its handler. Start only one player per runner, or everything plays twice. In React, `useAudio` takes over from `mountGame`'s player instead of adding a second.

The player reads each channel's volume from the setting its `volume` names, so moving a slider changes the volume at once. A range is read from its `min` to its `max` as 0 to 1, times the track's own `volume`. For a box ticked for sound, name it in `audio.sound` instead of `mute`.

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

- [Audio](/docs/reference/audio), with [`GameAudio`](/docs/reference/audio#gameaudio), [`TrackDef`](/docs/reference/audio#trackdef), [`PlaylistDef`](/docs/reference/audio#playlistdef) and [`ChannelDef`](/docs/reference/audio#channeldef).
- [The audio player](/docs/reference/browser/audio-player).
- The [sound and voice markup](/docs/reference/prose#sound-and-voice).
- [Render pictures and play sound](/docs/how-to/render/pictures-and-sound#play-sound), with a button that plays a voiced line again.
