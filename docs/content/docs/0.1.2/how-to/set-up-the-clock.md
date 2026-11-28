---
title: "Set up days and times of day"
description: "Give a game days and times of day with the calendar plugin, with actions that pass time, a bed and a curfew."
---
Use this when time matters to the story, such as a café that shuts in the evening or a job on weekdays. You need the [calendar plugin](/docs/0.1.2/reference/plugins/calendar) (see [Add a plugin](/docs/0.1.2/how-to/add-a-plugin)). With no options, a day has five periods, from `morning` to `late`, a week has seven days, a [turn](/docs/0.1.2/reference/glossary#turn) is a day, and the game starts on Monday morning.

## Configure the calendar

Pass [`CalendarOptions`](/docs/0.1.2/reference/plugins/calendar#calendaroptions) to `calendar()` in `src/game.ts`, and list it first in `plugins` so that every plugin after it sees the new day. The showcase starts on the night the player moves in:

```ts
import { loadGame, type Content } from '@ifloom/engine'
import { defineGame } from '@ifloom/cli/game'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'

declare const town: Content

export const clock = calendar({ start: { day: 0, period: 'night' } })

export default defineGame({
  build: () => loadGame([town], { id: 'small-town', title: 'Small Town', plugins: [clock, places({ start: 'flat' })] }),
})
```

Choose the rest of the options for the shape of your game:

- **`periods`** names the parts of a day, in order. Give a [`PeriodDef`](/docs/0.1.2/reference/plugins/calendar#perioddef) for a word the player reads that differs from the id: `periods: ['dawn', 'day', { id: 'dusk', label: 'after dark' }]`.
- **`turn`** sets how long a turn is: `'period'`, `'day'` or `'week'`. A management game a week at a time uses `'week'`.
- **`week`** and **`weekend`** set the days in a week and which of them, counting from `0`, are the weekend.
- **`start`** sets the day, from `0`, and the period a new game starts at.

The options are code, so a mod can't change them. [Turns, scenes and the room](/docs/0.1.2/explanation/turns-and-time#the-calendar-makes-a-turn-a-period-a-day-or-a-week) explains how the clock and the turn keep step.

## Let actions pass time

Put `calendar.pass(n)` in an action's or a choice's effects to move the clock on `n` periods. A shift at the office takes the rest of the day:

```ts
import type { ActionDef } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'

export const work: ActionDef = { id: 'work', label: 'Do a shift', cost: { stats: { energy: 30 } }, effects: [calendar.pass(2), { stat: 'coins', by: 20 }] }
```

Passing time ends a turn at each boundary it crosses, so with a turn of a day, a pass from the evening into the next morning ends one. The button's price shows where the clock lands, such as `until evening`. An action with no pass takes no time, so buying a coffee leaves the clock where it was.

## Close a week with a button

In a game whose turn is a week, end the turn with `{ turn: true }` in place of a pass. The clock jumps to the first morning of the next week:

```ts
import type { ActionDef } from '@ifloom/engine'

export const closeTheWeek: ActionDef = { id: 'closeTheWeek', label: 'Close the week', effects: [{ turn: true }] }
```

The same effect with a turn of a day moves the clock to the next morning, and with a turn of a period to the next period.

## Add a bed

Give a location an action that sends `calendar.sleep()`. Bed passes time to the first period of the next day:

```ts
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'

export const flat = places.location({
  id: 'flat',
  name: 'Your flat',
  description: 'Home',
  exits: ['high-street'],
  body: [{ text: 'Boxes, mostly. The radiator knocks when it feels like it.' }],
  actions: [{ id: 'bed', label: 'Go to bed', command: calendar.sleep() }],
})
```

Bed works from the last three periods, and is refused with `Too early.` before them. Change that with `sleep: { from: ['night', 'late'], wake: 'morning' }`, or leave bed out of the game with `sleep: false`.

## Set a curfew

The curfew stops the player passing time over the end of the day, so the night ends in bed. A button that would run past the last period stays pressable with the warning `That would run past dawn.`, and the engine refuses it with the same line. The curfew always binds unless you give it a [condition](/docs/0.1.2/reference/conditions):

```ts
import { calendar } from '@ifloom/plugin-calendar'

export const nightOwl = calendar({ curfew: { not: { kv: 'nightOwl' } } })
```

With `curfew: false` it never binds. An intro whose scenes carry the clock through the night uses a curfew that doesn't hold during the intro, such as `{ not: { kv: 'phase', is: 'arrival' } }`.

## Read the time in content

Use the calendar's [conditions](/docs/0.1.2/reference/plugins/calendar#conditions) anywhere a condition goes. They're how a location sets its opening hours and a character keeps a schedule:

```ts
import type { Block } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'

export const lines: Block[] = [
  { text: 'Market day: the square is full of stalls.', when: calendar.weekday(5) },
  { text: 'The street lamps flicker on.', when: calendar.period('evening', 'night') },
  { text: 'A week in, the boxes are nearly all unpacked.', when: calendar.day({ gte: 6 }) },
]
```

Weekdays count from `0`, Monday in a seven-day week. `calendar.day()` counts from `0` too, so `{ gte: 6 }` holds from the day the header calls Day 7. To print the time, write `{{calendar/day}}`, `{{calendar/weekday}}` or `{{calendar/period}}` in a line: `Day {{calendar/day}}, a {{calendar/weekday}} {{calendar/period}}.` reads `Day 1, a Monday morning.` on a new game.

## Check it worked

Run `npm run check`, which reports a `start` or `sleep` period the calendar doesn't have, and a weekend day outside the week:

```text
base · options start · no period called "noon"
```

Then play in `npm run dev`. The header reads `Day 1 · Monday morning`, a button that passes time shows where the clock lands, and bed moves the header on to the next morning. To render the clock in a UI of your own, see [Render the clock](/docs/0.1.2/how-to/render/world-plugins#render-the-clock).

In the showcase, Small Town, the calendar is in [`examples/showcase/src/game.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/game.ts) and the office's shift in `src/story/office.ts`. For more, see:

- [Calendar](/docs/0.1.2/reference/plugins/calendar), with [`calendar/pass`](/docs/0.1.2/reference/plugins/calendar#calendarpass), [`calendar/sleep`](/docs/0.1.2/reference/plugins/calendar#calendarsleep) and the [strings](/docs/0.1.2/reference/plugins/calendar#strings) that word the header.
- [Add a location](/docs/0.1.2/how-to/add-a-location#set-opening-hours) for opening hours, and [Run things each day](/docs/0.1.2/how-to/schedule-daily-work) for work at the start of each day.
- [Turns, scenes and the room](/docs/0.1.2/explanation/turns-and-time).
