---
title: "Put a choice inside a line of text"
description: "Put a choice or an action inside a line of prose as a link, and add a tooltip to a word."
---
Use this when a choice reads better as part of the sentence than as a button under it: "Your phone is ringing. Pick it up, or let it ring." The same markup puts a short note on a word, such as who runs the launderette. You need a scene with choices, or a location with actions.

## Put a choice in the line

Write `[[act:id|words]]` where the link should go. `id` names one of the scene's choices, and `words` are what the link says:

```ts
import type { DataScene } from '@ifloom/engine'
import { text } from '@ifloom/engine'

export const hall: DataScene = {
  id: 'hall.phone',
  title: 'The hall',
  body: [text('Your phone is ringing on the hall table. [[act:answer|Pick it up]], or let it ring.')],
  choices: [
    { id: 'answer', label: 'Answer the phone', effects: [{ kv: 'answered', to: true }, { scene: 'ava.call' }] },
    { id: 'leave', label: 'Go out', effects: [{ scene: null }] },
  ],
}
```

The link takes the choice's place, so Go out is the only button under the text. It's still a choice. Its `blocked` reasons, its cost, its `once` and the content checker work as they do on a button, and greyed out it shows its reason. `[[act:answer]]` with no words shows the choice's own label.

## Put an action in the room's text

While no scene is open, `[[act:id]]` names one of the room's [actions](/docs/0.1.2/reference/glossary#action), a location's or the game's. The showcase's flat links to its "Read your messages" action once Ava's text has come:

```ts
import { text, type ActionDef, type Block } from '@ifloom/engine'
import { devices } from '@ifloom/plugin-devices'

export const line: Block = text('Your phone buzzes on the sill: a message. [[act:read-text|Check it]].', { when: { kv: 'textWaiting' } })

export const readText: ActionDef = { id: 'read-text', label: 'Read your messages', when: { kv: 'textWaiting' }, command: devices.open('texts') }
```

Give the line and the action the same `when`, so the link and the action come and go together. An action can send a command as well as its effects, so a link can do anything a button can. The command runs first, then the effects. While the command would be refused, the link is greyed out with that reason.

## Add a tooltip to a word

Write `[[tip:key|words]]`. The words show in the line, and the note is the [prose key](/docs/0.1.2/reference/glossary#prose-key) `key` in your content's `prose`:

```ts
import { text, type Content } from '@ifloom/engine'

export const movingDay: Content = {
  scenes: [
    {
      id: 'intro',
      title: 'Moving day',
      body: [text('The flat is above a [[tip:intro.launderette|launderette]]; it smells of warm cotton.')],
      choices: [{ id: 'unpack', label: 'Unpack', effects: [{ scene: null }] }],
    },
  ],
  prose: { 'intro.launderette': 'Sam from flat 2 runs it. Service washes, Monday to Saturday.' },
}
```

The note can hold [tokens](/docs/0.1.2/reference/prose#tokens) such as `{{playerName}}`, and a translation or a mod rewrites it by its key.

## Check it worked

Run `npm run check`. The checker reports each of these:

- An `[[act:id]]` that names a choice the scene doesn't have, or an action the room doesn't have.
- One choice put in the text twice, in one line or in two blocks that can show together.
- A `[[tip:key|…]]` whose key has no prose, and a `[[tip:key]]` with no words.
- Markup that isn't closed, or has no id.

Then play the scene. The link sits in the line, the choice is gone from the list under it, and the tooltip opens on hover, on keyboard focus and on a tap.

The React UI renders both with no code from you. To render them in a UI of your own, see [Render inline choices and tooltips](/docs/0.1.2/how-to/render/scene#render-inline-choices-and-tooltips). To open a dialog from a word, see [Show a popup](/docs/0.1.2/how-to/show-a-popup).

In the showcase, Small Town, the moving-day scene has a tooltip on "launderette", and the flat's Check it opens the phone's messages (`examples/showcase/src/story/moving-day.ts` and `story/flat.ts`). For more, see:

- [Inline actions and tooltips](/docs/0.1.2/reference/prose#inline-actions-and-tooltips) and [`InlineSpan`](/docs/0.1.2/reference/prose#inlinespan).
- [Choice](/docs/0.1.2/reference/scenes#choice) and [ActionDef](/docs/0.1.2/reference/actions#actiondef).
- [The prose checks](/docs/0.1.2/reference/checks#prose).
