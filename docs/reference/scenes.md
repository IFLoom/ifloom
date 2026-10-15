# Scenes

A scene is one screen of story: some prose, and the choices under it. The engine runs every scene the same way — an object with a `render` function that turns the current state into a [`SceneView`](#sceneview). You can write a scene either way, and list both kinds side by side in `game.scenes`:

- **Declare it as data** as a [`DataScene`](#datascene). Prose lives in [prose keys](/reference/prose), conditions and effects are data, and the [loader](/reference/loader) can check every id it names. The engine renders it for you — see [Running data scenes](#running-data-scenes). Most scenes should be this.
- **Write it by hand** as a [`Scene`](#scene). Full control, plain TypeScript, for the screen that does not fit blocks and choices.

For a walkthrough, see [Your first game](/guide/first-game). For what happens after a choice is picked, see [Commands](/reference/commands#choose) and [Effects](/reference/effects).

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
  render: (state: GameState, ctx: SceneCtx) => SceneView
}
```

What sits in `game.scenes`. `render` is called whenever the view is built and again when the player chooses, so it must be a pure function of `state` (and `ctx`, which is derived from it). Draw anything variable with [`roll`/`pick`](/reference/random), never `Math.random`.

The top-level `title`, `speaker`, `frame`, `tags` and `panel` are fallbacks: whatever `render` returns in its `SceneView` wins.

```ts
const counter: Scene = {
  id: 'cafe.counter',
  title: 'The café',
  speaker: 'baker',
  render: (state) => ({
    body: (state.stats.coins ?? 0) >= 3
      ? 'The baker slides a bun across the counter.'
      : 'The baker looks at your empty hands and smiles anyway.',
    choices: [
      {
        id: 'buy',
        label: 'Buy a bun (3)',
        disabled: (state.stats.coins ?? 0) < 3 ? 'Not enough on you.' : undefined,
        effects: [{ kind: 'stat', key: 'coins', by: -3 }, { kind: 'item', id: 'bun', by: 1 }],
      },
      { id: 'leave', label: 'Leave', effects: [{ kind: 'scene', id: null }] },
    ],
  }),
}
```

**Gotcha:** a `Scene` written by hand is not checked by the loader — only `DataScene`s are. A typo in a scene id inside a hand-written effect is found at runtime, when the reducer ends up on a scene that does not exist and shows "The moment has passed." (the [`momentPassed`](/reference/strings#buttons-and-labels) string).

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
  storyKey?: string
  body?: string                  // prose, in the markup on /reference/prose
  media?: SceneMedia[]
  choices: SceneChoice[]
}
```

What `render` returns.

| Field | Meaning |
|---|---|
| `title` | Heading. Falls back to `Scene.title`, then the title of a plugin's [stage](/reference/plugins#stage) (the [places plugin](/plugins/places#the-stage)'s: the room's name), then the game's title. |
| `speaker` | Who is talking: an id a [plugin's `speaker`](/reference/plugins#speakers) knows, such as a [cast](/plugins/cast#speakers) character's. The view shows their name and portrait and defaults the frame to `talk`. Falls back to `Scene.speaker`. Nothing else makes a speaker: the scene's id is never read for one, so `baker.chat` with no `speaker` has none. An id that no plugin knows gives no speaker either, so a game without the cast (or another plugin that answers) shows none. |
| `frame` | `'talk'` draws the screen as a conversation. Falls back to `Scene.frame`; without either, the view's frame is `talk` when there is a speaker and `stage` when there is not. |
| `tags` | Words the UI can style the scene by: `['letter']`, `['flashback']`. The engine gives them no meaning and passes them to [`view.scene.tags`](/reference/view#the-scene). Falls back to `Scene.tags`, then `[]`. |
| `panel` | The name of a bespoke UI panel the game draws instead of the choice list. The panel keeps its own local state and ends by dispatching one of the scene's own choices. |
| `panelData` | Whatever that panel needs. The engine passes it through without looking inside. |
| `portrait` | Overrides the speaker's portrait as the stage image. |
| `storyKey` | Not read by the engine; a field the first game uses for its own prose lookup. |
| `body` | Prose, parsed into [beats](/reference/prose#markup) by the view. Omitted is treated as empty. |
| `media` | Pictures that are not in the prose. See [`SceneMedia`](#scenemedia). |
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
| `visible` | `false` hides it. Default: shown. |
| `disabled` | A reason. The button is on screen, greyed out, with this text. |
| `tags` | Words the UI can style or filter the choice by: `['kind']`, `['risky']`. The engine gives them no meaning and passes them to the [`RenderedChoice`](/reference/actions#renderedchoice). |
| `irreversible` | A warning the UI shows before the choice is taken. A [runner](/reference/runner#historyoptions) with history on never undoes past it. |
| `effects` | Applied in order when it is chosen. See [Effects](/reference/effects). |

The view shows the price of a choice — what it spends of any [spendable](/reference/stats#statdef) stat, and what plugins note about it, such as the [calendar](/plugins/calendar#price-notes)'s `until evening` — from its `effects`. What a choice *pays* is never shown. See [The view](/reference/view#renderedchoice).

### How `choose` checks a choice

The `choose` command renders the open scene again, against the state as it is now, and refuses (state unchanged) when:

1. no scene is open, or there is no choice with that id;
2. `visible` is `false`;
3. `disabled` is set — the refusal reason is the disabled text;
4. a [plugin's guard](/reference/plugins#guards-prices-and-labels) refuses it, even softly: the [calendar](/plugins/calendar#the-guard)'s `That would run past dawn.`, say.

Otherwise it applies `effects`, in order. If the scene itself no longer exists, `choose` just closes it. Use [`apply`](/reference/commands) rather than `dispatch` when you need to know which of these happened.

## SceneCtx

```ts
import type { SceneCtx } from '@ifloom/engine'

type SceneCtx = {
  flag: (key: string) => FlagValue | undefined
  storylineFlag: (storylineId: string, key: string) => FlagValue | undefined
}
```

The second argument to `render`: shortcuts into the state so a hand-written scene does not have to dig. Everything here can also be read from `state`. There is no time of day here: with the [calendar](/plugins/calendar), read it with the calendar's conditions, or its `read`.

```ts
render: (state, ctx) => {
  const body = ctx.storylineFlag('baker', 'knowsYou') ? 'The baker waves you in.' : 'The baker nods, busy with a tray.'
  // ...
}
```

`flag(key)` is the player's [variable](/reference/state#flags); `storylineFlag(id, key)` a [storyline](/reference/world)'s, `undefined` when unset.

**Gotcha:** there is nothing here about people or places: the engine keeps neither. A hand-written scene that needs to know who is in the room asks with a condition, `holds(state, here('baker'), game)` with the [cast](/plugins/cast#conditions)'s `here`, over a `game` it closes over; a data scene puts the same condition in a block's `when`.

### sceneContext

```ts
function sceneContext(state: GameState, game: Game): SceneCtx
```

Builds the `SceneCtx` the engine passes to `render`. Call it to render a hand-written scene yourself — in a test, or a tool that previews scenes:

```ts
const shown = counter.render(state, sceneContext(state, town))
```

## SceneMedia

```ts
import type { SceneMedia } from '@ifloom/engine'

type SceneMedia = {
  src: string                        // resolved with artSrc
  alt?: string
  size: 'inline' | 'wide'
  at?: 'lead' | 'end'                // default 'end'
}
```

A picture attached to a `SceneView` outside the prose. `lead` puts it before the body (an establishing still); `end` after it. `src` goes through [`artSrc`](/reference/prose#artsrc), so `'scene/market-morning'` becomes `art/scene/market-morning.jpg`. `size` is `inline` or `wide`, as for [images in prose](/reference/prose#images).

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
  body: Block[]
  choices: Choice[]
}
```

A scene as data. Its body is **composed** from blocks, each with its own prose key, rather than one key per whole body — so a conditional line is one more block, not another copy of the scene. Put it straight into `game.scenes` (or a [pack](/reference/loader#pack)'s `scenes`); the engine [bakes](#running-data-scenes) it into a `Scene` when it is first shown.

```ts
const market: DataScene = {
  id: 'market.stall',
  speaker: 'baker',
  body: [
    { text: 'market.stall' },
    { text: 'market.stall/weekend', when: weekend() },   // from @ifloom/plugin-calendar
    { variants: 'market.stall.chat' },
  ],
  choices: [
    {
      id: 'buy',
      blocked: [{ when: { stat: 'coins', lt: 3 }, reason: 'Not enough on you.' }],
      effects: [{ kind: 'stat', key: 'coins', by: -3 }, { kind: 'item', id: 'bun', by: 1 }],
    },
    { id: 'leave', effects: [{ kind: 'scene', id: null }] },
  ],
}
```

The prose for this lives under the keys `market.stall`, `market.stall/weekend`, the members of the variants `market.stall.chat`, and the labels `market.stall#buy` and `market.stall#leave`.

See one in the showcase: [Ava's hello](/guide/showcase#data-scenes-variants-and-once-a-turn-choices), with variants, a line for a regular and a once-a-turn choice.

### Block

```ts
type Block =
  | { text: string; when?: Condition }
  | { variants: string; when?: Condition; gate?: Record<string, Condition>; art?: Record<string, string> }
  | { media: SceneMedia; when?: Condition }
```

Rendered in order; a block whose `when` fails is dropped. Rendered text blocks are joined with a blank line between them.

- **`text`** — the prose at that key. An unwritten key renders nothing.
- **`variants`** — one member of a named set of variants, drawn by [`drawVariant`](#drawvariant) (or a custom runtime's `prose.draw`). What the draw needs to remember (so the variants rotate) is added to the effects of every choice. The members are `game.prose.variants(name)`, minus any key the same scene declares as a `text` block, minus any key with no prose — so a scene's own fixed block named `market.stall.chat/closing` is never dealt as a random line.
  - **`gate`** — conditions on individual members, by key. A member whose gate fails is left out of the draw, so one set of variants can hold a line that only makes sense later.
  - **`art`** — a picture that belongs with a particular member, given as the name of another set of variants to draw it from. The drawn picture's prose (usually just an image line) goes in front of the drawn member.
- **`media`** — a [`SceneMedia`](#scenemedia), with no prose key.

**Gotchas:**
- If every member of a set of variants is gated out, the block renders nothing — no error.
- In a [place's body](/plugins/places#the-stage) (or any plugin's [stage](/reference/plugins#stage)), a `variants` block has no choice to record its draw, so the count never moves: the member is picked by the save's seed and the [turn](/reference/state#turn). A room deals a fresh line each turn, the same line every time the player looks in that turn, and can deal the same line twice running.

### Choice

```ts
type Choice = {
  id: string
  label?: string
  labels?: { when?: Condition; key: string }[]
  when?: Condition
  blocked?: { when: Condition; reason: string }[]
  once?: { per: 'turn'; reason: string; key?: string }
  tags?: string[]
  irreversible?: string
  effects: EffectRef[]
}
```

| Field | What it does | Default |
|---|---|---|
| `label` | Prose key for the button text. | `` `${scene.id}#${id}` `` |
| `labels` | Labels that depend on state; the first whose `when` holds wins. | `label` |
| `when` | Shown only while this holds. A failing `when` sets `visible: false`. | always shown |
| `blocked` | Greyed-out reasons; the first whose `when` holds is the `disabled` text. | not blocked |
| `once` | Pays once per [turn](/reference/state#turn) — once a day, with the [calendar](/plugins/calendar)'s default; `per` is always `'turn'`. Afterwards the choice stays on screen, disabled with `reason`, and its effects shrink to just its `scene` effects (so it still navigates). `key` records it under a different name. | unlimited |
| `tags`, `irreversible` | Passed through to [`SceneChoice`](#scenechoice). | — |
| `effects` | Literal [effects](/reference/effects), or `{ custom: 'name', with: {...} }` for one computed by a [custom effect](/reference/custom#effects) on the game. An unknown name contributes nothing (the loader reports it). | — |

**Label lookup order.** A drawn variant can carry its own reply: if a block this render used has prose at `` `${drawnKey}#${choice.id}` ``, that wins (the last such block, if several). Then the first matching `labels` entry, then `label`, then `` `${scene.id}#${choice.id}` ``. If none of those keys has prose, the button shows the bare choice id.

```ts
{
  id: 'ask',
  labels: [{ when: { seen: 'baker.recipe' }, key: 'baker.chat#ask-again' }],
  once: { per: 'turn', reason: 'You have asked today already.' },
  effects: [{ kind: 'stat', key: 'friendship', by: 2, of: person('baker') }],
}
```

**Gotchas:**
- With the [default runtime](#defaultruntime), `per: 'turn'` is recorded with [`markUsed`](/reference/progress#usedthisturn-and-markused) as the variable `turn:scene.choice` (or `turn:<once.key>`). It is cleared by the turn ending — a [`turn`](/reference/effects#turn) effect, or the calendar's bed — not by leaving the scene.
- For a once-a-turn limit outside a `DataScene`, see [`oncePerTurn`](/reference/progress#onceperturn).

### panelData

`panelData` on a `DataScene` names a [custom panel](/reference/custom#panels) in `game.custom.panels`. The scene calls it with the state and puts the result on `SceneView.panelData`, so a scene with a bespoke panel can stay declarative.

```ts
const town: Game = {
  // ...
  custom: {
    panels: { stallPrices: (state) => ({ bun: 3, loaf: state.flags.marketDay ? 4 : 5 }) },
  },
}
// DataScene: { id: 'market.stall', panel: 'StallPanel', panelData: 'stallPrices', ... }
```

**Gotcha:** an unknown name gives `panelData: undefined`, not an error, and the loader does not check panel names.

## Running data scenes

A game lists data scenes in `game.scenes` and the engine runs them. [`sceneById`](/reference/game#scenebyid) — which the reducer and the view use for every scene — **bakes** a `DataScene` into a `Scene` the first time it is asked for, rendering it with [`defaultRuntime`](#defaultruntime), and keeps the result. A game does not have to write a runtime, wrap its scenes, or give them a `render`.

The default runtime reads:

- **words** from `game.prose` (set by [`loadGame`](/reference/loader#loadgame), or by you with [`proseStore`](/reference/prose#prosestore-1)), with tokens filled for the save;
- **variants** drawn by [`drawVariant`](#drawvariant): rotating, starting somewhere different each turn;
- **`once: { per: 'turn' }`** through [`usedThisTurn`/`markUsed`](/reference/progress#usedthisturn-and-markused);
- **conditions, custom effects and panels** from the game.

Write a [`SceneRuntime`](#sceneruntime) and call [`renderScene`](#renderscene) yourself only when a game needs something else — words from a different store, its own idea of what "once" counts.

### bakeScene

```ts
function bakeScene(game: Game, scene: DataScene): Scene
```

The `Scene` the engine runs for a data scene: its `id`, `title`, `speaker`, `frame`, `tags` and `panel`, with a `render` that calls `renderScene` with `defaultRuntime(game)`. Built once per `DataScene` object and game, and cached; `sceneById` calls it for you.

The cache is per game: the same scene object listed in two games runs with each game's own prose and custom functions.

### defaultRuntime

```ts
function defaultRuntime(game: Game): SceneRuntime
```

The runtime described above, for one game. Reads `game.prose` each time a line is asked for, so setting `game.prose` after the runtime is made still works. Useful as a base for a custom runtime that changes one thing:

```ts
const runtime: SceneRuntime = {
  ...defaultRuntime(town),
  spent: (state, scene, choice) => Boolean(state.flags[`once:${scene}.${choice}`]),
  spend: (state, scene, choice) => [{ kind: 'flag', key: `once:${scene}.${choice}`, value: true }],
}
```

### drawVariant

```ts
function drawVariant(state: GameState, name: string, members: string[]): { id: string; remember: Effect }
```

Which member of a set of variants this state gets, and the effect that records the draw. The [turn](/reference/state#turn) picks an **offset** through its own [hash](/reference/random), mixed with the save's seed: `roll(members.length, name, seed, turn)`; the count of draws so far, kept in the flag `variants:<name>`, walks one step at a time from there. So a scene does not repeat itself on consecutive visits, and two playthroughs do not deal the same lines.

```ts
const { id, remember } = drawVariant(state, 'cafe.weather', ['cafe.weather/rain', 'cafe.weather/sun', 'cafe.weather/fog'])
// id: one of the three; remember: { kind: 'flag', key: 'variants:cafe.weather', value: 1 }
```

**Gotchas:**
- It throws on an empty `members`. Data scenes never call it with one: a block whose members are all gated out renders nothing.
- The count is per name, not per scene. Two scenes drawing the same variants share one rotation.

### isDataScene

```ts
function isDataScene(scene: Scene | DataScene): scene is DataScene
```

True for a data scene (it has a `body` list), false for a hand-written one. For tools that walk `game.scenes`.

## renderScene

```ts
function renderScene(scene: DataScene, state: GameState, runtime: SceneRuntime): SceneView
```

Turns a `DataScene` and a state into a `SceneView` with the runtime you give it. The engine calls it for you through [`bakeScene`](#bakescene); call it yourself to render a data scene with a runtime of your own, by listing a hand-written `Scene` that wraps it:

```ts
const counter: Scene = {
  id: 'cafe.counter',
  render: (state) => renderScene(counterData, state, runtime),
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

Optional: what a custom runtime supplies. [`defaultRuntime`](#defaultruntime) is the one the engine uses.

- `prose` is a [`Prose`](/reference/prose#prose): a [`ProseStore`](/reference/prose#prosestore) plus `draw`, which picks a member and returns an effect that records the pick. [`drawVariant`](#drawvariant) is a ready-made `draw`.
- `game` is the game, used for conditions, custom effects and panels.
- `spent` / `spend` back `once`. With a `once.key`, they are called with `(key, '')` instead of `(scene.id, choice.id)`.
