---
title: "Tell the player when something happens"
description: "How-to for a notice raised by a trigger: run effects by themselves when a condition first holds or once a turn, tell the player with the notify effect, replace a repeating notice by id, and count notices on a badge by tag."
---
Use this when something happens outside the story the player is reading, such as a note under the door or the rent going out. A [trigger](/docs/reference/glossary#trigger) runs effects by itself after a command once its condition holds, and a [notice](/docs/reference/notices) tells the player. The steps build the showcase's two triggers.

## Run effects when a condition first holds

Add a trigger to your content's `triggers`, with the condition in `when` and the effects to run. A trigger fires once in the whole game unless it says otherwise:

```ts
import { give, type Content } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'

export const movingDay: Content = {
  kinds: [{ id: 'note', label: 'Note', listed: false }],
  entities: [{ id: 'welcome', of: 'note', name: 'Welcome note', description: 'Bins go out Thursday. Sam, flat 2' }],
  triggers: [
    {
      id: 'welcome',
      when: places.at('high-street'),
      effects: [{ notify: 'A note under your door', text: 'Welcome to the building! Bins go out Thursday.', tag: 'post' }, give('note:welcome')],
    },
  ],
}
```

The first command that leaves the player on the high street fires `welcome`. It raises the notice and gives the player the note to keep.

## Tell the player with a notice

The [`notify` effect](/docs/reference/effects#notify) raises the notice. Its `notify` is the title, and `text` is the longer words, both written in place and both able to hold [tokens](/docs/reference/prose#tokens). `image` adds a picture. `tag` is a word of your own for what the notice is about, such as `'post'` or `'money'`, so a UI can count notices by tag on a badge.

## Repeat it every turn

Give the trigger `once: { per: 'turn' }` to let it fire again, at most once a [turn](/docs/reference/glossary#turn). Give its notice a fixed `id`, so each new one replaces the last instead of stacking:

```ts
import type { TriggerDef } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'

export const rent: TriggerDef = {
  id: 'rent',
  once: { per: 'turn' },
  when: { all: [calendar.weekday(6), calendar.day({ gte: 6 })] },
  effects: [
    { stat: 'coins', by: -30 },
    { notify: 'Rent paid: 30 coins', id: 'rent', tag: 'money' },
  ],
}
```

A turn is a day in the showcase, so the rent goes out once each Sunday from the first week on.

## Check it worked

Play past the condition in `npm run dev`. The React UI shows the notice as a toast in a corner, with [`Notices`](/docs/reference/react/components#notices), until the player dismisses it. A test can check the notice in the view and dismiss it:

```ts given
import { apply, view } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'

let next = apply(state, game, places.go('high-street')).state
view(next, game).notices.unseen[0].title // 'A note under your door'
view(next, game).notices.byTag // { post: 1 }

next = apply(next, game, { type: 'dismiss' }).state
view(next, game).notices.unseen // []
```

`state.fired` holds the turn each trigger last fired in, such as `{ welcome: 1, rent: 6 }`.

## Variations

**A notice from a choice or an action.** Put the `notify` effect in the choice's or the action's effects, and it shows after the player presses it. A Pay the rent button would raise the same notice by hand.

**A scene instead of a notice.** A trigger can open a scene with `{ scene: 'flat.ring' }`, which interrupts whatever is open. Add `{ not: { scene: [...] } }` to its `when` for the scenes it shouldn't interrupt.

In the showcase, Small Town, the `welcome` trigger is in [`examples/showcase/src/story/moving-day.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/moving-day.ts) and `rent` in [`story/flat.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/flat.ts). For more, see:

- [Triggers](/docs/reference/triggers), with when they run and their caveats.
- [Notices](/docs/reference/notices) and the [`notify` effect](/docs/reference/effects#notify).
- [Render notices](/docs/how-to/render/stats-and-things#render-notices), for a UI of your own.
- [Triggers, notices and inputs](/docs/explanation/state-and-commands#triggers-notices-and-inputs).
