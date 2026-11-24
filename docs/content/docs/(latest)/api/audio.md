---
title: "@ifloom/audio"
description: "Every export of @ifloom/audio, the audio player: its signature and its fields."
---
Generated from the source of `@ifloom/audio` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

- Functions: [`startAudio`](#startaudio)
- Types: [`AudioLike`](#audiolike), [`AudioOptions`](#audiooptions), [`AudioPlayer`](#audioplayer)

## AudioLike

Type. Explained in [The audio player](/docs/browser/audio-player#audiolike).

The parts of an `HTMLAudioElement` the player uses. Tests pass a fake through `createAudio`.

```ts shape
import type { AudioLike } from '@ifloom/audio'
type AudioLike = {
  play: () => void | Promise<void>
  pause: () => void
  volume: number
  loop: boolean
  currentTime: number
  readonly ended: boolean
  onended: ((event: Event) => void) | null
  src: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `play` | `() => void \| Promise<void>` |  |  |  |
| `pause` | `() => void` |  |  |  |
| `volume` | `number` |  |  |  |
| `loop` | `boolean` |  |  |  |
| `currentTime` | `number` |  |  |  |
| `ended` | `boolean` |  |  |  |
| `onended` | `((event: Event) => void) \| null` |  |  |  |
| `src` | `string` |  |  |  |

## AudioOptions

Type. Explained in [The audio player](/docs/browser/audio-player#audiooptions).

```ts shape
import type { AudioOptions } from '@ifloom/audio'
type AudioOptions = {
  createAudio?: (src: string) => AudioLike
  log?: (message: string) => void
  root?: EventTarget
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `createAudio` | `(src: string) => AudioLike` | yes |  | Makes the element for a file. `new Audio(src)` if left out. |
| `log` | `(message: string) => void` | yes |  | Told every decision the player makes, for debugging: `log: console.debug`. |
| `root` | `EventTarget` | yes |  | Where the first `pointerdown` or `keydown` unlocks sound. `document` if left out. |

## AudioPlayer

Type. Explained in [The audio player](/docs/browser/audio-player#audioplayer).

What `startAudio` gives back: a function that stops the player, as every
other `start*` gives, with what else a player can do on it. Calling it stops
listening to the runner and the profile, and pauses everything.

```ts shape
import type { AudioPlayer } from '@ifloom/audio'
type AudioPlayer = (() => void) & { unlock(): void; play(src: string, channel?: string, volume?: number): void }
```

## startAudio

Function. Explained in [The audio player](/docs/browser/audio-player#startaudio).

Play a runner's `view.audio` in the browser until the function it returns
is called, as `startClock`'s and `startKeys`' are. Background
channels crossfade when their file changes and step through playlists. Each
cue key plays once, and the keys already in the view when the player starts
count as heard, so loading a save replays nothing. Volumes and muting come
from the game's settings, as the runner's snapshot has them. Nothing plays until the player first
clicks or presses a key, or until `unlock()`.

```ts shape
import { startAudio } from '@ifloom/audio'
function startAudio(runner: Runner, options?: AudioOptions): AudioPlayer
```
