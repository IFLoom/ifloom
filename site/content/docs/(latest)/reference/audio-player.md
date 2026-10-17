---
title: "The audio player"
description: Play a game's sound in the browser with @ifloom/audio. startAudio follows view.audio, crossfades music, plays each sound once, reads volumes from the profile and waits for the player's first click.
---
The engine works out what should be playing, in [`view.audio`](/docs/reference/audio#audioview), but plays nothing itself. `@ifloom/audio` does the playing in the browser. It follows a runner, and it doesn't need React or any other framework.

```ts
import { startAudio } from '@ifloom/audio'

const player = startAudio(runner)
```

That's all most games need. The [React UI](/docs/react#sound) starts it for you when the game has any tracks. With plain DOM, Vue or Svelte you call it yourself, once, after making the runner. The `vanilla`, `vue` and `svelte` templates already do (see [Using another framework](/docs/guide/frameworks#sound)).

```ts
import { startAudio, type AudioLike, type AudioOptions, type AudioPlayer } from '@ifloom/audio'
```

## Install

Add `@ifloom/audio` beside the engine, the same way you added the engine (see [Installation](/docs/guide/installation)). `@ifloom/react` already depends on it. It plays files with the browser's own `HTMLAudioElement`, so it needs no build step or extra library, and it works from a page opened from disk.

Put your sound files in the game's `public/audio/` folder. A track's `src` is read through [`audioSrc`](/docs/reference/audio#audiosrc), so `{ src: 'music/calm.ogg' }` is `public/audio/music/calm.ogg`. [`ifloom check`](/docs/cli#ifloom-check) reports any that are missing.

## startAudio

```ts
function startAudio(runner: Runner, options?: AudioOptions): AudioPlayer
```

Starts playing the runner's sound and keeps following it until you call `stop()`. It reads `runner.view().audio` once at the start and again after every change of state.

What it does with each part of the view:

- **Background channels**, such as `music` and `ambience`, play one file each. When the file changes, the old one fades out while the new one fades in, over the channel's `crossfade` in milliseconds. A choice that leaves the file as it is doesn't restart it. A track loops if its `loop` says so.
- **Playlists** play their files in the order the view gives. When one ends, the next starts. A `loop` or `shuffle` playlist goes back to the start after the last one, and an `inOrder` playlist stops there.
- **Cues**, the one-shot sounds, play once per [`key`](/docs/reference/audio#sounds-and-voices). Sounds on the same channel overlap, except on the `voice` channel, where each line waits for the one before it to finish.
- **Volume** is the track's own `volume`, times the channel's volume setting, times 0 while the game is muted. See [Volume and mute](#volume-and-mute).
- **Ducking** quietens a channel while another plays, but only on a channel whose `duck` you declared. See [`ChannelDef`](/docs/reference/audio#channeldef).

```ts
import { browserRunner } from '@ifloom/engine'
import { startAudio } from '@ifloom/audio'
import loaded from './game.ts'

const runner = browserRunner(loaded.game)
startAudio(runner)
```

### Nothing plays before the first click

Browsers don't let a page start sound until the player has done something on it. So the player starts silent and waits for the first `pointerdown` or `keydown` on the page. Then it starts whatever is due: the music for where the player is, and any sound that came up in the meantime.

If your game has its own start button, or plays inside a frame that gets the click, call [`unlock()`](#audioplayer) from your own handler instead.

If the browser still refuses the music, for example after an `unlock()` that didn't come from a click, the player tries it again on the next click or key press.

### Sounds play once

The player remembers every cue key it has played. Before it plays anything, it counts every key already in the view as heard. So a reloaded page, or a save loaded at the start, doesn't replay the knock at the door from three turns ago.

While it runs, it tells play going on apart from a jump. One more command is play, and its new sounds play. Loading a save, starting a new game, undo and redo are jumps. After a jump, the `sound` effects kept in the save are counted as heard, but the sounds and voices of the scene now on screen still play once.

### Volume and mute

Volume comes from the `ui` [settings](/docs/reference/settings) the game names in `game.audio`:

```ts
settings: [
  { id: 'musicVolume', label: 'Music', affects: 'ui', kind: 'range', min: 0, max: 100, default: 70 },
  { id: 'muted', label: 'Mute', affects: 'ui', kind: 'toggle', default: false },
],
audio: {
  tracks: { calm: { src: 'music/calm.ogg', channel: 'music', volume: 0.8 } },
  channels: { music: { mode: 'background', volume: 'musicVolume' } },
  mute: 'muted',
}
```

A range setting is read from its `min` to its `max` as 0 to 1, so 70 of 0 to 100 is 0.7, and the calm music above plays at 0.8 × 0.7. The player reads the stored values from [`runner.profile`](/docs/reference/profile) and listens for changes, so moving a slider on the settings screen changes the volume at once. It reads each value with [`settingValue`](/docs/reference/settings#settingvalue), so until the player has stored a value, when the stored one no longer fits the setting, or when the runner has no profile, it uses the setting's `default`.

## AudioOptions

```ts
type AudioOptions = {
  createAudio?: (src: string) => AudioLike
  log?: (message: string) => void
  root?: EventTarget
}
```

| Option | What it does | Default |
|---|---|---|
| `createAudio` | Makes the element that plays a file. Pass your own in tests. | `new Audio(src)` |
| `log` | Called with a line for every decision the player makes. | Nothing is logged. |
| `root` | Where the first `pointerdown` or `keydown` unlocks sound. | `document` |

`log` is the way to see what the player is doing, because a headless browser or a test can't hear anything. Pass `console.debug` and the browser's console shows lines like these:

```
started, 0 cues already heard; waiting for a click or key press
unlocked
music: play audio/music/calm.ogg
sfx: play cue:1234:1 knock
music: crossfade to audio/music/evening.ogg over 1000 ms
music: faded out audio/music/calm.ogg
voice: queue scene:1234:3:1:ava.hello ava.hello
music: play refused for audio/music/calm.ogg (NotAllowedError)
```

A `play refused` line is the browser saying no, usually before the first click. The player notes it and carries on, and tries refused music again on the next click (`music: try … again`). A file paused before it had started, by a quick change of track, is logged as `stopped … before it started`.

## AudioPlayer

```ts
type AudioPlayer = {
  stop(): void
  unlock(): void
  play(src: string, channel?: string, volume?: number): void
}
```

| Method | What it does |
|---|---|
| `stop()` | Stops following the runner and the profile, and pauses everything. A stopped player can't start again, so call `startAudio` for a new one. |
| `unlock()` | Allows sound now, as the first click or key press would, and starts whatever is due. |
| `play(src, channel?, volume?)` | Plays a file once on a channel, at a volume from 0 to 1. `'sfx'` and `1` if left out. On `'voice'` it waits its turn like any voice line. It unlocks sound first. |

`play` is for sounds the view doesn't ask for, such as the React UI's button that plays a spoken line again. Its `src` is a path from the page, as [`audioSrc`](/docs/reference/audio#audiosrc) returns:

```ts
import { audioSrc } from '@ifloom/engine'

player.play(audioSrc('voice/ava-hello.ogg'), 'voice')
```

### A button to hear a line again

The React UI puts a button on each spoken line that has a voice. With the other [templates](/docs/guide/frameworks), keep the player `startAudio` returned and do the same. The `vue` and `svelte` templates' `src/runner.ts` exports it as `player`:

```ts tab="Plain JS" tab-group="framework"
// src/main.ts, in the vanilla template: keep the player
import { audioSrc } from '@ifloom/engine'

const player = startAudio(runner)

/** A button that plays a spoken line's voice again. */
function voiceReplay(voice: string): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = '▶'
  button.setAttribute('aria-label', 'Hear it again')
  button.onclick = () => {
    const track = runner.game.audio?.tracks[voice]
    if (track && 'src' in track) player.play(audioSrc(track.src), 'voice', track.volume ?? 1)
  }
  return button
}
```

```tsx tab="React" tab-group="framework"
// src/VoiceReplay.tsx, for React by hand: export the player from src/runner.ts
import { audioSrc } from '@ifloom/engine'
import { player, runner } from './runner.ts'

/** Plays a spoken line's voice again. */
export function VoiceReplay({ voice }: { voice: string }) {
  const replay = () => {
    const track = runner.game.audio?.tracks[voice]
    if (track && 'src' in track) player.play(audioSrc(track.src), 'voice', track.volume ?? 1)
  }
  return (
    <button type="button" aria-label="Hear it again" onClick={replay}>
      ▶
    </button>
  )
}
```

```vue tab="Vue" tab-group="framework"
<!-- src/VoiceReplay.vue -->
<script setup lang="ts">
import { audioSrc } from '@ifloom/engine'
import { player, runner } from './runner.ts'

// Plays a spoken line's voice again.
const props = defineProps<{ voice: string }>()

function replay() {
  const track = runner.game.audio?.tracks[props.voice]
  if (track && 'src' in track) player.play(audioSrc(track.src), 'voice', track.volume ?? 1)
}
</script>

<template>
  <button type="button" aria-label="Hear it again" @click="replay">▶</button>
</template>
```

```svelte tab="Svelte" tab-group="framework"
<!-- src/VoiceReplay.svelte -->
<script lang="ts">
  import { audioSrc } from '@ifloom/engine'
  import { player, runner } from './runner.ts'

  // Plays a spoken line's voice again.
  let { voice }: { voice: string } = $props()

  function replay() {
    const track = runner.game.audio?.tracks[voice]
    if (track && 'src' in track) player.play(audioSrc(track.src), 'voice', track.volume ?? 1)
  }
</script>

<button type="button" aria-label="Hear it again" onclick={replay}>▶</button>
```

Draw it inside the spoken line, when the beat has a voice:

```ts tab="Plain JS" tab-group="framework"
// src/main.ts, in drawBeat()
case 'say': {
  const line = add(root, 'p', beat.text, 'beat-say')
  line.dataset.who = beat.who
  if (beat.voice) line.append(voiceReplay(beat.voice))
  break
}
```

```tsx tab="React" tab-group="framework"
// src/Beat.tsx
case 'say':
  return (
    <p className="beat-say" data-who={beat.who}>
      {beat.text}
      {beat.voice ? <VoiceReplay voice={beat.voice} /> : null}
    </p>
  )
```

```vue tab="Vue" tab-group="framework"
<!-- src/Beat.vue -->
<p v-else-if="beat.kind === 'say'" class="beat-say" :data-who="beat.who">
  {{ beat.text }}
  <VoiceReplay v-if="beat.voice" :voice="beat.voice" />
</p>
```

```svelte tab="Svelte" tab-group="framework"
<!-- src/Beat.svelte -->
<p class="beat-say" data-who={beat.who}>
  {beat.text}
  {#if beat.voice}<VoiceReplay voice={beat.voice} />{/if}
</p>
```

## AudioLike

```ts
type AudioLike = {
  play(): Promise<void> | void
  pause(): void
  volume: number
  loop: boolean
  currentTime: number
  readonly ended: boolean
  onended: ((event: Event) => void) | null
  src: string
}
```

The parts of an `HTMLAudioElement` the player uses. A fake for tests needs only these, and calls `onended` when its file would have finished:

```ts
import { startAudio, type AudioLike } from '@ifloom/audio'

const made: AudioLike[] = []
const player = startAudio(runner, {
  createAudio: (src) => {
    const el: AudioLike = { src, volume: 1, loop: false, currentTime: 0, ended: false, onended: null, play: () => Promise.resolve(), pause: () => {} }
    made.push(el)
    return el
  },
  root: new EventTarget(),
})
player.unlock()
made.map((el) => el.src) // ['audio/music/calm.ogg']
```

Fades and ducking move in steps on `setTimeout`, so a test with fake timers can move them along with `vi.advanceTimersByTime`.

## Gotchas

- **The opening scene's sounds don't play.** They're in the view when the player starts, so they count as heard. Start a scene's sound from a choice, or put music on its channel, which plays as soon as sound is unlocked.
- **Sound files stay beside the page.** [`ifloom build --inline-assets`](/docs/cli#one-file-pictures-and-all) puts pictures into `index.html` but never sound, which would make the page too big to load quickly. Ship the `audio/` folder with it.
- **One player per runner.** Two players on the same runner play everything twice. The React UI starts one in `mountGame`, so don't also call `startAudio` or `useAudio` there.
- **Ducking follows what's playing, not the view.** A channel ducks while a sound under it is actually playing, and comes back up when that sound ends, over 300 ms.

## See it in an example

None of the examples uses this yet. No example has any sound, so nothing here is played by one.
