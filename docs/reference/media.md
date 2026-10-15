# Media

Pictures and videos reach the screen in three ways. You write them into prose as [markup](/reference/prose#images), put them in a data scene's body as [`{ media }` blocks](/reference/scenes#scenemedia), or build a [stage](/reference/scenes#the-stage), a layered picture with hotspots on it. All three can name a file, or ask a pool for one by tags. This page covers pools, the stage's types and the rules for video. The engine draws nothing itself. It puts beats in [`view.scene.beats`](/reference/view#the-scene) and the stage in `view.scene.stage`, and the [React UI](/react/#pictures-and-video) draws them: beats with [`Beat`](/react/components#beat) and [`Video`](/react/components#video), the stage with [`Stage`](/react/components#stage) and its [`Hotspot`](/react/components#hotspot)s, and a click on a picture opens the [`MediaViewer`](/react/components#mediaviewer).

```ts
import {
  mediaKind,
  stageView,
  type GameMedia,
  type HotspotDef,
  type HotspotView,
  type MediaStage,
  type MediaState,
  type PoolFile,
  type StageLayer,
  type StageLayerView,
  type StageView,
  type VideoFlags,
  type VideoView,
} from '@ifloom/engine'
```

## A worked example

In the showcase, someone knocks at the flat in the evening. The front door is picked from a pool of doors, the window behind it is a short clip of rain, and the door itself is a hotspot that takes the scene's `answer` choice.

```ts
import type { DataScene, Game } from '@ifloom/engine'

const game: Game = {
  // ...
  media: {
    pools: {
      door: [
        { src: 'door/blue-day.jpg', tags: ['blue', 'day'] },
        { src: 'door/blue-night.jpg', tags: ['blue', 'night'] },
        { src: 'door/red-day.jpg', tags: ['red', 'day'] },
        { src: 'door/red-night.jpg', tags: ['red', 'night'] },
      ],
      window: [{ src: 'flat/window-rain.mp4', tags: ['rain'] }],
    },
  },
}

const knock: DataScene = {
  id: 'flat.knock',
  stage: {
    aspect: '16/9',
    layers: [
      { id: 'hall', src: 'flat/hall' },
      { id: 'rain', pool: 'window', tags: ['rain'], when: { flag: 'raining' } },
    ],
    hotspots: [{ id: 'door', rect: [60, 10, 25, 85], label: 'The front door', choice: 'answer' }],
  },
  body: [{ text: 'flat.knock' }, { media: { pool: 'door', tags: ['red', 'night'], alt: 'The front door' } }],
  choices: [
    { id: 'answer', effects: [{ kind: 'scene', id: 'flat.visitor' }] },
    { id: 'ignore', effects: [{ kind: 'scene', id: null }] },
  ],
}
```

The prose at `flat.knock` can ask the pool too:

```md
Someone knocks, three times, not loud.

[[img:@door|red,night|The front door]]
```

With the scene open, the view has the picked door among the beats and the stage resolved:

```ts
view(state, game).scene.stage
// {
//   aspect: '16/9',
//   layers: [
//     { id: 'hall', src: 'art/flat/hall.jpg' },
//     { id: 'rain', src: 'art/flat/window-rain.mp4',
//       video: { autoplay: true, loop: true, muted: true, controls: false } },
//   ],
//   hotspots: [
//     { id: 'door', rect: [60, 10, 25, 85], label: 'The front door', command: { type: 'choose', id: 'answer' } },
//   ],
// }
```

## GameMedia

```ts
type GameMedia = {
  pools?: Record<string, PoolFile[]>
}
```

The game's `media` field. A pool is a named list of files content can pick from. [`loadGame`](/reference/loader#pack) merges the base's and every pack's pools by id, and a later pack's pool replaces an earlier one whole. Leave `media` out and the game has no pools.

## PoolFile

```ts
type PoolFile = { src: string; tags?: string[]; weight?: number }
```

One file in a pool. `src` is a path, as any picture's, through [`artSrc`](/reference/prose#artsrc). A `.mp4` or `.webm` file is drawn as a video. `tags` are whatever words your game sorts its files by: a colour, the time of day, who's in it.

`weight` is how often the file is picked against the other files that fit a request, 1 if left out. A file of weight 3 is picked three times as often as one of weight 1:

```ts
media: {
  pools: {
    // The usual blue door most days, the red one now and then.
    door: [
      { src: 'door/blue-day.jpg', tags: ['blue', 'day'], weight: 4 },
      { src: 'door/red-day.jpg', tags: ['red', 'day'] },
    ],
  },
}
```

A weight only matters among the files that fit. It doesn't make a file fit a request whose tags it lacks. The loader reports a weight of 0 or less.

## Pools

You ask a pool for a file in three places:

- markup, as `[[img:@door|red,night]]`, `[[wide:@door]]` or `[[video:@window|rain]]`;
- a `{ media }` block or a hand-built scene's `media`, as `{ pool: 'door', tags: ['red', 'night'] }`;
- a stage layer, as `{ pool: 'window', tags: ['rain'] }`.

The engine picks a file in three steps.

1. It looks for the files that have every tag you asked for.
2. If there are none, it drops the last tag and looks again, down to no tags at all, which is any file in the pool. So put the tag that matters most first.
3. Among the files that fit, it draws one by their [weights](#poolfile) from the save's seed and the pick's key, with [`weighted`](/reference/random#weighted). A pool with no weights draws exactly as an unweighted pick would, so adding weights to some files later only changes picks that haven't been made yet.

A request for `['blue', 'red']` from the pool above finds no door that's both, drops `red`, and draws from the two blue doors.

### Remembered picks

After every command, the reducer records each pick that's on screen in [`state.media.picks`](/reference/state#media), under its key. The view reads it back, so the same request in the same place shows the same file on every visit, after a reload, and after an update that adds files to the pool. If the recorded file has gone from the pool, a new one is drawn.

The view never writes the state. Before the first command (a new game's first frame), nothing is recorded yet, and the view draws the pick from the seed and the key, which gives the same file the reducer will then record. [`replay`](/reference/runner#replay) records the same picks in the same order, so a replayed game shows the same files.

### Pick keys

A key is the pool, the tags, the owner and the slot, joined with `|`:

```text
door|red,night|flat.knock|1
```

| Where | Owner | Slot |
|---|---|---|
| A data scene's `{ media }` block | the scene's id | the block's index in `body`, such as `1` |
| Markup in a data scene's block | the scene's id | the block's index and the request's place in that block's text, such as `0.0` |
| A place's body (and any plugin [stage](/reference/plugins#stage)'s body) | the place's id | as for a data scene |
| A message's or a post's body | the message's or post's id | as for a data scene |
| Markup in a hand-built scene's `body` | the scene's id | `body.0`, `body.1`, ... in order |
| A hand-built scene's `media` list | the scene's id | `media.0`, `media.1`, ... |
| A stage layer | the scene's or place's id | `stage:0`, `stage:1`, ... by the layer's index |

The visit isn't part of the key. A scene shows the same door every time it opens, and that's on purpose: a picture that changes each time you look reads as a mistake.

**Gotchas.**
- Reordering a scene's blocks, or a stage's layers, changes their slots, so they're drawn again.
- A pool with nothing to give (an unknown or empty pool) leaves its markup, block or layer out. The loader reports both.
- Tags that no file in the pool has are reported, even though the pick would fall back. A tag nothing has is usually a typo.

## MediaState

```ts
type MediaState = { picks: Record<string, string> }
```

What a save keeps at `state.media`: the file (as its pool's `src`) each pick key was given. A new game starts with `{ picks: {} }`, and a save from before version 11 is [migrated](/reference/saves#migrate) to that.

## The stage

### MediaStage

```ts
type MediaStage = {
  layers: StageLayer[]
  hotspots?: HotspotDef[]
  aspect?: string
}
```

A layered picture with hotspots. A [data scene](/reference/scenes#the-stage), a hand-built scene's `SceneView` and a [place](/plugins/places#the-picture-stage) can each have one. `layers` are drawn bottom first. `aspect` is the width over the height as CSS writes it, such as `'16/9'`. Leave it out and the UI picks one.

### StageLayer

```ts
type StageLayer = {
  id?: string
  src?: string
  pool?: string
  tags?: string[]
  when?: Condition
  video?: boolean
  controls?: boolean
  once?: boolean
  sound?: boolean
  poster?: string
}
```

One layer. Give a file as `src`, or a pool and tags. It's shown while `when` holds. `id` is what a hotspot names to go with this layer. A layer is a video when `video` is `true` or its file is a `.mp4` or `.webm`, and the [video flags](#videoflags) apply.

### HotspotDef

```ts
type HotspotDef = {
  id: string
  rect: [number, number, number, number]
  label: string
  command?: Command
  choice?: string
  when?: Condition
  layer?: string
}
```

A clickable area. `rect` is `[x, y, width, height]` in percent of the stage, from the top left, so `[0, 0, 100, 100]` is the whole picture. `label` is what a screen reader reads and the tooltip shows. Give exactly one of:

- **`command`**, any [command](/reference/commands), greyed out by the same rules as an [action's button](/reference/view#renderaction);
- **`choice`**, a choice of the open scene by id, which takes that choice's command, `disabled` and `warning`.

It's left out while its `when` fails, and while its `layer` isn't shown.

### StageView

```ts
type StageView = {
  aspect: string | null
  layers: StageLayerView[]
  hotspots: HotspotView[]
}
```

A stage as the UI draws it, from [`stageView`](/reference/view#stageview). It's in [`view.scene.stage`](/reference/view#the-scene) for the open scene, and in a place's `location.stage` in [`PlacesView`](/plugins/places#placesview). `layers` has only the layers shown now, bottom first. `hotspots` has only the ones that can be shown, each resolved to a button.

### StageLayerView

```ts
type StageLayerView = {
  id: string | null
  src: string
  video?: VideoView
}
```

A layer that's shown. `src` has been through [`artSrc`](/reference/prose#artsrc), and a pool layer's is the pick. `video` is there only for a video layer.

### HotspotView

```ts
type HotspotView = {
  id: string
  rect: [number, number, number, number]
  label: string
  command: Command
  disabled?: string
  warning?: string
  layer?: string
}
```

A hotspot as a button. Send `command` when it's pressed. `disabled` and `warning` mean what they do on a [`RenderedChoice`](/reference/view#renderedchoice): greyed out with a reason, or pressable with a warning the reducer refuses all the same.

## Video

### VideoFlags

```ts
type VideoFlags = {
  controls?: boolean
  once?: boolean
  sound?: boolean
  poster?: string
}
```

The flags a video can carry, on a `{ media }` block or a stage layer. They're the same as the [markup flags](/reference/prose#videos): `controls` shows the player's controls, `once` plays once, `sound` plays with sound, and `poster` is a still shown before it plays.

### VideoView

```ts
type VideoView = {
  autoplay: boolean
  loop: boolean
  muted: boolean
  controls: boolean
  poster?: string
}
```

How a video layer plays, with the defaults filled in. A `video` [beat](/reference/prose#scenebeat) carries the same fields. Without flags, a video plays by itself, loops, is muted and has no controls, like a GIF. `controls` turns `autoplay` off, so a clip with controls waits for the player. `poster` has been through `artSrc`.

**Gotchas.**
- `muted: false` asks for sound. Browsers often refuse to start a video with sound by itself, so a UI may need the player to press play. The React UI's [`Video`](/react/components#video) also follows the game's mute and volume settings for a video with sound.
- `mediaKind` decides picture or video by the file's extension alone. A file in `art/` with no extension is a picture (`.jpg`), unless its markup says `video` (`.mp4`).

## Checks

The [content checker](/reference/checks) reports unknown pools, tags no file has, empty pools, unknown markup flags, video flags on a picture, and everything wrong with a stage's hotspots and layers. The full list is under [Media](/reference/checks#media). It also lists every picture and video file the game names, in [`files`](/reference/checks#fileref).
