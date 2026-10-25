---
title: "Triggers"
description: "Effects that run by themselves after a command once a condition holds, once a game or once a turn."
---
A trigger is a list of effects that happens by itself. The first time its condition holds after a command, its effects apply, without the player pressing anything. Use one for a note under the door the first time the player steps out, a bill that comes due, or a scene that interrupts the walk home.

```ts
import { type TriggerDef } from '@ifloom/engine'
```

## A worked example

These are the showcase's two triggers. The first time the player steps onto the high street, Sam's welcome note turns up: a [notice](/docs/reference/notices) says so, and the player is given the note, a [thing](/docs/reference/entities#notes-photos-and-other-things-made-in-play) they keep in the phone's Notes app. Every Sunday from the first week on, the rent goes out.

```ts
import { give, type Content } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'

const town: Content = {
  kinds: [{ id: 'note', label: 'Note', listed: false }],
  entities: [{ id: 'welcome', of: 'note', name: 'Welcome note', description: 'Bins go out Thursday. — Sam, flat 2' }],
  triggers: [
    {
      id: 'welcome',
      when: places.at('high-street'),
      effects: [
        { notify: 'A note under your door', text: 'notice.welcome', tag: 'post' },
        give('note:welcome'),
      ],
    },
    {
      id: 'rent',
      once: 'turn',
      when: { all: [calendar.weekday(6), calendar.day({ gte: 6 })] },
      effects: [
        { stat: 'coins', by: -30 },
        { notify: 'Rent paid: 30 coins', id: 'rent', tag: 'money' },
      ],
    },
  ],
  prose: { 'notice.welcome': 'Welcome to the building! Bins go out Thursday.' },
}
```

`welcome` fires after the first command that leaves the player on the high street, and never again. `rent` fires at most once a turn. A turn is a day in the showcase, so it fires once each Sunday. Its fixed notice id means the next Sunday's notice replaces the last one instead of adding another.

```ts
state.fired  // { welcome: 1, rent: 6 }: the turn each one last fired in
```

## TriggerDef

```ts
type TriggerDef = {
  id: string
  when: Condition
  effects: EffectRef[]
  once?: 'game' | 'turn'
}
```

| Field | What it does |
|---|---|
| `id` | Names it in [`state.fired`](/docs/reference/state#fired) and in the loader's problems. |
| `when` | A [condition](/docs/reference/conditions). The trigger fires when this holds and it hasn't already fired. |
| `effects` | What happens: [effects](/docs/reference/effects), calls to a plugin's or the game's own (`{ 'game/payRent': {} }`, see [Calls by name](/docs/reference/custom#plugincall)), as in a data scene choice. |
| `once` | `'game'` (the default) fires once in the whole game. `'turn'` fires at most once a [turn](/docs/reference/state#turn), in every turn its condition holds after a command. In a game whose turn is a day, that's once a day. |

Declare triggers in your [content](/docs/reference/loader#content)'s `triggers`. They merge by id, so a pack's trigger replaces one with the same id.

## When triggers fire

After every command that took, inside [`apply`](/docs/reference/commands#what-happens-in-order):

1. The command runs.
2. The triggers are tested in the order the game lists them, each against the state the one before it left. A trigger that holds and is due records the current turn in `state.fired`, then its effects apply.
3. The scene left on screen is counted as [seen](/docs/reference/state#seen), so a scene a trigger opens counts.
4. Plugins' `onCommand` hooks run, and see what the triggers did.

There's one pass per command. A trigger that an earlier trigger makes true fires in the same pass, because it's tested later. One that a later trigger makes true waits for the next command.

## Gotchas

- **Triggers don't fire on `start`.** A new game is built, not run, so a trigger whose condition already holds on the first frame fires after the player's first command. To open the game with something, put it in the intro scene.
- **They don't fire on a refused command.** Nor do they fire under [`applyEffects`](/docs/reference/effects#applyeffects), or when a game sets the state by hand.
- **Fired is fired.** A `once: 'game'` trigger never fires again, even when its condition stops holding and holds again. Only `once: 'turn'` repeats, at most once a turn. For "every time X happens", put the effects on the choice or action that does X.
- **A trigger is tested on every command.** That includes ones that take no time, such as [`dismiss`](/docs/reference/commands#dismiss). A `once: 'turn'` trigger whose condition holds all turn fires after the first command of each turn, whatever that command is.
- **A scene effect cuts in.** A trigger with a `{ scene: 'id' }` effect puts that scene on screen whether or not one was open. If it shouldn't interrupt certain scenes, add `{ not: { scene: [...] } }` naming them to its `when`.
- **`text` in a `notify` effect is its words.** It's written out, with tokens filled as it's shown, as its title is.

## See it in an example

- Small Town: the park's `visitors` trigger in [`examples/showcase/src/story/park.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/park.ts) runs `once: 'turn'`, `welcome` in [`examples/showcase/src/story/moving-day.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/moving-day.ts) runs once, and `rent` in [`examples/showcase/src/story/flat.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/flat.ts) charges 30 coins on Sundays.
- The Corner Café: [`examples/cafe/src/world/triggers.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/cafe/src/world/triggers.ts) watches the till and the staff with `overdrawn`, `empty` and `review`.
