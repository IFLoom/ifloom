---
title: "Render the scene and its choices"
description: "How-to for rendering the main column in a UI of your own, in plain JS, React and Vue: the open scene's title, beats and choices, a flowing scene, the room's actions, inline choices and tooltips, inputs, and transitions and reveals."
---
Render the main column of the screen, the open scene or the room while none is open, with everything the player reads and presses there. Set up the runner first, as [Start your own UI](/docs/how-to/render/start) shows.

## Render the scene

`view.scene` holds the open scene, or the [room](/docs/reference/glossary#room) while none is open, with its `title`, its body as `beats` and its `choices` (the `scene` field of [`View`](/docs/api/engine#view)). The React UI's [`Scene`](/docs/api/react#scene) renders all of it, at the top of the story in the default layout.

::include[../../../../../snippets/plain/scene.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/scene.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/Scene.vue]{meta='tab="Vue" tab-group="framework"'}

Render `beats` rather than `body`, which holds the same words as markup text. Each beat is a [`SceneBeat`](/docs/api/engine#scenebeat), told apart by its `type`:

- `text` is a paragraph.
- `say` is a spoken line. Its `name` is the name to show, the speaker's or the player's, and a bare quote that answers the line before has none. Its `who` is `'player'` on the player's own lines, for the stylesheet.
- `image` and `video` are a picture and a clip.
- `chose` is a choice the player made earlier in a [flowing scene](#render-a-flowing-scene).
- `sound` renders nothing, because the audio player plays it.

Each choice is a [`RenderedChoice`](/docs/api/engine#renderedchoice) with its `label`, its `price`, its `command`, and `disabled` set to the reason while it can't be pressed. Send `command` as it is, so your UI never builds a command for a choice. The engine refuses the same command for the same reason, so a greyed-out button and a refusal always agree. `view.scene.speaker` holds who the scene is with, with their `name` and `image`, and `view.scene.image` holds the scene's own picture.

## Render a flowing scene

A [flowing scene](/docs/reference/flows) comes as beats and choices like any other scene, so the section above already renders it. `view.scene.beats` holds everything up to where the flow stopped, with a `chose` beat at each past choice, and `view.scene.fresh` is the index of the first beat the last choice brought. The React UI's `Scene` renders a flowing scene like any other, and each fold as a part the player opens and shuts.

::include[../../../../../snippets/plain/flow.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/scene.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/Flow.vue]{meta='tab="Vue" tab-group="framework"'}

A beat's `section` holds the ui hints of the section it sits in, so every beat of a `fold()` carries the fold's words in `section.fold`. The examples gather a fold's beats into a `<details>` under those words. `fresh` is 0 before the visit has taken a step, and the examples mark the beats from `fresh` on so the stylesheet can fade them in. While the flow waits on a minigame or a panel, `view.scene.choices` is empty.

## Render the room's actions

`view.actions` holds the buttons on offer besides the scene's choices, each a [`RenderedChoice`](/docs/api/engine#renderedchoice). The plugins' come first, such as wait, sleep and the ways out, then the game's own [actions](/docs/reference/glossary#action). The React UI's [`RoomActions`](/docs/api/react#roomactions) renders them at the bottom of the story in the default layout, and [`ChoiceList`](/docs/api/react#choicelist) renders any list of buttons the same way.

::include[../../../../../snippets/plain/actions.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/actions.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/Actions.vue]{meta='tab="Vue" tab-group="framework"'}

Show the `price` with the label. Its `text` is ready to read, such as "2 coins · until evening". A button with a `warning` can be pressed, but the command will be refused with that line, so show the warning under it.

## Render inline choices and tooltips

A `text` or `say` beat has `spans` when its line holds bold or italics, an inline action, a tooltip or a UI piece, each an [`InlineSpan`](/docs/api/engine#inlinespan). The React UI's `Scene` renders every span and its own UI pieces `modal` and `image`, and `mountGame`'s `inline` option takes a component for a piece of your own.

::include[../../../../../snippets/plain/prose.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/mount-prose.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/Prose.vue]{meta='tab="Vue" tab-group="framework"'}

Render a beat without `spans` as its `text`. With them, render each span by its `type`:

- `text`, `bold` and `italic` are words, plain or in a `<strong>` or an `<em>`.
- `action` is a button inside the line that sends `choice.command`, greyed out with `choice.disabled`.
- `tip` is words with a note, `tip`, shown on hover.
- `ui` is a [UI piece](/docs/reference/glossary#ui-piece), rendered by its `name`, or as its words when your UI has no piece by that name.

The view leaves inline choices out of `view.scene.choices` and `view.actions`, so they never show twice. An inline action whose choice is hidden comes as plain words, and the sentence still reads. [Put a choice inside a line of text](/docs/how-to/put-a-choice-in-a-line) writes them in content.

## Render inputs

`view.inputs` holds each [input](/docs/reference/inputs) on offer now, in the order the game declares them, as an [`InputView`](/docs/api/engine#inputview). Each has its `label`, its `type` and limits, the `options` of a choice, and its value, read from the [kv](/docs/reference/glossary#kv) key it writes. The React UI's `Scene` renders them between a scene's words and its choices, and [`InputFields`](/docs/api/react#inputfields) renders them under the room in the default layout.

::include[../../../../../snippets/plain/inputs.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/inputs.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/Inputs.vue]{meta='tab="Vue" tab-group="framework"'}

Send what the player enters as `{ type: 'input', id, to }`. The engine refuses a value that breaks the input's rules with the reason, such as "Up to 16 letters.", so show the reason by the field. Give the field the input's `maxLength`, `min` and `max`, so the browser holds to them too. An input stays in the view while its `when` holds, so a name field goes once the player has given a name.

## Play transitions and reveals

The engine carries [ui hints](/docs/reference/ui-hints) to the view unchanged. A scene's are in `view.scene.ui`, and a block's are on the first beat it makes, in `beat.ui`. The React UI's `Scene` plays the `transition` and `reveal` hints itself, and [`useScene`](/docs/api/react#usescene) gives a scene component of your own the same timing.

The Plain JS and Vue tabs read the two hints with these helpers:

::include[../../../../../snippets/hints.ts]

::include[../../../../../snippets/plain/transition.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/transition.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/SceneTransition.vue]{meta='tab="Vue" tab-group="framework"'}

This CSS plays `fade` and `slide-up`, the names the showcase uses. Add rules for the other names your game uses:

```css
@keyframes fade-in { from { opacity: 0; } }
@keyframes fade-out { to { opacity: 0; } }
@keyframes rise-in { from { opacity: 0; transform: translateY(1.25rem); } }

[data-transition-in] { animation: fade-in var(--ms) ease-out backwards; }
[data-transition-in="slide-up"] { animation-name: rise-in; }
[data-transition-in="none"] { animation: none; }
[data-transition-out] { animation: fade-out var(--ms) ease-in forwards; pointer-events: none; }
[data-transition-out="none"] { animation: none; }
[data-reveal] { animation: fade-in 400ms ease-out var(--at) backwards; }
[data-reveal="slide-up"] { animation-name: rise-in; }
[data-revealed] [data-reveal] { animation: none; }

@media (prefers-reduced-motion: reduce) {
  [data-transition-in], [data-transition-out], [data-reveal] { animation: none; }
}
```

Play a transition only when `view.scene.key` changes. A choice that keeps the scene open gives a new view with the same key, and playing the scene's `in` again there looks like a flicker. Keep a revealed line in the page while it waits, rather than hiding it with `display: none`, so a screen reader still reads it. [`startRevealSkip`](/docs/api/browser#startrevealskip) shows every held-back line on a key press, as a click does.

A game with `@ifloom/react` gets the two hints typed from there. A game without it declares them itself:

```ts fragment
declare module '@ifloom/engine' {
  interface SceneUi {
    transition?: { in?: string; out?: string; ms?: number } | string
  }
  interface BlockUi {
    reveal?: { delay?: number; as?: string }
  }
}
```

For more on what these sections render, see:

- [Scenes](/docs/reference/scenes), [Flows](/docs/reference/flows), [Prose](/docs/reference/prose) and [Inputs](/docs/reference/inputs).
- [The view](/docs/reference/view) and [UI hints](/docs/reference/ui-hints).
- [Write a flowing scene](/docs/how-to/write-a-flowing-scene) and [Add a transition or reveal lines](/docs/how-to/add-a-transition).
