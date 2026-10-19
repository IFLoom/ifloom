---
title: Presentation hints
description: The ui field on scenes, choices, blocks, kinds, entities, stats, actions and the game. The engine carries it to the view as written; a UI package decides what it means.
---

Some things in a game are about how it looks, not how it plays: a scene that fades in, a paragraph that waits a moment, energy drawn as a bar, a character whose lines are blue. None of that changes the state, the rules or a replay, and each UI draws it differently. So the engine doesn't define any of it. Content writes it in a `ui` field, the engine carries that field to the view unchanged, and a UI package decides what the hints mean.

```ts
{
  id: 'ava.river',
  title: 'By the river',
  ui: { transition: 'fade' },
  body: [
    { text: 'ava.river' },
    { text: 'ava.river.shuffle', ui: { reveal: { delay: 1500, as: 'slide-up' } } },
  ],
  choices: [{ id: 'stay', ui: { transition: 'slide-up' }, effects: [{ kind: 'scene', scene: null }] }],
}
```

The hints above are the [React UI's](/docs/react/hints). Another UI can read the same ones, ignore them, or define its own. A game played with no UI at all, in a test or `ifloom playtest`, plays exactly the same with or without them.

The rule behind it: the engine owns what changes the game's state, its rules or a replay, and content that every UI has to read the same way, such as a scene's words, a stat's value or an entity's picture. A UI owns how things look and move.

## Where you can write them

| Written on | Arrives in the view as | Typed by |
|---|---|---|
| A [data scene](/docs/reference/scenes#datascene) or a hand-built [`Scene`](/docs/reference/scenes#scene) | [`view.scene.ui`](/docs/reference/view#the-scene) | `SceneUi` |
| A plugin's [stage](/docs/reference/plugins#stage), such as a [place](/docs/plugins/places#locationdef) | `view.scene.ui` while no scene is open | `SceneUi` |
| A [`Choice`](/docs/reference/scenes#choice) or a hand-built [`SceneChoice`](/docs/reference/scenes#scenechoice) | The choice's `ui` ([`RenderedChoice`](/docs/reference/view#renderedchoice)) | `ChoiceUi` |
| An [action](/docs/reference/actions) | The button's `ui` in `view.actions` | `ChoiceUi` |
| A [`Block`](/docs/reference/scenes#block) | The `ui` of the first [beat](/docs/reference/prose#scenebeat) the block makes | `BlockUi` |
| A [kind](/docs/reference/entities#kinddef) | Each of its entities' `ui`, under the entity's own | `EntityUi` |
| An [entity](/docs/reference/entities#entitydef) | Its `ui` in [`view.entities`](/docs/reference/view#entitiesview-and-entityview), [`view.held`](/docs/reference/view#heldview) and, for someone speaking, [`SpeakerView`](/docs/reference/view#speakerview) | `EntityUi` |
| A [stat](/docs/reference/stats#statdef) | Its [`StatView`](/docs/reference/view#statview)'s `ui` | `StatUi` |
| The [`Game`](/docs/reference/game) | `game.ui`, which a UI reads from the runner's game | `GameUi` |

A view leaves `ui` out where content wrote none, so a UI checks for it before reading a hint.

A block's hints go on the first beat it makes. A block whose text has two paragraphs makes two beats, and only the first carries `ui`, so a UI knows where the block starts. A block that isn't shown (its `when` doesn't hold) takes its hints with it.

An entity's hints are its kind's with its own laid over them, field by field. A thing made in play `like` another reads that one's hints, then its kind's.

## Ui and the hint interfaces

```ts
import type { BlockUi, ChoiceUi, EntityUi, GameUi, SceneUi, StatUi, Ui } from '@ifloom/engine'

interface SceneUi {}
interface ChoiceUi {}
interface BlockUi {}
interface EntityUi {}
interface StatUi {}
interface GameUi {}

type Ui<T> = T & { readonly [hint: string]: unknown }
```

Every `ui` field is a `Ui<…>` of the interface for where it's written. The interfaces are empty in the engine. A UI package fills them in by augmenting them, the way a plugin types its [traits](/docs/reference/entities#traits):

```ts
declare module '@ifloom/engine' {
  interface StatUi {
    /** How the sidebar draws the stat. */
    display?: 'number' | 'bar' | 'pips'
  }
}
```

Once a game's code imports that package, `ui: { display: 'bar' }` on a stat is typed, and `display: 'dial'` is a type error. A hint no package declares still compiles, because `Ui` lets any other key through, so a mod or a second UI can add its own. A typo in a key isn't caught by the types for the same reason. A UI package can offer a check for that: the React UI's is [`checkUiHints`](/docs/react/hints#checkuihints).

## entityUi

```ts
import { entityUi } from '@ifloom/engine'

function entityUi(state: GameState, game: Game | undefined, ref: EntityRef): Ui<EntityUi> | undefined
```

An entity's hints as the view gives them: its kind's, then the one it was made `like`, then its own declaration's, each laid over the one before. Undefined when none has any. A plugin uses it to pass someone's hints on in its own view, as the cast does for a [speaker](/docs/reference/view#speakerview).

## uiProblems

```ts
import { uiProblems } from '@ifloom/engine'

function uiProblems(ui: unknown): string[]
```

What the [content checker](/docs/reference/checks) says about one `ui` field: nothing for one left out, `ui must be an object of hints` when it isn't an object, and a line for anything inside it that isn't data, such as a function or a `Date`. A hint is what a JSON file could hold: objects, arrays, text, numbers, true/false and null.

## What the engine does with them

Nothing else. It doesn't read a hint, give one a default, merge a scene's with the game's, or check a hint's name or value against any list. That's all the UI's job. The checker only makes sure each `ui` is data, so a pack or a mod with hints can be saved and loaded as JSON.

## See it in an example

The showcase's scenes, stats and characters carry the React UI's hints: `ui.transition` on `intro` and `ava.river`, `ui.reveal` on their second paragraphs, `ui.dice` on the park's skimming lines, `ui.display` on energy, and `ui.hue` on Ava and Sam. Its source is in `examples/showcase/src/`.
