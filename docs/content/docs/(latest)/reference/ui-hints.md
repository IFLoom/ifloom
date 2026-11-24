---
title: "Presentation hints"
description: "Reference for the ui field on scenes, choices, blocks, actions, kinds, entities, stats and the game, the hint interfaces a UI package augments, InlineUi, entityUi and uiInContent."
---
A presentation hint is a note in a `ui` field about how something looks or moves, such as a scene that fades in or a stat shown as a bar. The engine carries each `ui` field to the view as written, and a UI package decides what its hints mean. [Presentation lives in UI packages](/docs/explanation/design#presentation-lives-in-ui-packages) explains why the engine reads none of them, and [Add a transition or reveal lines](/docs/how-to/add-a-transition) uses the React UI's.

In the showcase: `examples/showcase/src/story/moving-day.ts`, whose opening scene fades in with `ui.transition` and holds its second line back with `ui.reveal`.

```ts
import type { BlockUi, ChoiceUi, EntityUi, GameUi, InlineUi, InlineUiArgs, SceneUi, StatUi, TextLine, Ui, UiField, UiInContent, UiTarget } from '@ifloom/engine'
import { uiInContent } from '@ifloom/engine'
import { entityUi } from '@ifloom/engine/plugin'
```

## Ui

The type of every `ui` field, the hint interface for where it's written with any other key let through as `unknown`. Its definition is in [`Ui`](/docs/api/engine#ui).

A `ui` field can go on any of these, and the view carries it to the place the table names:

| Field | Meaning |
|---|---|
| A [data scene](/docs/reference/scenes#datascene)'s `ui` | Shown in `view.scene.ui`, typed by `SceneUi`. A plugin's [room scene](/docs/reference/plugin-views), such as a location's, gives `view.scene.ui` while no scene is open. |
| A [choice](/docs/reference/scenes#choice)'s or an [action](/docs/reference/actions#actiondef)'s `ui` | Shown in its [`RenderedChoice`](/docs/reference/view#renderedchoice)'s `ui`, typed by `ChoiceUi`. |
| A [block](/docs/reference/scenes#block)'s `ui` | Shown in the `ui` of the first [beat](/docs/reference/prose#scenebeat) the block makes, typed by `BlockUi`. |
| A [kind](/docs/reference/entities#kinddef)'s or an [entity](/docs/reference/entities#entitydef)'s `ui` | Shown in each entity's `ui` in the view and in a [`SpeakerView`](/docs/reference/view#speakerview), typed by `EntityUi`. |
| A [stat](/docs/reference/stats#statdef)'s `ui` | Shown in its [`StatView`](/docs/reference/view#statview)'s `ui`, typed by `StatUi`. |
| The content's `ui` | Read from the runner's game as `game.ui`, typed by `GameUi`. A pack's hints replace the content's key by key. |

The view leaves `ui` out where content wrote none, so a UI checks for it before reading a hint. A block whose text makes two paragraphs makes two beats, and only the first carries the block's `ui`, so a UI knows where the block starts. A block that isn't shown takes its hints with it. An entity's hints are its kind's with its own laid over them, field by field, and a thing made in play `like` another reads that one's hints between the two.

This scene fades in, holds its second block back for a moment and slides up when the player chooses Stay, with the React UI's hints:

```ts
import type { DataScene } from '@ifloom/engine'

export const river: DataScene = {
  id: 'ava.river',
  title: 'By the river',
  ui: { transition: 'fade' },
  body: [
    { text: 'The water is low, and the ducks have the bank to themselves.' },
    { text: '"I told you it was the only quiet in town."', ui: { reveal: { delay: 1500, as: 'slide-up' } } },
  ],
  choices: [{ id: 'stay', label: 'Stay a while', ui: { transition: 'slide-up' }, effects: [{ scene: null }] }],
}
```

## SceneUi, ChoiceUi, BlockUi, EntityUi, StatUi and GameUi

The hint interfaces, one for each place a `ui` field is written. Each is empty in the engine, and its definition is in [`SceneUi`](/docs/api/engine#sceneui) and the entries beside it.

A UI package fills an interface in by augmenting it, as a plugin types its traits. Once a game's code imports that package, its hints are typed, so `ui: { display: 'bar' }` on a stat compiles and `display: 'dial'` is a type error. A hint no package declares still compiles, because `Ui` lets any other key through, so a mod or a second UI can add its own. This augmentation types the React UI's `display` hint on a stat:

```ts
declare module '@ifloom/engine' {
  interface StatUi {
    /** How the sidebar renders the stat. */
    display?: 'number' | 'bar' | 'pips'
  }
}
```

The React UI declares its hints this way and checks them with [`checkUiHints`](/docs/reference/react/hints#checkuihints).

## InlineUi

The UI pieces a UI renders inside a line of prose, from [`[[ui:name|words|arg|…]]`](/docs/reference/prose#ui-pieces), by name, each with the arguments it takes after its words. Its definition is in [`InlineUi`](/docs/api/engine#inlineui).

It's empty in the engine, and a UI package augments it as it does a hint interface. The engine never reads it. A `ui` [span](/docs/reference/prose#inlinespan) has `name: string` and `args: string[]` whatever was declared, because a mod or a second UI can write a name of its own. The React UI declares two of its pieces this way:

```ts
declare module '@ifloom/engine' {
  interface InlineUi {
    modal: [key: string, title?: string]
    image: [path: string, alt?: string]
  }
}
```

## InlineUiArgs

The arguments a UI piece takes after its words, from what `InlineUi` declares for its name, or any text for a name nobody declared. Its definition is in [`InlineUiArgs`](/docs/api/engine#inlineuiargs).

A component that renders a piece types its `args` with it. Once the React UI is imported, `InlineUiArgs<'modal'>` is `[key: string, title?: string]`.

## UiInContent

The result of [`uiInContent`](#uiincontent-1): every `ui` field in a game's content as a [`UiField`](#uifield), and every line of words a player reads as a [`TextLine`](#textline). Every field is in [`UiInContent`](/docs/api/engine#uiincontent).

The same hints or line reached twice are listed once.

## UiField

One `ui` field and where content writes it. Every field is in [`UiField`](/docs/api/engine#uifield).

`on` is the [`UiTarget`](#uitarget) the field is written on, `id` is that thing's id where it has one, and `where` names it as a problem would, such as `scene park choice skim`. `ui` holds the hints as written, so a UI checks them before reading them. A location's room gives `on: 'scene'`, an action's `ui` gives `on: 'choice'`, and a kind's gives `on: 'entity'`, since a kind's hints are each of its entities'. A block's or a section's `where` is its scene's.

## TextLine

One line of words a player reads, with where content writes it. Every field is in [`TextLine`](/docs/api/engine#textline).

The lines cover every prose line and every block of words written in place, so a UI finds its [UI pieces](/docs/reference/prose#ui-pieces) in them.

## UiTarget

The kinds of thing a `ui` field is written on: `'scene'`, `'choice'`, `'block'`, `'stat'`, `'entity'` and `'game'`. Its definition is in [`UiTarget`](/docs/api/engine#uitarget).

## Functions

### entityUi

Returns an entity's hints as the view gives them, or `undefined` when none has any. Every parameter is in [`entityUi`](/docs/api/engine-plugin#entityui).

The hints are the kind's, then those of the entity it was made `like`, then its own declaration's, each laid over the one before. A plugin calls it to pass someone's hints on in its own view, as the cast plugin does for a speaker.

```ts given
import { entityUi } from '@ifloom/engine/plugin'

const avaUi = entityUi(state, game, 'character:ava') // { hue: 20 } in the showcase
```

### uiInContent

Returns every `ui` field in a game's content and every line of words a player reads, as a [`UiInContent`](#uiincontent). Every parameter is in [`uiInContent`](/docs/api/engine#uiincontent-1).

It walks the content with the [content checker](/docs/reference/checks)'s own walk, which reaches what each plugin's content holds as well, such as a location's room and body. A UI package's checker calls it to check its own hints without walking the content itself, and the React UI's `checkUiHints` does. This finds every block that has a `reveal` hint:

```ts given
import { uiInContent } from '@ifloom/engine'

const { fields } = uiInContent(game)
const reveals = fields.filter((field) => field.on === 'block' && typeof field.ui === 'object' && field.ui !== null && 'reveal' in field.ui)
```

## Checks

The [content checker](/docs/reference/checks) checks a `ui` field only for being data, wherever content writes one. A choice's problem is reported as `choice <id>:` under its scene, and the game's as `ui`.

| Problem | Cause |
|---|---|
| `ui must be an object of hints` | A `ui` field is a string, a number, an array or `null`. |
| `ui.… is a function; ui hints are data` | A function sits somewhere inside a `ui` field. |
| `ui.… is not plain data; ui hints are objects, arrays, text, numbers and true/false` | A class instance, such as a `Date` or a `Map`, sits inside a `ui` field. |

The checker never reads a hint's name or value. A UI package checks those itself.

## Caveats

- The types don't catch a misspelt hint key, because `Ui` lets any key through. Run the UI's own check, such as `checkUiHints`, in a test.
- The engine never merges a scene's hints with the game's or gives a hint a default. A UI that wants a game-wide default reads `game.ui` and lays the scene's over it itself.
- Nothing checks that a UI piece's arguments match the tuple `InlineUi` declares, so a component copes with one missing.
