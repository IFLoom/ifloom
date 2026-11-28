---
title: "Triggers"
description: "A trigger is a list of effects that runs by itself after a command once its condition holds, once a game or once a turn."
---
A trigger is a list of effects that runs by itself after a command, once its condition holds, without the player pressing anything. Your content declares triggers in `triggers`, for a note under the door the first time the player steps out, a bill that comes due or a scene that interrupts the walk home. [Tell the player when something happens](/docs/0.1.2/how-to/show-a-notice) pairs one with a notice.

In the showcase: `examples/showcase/src/story/flat.ts`, whose `rent` trigger charges 30 coins every Sunday, and `examples/showcase/src/story/moving-day.ts`, whose `welcome` trigger fires once.

```ts
import type { TriggerDef } from '@ifloom/engine'
```

## TriggerDef

A list of effects the game declares in `triggers`, applied after a command once its `when` holds. Every field is in [`TriggerDef`](/docs/0.1.2/api/engine#triggerdef).

A trigger fires once in the whole game unless it says otherwise. With `once: { per: 'turn' }` it fires at most once a [turn](/docs/0.1.2/reference/state#turn), in each turn its condition holds after a command, which is once a day in a game whose turn is a day. `once` takes the `per` of a choice's [`Once`](/docs/0.1.2/reference/actions#once). The `effects` are any [effects](/docs/0.1.2/reference/effects), the game's and plugins' [calls](/docs/0.1.2/reference/effects#effectcall) included. Triggers merge by id, so a pack's trigger replaces one with the same id.

Inside [`apply`](/docs/0.1.2/reference/commands#apply), after every command that took, the engine runs these steps:

1. The command runs.
2. The engine tests the triggers in the order the game lists them, each against the state the one before it left. A trigger that holds and is due records the turn in `state.fired`, then its effects apply.
3. The engine counts the scene left on screen as [seen](/docs/0.1.2/reference/state#seen), so a scene a trigger opens counts.
4. Plugins' `onCommand` hooks run, and see what the triggers did.

There is one pass per command. A trigger that an earlier trigger makes true fires in the same pass, because the engine tests it later. One that a later trigger makes true waits for the next command.

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

## State

[`state.fired`](/docs/0.1.2/reference/state#fired) holds the turn each trigger last fired in, by id, such as `{ welcome: 1, rent: 6 }`. A trigger with an entry there and no `once: { per: 'turn' }` never fires again.

## Checks

The [content checker](/docs/0.1.2/reference/checks) checks each trigger's `when` and `effects` as it checks any condition and effect. [`loadGame`](/docs/0.1.2/reference/content#checks) reports a trigger id that the game's content declares twice.

## Caveats

- Triggers don't fire on a new game. A trigger whose condition holds on the first screen fires after the player's first command, so open the game with the intro scene instead.
- Triggers don't fire on a refused command, under [`applyEffects`](/docs/0.1.2/reference/effects#applyeffects), or when code sets the state by hand.
- A trigger that has fired once a game never fires again, even when its condition stops holding and holds again. For effects on every time something happens, put them on the choice or action that does it.
- The engine tests triggers on every command, those that take no time included, such as [`dismiss`](/docs/0.1.2/reference/commands#dismiss). A `per: 'turn'` trigger whose condition holds all turn fires after the turn's first command, whatever it is.
- A trigger with a `scene` effect opens that scene over any scene that's open. Add `{ not: { scene: [...] } }` to its `when` for the scenes it shouldn't interrupt.
