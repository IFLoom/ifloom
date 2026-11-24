---
title: "Make a choice that needs a thing"
description: "How-to for a choice or an action the player can take only while they hold a thing: greyed out with a reason, or hidden, and the thing used up when it's chosen."
---
Use this when a choice should need something the player carries, such as a sandwich to share or a key for a door. The choice is greyed out with a reason, or hidden, until the player holds the [thing](/docs/reference/glossary#thing), and choosing it can use the thing up. You need the thing declared as an entity, as the showcase's sandwich is:

```ts
import type { Content } from '@ifloom/engine'

export const things: Content = {
  kinds: [{ id: 'item', label: 'Thing', plural: 'Things', listed: false }],
  entities: [{ id: 'sandwich', of: 'item', name: 'sandwich', description: 'Cheese and pickle, wrapped in paper.' }],
}
```

The examples on this page name it by its [entity reference](/docs/reference/glossary#entity-reference), `item:sandwich`.

## Refuse the choice without the thing

Add a [`blocked`](/docs/reference/actions#blocked) entry written with `need` and `holding`. The choice stays on screen, greyed out, with the reason as its disabled text:

```ts
import { holding, need, type DataScene } from '@ifloom/engine'

export const samHi: DataScene = {
  id: 'sam.hi',
  title: 'Sam',
  speaker: 'sam',
  body: [{ text: 'Sam is walking a dog that is clearly not theirs. "Dog-sitting," they say. "He’s in charge."' }],
  choices: [
    {
      id: 'share',
      label: 'Share your sandwich with Sam',
      blocked: [need('You have nothing to share.', holding('item:sandwich'))],
      effects: [{ stat: 'friendship', by: 5, of: 'character:sam' }],
    },
    { id: 'bye', label: 'Pat the dog and go', effects: [{ scene: null }] },
  ],
}
```

`holding('item:sandwich')` writes the condition `{ entity: 'item:sandwich', at: 'you', gte: 1 }`, which holds while whoever the player is playing holds at least one. Pass a count for more, `holding('item:sandwich', 2)`. `need(reason, when)` refuses with `reason` until `when` holds. The engine refuses the `choose` command for the same reason, so a button and a refusal always agree.

## Hide the choice instead

Hide the choice while the player lacks the thing, so they don't know it's there. Either works:

- **Give the choice a `when`.** `when: holding('item:sandwich')` leaves the choice off the screen until it holds.
- **Add `hide: true` to the `blocked` entry.** The choice goes while the entry holds, and the reason stays for `whyNot` and a test.

```ts
import { holding, type Blocked } from '@ifloom/engine'

export const hidden: Blocked[] = [{ when: { not: holding('item:sandwich') }, reason: 'You have nothing to share.', hide: true }]
```

## Use the thing up

Take the thing in the choice's effects with `take`, which writes `{ entity: 'item:sandwich', by: -1 }`. To hand it to someone instead, `move` it to them, and they hold it from then on:

```ts
import { holding, move, need, take, type Choice } from '@ifloom/engine'

export const share: Choice = {
  id: 'share',
  label: 'Share your sandwich with Sam',
  blocked: [need('You have nothing to share.', holding('item:sandwich'))],
  effects: [take('item:sandwich'), { stat: 'friendship', by: 5, of: 'character:sam' }],
}

export const giveShell: Choice = {
  id: 'shell',
  label: 'Give her the shell from the river',
  when: holding('keepsake:shell'),
  effects: [move('keepsake:shell', 'character:ava')],
}
```

A thing can only move to a holder whose kind is [unique](/docs/reference/entities#unique), such as the cast's characters. The same fields work on an [action](/docs/reference/actions#actiondef), such as a location's "Unlock the shed" button.

## Check it worked

Run `npm run check`, which reports a kind the game doesn't declare. Then play to the scene without the thing: the choice is greyed out with your reason, or gone. Get the thing and come back, choose it, and the thing leaves what you hold.

In the showcase, Ava's `shell` choice in [`examples/showcase/src/story/ava.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/ava.ts) shows only while you hold the river shell, and gives it to her. For more, see:

- [Blocked](/docs/reference/actions#blocked), [`need`](/docs/reference/actions#need) and the [`entity` condition](/docs/reference/conditions#entity).
- The [`entity` effect](/docs/reference/effects#entity) and [give, take, move and holding](/docs/reference/entities#give-take-move-and-holding).
- [Things and holders](/docs/explanation/entities-and-traits#things-and-holders).
