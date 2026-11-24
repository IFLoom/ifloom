---
title: "Notices"
description: "A notice is news the game tells the player beside the story, shown as a toast or counted on a badge."
---
A notice is news the game tells the player outside a scene, such as a note under the door or the rent going out. The [`notify`](/docs/reference/effects#notify) effect raises one, and the [`dismiss`](/docs/reference/commands#dismiss) command marks it seen. [Tell the player when something happens](/docs/how-to/show-a-notice) raises one from a trigger.

In the showcase: `examples/showcase/src/story/flat.ts`, whose `rent` trigger raises a notice with a fixed id every Sunday.

```ts
import { dismiss, notify, type Notice } from '@ifloom/engine'
```

## Notice

A notice as the state keeps it in [`state.notices`](/docs/reference/state#notices), with its words, its turn and whether it's been seen. Every field is in [`Notice`](/docs/api/engine#notice).

`title` and `text` are words in place, shown as written with their tokens filled as the view renders them. `image` is a picture, which the view passes through [`artSrc`](/docs/reference/prose#artsrc). `tag` says what the notice is about, any string the game chooses, such as `'post'` or `'money'`, so a UI can count notices on a badge. `turn` is the [turn](/docs/reference/state#turn) the notice was raised in.

A notice raised with an `id` replaces any earlier notice with that id, so a fixed id suits anything that repeats. This action pays the rent and replaces last week's notice:

```ts
import type { ActionDef } from '@ifloom/engine'

export const payRent: ActionDef = {
  id: 'pay-rent',
  label: 'Pay the rent',
  effects: [
    { stat: 'coins', by: -30 },
    { notify: 'Rent paid: 30 coins', id: 'rent', text: 'The landlord sends a receipt.', tag: 'money' },
  ],
}
```

## State

[`state.notices`](/docs/reference/state#notices) lists the notices oldest first, and keeps the newest 50. When a 51st is raised, the oldest goes, seen or not. A seen notice stays in the state with `seen: true` until it's pushed out.

## View

`view.notices.unseen` lists every notice not yet dismissed, newest first, each a [`NoticeView`](/docs/api/engine#noticeview). `view.notices.byTag` counts the unseen ones by tag, for a badge. To render them, see [Render notices](/docs/how-to/render/stats-and-things#render-notices).

## Functions

### notify

Returns the state with a notice raised, newest and unseen, stamped with the current turn. Every parameter is in [`notify`](/docs/api/engine#notify).

The [`notify`](/docs/reference/effects#notify) effect calls it. A notice with an `id` that an earlier notice has takes that one out and goes in as the newest, unseen even if the earlier one was dismissed. A notice without an `id` gets `notice.<turn>.<n>`, with the first `n` not already in the list.

```ts given
import { notify } from '@ifloom/engine'

const next = notify(state, { title: 'A parcel at the post office', tag: 'post' })
```

### dismiss

Returns the state with one notice marked seen, or every notice when `id` is left out. Every parameter is in [`dismiss`](/docs/api/engine#dismiss).

The [`dismiss`](/docs/reference/commands#dismiss) command calls it. It returns the same state when there's nothing unseen to mark. The command has no refusal of its own, so it works with a scene open, and only a [lock](/docs/reference/locks) that denies `'dismiss'` or `'*'` stops it. It counts as a command that took, so triggers and plugins' `onCommand` hooks run after it.

```ts given
import { dismiss } from '@ifloom/engine'

const next = dismiss(state, 'rent')
```

## Checks

The [content checker](/docs/reference/checks) reports a `notify` effect whose `text` is a prose key, since the player would read the key.

## Caveats

- A notice without an `id` adds a copy each time it's raised, so one raised every turn piles up.
- A made-up id is unique only among the notices kept. Once an old notice has gone, its id can be given out again, so name a notice yourself to replace or dismiss it later.
- The state keeps 50 notices. Anything the player must find again belongs in a [thing they hold](/docs/how-to/give-the-player-things), such as a note.
- A notice doesn't interrupt the story. One raised while a scene is open waits in `view.notices` for the UI to show it.
