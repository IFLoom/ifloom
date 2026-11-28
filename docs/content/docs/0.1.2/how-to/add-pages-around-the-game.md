---
title: "Add a content notice and pages of your own"
description: "Show a content notice the player confirms once before the title screen, and add pages of your own such as a list of endings."
---
Use this to show a content notice before the title screen, or to add a page of your own beside the title screen, such as a gallery or a list of endings found. Turn the title screen on first, as [Add a title screen](/docs/0.1.2/how-to/add-a-title-screen) shows. Both pages read and write the player's [profile](/docs/0.1.2/reference/profile), which outlives every save.

## Show a notice before the title screen

In the React UI, give `pages` a `gate`. With a UI of your own, render the notice before the title screen, and remember in the profile's `ui:gate` that the player has read it:

```ts tab="Plain JS" tab-group="framework"
// src/gate.ts
import type { Runner } from '@ifloom/engine'

/** The notice, unless the player confirmed it before on this device. `next` renders the title screen. */
export async function gate(root: HTMLElement, runner: Runner, next: () => void): Promise<void> {
  if (await runner.profile?.get('ui:gate')) return next()
  root.replaceChildren()
  root.appendChild(document.createElement('h1')).textContent = 'Before you start'
  root.appendChild(document.createElement('p')).textContent = 'This story mentions a house fire.'
  root.appendChild(document.createElement('p')).textContent = 'It happens off the page.'
  const confirm = root.appendChild(document.createElement('button'))
  confirm.textContent = 'Carry on'
  confirm.onclick = async () => {
    await runner.profile?.set('ui:gate', true)
    next()
  }
  Object.assign(root.appendChild(document.createElement('a')), { href: 'https://example.com/', textContent: 'Not today' })
}
```

```ts tab="React" tab-group="framework"
import { mountGame } from '@ifloom/react'
import module from './game.ts'

mountGame(module.build(), {
  pages: {
    gate: {
      title: 'Before you start',
      text: 'This story mentions a house fire.\n\nIt happens off the page.',
      confirm: 'Carry on',
      decline: { label: 'Not today', href: 'https://example.com/' },
    },
  },
})
```

```vue tab="Vue" tab-group="framework"
<!-- src/Gate.vue: render it before the title screen until it emits `done` -->
<script setup lang="ts">
import { onMounted } from 'vue'
import { runner } from './runner.ts'

const emit = defineEmits<{ done: [] }>()
onMounted(async () => {
  if (await runner.profile?.get('ui:gate')) emit('done')
})

async function confirm() {
  await runner.profile?.set('ui:gate', true)
  emit('done')
}
</script>

<template>
  <h1>Before you start</h1>
  <p>This story mentions a house fire.</p>
  <p>It happens off the page.</p>
  <button @click="confirm">Carry on</button>
  <a href="https://example.com/">Not today</a>
</template>
```

Confirming moves on to the title screen and is remembered on that device, so the notice doesn't show again. Declining follows the link. Every word on the notice is yours. In the React UI's `gate`, a blank line in `text` starts a new paragraph. Without an `href`, the decline button does nothing and the player stays on the notice.

## Add a page of your own

In the React UI, give `pages.pages` a component for each page, by id, and the title screen gets a button for it. With a UI of your own, show the page from a button on your title screen. This endings page reads `core:finished`, which the runner writes to the profile the first time the game's `finished` condition holds:

```ts tab="Plain JS" tab-group="framework"
// src/endings.ts
import type { Runner } from '@ifloom/engine'

/** The endings page. `back` renders the title screen again. */
export async function endings(root: HTMLElement, runner: Runner, back: () => void): Promise<void> {
  const finished = await runner.profile?.get<{ at: number }>('core:finished')
  root.replaceChildren()
  root.appendChild(document.createElement('h1')).textContent = 'Endings'
  root.appendChild(document.createElement('p')).textContent = finished ? 'You have reached an ending.' : 'No endings yet.'
  const button = root.appendChild(document.createElement('button'))
  button.textContent = 'Back'
  button.onclick = back
}
```

```tsx tab="React" tab-group="framework"
import { mountGame, useProfile, usePage } from '@ifloom/react'
import module from './game.ts'

function Endings() {
  const { back } = usePage()
  const finished = useProfile<{ at: number }>('core:finished')
  return (
    <section>
      <h1>Endings</h1>
      <p>{finished ? 'You have reached an ending.' : 'No endings yet.'}</p>
      <button onClick={back}>Back</button>
    </section>
  )
}

mountGame(module.build(), {
  pages: { pages: { endings: { label: 'Endings', component: Endings } } },
})
```

```vue tab="Vue" tab-group="framework"
<!-- src/Endings.vue -->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { runner } from './runner.ts'

const emit = defineEmits<{ back: [] }>()
const finished = ref<{ at: number }>()
onMounted(async () => {
  finished.value = await runner.profile?.get<{ at: number }>('core:finished')
})
</script>

<template>
  <section>
    <h1>Endings</h1>
    <p>{{ finished ? 'You have reached an ending.' : 'No endings yet.' }}</p>
    <button @click="emit('back')">Back</button>
  </section>
</template>
```

In the React UI, the component takes no props and fills the whole page. [`usePage`](/docs/0.1.2/reference/react/components#usepage) moves between pages, and [`useProfile`](/docs/0.1.2/reference/react/components#useprofile) reads what outlives a save. Set `showOnTitle: false` to leave the page's button off the title screen, and open it yourself with `usePage().go('endings')`. A page with the id of one a plugin UI adds, such as `achievements`, replaces it.

## Check it worked

Run `npm run dev`. The notice shows before the title screen. Press Carry on, reload the page, and it goes straight to the title screen. To see the notice again, clear the site's storage in the browser. The title screen has an Endings button, and its page says "No endings yet." until you finish the game.

For more, see:

- [`PagesOptions`](/docs/0.1.2/reference/react/components#pagesoptions), [`GatePage`](/docs/0.1.2/reference/react/components#gatepage) and [`usePage`](/docs/0.1.2/reference/react/components#usepage).
- [Profile](/docs/0.1.2/reference/profile), with its `ui:gate` and `core:finished` keys.
- [End the game](/docs/0.1.2/how-to/end-the-game#count-it-as-finishing-the-game), for the `finished` condition.
