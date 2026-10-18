---
title: "Actions and tooltips in the text"
description: "Put a choice inside a line of prose as a link, add a tooltip to a word, and draw both in the React UI or yourself in plain DOM, React, Vue or Svelte."
---
Sometimes a choice reads better as part of the sentence than as a button under it: "Your phone is ringing. Pick it up, or let it ring." And sometimes a word needs a short note the player can open, such as who runs the launderette. This page shows how to write both, what the view gives a UI, and how to draw them with each framework.

## Put a choice in the line

Write `[[act:id|words]]` where the link should go. `id` is one of the scene's choices, and `words` are what the link says:

```ts
const hall: DataScene = {
  id: 'hall.phone',
  title: 'The hall',
  body: [{ text: 'hall.phone' }],
  choices: [
    { id: 'answer', effects: [{ kind: 'kv', key: 'answered', to: true }, { kind: 'scene', scene: 'ava.call' }] },
    { id: 'leave', effects: [{ kind: 'scene', scene: null }] },
  ],
}

const prose = {
  'hall.phone': 'Your phone is ringing on the hall table. [[act:answer|Pick it up]], or let it ring.',
  'hall.phone#answer': 'Answer the phone',
  'hall.phone#leave': 'Go out',
}
```

The choice is drawn in the line and left out of the list under it, so Go out is the only button. Everything else about it stays the same. It's still a choice: the `choose` command, its `blocked` reasons, its price, `once`, `irreversible`, the replay and the content checker all treat it as one. `[[act:answer]]` with no words uses the choice's own label.

A choice can send a command as well as its effects, so an inline action can do anything a button can. This one opens the phone's messages through the [devices plugin](/docs/plugins/devices):

```ts
import { openApp } from '@ifloom/plugin-devices'

{ id: 'read', command: openApp('texts'), effects: [{ kind: 'kv', key: 'readText', to: true }] }
```

The command runs first, then the effects. While the command would be refused (no phone at work, say), the choice is greyed out with that reason, in the line or in the list.

In a room, with no scene open, `[[act:id]]` names one of the room's buttons: a place's `actions` or the game's. Small Town's flat does this when a message has come:

```ts
{
  id: 'flat',
  body: [{ text: 'place.flat' }, { text: 'place.flat.text', when: textWaiting }],
  actions: [
    { id: 'bed', label: 'Go to bed', command: sleep() },
    { id: 'read-text', label: 'Read your messages', when: textWaiting, command: openApp('texts') },
  ],
}
// 'place.flat.text': 'Your phone buzzes on the sill: a message. [[act:read-text|Check it]].'
```

## Add a tooltip

Write `[[tip:key|words]]`. The words are shown in the line, and the note is the prose line `key`:

```ts
const prose = {
  intro: 'The flat is above a [[tip:intro.launderette|launderette]]; it smells of warm cotton.',
  'intro.launderette': 'Sam from flat 2 runs it. Service washes, Monday to Saturday.',
}
```

Because the note is a prose line, a translation or a mod can change it like any other, and it can hold [tokens](/docs/reference/prose#tokens) such as `{{playerName}}`.

## What the content checker reports

`ifloom check` and the loader report:

- `[[act:id]]` naming a choice the scene doesn't have, or a button the room doesn't have
- one choice drawn inline twice in one line, or in two blocks that can show together
- `[[tip:key|…]]` whose key has no prose, and `[[tip:key]]` with no words
- markup that isn't closed, or has no id
- a choice whose `command` is another `choose`

## What the view gives a UI

A paragraph that holds either kind of markup gets `spans` on its `text` or `say` beat: the same words in pieces. `text` still has every word, without the markup.

```ts
{
  kind: 'text',
  text: 'Your phone is ringing on the hall table. Pick it up, or let it ring.',
  spans: [
    { kind: 'text', text: 'Your phone is ringing on the hall table. ' },
    { kind: 'action', text: 'Pick it up', choice: { id: 'answer', label: 'Answer the phone', command: { type: 'choose', id: 'answer' } } },
    { kind: 'text', text: ', or let it ring.' },
  ],
}
```

An `action` span's `choice` is a full [`RenderedChoice`](/docs/reference/view#renderedchoice), so it has `disabled`, `price`, `warning` and `irreversible` when they apply. A `tip` span has the note as `tip`. [`InlineSpan`](/docs/reference/prose#inlinespan) has the details, and [`inlineChoices`](/docs/reference/view#inlinechoices) lists the inline actions of a body when you want them with the rest.

## The React UI

The React UI draws both with no code from you. An inline action is an [`InlineAction`](/docs/react/components#inlineaction): a button in the line, styled as a link by each preset. A tooltip is a [`Tip`](/docs/react/components#tip). Their parts are `inline-action`, `tip` and `tip-content`, for [`classes`](/docs/react/customising#4-change-the-built-in-classes) or plain CSS.

- **Greyed out.** An inline action that can't be taken has `data-disabled` and `aria-disabled="true"`. It stays focusable, and hovering it, focusing it or tapping it shows the reason in a small bubble.
- **Tooltips.** The note opens on hover with a mouse, on keyboard focus and on a tap, and closes on Escape or a tap elsewhere.
- **Screen readers.** The bubble is the button's description (`aria-describedby`), so it's read with the words.
- **Number keys.** Inline actions have none. With [`keys`](/docs/react/components#keyoptions) on, 1 to 9 go on picking the choices in the list, and Tab reaches the inline ones in reading order.

## Draw them yourself

With another framework, draw a beat's `spans` when it has them, and its `text` when it doesn't. Each piece is plain words, words in [bold or italics](/docs/reference/prose#bold-and-italics), an inline action or a tooltip:

1. Draw `text` spans as they are, and `bold` and `italic` spans in a `<strong>` and an `<em>`.
2. Draw an `action` span as a `<button>` with its words. When it's pressed and `choice.disabled` is unset, send `choice.command`. When it's greyed out, use `aria-disabled="true"` rather than `disabled`, so it can still be focused and its reason read.
3. Draw a `tip` span as a `<button>` with its words, and its `tip` as a note after it.
4. Give the note an `id` and the button `aria-describedby` with it, and show the note on hover, on focus and on a tap. A greyed-out action's reason works the same way.

This CSS shows a note while its button is hovered, focused, or tapped open (`aria-expanded="true"`). The `vue`, `svelte` and `vanilla` templates have the same rules in `src/styles.css`:

```css
.inline-action, .tip { padding: 0; border: 0; background: none; font: inherit; text-decoration: underline; cursor: pointer; }
.tip { text-decoration-style: dotted; }
.inline-action[aria-disabled='true'] { color: #888; cursor: not-allowed; }
.note { display: none; position: absolute; max-width: 16rem; margin: 1.8em 0 0 -4rem; padding: 0.3rem 0.6rem; border: 1px solid #ccc; background: #fff; }
:is(.inline-action, .tip):is(:hover, :focus-visible, [aria-expanded='true']) + .note { display: block; }
```

Then a line, in each framework. Use it for `text` and `say` beats:

```ts tab="Plain JS" tab-group="framework"
// src/line.ts: drawLine(document.createElement('p'), beat.text, beat.spans)
import type { InlineSpan, Runner } from '@ifloom/engine'

let notes = 0

export function drawLine(runner: Runner, line: HTMLElement, text: string, spans: InlineSpan[] | undefined): HTMLElement {
  if (!spans) {
    line.textContent = text
    return line
  }
  for (const span of spans) {
    if (span.kind === 'text') {
      line.append(span.text)
      continue
    }
    if (span.kind === 'bold' || span.kind === 'italic') {
      line.appendChild(document.createElement(span.kind === 'bold' ? 'strong' : 'em')).textContent = span.text
      continue
    }
    const button = line.appendChild(document.createElement('button'))
    button.type = 'button'
    button.className = span.kind === 'tip' ? 'tip' : 'inline-action'
    button.textContent = span.text
    const note = span.kind === 'tip' ? span.tip : span.choice.disabled
    if (span.kind === 'action') {
      if (span.choice.disabled) button.setAttribute('aria-disabled', 'true')
      else button.onclick = () => runner.apply(span.choice.command)
    }
    if (!note) continue
    const shown = line.appendChild(document.createElement('span'))
    Object.assign(shown, { id: `note-${(notes += 1)}`, role: 'tooltip', className: 'note', textContent: note })
    button.setAttribute('aria-describedby', shown.id)
    button.setAttribute('aria-expanded', 'false')
    // A tap opens the note, and another closes it.
    if (!button.onclick) button.onclick = () => button.setAttribute('aria-expanded', String(button.getAttribute('aria-expanded') !== 'true'))
  }
  return line
}
```

```tsx tab="React" tab-group="framework"
// src/Line.tsx: React with the runner, without @ifloom/react.
import { useId, useState } from 'react'
import type { InlineSpan, Runner } from '@ifloom/engine'

export function Line({ runner, text, spans }: { runner: Runner; text: string; spans?: InlineSpan[] }) {
  const id = useId()
  const [open, setOpen] = useState<number | null>(null)
  if (!spans) return <>{text}</>
  return (
    <>
      {spans.map((span, at) => {
        if (span.kind === 'text') return <span key={at}>{span.text}</span>
        if (span.kind === 'bold') return <strong key={at}>{span.text}</strong>
        if (span.kind === 'italic') return <em key={at}>{span.text}</em>
        const note = span.kind === 'tip' ? span.tip : span.choice.disabled
        const press = () => {
          if (span.kind === 'action' && !span.choice.disabled) runner.apply(span.choice.command)
          else setOpen(open === at ? null : at)
        }
        return (
          <span key={at}>
            <button
              type="button"
              className={span.kind === 'tip' ? 'tip' : 'inline-action'}
              aria-disabled={span.kind === 'action' && span.choice.disabled ? true : undefined}
              aria-describedby={note ? `${id}-${at}` : undefined}
              aria-expanded={note ? open === at : undefined}
              onClick={press}
            >
              {span.text}
            </button>
            {note ? <span id={`${id}-${at}`} role="tooltip" className="note">{note}</span> : null}
          </span>
        )
      })}
    </>
  )
}
```

```vue tab="Vue" tab-group="framework"
<!-- src/Line.vue, as in the vue template: <Line :text="beat.text" :spans="beat.spans" /> -->
<script setup lang="ts">
import { ref, useId } from 'vue'
import type { InlineSpan } from '@ifloom/engine'
import { runner } from './runner.ts'

defineProps<{ text: string; spans?: InlineSpan[] }>()
const id = useId()
const open = ref<number | null>(null)

function press(span: InlineSpan, at: number) {
  if (span.kind === 'action' && !span.choice.disabled) runner.apply(span.choice.command)
  else open.value = open.value === at ? null : at
}
const note = (span: InlineSpan) => (span.kind === 'tip' ? span.tip : span.kind === 'action' ? span.choice.disabled : undefined)
</script>

<template>
  <template v-if="!spans">{{ text }}</template>
  <template v-for="(span, at) in spans" v-else :key="at">
    <template v-if="span.kind === 'text'">{{ span.text }}</template>
    <strong v-else-if="span.kind === 'bold'">{{ span.text }}</strong>
    <em v-else-if="span.kind === 'italic'">{{ span.text }}</em>
    <template v-else>
      <button
        type="button"
        :class="span.kind === 'tip' ? 'tip' : 'inline-action'"
        :aria-disabled="span.kind === 'action' && span.choice.disabled ? 'true' : undefined"
        :aria-describedby="note(span) ? `${id}-${at}` : undefined"
        :aria-expanded="note(span) ? open === at : undefined"
        @click="press(span, at)"
      >
        {{ span.text }}
      </button>
      <span v-if="note(span)" :id="`${id}-${at}`" role="tooltip" class="note">{{ note(span) }}</span>
    </template>
  </template>
</template>
```

```svelte tab="Svelte" tab-group="framework"
<!-- src/Line.svelte, as in the svelte template: <Line text={beat.text} spans={beat.spans} /> -->
<script lang="ts">
  import type { InlineSpan } from '@ifloom/engine'
  import { runner } from './runner.ts'

  let { text, spans }: { text: string; spans?: InlineSpan[] } = $props()
  const id = $props.id()
  let open: number | null = $state(null)

  function press(span: InlineSpan, at: number) {
    if (span.kind === 'action' && !span.choice.disabled) runner.apply(span.choice.command)
    else open = open === at ? null : at
  }
  const note = (span: InlineSpan) => (span.kind === 'tip' ? span.tip : span.kind === 'action' ? span.choice.disabled : undefined)
</script>

{#if !spans}{text}{:else}{#each spans as span, at (at)}{#if span.kind === 'text'}{span.text}{:else if span.kind === 'bold'}<strong>{span.text}</strong>{:else if span.kind === 'italic'}<em>{span.text}</em>{:else}<button
        type="button"
        class={span.kind === 'tip' ? 'tip' : 'inline-action'}
        aria-disabled={span.kind === 'action' && span.choice.disabled ? 'true' : undefined}
        aria-describedby={note(span) ? `${id}-${at}` : undefined}
        aria-expanded={note(span) ? open === at : undefined}
        onclick={() => press(span, at)}>{span.text}</button
      >{#if note(span)}<span id="{id}-{at}" role="tooltip" class="note">{note(span)}</span>{/if}{/if}{/each}{/if}
```

**Gotchas:**
- Don't also draw the inline choices in your list. The view has already left them out of `view.scene.choices` and `view.actions`.
- Keep the words in the line even when a choice can't be taken. An inline action whose choice is hidden comes as plain words, so the sentence still reads.
- The backlog keeps inline actions as plain words, so nothing in it can be pressed. Tooltips, bold and italics stay.

## See it in the showcase

Small Town's moving-day scene has a tooltip on "launderette". In the flat, once Ava's text has come, the room's prose says "Your phone buzzes on the sill: a message. Check it." and Check it opens the phone's messages. The content is in `examples/showcase/src/story/moving-day.ts` and `story/flat.ts`.
