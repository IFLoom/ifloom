---
title: "Transitions"
description: "Fade between scenes, slide a room in, and reveal a scene's lines one after another, in the React UI or drawn yourself in plain DOM, React, Vue or Svelte."
---
A scene can fade in, the next room can slide in from the side, and a paragraph can wait a moment before it appears. This page shows how to ask for each in your content, how the React UI draws them, and how to draw them yourself with another framework.

The engine never animates anything. It names the transition in the view and the UI decides what that looks like, as it does for [audio](/docs/reference/audio). That keeps tests, `ifloom playtest` and replays free of timing, and lets each UI draw the same names its own way. The [Transitions reference](/docs/reference/transitions) has every field.

## Ask for a transition

Give a scene a `transition`. A name on its own is used both ways:

```ts
{
  id: 'ava.river',
  title: 'By the river',
  transition: 'fade',
  body: [{ text: 'ava.river' }],
  choices: [{ id: 'stay', effects: [{ kind: 'scene', scene: null }] }],
}
```

Or say how it comes in and goes out separately, and how long each takes in milliseconds (300 if you leave `ms` out):

```ts
transition: { in: 'slide-up', out: 'fade', ms: 500 }
```

The built-in names are `fade`, `slide-up`, `slide-left`, `zoom` and `none`, listed in [`TRANSITIONS`](/docs/reference/transitions#transitionname).

A place takes a `transition` too, for the room while no scene is open, so walking between places can slide:

```ts
{ id: 'high-street', name: 'High Street', tag: 'Town', exits: ['flat', 'cafe'], art: 'place/high-street', body: [{ text: 'place.high-street' }], transition: 'slide-left' }
```

For the whole game, set a default on the `Game`. Any scene or place that says nothing uses it, and one that sets only `in` takes `out` and `ms` from it:

```ts
loadGame([town], { id: 'small-town', title: 'Small Town', transitions: { default: { in: 'fade', ms: 250 } } })
```

A choice can decide how the next screen arrives with a `transition` effect, whatever that screen declares. It lasts for that one command:

```ts
{ id: 'unpack', effects: [{ kind: 'scene', scene: null }, { kind: 'transition', to: 'slide-up', ms: 400 }] }
```

## Reveal lines one after another

Give a body block a `reveal` and it waits before it appears. `delay` is in milliseconds after the reveal before it, or after the scene comes on (800 if left out). `as` is how it comes in (`fade` if left out):

```ts
body: [
  { text: 'intro' },
  { text: 'intro.tonight', reveal: { delay: 1200 } },
  { text: 'intro.cat', reveal: { delay: 1500, as: 'slide-up' } },
]
```

Inside one prose key, put `[[reveal]]` on a line of its own. A delay goes after a colon and a transition after a `|`:

```md
Ava is on the bench with her shoes off, feeding the ducks the crusts of the day.

[[reveal:1500|slide-up]]

"I told you it was the only quiet in town." She shuffles up to make room.
```

Both become a `reveal` beat in `view.scene.beats`, with `at`: the time it comes, counted from the scene coming on. The lines after it are in the beats from the start, so a UI can put them in the page at once for screen readers and hold back only how they look.

## The React UI

The React UI plays all of this with no code from you. Its base styles animate each built-in name, let the scene before go out before the next comes in, and reveal the held-back lines in order, with the choices after the last one. A click on the scene, or any key, shows the rest at once.

A player whose system asks for reduced motion gets every scene and every line at once. To turn transitions off for everyone, pass `motion: false` to `mountGame`, `GameShell` or `GameProvider`, beside the other [UI options](/docs/react/components#uioptions).

To change how one looks, write CSS against the attributes the React UI sets. The new scene's `<article>` carries `data-transition-in`, the copy of the scene before carries `data-leaving` and `data-transition-out`, and each held-back group of lines carries `data-reveal`. The times are CSS variables: `--ifloom-transition-ms`, `--ifloom-reveal-at` and `--ifloom-reveal-ms`. A slower, softer fade for every reveal:

```css
:root {
  --ifloom-reveal-ms: 900ms;
}

[data-reveal="fade"] {
  animation-timing-function: ease-in-out;
}
```

Your rules win over the base styles, which sit in a cascade layer. [Components](/docs/react/components#scenestage) has the details.

### Your own names

Declare a name in `game.transitions.names`, use it like a built-in one, and draw it with CSS. Without the declaration the content checker reports it as an unknown transition, which catches typos.

```ts
loadGame([town], { id: 'small-town', title: 'Small Town', transitions: { names: ['curtain'] } })
```

```css
@keyframes curtain-in {
  from { clip-path: inset(0 50% 0 50%); }
}
@keyframes curtain-out {
  to { clip-path: inset(0 50% 0 50%); }
}
[data-transition-in="curtain"] { animation-name: curtain-in; }
[data-leaving][data-transition-out="curtain"] { animation-name: curtain-out; }
[data-reveal="curtain"] { animation-name: curtain-in; }
```

## Draw them yourself

With another framework, read `view.transition` and the reveal beats and draw them with CSS. The steps are the same in each:

1. Keep the view whose scene is on the page. While `view.transition.key` stays the same, draw each new view at once.
2. When the key changes, mark the scene on the page with `data-transition-out` and its `out`, wait its `ms`, then draw the new one with `data-transition-in` and its `in`. Keying the element by `transition.key` makes it a new element, so its animation plays.
3. Put every beat in the page. A beat after a reveal gets `data-reveal` and `--at` from that reveal.
4. On a click or a key, mark the scene `data-revealed` so everything shows.
5. Skip all of it when `prefers-reduced-motion` is set.

This CSS draws `fade` and `slide-up`. Add rules for the other names you use:

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

Each beat needs to know the reveal it waits for. This helper is the same in every framework:

```ts
// src/reveals.ts
import type { SceneBeat } from '@ifloom/engine'

type Reveal = Extract<SceneBeat, { kind: 'reveal' }>

/** The beats to draw, each with the reveal it waits for, or null for those shown with the scene. */
export function withReveals(beats: readonly SceneBeat[]): { beat: SceneBeat; reveal: Reveal | null }[] {
  let reveal: Reveal | null = null
  return beats.flatMap((beat) => {
    if (beat.kind === 'reveal') {
      reveal = beat
      return []
    }
    return [{ beat, reveal }]
  })
}
```

Then the scene, in each framework. Each draws the title and the words; add your choices and pictures as your UI already does.

```ts tab="Plain JS" tab-group="framework"
// src/scene.ts: call drawScene(stage, view) from draw(), with a <div> that stays in the page.
import type { View } from '@ifloom/engine'
import { withReveals } from './reveals.ts'

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
let shown: View | null = null
let timer: ReturnType<typeof setTimeout> | undefined

function article(view: View, entering: boolean): HTMLElement {
  const scene = document.createElement('article')
  scene.style.setProperty('--ms', `${view.transition.ms}ms`)
  // Drawn again on the same screen, its reveals have played already.
  if (entering && !reduced.matches) scene.dataset.transitionIn = view.transition.in
  else scene.dataset.revealed = ''
  scene.onclick = () => (scene.dataset.revealed = '')
  scene.append(Object.assign(document.createElement('h2'), { textContent: view.scene.title }))
  for (const { beat, reveal } of withReveals(view.scene.beats)) {
    if (!('text' in beat)) continue
    const line = scene.appendChild(Object.assign(document.createElement('p'), { textContent: beat.text }))
    if (reveal && !reduced.matches) {
      line.dataset.reveal = reveal.as
      line.style.setProperty('--at', `${reveal.at}ms`)
    }
  }
  return scene
}

export function drawScene(stage: HTMLElement, view: View): void {
  const before = shown
  shown = view
  clearTimeout(timer)
  const old = stage.querySelector<HTMLElement>('article')
  const changed = before !== null && before.transition.key !== view.transition.key
  if (changed && old && !reduced.matches && before.transition.out !== 'none') {
    // The screen before goes out by its own `out`, and can't be pressed or heard meanwhile.
    old.dataset.transitionOut = before.transition.out
    old.style.setProperty('--ms', `${before.transition.ms}ms`)
    old.setAttribute('aria-hidden', 'true')
    old.inert = true
    timer = setTimeout(() => stage.replaceChildren(article(view, true)), before.transition.ms)
    return
  }
  stage.replaceChildren(article(view, before === null || changed))
}
```

```tsx tab="React" tab-group="framework"
// src/Scene.tsx: React with the runner, without @ifloom/react.
import { useEffect, useState, useSyncExternalStore, type CSSProperties } from 'react'
import type { Runner, View } from '@ifloom/engine'
import { withReveals } from './reveals.ts'

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function Scene({ runner }: { runner: Runner }) {
  const view = useSyncExternalStore(runner.subscribe, runner.view)
  const motion = !reduced()
  // The view whose scene is on the page, and whether it's going out.
  const [shown, setShown] = useState(view)
  const [leaving, setLeaving] = useState(false)
  const [revealed, setRevealed] = useState(false)
  useEffect(() => {
    if (view === shown) return
    const swap = () => {
      setLeaving(false)
      setRevealed(false)
      setShown(view)
    }
    if (view.transition.key === shown.transition.key) return setShown(view)
    if (!motion || shown.transition.out === 'none') return swap()
    setLeaving(true)
    const timer = setTimeout(swap, shown.transition.ms)
    return () => clearTimeout(timer)
  }, [view, shown, motion])
  return (
    <article
      key={shown.transition.key}
      data-transition-in={motion ? shown.transition.in : undefined}
      data-transition-out={leaving ? shown.transition.out : undefined}
      data-revealed={revealed ? '' : undefined}
      aria-hidden={leaving || undefined}
      inert={leaving}
      onClick={() => setRevealed(true)}
      style={{ '--ms': `${shown.transition.ms}ms` } as CSSProperties}
    >
      <h2>{shown.scene.title}</h2>
      {withReveals(shown.scene.beats).map(({ beat, reveal }, at) =>
        'text' in beat ? (
          <p key={at} data-reveal={motion && reveal ? reveal.as : undefined} style={reveal ? ({ '--at': `${reveal.at}ms` } as CSSProperties) : undefined}>
            {beat.text}
          </p>
        ) : null,
      )}
    </article>
  )
}
```

```vue tab="Vue" tab-group="framework"
<!-- src/Scene.vue -->
<script setup lang="ts">
import { ref, shallowRef, watch } from 'vue'
import { view } from './runner.ts'
import { withReveals } from './reveals.ts'

const motion = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
// The view whose scene is on the page, and whether it's going out.
const shown = shallowRef(view.value)
const leaving = ref(false)
const revealed = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

watch(view, (now) => {
  clearTimeout(timer)
  if (now.transition.key === shown.value.transition.key) return void (shown.value = now)
  const swap = () => {
    leaving.value = false
    revealed.value = false
    shown.value = now
  }
  if (!motion || shown.value.transition.out === 'none') return swap()
  leaving.value = true
  timer = setTimeout(swap, shown.value.transition.ms)
})
</script>

<template>
  <article
    :key="shown.transition.key"
    :data-transition-in="motion ? shown.transition.in : undefined"
    :data-transition-out="leaving ? shown.transition.out : undefined"
    :data-revealed="revealed ? '' : undefined"
    :aria-hidden="leaving ? 'true' : undefined"
    :inert="leaving"
    :style="{ '--ms': `${shown.transition.ms}ms` }"
    @click="revealed = true"
  >
    <h2>{{ shown.scene.title }}</h2>
    <template v-for="({ beat, reveal }, at) in withReveals(shown.scene.beats)" :key="at">
      <p v-if="'text' in beat" :data-reveal="motion && reveal ? reveal.as : undefined" :style="reveal ? { '--at': `${reveal.at}ms` } : undefined">{{ beat.text }}</p>
    </template>
  </article>
</template>
```

```svelte tab="Svelte" tab-group="framework"
<!-- src/Scene.svelte -->
<script lang="ts">
  import type { View } from '@ifloom/engine'
  import { view } from './runner.ts'
  import { withReveals } from './reveals.ts'

  const motion = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // The view whose scene is on the page, and whether it's going out.
  let shown: View | null = $state(null)
  let leaving = $state(false)
  let revealed = $state(false)

  $effect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const stop = view.subscribe((now) => {
      clearTimeout(timer)
      const before = shown
      if (!before || now.transition.key === before.transition.key) return void (shown = now)
      const swap = () => {
        leaving = false
        revealed = false
        shown = now
      }
      if (!motion || before.transition.out === 'none') return swap()
      leaving = true
      timer = setTimeout(swap, before.transition.ms)
    })
    return () => {
      stop()
      clearTimeout(timer)
    }
  })
</script>

{#if shown}
  {#key shown.transition.key}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
    <article
      data-transition-in={motion ? shown.transition.in : undefined}
      data-transition-out={leaving ? shown.transition.out : undefined}
      data-revealed={revealed ? '' : undefined}
      aria-hidden={leaving ? 'true' : undefined}
      inert={leaving}
      style="--ms: {shown.transition.ms}ms"
      onclick={() => (revealed = true)}
    >
      <h2>{shown.scene.title}</h2>
      {#each withReveals(shown.scene.beats) as { beat, reveal }, at (at)}
        {#if 'text' in beat}<p data-reveal={motion && reveal ? reveal.as : undefined} style={reveal ? `--at: ${reveal.at}ms` : undefined}>{beat.text}</p>{/if}
      {/each}
    </article>
  {/key}
{/if}
```

To let a key show everything too, listen for `keydown` on the window while the scene has reveals to come, and set `data-revealed` as the click does.

**Gotchas:**
- Play a transition only when `view.transition.key` changes. A choice that keeps the same scene open gives a new view with the same key, and replaying the scene's `in` there looks like a flicker.
- Keep the words of revealed lines in the page. Hiding them with `display: none` or `visibility: hidden` until they come hides them from screen readers too.
- Choices that come before the last reveal can be pressed before the player has read the lines. The React UI holds them back with `visibility: hidden` until the last reveal, which also keeps them from screen readers and the keyboard until then.

## See it in the showcase

Small Town's moving-day scene fades in from the title page and reveals its second paragraph after a pause. Its Unpack choice brings the flat in with `slide-up`. By the river, Ava's scene fades, and her answer comes a moment after the narration. The content is in `examples/showcase/src/content/town.ts` and `prose.ts`.
