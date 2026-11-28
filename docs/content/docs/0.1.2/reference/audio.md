---
title: "Audio"
description: "The tracks, playlists and channels a game declares, and the music and sounds the view lists for an audio player."
---
A game's audio is the tracks, playlists and channels it declares in its content's `audio`, which scenes, locations, effects and prose name by id. The engine plays nothing itself. It works out what each channel should play and which one-shot sounds are due, and lists them in `view.audio` for an audio player such as [`@ifloom/audio`](/docs/0.1.2/reference/browser/audio-player) to play. [Add music and sound](/docs/0.1.2/how-to/add-music-and-sound) gives the café music and a doorbell.

No example game declares audio, so [Add music and sound](/docs/0.1.2/how-to/add-music-and-sound) is the example.

```ts
import {
  audioSrc,
  type AudioChannelView, type AudioCue, type AudioState, type AudioView, type ChannelDef, type GameAudio, type PlaylistDef, type TrackDef,
} from '@ifloom/engine'
```

## GameAudio

The game's audio, declared in its content's `audio`. Every field is in [`GameAudio`](/docs/0.1.2/api/engine#gameaudio).

- **`tracks`** holds every [track](#trackdef) and [playlist](#playlistdef) by id.
- **`channels`** holds the game's [channels](#channeldef), merged over the four defaults field by field.
- **`default`** says what each background channel plays when nothing else names one.
- **`mute`** names a `ui` toggle [setting](/docs/0.1.2/reference/settings) that silences everything while it's on.
- **`sound`** names a `ui` toggle setting that plays sound only while it's on, so a settings page can offer whichever reads right. With both `mute` and `sound`, either one silences.

A game with no `audio` has no tracks, and `view.audio` lists no channels and no cues.

[`loadGame`](/docs/0.1.2/reference/content#loadgame) merges the content's and every pack's `audio`. A pack's track replaces one with the same id, a pack's channel is merged field by field, and its `mute`, `sound` and `default` entries win. This content gives the town calm music, a café murmur, a knock and a voiced line, with volume and mute settings:

```ts
import type { Content } from '@ifloom/engine'

export const sound: Content = {
  settings: [
    { id: 'musicVolume', label: 'Music', affects: 'ui', type: 'range', min: 0, max: 100, default: 70 },
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
    channels: { music: { mode: 'background', volume: 'musicVolume' } },
    mute: 'muted',
    default: { music: 'calm' },
  },
}
```

## TrackDef

One sound file the game ships, in `audio.tracks`. Every field is in [`TrackDef`](/docs/0.1.2/api/engine#trackdef).

`src` is the file, relative to the game's `public/audio/` folder, through [`audioSrc`](#audiosrc). A track plays on the `sfx` channel unless `channel` names another, so give music and ambience a `channel`, and the checker reports a track with none that a background placement names. `loop` is `true` unless set, and it matters only on a background channel. `volume` is the track's own, from 0 to 1, and 1 unless set.

## PlaylistDef

Several background tracks played one after another, in `audio.tracks`, named anywhere a background track can be. Every field is in [`PlaylistDef`](/docs/0.1.2/api/engine#playlistdef).

`order` says how the list plays:

| Key | Meaning |
|---|---|
| `'inOrder'` | The list plays once, then the channel is quiet. |
| `'loop'` | The list plays over and over. It's the default. |
| `'shuffle'` | The list plays over and over in an order drawn from the save's seed, the channel, the playlist's id and the turn it started playing. |

A shuffled order stays the same for as long as the playlist plays, and a [replay](/docs/0.1.2/reference/runner#replay) of the same commands draws the same order. In a shuffle, an entry can be `{ track, weight }` instead of a plain id, which weighs 1. The engine draws the order without replacement, the first track by weight from all of them, the next from the ones left, and so on. Every track still plays once in each pass, so weight only changes how early a track tends to come. This playlist puts `calm` first more often than not:

```ts fragment
radio: { playlist: [{ track: 'calm', weight: 3 }, 'evening', 'bandstand'], order: 'shuffle' }
```

## ChannelDef

A channel the game declares in `audio.channels`, which sets whether its sounds replace each other or overlap, and how they fade. Every field is in [`ChannelDef`](/docs/0.1.2/api/engine#channeldef).

A `'background'` channel plays one thing until it changes, and a `'cue'` channel plays each sound once, overlapping. `crossfade` is the milliseconds a background channel takes to fade from one track to the next. `volume` names a `ui` range setting for the channel's volume, and nothing has one until the game names it, so a game with no audio settings plays at full volume. `duck` quietens the channel to `to`, from 0 to 1, while any channel in `under` plays.

Every game has four channels, and the game's are merged over them field by field:

| Key | Meaning |
|---|---|
| `music` | A background channel with a crossfade of 1000. |
| `ambience` | A background channel with a crossfade of 600. |
| `sfx` | A cue channel, where a track with no `channel` plays. |
| `voice` | A cue channel, where every `[[voice:id]]` plays. |

A channel the game adds needs a `mode`, and a new background channel's crossfade is 1000 unless set. This ducks the music under a voice and adds a radio channel:

```ts fragment
channels: {
  music: { mode: 'background', volume: 'musicVolume', duck: { under: ['voice'], to: 0.4 } },
  radio: { mode: 'background', crossfade: 200 },
}
```

## Effects

### audio

Sets a background channel `to` a track or playlist, kept in the save, or silences it with `to: null`. The [`audio` effect](/docs/0.1.2/reference/effects#audio) entry has its rules.

### sound

Plays a track once on its own channel, kept among the save's last 20 cues. The [`sound` effect](/docs/0.1.2/reference/effects#sound) entry has its rules.

## State

### AudioState

The music and sounds a save keeps in [`state.audio`](/docs/0.1.2/reference/state#audio). Every field is in [`AudioState`](/docs/0.1.2/api/engine#audiostate).

`channels` holds what `audio` effects put on channels, and a channel not listed is left to the location and the default. `cues` holds the last 20 `sound` effects, each numbered by `seq`, the running count of them. `shown` counts every time a scene is entered, and `started` holds what each background channel is playing and the turn it started, which seeds a shuffle. The engine updates `started` after every command.

## View

### AudioView

The game's audio as [`view.audio`](/docs/0.1.2/reference/view#view) lists it, for an audio player to play. Every field is in [`AudioView`](/docs/0.1.2/api/engine#audioview).

`channels` holds every channel, background and cue, as an [`AudioChannelView`](#audiochannelview). `cues` holds every kept `sound` effect, oldest first, then the open scene's sound and voice beats in order, each an [`AudioCue`](#audiocue). `muteSetting` is `game.audio.mute` and `soundSetting` is `game.audio.sound`. The engine never reads the [profile](/docs/0.1.2/reference/profile), so the player reads those settings' values there itself. To play it, see [Play sound](/docs/0.1.2/how-to/render/pictures-and-sound#play-sound).

### AudioChannelView

One channel as `view.audio.channels` lists it, with what it plays now. Every field is in [`AudioChannelView`](/docs/0.1.2/api/engine#audiochannelview).

A background channel plays the first of these that names it:

1. The open scene's [`audio`](/docs/0.1.2/reference/scenes#audio).
2. An [`audio`](/docs/0.1.2/reference/effects#audio) effect, kept in the save.
3. A plugin's `audio` provider, such as the [places plugin](/docs/0.1.2/reference/plugins/places)'s for the location the player is at.
4. The game's `default`.

`null` at any of these is silence, and nothing below it is asked, so a scene that sets `{ music: null }` stops the music until it closes. `track` is always `null` on a cue channel. `src` is `null` for silence or an unknown track, and for a playlist it's the first file, with every file, volume and the played order in `playlist`. The player multiplies `volume` by the value of the setting `volumeSetting` names.

### AudioCue

One sound that's due, for a player to play once per `key`. Every field is in [`AudioCue`](/docs/0.1.2/api/engine#audiocue).

The engine works each key out from the state, so it's the same across view calls, after a choice that keeps the scene open, and after a save is loaded:

| Key | Meaning |
|---|---|
| `cue:<seed>:<count>` | A `sound` effect, numbered by its place in the running count. |
| `scene:<seed>:<showing>:<beat index>:<track>` | A scene's `[[sound:id]]` or `[[voice:id]]` beat, due while the scene is open. |

`<showing>` counts every time a scene is entered, so a scene entered again gets new keys and its sounds play again. Rendering the scene the player is already in, after a choice, isn't a new showing. A voice always plays on the `voice` channel.

## Functions

### audioSrc

Returns where a sound file is, relative to the page. Every parameter is in [`audioSrc`](/docs/0.1.2/api/engine#audiosrc).

It works as [`artSrc`](/docs/0.1.2/reference/prose#artsrc) does for pictures. The path goes under `audio/`, a leading `/` or `audio/` is dropped, and a name with no extension gets `.ogg`.

```ts
import { audioSrc } from '@ifloom/engine'

audioSrc('cafe-murmur.ogg') // 'audio/cafe-murmur.ogg'
audioSrc('/audio/knock.mp3') // 'audio/knock.mp3'
audioSrc('music/calm') // 'audio/music/calm.ogg'
```

## Checks

The [content checker](/docs/0.1.2/reference/checks) checks everything content names against `game.audio`. A background placement is a scene's `audio`, a location's `audio`, an `audio` effect or `game.audio.default`. A sound is a `sound` effect, `[[sound:id]]` or `[[voice:id]]`.

| Problem | Cause |
|---|---|
| `unknown track "…"` | A placement, a sound, markup or a playlist names a track that `game.audio.tracks` doesn't have. |
| `unknown channel "…"` | A placement names a channel that is neither declared nor one of the four defaults. |
| `channel "…" plays sounds, not background audio` | A placement names a cue channel, such as `sfx`. |
| `track "…" is a sound on channel "…", not background audio` | A placement or a playlist names a track on a cue channel. A track with no `channel` is on `sfx`. |
| `track "…" is background audio on channel "…", not a sound` | A sound names a track on a background channel, such as `music`. |
| `"…" is a playlist, not a sound` | A sound names a playlist. |
| `on undeclared channel "…"` | A track's `channel` names a channel the game doesn't have. |
| `volume is not between 0 and 1` | A track's `volume` is out of range. |
| `a playlist with no tracks` | A playlist's list is empty. |
| `"…" is a playlist; a playlist holds tracks` | A playlist names another playlist. |
| `"…" has a weight of …; a weight must be above 0` | A playlist entry's `weight` is 0 or less. |
| `"…" has a weight, but only a shuffled playlist uses weights` | A playlist entry has a `weight` in a playlist that doesn't shuffle. |
| `unknown setting "…"` | A channel's `volume`, `game.audio.mute` or `game.audio.sound` names a setting the game doesn't declare. |
| `setting "…" is not a ui range setting` | A channel's `volume` names a setting that isn't a `ui` range. |
| `setting "…" is not a ui toggle setting` | `game.audio.mute` or `game.audio.sound` names a setting that isn't a `ui` toggle. |
| `ducks under unknown channel "…"` | A channel's `duck.under` names a channel the game doesn't have. |
| `duck.to is not between 0 and 1` | A channel's `duck.to` is out of range. |
| `mode is not "background" or "cue"` | A channel's `mode` is neither. |

The checker reports these at `track <id>`, `channel <id>`, `audio` and `audio default`, or where the placement or sound is written. It also lists every track's file in its [`files`](/docs/0.1.2/reference/checks#fileref).

## Caveats

- Without a player such as `@ifloom/audio`, `view.audio` is only data, and nothing sounds.
- A `sound` effect stays in `state.audio.cues` until 20 newer ones push it out. A player that has just started marks every key it can see as heard, or loading a save would replay old sounds.
- `[[sound:id]]` in a location's body becomes a beat but no cue, because only an open scene has showings. Use the location's `audio`, or a `sound` effect on arrival.
- A mod that removes a track leaves `track` set and `src` null, so the channel is silent. The checker reports the track first.
- `volume`, `mute` and `sound` name `ui` settings, which the [profile](/docs/0.1.2/reference/profile) keeps and the state never does, so they don't change the game.
