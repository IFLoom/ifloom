---
title: "Presentation hints"
description: "The ui hints the React UI reads from your content: scene and choice transitions, revealed paragraphs, stat bars and pips, and the colour of a person's lines. With checkUiHints to catch typos."
---
This page is about `@ifloom/react`, the optional React UI. The engine doesn't need it. To draw a game with plain DOM, Vue, Svelte or React by hand, see [Your own UI in any framework](/docs/guide/frameworks).

How a game looks and moves is the UI's business, not the engine's. Content says what it would like in a `ui` field on a scene, a choice, a block, a stat, a kind, an entity, a place or the game, and the engine carries that to the view as written. [Presentation hints](/docs/reference/ui-hints) in the reference explains the mechanism. This page lists the hints the React UI reads.

| Hint | Written on | What the React UI does |
|---|---|---|
| [`transition`](#transition) | A scene, a place, the game | How the screen comes on and goes off. |
| [`transition`](#transition-on-a-choice) | A choice, an action | How the screen it leads to comes in. |
| [`reveal`](#reveal) | A block | The block waits, then comes in. |
| [`display`](#display) | A stat | A number, a bar or pips in the sidebar. |
| [`hue`](#hue) | An entity or a kind | The colour of their spoken lines. |
| [`transitionNames`](#your-own-transition-names) | The game | Transition names of the game's own. |

Importing `@ifloom/react` anywhere in your game types them: `ui: { display: 'bar' }` on a stat is checked, and `display: 'dial'` is a type error. A hint the React UI doesn't know still compiles, so another UI or a mod can add its own. [`checkUiHints`](#checkuihints) catches a typo the types let through.

The [Transitions recipe](/docs/recipes/transitions) walks through transitions and reveals, and how to draw the same hints with another framework.

## transition

```ts
{
  id: 'ava.river',
  title: 'By the river',
  ui: { transition: { in: 'fade', out: 'fade', ms: 600 } },
  body: [{ text: 'ava.river' }],
  choices: [/* ... */],
}
```

How a screen comes on (`in`) and goes off (`out`), over `ms` milliseconds each. A name on its own means the same both ways, so `ui: { transition: 'fade' }` is `{ in: 'fade', out: 'fade' }`. On a [scene](/docs/reference/scenes#datascene) it's that scene's. On a [place](/docs/plugins/places#locationdef) it's the room's while no scene is open, so walking between places can slide. On the game's `ui` it's the default for every screen that says nothing, part by part: a scene that sets only `in` takes `out` and `ms` from the game.

```ts
loadGame([town], { id: 'small-town', title: 'Small Town', ui: { transition: { in: 'fade', ms: 250 } } })
```

With no hint anywhere, a screen comes in and goes out with `'none'`, which is an instant swap. `ms` is 300 when nothing says.

`SceneStage` plays a transition only when [`view.scene.key`](/docs/reference/view#the-scene) changes: a new scene, a minigame, or another room. A choice that keeps the same scene open plays nothing. The scene before is kept on the page, inert and hidden from screen readers, for its `out`, then the new one comes in by its `in`.

### TransitionName

```ts
import { TRANSITIONS, type TransitionName, type Transition } from '@ifloom/react'

const TRANSITIONS = ['fade', 'slide-up', 'slide-left', 'zoom', 'none'] as const
type TransitionName = (typeof TRANSITIONS)[number] | (string & {})
type Transition = { in?: TransitionName; out?: TransitionName; ms?: number }
```

| Name | Coming in | Going out |
|---|---|---|
| `fade` | Fades up from nothing. | Fades away. |
| `slide-up` | Rises into place from a little below. | Rises and fades. |
| `slide-left` | Slides in from the right. | Slides off to the left. |
| `zoom` | Grows slightly into place. | Grows slightly and fades. |
| `none` | Appears at once. | Goes at once. |

`DEFAULT_TRANSITION_MS` is the 300 milliseconds a transition takes when nothing says.

### Your own transition names

List names of your own in the game's `ui.transitionNames` and draw them with CSS keyed on `data-transition-in`, `data-transition-out` and `data-reveal`. The recipe has [an example](/docs/recipes/transitions#your-own-names). A name is lower-case letters, digits and `-`.

```ts
loadGame([town], { id: 'small-town', title: 'Small Town', ui: { transitionNames: ['curtain'] } })
```

### transition on a choice

```ts
{ id: 'unpack', ui: { transition: { in: 'slide-up', ms: 400 } }, effects: [{ kind: 'scene', scene: null }] }
```

How the screen this choice leads to comes in, whatever that screen says. A bare name is only the `in`. An `out` changes how the screen the choice leaves goes off. It works the same on an [action](/docs/reference/actions), a room's button.

The React UI works out which choice was pressed from the command it sent, so a click, a number key, an inline action and a hotspot all count. It plays the hint once, for the screen the choice leads to. When the choice keeps the same screen, nothing plays.

### screenTransition

```ts
import { screenTransition, type ScreenTransition } from '@ifloom/react'

function screenTransition(view: View, game: Game, pressed?: Transition | TransitionName): ScreenTransition

type ScreenTransition = { key: string; in: TransitionName; out: TransitionName; ms: number }
```

The screen in `view` and how it comes and goes, as `SceneStage` plays it: the scene's or room's `ui.transition` over the game's, with `pressed` (the transition of the choice that led here) deciding how it comes in. For a component of your own that animates as the scene does:

```tsx
import { screenTransition, useGame, useMotion } from '@ifloom/react'

function Heading() {
  const { view, runner } = useGame()
  const motion = useMotion()
  const transition = screenTransition(view, runner.game)
  return (
    <h2 key={transition.key} data-transition-in={motion ? transition.in : undefined}>
      {view.scene.title}
    </h2>
  )
}
```

## reveal

```ts
body: [
  { text: 'intro' },
  { text: 'intro.tonight', ui: { reveal: { delay: 1200 } } },
  { text: 'intro.cat', ui: { reveal: { delay: 1500, as: 'slide-up' } } },
]
```

On a [block](/docs/reference/scenes#block): it waits `delay` milliseconds after the reveal before it, or after the scene comes on, then comes in with `as`. `delay` is 800 (`DEFAULT_REVEAL_DELAY`) and `as` is `'fade'` if left out. A paragraph that should wait goes in a block of its own, under its own prose key. The block's hint arrives on the first beat it makes, and everything from there waits, up to the next block with a reveal.

```ts
import { type Reveal } from '@ifloom/react'

type Reveal = { delay?: number; as?: TransitionName }
```

`SceneStage` draws each revealed run of beats in a `reveal` part with `data-reveal` and `--ifloom-reveal-at`, and holds the choices back until the last. Every word is in the page from the start, so a screen reader reads it. A click on the scene or any key shows the rest at once, and a player who asks for reduced motion gets it all at once.

### revealGroups and lastReveal

```ts
import { revealGroups, lastReveal, type RevealGroup, type RevealPoint } from '@ifloom/react'

function revealGroups(beats: readonly SceneBeat[]): RevealGroup[]
function lastReveal(beats: readonly SceneBeat[]): number

type RevealPoint = { delay: number; as: TransitionName; at: number }
type RevealGroup = { reveal: RevealPoint | null; beats: { beat: SceneBeat; index: number }[] }
```

`revealGroups` cuts a scene's beats into the run shown with the scene (its `reveal` is `null`) and a run for each beat with `ui.reveal`. `at` is when that reveal comes, counted from the scene coming on: its own delay added to every one before it, so delays of 800 and 1500 come at 800 and 2300. `lastReveal` is the last `at`, or 0 with none. Use them in a [`Beat`](/docs/react/components#beat) or a `SceneStage` of your own.

## display

```ts
stats: [
  { id: 'energy', label: 'Energy', start: 80, max: 100, ui: { display: 'bar' } },
  { id: 'charm', label: 'Charm', start: 1, max: 20, ui: { display: 'pips' } },
]
```

On a [stat](/docs/reference/stats#statdef), `StatDisplay`: how the [`StatList`](/docs/react/components#statlist) and [`Relationships`](/docs/react/components#relationships) draw it. `'number'` (the default) is the value as the game formats it. `'bar'` adds a bar under it from its `min` to its `max`. `'pips'` adds a row of pips, one per point, which suits a range of `MAX_PIPS` (20) or less. A wider range is drawn as a bar, and `checkUiHints` reports it.

```ts
import { type StatDisplay, MAX_PIPS } from '@ifloom/react'

type StatDisplay = 'number' | 'bar' | 'pips'
```

## hue

```ts
import { person } from '@ifloom/plugin-cast'

person({ id: 'ava', name: 'Ava', ui: { hue: 20 }, home: 'park', talk: 'ava.hi' })
```

On an [entity](/docs/reference/entities#entitydef), or on a [kind](/docs/reference/entities#kinddef) for all of its entities: a colour as a hue from 0 to 360. While a scene's [speaker](/docs/reference/view#speakerview) has one, `SceneStage` colours their spoken lines with it, lighter in dark mode. It sets `data-speaker-hue` and `--ifloom-speaker-hue` on the scene for your own CSS too:

```css
[data-speaker-hue] [data-part="scene-title"] {
  color: oklch(0.5 0.12 var(--ifloom-speaker-hue));
}
```

## checkUiHints

```ts
import { checkUiHints } from '@ifloom/react'

function checkUiHints(game: Game, options?: { allow?: readonly string[] }): string[]
```

What's wrong with a game's hints for the React UI, as `where: what` lines, or nothing when all is well. The engine's [content checker](/docs/reference/checks) only makes sure a hint is data, so this is where these are caught:

- a hint the React UI doesn't read, such as `ui.transiton` (pass another UI's hints in `allow`)
- a transition name that is neither built in nor in the game's `ui.transitionNames`, or a negative `ms`
- a reveal `delay` that isn't whole milliseconds
- a `display` that isn't `'number'`, `'bar'` or `'pips'`, or pips on a range over 20
- a `hue` outside 0 to 360

It reads the game's scenes, choices and blocks, its actions, stats, kinds and entities, and the places plugin's locations. Put it in a test beside the engine's checks:

```ts
import { describe, expect, it } from 'vitest'
import { checkUiHints } from '@ifloom/react'
import { game } from '../src/game.ts'

describe('the content', () => {
  it("has hints the React UI can draw", () => {
    expect(checkUiHints(game)).toEqual([])
  })
})
```

## See it in the showcase

Small Town's moving-day scene fades in and reveals its second paragraph, and its Unpack choice slides the flat up (`examples/showcase/src/story/moving-day.ts`). Ava's scene by the river fades, and her line comes a moment later (`story/ava.ts`). Energy is a bar and charm is pips (`world/stats.ts`), and Ava's and Sam's lines have their own colours (`world/cast.ts`). Its tests run `checkUiHints`.
