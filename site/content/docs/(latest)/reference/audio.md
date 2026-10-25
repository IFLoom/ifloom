---
title: "Audio"
description: "Tracks, playlists and channels, what plays on a background channel, sounds and voices, and the volume settings."
---
You give a game sound by listing its tracks in `game.audio` and naming them from content: a scene's `audio`, a place's `audio`, the [`audio`](/docs/reference/effects#audio) and [`sound`](/docs/reference/effects#sound) effects, and the [`[[sound:id]]` and `[[voice:id]]` markup](/docs/reference/prose#sound-and-voice). The engine never plays anything itself. It works out what should be playing on each channel and which one-shot sounds are due, and puts that in [`view.audio`](/docs/reference/view#audio). The [audio player](/docs/browser/audio-player), `@ifloom/audio`, reads that and does the playing in the browser. The [React UI](/docs/react#sound) starts it for you.

```ts
import {
  audioSrc,
  type AudioChannelView,
  type AudioCue,
  type AudioState,
  type AudioView,
  type ChannelDef,
  type GameAudio,
  type PlaylistDef,
  type TrackDef,
} from '@ifloom/engine'
```

## A worked example

Say you gave the showcase's town sound: calm music by default, a murmur of its own in the café, a knock when you get back to the flat, and Ava's first line read aloud. (Small Town itself has no audio yet.)

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
      buzz: { src: 'phone-buzz.ogg' },
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

The café names its ambience in its [location](/docs/plugins/places#the-location-trait):

```ts
{ id: 'cafe', name: 'The Corner Café', /* ... */ audio: { ambience: 'cafe.murmur' } }
```

The knock is a `sound` effect on arriving at the flat, and Ava's line carries its voice in the prose:

```ts
{ sound: 'knock' }
```

```md
@ava: "Hi! You must be the new neighbour." [[voice:ava.hello]]
```

Then the view says what's due:

```ts
view(state, game).audio
// {
//   channels: {
//     music: { mode: 'background', track: 'calm', src: 'audio/music/calm.ogg', loop: true, volume: 1,
//              volumeSetting: 'musicVolume', crossfade: 1000, duck: null },
//     ambience: { mode: 'background', track: 'cafe.murmur', src: 'audio/cafe-murmur.ogg', ... },
//     sfx: { mode: 'cue', track: null, src: null, ... },
//     voice: { mode: 'cue', track: null, src: null, ... },
//   },
//   cues: [{ key: 'cue:1234:1', channel: 'sfx', track: 'knock', src: 'audio/knock.ogg', volume: 1 }],
//   muteSetting: 'muted',
// }
```

## GameAudio

```ts
type GameAudio = {
  tracks: Record<string, TrackDef | PlaylistDef>
  channels?: Record<string, ChannelDef>
  mute?: string
  default?: Record<string, string>
}
```

`game.audio`. Leave it out and the game has no audio, and `view.audio` is empty.

| Field | What it holds |
|---|---|
| `tracks` | Every track and playlist, by id. Content names them by these ids. |
| `channels` | Your channels, merged over the [defaults](#channels) field by field. |
| `mute` | A `ui` [setting](/docs/reference/settings) of kind `toggle` that mutes everything while it's on. |
| `default` | What each background channel plays when nothing else says, by channel. |

Your [content](/docs/reference/loader#content) and packs can carry `audio` too. A pack's track or channel replaces one with the same id (a channel is merged field by field), and its `mute` and `default` entries win.

## TrackDef

```ts
type TrackDef = { src: string; channel?: string; loop?: boolean; volume?: number }
```

One sound file.

| Field | What it does | Default |
|---|---|---|
| `src` | The file, relative to the game's `public/audio/` folder. It goes through [`audioSrc`](#audiosrc). [`ifloom check`](/docs/cli#ifloom-check) reports a file that isn't there. | |
| `channel` | The channel it belongs to. A `sound` effect and `[[sound:id]]` play it there. A background channel only takes tracks whose channel is a background one. | `'sfx'` |
| `loop` | Whether it repeats while it's on a background channel. | `true` |
| `volume` | Its own volume, from 0 to 1. | `1` |

Give music and ambience a `channel`. A track with none is a sound effect, and the loader reports it if you put it on the music channel.

## PlaylistDef

```ts
type PlaylistDef = {
  playlist: (string | { track: string; weight?: number })[]
  order?: 'inOrder' | 'loop' | 'shuffle'
}
```

Several background tracks played one after another. Name it anywhere you'd name a background track.

| `order` | What happens |
|---|---|
| `'inOrder'` | The list plays once, then the channel is quiet. |
| `'loop'` (the default) | The list plays over and over. |
| `'shuffle'` | The list plays over and over in an order drawn from the save's seed. |

A shuffled order is drawn from the seed, the channel, the playlist's id and the turn it started playing (kept in [`state.audio.started`](#audiostate)). It stays the same for as long as the playlist plays, and a [replay](/docs/reference/runner#replay) of the same commands draws the same order.

### Weights in a shuffle

In a shuffled playlist, an entry can be `{ track, weight }` instead of a plain id, to make a track more likely to come early in the order:

```ts
tracks: {
  calm: { src: 'music/calm.ogg', channel: 'music' },
  evening: { src: 'music/evening.ogg', channel: 'music', volume: 0.8 },
  bandstand: { src: 'music/bandstand.ogg', channel: 'music' },
  // calm comes first more often than not, then the other two in either order.
  radio: { playlist: [{ track: 'calm', weight: 3 }, 'evening', 'bandstand'], order: 'shuffle' },
}
```

A plain id weighs 1. The order is drawn without replacement: the first track by weight from all of them, the next by weight from the ones left, and so on. Every track still plays once in each pass, and weight only changes how early it tends to come.

A playlist whose entries all weigh 1 shuffles exactly as it would with plain ids. Weights only mean something in a `'shuffle'` playlist. The loader reports a weight on a playlist that doesn't shuffle, and a weight of 0 or less.

## ChannelDef

```ts
type ChannelDef = {
  mode: 'background' | 'cue'
  crossfade?: number
  volume?: string
  duck?: { under: string[]; to: number }
}
```

| Field | What it does |
|---|---|
| `mode` | `'background'` plays one thing until it changes. `'cue'` plays each sound once, and sounds can overlap. |
| `crossfade` | Milliseconds to fade from one track to the next, on a background channel. |
| `volume` | A `ui` setting of kind `range` that sets this channel's volume. |
| `duck` | Quieten this channel to `to` (0 to 1) while any channel in `under` is playing. Off unless you declare it. |

### Channels

Every game has four channels, and yours are merged over them:

| Channel | `mode` | `crossfade` |
|---|---|---|
| `music` | `'background'` | 1000 |
| `ambience` | `'background'` | 600 |
| `sfx` | `'cue'` | |
| `voice` | `'cue'` | |

A channel you add needs a `mode`. A new background channel's crossfade is 1000 if you don't give one. Nothing has a volume setting until you name one, so a game with no audio settings plays at full volume.

```ts
channels: {
  music: { mode: 'background', volume: 'musicVolume', duck: { under: ['voice'], to: 0.4 } },
  radio: { mode: 'background', crossfade: 200 },
}
```

## What plays on a background channel

Each background channel plays the first of these that names it:

1. The open scene's [`audio`](/docs/reference/scenes#datascene).
2. An [`audio` effect](/docs/reference/effects#audio), kept in the save.
3. A plugin's [`audio` provider](/docs/reference/plugins#audio), such as the place the player is at.
4. The game's `default`.

`null` at any of these levels is silence, and nothing below it is asked. A scene that sets `{ music: null }` stops the music while it's open, and the music comes back when it closes. A level that doesn't name a channel passes it down.

## Sounds and voices

A one-shot sound is a cue. Cues come from two places:

- **A [`sound` effect](/docs/reference/effects#sound).** The state keeps the last 20 in `state.audio.cues`, each with its number in a running count.
- **The open scene's `[[sound:id]]` and `[[voice:id]]` beats.** They're due while the scene is open. A voice always goes to the `voice` channel.

Each cue has a `key`, and a player plays each key once. The keys are worked out from the state, so they're the same across view calls, after a choice that keeps the scene open, and after a save is loaded:

| Cue | Key |
|---|---|
| A `sound` effect | `cue:<seed>:<count>` |
| A scene's sound or voice beat | `scene:<seed>:<showing>:<beat index>:<track>` |

`<showing>` counts every time a scene is entered (`state.audio.shown`), so a scene entered again gets new keys and its sounds play again. Redrawing the scene you're already in, after a choice, isn't a new showing.

## AudioView

```ts
type AudioView = {
  channels: Record<string, AudioChannelView>
  cues: AudioCue[]
  muteSetting: string | null
}
```

[`view.audio`](/docs/reference/view#audio). `channels` has every channel, background and cue, and `cues` has every effect cue kept, oldest first, then the open scene's beats in order. `muteSetting` is `game.audio.mute`. The engine never reads the [profile](/docs/reference/profile), so the player reads the setting's value there itself.

### AudioChannelView

```ts
type AudioChannelView = {
  mode: 'background' | 'cue'
  track: string | null
  src: string | null
  loop: boolean
  volume: number
  volumeSetting: string | null
  crossfade: number
  duck: { under: string[]; to: number } | null
  playlist?: { tracks: string[]; srcs: string[]; volumes: number[]; order: 'inOrder' | 'loop' | 'shuffle' }
}
```

| Field | What it holds |
|---|---|
| `track` | The track or playlist chosen. Null for silence, and always null on a cue channel. |
| `src` | Its file, or a playlist's first file. Null for silence or an unknown track. |
| `loop` | Whether it repeats. For a playlist, whether the list repeats. |
| `volume` | The track's own volume, or a playlist's first track's. The player multiplies it by the setting's value. |
| `volumeSetting` | The channel's `volume` setting id, or null. |
| `crossfade` | The channel's crossfade. 0 on a cue channel. |
| `duck` | The channel's `duck`, or null. |
| `playlist` | For a playlist, its tracks, files and volumes in playing order, already shuffled if it shuffles. |

### AudioCue

```ts
type AudioCue = { key: string; channel: string; track: string; src: string; volume: number }
```

One sound that's due. Play it once per `key`.

## AudioState

```ts
type AudioState = {
  channels: Record<string, string | null>
  cues: { seq: number; track: string }[]
  seq: number
  shown: number
  started: Record<string, { track: string; turn: number }>
}
```

`state.audio`, part of the save.

| Field | What it holds |
|---|---|
| `channels` | What `audio` effects have put on channels. A channel not listed is left to the place and the default. |
| `cues` | The last 20 `sound` effects. |
| `seq` | How many `sound` effects there have been. |
| `shown` | How many times a scene has been entered. |
| `started` | What each background channel is playing and the turn it started. The engine updates it after every command. |

## audioSrc

```ts
function audioSrc(path: string): string
```

Where a sound file is, relative to the page. Works like [`artSrc`](/docs/reference/prose#artsrc): the path goes under `audio/`, a leading `/` or `audio/` is dropped, and a name with no extension is an `.ogg`.

```ts
audioSrc('cafe-murmur.ogg')   // 'audio/cafe-murmur.ogg'
audioSrc('/audio/knock.mp3')  // 'audio/knock.mp3'
audioSrc('music/calm')        // 'audio/music/calm.ogg'
```

## Checks

The [content checker](/docs/reference/checks) checks everything audio names. The list is under [Audio](/docs/reference/checks#audio). It also lists every track's file in [`files`](/docs/reference/checks#fileref).

## Gotchas

- **The engine plays nothing.** Without a player such as [`@ifloom/audio`](/docs/browser/audio-player), `view.audio` is only data.
- **A sound effect is kept, a scene's sound isn't.** A `sound` effect stays in `state.audio.cues` until 20 newer ones push it out, so a player that has just started marks every key it can see as already heard. Otherwise loading a save would replay old sounds.
- **A room's prose doesn't cue.** `[[sound:id]]` in a [place's](/docs/plugins/places) body becomes a beat but no cue, because only an open scene has showings. Use the place's `audio`, or a `sound` effect on arrival.
- **An unknown track is silence at runtime.** A mod that removes a track leaves `track` set and `src` null. The loader reports it first.
- **`volume` and `mute` name `ui` settings.** They live in the [profile](/docs/reference/profile), never in the state, so they don't change the game.

## See it in an example

None of the examples declares tracks, playlists or channels yet.
