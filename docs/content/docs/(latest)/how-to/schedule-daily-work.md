---
title: "Run things each day: cooldowns, new-day work and pay"
description: "How-to for what a life sim does day by day: reset a value each day, allow something once a day, run code once at the start of each day, rest a scene between visits, keep part of a day for work, and pay wages once a week."
---
Use this for the work a life sim does as the days go by, such as the day's weather, a coffee allowed once a day, a scene that rests between visits, or wages paid on a Friday. Each is a few lines on features the engine and the plugins already have. The steps assume the [calendar](/docs/reference/plugins/calendar) with its default turn of a day (see [Set up days and times of day](/docs/how-to/set-up-the-clock)), and say where a turn of a period changes things.

## Put a value back each day

List the [kv](/docs/reference/glossary#kv) keys that go back at the end of each turn in your content's [`resets`](/docs/reference/rules#resets), with the value each goes back to:

```ts
import type { Content } from '@ifloom/engine'

export const cafe: Content = {
  resets: { hadCoffee: false },
}
```

The engine puts them back as each turn ends, before any rule runs. With a turn of a period, that's each period, so use the next step's new-day rule for a key that should last the whole day.

## Allow something once a day

Refuse the action while its key is set, and set the key in its effects. The showcase café's coffee:

```ts
import type { ActionDef } from '@ifloom/engine'

export const coffee: ActionDef = {
  id: 'coffee',
  label: 'Buy a coffee',
  cost: { stats: { coins: 3 } },
  blocked: [{ when: { kv: 'hadCoffee' }, reason: 'One is enough for today.' }],
  effects: [{ stat: 'energy', by: 15 }, { kv: 'hadCoffee', to: true }],
}
```

With `hadCoffee` in `resets`, the button is greyed out with its reason until the next day. A choice or an action that needs no key of its own takes [`once`](/docs/reference/actions#once) instead, `once: { per: 'turn', reason: 'She has a queue.' }`.

## Run something at the start of each day

Write the work in the game's [`rules.onTurnDone`](/docs/reference/rules#onturndone), in `src/rules.ts`. It runs as each turn ends, after the calendar has moved on, so it sees the new day. Keep the last day it ran on in the kv store and compare:

```ts
import type { GameRules } from '@ifloom/engine'

const WEATHER = ['drizzle', 'sun', 'wind']

export const rules: GameRules = {
  onTurnDone: (state, { apply, query, roll }) => {
    // The calendar's day, or the turn in a game without one.
    const day = query('calendar/now')?.day ?? state.turn
    if (state.kv.lastNewDay === day) return state
    return apply([
      { kv: 'lastNewDay', to: day },
      { kv: 'weather', to: WEATHER[roll(WEATHER.length, 'weather')] },
      { kv: 'ateToday', to: false },
    ])
  },
}
```

With a turn of a day this runs every turn. With a turn of a period it runs on the first turn of each day, and the other turns return the state as it was. `roll` draws from the save's seed and the turn, so an undo or a replay gets the same weather. A pass that skips several days runs it once for each turn the pass ends.

## Rest a scene between visits

The [`since`](/docs/reference/conditions#since) condition counts whole turns since a scene was seen or a choice was chosen, and `last: true` counts from the latest time. A café [storylet](/docs/reference/glossary#storylet) that rests for three days after it's drawn:

```ts
import type { DataScene } from '@ifloom/engine'

export const crossword: DataScene = {
  id: 'cafe.crossword',
  title: 'Seven down',
  drawnFrom: ['cafe'],
  when: { not: { since: 'cafe.crossword', last: true, lt: 3 } },
  body: [{ text: 'The man at the next table taps his paper with a pencil.' }],
  choices: [{ id: 'leave', label: 'Leave him to it', effects: [{ scene: null }] }],
}
```

`since` fails for a scene the player hasn't seen, so `not` lets a fresh scene in. For a rest the player can see, put the condition in a `blocked` entry with a reason instead, such as `{ when: { since: 'cafe.counter#chat', last: true, lt: 2 }, reason: 'You only just talked.' }`. A message that comes again rests the same way, with the messages plugin's own [`messages.since`](/docs/reference/plugins/messages#messagessince): `{ not: messages.since('ava.chat.rain', { lt: 3 }) }`.

## Keep part of a day for work

A [lock](/docs/reference/locks) with `effect: 'calendar/pass'` refuses only the commands that would pass time. On the first morning, the player can buy a coffee but can't go for a jog:

```ts
import type { Content } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'

export const firstDay: Content = {
  locks: [
    {
      when: { all: [{ kv: 'phase', is: 'first-day' }, calendar.period('morning')] },
      deny: ['action', 'custom'],
      effect: 'calendar/pass',
      reason: 'No time for that. Work starts soon.',
    },
  ],
}
```

The lock denies `action` and `custom`, the room's actions and plugin commands, rather than `'*'`, because a lock that denies everything empties the room. Add `'choose'` to stop scene choices that pass time too.

## Pay wages once a week

A [job](/docs/reference/plugins/jobs)'s rank pays at the end of each shift. To pay once a week, pay each shift into a stat the player doesn't spend, and move it into coins as Friday ends. Declare the stat unlisted, so it stays out of the stat list:

```ts
import type { StatDef } from '@ifloom/engine'
import type { RankDef } from '@ifloom/plugin-jobs'

export const owed: StatDef = { id: 'owed', label: 'Wages owed', max: 9999, listed: false }

// In the job's ranks: each shift adds to what's owed, not to coins.
export const help: RankDef = { id: 'help', name: 'Weekend help', pay: { owed: 12 } }
```

Then pay it out in `rules.onTurnDone`. Its `before` is the state the turn ended on, so the rule can ask whether the day that has just ended was a Friday:

```ts
import { holds, type GameRules } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'

export const rules: GameRules = {
  onTurnDone: (state, { apply, before, game }) => {
    const owed = state.stats.owed ?? 0
    const fridayEnded = holds(before, game, calendar.weekday(4)) && !holds(state, game, calendar.weekday(4))
    if (owed <= 0 || !fridayEnded) return state
    return apply([{ stat: 'coins', by: owed }, { stat: 'owed', to: 0 }, { notify: `Payday: ${owed} coins`, id: 'payday', tag: 'money' }])
  },
}
```

Weekday 4 is Friday in a seven-day week that starts on a Monday. Missed shifts add nothing to `owed`, so the week's pay is the wage times the shifts worked. No price names `owed`, so the player can't spend it, and a UI shows it by reading `view.statsById.owed`.

## Check it worked

Run `npm run check`, which reports a stat, kv store or scene that a lock, a `blocked` entry or a `since` names and the game doesn't have. It can't look inside `rules`, so test them with a [route](/docs/how-to/test-a-route) that plays a week with `calendar.sleep()`. Then play in `npm run dev`. Buy a coffee and the button greys out until morning, and go to bed on a Friday after a shift to see the payday notice.

In the showcase, Small Town, the coffee and its reset are in [`examples/showcase/src/story/cafe.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/cafe.ts), and Ava's small talk rests three days per line in `src/story/ava.ts`. For more, see:

- [Game rules](/docs/reference/rules), with [`onTurnDone`](/docs/reference/rules#onturndone), [`TurnContext`](/docs/reference/rules#turncontext) and [`resets`](/docs/reference/rules#resets).
- The [`since`](/docs/reference/conditions#since) condition and [locks](/docs/reference/locks#lock).
- [Turns, scenes and the room](/docs/explanation/turns-and-time).
