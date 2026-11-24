---
title: "The audio player"
description: "The audio player in @ifloom/audio, which plays view.audio in the browser with plain audio elements."
---
`@ifloom/audio` plays a game's sound in the browser. The engine works out what should be playing in [`view.audio`](/docs/reference/audio#audioview) and plays nothing itself, and the audio player follows a runner and plays it with the browser's own `HTMLAudioElement`. It needs no framework and no build step, and it works from a page opened from disk. [Add music and sound](/docs/how-to/add-music-and-sound) declares the tracks it plays, and [Play sound](/docs/how-to/render/pictures-and-sound#play-sound) starts it in each framework.

None of the examples has any sound yet. The `vanilla`, `vue` and `svelte` templates start the player in `src/main.ts` or `src/runner.ts`.

```ts
import { startAudio, type AudioLike, type AudioOptions, type AudioPlayer } from '@ifloom/audio'
```

The package imports only `@ifloom/engine`, and `@ifloom/react` takes it as a peer dependency. A track's `src` is read through [`audioSrc`](/docs/reference/audio#audiosrc), so `{ src: 'music/calm.ogg' }` is the file `public/audio/music/calm.ogg`, and [`ifloom check`](/docs/reference/cli#ifloom-check) reports one that's missing.

## startAudio

`startAudio` starts playing a runner's sound and follows the runner until you stop it. Its signature is in [`startAudio`](/docs/api/audio#startaudio).

It reads `runner.view().audio` at the start and again after every change of state, and does this with each part:

- **Background channels**, such as `music` and `ambience`, play one file each. When the file changes, the old one fades out while the new one fades in, over the channel's `crossfade` in milliseconds. A command that leaves the file as it was doesn't restart it, and a track loops when its `loop` says so.
- **Playlists** play their files in the order the view gives, each after the last ends. A `loop` or `shuffle` playlist goes back to the start after the last file, and an `inOrder` playlist stops there.
- **Cues**, the one-shot sounds, play once per [`key`](/docs/reference/audio#audiocue). Cues on one channel overlap, except on the `voice` channel, where each line waits for the one before it to finish.
- **Volume** is the track's own `volume`, times the channel's volume setting, times 0 while the game is muted.
- **Ducking** quietens a channel while a sound plays on another, only on a channel whose [`duck`](/docs/reference/audio#channeldef) the game declares. The channel goes down while that sound plays and comes back up when it ends, over 300 ms each way.

```ts
import { browserRunner } from '@ifloom/browser'
import { startAudio } from '@ifloom/audio'
import module from './game.ts'

const runner = await browserRunner(module.build().game)
const player = startAudio(runner)
```

The React UI's `GameShell` and `mountGame` start the player when [`game.audio`](/docs/reference/audio#gameaudio) lists any tracks. A UI of your own calls `startAudio` once, after it makes the runner.

### The first click

Browsers let a page play sound only after the player has done something on it. The audio player starts silent and waits for the first `pointerdown` or `keydown` on `root`. It then plays everything that is due, such as the music for the location the player is at and any cue that came up in the meantime. A game with its own start button, or one inside a frame that gets the click, calls [`unlock`](#audioplayer) from its own handler. When the browser still refuses the music, such as after an `unlock` that no click caused, the player tries it again on the next click or key press.

### Cues played once

The player remembers every cue key it has played. At the start it counts each key already in the view as heard, so a reloaded page or a save loaded at the start doesn't replay a knock from three turns ago. It tells play apart from a jump. After one more command, the new cues play. After a load, a new game, an undo or a redo, the `sound` effects kept in the save count as heard, and the sounds and voices of the scene now on screen still play once.

### Volume and mute

The player reads each volume from the ui [setting](/docs/reference/settings) that `game.audio` names for the channel. It reads a range setting from its `min` to its `max` as 0 to 1, so 70 on a 0 to 100 slider is 0.7. It reads the values from [`runner.snapshot().settings`](/docs/reference/runner#settings) and follows the runner, so a slider on the settings screen changes the volume at once. It uses the setting's `default` until the player stores a value, when the stored value no longer fits the setting, and when the runner has no profile.

```ts fragment
settings: [
  { id: 'musicVolume', label: 'Music', affects: 'ui', type: 'range', min: 0, max: 100, default: 70 },
  { id: 'muted', label: 'Mute', affects: 'ui', type: 'toggle', default: false },
],
audio: {
  tracks: { calm: { src: 'music/calm.ogg', channel: 'music', volume: 0.8 } },
  channels: { music: { mode: 'background', volume: 'musicVolume' } },
  mute: 'muted',
}
```

Here the calm music plays at 0.8 × 0.7. `mute` names a toggle that silences everything while it's on. `sound` names a toggle that reads the other way, silent while it's off.

## AudioOptions

`AudioOptions` is the settings for `startAudio`, each optional. Every field is in [`AudioOptions`](/docs/api/audio#audiooptions).

| Field | Meaning |
|---|---|
| `createAudio` | The function that makes the element for a file. `new Audio(src)` if left out, and a test passes a fake. |
| `log` | A function that receives a line for each decision the player makes. Nothing is logged if left out. |
| `root` | The element whose first `pointerdown` or `keydown` unlocks sound. `document` if left out. |

`log` shows what the player is doing where nobody can hear it, in a headless browser or a test. With `{ log: console.debug }` the console shows lines such as these:

```
started, 0 cues already heard; waiting for a click or key press
unlocked
music: play audio/music/calm.ogg
sfx: play cue:1234:1 knock
music: crossfade to audio/music/evening.ogg over 1000 ms
voice: queue scene:1234:3:1:ava.hello ava.hello
music: play refused for audio/music/calm.ogg (NotAllowedError)
```

A `play refused` line is the browser refusing, usually before the first click. The player notes it, carries on, and tries refused music again on the next click (`music: try … again`). It logs a file paused before it started, by a quick change of track, as `stopped … before it started`.

## AudioPlayer

`AudioPlayer` is what `startAudio` returns, a function that stops the player with two methods on it. Every member is in [`AudioPlayer`](/docs/api/audio#audioplayer).

| Field | Meaning |
|---|---|
| `player()` | Stops following the runner and the page's clicks and key presses, and pauses every sound. A stopped player can't start again, so a new one needs a new `startAudio`. |
| `unlock()` | Allows sound now, as the first click or key press does, and starts the sounds that are due. |
| `play(src, channel?, volume?)` | Plays a file once on a channel, at a volume from 0 to 1. The channel is `'sfx'` and the volume 1 if left out. On `'voice'` it waits its turn as any voice line does. It unlocks sound first. |

`play` is for a sound the view doesn't ask for, such as a button that plays a spoken line again. Its `src` is a path from the page, as `audioSrc` returns it.

```ts given
import { startAudio } from '@ifloom/audio'
import { audioSrc } from '@ifloom/engine'

const player = startAudio(runner)
player.play(audioSrc('voice/ava-hello.ogg'), 'voice')
```

[Play sound](/docs/how-to/render/pictures-and-sound#play-sound) puts a replay button on each spoken line with a voice.

## AudioLike

`AudioLike` is the part of an `HTMLAudioElement` that the player uses. Every field is in [`AudioLike`](/docs/api/audio#audiolike).

A fake for a test needs only these fields, and calls `onended` when its file would have finished. Fades and ducking move in steps on `setTimeout`, so a test with fake timers moves them on with `vi.advanceTimersByTime`.

```ts given
import { startAudio, type AudioLike } from '@ifloom/audio'

const made: AudioLike[] = []
const player = startAudio(runner, {
  createAudio: (src) => {
    const element: AudioLike = { src, volume: 1, loop: false, currentTime: 0, ended: false, onended: null, play: () => Promise.resolve(), pause: () => {} }
    made.push(element)
    return element
  },
  root: new EventTarget(),
})
player.unlock()
made.map((element) => element.src) // ['audio/music/calm.ogg']
```

## Caveats

- The opening scene's cues don't play, because they're in the view when the player starts and count as heard. Start a scene's cue from a choice, or put music on a background channel, which plays once sound is unlocked.
- [`ifloom build --inline-assets`](/docs/reference/cli#ifloom-build) puts pictures into `index.html` but never sound, so a game with sound ships its `audio/` folder beside the page.
- Two players on one runner play everything twice. `GameShell` and `mountGame` start one already, and the React UI's `useAudio` replaces it rather than adding a second.
