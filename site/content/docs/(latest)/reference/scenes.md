---
title: "Scenes"
description: "Scenes as data: blocks, choices, labels, once a turn, prices, speakers, endings and how they are drawn."
---
A scene is one screen of story: some prose, and the choices under it. You write each one as data, a [`DataScene`](#datascene), and list it in your content's `scenes`. Its prose lives in [prose keys](/docs/reference/prose) or in the body itself, its conditions and effects are data, and the [content checker](/docs/reference/checks) can check every id it names. The engine draws it for you (see [Running data scenes](#running-data-scenes)).

A scene can also be a [storylet](/docs/reference/storylets), a scene an effect draws at random from a named set. See [`StoryletFields`](#storyletfields).

For a walkthrough, see [Your first story](/docs/guide/first-story). For what happens after the player picks a choice, see [Commands](/docs/reference/commands#choose) and [Effects](/docs/reference/effects).

## Speakers

A scene's `speaker` says who is talking, and the view draws them as [`view.scene.speaker`](/docs/reference/view#speakerview): their name, picture and [hints](/docs/reference/ui-hints). People are [entities](/docs/reference/entities), so the engine reads these from the entity itself, with no plugin to ask.

```ts
{ id: 'cafe.counter', speaker: 'ava', body: [{ text: 'cafe.counter' }], choices: [] }
```

- A reference names the entity as written: `'character:ava'`, or `'you'` for whoever the player is [playing](/docs/reference/entities#protagonists-you-and-player).
- A bare id is `character:<id>` when the game has that entity (the [cast](/docs/plugins/cast)'s kind), else the one entity the game declares with that id. So `'ava'` finds `character:ava`, and `'tom'` finds `pet:tom` when Tom is the only entity called `tom`.
- An id that names no entity gives no speaker, and the view's `speaker` is `null`.
- A spoken line in the body names who says it with the same ids: `@ava: "Morning."` in [prose](/docs/reference/prose#speech), or `say('ava', 'Morning.')` in a [flowing scene](/docs/reference/flows#the-builders). `'player'` is the player there too.

The speaker's picture is the entity's `image`. With none, there's no picture. The engine doesn't guess a file from the id.

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

A picture or a video, in a data scene's [`{ media }` block](#block). Give a file as `src`, which goes through [`artSrc`](/docs/reference/prose#artsrc) (`'scene/market-morning'` becomes `art/scene/market-morning.jpg`), or ask a [pool](/docs/reference/media#pools) for one with `pool` and `tags`. `size` is `inline` or `wide`, as for [images in prose](/docs/reference/prose#images).

It's a video when `video` is `true` or the file ends in `.mp4` or `.webm`. `controls`, `once`, `sound` and `poster` are the [video flags](/docs/reference/prose#videos), and they mean the same as in markup.

`at` says where it goes:

- **Left out**, a `{ media }` block sits where it is in the body, in order with the prose.
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
  tags?: string[]
  panel?: ScenePanel      // a panel held open while the scene is: { panel, with }
  audio?: Record<string, string | null>   // background audio by channel while it's open
  stage?: MediaStage      // a layered picture with hotspots
  drawnFrom?: string[]    // the storylet sets it can be drawn from
  weight?: number         // how often a draw picks it, 1 if left out
  when?: Condition        // only drawn while this holds
  minigame?: string       // a minigame that starts when it's entered
  ui?: Ui<SceneUi>        // presentation hints, carried to the view as written
  body: Block[]
  choices: Choice[]
}
```

A scene written as data. You build its body from blocks, each with its own prose key, rather than writing one key for the whole body. That way a conditional line is one more block, not another copy of the scene. Put it in your [content](/docs/reference/loader#content)'s `scenes`, and the engine [draws](#running-data-scenes) it when it's shown.

This is Ava's hello from the showcase:

```ts
import type { DataScene } from '@ifloom/engine'
import { character } from '@ifloom/plugin-cast'

const hello: DataScene = {
  id: 'ava.hi',
  title: 'Ava',
  speaker: 'ava',
  body: [
    { text: 'ava.hi' },
    { variants: 'ava.smalltalk' },
    { text: 'ava.hi.regular', when: { seen: 'ava.hi', gte: 3 } },
  ],
  choices: [
    { id: 'chat', once: { per: 'turn', reason: 'She has a queue.' }, effects: [{ stat: 'friendship', by: 5, of: character('ava') }] },
    { id: 'compliment', when: { stat: 'charm', gte: 3 }, effects: [{ stat: 'friendship', by: 10, of: character('ava') }, { scene: null }] },
    { id: 'bye', effects: [{ scene: null }] },
  ],
}
```

Its prose lives under the keys `ava.hi` and `ava.hi.regular`, the members of the variants `ava.smalltalk` (`ava.smalltalk.rain` and the rest), and the labels `ava.hi#chat`, `ava.hi#compliment` and `ava.hi#bye`. See [The showcase](/docs/guide/showcase#data-scenes-variants-and-once-a-turn-choices) for how it plays.

### audio

A data scene's `audio` names what plays on [background channels](/docs/reference/audio#channels) while it's open. Here the flat goes quiet for a letter:

```ts
{ id: 'flat.letter', audio: { music: null, ambience: 'rain' }, body: [{ text: 'flat.letter' }], choices: [/* ... */] }
```

A channel the scene doesn't name keeps playing whatever an effect, the place or the default says. For one-shot sounds, use `[[sound:id]]` in the [prose](/docs/reference/prose#sound-and-voice). The loader reports an unknown track or channel, and a sound effect's track put on a background channel.

### Block

```ts
type Block = (
  | { text: string; when?: Condition }
  | { variants: string; when?: Condition; gate?: Record<string, Condition>; art?: Record<string, string> }
  | { media: SceneMedia; when?: Condition }
  // and, for a scene that flows: words written in place, a spoken line, a section,
  // a decision, a point, a minigame and a panel where they stand
  | { words: string; when?: Condition }
  | { say: string; speaker: string; voice?: string; when?: Condition }
  | { blocks: Block[]; when?: Condition }
  | { decide: string; choices: FlowChoice[]; when?: Condition }
  | { point: string }
  | { minigame: string; when?: Condition }
  | { panel: string; with?: PluginArgs; when?: Condition }
) & { ui?: Ui<BlockUi> }
```

Blocks render in order, and a block whose `when` fails is dropped. Rendered blocks are joined with a blank line between them. The kinds after `media` let a scene read on as the player chooses, with decisions partway through: see [Flowing scenes](/docs/reference/flows).

- **`text`** renders the prose at that key. An unwritten key renders nothing.
- **`variants`** renders one member of a named set of variants, drawn as [How variants are drawn](#how-variants-are-drawn) says. What the draw needs to remember, so the variants rotate, is added to the effects of every choice. The members are `game.prose.variants(name)`, minus any key the same scene uses as a `text` block and any key with no prose. So a scene's own fixed block named `ava.smalltalk/closing` is never dealt as a random line.
  - **`gate`** puts conditions on individual members, by key. A member whose gate fails is left out of the draw, so one set of variants can hold a line that only makes sense later.
  - **`art`** names, for a member, another set of variants to draw a picture from. The drawn picture's prose (usually a single image line) goes in front of the drawn member.
- **`media`** renders a picture or a video, [`SceneMedia`](#scenemedia), with no prose key. Without `at`, it's drawn right there in the body, between the blocks around it.
- **`ui`**, on any block, holds [presentation hints](/docs/reference/ui-hints) for the UI, and the view puts them on the first [beat](/docs/reference/prose#scenebeat) the block makes. The React UI's [`reveal`](/docs/react/hints#reveal) makes the block wait before it appears: `{ text: 'intro.tonight', ui: { reveal: { delay: 1200 } } }`. A block that isn't shown takes its hints with it.

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
      { id: 'lamp', rect: [10, 10, 12, 30], label: 'The lamp', command: { type: 'action', id: 'read' }, layer: 'lamp' },
    ],
  },
  body: [{ text: 'flat.morning' }],
  choices: [{ id: 'leave', effects: [{ scene: null }] }],
}
```

Layers are drawn bottom first. Each one is a file (`src`) or a pick from a [pool](/docs/reference/media#pools) (`pool` and `tags`), shown while its `when` holds. A layer is a video when `video` is `true` or its file is a `.mp4` or `.webm`, and it takes the same video flags as a [`SceneMedia`](#scenemedia).

A hotspot is a rectangle, `[x, y, width, height]` in percent of the stage from the top left. It does exactly one of two things:

- **`choice`** takes a choice of this scene, by id. It's greyed out exactly when the choice's button is, with the same reason, and it's left out while the choice is hidden.
- **`command`** sends any [command](/docs/reference/commands), and is greyed out by the same rules as an [action's button](/docs/reference/view#renderaction).

A hotspot with a `when` that fails is left out, and so is one whose `layer` isn't shown. `label` is what a screen reader reads.

The view resolves the stage into [`view.scene.stage`](/docs/reference/view#the-scene), and the [React UI](/docs/react) draws it with [`Stage`](/docs/react/components#stage), with its hotspots as buttons over the picture. See [Media](/docs/reference/media#the-stage) for the types.

**Gotchas.**
- The loader reports a hotspot with both or neither of `command` and `choice`, a `choice` the scene doesn't have, a rect outside 0 to 100 or running off the edge, two hotspots with one id, a `layer` no layer has, and an unknown pool or tag.
- `view.scene.image` is still set as before, next to `stage`. A UI decides which to draw.

### Choice

```ts
type Choice = ButtonDef & {
  once?: { per: 'turn'; reason: string; key?: string }
}
```

A choice is a [`ButtonDef`](/docs/reference/actions#buttondef), the same fields an [action](/docs/reference/actions#actiondef) has, sent as `{ type: 'choose', id }`. Its id is unique within the scene.

| Field | What it does | Default |
|---|---|---|
| `label` | The button's words. A prose key works too: when the game's prose has a line for it, that line is shown. | the prose key `` `${scene.id}#${id}` ``, else the id |
| `labels` | Words that depend on state, each `{ when, label }`. The first whose `when` holds wins. | `label` |
| `when` | The choice is shown only while this holds. A failing `when` sets `visible: false`. | always shown |
| `blocked` | Reasons to grey it out, as [`Blocked`](/docs/reference/actions#blocked) entries. The first whose `when` holds becomes the `disabled` text. One with `hide: true` leaves the choice off the screen instead. | not blocked |
| `once` | The choice pays once per [turn](/docs/reference/state#turn), which is once a day with the [calendar](/docs/plugins/calendar)'s default. `per` is always `'turn'`. Afterwards the choice stays on screen, disabled with `reason`, and its effects shrink to its `scene` effects alone, so it still navigates. It's spent while the choice's record in [`chosen`](/docs/reference/state#chosen) says it was last picked this turn. `key` only matters to a save from before version 18, which kept the cap as a kv key: it names the key (without `turn:`) when it wasn't `scene#choice`, so loading the save keeps a cap set that turn. | unlimited |
| `tags`, `irreversible`, `ui` | Passed through to the view's [`RenderedChoice`](/docs/reference/view#renderedchoice). `ui` holds [presentation hints](/docs/reference/ui-hints), such as the React UI's [`transition`](/docs/react/hints#transition-on-a-choice) for the screen it leads to. | |
| `cost` | The stats it spends, as an action's [`cost`](/docs/reference/actions#actioncost): listed on the button as its price, checked when it's chosen (greyed out with `reasons` or the stat's own line while there's too little), and paid after its command, before its effects. | free |
| `effects` | Literal [effects](/docs/reference/effects), or `{ 'game/name': {...} }` for effects worked out by one of the game's own [effects](/docs/reference/custom#effects) in its `rules`. An unknown name adds nothing, and the loader reports it. | |
| `command` | A [command](/docs/reference/commands) to send as well, run before the effects: a plugin's, such as `openApp('texts')`, or a core one such as `{ type: 'action', id: 'coffee' }`. The choice is greyed out with that command's reason while it would be refused, and its price adds what the command spends. It can't be `choose`. | none |

**Label lookup order.** A drawn variant can carry its own reply. If a block this render used has prose at `` `${drawnKey}#${choice.id}` ``, that wins (the last such block, if there are several). After that come the first matching `labels` entry, then `label`, each the prose line when it's a key the prose has, else its words as written. With neither, the button shows the prose at `` `${scene.id}#${choice.id}` ``, else the bare choice id. The loader reports a `label` that reads as a key (no spaces, a `.` or a `#`) with no prose.

```ts
{
  id: 'ask',
  labels: [{ when: { seen: 'ava.river' }, label: 'Ask about the river again' }],
  once: { per: 'turn', reason: 'You have asked today already.' },
  effects: [{ stat: 'friendship', by: 2, of: character('ava') }],
}
```

**In the text.** A choice the scene's prose names with `[[act:id]]` is drawn there, as a link inside the line, and left out of `view.scene.choices`. It's still a choice in every other way: the same `choose` command, `blocked` reasons, price and checks. See [Inline actions and tooltips](/docs/reference/prose#inline-actions-and-tooltips).

```ts
// prose: 'kitchen.phone': 'Your phone buzzes. [[act:answer|Pick it up]], or leave it.'
{ id: 'answer', command: openApp('texts'), effects: [{ kv: 'answered', to: true }] }
```

**Gotchas.**
- `per: 'turn'` reads the choice's `last` turn in [`chosen`](/docs/reference/state#chosen), which picking any choice records, so it writes nothing to the kv store. The turn ending clears it, through a [`turn`](/docs/reference/effects#turn) effect or the calendar's sleep. Leaving the scene doesn't. A choice that ends the turn is dated the turn it was picked in, so it's free again on the next.
- An [action](/docs/reference/actions#actiondef) takes the same `once`. For counters and stages paced over turns, see [A friendship in stages](/docs/recipes/friendship-stages).

#### How `choose` checks a choice

The `choose` command first asks [`whyNot`](/docs/reference/actions#whynot), which draws the open scene again against the current state. The command is refused, leaving the state unchanged, at the first of these that applies:

1. A [lock](/docs/reference/locks) stops `choose`. The refusal is the lock's `reason`.
2. A [plugin's guard](/docs/reference/plugins#guards-prices-and-labels) refuses it outright.
3. The game has its own [`rules.commands.choose`](/docs/reference/rules#commands). It's called instead of steps 4 and 5, and a string it returns is the refusal. If it returns a state, that state is the result (after step 6), and the choice's effects don't run unless the rule runs them.
4. No scene is open, or the scene has no choice with that id, or the choice is hidden: its `when` doesn't hold, or a `blocked` entry with `hide` holds.
5. The choice is greyed out: a `blocked` entry holds, or its `once` is spent this turn. The refusal is that reason. Then, for a choice with a `command`, that command is asked as it would be on its own: a lock on it, a plugin's guard and its own `whyNot`. A `command` that is itself `choose` is refused.
6. A plugin's guard gives a soft warning, such as the [calendar](/docs/plugins/calendar#the-guard)'s `That would run past dawn.` This one isn't part of `whyNot`, so the button can still be pressed, but the reducer refuses the command with the warning (see [`warningOf`](/docs/reference/actions#warningof)).

Otherwise `choose` runs the choice's `command`, if it has one, then applies its `effects` in order. The command log holds the `choose`, so a replay runs the command again the same way. If the scene itself no longer exists, `choose` closes it. [`apply`](/docs/reference/commands#apply) says which of these happened.

### panel

```ts
{ id: 'market.stall', title: 'The stall', panel: { panel: 'prices', with: { stall: 'bread' } }, body: [{ text: 'market.stall' }], choices: [] }
```

A [`ScenePanel`](/docs/reference/panels#a-scenes-panel), `{ panel, with }`, holds that panel open for as long as the scene is on screen, as [`view.panel`](/docs/reference/view#panel) with the scene's id in `scene`. A UI usually draws it in place of the scene's choices. A panel that needs numbers worked out reads them from the view or a [value](/docs/reference/custom#values). See [A scene's panel](/docs/reference/panels#a-scenes-panel).

### Endings

An ending is a scene the story doesn't move on from. Give it a choice that starts over with the [`newGame`](/docs/reference/commands#newgame) command, and every UI draws it like any other choice:

```ts
{
  id: 'end.posted',
  title: 'The end',
  body: [{ text: 'end.posted' }],
  // prose: 'end.posted#again': 'Read it again'
  choices: [{ id: 'again', command: { type: 'newGame' }, effects: [] }],
}
```

In a [runner](/docs/reference/runner#starting-over-from-content), the choice starts a new game with the player's settings and a fresh command log, and keeps the profile. The Letter's two endings work this way.

A scene with `choices: []` is an ending too, with nothing on it to press. While a scene is open no actions, exits or people are offered either, so what the player does next is the UI's business:

- **In the React UI** with [`pages`](/docs/react#pages) on, the player's menu has Title screen, which leads to New game, Continue and Load. Without `pages`, they can still load a save from the menu. Say so in the ending's words if the player might not know.
- **In a UI of your own,** draw a "Start again" button when `view.scene.id` is set and the scene has no choices, and call [`runner.newGame()`](/docs/reference/runner#newgame) from it.

For a game over that the rest of the game should respect too, set the kv key [`phase`](/docs/reference/effects#the-phase) with the ending and add a [lock](/docs/reference/locks) that denies `'*'` in that phase, so a stray command (a debug button, a message reply) can't carry on playing:

```ts
// in the effects that end the game
[{ kv: 'phase', to: 'over' }, { scene: 'ending.evicted' }]

// in your content's locks
{ id: 'over', when: { kv: 'phase', is: 'over' }, deny: ['*'], reason: 'The story is over.' }
```

Give the game a [`finished`](/docs/reference/state#new-game) condition only for endings that count as finishing it, since that's what offers New Game+.

## StoryletFields

```ts
import type { StoryletFields } from '@ifloom/engine'

type StoryletFields = {
  drawnFrom?: string[]
  weight?: number
  when?: Condition
}
```

The fields that make a scene a [storylet](/docs/reference/storylets), a scene drawn at random from a named set by the effect [`{ scene: { from } }`](/docs/reference/effects#scene). A `DataScene` has them, and also `minigame`, a [minigame](/docs/reference/minigames#minigamescenefields) that starts when the scene is entered.

| Field | Default | What it does |
|---|---|---|
| `drawnFrom` | none | The sets the scene can be drawn from, such as `['cafe']`. It's separate from `tags`, which only style a scene. |
| `weight` | `1` | How likely a draw is to pick it against the other eligible scenes. |
| `when` | always | A [condition](/docs/reference/conditions) that must hold for the scene to be drawn. |

```ts
import type { DataScene } from '@ifloom/engine'
import { character, here } from '@ifloom/plugin-cast'

const avasBreak: DataScene = {
  id: 'cafe.break',
  title: 'Ava’s break',
  speaker: 'ava',
  drawnFrom: ['cafe'],
  weight: 2,
  when: here('ava'),
  body: [{ text: 'cafe.break' }],
  choices: [{ id: 'leave', effects: [{ stat: 'friendship', by: 2, of: character('ava') }, { scene: null }] }],
}
```

**Gotchas.**
- `when` gates draws only. A `scene` command or a `{ scene: 'id' }` effect naming the scene opens it whether `when` holds or not.
- The loader reports a `weight` or a `when` on a scene with no `drawnFrom`, and a weight of 0 or less. See [the checks](/docs/reference/storylets#the-checks).

## Running data scenes

A game lists its scenes in `game.scenes` and the engine runs them. The first time the reducer or the view needs a scene, the engine works out how to draw it and keeps that for the game, so the same scene object listed in two games runs with each game's own prose and code.

A data scene reads:

- **words** from `game.prose` (set by [`loadGame`](/docs/reference/loader#loadgame)), with tokens filled in for the save
- **variants** drawn as described below
- **`once: { per: 'turn' }`** from the choice's record in [`chosen`](/docs/reference/state#chosen): spent while it was last picked this turn
- **conditions and the game's own effects** from the game

### How variants are drawn

A `variants` block gets one member of its set each time it's drawn. The [turn](/docs/reference/state#turn) picks a starting offset through its own [hash](/docs/reference/random), mixed with the save's seed. The count of draws so far, kept in the kv key `variants:<name>`, then walks one step at a time from there. So a scene doesn't repeat itself on consecutive visits, and two playthroughs don't deal the same lines. When a member has a [weight](/docs/reference/prose#variantmember), the draw is by weight instead, seeded by the name, the save's seed, the turn and the count. What the draw needs to remember is added to the effects of every choice, so picking one moves the rotation on.

The count is per name, not per scene. Two scenes drawing the same variants share one rotation.

To draw blocks outside a scene, such as a message's words, a plugin uses [`context.beats`](/docs/reference/plugins#beats).

## See it in an example

- Small Town: `ava.hi` in [`examples/showcase/src/story/ava.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/ava.ts) is a data scene with a `variants` block, a line with a `when`, a `speaker` and a choice limited to once a turn.
- The Letter: [`examples/novel/src/story/`](https://github.com/IFLoom/ifloom/tree/main/examples/novel/src/story) is three chapter scenes and two endings, a file for each chapter, with `choices: []`.
