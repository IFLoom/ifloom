---
title: "@ifloom/plugin-calendar"
description: "Every export of @ifloom/plugin-calendar and its /react subpath, if it has one: its signature and its fields."
---
Generated from the source of `@ifloom/plugin-calendar` and `@ifloom/plugin-calendar/react` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

## @ifloom/plugin-calendar

- Functions: [`calendar`](#calendar)
- Types: [`CalendarOptions`](#calendaroptions), [`CalendarState`](#calendarstate), [`CalendarView`](#calendarview), [`PeriodDef`](#perioddef)

### calendar

Function. Explained in [Calendar](/docs/plugins/calendar#calendar).

The plugin, with its helpers on it: `calendar()` makes the plugin for the
game's `plugins`, and content is written with `calendar.sleep()` and `calendar.day({ gte: 3 })`.

```ts shape
import { calendar } from '@ifloom/plugin-calendar'
function calendar(options?: CalendarOptions): DefinedPlugin<CalendarState, CalendarView>
```

| Helper | Signature | Description |
|---|---|---|
| `calendar.sleep` | `(): CommandRef` |  |
| `calendar.pass` | `(n?: number): EffectRef` |  |
| `calendar.period` | `(...ids: string[]): Condition` |  |
| `calendar.weekday` | `(...days: number[]): Condition` |  |
| `calendar.weekend` | `(): Condition` |  |
| `calendar.day` | `(range: Range): Condition` |  |

### CalendarOptions

Type. Explained in [Calendar](/docs/plugins/calendar#calendaroptions).

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
| `periods` | `(string \| PeriodDef)[]` | yes |  | The periods of a day, in order. Morning, afternoon, evening, night and late if left out. |
| `week` | `number` | yes |  | Days in a week. 7 if left out. |
| `weekend` | `number[]` | yes |  | Which days of the week are the weekend, counting from 0. The last two if left out. |
| `turn` | `'period' \| 'day' \| 'week' \| false` | yes |  | What a turn is: one `'period'`, one `'day'` (the default) or one `'week'`. Passing time ends a turn at each boundary it crosses, and a turn ended any other way moves the clock to the start of the next. `false`: the clock and the turn go their own ways. |
| `start` | `{ day?: number; period?: string }` | yes |  | Where a new game starts: day 0 and the first period if left out. |
| `sleep` | `{ from?: string[]; wake?: string } \| false` | yes |  | The `sleep` command: the periods it can be used from (the last three if left out) and the one it wakes in, the next day (the first if left out). `false`: no sleep command. |
| `curfew` | `Condition \| false` | yes |  | While this holds, passing time over the end of the day is warned against and refused — the player is to go to bed instead. Always, if left out; `false`, never. |

### CalendarState

Type. Explained in [Calendar](/docs/plugins/calendar#calendarstate).

The calendar's state: the day (from 0) and the period.

```ts shape
import type { CalendarState } from '@ifloom/plugin-calendar'
type CalendarState = {
  day: number
  period: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `day` | `number` |  |  |  |
| `period` | `string` |  |  |  |

### CalendarView

Type. Explained in [Calendar](/docs/plugins/calendar#calendarview).

What the UI reads at `view.plugins.calendar`.

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
| `day` | `number` |  |  | From 1, as the player counts. |
| `weekday` | `string` |  |  |  |
| `weekdayIndex` | `number` |  |  | From 0. |
| `period` | `string` |  |  |  |
| `periodLabel` | `string` |  |  |  |
| `label` | `string` |  |  | The whole of it, as the header shows it: "Day 3 · Wednesday morning". |
| `curfew` | `boolean` |  |  | The last period, with no scene open, while the curfew binds: time for bed. |

### PeriodDef

Type. Explained in [Calendar](/docs/plugins/calendar#perioddef).

A period of the day: its id, and what the player reads (the id, if left out).

```ts shape
import type { PeriodDef } from '@ifloom/plugin-calendar'
type PeriodDef = {
  id: string
  label?: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  |  |
| `label` | `string` | yes |  |  |

## @ifloom/plugin-calendar/react

- Functions: [`useCalendar`](#usecalendar)
- Constants: [`CalendarClock`](#calendarclock), [`calendarUi`](#calendarui)

### CalendarClock

Const. Explained in [Calendar](/docs/plugins/calendar#calendarclock).

Where the game is in time, as the core `Clock` draws it ("Day 3 ·
Wednesday morning"), with the calendar's pieces on it for styling:
`data-day`, `data-weekday`, `data-period`, and `data-curfew` while the
curfew binds. The calendar UI draws it in the `Clock`'s place. A thin
default on `useCalendar`.

```ts shape
import { CalendarClock } from '@ifloom/plugin-calendar/react'
const CalendarClock: ComponentType<{ className?: string; }>
```

### calendarUi

Const. Explained in [Calendar](/docs/plugins/calendar#calendarui).

The calendar plugin's React UI, for `plugins` on `mountGame` or
`GameProvider`: `CalendarClock` wherever the core `Clock` is, in the side
column and the top bar on a phone.

```ts shape
import { calendarUi } from '@ifloom/plugin-calendar/react'
const calendarUi: PluginUi
```

### useCalendar

Function. Explained in [Calendar](/docs/plugins/calendar#usecalendar).

The calendar plugin's view, piece by piece: the day, the weekday, the period and the curfew, or null in a game without the plugin. `CalendarClock` is drawn from it.

```ts shape
import { useCalendar } from '@ifloom/plugin-calendar/react'
function useCalendar(): CalendarView | null
```
