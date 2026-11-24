---
title: "Popups and modals"
description: "Open a dialog from a word in the prose: a popup that only shows words, with [[ui:modal|…]], or a modal whose buttons change the game, with an inline action and the panel effect. In the React UI, plain DOM, React or Vue."
---
A word in the prose can open a dialog. There are two ways to do it, and which one you want depends on whether the dialog changes the game:

- **A popup that only shows something**, such as the full text of a note or a photo to look at closely, is a [UI piece](/docs/reference/prose#ui-pieces): `[[ui:modal|words|key]]`. The engine carries it to your UI as written. Opening it isn't a command, so it isn't in the log or a save.
- **A modal that changes the game**, such as a lease to sign or a counter to buy at, is an [inline action](/docs/reference/prose#inline-actions-and-tooltips) whose choice or button opens a [panel](/docs/reference/panels). Opening it is a command, its buttons send commands, and replays open it exactly as play did.

## A popup that only shows words

Write `[[ui:modal|words|key]]` where the link should go. The words show in the line, and the popup shows the prose line `key`. A fourth part gives the popup a title. Without one it's titled with the words. This is the showcase's flat:

```ts
const prose = {
  'place.flat':
    "Boxes, mostly. The window looks over the high street, and [[ui:modal|the radiator knocks|notice.welcome|Sam's note]] when it feels like it.",
  'notice.welcome': 'Welcome to the building! Bins go out Thursday. The radiator knocks; ignore it. Sam, flat 2',
}
```

The popup's text is a prose line like any other, so a translation or a mod can change it and its [tokens](/docs/reference/prose#tokens) are filled in. It can have several paragraphs, bold and italics.

`[[ui:image|words|path]]` works the same way for a picture: the words open it large. The React UI draws both with no code from you. See [Inline pieces](/docs/reference/react/hints#inline-pieces).

### Draw it yourself

The view gives the paragraph's beat a `ui` [span](/docs/reference/prose#inlinespan), `{ type: 'ui', name: 'modal', text, args }`, where `args[0]` is the prose key and `args[1]` the title if there is one. Read the line from the game's prose for the current state, and show it in a dialog when the words are pressed.

A native `<dialog>` opened with `showModal()` does most of the work. It closes on Escape, keeps focus inside while it's open, and puts focus back on the button when it closes. Draw the other spans as the [inline actions recipe](/docs/recipes/inline-actions#draw-them-yourself) does.

```ts tab="Plain JS" tab-group="framework"
// src/popup.ts: call it from your line drawing for a `ui` span named modal.
import type { InlineSpan, Runner } from '@ifloom/engine'

export function drawPopup(runner: Runner, line: HTMLElement, span: Extract<InlineSpan, { type: 'ui' }>): void {
  const [key, title] = span.args
  const text = key ? runner.game.prose?.line(key, runner.state) : undefined
  // A key with no prose: the words, so the line still reads.
  if (text === undefined) {
    line.append(span.text)
    return
  }
  const button = line.appendChild(document.createElement('button'))
  Object.assign(button, { type: 'button', className: 'popup-link', textContent: span.text })
  button.setAttribute('aria-haspopup', 'dialog')
  button.onclick = () => {
    const dialog = document.body.appendChild(document.createElement('dialog'))
    dialog.appendChild(document.createElement('h2')).textContent = title ?? span.text
    for (const paragraph of text.split('\n\n')) dialog.appendChild(document.createElement('p')).textContent = paragraph
    const close = dialog.appendChild(document.createElement('button'))
    Object.assign(close, { type: 'button', textContent: 'Close', onclick: () => dialog.close() })
    dialog.onclose = () => dialog.remove()
    dialog.showModal()
  }
}
```

```tsx tab="React" tab-group="framework"
// src/Popup.tsx: React with the runner, without @ifloom/react.
import { useRef } from 'react'
import type { InlineSpan, Runner } from '@ifloom/engine'

export function Popup({ runner, span }: { runner: Runner; span: Extract<InlineSpan, { type: 'ui' }> }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [key, title] = span.args
  const text = key ? runner.game.prose?.line(key, runner.state) : undefined
  if (text === undefined) return <>{span.text}</>
  return (
    <>
      <button type="button" className="popup-link" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>
        {span.text}
      </button>
      <dialog ref={dialog}>
        <h2>{title ?? span.text}</h2>
        {text.split('\n\n').map((paragraph, at) => (
          <p key={at}>{paragraph}</p>
        ))}
        <button type="button" onClick={() => dialog.current?.close()}>
          Close
        </button>
      </dialog>
    </>
  )
}
```

```vue tab="Vue" tab-group="framework"
<!-- src/Popup.vue: <Popup v-if="span.type === 'ui' && span.name === 'modal'" :span="span" /> in Line.vue -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import type { InlineSpan } from '@ifloom/engine'
import { runner, view } from './runner.ts'

const props = defineProps<{ span: Extract<InlineSpan, { type: 'ui' }> }>()
const dialog = ref<HTMLDialogElement>()
// Read again whenever the view changes, so tokens follow the state.
const text = computed(() => {
  void view.value
  const key = props.span.args[0]
  return key ? runner.game.prose?.line(key, runner.state) : undefined
})
</script>

<template>
  <template v-if="text === undefined">{{ span.text }}</template>
  <template v-else>
    <button type="button" class="popup-link" aria-haspopup="dialog" @click="dialog?.showModal()">{{ span.text }}</button>
    <dialog ref="dialog">
      <h2>{{ span.args[1] ?? span.text }}</h2>
      <p v-for="(paragraph, at) in text.split('\n\n')" :key="at">{{ paragraph }}</p>
      <button type="button" @click="dialog?.close()">Close</button>
    </dialog>
  </template>
</template>
```

Give the link a look of its own, so a player can tell it from an inline action, which does something:

```css
.popup-link { padding: 0; border: 0; background: none; font: inherit; text-decoration: underline dashed; cursor: pointer; }
dialog::backdrop { background: rgb(0 0 0 / 0.5); }
```

## A modal that changes the game

When the dialog's buttons should do something, the dialog is a panel. Content opens it with the [`panel` effect](/docs/reference/effects#panel), from the choice or button that an inline action draws in the line. Its buttons send commands, and the effects of those commands change the game.

Here the flat's prose links to a lease. Pressing it opens a `lease` panel, and signing it in the panel sets a key in the kv store, pays the deposit and closes the panel:

```ts
import type { Content } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'

export const lease: Content = {
  // Sent by the panel's button, so it has no label and no button of its own.
  actions: [
    {
      id: 'sign-lease',
      cost: { stats: { coins: 50 }, reasons: { coins: "You can't cover the deposit yet." } },
      blocked: [places.onlyAt(['flat']), { when: { kv: 'signed' }, reason: 'You signed it already.' }],
      effects: [{ kv: 'signed', to: true }, { panel: null }],
    },
  ],
  prose: {
    'place.flat.lease': 'The [[act:lease|lease]] is still on the table, unsigned.',
    'lease.text': 'Twelve months, rent on the first. No pets. (Sam says nobody checks.)',
  },
}

// The flat's location gains the line and the button it links to:
// body: [{ prose: 'place.flat' }, { prose: 'place.flat.lease', when: { not: { kv: 'signed' } } }],
// actions: [{ id: 'lease', label: 'Read the lease', effects: [{ panel: 'lease', with: { title: 'The lease' } }] }],
```

The button is drawn in the line, not in the room's list. The panel stays open while the player reads, and closes when signing closes it, when the player dismisses it (the [`closePanel`](/docs/reference/commands#closepanel) command), or when the story moves on. The [Panels](/docs/reference/panels#how-long-a-panel-stays-open) page has the details.

### Draw the panel

[`view.panel`](/docs/reference/view#panel) is `{ panel, with }` while a panel is open, and `null` otherwise. Draw a dialog for the names you know, send the button's command, and send `closePanel` when the player closes it. A refused command comes back with its reason, which is worth showing.

With the React UI, give `mountGame` a `panels` entry by name. [`PanelHost`](/docs/reference/react/components#panelhost) draws it in a dialog titled with `with.title`, and closing the dialog sends `closePanel`:

```ts tab="Plain JS" tab-group="framework"
// src/panel.ts: call drawPanel(runner) once, beside the runner.
import type { Runner } from '@ifloom/engine'

export function drawPanel(runner: Runner): void {
  const dialog = document.body.appendChild(document.createElement('dialog'))
  // Escape or the close button: tell the engine, which closes it in the state.
  dialog.oncancel = (event) => {
    event.preventDefault()
    runner.apply({ type: 'closePanel' })
  }
  const draw = () => {
    const open = runner.view().panel
    if (open?.panel !== 'lease') {
      if (dialog.open) dialog.close()
      return
    }
    const reason = document.createElement('p')
    const sign = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Sign it' })
    sign.onclick = () => {
      const done = runner.apply({ type: 'action', id: 'sign-lease' })
      if (!done.ok) reason.textContent = done.reason
    }
    const close = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Close' })
    close.onclick = () => runner.apply({ type: 'closePanel' })
    dialog.replaceChildren(
      Object.assign(document.createElement('h2'), { textContent: String(open.with.title ?? 'Lease') }),
      Object.assign(document.createElement('p'), { textContent: runner.game.prose?.line('lease.text', runner.state) ?? '' }),
      reason,
      sign,
      close,
    )
    if (!dialog.open) dialog.showModal()
  }
  runner.subscribe(draw)
  draw()
}
```

```tsx tab="React" tab-group="framework"
// src/main.tsx: the React UI draws the panel by name, in its dialog.
import { useState } from 'react'
import { mountGame, useGame, type PanelComponent } from '@ifloom/react'
import module from './game.ts'

function LeasePanel() {
  const { runner, send } = useGame()
  const [reason, setReason] = useState<string>()
  const sign = () => {
    const done = send({ type: 'action', id: 'sign-lease' })
    if (!done.ok) setReason(done.reason)
  }
  return (
    <div className="grid gap-3">
      <p>{runner.game.prose?.line('lease.text', runner.state)}</p>
      {reason ? <p role="alert">{reason}</p> : null}
      <button type="button" onClick={sign}>
        Sign it
      </button>
    </div>
  )
}

// Outside any component, so it's the same object on every render.
const panels: Record<string, PanelComponent> = { lease: LeasePanel }

mountGame(module.build(), { panels })
```

```vue tab="Vue" tab-group="framework"
<!-- src/LeasePanel.vue: put <LeasePanel /> once in App.vue. -->
<script setup lang="ts">
import { ref, watch } from 'vue'
import { runner, view } from './runner.ts'

const dialog = ref<HTMLDialogElement>()
const reason = ref<string>()

// Open and close the dialog as the state says.
watch(
  () => view.value.panel?.panel === 'lease',
  (open) => {
    reason.value = undefined
    if (open && !dialog.value?.open) dialog.value?.showModal()
    if (!open && dialog.value?.open) dialog.value.close()
  },
)

function sign() {
  const done = runner.apply({ type: 'action', id: 'sign-lease' })
  if (!done.ok) reason.value = done.reason
}
</script>

<template>
  <dialog ref="dialog" @cancel.prevent="runner.apply({ type: 'closePanel' })">
    <h2>{{ String(view.panel?.with.title ?? 'Lease') }}</h2>
    <p>{{ runner.game.prose?.line('lease.text', runner.state) }}</p>
    <p v-if="reason" role="alert">{{ reason }}</p>
    <button type="button" @click="sign">Sign it</button>
    <button type="button" @click="runner.apply({ type: 'closePanel' })">Close</button>
  </dialog>
</template>
```

**Gotchas.**
- Don't open a panel from a UI piece. A component can send commands, but a `[[ui:…]]` link isn't in the content's choices or buttons, so the checker, a replay of the line and a UI without that component don't know it does anything. An inline action does.
- A popup's text is read when it's drawn. A popup that's open while the state changes shows the new words the next time it's opened, or straight away in the React UI.
- Closing a panel is a command. Draw it from `view.panel`, not from a flag in your component, or a loaded save or an undo will disagree with the screen.

## See it in the showcase

In Small Town's flat, "the radiator knocks" opens Sam's welcome note with `[[ui:modal|…]]`, and at the café Ava's name opens her photo with `[[ui:image|…]]` (`examples/showcase/src/story/flat.ts` and `story/ava.prose.ts`). For panels, the café's Go to the counter opens the shop's counter (`story/cafe.ts`).
