---
title: "Flowing scenes"
description: "A scene that reads on as the player chooses: decisions partway through whose picks bring their own text, sections under a condition, points to come back to, minigames and panels where they stand, and folds. The blocks, their builders, state.flow and what the view shows."
---
A scene's body is read top to bottom. Most scenes show their blocks and then their choices. A flowing scene stops partway through at a decision instead. Once the player picks, the pick's own text comes next, then the blocks after the decision, so the earlier text stays on the page and the scene reads on like a story. [Writing a flowing scene](/docs/recipes/flowing-scenes) walks through one.

```ts
import { choice, decide, jump, point, say, text } from '@ifloom/engine'

const counter: DataScene = {
  id: 'cafe.counter',
  speaker: 'ava',
  body: [
    text(`
      Ava looks up from the till.

      @ava: "Morning! What can I get you?"
    `),
    decide('order', [
      choice('tea', 'A pot of tea', { then: [say('ava', 'Good choice.')], effects: [{ kv: 'tea', to: true }] }),
      choice('coffee', 'A coffee', { then: [text(`She grinds the beans.`)] }),
    ]),
    text(`She sets your cup on the counter.`),
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

After the player picks the tea and asks about the beans, the view reads:

```ts
view(state, game).scene.beats
// [{ type: 'text', text: 'Ava looks up from the till.' },
//  { type: 'say', who: 'character', speaker: 'character:ava', name: 'Ava', text: 'Morning! What can I get you?' },
//  { type: 'chose', label: 'A pot of tea' },
//  { type: 'say', who: 'character', speaker: 'character:ava', name: 'Ava', text: 'Good choice.' },
//  { type: 'text', text: 'She sets your cup on the counter.' },
//  { type: 'chose', label: 'Ask about the beans' },
//  { type: 'say', who: 'character', speaker: 'character:ava', name: 'Ava', text: 'From a farm up the valley.' }]
view(state, game).scene.fresh     // 5: the beans pick and her answer are what the last command brought
view(state, game).scene.choices   // [{ id: 'done', label: 'Thank her', ... }]: the beans hide once asked
state.flow                        // { scene: 'cafe.counter', path: [{ chose: 'tea' }, { chose: 'beans' }, { point: 'questions' }], waiting: null }
```

## The blocks

A flowing scene uses the same [`Block`](/docs/reference/scenes#block) list as any scene, with these kinds beside `text`, `prose`, `variants` and `media`:

```ts
type Block = (
  | { text: string; id?: string; when?: Condition }
  | { prose: string; when?: Condition }
  | { variants: string; when?: Condition; gate?: Record<string, Condition>; image?: Record<string, string> }
  | { media: SceneMedia; when?: Condition }
  | { say: string; speaker: string; voice?: string; id?: string; when?: Condition }
  | { blocks: Block[]; when?: Condition }
  | { cases: Block[]; when?: Condition }
  | { decide: string; choices: FlowChoice[]; when?: Condition }
  | { point: string }
  | { minigame: string; when?: Condition }
  | { panel: string; with?: PluginArgs; when?: Condition }
) & { ui?: Ui<BlockUi> }
```

| Block | What it does |
|---|---|
| `{ text }` | Words written in place, one paragraph or several, read as prose is: spoken lines, pictures, [inline markup](/docs/reference/prose#markup) and tokens. `id` names it for a translation's [words table](/docs/reference/words). Before schema 25 this was `{ words }`, and `{ text }` named a prose key, which is `{ prose }` now. |
| `{ say, speaker }` | A spoken line, under who says it, by id as `@id: "…"` names them in [prose](/docs/reference/prose#speech): an entity (`'ava'`, `'character:ava'`), `'you'` for whoever the player is playing, or `'player'`. Its beat is a `say` with that `speaker` and their `name`. |
| `{ blocks }` | A section: its blocks show together while `when` holds. A section can hold anything a body can, decisions included. Its `ui` hints go on every beat it makes, as the beat's `section`. |
| `{ cases }` | The first that fits: only the first of its blocks whose own `when` holds, or that has none, is shown. See [The first that fits](#the-first-that-fits). |
| `{ decide, choices }` | A decision. The flow waits here until the player picks one of `choices`, then shows the pick's `then` and carries on after the decision. Its id is unique within the scene. |
| `{ point }` | A place a choice can jump to. It can go anywhere: at the top of the body, in a section, or in a choice's `then`. |
| `{ minigame }` | A [minigame](/docs/reference/minigames) played where it stands. The flow starts it when it gets there, waits while it's played, and carries on once it ends. |
| `{ panel, with }` | A [panel](/docs/reference/panels) opened where it stands, with what it needs. The flow waits until the player closes it (or the panel closes as a turn ends). |

A scene whose body has none of these kinds reads exactly as it always has.

### The first that fits

A `{ cases }` block is an if, else if, else. Each of its blocks is tried in order, and only the first whose own `when` holds is shown. A block with no `when` always fits, so put one last as the otherwise.

```ts
import { cases, say, text, when } from '@ifloom/engine'

body: [
  text(`You come into the kitchen.`),
  cases([
    text(`Sam has made pancakes.`, { when: { kv: 'samUp' } }),
    when({ kv: 'avaUp' }, [say('ava', 'Toast?')]),
    text(`The kitchen is empty.`),
  ]),
  text(`The kettle clicks off.`),
]
```

- A `when` on the `cases` block itself leaves the whole thing out while it fails: `cases([...], { when: { kv: 'rain' } })`.
- When nothing fits, nothing is shown.
- A block in it can be anything a body holds, a section with a decision included. The flow waits at that decision as it would anywhere.
- Each block keeps its own place in the scene, so a picture drawn from a [pool](/docs/reference/media#pools) in one stays the same picture on every visit.
- Which block fits is worked out each time the scene is drawn, from the state now. So a pick that changes what the conditions read can change which block shows above it, as with any `when`.

### FlowChoice

```ts
type FlowChoice = Choice & { then?: Block[] }
```

A choice at a decision: a [`Choice`](/docs/reference/scenes#choice) with everything a choice has, a `cost`, `blocked`, `once` or `command` included, and `then`, the blocks shown once it's picked. Choice ids are unique across the whole scene, its decisions and its ending choices together, so `{ chose: 'cafe.counter#tea' }`, [`since`](/docs/reference/conditions#since) and `[[act:tea]]` mean one choice.

### How the flow goes

- **A pick rejoins.** The pick's `then` comes first, then the blocks after its decision. A branch that shouldn't rejoin leaves the scene with an effect, `{ scene: 'cafe.door' }` or `{ scene: null }`.
- **A jump loops back.** A choice with the effect [`{ point }`](/docs/reference/effects#point), written `jump('questions')`, carries on from that point once its `then` is done, wherever the point is. From there the flow reads on as if it had got to the point by itself: to the end of the list the point is in, then on after the section or the decision around it. A jump into a section shows the rest of the section, under its hints, even when the section's `when` doesn't hold. A jump is only ever a choice's effect, so a flow goes round again only when the player picks. An ending choice can jump too.
- **The ending choices come last.** A scene's `choices` are offered once the flow reaches the end of the body.
- **Each visit starts afresh.** Entering a scene, the same one included, starts its flow at the top.

### The words of a pick

A `chose` beat stands where each decision was, with the choice's label as the player saw it. The pick's `then` and the blocks after it follow. The pick is also counted in [`chosen`](/docs/reference/state#chosen), as any choice is.

### What the past reads like

The flow is drawn from the state now, along the path the save keeps. So a section's `when` before a pick sees what the pick did. Put text that depends on a pick after it, or in its `then`.

## state.flow

```ts
type FlowState = {
  scene: string
  path: FlowStep[]
  waiting: { minigame: string } | { panel: string } | null
}

type FlowStep = { chose: string } | { point: string } | { minigame: string } | { panel: string }
```

[`state.flow`](/docs/reference/state#flow) is the open scene's visit: every pick (`chose`), jump (`point`) and minigame or panel passed, in order, and what the flow is waiting on now. It's `null` with no scene open, and for a visit that has nothing to keep yet, such as a scene with no decisions. Every pick is a logged `choose` command, so [replay](/docs/reference/runner#replay), undo and the [backlog](/docs/reference/runner#backlogentry) are exact. The backlog keeps a flowing visit as one entry, which grows with each pick.

## Drawing it

- [`view.scene.beats`](/docs/reference/view#the-scene) holds everything up to where the flow stops, with a `chose` beat at each past pick.
- `view.scene.choices` holds the choices of the decision the flow stopped at, or the ending choices once it's done. While it waits on a minigame or a panel, there are none.
- `view.scene.fresh` is the index of the first beat the flow's last step brought, from its `chose` beat on. A UI can animate only those. It's 0 before the visit has taken a step.
- An `[[act:id]]` in the text names a choice of the decision the flow stopped at. In text from before a pick it's drawn as its words.

A UI that only draws "beats, then choices" draws a flowing scene with no change. It can draw a `chose` beat, restyle it or leave it out. The React UI's [`Scene`](/docs/react/components#scene) draws a flowing scene like any other, and its [`reveal`](/docs/react/hints#reveal) hint brings the fresh beats in one at a time. The Plain JS tab uses `runner`, `add` and `drawChoices` from the vanilla template's `src/main.ts`, whose `draw` hands each part the runner's [snapshot](/docs/reference/runner#runnersnapshot), and the Vue tab reads `view`, `snapshot` and `runner` from the vue template's `src/runner.ts` (see [Start the runner](/docs/guide/frameworks#start-the-runner)).

::include[../../../../snippets/plain/flow.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../snippets/react/scene.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../snippets/vue/Flow.vue]{meta='tab="Vue" tab-group="framework"'}

## The builders

`@ifloom/engine` exports a builder for each block. Each returns plain data, the same objects a pack or a mod writes by hand.

```ts
import { cases, choice, decide, fold, image, jump, minigame, panel, point, say, text, when } from '@ifloom/engine'
```

| Builder | Writes |
|---|---|
| `text(words, { id?, when?, ui? })` | `{ text }`. The indentation every line shares is taken off, and blank lines at either end go, so the words can sit indented in your code. A blank line starts a new paragraph. |
| `say(who, words, { id?, when?, ui?, voice? })` | `{ say, speaker }`. `who` is an id: `'ava'`, `'character:ava'`, `'you'` or `'player'`. |
| `when(condition, blocks, { ui? })` | `{ when, blocks }`: a section shown while `condition` holds. |
| `cases(blocks, { when?, ui? })` | `{ cases: blocks }`: only the first of `blocks` that fits is shown. |
| `decide(id, choices, { when?, ui? })` | `{ decide, choices }`. |
| `choice(id, label, fields)` | `{ id, label, ...fields }`, a [`FlowChoice`](#flowchoice). `label` is the words. |
| `image(src, { alt?, size?, ...media, when?, ui? })` | `{ media: { src, ... } }`. |
| `minigame(id, { when?, ui? })` | `{ minigame }`. |
| `panel(name, args?, { when?, ui? })` | `{ panel, with }`. |
| `fold(label, blocks, { when?, ui? })` | `{ blocks, ui: { fold: label } }`: a section the React UI draws as a part the player opens and shuts, with its [`fold`](/docs/react/hints#fold) hint. It keeps no state. |
| `point(id)` | `{ point }`. |
| `jump(id)` | `{ point }`, the effect. |

The `{ when?, ui? }` most builders take last is `BlockExtras`: the condition the block shows under and its [presentation hints](/docs/reference/ui-hints). The builders write the [`Block`](/docs/reference/scenes#block), `Choice` and [`FlowChoice`](#flowchoice) types.

A switch that matters to the story, such as a light the player turns on, is a choice or an [input](/docs/reference/inputs) that sets a kv key, not a fold, so it saves and replays.

## The checks

The [content checker](/docs/reference/checks) reports, for each data scene:

- two choices, two decisions or two points with one id
- a jump to a point the scene doesn't have, and a jump anywhere but a choice
- a minigame or a panel the game doesn't have, as for any other
- a decision with no choices, or whose every choice hides once it's picked, so the flow stops once all are taken
- a `then` on a choice that leaves the scene, which is never shown
- a decision whose every choice leaves or jumps, when something comes after it and no point after it lets a jump land there
- a `then` on an ending choice, which is never shown
- a `variants` block in a scene that flows (see below)
- a `cases` block with no blocks, as `cases lists no blocks, so it shows nothing`
- a block in a `cases` after one with no `when`, as `case <n> has no when, so the cases after it are never shown`
- a point inside a `cases`, since a jump to it lands in a block that might not be the one shown: `point "…" is in cases, where it may not be shown; put it outside the cases`

**Gotchas.**
- `variants` don't go in a flowing scene. Each pick draws the scene again, and the draw would move on, so the player would see a line they'd read change. Use a section with a `when`, or a variants block in a scene with no decisions.
- The transcript isn't capped. Each loop through a point adds its text again, and the view holds the whole visit. A UI that wants less can start from `fresh`, or show only the beats after the last `chose`.
- What a pick changes is seen by the text before it too, because the flow is drawn from the state now. A `when` on earlier text that a pick turns on shows that text above the pick.

## See it in an example

- Small Town's evening by the river, `ava.river` in [`examples/showcase/src/story/ava.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/ava.ts), comes back to a point until you sit with Ava.
- The Letter's second chapter, [`examples/novel/src/story/ch2.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/novel/src/story/ch2.ts), reads on from the answer you give Mrs Okafor.
