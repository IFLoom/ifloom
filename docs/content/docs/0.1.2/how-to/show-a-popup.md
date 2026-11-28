---
title: "Show a popup"
description: "Open a dialog from a word in the prose, either one that only shows words or one whose buttons change the game."
---
Use this to open a dialog from a word in the text. Choose one of two ways, by whether the dialog changes the game:

- **A popup that only shows something**, such as the full text of a note, is a [UI piece](/docs/0.1.2/reference/glossary#ui-piece), `[[ui:modal|words|key]]`. Opening it isn't a command, so the save and the command log never see it.
- **A modal that changes the game**, such as a lease to sign, is a [panel](/docs/0.1.2/reference/glossary#panel) opened by an [inline action](/docs/0.1.2/how-to/put-a-choice-in-a-line). Opening it is a command, its buttons send commands, and a replay opens it as play did.

## Write a popup that only shows words

Write `[[ui:modal|words|key|title]]` where the link should go. The words show in the line, and the popup shows the [prose key](/docs/0.1.2/reference/glossary#prose-key) `key`. The title is optional, and without one the popup is titled with the words:

```ts
import { text, type Block, type Content } from '@ifloom/engine'

export const flatLine: Block = text(
  "Boxes, mostly. The window looks over the high street, and [[ui:modal|the radiator knocks|notice.welcome|Sam's note]] when it feels like it.",
)

export const notes: Content = {
  prose: { 'notice.welcome': 'Welcome to the building! Bins go out Thursday. The radiator knocks; ignore it. Sam, flat 2' },
}
```

The popup's line can have several paragraphs, bold, italics and [tokens](/docs/0.1.2/reference/prose#tokens), and a translation or a mod rewrites it by its key. `[[ui:image|words|path]]` works the same way for a picture, which the words open large.

The React UI renders both with no code from you, as [`InlineModal`](/docs/0.1.2/reference/react/components#inlinemodal) and [`InlineImage`](/docs/0.1.2/reference/react/components#inlineimage).

## Render the popup in a UI of your own

The view gives the line's beat a `ui` [span](/docs/0.1.2/reference/prose#inlinespan), `{ type: 'ui', name: 'modal', text, args }`, where `args[0]` is the prose key and `args[1]` the title. Read the line from the game's prose for the current state, and open a native `<dialog>` with `showModal()` when the words are pressed. The `<dialog>` closes on Escape, keeps focus inside while it's open, and returns focus to the link when it closes. Render the line's other spans as [Render inline choices and tooltips](/docs/0.1.2/how-to/render/scene#render-inline-choices-and-tooltips) does, and call this for a `ui` span named `modal`:

```ts tab="Plain JS" tab-group="framework"
// src/popup.ts
import type { InlineSpan, Runner } from '@ifloom/engine'

export function drawPopup(runner: Runner, line: HTMLElement, span: Extract<InlineSpan, { type: 'ui' }>): void {
  const [key, title] = span.args
  const text = key ? runner.game.prose?.line(key, runner.state) : undefined
  // A key with no prose shows as its words, so the line still reads.
  if (text === undefined) return void line.append(span.text)
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
<!-- src/Popup.vue: <Popup v-if="span.type === 'ui' && span.name === 'modal'" :span="span" /> -->
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

## Write a modal that changes the game

Open a [panel](/docs/0.1.2/reference/panels) with the [`panel` effect](/docs/0.1.2/reference/effects#panel), from an action the line links to. Give the panel's button an action with no label, which the panel sends and the room doesn't show:

```ts
import { text, type Content } from '@ifloom/engine'

export const lease: Content = {
  actions: [
    {
      id: 'sign-lease',
      cost: { stats: { coins: 50 }, reasons: { coins: "You can't cover the deposit yet." } },
      blocked: [{ when: { kv: 'signed' }, reason: 'You signed it already.' }],
      effects: [{ kv: 'signed', to: true }, { panel: null }],
    },
  ],
  prose: { 'lease.text': 'Twelve months, rent on the first. No pets. (Sam says nobody checks.)' },
}

// The flat's location gains the line and the action it links to.
export const leaseLine = text('The [[act:lease|lease]] is still on the table, unsigned.', { when: { not: { kv: 'signed' } } })
export const readLease = { id: 'lease', label: 'Read the lease', effects: [{ panel: 'lease', with: { title: 'The lease' } }] }
```

The panel stays open while the player reads. It closes when signing closes it with `{ panel: null }`, when the player dismisses it with the [`closePanel`](/docs/0.1.2/reference/commands#closepanel) command, or when the scene changes or the turn ends.

Render the panel by its name from `view.panel`. With the React UI, give `mountGame` a `panels` entry, `{ lease: LeasePanel }`, and [`PanelHost`](/docs/0.1.2/reference/react/components#panelhost) renders it in a dialog titled with `with.title`. In a UI of your own, follow [Render a panel](/docs/0.1.2/how-to/render/timers-minigames-panels#render-a-panel), and send `{ type: 'action', id: 'sign-lease' }` from its button.

## Check it worked

Run `npm run check`, which reports an `[[act:…]]` that names no action. With the React UI, [`checkUiHints`](/docs/0.1.2/reference/react/hints#checkuihints) also reports a `[[ui:modal|…]]` whose key has no prose. Then press the words in the game. The popup opens over the story and closes on Escape. Signing the lease without 50 coins shows the cost's reason, and with them closes the panel and takes the line away.

Don't open a panel from a UI piece. A `[[ui:…]]` link isn't a choice or an action, so the checker, a replay and a UI without that piece don't know it does anything. An inline action does.

In the showcase, Small Town, the flat's "the radiator knocks" opens Sam's note, and at the café Ava's name opens her photo (`examples/showcase/src/story/flat.ts` and `story/ava.ts`). For more, see:

- [UI pieces](/docs/0.1.2/reference/prose#ui-pieces) and the React UI's [inline pieces](/docs/0.1.2/reference/react/hints#inlineui).
- [Panels](/docs/0.1.2/reference/panels) and the [`panel` effect](/docs/0.1.2/reference/effects#panel).
- [Presentation lives in UI packages](/docs/0.1.2/explanation/design#presentation-lives-in-ui-packages).
