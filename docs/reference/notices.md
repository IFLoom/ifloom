# Notices

A notice is something the game tells the player outside a scene: a letter came, the rent is due, the market is setting up. The [`notify`](/reference/effects#notify) effect raises one; the UI shows it as a toast or counts it on a badge from [`view.notices`](/reference/view#notices); the [`dismiss`](/reference/commands#dismiss) command marks it seen.

```ts
import { NOTICES_KEPT, dismiss, notify, type Notice } from '@ifloom/engine'
```

## A worked example

Doing the sums at home reminds the player the rent is due. The notice has an id, so raising it again later brings the same reminder back rather than stacking a second one.

```ts
activities: [
  {
    id: 'rent-due',
    effects: [{ kind: 'notify', id: 'rent', title: 'Rent is due on Friday', text: 'notice.rent', tag: 'money' }],
  },
],
prose: { 'notice.rent': 'Mrs Patel wants it by noon.' },
```

```ts
let state = apply(state, game, { type: 'activity', id: 'rent-due' }).state

const { unseen, byTag } = view(state, game).notices
unseen[0]  // { id: 'rent', title: 'Rent is due on Friday', text: 'Mrs Patel wants it by noon.', image: null, tag: 'money', turn: 2 }
byTag      // { money: 1 } — a badge on the purse

state = apply(state, game, { type: 'dismiss', id: 'rent' }).state
view(state, game).notices.unseen  // []
```

Notices pair naturally with [triggers](/reference/triggers): a trigger decides *when*, a notice tells the player.

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

A notice as the state keeps it in [`state.notices`](/reference/state#notices), oldest first.

| Field | What it holds |
|---|---|
| `id` | The `notify` effect's `id`, or one the engine makes up (`notice.<turn>.<n>`). |
| `title` | A short line, as written: shown as it is, not looked up. |
| `text` | A **prose key** for more words, if there are any. The view fills it in. |
| `image` | An image path, passed through. |
| `tag` | What it is about, for badges: `'post'`, `'money'`, `'quests'`. Any string the game likes. |
| `turn` | The [turn](/reference/state#turn) it was raised in. |
| `seen` | `true` once dismissed. |

## notify

```ts
function notify(
  state: GameState,
  notice: Omit<Notice, 'id' | 'turn' | 'seen'> & { id?: string },
): GameState
```

The state with a notice raised: added as the newest, unseen, stamped with the current [turn](/reference/state#turn). What the [`notify`](/reference/effects#notify) effect calls.

- **With an `id`** that an earlier notice has, the earlier one is taken out and this one goes in as the newest, unseen — even if the earlier one had been dismissed. Use a fixed id for anything that repeats: a reminder, a running count.
- **Without an `id`**, one is made from the turn: `notice.<turn>.<n>`, with the first `n` not already in the list.
- Only the newest [`NOTICES_KEPT`](#notices-kept) are kept; the oldest go first, seen or not.

```ts
const next = notify(state, { title: 'A parcel at the post office', tag: 'post' })
```

## dismiss

```ts
function dismiss(state: GameState, id?: string): GameState
```

The state with the notice `id` marked seen, or every notice if `id` is left out. Seen notices stay in the state; they are just no longer in `view.notices.unseen`. Returns the same state when there is nothing unseen to mark. What the [`dismiss`](/reference/commands#dismiss) command calls.

## NOTICES_KEPT

```ts
const NOTICES_KEPT = 50
```

How many notices the state keeps. When a 51st is raised, the oldest goes, whether it was seen or not.

## Gotchas

- **`text` is a prose key, not words.** The loader reports one with no prose (`no prose for "…"`) in triggers, activities and data scene choices. `title` is the opposite: written out, never looked up.
- **Notices are capped** at `NOTICES_KEPT`. They are a stream of news, not a record: keep anything the player must be able to find again in a [collection](/reference/collections).
- **Give a notice an `id` if it can be raised more than once.** Without one, a notice raised every turn piles up a copy each time. With one, it replaces itself.
- **A made-up id is only unique among the notices kept.** It is `notice.<turn>.<n>`, the first one not in the list, so once an old notice has gone its id can be handed out again. Name a notice you want to replace or dismiss by id later.
- Notices are not prose in a scene and do not stop anything: a notice raised while a scene is open waits in `view.notices` for the UI to show it.
- The `dismiss` command has no refusal of its own: it works with a scene open and with nothing to dismiss. Only a [lock](/reference/locks) that denies `'dismiss'` (or `'*'`) stops it. It counts as a command that took, so [triggers](/reference/triggers) and plugins' `after` hooks run after it.
