---
title: "Make a choice that needs a thing"
description: "Offer a choice or an action only while the player has a thing, greyed out with a reason or hidden, and use the thing up."
---
Use this when a choice should need something the player carries, such as a sandwich to share or a key for a door. The choice is greyed out with a reason, or hidden, until the player has the [thing](/docs/reference/glossary#thing), and choosing it can use the thing up. You need the thing declared as an entity, as the showcase's sandwich is, and a plugin that keeps things, a [receiver](/docs/reference/glossary#receiver), such as the [inventory](/docs/reference/plugins/inventory). A game with no such plugin gates on a kv key instead, as [Hand-roll an inventory with variables](/docs/how-to/hand-roll-an-inventory) does.

```ts
import type { Content } from '@ifloom/engine'

export const things: Content = {
  kinds: [{ id: 'item', label: 'Thing', plural: 'Things', listed: false }],
  entities: [{ id: 'sandwich', of: 'item', name: 'sandwich', description: 'Cheese and pickle, wrapped in paper.' }],
}
```

The examples on this page name it by its [entity reference](/docs/reference/glossary#entity-reference), `item:sandwich`.

## Refuse the choice without the thing

Add a [`blocked`](/docs/reference/actions#blocked) entry written with `need` and an [`owned`](/docs/reference/conditions#owned) condition. The choice stays on screen, greyed out, with the reason as its disabled text:

```ts
import { need, type DataScene } from '@ifloom/engine'

export const samHi: DataScene = {
  id: 'sam.hi',
  title: 'Sam',
  speaker: 'sam',
  body: [{ text: 'Sam is walking a dog that is clearly not theirs. "Dog-sitting," they say. "He’s in charge."' }],
  choices: [
    {
      id: 'share',
      label: 'Share your sandwich with Sam',
      blocked: [need('You have nothing to share.', { owned: 'item:sandwich' })],
      effects: [{ stat: 'friendship', by: 5, of: 'character:sam' }],
    },
    { id: 'bye', label: 'Pat the dog and go', effects: [{ scene: null }] },
  ],
}
```

`{ owned: 'item:sandwich' }` holds while whoever the player is playing has at least one, in whichever plugin keeps it. Add a range for more, `{ owned: 'item:sandwich', gte: 2 }`. `need(reason, when)` refuses with `reason` until `when` holds. The engine refuses the `choose` command for the same reason, so a button and a refusal always agree.

## Hide the choice instead

Hide the choice while the player lacks the thing, so they don't know it's there. Either works:

- **Give the choice a `when`.** `when: { owned: 'item:sandwich' }` leaves the choice off the screen until it holds.
- **Add `hide: true` to the `blocked` entry.** The choice goes while the entry holds, and the reason stays for `whyNot` and a test.

```ts
import type { Blocked } from '@ifloom/engine'

export const hidden: Blocked[] = [{ when: { not: { owned: 'item:sandwich' } }, reason: 'You have nothing to share.', hide: true }]
```

## Use the thing up

Take the thing in the choice's effects with [`release`](/docs/reference/effects#release), which takes one back from whichever plugin keeps it. To hand it to someone instead, `release` it from the player and `receive` it to them, and they have it from then on:

```ts
import { need, type Choice } from '@ifloom/engine'

export const share: Choice = {
  id: 'share',
  label: 'Share your sandwich with Sam',
  blocked: [need('You have nothing to share.', { owned: 'item:sandwich' })],
  effects: [{ release: 'item:sandwich' }, { stat: 'friendship', by: 5, of: 'character:sam' }],
}

export const giveShell: Choice = {
  id: 'shell',
  label: 'Give her the shell from the river',
  when: { owned: 'keepsake:shell' },
  effects: [{ release: 'keepsake:shell' }, { receive: 'keepsake:shell', to: 'character:ava' }],
}
```

A thing can only go to someone whose kind is [unique](/docs/reference/entities#unique), such as the cast's characters. The same fields work on an [action](/docs/reference/actions#actiondef), such as a location's "Unlock the shed" button.

## Check it worked

Run `npm run check`, which reports a kind the game doesn't declare. Then play to the scene without the thing: the choice is greyed out with your reason, or gone. Get the thing and come back, choose it, and the thing leaves what you have.

In the showcase, Ava's `shell` choice in [`examples/showcase/src/story/ava.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/ava.ts) shows only while you have the river shell, and gives it to her. For more, see:

- [Blocked](/docs/reference/actions#blocked), [`need`](/docs/reference/actions#need) and the [`owned` condition](/docs/reference/conditions#owned).
- The [`receive`](/docs/reference/effects#receive) and [`release`](/docs/reference/effects#release) effects, and [Receivers](/docs/reference/entities#receivers).
- [Who has what](/docs/explanation/entities-and-traits#who-has-what).
