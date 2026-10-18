---
title: Transitions
description: How a scene or a room comes on screen and goes off, and prose revealed a step at a time. The engine names them and the UI draws them.
---

A scene can fade in, a room can slide in from the side, and a paragraph can wait a moment before it appears. The engine never animates anything. It names the transition in the [view](/docs/reference/view#transition), as it names the music in `view.audio`, and the UI decides how to draw it. The React UI draws the built-in names with CSS. With another framework, the [Transitions recipe](/docs/recipes/transitions) shows how to apply them.

Where a transition can come from, most specific first:

1. A [`transition` effect](#the-transition-effect) in the command just run, for how the next screen comes in.
2. The scene's own `transition`, or the room's (a [place's](/docs/plugins/places#locationdef) `transition`, through a plugin's [stage](/docs/reference/plugins#stage)).
3. The game's [`transitions.default`](#gametransitions).

With none of these, a screen comes in and goes out with `'none'`, which a UI draws as an instant swap. A game that declares nothing looks as it always did.

## TransitionName

```ts
import { TRANSITIONS, type TransitionName } from '@ifloom/engine'

const TRANSITIONS = ['fade', 'slide-up', 'slide-left', 'zoom', 'none'] as const

type TransitionName = (typeof TRANSITIONS)[number] | (string & {})
```

The built-in names, which every UI is asked to know:

| Name | Coming in | Going out |
|---|---|---|
| `fade` | Fades up from nothing. | Fades away. |
| `slide-up` | Rises into place from a little below. | Rises and fades. |
| `slide-left` | Slides in from the right. | Slides off to the left. |
| `zoom` | Grows slightly into place. | Grows slightly and fades. |
| `none` | Appears at once. | Goes at once. |

The set is open. Any other name a game declares in [`transitions.names`](#gametransitions) is passed through to the UI as it is, and the UI draws it with CSS of the game's own (see [Your own names](/docs/recipes/transitions#your-own-names)). The [content checker](#checks) reports a name that's neither built in nor declared, so a typo such as `'fdae'` is caught when the game loads.

## Transition

```ts
import type { Transition } from '@ifloom/engine'

type Transition = { in?: TransitionName; out?: TransitionName; ms?: number }
```

How something comes on screen (`in`) and goes off it (`out`), over `ms` milliseconds each way. A name on its own means the same both ways, so `transition: 'fade'` is `{ in: 'fade', out: 'fade' }`. `ms` is 300 if nothing says. A part left out comes from the game's default, so a scene can change only how it comes in.

On a [data scene](/docs/reference/scenes#datascene) or a hand-built [`Scene`](/docs/reference/scenes#scene):

```ts
{
  id: 'ava.river',
  title: 'By the river',
  transition: { in: 'fade', out: 'fade', ms: 600 },
  body: [{ text: 'ava.river' }],
  choices: [/* ... */],
}
```

## game.transitions

```ts
transitions?: {
  default?: Transition | TransitionName
  names?: string[]
}
```

On the [`Game`](/docs/reference/game). `default` is the transition of every scene and room that doesn't declare its own, or the parts it leaves out. `names` adds names beyond `TRANSITIONS` for the UI to draw with its own CSS. A name is lower-case letters, digits and `-`.

```ts
loadGame([town], {
  id: 'small-town',
  title: 'Small Town',
  transitions: { default: { in: 'fade', ms: 250 }, names: ['curtain'] },
})
```

It's a key of the game only, so a pack or a mod can't change it.

## The transition effect

```ts
{ kind: 'transition'; to: TransitionName; ms?: number }
```

The screen this command leaves on comes in with `to`, over `ms` (else the screen's own `ms`). Put it in a choice's effects to say how the next scene arrives, whatever that scene declares:

```ts
{ id: 'unpack', effects: [{ kind: 'scene', scene: null }, { kind: 'transition', to: 'slide-up', ms: 400 }] }
```

It sets [`state.transition`](/docs/reference/state#transition), and lasts one command. The next command that doesn't set it again clears it. It changes only how the next screen comes in. How the screen before goes out is that screen's own `out`. It works from anywhere effects run, such as a trigger or an activity. When the command leaves the player on the same screen, the view's [`key`](#transitionview) doesn't change, so a UI plays nothing.

## TransitionView

```ts
import type { TransitionView } from '@ifloom/engine'

type TransitionView = {
  key: string
  in: TransitionName
  out: TransitionName
  ms: number
}
```

What [`view.transition`](/docs/reference/view#transition) holds: the screen on show and how it comes and goes.

- **`key`** names the screen: `scene:<id>` while a scene is open, `minigame:<id>` while a [minigame](/docs/reference/minigames) is played, `room:<stage id>` for the room (a place's id with the places plugin), and `room` when no plugin has a stage. A UI plays a transition when the key changes, and only then. A choice that redraws the same scene keeps the key, so nothing plays.
- **`in`** is how this screen comes on.
- **`out`** is how this screen goes off when the next one replaces it. A UI keeps the screen before for its `out`, then brings the new one in with the new view's `in`.
- **`ms`** is how long each takes.

`screen` works it out once for each state, with the rest of the screen, so a UI reads it from the one view it already has.

## Reveals

A block of prose can wait before it appears, so lines arrive one after another. Give a [`Block`](/docs/reference/scenes#block) a `reveal`, or write `[[reveal]]` markup in the [prose](/docs/reference/prose#reveals):

```ts
body: [
  { text: 'intro' },
  { text: 'intro.tonight', reveal: { delay: 1200 } },
]
```

### Reveal

```ts
import type { Reveal } from '@ifloom/engine'

type Reveal = { delay?: number; as?: TransitionName }
```

`delay` is how long the block waits after the reveal before it, or after the scene comes on, in whole milliseconds (800 if left out). `as` is how it comes in (`'fade'` if left out). A block with a `reveal` is written into the scene's body as `[[reveal:1200|fade]]` markup before its text, so both ways of writing it give the UI the same beat. A block that isn't shown takes its reveal with it.

### The reveal beat

```ts
{ kind: 'reveal'; delay: number; as: TransitionName; at: number }
```

A [`SceneBeat`](/docs/reference/prose#scenebeat) that marks where a reveal starts. It draws nothing. The beats after it, up to the next reveal, are the ones it reveals. `at` is when, counted from the scene coming on: this reveal's `delay` added to every one before it. So `[[reveal:800]]` then `[[reveal:1500]]` give `at` values of 800 and 2300.

The beats after a reveal are in `view.scene.beats` from the start. A UI should put them in the page at once and only hold back how they look, so a screen reader reads them, and let a click or a key show everything. The React UI does both, and shows them all at once when the player asks for reduced motion.

**Gotchas:**
- A reveal's sound beats are cued with the scene, not when the reveal comes. Keep a `[[sound:id]]` before the first reveal.
- In a [backlog](/docs/reference/runner#backlogentry) or a message, the reveal beat is there too. Draw it as nothing, and the text after it at once.

## Checks

The [content checker](/docs/reference/checks) reports:

- `unknown transition "…"` for a name that isn't in `TRANSITIONS` or `transitions.names`, on a scene, a place, the game's default, a `transition` effect, a block's `reveal` or `[[reveal]]` markup
- `a transition's ms must be 0 or more`
- `a reveal's delay must be whole milliseconds, 0 or more`, for a block's `reveal`
- `[[reveal]] has a delay of "…"; it is whole milliseconds`, for markup
- `[[reveal]] goes on a line of its own, with a blank line before and after`, for markup inside a paragraph, which would be shown as written
- `transition name "…" is not lower-case letters, digits and "-"`, for an entry in `transitions.names`

## See it in an example

The showcase's moving-day scene (`intro` in `examples/showcase/src/story/moving-day.ts`) fades in, reveals its second paragraph after a pause, and its Unpack choice brings the flat in with a `transition` effect. `ava.river`, in `story/ava.ts`, fades, and its prose holds `[[reveal:1500|slide-up]]`.
