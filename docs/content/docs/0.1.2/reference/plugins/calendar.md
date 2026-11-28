---
title: "Calendar"
description: "The calendar plugin gives a game days, weekdays and periods of the day, a bed and a curfew, and sets how long a turn is."
---
`@ifloom/plugin-calendar` gives a game days, weekdays and periods of the day, a bed to go to and an optional curfew. It also sets how long a [turn](/docs/0.1.2/reference/state#turn) is: one period, one day or one week. The calendar needs no other plugin, and the [places](/docs/0.1.2/reference/plugins/places) and [cast](/docs/0.1.2/reference/plugins/cast) plugins read its conditions for opening hours and schedules. [Turns and time](/docs/0.1.2/explanation/turns-and-time#the-calendar-makes-a-turn-a-period-a-day-or-a-week) explains how the calendar's clock and the engine's turn keep step, [Add a plugin](/docs/0.1.2/how-to/add-a-plugin) installs it, and [Set up days and times of day](/docs/0.1.2/how-to/set-up-the-clock) builds a day with it.

In the showcase: `examples/showcase/src/game.ts`, which lists `calendar({ start: { day: 0, period: 'night' } })` first among its plugins.

```ts
import { calendar, type CalendarOptions, type CalendarState, type CalendarView, type PeriodDef } from '@ifloom/plugin-calendar'
```

## calendar

The plugin's factory, which returns the plugin with the id `calendar`. Every field of its result is in [`calendar`](/docs/0.1.2/api/plugin-calendar#calendar), and its helpers are listed under [Functions](#functions).

With no options, a day has five periods, a week has seven days, a turn is a day, and a new game starts on day 0 in the morning. List the calendar first in the game's `plugins`. The engine runs plugins' `onTurn` hooks in the order `plugins` lists them, and the calendar's hook moves the clock, so plugins listed after it see the new day.

The calendar's `onTurn` hook runs on every turn, however the turn ended. It moves the clock to the start of the next unit of [`turn`](#calendaroptions): the next period, the first period of the next day, or the first period of the next week counted from `start.day`. With `turn: false` the clock stays put. The game's [`rules.onTurn`](/docs/0.1.2/reference/rules#onturn) runs before every plugin's `onTurn`, so it sees the clock as the turn ended, and [`rules.onTurnDone`](/docs/0.1.2/reference/rules#onturndone) sees the new day.

`read` and `write` on the plugin come from [`DefinedPlugin`](/docs/0.1.2/reference/plugin-api#definedplugin). `write` puts the clock somewhere without ending a turn, for tests and tools.

```ts
import { loadGame, startingState, type Content } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'

declare const town: Content

const clock = calendar()
const { game } = loadGame([town], { id: 'small-town', title: 'Small Town', plugins: [clock] })

clock.read(startingState(game), game) // { day: 0, period: 'morning' }
```

### CalendarOptions

The calendar's settings, all optional. Every field is in [`CalendarOptions`](/docs/0.1.2/api/plugin-calendar#calendaroptions). The options are code, so a mod can't change them.

| Field | Meaning |
|---|---|
| `turn` | The length of a turn, `'period'`, `'day'` or `'week'`, and `'day'` if left out. A `week` turn starts each time the clock enters a new block of `week` days counted from `start.day`. With `false`, passing time ends no turn and a turn ends without moving the clock. |
| `sleep` | The settings of the [`calendar/sleep`](#calendarsleep) command. `from` lists the periods the player can go to bed in, the last three if left out, and `wake` is the period the next day starts in, the first if left out. With `false`, the calendar has no sleep command. |
| `curfew` | A [condition](/docs/0.1.2/reference/conditions). While it holds, the calendar refuses a command that would pass time over the end of the day (see [`calendar/pass`](#calendarpass)). The curfew always binds if left out, and never with `false`. |
| `weekend` | The days of the week that are the weekend, counting from 0, and the last two days of the week if left out. |

A curfew the player can lift reads a kv key:

```ts
import { calendar } from '@ifloom/plugin-calendar'

export const clock = calendar({ turn: 'week', curfew: { kv: 'nightOwl', is: false } })
```

### PeriodDef

A period of the day, one entry of the `periods` option. Every field is in [`PeriodDef`](/docs/0.1.2/api/plugin-calendar#perioddef).

A bare string in `periods` is a period with only an id. The `label` is the default for the string `calendar/period.<id>`, so a game or a translation can still reword it (see [Strings](#strings)). Period ids are unique, and the calendar reports two that share one.

```ts
import { calendar } from '@ifloom/plugin-calendar'

export const clock = calendar({ periods: ['dawn', 'day', { id: 'dusk', label: 'after dark' }] })
```

## Conditions

Each condition is a [plugin call](/docs/0.1.2/reference/custom#plugincall), written by the helper beside it. A calendar condition works anywhere a condition goes, such as a block's `when`, a `blocked` entry, a lock or a character's schedule.

### calendar/period

Holds in one of the named periods.

```ts fragment
{ 'calendar/period': { period: ['evening', 'night'] } } // calendar.period('evening', 'night')
```

### calendar/weekday

Holds on one of the named days of the week, counting from 0. In a seven-day week, 0 is Monday.

```ts fragment
{ 'calendar/weekday': { day: [0, 1, 2, 3, 4] } } // calendar.weekday(0, 1, 2, 3, 4)
```

### calendar/weekend

Holds on one of the [`weekend`](#calendaroptions) days.

```ts fragment
{ 'calendar/weekend': true } // calendar.weekend()
```

### calendar/day

Holds while the day, counting from 0, is in the [range](/docs/0.1.2/reference/common#range). The player reads the day from 1, so `calendar.day({ gte: 6 })` holds from the day the header calls Day 7.

```ts fragment
{ 'calendar/day': { gte: 6 } } // calendar.day({ gte: 6 })
```

### calendar/curfew

Holds while the [curfew](#calendaroptions) binds. It has no helper.

```ts fragment
{ 'calendar/curfew': true }
```

## Effects

### calendar/pass

Passes that many periods, 1 if `by` is left out, and ends a turn at each boundary of [`turn`](#calendaroptions) it crosses. The calendar counts the boundaries, ends that many turns as one [`turn`](/docs/0.1.2/reference/effects#turn) effect with `by`, then puts the clock exactly where it was sent. A count that isn't a number, or is negative, passes nothing, and a fraction is rounded down.

```ts fragment
{ 'calendar/pass': { by: 2 } } // calendar.pass(2)
```

With the default `turn: 'day'` and five periods, a pass ends one turn for each new day it reaches:

- From day 0 in the morning, `calendar.pass(2)` lands on day 0 in the evening and ends no turn.
- From day 0 at night, `calendar.pass(4)` lands on day 1 in the evening and ends one turn.
- From day 1 in the evening, `calendar.pass(11)` lands on day 3 at night and ends two turns.

A button whose effects pass time carries a note in its [`price.notes`](/docs/0.1.2/reference/view#price) saying where the clock will be: `until evening` the same day, `until tomorrow morning` the next, and `until Wednesday afternoon` further on.

While the curfew binds, the calendar's [`guard`](/docs/0.1.2/reference/plugin-api#guard) refuses a command whose passes, from [`effectsOf`](/docs/0.1.2/reference/actions#effectsof), add up past the day's last period. The refusal is soft, `That would run past dawn.`, so the button stays pressable and carries the line as its `warning`, and the engine refuses it all the same. At night, `calendar.pass(1)` is allowed and `calendar.pass(3)` isn't. The guard never refuses [`calendar/sleep`](#calendarsleep).

A [lock with `effect`](/docs/0.1.2/reference/locks#lock) set to `'calendar/pass'` stops every command that passes time, bed included. It doesn't stop a `{ turn: true }` effect, and `effect: 'turn'` doesn't stop `calendar/pass`, because the turns a pass ends are applied inside it.

```ts
import type { Lock } from '@ifloom/engine/plugin'

export const locks: Lock[] = [{ when: { kv: 'ill' }, deny: ['*'], effect: 'calendar/pass', reason: 'You feel too ill.' }]
```

### calendar/set

Puts the clock on a day, a period or both, and ends no turn. A field left out stays as it is, and a period the calendar doesn't have leaves the period unchanged. It has no helper. The [debug](/docs/0.1.2/reference/plugins/debug) plugin's `debug/time` command sets the clock through it.

```ts fragment
{ 'calendar/set': { day: 3, period: 'evening' } }
```

## Commands

### calendar/sleep

Goes to bed. It passes time to the [`wake`](#calendaroptions) period of the next day and ends turns as [`calendar/pass`](#calendarpass) does. Its [`effectsOf`](/docs/0.1.2/reference/plugin-api#effectsof) is that pass, so the bed button carries the price `until tomorrow morning`, and a lock on `calendar/pass` stops it too.

```ts fragment
{ 'calendar/sleep': true } // calendar.sleep()
```

The calendar refuses it, in this order:

1. With `There is no such thing to do.` ([`noSuchAction`](/docs/0.1.2/reference/strings#refusals)) when the calendar was built with `sleep: false`. The content checker also reports content that names it.
2. With `Finish this first.` ([`finishFirst`](/docs/0.1.2/reference/strings#refusals)) while a scene is open.
3. With `Too early.` (`calendar/tooEarly`) in a period that isn't in `sleep.from`.

A lock names the command `calendar/sleep`, or `calendar/*`.

## Queries

Other plugins ask these through their context's [`query`](/docs/0.1.2/reference/plugin-queries#query), and content can't. The calendar declares all three in its `QueryRegistry`, so they're typed in a game that imports it. A plugin that doesn't import it gives the answer's type, as in [Queries and partners](/docs/0.1.2/reference/plugin-queries#queries).

| Key | Meaning |
|---|---|
| `calendar/now` | The clock as a copy of [`CalendarState`](#calendarstate), `{ day, period }`. |
| `calendar/periods` | The period ids, in order. |
| `calendar/bedtime` | `true` in a period [`calendar/sleep`](#calendarsleep) can be used from, and always `false` with `sleep: false`. |

A market-stall plugin shuts at night when the game has a calendar, and stays open when it hasn't:

```ts
import { definePlugin } from '@ifloom/engine/plugin'

export const stall = definePlugin<{ stock: number }>({
  id: 'stall',
  version: 1,
  start: () => ({ stock: 5 }),
  conditions: {
    open: (_state, _args, { query }) => {
      const now = query<{ day: number; period: string }>('calendar/now')
      return now ? now.period !== 'night' && now.period !== 'late' : true
    },
  },
})
```

## Values

Prose prints these as tokens.

| Key | Meaning |
|---|---|
| `{{calendar/day}}` | The day as the player counts it, from 1. |
| `{{calendar/weekday}}` | The weekday's name, such as `Monday`. |
| `{{calendar/period}}` | The period's word, such as `morning`, or its [`label`](#perioddef). |

On a new game, `Day {{calendar/day}}, a {{calendar/weekday}} {{calendar/period}}.` prints `Day 1, a Monday morning.`

## State

### CalendarState

The clock a save keeps at `state.plugins.calendar`, the day from 0 and the period's id. Every field is in [`CalendarState`](/docs/0.1.2/api/plugin-calendar#calendarstate).

The save keeps only the clock, and the calendar reads its periods and week from its options. A UI reads [`CalendarView`](#calendarview) instead.

## View

### CalendarView

The calendar as the player sees it, in `view.plugins.calendar`. Every field is in [`CalendarView`](/docs/0.1.2/api/plugin-calendar#calendarview).

`day` counts from 1, as the player does. `label` is the whole line, `Day 3 · Wednesday morning`, from the `calendar/label` string. `curfew` is `true` in the day's last period while the curfew binds and no scene is open, which is a UI's cue to offer bed.

The calendar's [`label`](/docs/0.1.2/reference/plugin-api#label) provider gives the same line to [`view.when`](/docs/0.1.2/reference/view#view), ahead of the labels of plugins listed after it. With places listed second, `view.when` reads `Day 1 · Monday morning · High Street`.

```ts fragment
{ day: 1, weekday: 'Monday', weekdayIndex: 0, period: 'morning', periodLabel: 'morning', label: 'Day 1 · Monday morning', curfew: false }
```

[Render the clock](/docs/0.1.2/how-to/render/world-plugins#render-the-clock) renders it in Plain JS, React and Vue.

## React UI

The React UI is optional: the `@ifloom/plugin-calendar/react` subpath renders the calendar for a game that uses [`@ifloom/react`](/docs/0.1.2/reference/react), and a game rendered another way never loads it. [Show plugins in the React UI](/docs/0.1.2/how-to/react/show-plugin-uis) adds it to a game.

### calendarUi

The calendar's [`PluginUi`](/docs/0.1.2/reference/react/kit#pluginui), listed in `mountGame`'s `plugins`. It renders [`CalendarClock`](#calendarclock) in place of the React UI's own [`Clock`](/docs/0.1.2/reference/react/components#clock). Its type is in [`calendarUi`](/docs/0.1.2/api/plugin-calendar#calendarui).

### CalendarClock

Renders `view.when` as the React UI's `Clock` does, in the side column and in the top bar on a phone. Its props are in [`CalendarClock`](/docs/0.1.2/api/plugin-calendar#calendarclock).

It sets `data-day`, `data-weekday`, `data-period`, and `data-curfew` while the curfew binds, so a stylesheet can colour the night. A game replaces it as `CalendarClock` in [`components`](/docs/0.1.2/reference/react/components#components). Its part is `clock`.

```css
[data-part="clock"][data-period="night"] { color: var(--primary); }
```

### useCalendar

Returns the calendar's [`CalendarView`](#calendarview) from the running game, or `null` in a game without the plugin. It re-renders when the view changes. Its signature is in [`useCalendar`](/docs/0.1.2/api/plugin-calendar#usecalendar).

```tsx
import { useCalendar } from '@ifloom/plugin-calendar/react'

export function Weekday() {
  const calendar = useCalendar()
  return calendar ? <span>{calendar.weekday}</span> : null
}
```

## Functions

The helpers are properties of `calendar` and write its calls, typed:

- **`calendar.sleep()`** returns the [`calendar/sleep`](#calendarsleep) command as a [`CommandRef`](/docs/0.1.2/reference/custom#commandref).
- **`calendar.pass(n)`** returns the [`calendar/pass`](#calendarpass) effect, one period if `n` is left out.
- **`calendar.period(...ids)`**, **`calendar.weekday(...days)`**, **`calendar.weekend()`** and **`calendar.day(range)`** return the [conditions](#conditions).

```ts
import type { ActionDef } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'

export const jog: ActionDef = { id: 'jog', label: 'Go for a jog', when: calendar.period('morning', 'evening'), effects: [calendar.pass()] }
```

## Checks

When the game loads, the calendar reports problems with its options, each on `base` with `where` as `options <option>`:

| Problem | Cause |
|---|---|
| `options periods · a calendar needs at least one period` | `periods` is empty. |
| `options periods · two periods share an id` | Two periods have the same id. |
| `options start · no period called "noon"` | `start.period` names a period the calendar doesn't have. |
| `options sleep · no period called "pm"` | `sleep.wake` or an entry of `sleep.from` names a period the calendar doesn't have. |
| `options weekend · no day 9 in a week of 7` | A weekend day is outside the week. |
| `options curfew · unknown kind "pet"` | The `curfew` condition names something the game doesn't have. |

## Strings

A game, a pack or a translation rewords these by their full key in its [strings](/docs/0.1.2/reference/strings#stringkey-and-strings). `{day}` counts from 1, and `{weekday}` and `{period}` are the player's words. `calendar/sleep` also uses the engine's `finishFirst`.

| Key | Meaning |
|---|---|
| `calendar/tooEarly` | `Too early.`, the refusal of bed outside `sleep.from`. |
| `calendar/pastDawn` | `That would run past dawn.`, the curfew's refusal. |
| `calendar/until` | `until {period}`, the price note for a pass that ends the same day. |
| `calendar/tomorrow` | `until tomorrow {period}`, the price note for a pass that ends the next day. |
| `calendar/later` | `until {weekday} {period}`, the price note for a longer pass. |
| `calendar/label` | `Day {day} · {weekday} {period}`, the view's `label` and the calendar's part of `view.when`. |
| `calendar/period.<id>` | The period's word, its `label` or else its id. |
| `calendar/weekday.<n>` | `Monday` to `Sunday` for 0 to 6 in a seven-day week, and `Day <n + 1> of the week` in a week of any other length. |

## Caveats

- `rules.onTurn` sees the clock before the calendar moves it, so a rule for the day that has just begun belongs in `rules.onTurnDone`.
- `calendar/pass` applied from an `onTurn` hook moves the clock but ends no turn, because a `turn` effect does nothing while a turn is ending.
- The weekday counts from day 0, but a `week` turn counts from `start.day`. With `start: { day: 3 }` and `turn: 'week'`, the game starts on a Thursday and each turn runs from Thursday to Wednesday.
- When one pass ends several turns, only the first turn's `rules.onTurn` sees the clock where the pass began. Each later one sees the clock at the start of the unit the turn before moved it to.
