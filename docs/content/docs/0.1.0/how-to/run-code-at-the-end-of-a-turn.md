---
title: "Run code at the end of a turn"
description: "Run the game's own code as each turn ends, before or after the plugins move on, and test it."
---
Use this when something has to happen as each turn ends that content alone can't say, such as energy coming back overnight, wages on a Friday or a choice of morning scene. You write it in the game's [rules](/docs/0.1.0/reference/glossary#rules), as [`onTurn`](/docs/0.1.0/reference/rules#onturn) or [`onTurnDone`](/docs/0.1.0/reference/rules#onturndone). For a kv key that goes back each turn, content's [`resets`](/docs/0.1.0/reference/rules#resets) is enough. For work once a day, see [Run things each day](/docs/0.1.0/how-to/schedule-daily-work).

## Write an onTurn hook

Add `onTurn` to the rules you pass `loadGame`. It gets the state of the turn that's beginning and returns the next one. Use the context's `apply` to apply effects as content would:

```ts
import type { GameRules } from '@ifloom/engine'

export const rules: GameRules = {
  // Energy back to full overnight.
  onTurn: (_state, { apply }) => apply([{ stat: 'energy', to: 100 }]),
}
```

A turn ends each time a [`turn`](/docs/0.1.0/reference/effects#turn) effect applies. With the [calendar](/docs/0.1.0/reference/plugins/calendar), that's going to bed or passing into a new day, unless you set it to end a turn each period or each week.

## Read the turn that ended

The context's `before` is the state the turn ended on, from before the counter moved on and before `resets` put keys back. Read the day's keys from it:

```ts
import type { GameRules } from '@ifloom/engine'

export const rules: GameRules = {
  onTurn: (state, { apply, before }) =>
    apply([
      // A late coffee costs a fifth of the night's rest.
      { stat: 'energy', to: before.kv.lateCoffee ? 80 : 100 },
      { kv: 'marketOpen', to: state.turn % 7 === 5 },
    ]),
}
```

Each `apply` works on the state the hook was handed, unless you pass the state to work on as its second argument. Chain them by passing what the last one returned, as the day's end below does.

## Act after the plugins with onTurnDone

The plugins' own `onTurn` hooks run after yours, and the calendar moves its clock on there. Write `onTurnDone` for code that needs the new day:

```ts
import type { GameRules } from '@ifloom/engine'

export const rules: GameRules = {
  onTurnDone: (state, { apply, query }) => (query('calendar/now')?.period === 'morning' ? apply([{ notify: 'A new day.', id: 'morning' }]) : state),
}
```

The order at the end of a turn is: the counter and `resets`, the game's `onTurn`, each plugin's `onTurn`, the game's `onTurnDone`, then each plugin's `onTurnDone`. Each gets what the one before it returned. A `turn` effect applied inside any of them does nothing, so one turn's rules never end another.

## Keep state of your own

Keep what isn't a stat, a kv key or an entity in the game's own state. Give the rules a `start` and name its type as `GameRules<S>`. Every function in the rules then reads it as `slice` and writes it with `set`:

```ts
import type { GameRules } from '@ifloom/engine'

type Days = { lived: number; tired: number }

export const rules: GameRules<Days> = {
  start: () => ({ lived: 0, tired: 0 }),
  onTurn: (state, { before, slice, set }) => set({ lived: slice.lived + 1, tired: slice.tired + ((before.stats.energy ?? 0) < 20 ? 1 : 0) }),
  conditions: { worn: (_state, _args, { slice }) => slice.tired >= 3 },
  view: (_state, { slice }) => ({ lived: slice.lived }),
}
```

The engine keeps it in saves at `state.plugins.game`, and a UI reads the `view` at `view.plugins.game`. Content asks `{ 'game/worn': true }`.

## Write a day's end step by step

A day's end that does several things runs them top to bottom, each `apply` on the state the last left. With the calendar's turn of a day and a game that ends turns only at bed, `state.turn` is the day that's starting:

```ts
import type { GameRules } from '@ifloom/engine'

const RENT = 30

export const rules: GameRules = {
  onTurn: (state, { apply, before, roll }) => {
    const weekday = state.turn % 7
    let next = state
    // Friday night: the week's wages, from a stat each shift adds to.
    if ((state.turn - 1) % 7 === 4) next = apply([{ stat: 'coins', by: next.stats.owed ?? 0 }, { stat: 'owed', to: 0 }], next)
    // Sunday morning: the rent, out of what the wages left.
    const evicted = weekday === 6 && (next.stats.coins ?? 0) < RENT
    if (weekday === 6 && !evicted) next = apply([{ stat: 'coins', by: -RENT }], next)
    // Exactly one morning scene, by priority.
    if (evicted) next = apply([{ scene: 'ending.evicted' }], next)
    else if (!before.kv.calledAva && roll(3, 'ava.sulk') === 0) next = apply([{ scene: 'ava.sulk' }], next)
    else next = apply([{ scene: { from: 'morning', otherwise: 'morning.plain' } }], next)
    return apply([{ stat: 'energy', to: 100 }], next)
  },
}
```

`roll(3, 'ava.sulk')` draws from the save's seed, the turn and the name, so a replay draws the same. If something else ends turns too, such as a choice's `turn` effect or a calendar that ends one each period, move the steps to `onTurnDone` and read the day from `query('calendar/now')`.

## Check it worked

The [content checker](/docs/0.1.0/reference/checks) can't look inside a hook, so a misspelt stat or scene in one isn't reported. Test it by ending a real turn, with the calendar's `calendar.sleep()` or a `turn` effect:

```ts
import { expect, it } from 'vitest'
import { applyEffects } from '@ifloom/engine'
import { freshState } from '@ifloom/engine/testing'
import module from '../src/game.ts'

const { game } = module.build()

it('fills energy overnight', () => {
  const tired = applyEffects(freshState(game), game, [{ stat: 'energy', to: 10 }])
  expect(applyEffects(tired, game, [{ turn: true }]).stats.energy).toBe(100)
})
```

The [debug plugin](/docs/0.1.0/reference/plugins/debug)'s `debug/time` and `debug/turn` set the clock and the counter without running any hook, so set them up with debug commands and then end the turn for real.

For more, see:

- [Rules](/docs/0.1.0/reference/rules), with [`onTurn`](/docs/0.1.0/reference/rules#onturn), [`onTurnDone`](/docs/0.1.0/reference/rules#onturndone), [`TurnContext`](/docs/0.1.0/reference/rules#turncontext) and [`resets`](/docs/0.1.0/reference/rules#resets).
- [Turns and time](/docs/0.1.0/explanation/turns-and-time), on why the turn is the engine's one clock.
- [Write your own condition, effect or macro](/docs/0.1.0/how-to/write-your-own-condition-or-effect).
