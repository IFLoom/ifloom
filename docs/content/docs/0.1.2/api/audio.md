---
title: "@ifloom/audio"
description: "Every export of @ifloom/audio, the audio player: its signature and its fields."
---
Generated from the source of `@ifloom/audio` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

- Functions: [`startAudio`](#startaudio)
- Types: [`AudioLike`](#audiolike), [`AudioOptions`](#audiooptions), [`AudioPlayer`](#audioplayer)

## AudioLike

Type. Explained in [The audio player](/docs/0.1.2/reference/browser/audio-player#audiolike).

The part of an `HTMLAudioElement` that the audio player uses. Tests pass a fake through `AudioOptions.createAudio`.

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
| `play` | `() => void \| Promise<void>` |  |  | Starts playing. The browser may refuse, by throwing or by rejecting the promise it returns. |
| `pause` | `() => void` |  |  | Pauses playing. |
| `volume` | `number` |  |  | The element's volume, from 0 to 1. |
| `loop` | `boolean` |  |  | True when the element starts again from the beginning as it ends. |
| `currentTime` | `number` |  |  | The element's position in the file, in seconds. |
| `ended` | `boolean` |  |  | True once the element has played to its end. |
| `onended` | `((event: Event) => void) \| null` |  |  | The handler the element calls when it plays to its end. |
| `src` | `string` |  |  | The element's file. |

## AudioOptions

Type. Explained in [The audio player](/docs/0.1.2/reference/browser/audio-player#audiooptions).

Settings for `startAudio`. Each is optional.

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
| `createAudio` | `(src: string) =>` [`AudioLike`](#audiolike) | yes |  | The function that makes the element for a file. `new Audio(src)` if left out. |
| `log` | `(message: string) => void` | yes |  | A function that receives a line for each decision the player makes, for debugging, such as `console.debug`. |
| `root` | `EventTarget` | yes |  | The element whose first `pointerdown` or `keydown` unlocks sound. `document` if left out. |

## AudioPlayer

Type. Explained in [The audio player](/docs/0.1.2/reference/browser/audio-player#audioplayer).

The audio player `startAudio` returns, a function that stops it with two methods on it. Calling it stops following
the runner and the page's clicks and key presses, and pauses every sound.

```ts shape
import type { AudioPlayer } from '@ifloom/audio'
type AudioPlayer = (() => void) & { unlock(): void; play(src: string, channel?: string, volume?: number): void }
```

## startAudio

Function. Explained in [The audio player](/docs/0.1.2/reference/browser/audio-player#startaudio).

Starts playing a runner's `view.audio` in the browser, and returns the `AudioPlayer` that stops it. Nothing
plays until the player first clicks or presses a key, or until `unlock()`.

Background channels crossfade when their file changes, and step through playlists. Each cue key plays once, and the
player counts the cues already in the view when it starts as heard, so loading a save replays nothing. Volumes and
muting follow the game's settings in the runner's snapshot.

```ts shape
import { startAudio } from '@ifloom/audio'
function startAudio(runner: Runner, options?: AudioOptions): AudioPlayer
```

Uses: [`Runner`](/docs/0.1.2/api/engine#runner), [`AudioOptions`](#audiooptions), [`AudioPlayer`](#audioplayer).
