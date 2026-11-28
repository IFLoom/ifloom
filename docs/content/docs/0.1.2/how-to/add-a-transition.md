---
title: "Add a transition or reveal lines"
description: "Fade or slide scenes and locations in, and reveal lines one after another, with the React UI's transition and reveal hints."
---
Use this to make a scene fade in, the next location slide in from the side, or a paragraph wait a moment before it appears. Content asks for each with a [ui hint](/docs/0.1.2/reference/glossary#ui-hints), a `ui` field the engine carries to the view unchanged. The names on this page, `transition` and `reveal`, are the [React UI's hints](/docs/0.1.2/reference/react/hints). Tests, `ifloom playtest` and replays ignore them.

## Give a scene a transition

Add `ui.transition` to the scene. A name on its own is used both ways, coming in and going out:

```ts
import type { DataScene } from '@ifloom/engine'

export const river: DataScene = {
  id: 'ava.river',
  title: 'By the river',
  ui: { transition: 'fade' },
  body: [{ text: 'Ava is on the bench with her shoes off, feeding the ducks.' }],
  choices: [{ id: 'stay', label: 'Sit with her', effects: [{ scene: null }] }],
}
```

To say each way separately, give `in` and `out`, and `ms` for how long each takes, 300 if left out:

```ts fragment
ui: { transition: { in: 'slide-up', out: 'fade', ms: 500 } }
```

The built-in names are `fade`, `slide-up`, `slide-left`, `zoom` and `none`, listed in [`TransitionName`](/docs/0.1.2/reference/react/hints#transitionname).

## Give a location or the whole game one

A location takes the same hint, for the room while no scene is open, so walking between locations can slide:

```ts
import { places } from '@ifloom/plugin-places'

export const highStreet = places.location({
  id: 'high-street',
  name: 'High Street',
  exits: ['flat', 'cafe'],
  body: [{ text: 'Bunting, a bus stop and the smell of the bakery.' }],
  ui: { transition: 'slide-left' },
})
```

Set a default in your content's `ui`. A scene or a location that says nothing uses it, and one that sets only `in` takes `out` and `ms` from it:

```ts
import type { Content } from '@ifloom/engine'

export const town: Content = { ui: { transition: { in: 'fade', ms: 250 } } }
```

## Bring the next screen in from a choice

Give a choice a `ui.transition` to say how the screen it leads to comes in, whatever that screen declares. The React UI plays it once, whether the player clicked the choice or pressed its number key:

```ts
import type { Choice } from '@ifloom/engine'

export const unpack: Choice = { id: 'unpack', label: 'Unpack', ui: { transition: { in: 'slide-up', ms: 400 } }, effects: [{ scene: null }] }
```

## Reveal lines one after another

Give a body block `ui.reveal`, and it waits before it appears. `delay` is the wait in milliseconds after the reveal before it, or after the scene comes on, 800 if left out. `as` is how it comes in, `fade` if left out:

```ts
import { text, type Block } from '@ifloom/engine'

export const intro: Block[] = [
  text('The van pulls away and leaves you on the pavement with three boxes, a key and a cat in a basket.'),
  text('Tomorrow you start learning the town. Tonight you unpack.', { ui: { reveal: { delay: 1200 } } }),
  text('The cat has opinions about the basket.', { ui: { reveal: { delay: 1500, as: 'slide-up' } } }),
]
```

Put a paragraph that should wait in a block of its own. Every line is in the page from the start for screen readers, and only its look waits. The choices come after the last reveal, and a click on the scene or any key shows the rest at once.

## Restyle them

Write CSS against the attributes the React UI sets. The new scene carries `data-transition-in`, the copy of the scene going out carries `data-leaving` and `data-transition-out`, and each held-back group of lines carries `data-reveal`. The times are the CSS variables `--ifloom-transition-ms`, `--ifloom-reveal-at` and `--ifloom-reveal-ms`. A slower, softer fade for every reveal:

```css
:root {
  --ifloom-reveal-ms: 900ms;
}

[data-reveal="fade"] {
  animation-timing-function: ease-in-out;
}
```

Your rules win over the base styles, which sit in a cascade layer. [Parts](/docs/0.1.2/reference/react/parts) lists every part and attribute.

## Add a transition of your own

List the name in your content's `ui.transitionNames`, use it like a built-in one, and play it with CSS:

```ts
import type { Content } from '@ifloom/engine'

export const curtains: Content = { ui: { transitionNames: ['curtain'] } }
```

```css
@keyframes curtain-in { from { clip-path: inset(0 50% 0 50%); } }
@keyframes curtain-out { to { clip-path: inset(0 50% 0 50%); } }
[data-transition-in="curtain"] { animation-name: curtain-in; }
[data-leaving][data-transition-out="curtain"] { animation-name: curtain-out; }
[data-reveal="curtain"] { animation-name: curtain-in; }
```

## Check it worked

Run [`checkUiHints`](/docs/0.1.2/reference/react/hints#checkuihints) over the game, as a test does. It reports a transition name that is neither built in nor in `transitionNames`, which catches typos. Then play the scene with `npm run dev`. A player whose system asks for reduced motion sees every scene and line at once, and so does everyone when you pass `motion: false` to `mountGame`.

To play the same hints in a UI of your own, see [Play transitions and reveals](/docs/0.1.2/how-to/render/scene#play-transitions-and-reveals). To keep the React UI's timing in a scene component of your own, build it on [`useScene`](/docs/0.1.2/reference/react/components#usescene).

In the showcase, Small Town, the moving-day scene fades in and reveals its second paragraph, and its Unpack choice brings the flat in with `slide-up` (`examples/showcase/src/story/moving-day.ts`). For more, see:

- [The React UI's hints](/docs/0.1.2/reference/react/hints), with `transition`, `transitionNames` and `reveal`.
- [UI hints](/docs/0.1.2/reference/ui-hints), for how the engine carries them.
- [Presentation lives in UI packages](/docs/0.1.2/explanation/design#presentation-lives-in-ui-packages).
