---
title: "End the game"
description: "How-to for ending a story: an ending scene whose choice starts over, several endings chosen by the state, counting an ending as finishing the game, stopping play after an ending, and what a new game keeps."
---
Use this when the story should stop. An ending is a scene the story doesn't move on from, with a choice that starts over. You need a game with a scene to lead into it, as [Create a game](/docs/how-to/create-a-game) makes. The steps use The Letter, the novel example, which has two endings.

## Write an ending scene

Write the ending as a scene whose one choice sends the [`newGame`](/docs/reference/commands#newgame) command. Every UI renders it like any other choice, so it needs no code:

```ts
import type { DataScene } from '@ifloom/engine'

export const posted: DataScene = {
  id: 'end.posted',
  title: 'The end',
  body: [{ text: 'You write the address she gives you on a fresh envelope. It goes in the postbox on the corner, and that is that.' }],
  choices: [{ id: 'again', label: 'Read it again', command: { type: 'newGame' }, effects: [] }],
}
```

Lead into it with a `{ scene: 'end.posted' }` effect, from a choice or a [trigger](/docs/reference/triggers).

## Choose between endings

Write one scene per ending, and send the player to one with choices whose `when` reads the state. The Letter's last scene offers the better ending only to a reader with enough courage:

```ts
import type { Choice } from '@ifloom/engine'

export const lastChoices: Choice[] = [
  { id: 'hand', label: 'Give her the letter yourself', when: { stat: 'courage', gte: 3 }, effects: [{ scene: 'end.kept' }] },
  { id: 'post', label: 'Say you’ll send it on', effects: [{ scene: 'end.posted' }] },
]
```

To send the player to an ending without asking, put the effects in a trigger or an action and test the state there, such as `{ chose: 'ch2.stairs#truth' }` for a choice made chapters ago.

## Count it as finishing the game

Give your content a `finished` condition that holds on the endings that count. After each command, the runner tests it, and the first time it holds, the runner records the time in the player's [profile](/docs/reference/profile) under `core:finished`:

```ts
import type { Content } from '@ifloom/engine'

export const ch3: Content = {
  finished: { scene: ['end.kept', 'end.posted'] },
}
```

The record outlives every save, so a title screen can offer New Game+ from then on. [Offer New Game+](/docs/how-to/offer-new-game-plus) carries things over into the next run with `carryOver`.

## Stop play after an ending

Leave the ending's `choices` empty when the player should start again from the menu instead. While a scene is open the room offers no actions or exits, so nothing on screen can be pressed. With the React UI's [`pages`](/docs/reference/react#mountoptions) on, the player's menu has Title screen, which leads to New game, Continue and Load. Without `pages`, the menu still loads a save, so say so in the ending's words.

To stop every other command too, such as a message reply or a debug button, set the kv key `phase` with the ending and add a [lock](/docs/reference/locks) that denies everything in that phase:

```ts
import type { Content } from '@ifloom/engine'

export const over: Content = {
  locks: [{ id: 'over', when: { kv: 'phase', is: 'over' }, deny: ['*'], reason: 'The story is over.' }],
  actions: [{ id: 'give-up', label: 'Hand in your notice', effects: [{ kv: 'phase', to: 'over' }, { scene: 'end.evicted' }] }],
}
```

The `newGame` command is never refused, so a Start again choice still works under the lock.

## Know what a new game keeps

A `newGame` choice starts a new game in place, with the player's play settings and a random seed. The runner starts a fresh history, backlog and command log, so undo can't go back past it. The profile carries on, so the player's settings, `core:finished`, unlocks and achievements stay. Nothing from the run carries over into the new game, and the player's saves are left as they were.

## Check it worked

Play to each ending with `npm run dev`, and press the choice that starts over. The game opens on its first scene with your settings. `npm run playtest` plays until it meets a `newGame` command and stops there, so its transcript ends at an ending. A test can play there too:

```ts given
import { apply, view } from '@ifloom/engine'

const ended = apply(state, game, { type: 'choose', id: 'post' }).state
view(ended, game).scene.title // 'The end'
apply(ended, game, { type: 'choose', id: 'again' }) // { ok: true, newGame: true, state: … }
```

In The Letter, the endings, `finished` and `carryOver` are in [`examples/novel/src/story/ch3.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/novel/src/story/ch3.ts). For more, see:

- The [`newGame` command](/docs/reference/commands#newgame) and [`runner.newGame`](/docs/reference/runner#newgame).
- [The profile](/docs/reference/profile) and [`CarryOver`](/docs/reference/state#carryover).
- [Locks](/docs/reference/locks) and the [`phase` key](/docs/reference/state#phase).
- [A scene and the room](/docs/explanation/turns-and-time#a-scene-and-the-room).
