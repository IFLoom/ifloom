---
title: "Make plugins work together"
description: "Make your plugin do more in a game that has another plugin, by asking it by name, and test it alone and with each partner."
---
Use this when your plugin should do more in a game that also has another plugin, such as a loyalty card that only stamps in the café when the game has places. A plugin never imports another. It names its partners in `cooperates`, asks them by name, and does without them when the game lacks them. You need a plugin first, as [Write a plugin](/docs/how-to/write-a-plugin) makes.

## List the partners in cooperates

Put the ids of the plugins yours works with in [`cooperates`](/docs/reference/plugin-queries#cooperates):

```ts
import { definePlugin } from '@ifloom/engine/plugin'

type Card = { stamps: number; free: number }

export const loyalty = definePlugin<Card>({
  id: 'loyalty',
  version: 2,
  cooperates: ['calendar', 'places'],
  start: () => ({ stamps: 0, free: 0 }),
})
```

Content written for your plugin may then name a partner's conditions, effects and commands even in a game without it. The content checker leaves them alone there, and in play the condition is false, the effect does nothing and the command is refused. A partner nobody lists is reported:

```text
content · action coffee · no plugin condition named "calendar/weekend"; the game has no plugin "calendar"
```

## Ask a partner's query

A query is an answer one plugin gives another, such as where the player is or what day it is. Ask it with the context's `query`, and give a fallback after `??` for a game without the partner:

```ts
import { definePlugin } from '@ifloom/engine/plugin'

export const menu = definePlugin<null>({
  id: 'menu',
  version: 1,
  cooperates: ['calendar', 'places'],
  start: () => null,
  view: (state, { query }) => ({
    // The calendar's day, or the turn in a game without one.
    day: query('calendar/now')?.day ?? state.turn,
    open: (query('places/here') ?? 'cafe') === 'cafe',
  }),
})
```

The queries first-party plugins answer each other, such as `calendar/now` and `places/here`, are typed in every program by the engine's [`PartnerQueries`](/docs/reference/plugin-queries#partnerqueries), so you name no type. Code outside a plugin, such as a test or a tool, asks one with [`pluginQuery`](/docs/reference/plugin-queries#pluginquery).

## Answer a query of your own

Add a function to `queries`, worked out with your plugin's own context. Declare its answer in the engine's `QueryRegistry`, so a game that imports your plugin reads it typed:

```ts
import { definePlugin } from '@ifloom/engine/plugin'

declare module '@ifloom/engine' {
  interface QueryRegistry {
    'loyalty/stampsLeft': () => number
  }
}

export const loyalty = definePlugin<{ stamps: number }>({
  id: 'loyalty',
  version: 1,
  start: () => ({ stamps: 0 }),
  queries: { stampsLeft: (_state, _args, { slice }) => 5 - slice.stamps },
})
```

Another plugin that doesn't import yours names the type itself, and does without it: `query<number>('loyalty/stampsLeft') ?? null`. Content can't call a query, so one is for code only.

## Let content call a partner

A plugin's own `content`, or a game's content written for it, can use a partner's conditions and effects once `cooperates` lists it. A weekend brunch that stamps the card twice needs only a `calendar/weekend` in its `when`:

```ts
import type { ActionDef } from '@ifloom/engine'

export const brunch: ActionDef = {
  id: 'brunch',
  label: 'Order the weekend brunch',
  when: { 'calendar/weekend': true },
  effects: [{ 'loyalty/stamp': true }, { 'loyalty/stamp': true }],
}
```

Without the calendar, `calendar/weekend` is false, so the room never offers the brunch.

## Test it alone and with each partner

Run the same tests in every case with [`partnerCases`](/docs/reference/testing#partnercases). It gives the plugin alone, then with each partner, and `has` says whether a case loads one:

```ts
import { describe, expect, it } from 'vitest'
import type { Command, Content } from '@ifloom/engine'
import { freshState, loadChecked, partnerCases, play } from '@ifloom/engine/testing'
import { places } from '@ifloom/plugin-places'
import { loyalty } from '../src/loyalty.ts'

const cafe: Content = { actions: [{ id: 'coffee', label: 'Buy a coffee', effects: [{ 'loyalty/stamp': true }] }] }
const coffee: Command = { type: 'action', id: 'coffee' }

for (const { name, plugins, has } of partnerCases(loyalty, [places({ start: 'cafe' })])) {
  describe(`the loyalty card, ${name}`, () => {
    it('stamps a coffee', () => {
      const map: Content = { entities: has('places') ? [places.location({ id: 'cafe', name: 'Café', exits: [], body: [] })] : [] }
      const game = loadChecked([cafe, map], { id: 'corner-cafe', title: 'The Corner Café', plugins })
      expect(loyalty.read(play(freshState(game), game, coffee), game).stamps).toBe(1)
    })
  })
}
```

That makes `the loyalty card, alone` and `the loyalty card, with places`. Give what a partner changes a test block of its own, with the partner set up as that test needs. `partnerCases` throws for a partner missing from `cooperates`.

For more, see:

- [Plugin queries](/docs/reference/plugin-queries), with [`queries`](/docs/reference/plugin-queries#queries), [`cooperates`](/docs/reference/plugin-queries#cooperates) and [`PartnerQueries`](/docs/reference/plugin-queries#partnerqueries).
- [Testing helpers](/docs/reference/testing), with [`partnerCases`](/docs/reference/testing#partnercases).
- [Plugins](/docs/explanation/plugins#plugins-cooperate-by-name), on why plugins cooperate by name.
