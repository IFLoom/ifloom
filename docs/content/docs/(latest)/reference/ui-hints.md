---
title: Presentation hints
description: The ui field on scenes, choices, blocks, kinds, entities, stats, actions and the game. The engine carries it to the view as written; a UI package decides what it means.
---

Some things in a game are about how it looks, not how it plays: a scene that fades in, a paragraph that waits a moment, energy drawn as a bar, a character whose lines are blue. None of that changes the state, the rules or a replay, and each UI draws it differently. So the engine doesn't define any of it. Content writes it in a `ui` field, the engine carries that field to the view unchanged, and a UI package decides what the hints mean.

```ts fragment
{
  id: 'ava.river',
  title: 'By the river',
  ui: { transition: 'fade' },
  body: [
    { prose: 'ava.river' },
    { prose: 'ava.river.shuffle', ui: { reveal: { delay: 1500, as: 'slide-up' } } },
  ],
  choices: [{ id: 'stay', ui: { transition: 'slide-up' }, effects: [{ scene: null }] }],
}
```

The hints above are the [React UI's](/docs/react/hints). Another UI can read the same ones, ignore them, or define its own. A game played with no UI at all, in a test or `ifloom playtest`, plays exactly the same with or without them.

The rule behind it: the engine owns what changes the game's state, its rules or a replay, and content that every UI has to read the same way, such as a scene's words, a stat's value or an entity's picture. A UI owns how things look and move.

## Where you can write them

| Written on | Arrives in the view as | Typed by |
|---|---|---|
| A [data scene](/docs/reference/scenes#datascene) | [`view.scene.ui`](/docs/reference/view#the-scene) | `SceneUi` |
| A plugin's [room scene](/docs/reference/plugins#scene), such as a [place](/docs/plugins/places#the-location-trait) | `view.scene.ui` while no scene is open | `SceneUi` |
| A [`Choice`](/docs/reference/scenes#choice) | The choice's `ui` ([`RenderedChoice`](/docs/reference/view#renderedchoice)) | `ChoiceUi` |
| An [action](/docs/reference/actions) | The button's `ui` in `view.actions` | `ChoiceUi` |
| A [`Block`](/docs/reference/scenes#block) | The `ui` of the first [beat](/docs/reference/prose#scenebeat) the block makes | `BlockUi` |
| A [kind](/docs/reference/entities#kinddef) | Each of its entities' `ui`, under the entity's own | `EntityUi` |
| An [entity](/docs/reference/entities#entitydef) | Its `ui` in [`view.entities`](/docs/reference/view#entitiesview-and-entityview), [`view.held`](/docs/reference/view#heldview) and, for someone speaking, [`SpeakerView`](/docs/reference/view#speakerview) | `EntityUi` |
| A [stat](/docs/reference/stats#statdef) | Its [`StatView`](/docs/reference/view#statview)'s `ui` | `StatUi` |
| The [`Game`](/docs/reference/game) | `game.ui`, from your content's `ui` (a pack's hints replace it key by key), which a UI reads from the runner's game | `GameUi` |

A view leaves `ui` out where content wrote none, so a UI checks for it before reading a hint.

A block's hints go on the first beat it makes. A block whose text has two paragraphs makes two beats, and only the first carries `ui`, so a UI knows where the block starts. A block that isn't shown (its `when` doesn't hold) takes its hints with it.

An entity's hints are its kind's with its own laid over them, field by field. A thing made in play `like` another reads that one's hints, then its kind's.

## Ui and the hint interfaces

```ts shape
import type { Ui } from '@ifloom/engine'

type Ui<T> = T & { readonly [hint: string]: unknown }
```

Every `ui` field is a `Ui<…>` of the interface for where it's written. A hint interface's own keys are typed, and any other key is let through as `unknown`.

### SceneUi, ChoiceUi, BlockUi, EntityUi, StatUi and GameUi

The hints each place takes: a scene's (and a place's room), a choice's (and an action's), a block's, an entity's (and a kind's), a stat's and the game's.

```ts shape
import type { BlockUi, ChoiceUi, EntityUi, GameUi, SceneUi, StatUi } from '@ifloom/engine'

interface SceneUi {}
interface ChoiceUi {}
interface BlockUi {}
interface EntityUi {}
interface StatUi {}
interface GameUi {}
```

The interfaces are empty in the engine. A UI package fills them in by augmenting them, the way a plugin types its [traits](/docs/reference/entities#traits):

```ts
declare module '@ifloom/engine' {
  interface StatUi {
    /** How the sidebar draws the stat. */
    display?: 'number' | 'bar' | 'pips'
  }
}
```

Once a game's code imports that package, `ui: { display: 'bar' }` on a stat is typed, and `display: 'dial'` is a type error. A hint no package declares still compiles, because `Ui` lets any other key through, so a mod or a second UI can add its own. A typo in a key isn't caught by the types for the same reason. A UI package can offer a check for that: the React UI's is [`checkUiHints`](/docs/react/hints#checkuihints).

## InlineUi

```ts shape
import type { InlineUi } from '@ifloom/engine'

interface InlineUi {}
```

The pieces a UI draws inside a line of prose, from [`[[ui:name|words|arg|…]]`](/docs/reference/prose#ui-pieces), by name, each with the arguments it takes after the words. Like the hint interfaces, it's empty in the engine and a UI package augments it. The React UI declares its two built-in pieces this way:

```ts
declare module '@ifloom/engine' {
  interface InlineUi {
    modal: [key: string, title?: string]
    image: [path: string, alt?: string]
  }
}
```

A game that adds a piece of its own declares it the same way, so its component's `args` are typed. `InlineUiArgs<'modal'>` is `[key: string, title?: string]` once the React UI is imported, and a name nobody declared takes any text.

### InlineUiArgs

The arguments a piece takes after its words: what `InlineUi` declares for the name, else any text. A component that draws a piece types its `args` with it.

```ts shape
type InlineUiArgs<N extends string> = N extends keyof InlineUi ? InlineUi[N] : readonly string[]
```

The engine never reads `InlineUi`. A `ui` [span](/docs/reference/prose#inlinespan) has `name: string` and `args: string[]` whatever was declared, because the markup is prose and a mod or a second UI can write a name of its own. Nothing checks that the arguments a line gives match the tuple, so a component should cope with one missing. The React UI's [`checkUiHints`](/docs/react/hints#checkuihints) reports a built-in piece with too few or too many.

## entityUi

```ts shape
import { entityUi } from '@ifloom/engine/plugin'

function entityUi(state: GameState, game: Game, ref: EntityRef): Ui<EntityUi> | undefined
```

An entity's hints as the view gives them: its kind's, then the one it was made `like`, then its own declaration's, each laid over the one before. Undefined when none has any. A plugin uses it to pass someone's hints on in its own view, as the cast does for a [speaker](/docs/reference/view#speakerview).

## uiInContent

```ts shape
import { uiInContent } from '@ifloom/engine'

function uiInContent(game: Game): UiInContent
```

Every `ui` field in a game's content, and every line of words a player reads, found by the [content checker](/docs/reference/checks)'s own walk. It's for a UI package's checker, so it can check its own hints without walking the content itself. The React UI's [`checkUiHints`](/docs/react/hints#checkuihints) is built on it.

Each field says what it's written on (`on`), that thing's `id` where it has one, and `where` it is, as a problem would name it (`scene park`, `scene park choice skim`, `stat energy`). A hint on a place's room is `on: 'scene'`, an action's is `on: 'choice'`, and a kind's is `on: 'entity'`, since a kind's hints are each entity's. A block's or a section's `where` is its scene's. The walk reaches whatever a plugin's content holds as well, such as a place's room and body.

`lines` holds every prose line and every block of words written in place, with where it is, for a UI to read its [UI pieces](/docs/reference/prose#ui-pieces) in. The same hints or line reached twice are listed once.

```ts
import { uiInContent } from '@ifloom/engine'

const { fields } = uiInContent(game)
const reveals = fields.filter((field) => field.on === 'block' && 'reveal' in (field.ui as object))
```

### UiInContent

What `uiInContent` finds.

```ts shape
type UiInContent = { fields: UiField[]; lines: TextLine[] }
```

| Field | Type | Meaning |
|---|---|---|
| `fields` | `UiField[]` | Every `ui` field in the content, each once. |
| `lines` | `TextLine[]` | Every prose line and every block of words written in place. |

### UiField

One `ui` field and where it's written.

```ts shape
type UiField = { on: UiTarget; id?: string; where: string; ui: unknown }
```

| Field | Type | Meaning |
|---|---|---|
| `on` | `UiTarget` | What it's written on. |
| `id` | `string`, optional | That thing's id, where it has one. |
| `where` | `string` | Where it is, as a problem names it, such as `scene park choice skim`. |
| `ui` | `unknown` | The hints as written. Check them before you read them. |

### TextLine

One line of words a player reads, with where it is.

```ts shape
type TextLine = { where: string; text: string }
```

### UiTarget

The kinds of thing a `ui` field is written on.

```ts shape
type UiTarget = 'scene' | 'choice' | 'block' | 'stat' | 'entity' | 'game'
```

## What the engine does with them

Nothing else, and the same goes for [UI pieces](/docs/reference/prose#ui-pieces) in prose. It doesn't read a hint, give one a default, merge a scene's with the game's, or check a hint's name or value against any list. That's all the UI's job. The checker only makes sure each `ui` is data, so a pack or a mod with hints can be saved and loaded as JSON.

## See it in an example

The showcase's scenes, stats and characters carry the React UI's hints: `ui.transition` on `intro` and `ava.river`, `ui.reveal` on their second paragraphs, `ui.dice` on the park's skimming lines, `ui.display` on energy, and `ui.hue` on Ava and Sam. The flat's prose opens Sam's welcome note with `[[ui:modal|…]]`, and Ava's greeting her photo with `[[ui:image|…]]`. Its source is in `examples/showcase/src/`.
