---
title: "Scenes"
description: "A scene is one screen of story, a body of blocks and the choices under it, declared as data in content's scenes."
---
A scene is one screen of story: a body of words and the choices under it. Your content declares scenes in `scenes`, each a [`DataScene`](#datascene) written as data, so the [content checker](/docs/reference/checks) can check every id it names. [Turns, scenes and the room](/docs/explanation/turns-and-time#a-scene-and-the-room) explains a scene beside the room, [Write a flowing scene](/docs/how-to/write-a-flowing-scene) writes one that reads on as the player chooses, and [End the game](/docs/how-to/end-the-game) writes an ending.

In the showcase: `examples/showcase/src/story/ava.ts`, whose `ava.hi` scene has a speaker, a variants block, a line under a condition and a choice limited to once a turn.

```ts
import type { Block, Choice, DataScene, SceneMedia } from '@ifloom/engine'
```

## DataScene

A scene the game declares in `scenes`, with its body and its choices. Every field is in [`DataScene`](/docs/api/engine#datascene).

The scene's `id` is unique across the game, and the [`scene` effect](/docs/reference/effects#scene) opens it by that id. Its `title` shows above the body, and the room's or the game's title shows when it's left out. `tags` reach the view for a UI to style the scene by, and the engine gives them no meaning, as it gives none to `ui`, its [presentation hints](/docs/reference/ui-hints). A scene with `minigame` starts that [minigame](/docs/reference/minigames#minigamescenefields) when it opens.

The engine renders the body's [blocks](#block) in order, then offers the scene's `choices` under them. A scene with `choices: []` offers nothing to press. While a scene is open the room offers no actions, so a scene with no choices is an ending, which [End the game](/docs/how-to/end-the-game) covers. The fields `drawnFrom`, `weight` and `when` make the scene a [storylet](/docs/reference/storylets#storyletfields), drawn at random from a named set.

This is Ava's hello from the showcase:

```ts
import { text, type DataScene } from '@ifloom/engine'
import { cast } from '@ifloom/plugin-cast'

export const hello: DataScene = {
  id: 'ava.hi',
  title: 'Ava',
  speaker: 'ava',
  body: [
    text('Ava looks up from the till and grins.'),
    { variants: 'ava.smalltalk' },
    text('She has your cup out before you ask.', { when: { seen: 'ava.hi', gte: 3 } }),
  ],
  choices: [
    { id: 'chat', label: 'Chat for a minute', once: { per: 'turn', reason: 'She has a queue.' }, effects: [{ stat: 'friendship', by: 5, of: cast.character('ava') }] },
    { id: 'bye', label: 'Leave her to it', effects: [{ scene: null }] },
  ],
}
```

### speaker

The entity the scene is with, by id or [entity reference](/docs/reference/common#entityref), shown as `view.scene.speaker` with their name, picture and hints. The engine reads all three from the [entity](/docs/reference/entities), so no plugin is asked. The speaker's picture is the entity's `image`, and the engine guesses no file from the id.

The engine finds the entity this way:

- A full reference, such as `'character:ava'`, names that entity.
- `'you'` names whoever the player is playing (see [you](/docs/reference/glossary#you)).
- A bare id is `character:<id>` when the game has that entity, else the one entity the game declares with that id. So `'tom'` finds `pet:tom` when Tom is the only entity called `tom`.
- An id that names no entity gives no speaker, and `view.scene.speaker` is `null`.

A spoken line in the body names who says it the same way, as `@ava: "Morning."` in [prose](/docs/reference/prose#speech) or [`say('ava', 'Morning.')`](/docs/reference/flows#say).

### picture

A layered picture with hotspots, a [`PictureDef`](/docs/reference/media#picturedef). The engine renders its layers bottom first, each while its `when` holds. A hotspot with `choice` chooses that choice of the scene, and is greyed out and hidden exactly when the choice's button is. A hotspot with `command` sends that command, greyed out as an action's button is.

```ts fragment
picture: {
  layers: [{ id: 'room', src: 'scene/flat' }, { id: 'lamp', src: 'scene/flat-lamp.png', when: { kv: 'evening' } }],
  hotspots: [{ id: 'door', rect: [78, 20, 18, 75], label: 'The front door', choice: 'leave' }],
}
```

### audio

The tracks that play on [background channels](/docs/reference/audio#channeldef) while the scene is open, by channel, with `null` to silence one. A channel the scene leaves out keeps playing what an effect, the location or the game's default says. A one-shot sound in the body is `[[sound:id]]` in [prose](/docs/reference/prose#sound-and-voice).

```ts fragment
audio: { music: null, ambience: 'rain' }
```

### panel

A [panel](/docs/reference/panels) held open for as long as the scene is, a [`ScenePanel`](/docs/api/engine#scenepanel) of `{ panel, with }`. It is `view.panel`, as one the `panel` effect opens is, with the scene's id in its `scene`. A UI renders it in place of the scene's choices.

```ts fragment
panel: { panel: 'prices', with: { stall: 'bread' } }
```

## Block

One entry of a scene's body, told apart by its key, such as `{ text }` or `{ prose }`. Every form is in [`Block`](/docs/api/engine#block).

The engine renders the blocks in order and leaves out a block whose `when` fails. It joins the rendered blocks with a blank line, so each block starts a paragraph. A conditional line is one more block, never another copy of the scene. A block's `ui` holds [presentation hints](/docs/reference/ui-hints), which the view puts on the first [beat](/docs/reference/prose#scenebeat) the block makes, so a hidden block takes its hints with it.

| Kind | Meaning |
|---|---|
| `text` | Words in place, read as [prose](/docs/reference/prose#markup) is, with paragraphs, speech, pictures, inline markup and tokens. `id` names it in a translation's [words table](/docs/reference/words) as `scene.<scene>.text.<id>`, and a hash of its words names it without one. |
| `prose` | The line kept at that key in the game's [prose](/docs/reference/prose#prosestore), for a line several scenes share or one a mod rewrites by key. A key with no line renders nothing. |
| `variants` | One member of a named set of [variants](/docs/reference/prose#variantmember), drawn afresh on each visit. |
| `media` | A picture or a video, a [`SceneMedia`](#scenemedia). |
| `cases` | Only the first of its blocks whose own `when` holds, or that has none, written by [`cases()`](/docs/reference/flows#cases). It works in any scene. |
| `say`, `blocks`, `decide`, `point`, `minigame`, `panel` | A spoken line, a section, a decision, a point, a minigame and a panel, which make the scene flow. [Flowing scenes](/docs/reference/flows) describes each. |

A `variants` block takes two more fields. `gate` puts a condition on single members by prose key, and a member whose gate fails leaves the draw. `image` names, for a member, another set of variants to draw a picture from, which shows before the member. The members are the set's keys, less any key the same scene uses as a `{ prose }` block and any key with no line, so a scene's own fixed line is never dealt as a random one.

The engine draws a `variants` block from a rotation. The turn and the save's seed pick where it starts, and a count of draws, kept in the kv key `variants:<name>`, walks one step on from there. A set with a member of another weight draws by [weight](/docs/reference/random#weighted) instead. The engine adds the effect that moves the count on to every choice of the scene, so choosing one moves the rotation. The count is per set, so two scenes that draw the same variants share one rotation.

```ts fragment
body: [
  { text: 'Ava wipes down the counter.', id: 'intro' },
  { variants: 'ava.smalltalk', gate: { 'ava.smalltalk.river': { seen: 'ava.river' } } },
  { prose: 'cafe.menu', when: { kv: 'hungry' } },
]
```

## SceneMedia

A picture or a video in a `{ media }` block. Every field is in [`SceneMedia`](/docs/api/engine#scenemedia).

`src` names a file, which goes through [`artSrc`](/docs/reference/prose#artsrc), so `'scene/market-morning'` is `art/scene/market-morning.jpg`. `pool` and `tags` ask a [pool](/docs/reference/media) for a file in its place. `size` is `inline` or `wide`, as for [images in prose](/docs/reference/prose#images). The media is a video when `video` is `true` or the file ends in `.mp4` or `.webm`, and `controls`, `once`, `sound` and `poster` are the [video flags](/docs/reference/prose#videos).

`at` says where the media goes. Left out, it stays where the block is, in order with the prose. `lead` puts it before the body as an establishing picture, and `end` puts it after the body.

```ts fragment
{ media: { src: 'scene/market-morning', size: 'wide', at: 'lead' } }
{ media: { src: 'clips/kettle.mp4', alt: 'The kettle coming to the boil' } }
{ media: { pool: 'door', tags: ['red', 'night'], alt: 'The front door' } }
```

## Choice

A choice a scene declares in its `choices` or at a decision, with the fields of a [`ButtonDef`](/docs/reference/actions#buttondef). Every field is in [`Choice`](/docs/api/engine#choice).

The player sends a choice as `{ type: 'choose', id }`, and its id is unique within the scene. The [`choose`](/docs/reference/commands#choose) command runs the choice's `command`, pays its `cost`, then applies its `effects` in order. A choice whose `when` fails is hidden, and one with a `blocked` entry that holds is greyed out with that entry's reason, or hidden when the entry has `hide`. The command log keeps the `choose`, so a replay runs the choice's command again the same way.

The engine finds a choice's label in this order:

1. A reply written for a line this render drew, the prose at `<key>#<choice>` for a `{ prose }` or `variants` block's key, the last such block winning.
2. The first entry of `labels` whose `when` holds.
3. `label`, with its tokens filled in.
4. The choice's id.

A choice with `once` pays once a game or once a turn, as [`Once`](/docs/reference/actions#once) says. A spent choice stays on screen, greyed out with its `reason` or `Already done.`, and keeps only its `scene` effects, so it still moves the player on. The engine reads whether it's spent from [`state.chosen`](/docs/reference/state#chosen), where choosing any choice records its turn, so `once` writes nothing to the kv store.

A choice the body names with `[[act:id]]` shows inside that line, and the view leaves it out of `view.scene.choices`. It's a choice in every other way, with the same command, refusals, price and checks (see [Inline actions and tooltips](/docs/reference/prose#inline-actions-and-tooltips)).

```ts
import type { Choice } from '@ifloom/engine'
import { cast } from '@ifloom/plugin-cast'

export const ask: Choice = {
  id: 'ask',
  label: 'Ask about the river',
  labels: [{ when: { seen: 'ava.river' }, label: 'Ask about the river again' }],
  once: { per: 'turn', reason: 'You have asked today already.' },
  effects: [{ stat: 'friendship', by: 2, of: cast.character('ava') }],
}
```

A choice's `command` can be any command but `choose`, such as `devices.open('texts')` or `{ type: 'action', id: 'coffee' }`. The choice is greyed out with that command's reason while the command would be refused, and its price adds what the command spends.

## State

[`state.sceneId`](/docs/reference/state#sceneid) is the open scene's id, or `null` while the room shows. [`state.seen`](/docs/reference/state#seen) counts the times each scene has opened, which the [`seen`](/docs/reference/conditions#seen) condition reads. [`state.chosen`](/docs/reference/state#chosen) records each choice as `<scene>#<choice>`, which the [`chose`](/docs/reference/conditions#chose) condition and `once` read. A flowing scene's visit is [`state.flow`](/docs/reference/flows#state).

## View

`view.scene` holds the open scene, or the room while none is open, with its `title`, `speaker`, `picture`, its body as `beats` and its choices as [`RenderedChoice`](/docs/api/engine#renderedchoice)s. Each choice has its price, and `disabled` set to the reason while it can't be pressed. `view.scene.body` holds the same words as markup text, so an in-place `{ media }` block appears there as its markup. To render it, see [Render the scene](/docs/how-to/render/scene#render-the-scene).

## Checks

The [content checker](/docs/reference/checks) checks every scene:

| Problem | Cause |
|---|---|
| `two choices share the id "tea"` | Two choices of one scene, in its `choices` or its decisions, have one id. |
| `choice go: a choice's command can't be another choice; put the effects on this one` | A choice's `command` is a `choose`. |
| `no prose for "cafe.menu"` | A `{ prose }` block names a key no prose table has. |
| `variants "ava.smalltalk" has no lines` | A `variants` block names a set with no member that has a line. |
| `{ text: "cafe.counter" } names the prose "cafe.counter", …` | A `{ text }` block's words are a prose key, so the player would read the key. Write the words, or `{ prose: 'cafe.counter' }`. |
| `[[act:answer]] names no choice or action offered here` | A line names a choice the scene doesn't have. |
| `render threw: …` | The scene can't be rendered in the state the checker tried, such as with an effect of the game's own that throws. |

The checker also checks what each block, choice and picture names, as it checks any condition and effect, and the storylet fields as [Storylets](/docs/reference/storylets#checks) lists.

## Caveats

- In a room scene, such as a location's body in the [places plugin](/docs/reference/plugins/places), a `variants` block has no choice to record its draw. The turn and the seed pick the member, so the room deals one line all turn and can deal the same line two turns running.
- A `variants` block whose every member is gated out renders nothing, with no problem reported.
- A `per: 'turn'` choice is free again once the turn ends, through a [`turn`](/docs/reference/effects#turn) effect or the calendar's sleep. Leaving the scene doesn't free it, and a choice that ends the turn is dated the turn it was chosen in.
- A plugin guard's soft warning, such as the [calendar](/docs/reference/plugins/calendar)'s `That would run past dawn.`, leaves the choice pressable, and `choose` is refused with the warning.
- `view.scene.image` is the speaker's picture, or in the room the room's own, such as a location's `image`. It's set beside `view.scene.picture` when there are both, and a UI decides which to render.
