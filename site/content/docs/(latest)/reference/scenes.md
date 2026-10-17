---
title: "Scenes"
---
A scene is one screen of story: some prose, and the choices under it. The engine runs every scene the same way, as an object with a `render` function that turns the current state into a [`SceneView`](#sceneview). You can write a scene in either of two ways, and list both kinds side by side in `game.scenes`:

- **Declare it as data**, as a [`DataScene`](#datascene). Its prose lives in [prose keys](/docs/reference/prose), its conditions and effects are data, and the [content checker](/docs/reference/checks) can check every id it names. The engine renders it for you (see [Running data scenes](#running-data-scenes)). Most scenes should be data scenes.
- **Write it by hand**, as a [`Scene`](#scene). You get full control in plain TypeScript, for a screen that doesn't fit blocks and choices.

Either kind can also be a [storylet](/docs/reference/storylets), a scene an effect draws at random from a named set. See [`StoryletFields`](#storyletfields).

For a walkthrough, see [Your first story](/docs/guide/first-story). For what happens after the player picks a choice, see [Commands](/docs/reference/commands#choose) and [Effects](/docs/reference/effects).

## Scene

```ts
import type { Scene } from '@ifloom/engine'

type Scene = {
  id: string
  title?: string
  speaker?: string
  frame?: 'talk'
  tags?: string[]
  panel?: string
  drawnFrom?: string[]
  weight?: number
  when?: Condition
  render: (state: GameState, ctx: SceneCtx) => SceneView
}
```

This is what sits in `game.scenes`. The engine calls `render` whenever it builds the view and again when the player chooses, so it must be a pure function of `state` (and of `ctx`, which comes from the state). If you need anything random, draw it with [`roll` or `pick`](/docs/reference/random), never `Math.random`.

The top-level `title`, `speaker`, `frame`, `tags` and `panel` are fallbacks. Whatever `render` returns in its `SceneView` wins. `drawnFrom`, `weight` and `when` make the scene a storylet (see [`StoryletFields`](#storyletfields)).

```ts
import type { Scene } from '@ifloom/engine'

const counter: Scene = {
  id: 'cafe.counter',
  title: 'The Corner Café',
  speaker: 'ava',
  render: (state) => ({
    body: (state.stats.coins ?? 0) >= 4
      ? 'Ava wraps a sandwich in paper and slides it over.'
      : 'Ava looks at your empty hands and smiles anyway.',
    choices: [
      {
        id: 'buy',
        label: 'Buy a sandwich (4)',
        disabled: (state.stats.coins ?? 0) < 4 ? 'You need 4 coins.' : undefined,
        effects: [{ kind: 'stat', stat: 'coins', by: -4 }, { kind: 'item', item: 'sandwich', by: 1 }],
      },
      { id: 'leave', label: 'Leave', effects: [{ kind: 'scene', scene: null }] },
    ],
  }),
}
```

**Gotcha.** The [content checker](/docs/reference/checks) can't see inside a hand-written scene. It looks at one's choices only when you give [`checkGame`](/docs/reference/checks#probes) probe states. Otherwise a typo in a scene id inside a hand-written effect turns up at run time, when the player lands on a scene that doesn't exist and reads "The moment has passed." (the [`momentPassed`](/docs/reference/strings#buttons-and-labels) string).

## SceneView

```ts
import type { SceneView } from '@ifloom/engine'

type SceneView = {
  title?: string
  speaker?: string               // a speaker id, as a plugin knows it: the cast's characters
  frame?: 'talk'
  tags?: string[]
  panel?: string
  panelData?: unknown
  portrait?: string
  body?: string                  // the scene's prose, with its markup
  media?: SceneMedia[]
  stage?: MediaStage             // a layered picture with hotspots
  audio?: Record<string, string | null>   // background audio by channel while the scene is open
  choices: SceneChoice[]
}
```

What `render` returns.

| Field | Meaning |
|---|---|
| `title` | The heading. Falls back to `Scene.title`, then the title of a plugin's [stage](/docs/reference/plugins#stage) (with the [places plugin](/docs/plugins/places#the-stage), the room's name), then the game's title. |
| `speaker` | Who's talking, as an id that a [plugin's `speaker`](/docs/reference/plugins#speakers) knows, such as a [cast](/docs/plugins/cast#speakers) character's. The view shows their name and portrait and makes the frame `talk` by default. Falls back to `Scene.speaker`. Nothing else sets a speaker. The engine never reads one from the scene's id, so `ava.chat` with no `speaker` has none. An id no plugin knows gives no speaker either, so a game without the cast (or another plugin that answers) shows none. |
| `frame` | `'talk'` draws the screen as a conversation. Falls back to `Scene.frame`. Without either, the view's frame is `talk` when there's a speaker and `stage` when there isn't. |
| `tags` | Words the UI can style the scene by, such as `['letter']` or `['flashback']`. The engine gives them no meaning and passes them to [`view.scene.tags`](/docs/reference/view#the-scene). Falls back to `Scene.tags`, then `[]`. |
| `panel` | The name of a bespoke UI panel the game draws instead of the choice list. The panel keeps its own local state and finishes by dispatching one of the scene's own choices. |
| `panelData` | Whatever that panel needs. The engine passes it through without looking inside. |
| `portrait` | Replaces the speaker's portrait as the stage image. |
| `body` | The scene's prose, with its [markup](/docs/reference/prose#markup). The view parses it into beats. If it's left out, the scene has no body text. |
| `media` | Pictures and videos that aren't in the prose. See [`SceneMedia`](#scenemedia). |
| `stage` | A layered picture with hotspots, drawn as the scene's stage. See [The stage](#the-stage). |
| `audio` | What plays on [background channels](/docs/reference/audio#what-plays-on-a-background-channel) while the scene is open, by channel. It wins over effects, places and the default. `null` silences a channel. |
| `choices` | Every choice the scene knows about, including hidden ones. |

## SceneChoice

```ts
import type { SceneChoice } from '@ifloom/engine'

type SceneChoice = {
  id: string
  label: string
  visible?: boolean
  disabled?: string
  tags?: string[]
  irreversible?: string
  effects: Effect[]
}
```

| Field | Meaning |
|---|---|
| `id` | What the `choose` command names. Unique within the scene. |
| `label` | The button text. |
| `visible` | `false` hides it. Shown by default. |
| `disabled` | A reason. The button stays on screen, greyed out, with this text. It's worked out by the render for this state; a [data scene](#choice) writes `blocked` instead and the engine fills it in. |
| `tags` | Words the UI can style or filter the choice by, such as `['kind']` or `['risky']`. The engine gives them no meaning and passes them to the [`RenderedChoice`](/docs/reference/view#renderedchoice). |
| `irreversible` | A warning the UI shows before the choice is taken. A [runner](/docs/reference/runner#historyoptions) with history on never undoes past it. |
| `effects` | Applied in order when the player picks it. See [Effects](/docs/reference/effects). |

The view works out a choice's [price](/docs/reference/view#price) from its `effects`. That covers what it spends of any [spendable](/docs/reference/stats#statdef) stat, and what plugins note about it, such as the [calendar](/docs/plugins/calendar#price-notes)'s `until evening`. What a choice pays the player is never shown.

### How `choose` checks a choice

The `choose` command first asks [`whyNot`](/docs/reference/actions#whynot), which renders the open scene again against the current state. The command is refused, leaving the state unchanged, at the first of these that applies:

1. A [lock](/docs/reference/locks) stops `choose`. The refusal is the lock's `reason`.
2. A [plugin's guard](/docs/reference/plugins#guards-prices-and-labels) refuses it outright.
3. The game has its own [`rules.commands.choose`](/docs/reference/rules#commands). It's called instead of steps 4 and 5, and a string it returns is the refusal. If it returns a state, that state is the result (after step 6), and the choice's effects don't run unless the rule runs them.
4. No scene is open, or the scene has no choice with that id, or the choice's `visible` is `false`.
5. The choice's `disabled` is set. The refusal is the disabled text.
6. A plugin's guard gives a soft warning, such as the [calendar](/docs/plugins/calendar#the-guard)'s `That would run past dawn.` This one isn't part of `whyNot`, so the button can still be pressed, but the reducer refuses the command with the warning (see [`warningOf`](/docs/reference/actions#warningof)).

Otherwise `choose` applies the choice's `effects` in order. If the scene itself no longer exists, `choose` just closes it. Use [`apply`](/docs/reference/commands#apply) rather than `dispatch` when you need to know which of these happened.

## SceneCtx

```ts
import type { SceneCtx } from '@ifloom/engine'

type SceneCtx = {
  kv: (key: string) => KvValue | undefined
  storylineKv: (storylineId: string, key: string) => KvValue | undefined
  picks?: Record<string, string>
}
```

The second argument to `render`. It gives a hand-written scene shortcuts into the state, though everything here can also be read from `state`. `kv(key)` reads a key in the game's [kv store](/docs/reference/state#kv), and `storylineKv(id, key)` one in a [storyline](/docs/reference/storylines)'s. Both are `undefined` when unset. `picks` is set when the engine draws a [`screen`](/docs/reference/view#screen) and wants the render's new [pool picks](/docs/reference/media#remembered-picks) recorded. Pass it on to [`renderScene`](#renderscene) if you call that yourself.

```ts
render: (state, ctx) => {
  const body = ctx.storylineKv('ava', 'knowsYou') ? 'Ava waves you in.' : 'Ava nods, busy at the till.'
  // ...
}
```

There's no time of day here. With the [calendar](/docs/plugins/calendar), read it with the calendar's conditions or its `read`.

**Gotcha.** There's nothing here about people or places, because the engine keeps neither. A hand-written scene that needs to know who's in the room asks with a condition over a `game` it closes over, such as `holds(state, here('ava'), game)` with the [cast](/docs/plugins/cast#conditions)'s `here`. A data scene puts the same condition in a block's `when`.

### sceneContext

```ts
function sceneContext(state: GameState, game: Game): SceneCtx
```

Builds the `SceneCtx` the engine passes to `render`. Call it when you render a hand-written scene yourself, in a test or in a tool that previews scenes:

```ts
import { sceneContext } from '@ifloom/engine'

const shown = counter.render(state, sceneContext(state, game))
```

## SceneMedia

```ts
import type { SceneMedia } from '@ifloom/engine'

type SceneMedia = {
  src?: string                       // resolved with artSrc
  pool?: string                      // or a pick from this pool
  tags?: string[]                    // the tags the pick should have
  alt?: string
  size?: 'inline' | 'wide'           // default 'inline'
  at?: 'lead' | 'end'
  video?: boolean                    // a .mp4 or .webm is a video anyway
  controls?: boolean
  once?: boolean
  sound?: boolean
  poster?: string
}
```

A picture or a video, in a data scene's [`{ media }` block](#block) or a `SceneView`'s `media` list. Give a file as `src`, which goes through [`artSrc`](/docs/reference/prose#artsrc) (`'scene/market-morning'` becomes `art/scene/market-morning.jpg`), or ask a [pool](/docs/reference/media#pools) for one with `pool` and `tags`. `size` is `inline` or `wide`, as for [images in prose](/docs/reference/prose#images).

It's a video when `video` is `true` or the file ends in `.mp4` or `.webm`. `controls`, `once`, `sound` and `poster` are the [video flags](/docs/reference/prose#videos), and they mean the same as in markup.

`at` says where it goes:

- **Left out**, a `{ media }` block sits where it is in the body, in order with the prose. A hand-built scene's `media` list has no place in the body, so its entries go after it.
- **`lead`** puts it before the body, as an establishing still.
- **`end`** puts it after the body.

```ts
{ media: { src: 'scene/market-morning', size: 'wide', at: 'lead' } }
{ media: { src: 'clips/kettle.mp4', alt: 'The kettle coming to the boil' } }
{ media: { pool: 'door', tags: ['red', 'night'], alt: 'The front door' } }
```

**Gotcha.** An in-place `{ media }` block is written into the scene's `body` as the markup that draws it, such as `[[widevideo:clips/kettle.mp4|The kettle]]`. So `view.scene.body` shows it as markup, and anything that reads a body as text sees it too. Alt text loses any `|` or `]`, which the markup can't hold.

## DataScene

```ts
import type { DataScene, Block, Choice } from '@ifloom/engine'

type DataScene = {
  id: string
  title?: string
  speaker?: string
  frame?: 'talk'
  tags?: string[]
  panel?: string
  panelData?: string      // the name of a custom panel on the game
  audio?: Record<string, string | null>   // background audio by channel while it's open
  stage?: MediaStage      // a layered picture with hotspots
  drawnFrom?: string[]    // the storylet sets it can be drawn from
  weight?: number         // how often a draw picks it, 1 if left out
  when?: Condition        // only drawn while this holds
  minigame?: string       // a minigame that starts when it's entered
  body: Block[]
  choices: Choice[]
}
```

A scene written as data. You build its body from blocks, each with its own prose key, rather than writing one key for the whole body. That way a conditional line is one more block, not another copy of the scene. Put it straight into `game.scenes`, or a [pack](/docs/reference/loader#pack)'s `scenes`, and the engine [bakes](#running-data-scenes) it into a `Scene` when it's first shown.

This is Ava's hello from the showcase:

```ts
import type { DataScene } from '@ifloom/engine'
import { person } from '@ifloom/plugin-cast'

const hello: DataScene = {
  id: 'ava.hi',
  title: 'Ava',
  speaker: 'ava',
  body: [
    { text: 'ava.hi' },
    { variants: 'ava.smalltalk' },
    { text: 'ava.hi/regular', when: { seen: 'ava.hi', gte: 3 } },
  ],
  choices: [
    { id: 'chat', once: { per: 'turn', reason: 'She has a queue.' }, effects: [{ kind: 'stat', stat: 'friendship', by: 5, of: person('ava') }] },
    { id: 'compliment', when: { stat: 'charm', gte: 3 }, effects: [{ kind: 'stat', stat: 'friendship', by: 10, of: person('ava') }, { kind: 'scene', scene: null }] },
    { id: 'bye', effects: [{ kind: 'scene', scene: null }] },
  ],
}
```

Its prose lives under the keys `ava.hi` and `ava.hi/regular`, the members of the variants `ava.smalltalk` (`ava.smalltalk/rain` and the rest), and the labels `ava.hi#chat`, `ava.hi#compliment` and `ava.hi#bye`. See [The showcase](/docs/guide/showcase#data-scenes-variants-and-once-a-turn-choices) for how it plays.

### audio

A data scene's `audio` names what plays on [background channels](/docs/reference/audio#channels) while it's open, and `renderScene` passes it on to the `SceneView`. Here the flat goes quiet for a letter:

```ts
{ id: 'flat.letter', audio: { music: null, ambience: 'rain' }, body: [{ text: 'flat.letter' }], choices: [/* ... */] }
```

A channel the scene doesn't name keeps playing whatever an effect, the place or the default says. For one-shot sounds, use `[[sound:id]]` in the [prose](/docs/reference/prose#sound-and-voice). The loader reports an unknown track or channel, and a sound effect's track put on a background channel.

### Block

```ts
type Block =
  | { text: string; when?: Condition }
  | { variants: string; when?: Condition; gate?: Record<string, Condition>; art?: Record<string, string> }
  | { media: SceneMedia; when?: Condition }
```

Blocks render in order, and a block whose `when` fails is dropped. Rendered blocks are joined with a blank line between them.

- **`text`** renders the prose at that key. An unwritten key renders nothing.
- **`variants`** renders one member of a named set of variants, drawn by [`drawVariant`](#drawvariant) (or a custom runtime's `prose.draw`). What the draw needs to remember, so the variants rotate, is added to the effects of every choice. The members are `game.prose.variants(name)`, minus any key the same scene uses as a `text` block and any key with no prose. So a scene's own fixed block named `ava.smalltalk/closing` is never dealt as a random line.
  - **`gate`** puts conditions on individual members, by key. A member whose gate fails is left out of the draw, so one set of variants can hold a line that only makes sense later.
  - **`art`** names, for a member, another set of variants to draw a picture from. The drawn picture's prose (usually just an image line) goes in front of the drawn member.
- **`media`** renders a picture or a video, [`SceneMedia`](#scenemedia), with no prose key. Without `at`, it's drawn right there in the body, between the blocks around it.

**Gotchas.**
- If every member of a set of variants is gated out, the block renders nothing and there's no error.
- In a [place's body](/docs/plugins/places#the-stage), or any plugin's [stage](/docs/reference/plugins#stage), a `variants` block has no choice to record its draw, so the count never moves. The member is picked by the save's seed and the [turn](/docs/reference/state#turn). A room deals a fresh line each turn and the same line every time the player looks in that turn, and it can deal the same line two turns running.

### The stage

A scene can have a stage: a picture made of layers, with hotspots on it that the player can click. The flat in the showcase has a room, a lamp that only shows in the evening, and the front door as a hotspot that takes the scene's `leave` choice.

```ts
const flat: DataScene = {
  id: 'flat.morning',
  stage: {
    aspect: '16/9',
    layers: [
      { id: 'room', src: 'scene/flat' },
      { id: 'lamp', src: 'scene/flat-lamp.png', when: { kv: 'evening' } },
      { id: 'rain', pool: 'window', tags: ['rain'] },
    ],
    hotspots: [
      { id: 'door', rect: [78, 20, 18, 75], label: 'The front door', choice: 'leave' },
      { id: 'lamp', rect: [10, 10, 12, 30], label: 'The lamp', command: { type: 'activity', id: 'read' }, layer: 'lamp' },
    ],
  },
  body: [{ text: 'flat.morning' }],
  choices: [{ id: 'leave', effects: [{ kind: 'scene', scene: null }] }],
}
```

Layers are drawn bottom first. Each one is a file (`src`) or a pick from a [pool](/docs/reference/media#pools) (`pool` and `tags`), shown while its `when` holds. A layer is a video when `video` is `true` or its file is a `.mp4` or `.webm`, and it takes the same video flags as a [`SceneMedia`](#scenemedia).

A hotspot is a rectangle, `[x, y, width, height]` in percent of the stage from the top left. It does exactly one of two things:

- **`choice`** takes a choice of this scene, by id. It's greyed out exactly when the choice's button is, with the same reason, and it's left out while the choice is hidden.
- **`command`** sends any [command](/docs/reference/commands), and is greyed out by the same rules as an [action's button](/docs/reference/view#renderaction).

A hotspot with a `when` that fails is left out, and so is one whose `layer` isn't shown. `label` is what a screen reader reads.

The view resolves the stage into [`view.scene.stage`](/docs/reference/view#the-scene), and the [React UI](/docs/react) draws it with [`Stage`](/docs/react/components#stage), with its hotspots as buttons over the picture. See [Media](/docs/reference/media#the-stage) for the types. A hand-built scene can return a `stage` from `render` too.

**Gotchas.**
- The loader reports a hotspot with both or neither of `command` and `choice`, a `choice` the scene doesn't have, a rect outside 0 to 100 or running off the edge, two hotspots with one id, a `layer` no layer has, and an unknown pool or tag.
- `view.scene.stageImage` is still set as before, next to `stage`. A UI decides which to draw.

### Choice

```ts
type Choice = {
  id: string
  label?: string
  labels?: { when?: Condition; key: string }[]
  when?: Condition
  blocked?: Blocked[]
  once?: { per: 'turn'; reason: string; key?: string }
  tags?: string[]
  irreversible?: string
  effects: EffectRef[]
}
```

| Field | What it does | Default |
|---|---|---|
| `label` | The prose key for the button text. | `` `${scene.id}#${id}` `` |
| `labels` | Labels that depend on state. The first whose `when` holds wins. | `label` |
| `when` | The choice is shown only while this holds. A failing `when` sets `visible: false`. | always shown |
| `blocked` | Reasons to grey it out, as [`Blocked`](/docs/reference/actions#blocked) entries. The first whose `when` holds becomes the `disabled` text. One with `hide: true` leaves the choice off the screen instead. | not blocked |
| `once` | The choice pays once per [turn](/docs/reference/state#turn), which is once a day with the [calendar](/docs/plugins/calendar)'s default. `per` is always `'turn'`. Afterwards the choice stays on screen, disabled with `reason`, and its effects shrink to just its `scene` effects so it still navigates. `key` records it under a different name. | unlimited |
| `tags`, `irreversible` | Passed through to [`SceneChoice`](#scenechoice). | |
| `effects` | Literal [effects](/docs/reference/effects), or `{ custom: 'name', with: {...} }` for effects worked out by a [custom effect](/docs/reference/custom#effects) on the game. An unknown name adds nothing, and the loader reports it. | |

**Label lookup order.** A drawn variant can carry its own reply. If a block this render used has prose at `` `${drawnKey}#${choice.id}` ``, that wins (the last such block, if there are several). After that come the first matching `labels` entry, then `label`, then `` `${scene.id}#${choice.id}` ``. If none of those keys has prose, the button shows the bare choice id.

```ts
{
  id: 'ask',
  labels: [{ when: { seen: 'ava.river' }, key: 'ava.hi#ask-again' }],
  once: { per: 'turn', reason: 'You have asked today already.' },
  effects: [{ kind: 'stat', stat: 'friendship', by: 2, of: person('ava') }],
}
```

**Gotchas.**
- With the [default runtime](#defaultruntime), `per: 'turn'` is recorded with [`markUsed`](/docs/reference/progress#usedthisturn-and-markused) as the kv key `turn:scene.choice` (or `turn:<once.key>`). The turn ending clears it, through a [`turn`](/docs/reference/effects#turn) effect or the calendar's sleep. Leaving the scene doesn't.
- For a once-a-turn limit outside a `DataScene`, see [`oncePerTurn`](/docs/reference/progress#onceperturn).

### panelData

`panelData` on a `DataScene` names a [custom panel](/docs/reference/custom#panels) in `game.custom.panels`. The scene calls it with the state and puts the result on `SceneView.panelData`, so a scene with a bespoke panel can stay declarative.

```ts
import type { Custom } from '@ifloom/engine'

// goes on the game as `custom`
const custom: Custom = {
  panels: { menuPrices: (state) => ({ coffee: 3, sandwich: state.kv.hadCoffee ? 3 : 4 }) },
}
// DataScene: { id: 'cafe.menu', panel: 'MenuPanel', panelData: 'menuPrices', ... }
```

**Gotcha.** An unknown name gives `panelData: undefined`, not an error. The [content checker](/docs/reference/checks) reports a data scene's unknown one as `no custom panel named "…"`, but can't see a hand-written scene's.

## StoryletFields

```ts
import type { StoryletFields } from '@ifloom/engine'

type StoryletFields = {
  drawnFrom?: string[]
  weight?: number
  when?: Condition
}
```

The fields that make a scene a [storylet](/docs/reference/storylets), a scene drawn at random from a named set by the effect [`{ kind: 'scene', from }`](/docs/reference/effects#scene). Both `Scene` and `DataScene` have them, and also `minigame`, a [minigame](/docs/reference/minigames#minigamescenefields) that starts when the scene is entered.

| Field | Default | What it does |
|---|---|---|
| `drawnFrom` | none | The sets the scene can be drawn from, such as `['cafe']`. It's separate from `tags`, which only style a scene. |
| `weight` | `1` | How likely a draw is to pick it against the other eligible scenes. |
| `when` | always | A [condition](/docs/reference/conditions) that must hold for the scene to be drawn. |

```ts
import type { DataScene } from '@ifloom/engine'
import { here, person } from '@ifloom/plugin-cast'

const avasBreak: DataScene = {
  id: 'cafe.break',
  title: 'Ava’s break',
  speaker: 'ava',
  drawnFrom: ['cafe'],
  weight: 2,
  when: here('ava'),
  body: [{ text: 'cafe.break' }],
  choices: [{ id: 'leave', effects: [{ kind: 'stat', stat: 'friendship', by: 2, of: person('ava') }, { kind: 'scene', scene: null }] }],
}
```

**Gotchas.**
- `when` gates draws only. A `scene` command or a `{ kind: 'scene', id }` effect naming the scene opens it whether `when` holds or not.
- The loader reports a `weight` or a `when` on a scene with no `drawnFrom`, and a weight of 0 or less. See [the checks](/docs/reference/storylets#the-checks).

## Running data scenes

A game lists data scenes in `game.scenes` and the engine runs them. The reducer and the view get every scene through [`sceneById`](/docs/reference/game#scenebyid). The first time it's asked for a `DataScene`, it bakes it into a `Scene` that renders with [`defaultRuntime`](#defaultruntime), and keeps the result. You don't have to write a runtime, wrap your scenes or give them a `render`.

The default runtime reads:

- **words** from `game.prose` (set by [`loadGame`](/docs/reference/loader#loadgame), or by you with [`proseStore`](/docs/reference/prose#prosestore-1)), with tokens filled in for the save
- **variants** drawn by [`drawVariant`](#drawvariant), which rotates and starts somewhere different each turn, or draws by weight when a member has a [weight](/docs/reference/prose#variantmember)
- **`once: { per: 'turn' }`** through [`usedThisTurn` and `markUsed`](/docs/reference/progress#usedthisturn-and-markused)
- **conditions, custom effects and panels** from the game

Only write a [`SceneRuntime`](#sceneruntime) and call [`renderScene`](#renderscene) yourself when a game needs something different, such as words from another store or its own idea of what "once" counts.

### bakeScene

```ts
function bakeScene(game: Game, scene: DataScene): Scene
```

The `Scene` the engine runs for a data scene. It has the data scene's `id`, `title`, `speaker`, `frame`, `tags` and `panel`, its `drawnFrom`, `weight` and `when` when it has them, and a `render` that calls `renderScene` with `defaultRuntime(game)`. It's built once per `DataScene` object and game, and cached. `sceneById` calls it for you.

The cache is per game, so the same scene object listed in two games runs with each game's own prose and custom functions.

### defaultRuntime

```ts
function defaultRuntime(game: Game): SceneRuntime
```

The runtime described above, for one game. It reads `game.prose` each time it needs a line, so setting `game.prose` after the runtime is made still works. It's a useful base for a custom runtime that changes one thing:

```ts
import { defaultRuntime, type SceneRuntime } from '@ifloom/engine'

const runtime: SceneRuntime = {
  ...defaultRuntime(game),
  spent: (state, scene, choice) => Boolean(state.kv[`once:${scene}.${choice}`]),
  spend: (state, scene, choice) => [{ kind: 'kv', key: `once:${scene}.${choice}`, to: true }],
}
```

### drawVariant

```ts
function drawVariant(
  state: GameState,
  name: string,
  members: string[],
  weightOf?: (key: string) => number | undefined,
): { id: string; remember: Effect }
```

Returns the member of a set of variants this state gets, and the effect that records the draw. The [turn](/docs/reference/state#turn) picks a starting offset through its own [hash](/docs/reference/random), mixed with the save's seed, as `roll(members.length, name, seed, turn)`. The count of draws so far, kept in the kv key `variants:<name>`, then walks one step at a time from there. So a scene doesn't repeat itself on consecutive visits, and two playthroughs don't deal the same lines.

With `weightOf`, and any member weighing something other than 1, it draws by weight instead, with [`weighted`](/docs/reference/random#weighted) seeded by the name, the save's seed, the turn and the count. A weight `weightOf` leaves out counts as 1. The count still goes up, so the next draw is a fresh one. The [default runtime](#defaultruntime) passes the weights from `game.prose`.

```ts
import { drawVariant } from '@ifloom/engine'

const { id, remember } = drawVariant(state, 'street.weather', ['street.weather/drizzle', 'street.weather/sun', 'street.weather/wind'])
// id: one of the three; remember: { kind: 'kv', key: 'variants:street.weather', to: 1 }
```

**Gotchas.**
- It throws on an empty `members`. Data scenes never call it with one, because a block whose members are all gated out renders nothing.
- The count is per name, not per scene. Two scenes drawing the same variants share one rotation.

### isDataScene

```ts
function isDataScene(scene: Scene | DataScene): scene is DataScene
```

True for a data scene (it has a `body` list) and false for a hand-written one. Use it in tools that walk `game.scenes`.

## renderScene

```ts
function renderScene(scene: DataScene, state: GameState, runtime: SceneRuntime, picks?: Record<string, string>): SceneView
```

Turns a `DataScene` and a state into a `SceneView` with the runtime you give it. A pool pick the save doesn't hold yet is written into `picks`, when you pass it. The engine calls it for you through [`bakeScene`](#bakescene). To render a data scene with a runtime of your own, list a hand-written `Scene` that wraps it, and pass on the context's `picks` so its pictures are remembered:

```ts
import { renderScene, type Scene } from '@ifloom/engine'

const counter: Scene = {
  id: 'cafe.counter',
  render: (state, ctx) => renderScene(counterData, state, runtime, ctx.picks),
}
```

### SceneRuntime

```ts
type SceneRuntime = {
  prose: Prose
  game: Game
  spent: (state: GameState, scene: string, choice: string) => boolean
  spend: (state: GameState, scene: string, choice: string) => Effect[]
}
```

What a custom runtime supplies. You only need one if [`defaultRuntime`](#defaultruntime), the one the engine uses, doesn't suit you.

- `prose` is a [`Prose`](/docs/reference/prose#prose): a [`ProseStore`](/docs/reference/prose#prosestore) plus `draw`, which picks a member and returns an effect that records the pick. [`drawVariant`](#drawvariant) is a ready-made `draw`.
- `game` is the game, used for conditions, custom effects and panels.
- `spent` and `spend` back `once`. With a `once.key`, they're called with `(key, '')` instead of `(scene.id, choice.id)`.

## See it in an example

- Small Town: `ava.hi` in [`examples/showcase/src/content/town.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/content/town.ts) is a data scene with a `variants` block, a line with a `when`, a `speaker` and a choice limited to once a turn.
- The Letter: [`examples/novel/src/game.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/novel/src/game.ts) is three chapter scenes and two endings with `choices: []`.
