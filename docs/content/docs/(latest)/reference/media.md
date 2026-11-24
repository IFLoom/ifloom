---
title: "Media"
description: "Reference for GameMedia and its pools, PictureDef with its layers and hotspots, video flags, MediaState and the picture's view: the pictures and videos a game picks and shows."
---
A game shows pictures and videos three ways: [markup](/docs/reference/prose#images) in prose, a [`{ media }`](/docs/reference/scenes#scenemedia) block in a scene's body, and a [layered picture](/docs/reference/glossary#picture) with hotspots on a scene or a location. Each can name a file or ask a pool, a named list of files in the content's `media`, for one by its tags. [Add pictures and backgrounds](/docs/how-to/add-pictures-and-backgrounds) uses all three.

In the showcase: `examples/showcase/src/story/cafe.ts`, whose café has a layered picture with a hotspot on Ava. No example uses pools or video yet.

```ts
import type { GameMedia, HotspotDef, HotspotView, MediaState, PictureDef, PictureLayer, PictureLayerView, PictureView, PoolFile, VideoFlags, VideoView } from '@ifloom/engine'
```

## GameMedia

The game's media, declared in its content's `media`. Every field is in [`GameMedia`](/docs/api/engine#gamemedia).

[`loadGame`](/docs/reference/content#loadgame) merges the content's and every pack's pools by id, and a pack's pool replaces one with the same id whole. A game with no `media` has no pools.

```ts
import type { Content } from '@ifloom/engine'

export const doors: Content = {
  media: {
    pools: {
      door: [
        { src: 'door/blue-day.jpg', tags: ['blue', 'day'], weight: 4 },
        { src: 'door/blue-night.jpg', tags: ['blue', 'night'] },
        { src: 'door/red-day.jpg', tags: ['red', 'day'] },
        { src: 'door/red-night.jpg', tags: ['red', 'night'] },
      ],
      window: [{ src: 'flat/window-rain.mp4', tags: ['rain'] }],
    },
  },
}
```

### pools

Each pool is a list of [`PoolFile`](#poolfile)s by id. Content asks a pool for a file in three places:

- Markup, as `[[img:@door|red,night]]`, `[[wide:@door]]` or `[[video:@window|rain]]`.
- A `{ media }` block, as `{ pool: 'door', tags: ['red', 'night'] }`.
- A picture layer, as `{ pool: 'window', tags: ['rain'] }`.

The engine picks a file in three steps:

1. It looks for the files that have every tag asked for.
2. With none, it drops the last tag and looks again, down to no tags, which is any file in the pool. So the tag that matters most goes first.
3. Among the files that fit, it draws one by their weights, from the save's seed and the pick's key, with [`weighted`](/docs/reference/random#weighted).

A request for `['blue', 'red']` finds no door that is both, drops `red`, and draws from the two blue doors. The save keeps each pick in [`MediaState`](#mediastate), so the same request in the same place shows the same file every time.

## PoolFile

One file in a pool. Every field is in [`PoolFile`](/docs/api/engine#poolfile).

`src` is a path through [`artSrc`](/docs/reference/prose#artsrc), as any picture's is, and a `.mp4` or `.webm` file is a video. `tags` are whatever words the game sorts its files by, such as a colour, the time of day or who's in it. `weight` is how often the file is drawn against the other files that fit, 1 unless set, so a file of weight 4 comes up four times as often as one of weight 1. A weight never makes a file fit a request whose tags it lacks. A pool whose files all weigh 1 draws as an unweighted pick would, so weights added later change only the picks not yet made.

## PictureDef

A layered picture with hotspots, in a [data scene](/docs/reference/scenes#picture)'s or a location's `picture`. Every field is in [`PictureDef`](/docs/api/engine#picturedef).

A UI stacks `layers` bottom first. `aspect` is the width over the height as CSS writes it, such as `'16/9'`, and the UI picks one when it's left out. The showcase's café shows Ava's photo while she's on shift, with a hotspot on her that sends the cast plugin's talk command:

```ts
import type { PictureDef } from '@ifloom/engine'
import { cast } from '@ifloom/plugin-cast'

export const cafePicture: PictureDef = {
  aspect: '16/10',
  layers: [{ id: 'counter', src: 'photo/ava.svg', when: cast.here('ava') }],
  hotspots: [{ id: 'ava', rect: [36, 22, 28, 44], label: 'Talk to Ava', command: cast.talk('ava'), layer: 'counter' }],
}
```

The layer has a `when`, and the hotspot names the layer, so both go when Ava does. With no layer shown, the location has no picture.

## PictureLayer

One layer of a picture, a file or a pool's pick, shown while its `when` holds. Every field is in [`PictureLayer`](/docs/api/engine#picturelayer).

Give `src` or `pool` with its `tags`, never both. `id` is what a hotspot's `layer` names. A layer is a video when `video` is `true` or its file ends in `.mp4` or `.webm`, and then the [video flags](#videoflags) apply.

## HotspotDef

A clickable area on a picture. Every field is in [`HotspotDef`](/docs/api/engine#hotspotdef).

`rect` is `[x, y, width, height]` in percent of the picture, from the top left, so `[0, 0, 100, 100]` is the whole picture. `label` is what a screen reader reads and the tooltip shows. A hotspot gives exactly one of these:

- **`command`**: any [command](/docs/reference/commands#command), greyed out by the same rules as an [action's button](/docs/reference/view#renderaction).
- **`choice`**: a choice of the open scene by id, which takes that choice's command, `disabled` and `warning`. Only a scene's picture can name one.

The view leaves a hotspot out while its `when` fails or its `layer` isn't shown.

## VideoFlags

The flags a video can carry on a `{ media }` block or a picture layer, the same as the [markup's](/docs/reference/prose#videos). Every field is in [`VideoFlags`](/docs/api/engine#videoflags).

Without flags, a video plays by itself, loops, is muted and has no controls, like a GIF. `controls` shows the player's controls and waits for a press, `once` plays it once, `sound` plays it with sound, and `poster` is a still shown before it plays, through `artSrc`.

## State

### MediaState

The pool picks a save keeps in [`state.media`](/docs/reference/state#media). Every field is in [`MediaState`](/docs/api/engine#mediastate).

`picks` holds the file each pick key was given, as its pool's `src`. After every command, the reducer records each pick on screen, which it reads from [`screen`](/docs/reference/view#screen-1) of the new state, covering the scene, the room and every plugin's view. The view reads the picks back and never writes them, so the same request shows the same file on every visit, after a reload, and after an update that adds files to the pool. If the recorded file has gone from the pool, the engine draws a new one. On a new game's first screen, before any command, the view draws each pick from the seed and the key, which gives the file the reducer then records, and [`replay`](/docs/reference/runner#replay) records the same picks in the same order.

A pick key is the pool, the tags, the owner and the slot, joined with `|`, such as `door|red,night|flat.knock|1`:

| Key | Meaning |
|---|---|
| A data scene's `{ media }` block | The owner is the scene's id and the slot the block's index in `body`, such as `1`. |
| Markup in a data scene's block | The owner is the scene's id and the slot the block's index and the request's place in its text, such as `0.0`. |
| A location's body, or any plugin [room scene](/docs/reference/plugin-views)'s | The owner is the location's id, and the slot is as for a data scene. |
| A message's or a post's body | The owner is the message's or post's id, and the slot is as for a data scene. |
| A picture layer | The owner is the scene's or location's id and the slot `picture:0`, `picture:1` and so on, by the layer's index. |

The visit isn't part of the key, so a scene shows the same door every time it opens.

## View

### PictureView

A picture as the player sees it, from [`pictureView`](/docs/reference/view#pictureview). Every field is in [`PictureView`](/docs/api/engine#pictureview).

The open scene's is in `view.scene.picture`, and a location's is in the [places plugin](/docs/reference/plugins/places)'s view. `aspect` is `null` for the UI to choose. `layers` holds only the layers shown now, bottom first, and `hotspots` only the ones shown now, each resolved to a button. To render one, see [Render the scene's picture](/docs/how-to/render/pictures-and-sound#render-the-scenes-picture).

### PictureLayerView

One layer that's shown. Every field is in [`PictureLayerView`](/docs/api/engine#picturelayerview).

`src` has been through [`artSrc`](/docs/reference/prose#artsrc), and a pool layer's is the pick. `id` is `null` for a layer with none, and `video` is set only for a video layer.

### HotspotView

A hotspot as a button. Every field is in [`HotspotView`](/docs/api/engine#hotspotview).

A UI sends `command` when the player presses it. `disabled` and `warning` mean what they do on a [`RenderedChoice`](/docs/reference/view#renderedchoice): greyed out with a reason, or pressable with a warning that the reducer refuses all the same.

### VideoView

How a video layer or a video beat plays, with the defaults filled in. Every field is in [`VideoView`](/docs/api/engine#videoview).

`autoplay` is `false` with `controls`, so a clip with controls waits for the player. `loop` is `false` with `once`, `muted` is `false` with `sound`, and `poster` has been through `artSrc`. A `video` [beat](/docs/reference/prose#scenebeat) carries the same fields.

## Checks

The [content checker](/docs/reference/checks) checks every picture and video content asks for against `game.media`: the markup in every line of prose, a data scene's `{ media }` blocks and `picture`, and a location's `picture`.

| Problem | Cause |
|---|---|
| `unknown pool "…"` | Markup, a `{ media }` block or a picture layer names a pool `game.media.pools` doesn't have. |
| `no file in pool "…" is tagged "…"` | A request asks for a tag no file in the pool has. The pick falls back, but a tag nothing has is a typo more often than not. |
| `a pool with no files` | A pool is empty, reported as `pool <id>`. |
| `file <n> has no src` | A file in a pool has no `src`, reported as `pool <id>`. |
| `file <n> has a weight of …; a weight must be above 0` | A file's `weight` is 0 or less, reported as `pool <id>`. |
| `unknown flag "…" in …` | Markup has a `name=value` part whose name isn't a flag, such as `speed=2`. |
| `"…" and "…" can't all be alt text in …; is one a misspelt flag?` | Markup has more than one part that isn't a flag. |
| `video flag "…" on a picture` | Markup, a `{ media }` block or a picture layer puts `controls`, `once`, `sound` or `poster` on a picture file. A pool with a video in it may take them. |
| `flag "rot" turns a picture, not a video, in …` | Video markup has `rot`. |
| `media: needs a src or a pool`, `media: has both a src and a pool` | A `{ media }` block has neither or both. A picture layer gets the same after `picture layer <id>:`. |
| `picture layer <id>: two layers share this id` | Two layers of one picture have the same `id`. A layer with no `id` is named by its index. |
| `hotspot <id>: needs exactly one of command and choice` | A hotspot has both, or neither. |
| `hotspot <id>: no choice "…" in this scene` | A hotspot's `choice` isn't one of the scene's choices. |
| `hotspot <id>: names choice "…", but only a scene has choices` | A location's hotspot has a `choice`. |
| `hotspot <id>: rect must be four numbers: [x, y, width, height]` | A hotspot's `rect` isn't four numbers. |
| `hotspot <id>: rect is outside 0 to 100` | A number in the rect is below 0 or above 100. |
| `hotspot <id>: rect has no width or height` | The width or the height is 0. |
| `hotspot <id>: rect runs off the picture: x + width and y + height must be 100 or less` | The rect goes past the right or bottom edge. |
| `hotspot <id>: two hotspots share this id` | Two hotspots of one picture have the same `id`. |
| `hotspot <id>: unknown layer "…"` | A hotspot's `layer` names no layer of its picture. |

The checker reads a hotspot's `command` and `when`, and a layer's `when`, as it reads any command and condition, with `hotspot <id>:` or `picture layer <id>:` in front. It also lists every picture and video file the game names in its [`files`](/docs/reference/checks#fileref).

## Caveats

- Reordering a scene's blocks or a picture's layers changes their slots, so the engine draws their picks again.
- A pool with nothing to give, unknown or empty, leaves its markup, block or layer out of the view.
- Browsers refuse to start a video with sound by itself, so a UI may need the player to press play when `muted` is `false`.
- [`mediaType`](/docs/reference/prose#mediatype) tells a picture from a video by the file's extension alone. A file with no extension is a picture, `.jpg`, unless its markup says `video`.
