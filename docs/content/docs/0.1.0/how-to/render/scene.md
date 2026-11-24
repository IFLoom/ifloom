---
title: "Render the scene and its choices"
description: "Render the open scene or the room, with its beats, choices, inputs and inline links, in a UI of your own."
---
Render the main column of the screen, the open scene or the room while none is open, with everything the player reads and presses there. Set up the runner first, as [Start your own UI](/docs/0.1.0/how-to/render/start) shows.

## Render the scene

`view.scene` holds the open scene, or the [room](/docs/0.1.0/reference/glossary#room) while none is open, with its `title`, its body as `beats` and its `choices` (the `scene` field of [`View`](/docs/0.1.0/api/engine#view)). The React UI's [`Scene`](/docs/0.1.0/api/react#scene) renders all of it, at the top of the story in the default layout.

```ts tab="Plain JS" tab-group="framework"
import type { SceneBeat, RunnerSnapshot } from '@ifloom/engine'
// runner, add and drawChoices, as in the vanilla template's src/main.ts.
import { add, drawChoices } from './runner.ts'

/** The story: the scene's title, its beats and its choices. With no scene open it's the room, whose buttons are view.actions. */
export function drawScene(parent: HTMLElement, { view }: RunnerSnapshot): void {
  if (view.scene.title) add(parent, 'h2', view.scene.title)
  const prose = add(parent, 'div', '', 'prose')
  for (const beat of view.scene.beats) drawBeat(prose, beat)
  drawChoices(add(parent, 'div', '', 'choices'), view.scene.choices)
}

/** One paragraph of a scene. A sound beat is heard, not rendered. */
function drawBeat(parent: HTMLElement, beat: SceneBeat): void {
  switch (beat.type) {
    case 'text':
      add(parent, 'p', beat.text)
      break
    case 'say': {
      // Who says it over the words. A quote that answers the line before names no one.
      const line = add(parent, 'p', '', 'beat-say')
      line.dataset.who = beat.who
      if (beat.name) add(line, 'span', beat.name, 'speaker-name')
      add(line, 'span', beat.text)
      break
    }
    case 'chose':
      // A pick made earlier in a flowing scene, where the decision was.
      add(parent, 'p', beat.label, 'beat-chose')
      break
    case 'image':
      Object.assign(add(parent, 'img', '', 'beat-image'), { src: beat.src, alt: beat.alt ?? '' })
      break
    case 'video':
      Object.assign(add(parent, 'video', '', 'beat-image'), {
        src: beat.src,
        autoplay: beat.autoplay,
        loop: beat.loop,
        muted: beat.muted,
        controls: beat.controls,
      })
      break
  }
}
```

```tsx tab="React" tab-group="framework"
import { Game, Scene, Story } from '@ifloom/react'

// A layout of your own, for mountGame's `layout`. The default layout has Scene in its Story already.
export function Reading() {
  return (
    <Game>
      <Story>
        {/* The open scene, or the room: its title, picture, beats and choices. */}
        <Scene />
      </Story>
    </Game>
  )
}
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import { runner, view } from './runner.ts'

// The story: the scene's title, its beats and its choices. With no scene open it's the room, whose buttons are view.actions.
// The vue template's Beat.vue renders each beat with its spans; here they're written out.
</script>

<template>
  <h2 v-if="view.scene.title">{{ view.scene.title }}</h2>
  <div class="prose">
    <template v-for="(beat, at) in view.scene.beats" :key="at">
      <p v-if="beat.type === 'text'">{{ beat.text }}</p>
      <!-- Who says it over the words. A quote that answers the line before names no one. -->
      <p v-else-if="beat.type === 'say'" class="beat-say" :data-who="beat.who">
        <span v-if="beat.name" class="speaker-name">{{ beat.name }}</span>
        {{ beat.text }}
      </p>
      <!-- A pick made earlier in a flowing scene, where the decision was. -->
      <p v-else-if="beat.type === 'chose'" class="beat-chose">{{ beat.label }}</p>
      <img v-else-if="beat.type === 'image'" class="beat-image" :src="beat.src" :alt="beat.alt ?? ''" />
      <video
        v-else-if="beat.type === 'video'"
        class="beat-image"
        :src="beat.src"
        :autoplay="beat.autoplay"
        :loop="beat.loop"
        :muted="beat.muted"
        :controls="beat.controls"
      />
    </template>
  </div>
  <div class="choices">
    <template v-for="choice in view.scene.choices" :key="choice.id">
      <button :disabled="Boolean(choice.disabled)" :title="choice.disabled" @click="runner.apply(choice.command)">{{ choice.label }}</button>
      <!-- Why it can't be pressed, such as "You need 4 coins." -->
      <p v-if="choice.disabled" class="reason">{{ choice.disabled }}</p>
    </template>
  </div>
</template>
```

Render `beats` rather than `body`, which holds the same words as markup text. Each beat is a [`SceneBeat`](/docs/0.1.0/api/engine#scenebeat), told apart by its `type`:

- `text` is a paragraph.
- `say` is a spoken line. Its `name` is the name to show, the speaker's or the player's, and a bare quote that answers the line before has none. Its `who` is `'player'` on the player's own lines, for the stylesheet.
- `image` and `video` are a picture and a clip.
- `chose` is a choice the player made earlier in a [flowing scene](#render-a-flowing-scene).
- `sound` renders nothing, because the audio player plays it.

Each choice is a [`RenderedChoice`](/docs/0.1.0/api/engine#renderedchoice) with its `label`, its `price`, its `command`, and `disabled` set to the reason while it can't be pressed. Send `command` as it is, so your UI never builds a command for a choice. The engine refuses the same command for the same reason, so a greyed-out button and a refusal always agree. `view.scene.speaker` holds who the scene is with, with their `name` and `image`, and `view.scene.image` holds the scene's own picture.

## Render a flowing scene

A [flowing scene](/docs/0.1.0/reference/flows) comes as beats and choices like any other scene, so the section above already renders it. `view.scene.beats` holds everything up to where the flow stopped, with a `chose` beat at each past choice, and `view.scene.fresh` is the index of the first beat the last choice brought. The React UI's `Scene` renders a flowing scene like any other, and each fold as a part the player opens and shuts.

```ts tab="Plain JS" tab-group="framework"
import type { RunnerSnapshot } from '@ifloom/engine'
// add and drawChoices, as in the vanilla template's src/main.ts.
import { add, drawChoices } from './runner.ts'

/** A flowing scene: everything up to where it stopped, the choices made on the way, a fold's beats together, and the decision it's waiting on. */
export function drawFlow(parent: HTMLElement, { view }: RunnerSnapshot): void {
  const prose = add(parent, 'div', '', 'prose')
  // The fold the beats are going into: a <details> the player opens and shuts, under the fold's words.
  let fold: { label: string; body: HTMLElement } | null = null
  view.scene.beats.forEach((beat, at) => {
    const label = beat.section?.fold
    if (typeof label !== 'string') fold = null
    else if (fold?.label !== label) {
      const details = add(prose, 'details')
      add(details, 'summary', label)
      fold = { label, body: details }
    }
    const into = fold?.body ?? prose
    const shown =
      beat.type === 'chose' ? add(into, 'p', beat.label, 'beat-chose') : beat.type === 'text' || beat.type === 'say' ? add(into, 'p', beat.text) : null
    // What the last choice brought, from `fresh` on, to fade in; what came before stays still.
    if (shown && at >= view.scene.fresh && view.scene.fresh > 0) shown.classList.add('fresh')
  })
  drawChoices(add(parent, 'div', '', 'choices'), view.scene.choices)
}
```

```tsx tab="React" tab-group="framework"
import { Game, Scene, Story } from '@ifloom/react'

// A layout of your own, for mountGame's `layout`. The default layout has Scene in its Story already.
export function Reading() {
  return (
    <Game>
      <Story>
        {/* The open scene, or the room: its title, picture, beats and choices. */}
        <Scene />
      </Story>
    </Game>
  )
}
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import { computed } from 'vue'
import type { SceneBeat } from '@ifloom/engine'
import { runner, view } from './runner.ts'

// A flowing scene: everything up to where it stopped, the choices made on the way, a fold's beats together, and the decision it's waiting on.
// What the last choice brought, from `fresh` on, gets a class to fade it in; what came before stays still.
const fresh = (at: number) => view.value.scene.fresh > 0 && at >= view.value.scene.fresh

// The beats in runs: one on its own, or a fold's together, in a <details> the player opens and shuts.
const runs = computed(() => {
  const out: { fold?: string; beats: { beat: SceneBeat; at: number }[] }[] = []
  view.value.scene.beats.forEach((beat, at) => {
    const fold = typeof beat.section?.fold === 'string' ? beat.section.fold : undefined
    const last = out.at(-1)
    if (fold !== undefined && last?.fold === fold) last.beats.push({ beat, at })
    else out.push({ fold, beats: [{ beat, at }] })
  })
  return out
})
</script>

<template>
  <div class="prose">
    <component :is="run.fold === undefined ? 'div' : 'details'" v-for="(run, index) in runs" :key="index">
      <summary v-if="run.fold !== undefined">{{ run.fold }}</summary>
      <template v-for="{ beat, at } in run.beats" :key="at">
        <p v-if="beat.type === 'chose'" class="beat-chose" :class="{ fresh: fresh(at) }">{{ beat.label }}</p>
        <p v-else-if="beat.type === 'text' || beat.type === 'say'" :class="{ fresh: fresh(at) }">{{ beat.text }}</p>
      </template>
    </component>
  </div>
  <div class="choices">
    <button
      v-for="choice in view.scene.choices"
      :key="choice.id"
      :disabled="Boolean(choice.disabled)"
      :title="choice.disabled"
      @click="runner.apply(choice.command)"
    >
      {{ choice.label }}
    </button>
  </div>
</template>
```

A beat's `section` holds the ui hints of the section it sits in, so every beat of a `fold()` carries the fold's words in `section.fold`. The examples gather a fold's beats into a `<details>` under those words. `fresh` is 0 before the visit has taken a step, and the examples mark the beats from `fresh` on so the stylesheet can fade them in. While the flow waits on a minigame or a panel, `view.scene.choices` is empty.

## Render the room's actions

`view.actions` holds the buttons on offer besides the scene's choices, each a [`RenderedChoice`](/docs/0.1.0/api/engine#renderedchoice). The plugins' come first, such as wait, sleep and the ways out, then the game's own [actions](/docs/0.1.0/reference/glossary#action). The React UI's [`RoomActions`](/docs/0.1.0/api/react#roomactions) renders them at the bottom of the story in the default layout, and [`ChoiceList`](/docs/0.1.0/api/react#choicelist) renders any list of buttons the same way.

```ts tab="Plain JS" tab-group="framework"
import type { RunnerSnapshot } from '@ifloom/engine'
// runner and add, as in the vanilla template's src/main.ts.
import { add, runner } from './runner.ts'

/** The room's buttons, while no scene is open: each with its price, greyed out with why it can't be pressed, or warned. */
export function drawActions(parent: HTMLElement, { view }: RunnerSnapshot): void {
  for (const action of view.actions) {
    // The price in a line, such as "2 coins · until evening".
    const button = add(parent, 'button', action.price ? `${action.label} (${action.price.text})` : action.label)
    button.disabled = Boolean(action.disabled)
    button.onclick = () => runner.apply(action.command)
    // Why it can't be pressed, such as "You need 3 coins.", or a warning that it will be refused.
    const note = action.disabled ?? action.warning
    if (note) add(parent, 'p', note, 'reason')
  }
}
```

```tsx tab="React" tab-group="framework"
import { ChoiceList, Game, RoomActions, Scene, Story, useGame } from '@ifloom/react'

// A layout of your own, for mountGame's `layout`. The default layout has RoomActions at the bottom of its Story.
export function Layout() {
  return (
    <Game>
      <Story>
        <Scene />
        {/* The room's buttons, with their prices and reasons, while no scene is open. */}
        <RoomActions />
      </Story>
    </Game>
  )
}

// Or only some of them: ChoiceList renders any list of buttons the same way.
export function FreeThings() {
  const { view } = useGame()
  return <ChoiceList choices={view.actions.filter((action) => !action.price?.stats?.length)} part="actions" />
}
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import { runner, view } from './runner.ts'

// The room's buttons, while no scene is open: each with its price in a line, such as "2 coins · until evening",
// greyed out with why it can't be pressed, or warned.
</script>

<template>
  <div class="bottom choices">
    <template v-for="action in view.actions" :key="action.id">
      <button :disabled="Boolean(action.disabled)" @click="runner.apply(action.command)">
        {{ action.label }}<template v-if="action.price"> ({{ action.price.text }})</template>
      </button>
      <!-- Why it can't be pressed, such as "You need 3 coins.", or a warning that it will be refused. -->
      <p v-if="action.disabled ?? action.warning" class="reason">{{ action.disabled ?? action.warning }}</p>
    </template>
  </div>
</template>
```

Show the `price` with the label. Its `text` is ready to read, such as "2 coins · until evening". A button with a `warning` can be pressed, but the command will be refused with that line, so show the warning under it.

## Render inline choices and tooltips

A `text` or `say` beat has `spans` when its line holds bold or italics, an inline action, a tooltip or a UI piece, each an [`InlineSpan`](/docs/0.1.0/api/engine#inlinespan). The React UI's `Scene` renders every span and its own UI pieces `modal` and `image`, and `mountGame`'s `inline` option takes a component for a piece of your own.

```ts tab="Plain JS" tab-group="framework"
import type { InlineSpan, RunnerSnapshot } from '@ifloom/engine'
// runner and add, as in the vanilla template's src/main.ts.
import { add, runner } from './runner.ts'

/** The scene's lines with their spans: bold and italics, inline actions, tooltips and UI pieces. */
export function drawProse(parent: HTMLElement, { view }: RunnerSnapshot): void {
  for (const beat of view.scene.beats) {
    if (beat.type === 'text' || beat.type === 'say') drawLine(add(parent, 'p'), beat.text, beat.spans)
  }
}

/** A line's words. Without spans it's plain text; with them, each span is rendered by its type. */
function drawLine(line: HTMLElement, text: string, spans: InlineSpan[] | undefined): void {
  if (!spans) {
    line.textContent = text
    return
  }
  for (const span of spans) {
    switch (span.type) {
      case 'text':
        line.append(span.text)
        break
      case 'bold':
      case 'italic':
        add(line, span.type === 'bold' ? 'strong' : 'em', span.text)
        break
      case 'action': {
        // An inline action: a button in the line that presses the choice, greyed out with its reason.
        const button = add(line, 'button', span.text, 'inline-action')
        button.disabled = Boolean(span.choice.disabled)
        if (span.choice.disabled) button.title = span.choice.disabled
        button.onclick = () => runner.apply(span.choice.command)
        break
      }
      case 'tip':
        // A tooltip: the words, with the note on hover.
        add(line, 'abbr', span.text, 'tip').title = span.tip
        break
      case 'ui':
        // A UI piece, [[ui:name|words|arg]]: render it by name, or show its words.
        add(line, 'span', span.text, 'ui').dataset.ui = span.name
        break
    }
  }
}
```

```tsx tab="React" tab-group="framework"
import { mountGame, type InlineProps } from '@ifloom/react'
import module from './game.ts'

// The React UI renders bold, italics, inline actions and tooltips itself, and the UI pieces modal and image.
// A piece of your own, [[ui:stamp|Paid|red]], is a component by its name in `inline`.
function Stamp({ text, args }: InlineProps) {
  return <span style={{ color: args[0] ?? 'inherit', border: '2px solid', padding: '0 4px' }}>{text}</span>
}

mountGame(module.build(), { inline: { stamp: Stamp } })
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import { runner, view } from './runner.ts'

// The scene's lines with their spans: bold and italics, inline actions, tooltips and UI pieces.
// The vue template's Line.vue does the same, with notes that open on a tap.
</script>

<template>
  <template v-for="(beat, at) in view.scene.beats" :key="at">
    <p v-if="beat.type === 'text' || beat.type === 'say'">
      <template v-if="!beat.spans">{{ beat.text }}</template>
      <template v-for="(span, index) in beat.spans" v-else :key="index">
        <template v-if="span.type === 'text'">{{ span.text }}</template>
        <strong v-else-if="span.type === 'bold'">{{ span.text }}</strong>
        <em v-else-if="span.type === 'italic'">{{ span.text }}</em>
        <!-- An inline action: a button in the line that presses the choice, greyed out with its reason. -->
        <button
          v-else-if="span.type === 'action'"
          class="inline-action"
          :disabled="Boolean(span.choice.disabled)"
          :title="span.choice.disabled"
          @click="runner.apply(span.choice.command)"
        >
          {{ span.text }}
        </button>
        <!-- A tooltip: the words, with the note on hover. -->
        <abbr v-else-if="span.type === 'tip'" class="tip" :title="span.tip">{{ span.text }}</abbr>
        <!-- A UI piece, [[ui:name|words|arg]]: render it by name, or show its words. -->
        <span v-else class="ui" :data-ui="span.name">{{ span.text }}</span>
      </template>
    </p>
  </template>
</template>
```

Render a beat without `spans` as its `text`. With them, render each span by its `type`:

- `text`, `bold` and `italic` are words, plain or in a `<strong>` or an `<em>`.
- `action` is a button inside the line that sends `choice.command`, greyed out with `choice.disabled`.
- `tip` is words with a note, `tip`, shown on hover.
- `ui` is a [UI piece](/docs/0.1.0/reference/glossary#ui-piece), rendered by its `name`, or as its words when your UI has no piece by that name.

The view leaves inline choices out of `view.scene.choices` and `view.actions`, so they never show twice. An inline action whose choice is hidden comes as plain words, and the sentence still reads. [Put a choice inside a line of text](/docs/0.1.0/how-to/put-a-choice-in-a-line) writes them in content.

## Render inputs

`view.inputs` holds each [input](/docs/0.1.0/reference/inputs) on offer now, in the order the game declares them, as an [`InputView`](/docs/0.1.0/api/engine#inputview). Each has its `label`, its `type` and limits, the `options` of a choice, and its value, read from the [kv](/docs/0.1.0/reference/glossary#kv) key it writes. The React UI's `Scene` renders them between a scene's words and its choices, and [`InputFields`](/docs/0.1.0/api/react#inputfields) renders them under the room in the default layout.

```ts tab="Plain JS" tab-group="framework"
import type { InputView, RunnerSnapshot } from '@ifloom/engine'
// runner and add, as in the vanilla template's src/main.ts.
import { add, runner } from './runner.ts'

/** The inputs on offer now, such as the cat's name. What the player enters goes back as an `input` command. */
export function drawInputs(parent: HTMLElement, { view }: RunnerSnapshot): void {
  for (const input of view.inputs) drawInput(add(parent, 'div', '', 'input'), input)
}

function drawInput(parent: HTMLElement, input: InputView): void {
  if (input.type === 'choice') {
    for (const option of input.options) {
      add(parent, 'button', option.label).onclick = () => runner.apply({ type: 'input', id: input.id, to: option.value })
    }
    return
  }
  const form = add(parent, 'form')
  const field = add(add(form, 'label', input.label), 'input')
  field.type = input.type === 'number' ? 'number' : 'text'
  field.value = input.value === null ? '' : String(input.value)
  if (input.maxLength !== null) field.maxLength = input.maxLength
  if (input.min !== null) field.min = String(input.min)
  if (input.max !== null) field.max = String(input.max)
  add(form, 'button', 'OK').type = 'submit'
  form.onsubmit = (event) => {
    event.preventDefault()
    // A value that breaks the input's rules is refused with why, such as "Up to 16 letters."
    const sent = runner.apply({ type: 'input', id: input.id, to: input.type === 'number' ? Number(field.value) : field.value })
    if (!sent.ok) add(form, 'p', sent.reason, 'reason')
  }
}
```

```tsx tab="React" tab-group="framework"
import { Game, InputFields, Scene, Story } from '@ifloom/react'

// A layout of your own, for mountGame's `layout`. The default layout has InputFields under the Scene.
export function Layout() {
  return (
    <Game>
      <Story>
        <Scene />
        {/* A field for each input on offer, with the reason under it when a value is refused. */}
        <InputFields />
      </Story>
    </Game>
  )
}
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import { ref } from 'vue'
import type { InputView } from '@ifloom/engine'
import { runner, view } from './runner.ts'

// The inputs on offer now, such as the cat's name. What the player enters goes back as an `input` command.
// The vue template's InputField.vue renders one; here they're all in one component.
const typed = ref<Record<string, string>>({})
const refused = ref<Record<string, string>>({})

function submit(input: InputView) {
  const entered = typed.value[input.id] ?? (input.value === null ? '' : String(input.value))
  // A value that breaks the input's rules is refused with why, such as "Up to 16 letters."
  const sent = runner.apply({ type: 'input', id: input.id, to: input.type === 'number' ? Number(entered) : entered })
  refused.value = { ...refused.value, [input.id]: sent.ok ? '' : sent.reason }
}
</script>

<template>
  <div v-for="input in view.inputs" :key="input.id" class="input">
    <template v-if="input.type === 'choice'">
      <button v-for="option in input.options" :key="String(option.value)" @click="runner.apply({ type: 'input', id: input.id, to: option.value })">
        {{ option.label }}
      </button>
    </template>
    <form v-else @submit.prevent="submit(input)">
      <label>
        {{ input.label }}
        <input
          :value="typed[input.id] ?? input.value ?? ''"
          :type="input.type === 'number' ? 'number' : 'text'"
          :maxlength="input.maxLength ?? undefined"
          :min="input.min ?? undefined"
          :max="input.max ?? undefined"
          @input="typed = { ...typed, [input.id]: ($event.target as HTMLInputElement).value }"
        />
      </label>
      <button type="submit">OK</button>
      <p v-if="refused[input.id]" class="reason">{{ refused[input.id] }}</p>
    </form>
  </div>
</template>
```

Send what the player enters as `{ type: 'input', id, to }`. The engine refuses a value that breaks the input's rules with the reason, such as "Up to 16 letters.", so show the reason by the field. Give the field the input's `maxLength`, `min` and `max`, so the browser holds to them too. An input stays in the view while its `when` holds, so a name field goes once the player has given a name.

## Play transitions and reveals

The engine carries [ui hints](/docs/0.1.0/reference/ui-hints) to the view unchanged. A scene's are in `view.scene.ui`, and a block's are on the first beat it makes, in `beat.ui`. The React UI's `Scene` plays the `transition` and `reveal` hints itself, and [`useScene`](/docs/0.1.0/api/react#usescene) gives a scene component of your own the same timing.

The Plain JS and Vue tabs read the two hints with these helpers:

```ts
/**
 * src/hints.ts: reads the React UI's `transition` and `reveal` hints for a UI of your own. The Plain JS and Vue
 * snippets import it as `../hints.ts`; in a game it sits beside them.
 */
import type { SceneBeat, View } from '@ifloom/engine'

/** The screen in a view, and how it comes in and goes out, from its scene's `ui.transition`. */
export function transitionOf(view: View): { key: string; in: string; out: string; ms: number } {
  const spec = view.scene.ui?.transition
  const pair: { in?: string; out?: string; ms?: number } = typeof spec === 'string' ? { in: spec, out: spec } : (spec ?? {})
  return { key: view.scene.key, in: pair.in ?? 'none', out: pair.out ?? 'none', ms: pair.ms ?? 300 }
}

/** The beats to render, each with the reveal it waits for (how and when), or null for those shown with the scene. */
export function withReveals(beats: readonly SceneBeat[]): { beat: SceneBeat; reveal: { as: string; at: number } | null }[] {
  let at = 0
  let reveal: { as: string; at: number } | null = null
  return beats.map((beat) => {
    const hint = beat.ui?.reveal
    if (hint) {
      at += hint.delay ?? 800
      reveal = { as: hint.as ?? 'fade', at }
    }
    return { beat, reveal }
  })
}

/** True when the player asks for less motion. There's no matchMedia outside a browser, such as in tests. */
export const reducedMotion = (): boolean => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
```

```ts tab="Plain JS" tab-group="framework"
import type { RunnerSnapshot, View } from '@ifloom/engine'
import { reducedMotion, transitionOf, withReveals } from '../hints.ts'
// add, as in the vanilla template's src/main.ts.
import { add } from './runner.ts'

/** The view whose scene is on the page, and the wait before the next one comes in. */
let shown: View | null = null
let timer: ReturnType<typeof setTimeout> | undefined

/** The scene's title and words in an <article>, coming in by its transition, each revealed line after its delay. */
function article(view: View, entering: boolean): HTMLElement {
  const scene = document.createElement('article')
  const transition = transitionOf(view)
  scene.style.setProperty('--ms', `${transition.ms}ms`)
  // Rendered again on the same screen, its reveals have played already.
  if (entering && !reducedMotion()) scene.dataset.transitionIn = transition.in
  else scene.dataset.revealed = ''
  // A click shows every line at once.
  scene.onclick = () => (scene.dataset.revealed = '')
  add(scene, 'h2', view.scene.title)
  for (const { beat, reveal } of withReveals(view.scene.beats)) {
    if (beat.type !== 'text' && beat.type !== 'say') continue
    const line = add(scene, 'p', beat.text)
    if (reveal && !reducedMotion()) {
      line.dataset.reveal = reveal.as
      line.style.setProperty('--at', `${reveal.at}ms`)
    }
  }
  return scene
}

/** The scene, in a box that stays on the page. When the screen changes, the old one goes out by its `out`, then the new one comes in. */
export function drawTransition(box: HTMLElement, { view }: RunnerSnapshot): void {
  const before = shown
  shown = view
  clearTimeout(timer)
  const old = box.querySelector<HTMLElement>('article')
  const going = before && transitionOf(before)
  const changed = going !== null && going.key !== view.scene.key
  if (going && changed && old && !reducedMotion() && going.out !== 'none') {
    // The screen before goes out, and can't be pressed or read out meanwhile.
    old.dataset.transitionOut = going.out
    old.style.setProperty('--ms', `${going.ms}ms`)
    old.setAttribute('aria-hidden', 'true')
    old.inert = true
    timer = setTimeout(() => box.replaceChildren(article(view, true)), going.ms)
    return
  }
  box.replaceChildren(article(view, before === null || changed))
}
```

```tsx tab="React" tab-group="framework"
import type { CSSProperties } from 'react'
import { useScene } from '@ifloom/react'

// Scene plays the screen's ui.transition and each block's ui.reveal itself. A scene component of your own keeps the
// same timing with useScene: the transition, the beats in runs with each run's reveal, and skip to show them all.
export function RevealedLines() {
  const { transition, groups, motion, pending, skip } = useScene()
  return (
    <article key={transition.key} data-transition-in={motion ? transition.in : undefined} style={{ '--ms': `${transition.ms}ms` } as CSSProperties}>
      {groups.map((group, at) => (
        <div
          key={at}
          data-reveal={motion && group.reveal ? group.reveal.as : undefined}
          style={group.reveal ? ({ '--at': `${group.reveal.at}ms` } as CSSProperties) : undefined}
        >
          {group.beats.map(({ beat, index }) => (beat.type === 'text' || beat.type === 'say' ? <p key={index}>{beat.text}</p> : null))}
        </div>
      ))}
      {pending ? <button onClick={skip}>Show all</button> : null}
    </article>
  )
}
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { reducedMotion, transitionOf, withReveals } from '../hints.ts'
import { view } from './runner.ts'

// The scene, coming in by its transition, each revealed line after its delay. When the screen changes,
// the old one goes out by its `out`, then the new one comes in. A click shows every line at once.
const motion = !reducedMotion()
// The view whose scene is on the page, and whether it's going out.
const shown = shallowRef(view.value)
const leaving = ref(false)
const revealed = ref(false)
const transition = computed(() => transitionOf(shown.value))
let timer: ReturnType<typeof setTimeout> | undefined

watch(view, (now) => {
  clearTimeout(timer)
  if (now.scene.key === transition.value.key) return void (shown.value = now)
  const swap = () => {
    leaving.value = false
    revealed.value = false
    shown.value = now
  }
  if (!motion || transition.value.out === 'none') return swap()
  leaving.value = true
  timer = setTimeout(swap, transition.value.ms)
})
</script>

<template>
  <article
    :key="transition.key"
    :data-transition-in="motion ? transition.in : undefined"
    :data-transition-out="leaving ? transition.out : undefined"
    :data-revealed="revealed ? '' : undefined"
    :aria-hidden="leaving ? 'true' : undefined"
    :inert="leaving"
    :style="{ '--ms': `${transition.ms}ms` }"
    @click="revealed = true"
  >
    <h2>{{ shown.scene.title }}</h2>
    <template v-for="({ beat, reveal }, at) in withReveals(shown.scene.beats)" :key="at">
      <p
        v-if="beat.type === 'text' || beat.type === 'say'"
        :data-reveal="motion && reveal ? reveal.as : undefined"
        :style="reveal ? { '--at': `${reveal.at}ms` } : undefined"
      >
        {{ beat.text }}
      </p>
    </template>
  </article>
</template>
```

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

Play a transition only when `view.scene.key` changes. A choice that keeps the scene open gives a new view with the same key, and playing the scene's `in` again there looks like a flicker. Keep a revealed line in the page while it waits, rather than hiding it with `display: none`, so a screen reader still reads it. [`startRevealSkip`](/docs/0.1.0/api/browser#startrevealskip) shows every held-back line on a key press, as a click does.

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

- [Scenes](/docs/0.1.0/reference/scenes), [Flows](/docs/0.1.0/reference/flows), [Prose](/docs/0.1.0/reference/prose) and [Inputs](/docs/0.1.0/reference/inputs).
- [The view](/docs/0.1.0/reference/view) and [UI hints](/docs/0.1.0/reference/ui-hints).
- [Write a flowing scene](/docs/0.1.0/how-to/write-a-flowing-scene) and [Add a transition or reveal lines](/docs/0.1.0/how-to/add-a-transition).
