---
title: "Notices"
description: "Notices: news shown beside the story as a toast or a badge, raised by the notify effect and marked seen with dismiss."
---
A notice is something the game tells the player outside a scene, such as a note under the door or the rent going out. The [`notify`](/docs/reference/effects#notify) effect raises one. The UI reads [`view.notices`](/docs/reference/view#notices) to show it as a toast or count it on a badge, and the [`dismiss`](/docs/reference/commands#dismiss) command marks it seen.

```ts
import { NOTICES_KEPT, dismiss, notify, type Notice } from '@ifloom/engine'
```

## A worked example

In the showcase, the rent goes out every Sunday and the player gets a notice about it. The notice has an id, so the next week's replaces it instead of stacking a second one.

```ts
import type { Content } from '@ifloom/engine'

const town: Content = {
  actions: [
    {
      id: 'pay-rent',
      label: 'Pay the rent',
      effects: [
        { stat: 'coins', by: -30 },
        { notify: 'Rent paid: 30 coins', id: 'rent', text: 'notice.rent', tag: 'money' },
      ],
    },
  ],
  prose: { 'notice.rent': 'The landlord sends a receipt. Same again next Sunday.' },
}
```

```ts
import { apply, view } from '@ifloom/engine'

state = apply(state, game, { type: 'action', id: 'pay-rent' }).state

const { unseen, byTag } = view(state, game).notices
unseen[0]  // { id: 'rent', title: 'Rent paid: 30 coins', text: 'The landlord sends a receipt. Same again next Sunday.', image: null, tag: 'money', turn: 6 }
byTag      // { money: 1 }, for a badge on the purse

state = apply(state, game, { type: 'dismiss', id: 'rent' }).state
view(state, game).notices.unseen  // []
```

Notices go well with [triggers](/docs/reference/triggers). The trigger decides when something happens, and the notice tells the player. The showcase's rent is a trigger.

## Notice

```ts
type Notice = {
  id: string
  title: string
  text?: string
  image?: string
  tag?: string
  turn: number
  seen: boolean
}
```

A notice as the state keeps it in [`state.notices`](/docs/reference/state#notices), oldest first.

| Field | What it holds |
|---|---|
| `id` | The `notify` effect's `id`, or one the engine makes up (`notice.<turn>.<n>`). |
| `title` | A short line. It's shown as written, not looked up. |
| `text` | A prose key for more words, if there are any. The view fills it in. |
| `image` | An image path, passed through. |
| `tag` | What it's about, for badges, such as `'post'`, `'money'` or `'quests'`. Any string the game likes. |
| `turn` | The [turn](/docs/reference/state#turn) it was raised in. |
| `seen` | `true` once dismissed. |

## notify

```ts
import { notify } from '@ifloom/engine'

function notify(
  state: GameState,
  notice: Omit<Notice, 'id' | 'turn' | 'seen'> & { id?: string },
): GameState
```

Returns the state with a notice raised. It goes in as the newest, unseen, and stamped with the current [turn](/docs/reference/state#turn). The [`notify`](/docs/reference/effects#notify) effect calls this.

- **With an `id`** that an earlier notice has, the earlier one is taken out and this one goes in as the newest and unseen, even if the earlier one had been dismissed. Use a fixed id for anything that repeats, such as a reminder or a running count.
- **Without an `id`**, one is made from the turn: `notice.<turn>.<n>`, with the first `n` not already in the list.
- **Only the newest [`NOTICES_KEPT`](#notices_kept) are kept.** The oldest go first, seen or not.

```ts
const next = notify(state, { title: 'A parcel at the post office', tag: 'post' })
```

## dismiss

```ts
import { dismiss } from '@ifloom/engine'

function dismiss(state: GameState, id?: string): GameState
```

Returns the state with the notice `id` marked seen, or every notice if you leave `id` out. Seen notices stay in the state, but they're no longer in `view.notices.unseen`. It returns the same state when there's nothing unseen to mark. The [`dismiss`](/docs/reference/commands#dismiss) command calls this.

## NOTICES_KEPT

```ts
import { NOTICES_KEPT } from '@ifloom/engine'

const NOTICES_KEPT = 50
```

How many notices the state keeps. When a 51st is raised, the oldest goes, whether it was seen or not.

## Gotchas

- **`text` is a prose key, not words.** The [content checker](/docs/reference/checks) reports one with no prose (`no prose for "…"`) wherever the effect is. `title` is the opposite. It's written out and never looked up.
- **Notices are capped at `NOTICES_KEPT`.** They're for news, not records. Give the player anything they must be able to find again as a [thing they hold](/docs/reference/entities#notes-photos-and-other-things-made-in-play), such as a note.
- **Give a notice an `id` if it can be raised more than once.** Without one, a notice raised every turn adds a copy each time. With one, it replaces itself.
- **A made-up id is only unique among the notices kept.** It's `notice.<turn>.<n>`, the first one not in the list, so once an old notice has gone its id can be handed out again. If you want to replace or dismiss a notice by id later, name it yourself.
- **Notices don't stop anything.** They aren't prose in a scene. A notice raised while a scene is open waits in `view.notices` for the UI to show it.
- **`dismiss` has no refusal of its own.** It works with a scene open and with nothing to dismiss. Only a [lock](/docs/reference/locks) that denies `'dismiss'` (or `'*'`) stops it. It counts as a command that took, so [triggers](/docs/reference/triggers) and plugins' `onCommand` hooks run after it.

## See it in an example

- Small Town: the `welcome` trigger in [`examples/showcase/src/story/moving-day.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/moving-day.ts) raises a notice tagged `post`, and the `rent` trigger in [`examples/showcase/src/story/flat.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/flat.ts) one with an `id`.
- The Corner Café: the `overdrawn`, `empty` and `review` triggers in [`examples/cafe/src/world/triggers.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/cafe/src/world/triggers.ts) each raise one, and its `reputation` stat in [`examples/cafe/src/world/stats.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/cafe/src/world/stats.ts) raises a level notice.
