---
title: "@ifloom/plugin-calendar"
description: "Every export of @ifloom/plugin-calendar and its /react subpath: its signature and its fields."
---
Generated from the source of `@ifloom/plugin-calendar` and `@ifloom/plugin-calendar/react` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

## @ifloom/plugin-calendar

- Functions: [`calendar`](#calendar)
- Types: [`CalendarOptions`](#calendaroptions), [`CalendarState`](#calendarstate), [`CalendarView`](#calendarview), [`PeriodDef`](#perioddef)

### calendar

Function. Explained in [Calendar](/docs/reference/plugins/calendar#calendar).

Returns the calendar plugin, for the game's `plugins`. List it before other plugins, so their hooks see the new day
when a turn ends.

Its helpers write its calls, such as `calendar.sleep()` and `calendar.day({ gte: 3 })`.

```ts shape
import { calendar } from '@ifloom/plugin-calendar'
function calendar(options?: CalendarOptions): DefinedPlugin<CalendarState, CalendarView>
```

Uses: [`CalendarOptions`](#calendaroptions), [`DefinedPlugin`](/docs/api/engine-plugin#definedplugin), [`CalendarState`](#calendarstate), [`CalendarView`](#calendarview).

| Helper | Signature | Description |
|---|---|---|
| `calendar.sleep` | `():` [`CommandRef`](/docs/api/engine#commandref) | Returns the `calendar/sleep` command, which passes time to the waking period of the next day. |
| `calendar.pass` | `(n?: number):` [`EffectRef`](/docs/api/engine#effectref) | Returns the `calendar/pass` effect, which moves the clock on `n` periods (1 if left out). |
| `calendar.period` | `(...ids: string[]):` [`Condition`](/docs/api/engine#condition) | Returns the `calendar/period` condition, which holds in any of the periods named. |
| `calendar.weekday` | `(...days: number[]):` [`Condition`](/docs/api/engine#condition) | Returns the `calendar/weekday` condition, which holds on any of the days of the week named, counting from 0. |
| `calendar.weekend` | `():` [`Condition`](/docs/api/engine#condition) | Returns the `calendar/weekend` condition, which holds on a day in `CalendarOptions.weekend`. |
| `calendar.day` | `(range:` [`Range`](/docs/api/engine#range)`):` [`Condition`](/docs/api/engine#condition) | Returns the `calendar/day` condition, which holds while the day, counting from 0, is in the range. |

### CalendarOptions

Type. Explained in [Calendar](/docs/reference/plugins/calendar#calendaroptions).

Settings for `calendar()`. Every field is optional and has the default its comment gives.

```ts shape
import type { CalendarOptions } from '@ifloom/plugin-calendar'
type CalendarOptions = {
  periods?: (string | PeriodDef)[]
  week?: number
  weekend?: number[]
  turn?: 'period' | 'day' | 'week' | false
  start?: { day?: number; period?: string }
  sleep?: { from?: string[]; wake?: string } | false
  curfew?: Condition | false
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `periods` | `(string \|` [`PeriodDef`](#perioddef)`)[]` | yes |  | The periods of a day, in order. Morning, afternoon, evening, night and late if left out. |
| `week` | `number` | yes |  | The number of days in a week. 7 if left out. |
| `weekend` | `number[]` | yes |  | The days of the week that are the weekend, counting from 0. The last two days of the week if left out. |
| `turn` | `'period' \| 'day' \| 'week' \| false` | yes |  | The length of a turn, one `'period'`, one `'day'` or one `'week'`. `'day'` if left out. Passing time ends a turn at each boundary it crosses, and a turn ended any other way moves the clock to the start of the next. With `false`, the clock and the turn run independently. |
| `start` | `{ day?: number; period?: string }` | yes |  | The day and period a new game starts at. Day 0 and the first period if left out. |
| `sleep` | `{ from?: string[]; wake?: string } \| false` | yes |  | The settings of the `calendar/sleep` command. `false` leaves the command out. `from` lists the periods the player can sleep from, the last three if left out. `wake` is the period the player wakes in the next day, the first if left out. |
| `curfew` | [`Condition`](/docs/api/engine#condition) `\| false` | yes |  | The curfew's condition. While it holds, the calendar warns against passing time over the end of the day, and the engine refuses that command so the player goes to bed instead. The curfew always binds if left out, and never with `false`. |

### CalendarState

Type. Explained in [Calendar](/docs/reference/plugins/calendar#calendarstate).

The clock a save keeps for the calendar. Periods and the week are read from the options, so only the day and period are kept.

```ts shape
import type { CalendarState } from '@ifloom/plugin-calendar'
type CalendarState = {
  day: number
  period: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `day` | `number` |  |  | The day, counting from 0. |
| `period` | `string` |  |  | The id of the period the clock is in. |

### CalendarView

Type. Explained in [Calendar](/docs/reference/plugins/calendar#calendarview).

The calendar as the player sees it, in `view.plugins.calendar`. Its `label` is the line a UI's clock shows.

```ts shape
import type { CalendarView } from '@ifloom/plugin-calendar'
type CalendarView = {
  day: number
  weekday: string
  weekdayIndex: number
  period: string
  periodLabel: string
  label: string
  curfew: boolean
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `day` | `number` |  |  | The day, counting from 1 as the player does. |
| `weekday` | `string` |  |  | The weekday's name, such as `'Wednesday'`. In a week of other than 7 days, it reads "Day 3 of the week". |
| `weekdayIndex` | `number` |  |  | The weekday's position in the week, counting from 0. |
| `period` | `string` |  |  | The period's id, such as `'morning'`. |
| `periodLabel` | `string` |  |  | The period's name as the player reads it, such as `'Morning'`. |
| `label` | `string` |  |  | The calendar's whole line, such as "Day 3 · Wednesday morning", from the `calendar/label` string. |
| `curfew` | `boolean` |  |  | True in the day's last period, with no scene open, while the curfew binds. A UI can offer bed then. |

### PeriodDef

Type. Explained in [Calendar](/docs/reference/plugins/calendar#perioddef).

A period of the day, one entry of `CalendarOptions.periods`. A bare string in `periods` is a period with only an id.

```ts shape
import type { PeriodDef } from '@ifloom/plugin-calendar'
type PeriodDef = {
  id: string
  label?: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The period's id, such as `'morning'`. |
| `label` | `string` | yes |  | The period's name as the player reads it. The id if left out. |

## @ifloom/plugin-calendar/react

- Functions: [`useCalendar`](#usecalendar)
- Constants: [`CalendarClock`](#calendarclock), [`calendarUi`](#calendarui)

### CalendarClock

Const. Explained in [Calendar](/docs/reference/plugins/calendar#calendarclock).

Renders the game's time, such as "Day 3 · Wednesday morning", from `view.when`. A preset styles its `clock` part.

It carries `data-day`, `data-weekday` and `data-period` attributes, and `data-curfew` while the curfew binds.
`calendarUi` renders it in place of the core `Clock`.

```ts shape
import { CalendarClock } from '@ifloom/plugin-calendar/react'
const CalendarClock: ComponentType<{ className?: string; }>
```

### calendarUi

Const. Explained in [Calendar](/docs/reference/plugins/calendar#calendarui).

The calendar plugin's React UI, for `plugins` on `mountGame` or `GameProvider`. It replaces the core `Clock` with
`CalendarClock`, in the sidebar and in the top bar on a phone.

```ts shape
import { calendarUi } from '@ifloom/plugin-calendar/react'
const calendarUi: PluginUi
```

Uses: [`PluginUi`](/docs/api/react-kit#pluginui).

### useCalendar

Function. Explained in [Calendar](/docs/reference/plugins/calendar#usecalendar).

Returns the calendar plugin's view from the running game, or null in a game without the plugin. It re-renders when
the view changes.

The view has the day, the weekday, the period and the curfew. `CalendarClock` renders from it.

```ts shape
import { useCalendar } from '@ifloom/plugin-calendar/react'
function useCalendar(): CalendarView | null
```

Uses: [`CalendarView`](#calendarview).
