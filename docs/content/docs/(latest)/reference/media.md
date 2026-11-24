---
title: "Media"
description: "Pools of pictures and videos picked by tags, and layered pictures with hotspots on a scene or a place."
---
Pictures and videos reach the screen in three ways. You write them into prose as [markup](/docs/reference/prose#images), put them in a data scene's body as [`{ media }` blocks](/docs/reference/scenes#scenemedia), or build a [layered picture](/docs/reference/scenes#the-picture) with hotspots on it. All three can name a file, or ask a pool for one by tags. This page covers pools, the picture's types and the rules for video. The engine draws nothing itself. It puts beats in [`view.scene.beats`](/docs/reference/view#the-scene) and the picture in `view.scene.picture`, and the [React UI](/docs/react#pictures-and-video) draws them: beats with [`Beat`](/docs/react/components#beat) and [`Video`](/docs/react/components#video), the picture with [`Picture`](/docs/react/components#layeredpicture) and its [`Hotspot`](/docs/react/components#hotspot)s, and a click on a picture opens the [`MediaViewer`](/docs/react/components#mediaviewer).

```ts
import { mediaType, type GameMedia, type HotspotDef, type HotspotView, type PictureDef, type MediaState, type PoolFile, type PictureLayer, type PictureLayerView, type PictureView, type VideoFlags, type VideoView } from '@ifloom/engine'
import { pictureView } from '@ifloom/engine/plugin'
```

## A worked example

Say someone knocks at the showcase's flat in the evening. (Small Town has no pools or video yet, so this is an example of what one would look like.) The front door is picked from a pool of doors, the window behind it is a short clip of rain, and the door itself is a hotspot that takes the scene's `answer` choice.

```ts
import type { Content, DataScene } from '@ifloom/engine'

export const flat: Content = {
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
  picture: {
    aspect: '16/9',
    layers: [
      { id: 'hall', src: 'flat/hall' },
      { id: 'rain', pool: 'window', tags: ['rain'], when: { kv: 'raining' } },
    ],
    hotspots: [{ id: 'door', rect: [60, 10, 25, 85], label: 'The front door', choice: 'answer' }],
  },
  body: [{ prose: 'flat.knock' }, { media: { pool: 'door', tags: ['red', 'night'], alt: 'The front door' } }],
  choices: [
    { id: 'answer', effects: [{ scene: 'flat.visitor' }] },
    { id: 'ignore', effects: [{ scene: null }] },
  ],
}
```

The prose at `flat.knock` can ask the pool too:

```md
Someone knocks, three times, not loud.

[[img:@door|red,night|The front door]]
```

With the scene open, the view has the picked door among the beats and the picture resolved:

```ts
import { view } from '@ifloom/engine'

view(state, game).scene.picture
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

```ts shape
type GameMedia = {
  pools?: Record<string, PoolFile[]>
}
```

The game's `media` field. A pool is a named list of files content can pick from. [`loadGame`](/docs/reference/loader#loadgame) merges the content's and every pack's pools by id, and a pack's pool replaces one with the same id whole. Leave `media` out and the game has no pools.

## PoolFile

```ts shape
type PoolFile = { src: string; tags?: string[]; weight?: number }
```

One file in a pool. `src` is a path, as any picture's, through [`artSrc`](/docs/reference/prose#artsrc). A `.mp4` or `.webm` file is drawn as a video. `tags` are whatever words your game sorts its files by: a colour, the time of day, who's in it.

`weight` is how often the file is picked against the other files that fit a request, 1 if left out. A file of weight 3 is picked three times as often as one of weight 1:

```ts fragment
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

- markup, as `[[img:@door|red,night]]`, `[[wide:@door]]` or `[[video:@window|rain]]`
- a `{ media }` block, as `{ pool: 'door', tags: ['red', 'night'] }`
- a picture layer, as `{ pool: 'window', tags: ['rain'] }`

The engine picks a file in three steps.

1. It looks for the files that have every tag you asked for.
2. If there are none, it drops the last tag and looks again, down to no tags at all, which is any file in the pool. So put the tag that matters most first.
3. Among the files that fit, it draws one by their [weights](#poolfile) from the save's seed and the pick's key, with [`weighted`](/docs/reference/random#weighted). A pool with no weights draws exactly as an unweighted pick would, so adding weights to some files later only changes picks that haven't been made yet.

A request for `['blue', 'red']` from the pool above finds no door that's both, drops `red`, and draws from the two blue doors.

### Remembered picks

After every command, the reducer records each pick that's on screen in [`state.media.picks`](/docs/reference/state#media), under its key. It reads them from [`screen`](/docs/reference/view#screen) of the new state, which collects the picks from the scene, the room and every plugin's view. The view reads it back, so the same request in the same place shows the same file on every visit, after a reload, and after an update that adds files to the pool. If the recorded file has gone from the pool, a new one is drawn.

The view never writes the state. Before the first command (a new game's first frame), nothing is recorded yet, and the view draws the pick from the seed and the key, which gives the same file the reducer will then record. [`replay`](/docs/reference/runner#replay) records the same picks in the same order, so a replayed game shows the same files.

### Pick keys

A key is the pool, the tags, the owner and the slot, joined with `|`:

```text
door|red,night|flat.knock|1
```

| Where | Owner | Slot |
|---|---|---|
| A data scene's `{ media }` block | the scene's id | the block's index in `body`, such as `1` |
| Markup in a data scene's block | the scene's id | the block's index and the request's place in that block's text, such as `0.0` |
| A place's body (and any plugin [room scene](/docs/reference/plugins#scene)'s body) | the place's id | as for a data scene |
| A message's or a post's body | the message's or post's id | as for a data scene |
| A picture layer | the scene's or place's id | `picture:0`, `picture:1`, ... by the layer's index |

The visit isn't part of the key. A scene shows the same door every time it opens, and that's on purpose: a picture that changes each time you look reads as a mistake.

**Gotchas.**
- Reordering a scene's blocks, or a picture's layers, changes their slots, so they're drawn again.
- A pool with nothing to give (an unknown or empty pool) leaves its markup, block or layer out. The loader reports both.
- Tags that no file in the pool has are reported, even though the pick would fall back. A tag nothing has is usually a typo.

## MediaState

```ts shape
type MediaState = { picks: Record<string, string> }
```

What a save keeps at `state.media`: the file (as its pool's `src`) each pick key was given. A new game starts with `{ picks: {} }`, and a save from before version 11 [loads](/docs/reference/saves#loadstate) with that.

## Layered pictures

### PictureDef

```ts shape
type PictureDef = {
  layers: PictureLayer[]
  hotspots?: HotspotDef[]
  aspect?: string
}
```

A layered picture with hotspots. A [data scene](/docs/reference/scenes#the-picture) and a [place](/docs/plugins/places#the-picture) can each have one. `layers` are drawn bottom first. `aspect` is the width over the height as CSS writes it, such as `'16/9'`. Leave it out and the UI picks one.

### PictureLayer

```ts shape
type PictureLayer = {
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

```ts shape
type HotspotDef = {
  id: string
  rect: [number, number, number, number]
  label: string
  command?: CommandRef
  choice?: string
  when?: Condition
  layer?: string
}
```

A clickable area. `rect` is `[x, y, width, height]` in percent of the picture, from the top left, so `[0, 0, 100, 100]` is the whole picture. `label` is what a screen reader reads and the tooltip shows. Give exactly one of:

- **`command`**, any [command](/docs/reference/commands), greyed out by the same rules as an [action's button](/docs/reference/view#renderaction).
- **`choice`**, a choice of the open scene by id, which takes that choice's command, `disabled` and `warning`.

It's left out while its `when` fails, and while its `layer` isn't shown.

### PictureView

```ts shape
type PictureView = {
  aspect: string | null
  layers: PictureLayerView[]
  hotspots: HotspotView[]
}
```

A picture as the UI draws it, from [`pictureView`](/docs/reference/view#pictureview). It's in [`view.scene.picture`](/docs/reference/view#the-scene) for the open scene, and in a place's `location.picture` in [`PlacesView`](/docs/plugins/places#placesview). `layers` has only the layers shown now, bottom first. `hotspots` has only the ones that can be shown, each resolved to a button.

### PictureLayerView

```ts shape
type PictureLayerView = {
  id: string | null
  src: string
  video?: VideoView
}
```

A layer that's shown. `src` has been through [`artSrc`](/docs/reference/prose#artsrc), and a pool layer's is the pick. `video` is there only for a video layer.

### HotspotView

```ts shape
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

A hotspot as a button. Send `command` when it's pressed. `disabled` and `warning` mean what they do on a [`RenderedChoice`](/docs/reference/view#renderedchoice): greyed out with a reason, or pressable with a warning the reducer refuses all the same.

## Video

### VideoFlags

```ts shape
type VideoFlags = {
  controls?: boolean
  once?: boolean
  sound?: boolean
  poster?: string
}
```

The flags a video can carry, on a `{ media }` block or a picture layer. They're the same as the [markup flags](/docs/reference/prose#videos): `controls` shows the player's controls, `once` plays once, `sound` plays with sound, and `poster` is a still shown before it plays.

### VideoView

```ts shape
type VideoView = {
  autoplay: boolean
  loop: boolean
  muted: boolean
  controls: boolean
  poster?: string
}
```

How a video layer plays, with the defaults filled in. A `video` [beat](/docs/reference/prose#scenebeat) carries the same fields. Without flags, a video plays by itself, loops, is muted and has no controls, like a GIF. `controls` turns `autoplay` off, so a clip with controls waits for the player. `poster` has been through `artSrc`.

**Gotchas.**
- `muted: false` asks for sound. Browsers often refuse to start a video with sound by itself, so a UI may need the player to press play. The React UI's [`Video`](/docs/react/components#video) also follows the game's mute and volume settings for a video with sound.
- `mediaType` decides picture or video by the file's extension alone. A file in `art/` with no extension is a picture (`.jpg`), unless its markup says `video` (`.mp4`).

## Drawing it

A scene's layered picture is `view.scene.picture`, a [`PictureView`](#pictureview). Stack its `layers` bottom first, and put each of its `hotspots` over them as a button, placed by its `rect` (left, top, width and height, in percent of the picture). A hotspot is greyed out with `disabled` like any button, and sends its `command`. A scene with no layered picture may have a single `view.scene.image`. A place's picture is in the [places plugin's view](/docs/plugins/places#placesview), drawn the same way.

The React UI's [`Scene`](/docs/react/components#scene) draws the picture above the words with [`LayeredPicture`](/docs/react/components#layeredpicture), which you can also place yourself. The Plain JS tab uses `runner`, `add` and `drawChoices` from the vanilla template's `src/main.ts`, whose `draw` hands each part the runner's [snapshot](/docs/reference/runner#runnersnapshot), and the Vue tab reads `view`, `snapshot` and `runner` from the vue template's `src/runner.ts` (see [Start the runner](/docs/guide/frameworks#start-the-runner)).

::include[../../../../snippets/plain/picture.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../snippets/react/picture.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../snippets/vue/Picture.vue]{meta='tab="Vue" tab-group="framework"'}

## Checks

The [content checker](/docs/reference/checks) reports unknown pools, tags no file has, empty pools, unknown markup flags, video flags on a picture, and everything wrong with a picture's hotspots and layers. The full list is under [Media](/docs/reference/checks#media). It also lists every picture and video file the game names, in [`files`](/docs/reference/checks#fileref).

## See it in an example

Small Town: the café's `picture` in [`examples/showcase/src/story/cafe.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/cafe.ts) has one layer, Ava's photo, shown while she's there, and a hotspot on her that sends `cast.talk('ava')`. No example uses picture pools or video yet.
