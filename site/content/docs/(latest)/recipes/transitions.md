---
title: "Transitions"
description: "Fade between scenes, slide a room in, and reveal a scene's lines one after another with the React UI's ui hints, or draw the same hints yourself in plain DOM, React, Vue or Svelte."
---
A scene can fade in, the next room can slide in from the side, and a paragraph can wait a moment before it appears. This page shows how to ask for each in your content, how the React UI draws them, and how to draw the same hints with another framework.

None of this is the engine's. How a screen moves doesn't change the game, so content writes it as [presentation hints](/docs/reference/ui-hints): a `ui` field the engine passes to the view untouched. The names on this page (`ui.transition`, `ui.reveal`) are the React UI's, listed in [Presentation hints](/docs/react/hints). Tests, `ifloom playtest` and replays ignore them.

## Ask for a transition

Give a scene a `ui.transition`. A name on its own is used both ways:

```ts
{
  id: 'ava.river',
  title: 'By the river',
  ui: { transition: 'fade' },
  body: [{ prose: 'ava.river' }],
  choices: [{ id: 'stay', effects: [{ scene: null }] }],
}
```

Or say how it comes in and goes out separately, and how long each takes in milliseconds (300 if you leave `ms` out):

```ts
ui: { transition: { in: 'slide-up', out: 'fade', ms: 500 } }
```

The built-in names are `fade`, `slide-up`, `slide-left`, `zoom` and `none`, listed in [`TRANSITIONS`](/docs/react/hints#transitionname).

A place takes one too, for the room while no scene is open, so walking between places can slide:

```ts
places.location({ id: 'high-street', name: 'High Street', description: 'Town', exits: ['flat', 'cafe'], body: [{ prose: 'place.high-street' }], ui: { transition: 'slide-left' } })
```

For the whole game, set a default in the content's `ui`. Any scene or place that says nothing uses it, and one that sets only `in` takes `out` and `ms` from it:

```ts
export const town: Content = {
  ui: { transition: { in: 'fade', ms: 250 } },
  scenes: [/* ... */],
}
```

A choice can say how the screen it leads to comes in, whatever that screen declares. The React UI knows which choice was pressed, by a click or a number key, and plays it once:

```ts
{ id: 'unpack', ui: { transition: { in: 'slide-up', ms: 400 } }, effects: [{ scene: null }] }
```

## Reveal lines one after another

Give a body block a `ui.reveal` and it waits before it appears. `delay` is in milliseconds after the reveal before it, or after the scene comes on (800 if left out). `as` is how it comes in (`fade` if left out):

```ts
body: [
  { prose: 'intro' },
  { prose: 'intro.tonight', ui: { reveal: { delay: 1200 } } },
  { prose: 'intro.cat', ui: { reveal: { delay: 1500, as: 'slide-up' } } },
]
```

A paragraph that should wait goes in a block of its own. The block's hints arrive on the first [beat](/docs/reference/prose#scenebeat) it makes, and the lines after it are in the beats from the start. So a UI can put every word in the page at once for screen readers and hold back only how they look.

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

Your rules win over the base styles, which sit in a cascade layer. [Components](/docs/react/components#scene) has the details.

### Your own names

List a name in the content's `ui.transitionNames`, use it like a built-in one, and draw it with CSS. [`checkUiHints`](/docs/react/hints#checkuihints) reports a name that is neither built in nor listed, which catches typos.

```ts
export const town: Content = { ui: { transitionNames: ['curtain'] } }
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

Another UI can read the same hints. They're plain data in the view: the scene's `ui` is `view.scene.ui`, and a block's is on the first beat it makes. Whether your UI uses the React UI's names, its own, or none is up to you. If it uses these, content written for one UI looks the same in the other. The steps are the same in each framework:

1. Keep the view whose scene is on the page. While [`view.scene.key`](/docs/reference/view#the-scene) stays the same, draw each new view at once.
2. When the key changes, mark the scene on the page with `data-transition-out` and its `out`, wait its `ms`, then draw the new one with `data-transition-in` and its `in`. Keying the element by the key makes it a new element, so its animation plays.
3. Put every beat in the page. A beat from a revealed block onwards gets `data-reveal` and `--at` from that reveal.
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

These helpers read the hints, and are the same in every framework. The `declare module` block types the two hints for a game without `@ifloom/react`. A game that has it gets them from there, so leave the block out.

```ts
// src/hints.ts
import type { SceneBeat, View } from '@ifloom/engine'

type Transition = { in?: string; out?: string; ms?: number }

declare module '@ifloom/engine' {
  interface SceneUi {
    transition?: Transition | string
  }
  interface BlockUi {
    reveal?: { delay?: number; as?: string }
  }
}

/** The screen in a view, and how it comes in and goes out, from its scene's `ui.transition`. */
export function transitionOf(view: View): { key: string; in: string; out: string; ms: number } {
  const spec = view.scene.ui?.transition
  const pair: Transition = typeof spec === 'string' ? { in: spec, out: spec } : (spec ?? {})
  return { key: view.scene.key, in: pair.in ?? 'none', out: pair.out ?? 'none', ms: pair.ms ?? 300 }
}

/** The beats to draw, each with the reveal it waits for (how and when), or null for those shown with the scene. */
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
```

Then the scene, in each framework. Each draws the title and the words. Add your choices and pictures as your UI already does.

```ts tab="Plain JS" tab-group="framework"
// src/scene.ts: call drawScene(box, view) from draw(), with a <div> that stays in the page.
import type { View } from '@ifloom/engine'
import { transitionOf, withReveals } from './hints.ts'

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
let shown: View | null = null
let timer: ReturnType<typeof setTimeout> | undefined

function article(view: View, entering: boolean): HTMLElement {
  const scene = document.createElement('article')
  const transition = transitionOf(view)
  scene.style.setProperty('--ms', `${transition.ms}ms`)
  // Drawn again on the same screen, its reveals have played already.
  if (entering && !reduced.matches) scene.dataset.transitionIn = transition.in
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

export function drawScene(box: HTMLElement, view: View): void {
  const before = shown
  shown = view
  clearTimeout(timer)
  const old = box.querySelector<HTMLElement>('article')
  const going = before && transitionOf(before)
  const changed = going !== null && going.key !== view.scene.key
  if (going && changed && old && !reduced.matches && going.out !== 'none') {
    // The screen before goes out by its own `out`, and can't be pressed or heard meanwhile.
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
// src/Scene.tsx: React with the runner, without @ifloom/react.
import { useEffect, useState, useSyncExternalStore, type CSSProperties } from 'react'
import type { Runner } from '@ifloom/engine'
import { transitionOf, withReveals } from './hints.ts'

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function Scene({ runner }: { runner: Runner }) {
  const view = useSyncExternalStore(runner.subscribe, runner.view)
  const motion = !reduced()
  // The view whose scene is on the page, and whether it's going out.
  const [shown, setShown] = useState(view)
  const [leaving, setLeaving] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const transition = transitionOf(shown)
  useEffect(() => {
    if (view === shown) return
    const swap = () => {
      setLeaving(false)
      setRevealed(false)
      setShown(view)
    }
    const going = transitionOf(shown)
    if (view.scene.key === going.key) return setShown(view)
    if (!motion || going.out === 'none') return swap()
    setLeaving(true)
    const timer = setTimeout(swap, going.ms)
    return () => clearTimeout(timer)
  }, [view, shown, motion])
  return (
    <article
      key={transition.key}
      data-transition-in={motion ? transition.in : undefined}
      data-transition-out={leaving ? transition.out : undefined}
      data-revealed={revealed ? '' : undefined}
      aria-hidden={leaving || undefined}
      inert={leaving}
      onClick={() => setRevealed(true)}
      style={{ '--ms': `${transition.ms}ms` } as CSSProperties}
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
import { computed, ref, shallowRef, watch } from 'vue'
import { view } from './runner.ts'
import { transitionOf, withReveals } from './hints.ts'

const motion = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
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
  import { transitionOf, withReveals } from './hints.ts'

  const motion = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // The view whose scene is on the page, and whether it's going out.
  let shown: View | null = $state(null)
  let leaving = $state(false)
  let revealed = $state(false)

  $effect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const stop = view.subscribe((now) => {
      clearTimeout(timer)
      const going = shown && transitionOf(shown)
      if (!going || now.scene.key === going.key) return void (shown = now)
      const swap = () => {
        leaving = false
        revealed = false
        shown = now
      }
      if (!motion || going.out === 'none') return swap()
      leaving = true
      timer = setTimeout(swap, going.ms)
    })
    return () => {
      stop()
      clearTimeout(timer)
    }
  })
</script>

{#if shown}
  {@const transition = transitionOf(shown)}
  {#key transition.key}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
    <article
      data-transition-in={motion ? transition.in : undefined}
      data-transition-out={leaving ? transition.out : undefined}
      data-revealed={revealed ? '' : undefined}
      aria-hidden={leaving ? 'true' : undefined}
      inert={leaving}
      style="--ms: {transition.ms}ms"
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

To let a key show everything too, call [`startRevealSkip`](/docs/browser#startrevealskip) from `@ifloom/browser` while the scene has reveals to come, and set `data-revealed` as the click does. To play a choice's own `ui.transition`, note the choice when the player presses it, and use its `in` and `ms` for the next screen.

**Gotchas:**
- Play a transition only when `view.scene.key` changes. A choice that keeps the same scene open gives a new view with the same key, and replaying the scene's `in` there looks like a flicker.
- Keep the words of revealed lines in the page. Hiding them with `display: none` or `visibility: hidden` until they come hides them from screen readers too.
- Choices that come before the last reveal can be pressed before the player has read the lines. The React UI holds them back with `visibility: hidden` until the last reveal, which also keeps them from screen readers and the keyboard until then.

## See it in the showcase

Small Town's moving-day scene fades in from the title page and reveals its second paragraph after a pause. Its Unpack choice brings the flat in with `slide-up`. By the river, Ava's scene fades, and her answer comes a moment after the narration, in a block of its own. The content is in `examples/showcase/src/story/moving-day.ts`, and in `story/ava.ts` with its prose in `story/ava.prose.ts`.
