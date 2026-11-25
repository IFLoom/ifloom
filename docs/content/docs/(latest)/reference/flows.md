---
title: "Flowing scenes"
description: "A flowing scene reads on as the player chooses, with builders that write its body and state that keeps its path."
---
A flowing scene stops partway through its body at a decision, and reads on once the player chooses. The choice's own blocks come next, then the blocks after the decision, so the earlier words stay on the page. A scene flows when its [body](/docs/reference/scenes#block) holds a decision, a point, a minigame or a panel, and the engine's builders write each block. [Write a flowing scene](/docs/how-to/write-a-flowing-scene) writes one, and [Turns, scenes and the room](/docs/explanation/turns-and-time#a-scene-and-the-room) explains what a scene is.

In the showcase: `examples/showcase/src/story/ava.ts`, whose `ava.river` scene comes back to a point until you sit with Ava.

```ts
import { cases, choice, decide, fold, image, jump, minigame, panel, point, say, text, when, type BlockExtras, type FlowChoice, type FlowState, type FlowStep } from '@ifloom/engine'
```

## FlowChoice

A choice at a decision, a [`Choice`](/docs/reference/scenes#choice) with `then`, the blocks the flow shows once the player chooses it. Every field is in [`FlowChoice`](/docs/api/engine#flowchoice).

A flow choice has everything a choice has, a `cost`, `blocked`, `once` and `command` included. Choice ids are unique across the whole scene, its decisions and its ending choices together, so `{ chose: 'cafe.counter#tea' }` and `[[act:tea]]` each name one choice.

Once the player chooses, the flow shows the choice's `then`, then carries on after its decision, so every choice rejoins the scene. A choice that shouldn't rejoin leaves the scene with an effect, such as `{ scene: null }`. A choice with a [`jump`](#jump) carries on from that point once its `then` is done.

This counter scene waits for an order, then loops back to the questions until the player thanks Ava:

```ts
import { choice, decide, jump, point, say, text, type DataScene } from '@ifloom/engine'

export const counter: DataScene = {
  id: 'cafe.counter',
  speaker: 'ava',
  body: [
    text(`@ava: "Morning! What can I get you?"`),
    decide('order', [
      choice('tea', 'A pot of tea', { then: [say('ava', 'Good choice.')], effects: [{ kv: 'tea', to: true }] }),
      choice('coffee', 'A coffee', { then: [text(`She grinds the beans.`)] }),
    ]),
    point('questions'),
    decide('ask', [
      choice('beans', 'Ask about the beans', {
        blocked: [{ when: { chose: 'cafe.counter#beans' }, reason: 'Asked.', hide: true }],
        then: [say('ava', 'From a farm up the valley.')],
        effects: [jump('questions')],
      }),
      choice('done', 'Thank her'),
    ]),
    text(`You sit by the window.`),
  ],
  choices: [{ id: 'leave', label: 'Leave', effects: [{ scene: null }] }],
}
```

## BlockExtras

The fields most builders take last, the condition the block shows under and its [presentation hints](/docs/reference/ui-hints). Every field is in [`BlockExtras`](/docs/api/engine#blockextras).

`text` and `say` take an `id` beside them for the [words table](/docs/reference/words), and `say` a `voice`. `when` takes everything but `when`, which it takes first.

```ts fragment
text('The lights go out.', { when: { kv: 'storm' }, ui: { reveal: { delay: 1200 } } })
```

## State

[`state.flow`](/docs/reference/state#flow) is the open scene's visit, a [`FlowState`](#flowstate). It is `null` while no scene is open, and while the visit has nothing to keep, such as in a scene with no decisions.

Every choice the player makes is a logged `choose` command, so [replay](/docs/reference/runner#replay), undo and the backlog are exact. The backlog keeps a flowing visit as one entry, which grows with each choice. Entering a scene starts its flow at the top, the same scene included.

### FlowState

The visit a save keeps for the open scene, as the path the player took through it. Every field is in [`FlowState`](/docs/api/engine#flowstate).

`path` lists every choice, jump, minigame and panel the flow has passed, in order. `waiting` names the minigame or panel the flow waits on now, and is `null` while the flow waits for a choice or has reached the end.

```ts fragment
{ scene: 'cafe.counter', path: [{ chose: 'tea' }, { chose: 'beans' }, { point: 'questions' }], waiting: null }
```

### FlowStep

One step of a visit's path: a choice by id, a jump to a point, or a minigame or panel the flow went past. Every form is in [`FlowStep`](/docs/api/engine#flowstep).

## View

`view.scene.beats` holds everything up to where the flow stops, with a `chose` beat at each past choice that holds the choice's label as the player read it. `view.scene.choices` holds the choices of the decision the flow stopped at, the ending choices once it's done, and none while it waits on a minigame or a panel. `view.scene.fresh` is the index of the first beat the last step brought, from its `chose` beat on, and 0 before the visit's first step. To render it, see [Render a flowing scene](/docs/how-to/render/scene#render-a-flowing-scene).

The engine renders the flow from the state now, along the path the save keeps. So a `when` on a block above a choice reads what the choice did.

## Functions

Each builder returns plain data, the same objects a pack or a mod writes by hand.

### text

Returns a `{ text }` block of words in place, one paragraph or several. Its signature is in [`text`](/docs/api/engine#text).

It strips the indentation every line shares and the blank lines at either end, so the words can sit indented in your code. A blank line starts a paragraph, and the engine reads the words as [prose](/docs/reference/prose#markup).

```ts fragment
text(`
  Ava looks up from the till.

  @ava: "Morning!"
`)
```

### say

Returns a `{ say, speaker }` block, a spoken line under the id of who says it. Its signature is in [`say`](/docs/api/engine#say).

`who` names the speaker as `@id: "…"` does in [prose](/docs/reference/prose#speech): an entity by bare id or reference, `'you'` or `'player'`. The line's beat is a `say` beat with that `speaker` and their `name`, and its indentation is stripped as `text`'s is.

```ts fragment
say('ava', 'From a farm up the valley.', { voice: 'ava.beans' })
```

### when

Returns a section, `{ blocks, when }`, whose blocks show together while the condition holds. Its signature is in [`when`](/docs/api/engine#when).

A section holds anything a body can, decisions included. Its `ui` hints go on every beat it makes, as the beat's `section`.

```ts fragment
when({ kv: 'tea' }, [say('ava', 'Milk?'), text('She reaches for the jug.')])
```

### fold

Returns a section the player opens and shuts under `label`, `{ blocks, ui: { fold: label } }`. Its signature is in [`fold`](/docs/api/engine#fold).

A fold is presentation only, the React UI's [`fold`](/docs/reference/react/hints) hint, and keeps no state. A UI without the hint shows the blocks open. A switch that matters to the story is a choice or an [input](/docs/reference/inputs) that sets a kv key, so it saves and replays.

```ts fragment
fold('Read the postcard', [text('Wish you were here. The sea is cold.')])
```

### cases

Returns a `{ cases }` block that shows only the first of its blocks whose own `when` holds, or that has none. Its signature is in [`cases`](/docs/api/engine#cases).

Leave the last block without a `when` as the fallback, and nothing shows when no block fits. A `when` in `extras` leaves the whole block out while it fails. A block inside can be anything a body holds, and the flow waits at a decision inside one as anywhere else. The engine picks the block each time it renders the scene, and each block keeps its own place in the scene, so a picture drawn from a pool in one stays the same on every visit. `cases` works in any scene, flowing or not.

```ts
import { cases, say, text, when } from '@ifloom/engine'

export const kitchen = cases([
  text(`Sam has made pancakes.`, { when: { kv: 'samUp' } }),
  when({ kv: 'avaUp' }, [say('ava', 'Toast?')]),
  text(`The kitchen is empty.`),
])
```

### decide

Returns a decision, `{ decide, choices }`, where the flow waits until the player chooses one of `choices`. Its signature is in [`decide`](/docs/api/engine#decide).

Its id is unique within the scene. The chosen choice's `then` comes next, then the blocks after the decision.

```ts fragment
decide('order', [choice('tea', 'A pot of tea'), choice('coffee', 'A coffee')])
```

### choice

Returns a [`FlowChoice`](#flowchoice) with `label` as its words. Its signature is in [`choice`](/docs/api/engine#choice-1).

Every other field of a choice goes in `fields`, such as `effects`, `cost`, `blocked`, `once`, `command` and `then`. It writes a scene's ending choices as well as a decision's.

```ts fragment
choice('tea', 'A pot of tea', { then: [say('ava', 'Good choice.')], effects: [{ kv: 'tea', to: true }] })
```

### point

Returns a point, `{ point }`, a place in the flow a choice can jump to. Its signature is in [`point`](/docs/api/engine#point).

A point can stand anywhere, at the top of the body, in a section or in a choice's `then`. The checker reports a point inside a `cases` block, because the block that holds it might not be the one shown.

### jump

Returns the effect `{ point }`, which carries the flow on from a point once the choice's `then` is done. Its signature is in [`jump`](/docs/api/engine#jump).

From the point, the flow reads on as if it had got there by itself, to the end of the list the point is in and then on after the section or decision around it. A jump into a section shows the rest of the section, under its hints, even while the section's `when` fails. A jump works only as a choice's effect in the scene that has the point, so a flow loops only when the player chooses. An ending choice can jump too. Put it in the choice's `effects`, never its `then`: `jump(id)` and `point(id)` are the same object, so in a `then` it's a second point, and the checker reports `two points share the id`, naming the choice.

```ts fragment
choice('beans', 'Ask about the beans', { effects: [jump('questions')] })
```

### image

Returns a `{ media }` block with a picture or a video, with the [`SceneMedia`](/docs/reference/scenes#scenemedia) fields you give. Its signature is in [`image`](/docs/api/engine#image).

```ts fragment
image('scene/market-morning', { size: 'wide', alt: 'The market at seven' })
```

### minigame

Returns a `{ minigame }` block, a [minigame](/docs/reference/minigames) played where it stands. Its signature is in [`minigame`](/docs/api/engine#minigame).

The flow starts the minigame when it gets there, waits while it's played, and carries on once it ends.

### panel

Returns a `{ panel, with }` block, a [panel](/docs/reference/panels) opened where it stands. Its signature is in [`panel`](/docs/api/engine#panel).

The block leaves `with` out when you pass no `args`. The flow waits until the player closes the panel, or until a turn ending closes it.

```ts fragment
panel('prices', { stall: 'bread' })
```

## Checks

The [content checker](/docs/reference/checks) checks every flowing scene:

| Problem | Cause |
|---|---|
| `two decisions share the id "order"` | Two decisions of one scene have one id, and the same goes for two points. |
| `decision ask choice beans: jumps to point "questions", which the scene doesn't have` | A choice jumps to a point its scene lacks. |
| `… a jump only works as a choice's effect in the scene that has that point` | A `{ point }` effect stands anywhere but a choice. |
| `decision order has no choices, so the flow stops there` | A decision lists no choices. |
| `decision ask: every choice hides once picked, so the flow stops once all are taken; add one that moves on` | Each choice of a decision hides once chosen, with none left to move on. |
| `decision ask choice go: its then is never shown, because the choice leaves the scene` | A choice with `then` also leaves the scene. |
| `decision ask: every choice leaves or jumps, so what comes after it is never reached` | No choice of a decision rejoins, and no point after it lets a jump land there. |
| `choice leave: an ending choice's then is never shown; put the choice in a decide` | An ending choice has `then`. |
| `variants aren't drawn in a scene that flows, …` | A `variants` block stands in a flowing scene. |
| `cases lists no blocks, so it shows nothing` | A `cases` block is empty. |
| `case 2 has no when, so the cases after it are never shown` | A block in a `cases` comes after one with no `when`. |
| `point "questions" is in cases, where it may not be shown; put it outside the cases` | A point stands inside a `cases` block. |

The checker also reports a minigame or panel the game doesn't have, as it does anywhere.

## Caveats

- A flowing scene can't hold a `variants` block. Each choice renders the scene again, and the draw would move on, so a line the player read would change.
- The view holds the whole visit, so each loop through a point adds its words again. A UI that wants less starts from `fresh`, or from the last `chose` beat.
- A choice's effects are seen by the words above it too, because the flow renders from the state now. Put words that depend on a choice after it, or in its `then`.
- An `[[act:id]]` in a line names a choice of the decision the flow stopped at. In a line above an earlier decision, it shows as its words.
