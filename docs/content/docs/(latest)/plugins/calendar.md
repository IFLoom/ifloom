---
title: "Calendar"
description: "Periods of the day, weekdays, bed and a curfew, passing time with calendar.pass(), and whether a turn is a period, a day or a week."
---
`@ifloom/plugin-calendar` gives a game days and times of day. It splits a day into periods (morning, afternoon and so on), counts days into weeks, adds a bed to go to and an optional curfew, and decides what a [turn](/docs/reference/state#turn) is in your game: one period, one day or one week.

You'd want it when time matters to the story: shops with opening hours, people who keep a schedule, a job you go to on weekdays, a day that ends when the player goes to bed. A linear novel usually doesn't need it, since the engine's turn counter is enough to date things.

The engine's only clock is the turn, `state.turn`, and it dates everything in turns. It has no days, periods or weekdays of its own. The calendar keeps a day and a period of its own, moves them on whenever a turn ends, and ends turns itself when content passes time with `calendar/pass`.

These are the parts of a game that deal with time, and where each one comes from:

- **Time passing** is the [`calendar/pass`](#effects) effect, on an action or a choice.
- **Bed** is the [`calendar.sleep()`](#commands) command, usually on a room's action.
- **Opening hours** are a [place](/docs/plugins/places)'s [`blocked`](/docs/plugins/places#the-location-trait) entries, written with the calendar's [conditions](#conditions), such as `{ when: { not: calendar.period('morning', 'afternoon') }, reason: 'Closed. Opens tomorrow morning.' }`.
- **Schedules** are a [cast](/docs/plugins/cast) character's [`schedule`](/docs/plugins/cast#where-people-are) entries, with the calendar's conditions as their `when`, such as `{ location: 'cafe', when: calendar.period('morning', 'afternoon') }`.
- **The header** is the calendar's [label](#the-label), at `view.when`.

```ts
import { calendar, type CalendarOptions, type CalendarState, type CalendarView, type PeriodDef } from '@ifloom/plugin-calendar'
```

## Install

List the package in your game's `package.json`, beside the engine:

```json
{
  "dependencies": {
    "@ifloom/engine": "^0.0.0",
    "@ifloom/plugin-calendar": "^0.0.0"
  }
}
```

Then add `calendar(...)` to the game's `plugins`. [Adding one](/docs/plugins#adding-one) has the details.

List the calendar first. At the end of a turn, plugins' `onTurn` hooks run in the order `game.plugins` lists them. The calendar's hook is what moves the clock on, so plugins listed after it see the new day and plugins listed before it see the old one. The showcase's list starts like this:

```ts
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { quests } from '@ifloom/plugin-quests'

const plugins = [calendar({ start: { day: 0, period: 'night' } }), places({ start: 'flat' }), quests()]
```

## calendar

```ts
function calendar(options?: CalendarOptions): DefinedPlugin<CalendarState, CalendarView>
```

Builds the plugin, with the id `calendar`. Call it once, when you build the game. With no options, a day has five periods, a week has seven days, a turn is a day, and the game starts on Monday morning.

```ts
import { loadGame, startingState, type Content } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'

declare const town: Content

const clock = calendar()
const { game } = loadGame([town], { id: 'small-town', title: 'Small Town', plugins: [clock] })

clock.read(startingState(game), game)   // { day: 0, period: 'morning' }
```

`read` and `write` come from [`definePlugin`](/docs/reference/plugins#defineplugin) and are meant for tests and tools. `clock.write(state, { day: 2, period: 'evening' })` puts the clock somewhere without ending a turn.

### CalendarOptions

```ts
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

| Field | What it is | If left out |
|---|---|---|
| `periods` | The periods of a day, in order. Each is an id, or a [`PeriodDef`](#perioddef) with the word the player reads. | `morning`, `afternoon`, `evening`, `night`, `late` |
| `week` | Days in a week. | `7` |
| `weekend` | Which days of the week are the weekend, counting from `0`. | The last two: `[5, 6]` in a seven-day week, Saturday and Sunday |
| `turn` | What a turn is: one `'period'`, one `'day'` or one `'week'`. With `false`, the clock and the turn go their own ways. See [What a turn is](#what-a-turn-is). | `'day'` |
| `start` | Where a new game starts: a day, from `0`, and a period. | Day `0`, the first period |
| `sleep` | The [`sleep`](#commands) command. `from` lists the periods it can be used in, and `wake` is the period it wakes in the next day. With `false`, the calendar has no sleep command at all. | `from`: the last three periods (`evening`, `night`, `late`). `wake`: the first (`morning`). |
| `curfew` | While this [condition](/docs/reference/conditions) holds, passing time over the end of the day is warned against and refused. See [The guard](#the-guard). With `false`, it never is. | Always binds |

The options are code, not content, so a mod can't change them.

### PeriodDef

```ts
type PeriodDef = { id: string; label?: string }
```

| Field | What it is |
|---|---|
| `id` | What content names the period by, as in `calendar.period('evening')` or `start: { period: 'evening' }`. Unique among the periods. |
| `label` | What the player reads. The id if left out. |

```ts
import { calendar } from '@ifloom/plugin-calendar'

calendar({ periods: ['dawn', 'day', { id: 'dusk', label: 'after dark' }] })
```

The label is the default for the string `calendar/period.<id>`, so a game or a translation can still reword it. See [Strings](#strings).

## What a turn is

The `turn` option decides how the calendar and the turn keep step. Whatever you set it to, two things move the clock.

### Passing time

Passing time ends a turn at each boundary it crosses. [`calendar/pass`](#effects) counts the turn units between where the clock is and where it's going. It ends that many turns, through the context's [`apply`](/docs/reference/plugins#applying-effects), as a [`turn`](/docs/reference/effects#turn) effect with `by`. Then it puts the clock exactly where it was sent. With the default `turn: 'day'`:

| From | Passes | Lands on | Turns ended |
|---|---|---|---|
| day 0, morning | 2 | day 0, evening | 0 |
| day 0, night | 4 | day 1, evening | 1 |
| day 1, evening | 11 | day 3, night | 2 |

With `turn: 'period'`, every period passed ends a turn, so `calendar.pass(3)` ends three. With `turn: 'week'`, a turn ends each time the clock enters a new seven-day block, counted from `start.day`. With five periods a day, `calendar.pass(30)` from day 0 morning lands on day 6 morning with no turn ended, and `calendar.pass(5)` more ends one. With `turn: false`, passing time never ends a turn.

### Ending a turn another way

A turn ended any other way moves the clock to the start of the next unit. A [`{ turn: true }`](/docs/reference/effects#turn) effect on a choice or an action runs the calendar's `onTurn` hook, which moves the clock:

| `turn` | The clock goes to |
|---|---|
| `'period'` | The next period. |
| `'day'` | The first period of the next day. |
| `'week'` | The first period of the first day of the next week, counted from `start.day`. |
| `false` | Nowhere. It stays put. |

So a management game whose turn is a week can close the week with a button:

```ts
import { type ActionDef } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'

const clock = calendar({ turn: 'week' })
const actions: ActionDef[] = [{ id: 'closeTheWeek', label: 'Close the week', effects: [{ turn: true }] }]
```

From day 0 at any period, the `closeTheWeek` action ends turn 0 and the clock reads day 7, morning. Run it again and it reads day 14, morning.

### What the game's turn rules see

The game's `onTurn` sees the clock as the turn ended. At the end of a turn, the engine runs [`rules.onTurn`](/docs/reference/rules#onturn) first, then each plugin's `onTurn` hook. So the game's own rule sees the clock before the calendar moves it. If the player goes to bed at night, `rules.onTurn` sees the clock at day 0, night, not day 1, morning, in both its state and its `before`. Plugins listed after the calendar see the new day, and so does the game's [`rules.onTurnDone`](/docs/reference/rules#onturndone), which runs after every plugin's `onTurn`, and each plugin's own `onTurnDone` after it. [Each new day](/docs/reference/rules#each-new-day) uses it.

When one pass ends several turns, the first turn's rules see the clock where the pass began. Each later turn's rules see the clock where the turn before left it, which is the start of the day (or period, or week) that turn ends.

## A worked example

A Monday in Small Town, the [showcase](/docs/guide/showcase)'s world. The player does a shift at the office, finds the café shut by the evening, goes jogging by the river until late, and goes to bed. The office is shut at weekends, and the café only opens in the morning and afternoon.

```ts
import { apply, loadGame, startingState, view, whyNot, type GameState, type Content } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places, type PlaceDef } from '@ifloom/plugin-places'

const place = (id: string, name: string, exits: string[]): PlaceDef =>
  ({ id, name, description: 'Small Town', exits, body: [{ prose: `place.${id}` }] })

const town: Content = {
  stats: [{ id: 'coins', label: 'Coins', start: 12 }],
  entities: [
    { ...place('flat', 'Your flat', ['high-street']), actions: [{ id: 'bed', label: 'Go to bed', command: calendar.sleep() }] },
    place('high-street', 'High Street', ['flat', 'cafe', 'park', 'office']),
    {
      ...place('cafe', 'The Corner Café', ['high-street']),
      blocked: [{ when: { not: calendar.period('morning', 'afternoon') }, reason: 'Closed. Opens tomorrow morning.' }],
    },
    { ...place('park', 'Riverside Park', ['high-street']), actions: [{ id: 'jog', label: 'Go for a jog', effects: [calendar.pass(1)] }] },
    {
      ...place('office', 'The Office', ['high-street']),
      blocked: [{ when: calendar.weekday(5, 6), reason: 'Shut at weekends.' }],
      actions: [{ id: 'work', label: 'Do a shift', effects: [calendar.pass(2), { stat: 'coins', by: 20 }] }],
    },
  ].map(places.location),
  prose: {
    'place.flat': 'Boxes everywhere.',
    'place.high-street': 'Shops and puddles.',
    'place.cafe': 'The espresso machine hisses.',
    'place.park': 'The river runs brown and quick.',
    'place.office': 'Strip lights and a kettle.',
    diary: 'Day {{calendar/day}}, a {{calendar/weekday}} {{calendar/period}}.',
  },
}

const { game } = loadGame([town], {
  id: 'small-town',
  title: 'Small Town',
  plugins: [calendar(), places({ start: 'flat' })],
})
```

Played through, the Monday goes like this. `button` finds an idle-screen button by id, and `walk` takes several exits in turn. A room's action is done as `{ type: 'action', id: 'places/<id>' }`, which is what its button sends:

```ts
let state: GameState = startingState(game)
const button = (id: string) => view(state, game).actions.find((action) => action.id === id)!
const walk = (...to: string[]) => { for (const id of to) state = apply(state, game, go(id)).state }

view(state, game).when            // 'Day 1 · Monday morning · Your flat'
game.prose!.line('diary', state)  // 'Day 1, a Monday morning.'
whyNot(state, game, calendar.sleep())      // 'Too early.'

walk('high-street', 'office')
button('work').price              // { notes: ['until evening'] }
state = apply(state, game, { type: 'action', id: 'places/work' }).state
view(state, game).when            // 'Day 1 · Monday evening · The Office'

walk('high-street')
whyNot(state, game, places.go('cafe'))   // 'Closed. Opens tomorrow morning.'

walk('park')
state = apply(state, game, { type: 'action', id: 'places/jog' }).state   // evening → night
state = apply(state, game, { type: 'action', id: 'places/jog' }).state   // night → late
state.turn                        // 0: still Monday

button('jog').warning             // 'That would run past dawn.'
apply(state, game, { type: 'action', id: 'places/jog' }).reason   // 'That would run past dawn.'

walk('high-street', 'flat')
button('bed').price               // { notes: ['until tomorrow morning'] }
state = apply(state, game, calendar.sleep()).state
view(state, game).when            // 'Day 2 · Tuesday morning · Your flat'
state.turn                        // 1
```

A UI reads the calendar at [`view.plugins.calendar`](#the-view) and the label at `view.when`.

## Conditions

| Content writes | Helper | Holds when |
|---|---|---|
| `{ 'calendar/period': { period: ['evening', 'night'] } }` | `calendar.period('evening', 'night')` | It's one of these periods. |
| `{ 'calendar/weekday': { day: [0, 1, 2, 3, 4] } }` | `calendar.weekday(0, 1, 2, 3, 4)` | It's one of these days of the week, from `0`. In a seven-day week, `0` is Monday. |
| `{ 'calendar/weekend': true }` | `calendar.weekend()` | It's one of the [`weekend`](#calendaroptions) days. |
| `{ 'calendar/day': { gte: 6 } }` | `calendar.day({ gte: 6 })` | The day, from `0`, is in this [range](/docs/reference/conditions#range). |
| `{ 'calendar/curfew': true }` | none | The [curfew](#calendaroptions) binds right now. |

Each is a call with the full name as the only key (see [plugin calls](/docs/reference/custom#plugincall)), which the helpers write for you. A single period or weekday works too, as in `{ 'calendar/period': { period: 'evening' } }`.

You can use them anywhere a [condition](/docs/reference/conditions) goes: a block's `when`, a choice, a `blocked` entry, a lock or a schedule.

`calendar/day` counts from `0`, as the state does, but the player reads the day from `1`. So `calendar.day({ gte: 6 })` holds from what the header calls Day 7.

## Effects

| Content writes | Helper | Does |
|---|---|---|
| `{ 'calendar/pass': { by: 2 } }` | `calendar.pass(2)` | Passes that many periods, ending a turn at each boundary crossed. See [What a turn is](#what-a-turn-is). `calendar.pass()` is one period. |
| `{ 'calendar/set': { day: 3, period: 'evening' } }` | none | Puts the clock there. A field you leave out stays as it is. Ends no turn. |

They work in any effect list: a data scene choice's, an action's, a thing's use in the [inventory](/docs/plugins/inventory), or a plugin's [`effectsOf`](/docs/reference/plugins#saying-what-a-command-does).

A count that isn't a number passes nothing, a fraction is rounded down, and a negative count passes nothing. `calendar/set` ignores a period the calendar doesn't have, and leaves the period as it was.

## Commands

| Command | Helper | Does |
|---|---|---|
| `{ 'calendar/sleep': true }` | `calendar.sleep()` | Goes to bed. It passes time to the [`wake`](#calendaroptions) period of the next day, ending a turn as [`calendar/pass`](#effects) does. |

A calendar built with `sleep: false` has no bed. It refuses `calendar/sleep` with `There is no such thing to do.` ([`noSuchAction`](/docs/reference/strings#refusals)), and the [content checker](/docs/reference/checks) reports content that names it. With a sleep command, `calendar/sleep` is refused, in this order, with:

- `Finish this first.` (the engine's [`finishFirst`](/docs/reference/strings#refusals)) while a scene is open.
- `Too early.` ([`calendar/tooEarly`](#strings)) in a period that isn't in `sleep.from`.

Its [`effectsOf`](/docs/reference/plugins#saying-what-a-command-does) is the pass it makes: `[{ 'calendar/pass': { by: n } }]`. So a bed button carries a [price](#price-notes) (`until tomorrow morning`), and a lock on `calendar/pass` stops it.

A lock names it `calendar/sleep`, or `calendar/*`.

### Locks by effect

A [lock with `effect`](/docs/reference/locks#lock) stops every command that would pass time, whether it's an action, a choice or bed.

```ts
import type { Lock } from '@ifloom/engine/plugin'

const locks: Lock[] = [{ when: { kv: 'ill' }, deny: ['*'], effect: 'calendar/pass', reason: 'You feel too ill.' }]
```

While `ill` is set, the jog button and the bed button are both greyed out with `You feel too ill.` The lock doesn't stop an action whose only effect is `{ turn: true }`, since that action passes no time in its own list. In the same way, `effect: 'turn'` doesn't stop `calendar/pass`, because the turns it ends are applied inside it rather than listed.

## Queries

These answer other plugins' code, through the context's [`query`](/docs/reference/plugins#queries). Content can't ask them. Other plugins ask all three, so the engine declares their answers in [`PartnerQueries`](/docs/reference/plugins#partner-queries), and they're typed in any plugin's code without importing the calendar.

| Query | Answers |
|---|---|
| `calendar/now` | The clock: a copy of [`CalendarState`](#calendarstate), `{ day, period }`. |
| `calendar/periods` | The period ids, in order. |
| `calendar/bedtime` | `true` in a period [`sleep`](#commands) can be used from. Always `false` with `sleep: false`. |

For example, a market stall plugin that shuts at night, when the game has a calendar, can ask the time in its own condition:

```ts
import { definePlugin } from '@ifloom/engine/plugin'

const stall = definePlugin<{ stock: number }>({
  id: 'stall',
  version: 1,
  start: () => ({ stock: 5 }),
  conditions: {
    // { 'stall/open': true }: open unless it's night. In a game without a calendar, always open.
    open: (_state, _args, { query }) => {
      const now = query('calendar/now') // { day, period }, or undefined without a calendar
      return now ? now.period !== 'night' && now.period !== 'late' : true
    },
  },
})
```

## Values

| Prose writes | Prints |
|---|---|
| `{{calendar/day}}` | The day as the player counts it, from `1`. |
| `{{calendar/weekday}}` | The weekday's name, such as `Monday`. |
| `{{calendar/period}}` | The period's word, such as `morning`, or its [`label`](#perioddef). |

```ts
const prose = { diary: 'Day {{calendar/day}}, a {{calendar/weekday}} {{calendar/period}}.' }
// On a new game: 'Day 1, a Monday morning.'
```

## The turn hook, the guard, prices and the label

The calendar watches every command, not only its own, through the plugin fields described under [Guards, prices and labels](/docs/reference/plugins#guards-prices-and-labels).

### The turn hook

Its [`onTurn` hook](/docs/reference/plugins#hooks-and-providers) moves the clock to the start of the next unit, as described in [What a turn is](#what-a-turn-is). It runs on every turn, however the turn ended. When `calendar/pass` ended the turn, the pass then puts the clock exactly where it was sent.

### The guard

While the curfew binds, a command whose effects would pass time over the end of the day gets a soft refusal, `That would run past dawn.` ([`calendar/pastDawn`](#strings)). The button can still be pressed and carries the line as its `warning`, but the command is refused with it all the same, so the UI can offer bed instead.

The guard adds up every `calendar/pass` in the command's effects (from [`effectsOf`](/docs/reference/actions#effectsof)). It warns when the current period plus that many reaches past the last period. At `night`, `calendar.pass(1)` is fine (night to late) and `calendar.pass(3)` isn't. It never warns against [`sleep`](#commands), because bed is the way past dawn.

To let the player stay up, give a curfew that can stop holding:

```ts
import { calendar } from '@ifloom/plugin-calendar'

calendar({ curfew: { kv: 'nightOwl', is: false } })
```

### Price notes

Every button whose effects pass time gets a note in its [`price.notes`](/docs/reference/view#price) saying where the clock will be:

| Where the pass lands | Note |
|---|---|
| The same day | `until evening` ([`calendar/until`](#strings)) |
| The next day | `until tomorrow morning` ([`calendar/tomorrow`](#strings)) |
| Further on | `until Wednesday afternoon` ([`calendar/later`](#strings)) |

### The label

The calendar's label is `Day 1 · Monday morning` ([`calendar/label`](#strings)). The view shows it as [`view.when`](/docs/reference/view#the-clock-and-the-player), ahead of any later plugin's label. With the [places](/docs/plugins/places) plugin listed after it, it reads `Day 1 · Monday morning · High Street`. The day is counted from `1`.

## Strings

The plugin's lines go in the [strings table](/docs/reference/strings#plugins-strings). A game, a pack or a translation rewords them by their full key, `calendar/...`.

| Key | English |
|---|---|
| `calendar/tooEarly` | `Too early.` |
| `calendar/pastDawn` | `That would run past dawn.` |
| `calendar/until` | `until {period}` |
| `calendar/tomorrow` | `until tomorrow {period}` |
| `calendar/later` | `until {weekday} {period}` |
| `calendar/label` | `Day {day} · {weekday} {period}` |
| `calendar/period.<id>` | The period's `label`, or its id. `calendar/period.morning` is `morning`. |
| `calendar/weekday.<n>` | `Monday` to `Sunday` for `0` to `6` in a seven-day week. In a week of any other length, `Day <n + 1> of the week`. |

`{day}` counts from `1`, and `{weekday}` and `{period}` are the player's words.

```ts
const strings = {
  'calendar/label': '{weekday}, {period}',
  'calendar/period.late': 'the small hours',
}
```

`calendar/sleep` also uses the engine's own [`finishFirst`](/docs/reference/strings#refusals) (`Finish this first.`), so rewording that changes it here too.

## The view

`view(state, game).plugins.calendar` is a `CalendarView`.

The [React UI](/docs/react) shows `view.when`, the calendar's label, with [`Clock`](/docs/react/components#clock) under the title. This plugin's own [React UI](#drawing-it) marks it with the calendar's pieces, and [`useCalendar`](#usecalendar) gives this view with no markup, for a clock of your own.

### CalendarView

```ts
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

| Field | What it is |
|---|---|
| `day` | The day as the player counts it, from `1`. |
| `weekday` | The weekday's name. |
| `weekdayIndex` | The day of the week, from `0`. |
| `period` | The period's id. |
| `periodLabel` | The period's word. |
| `label` | All of it, as the header shows it: `Day 3 · Wednesday morning`. |
| `curfew` | `true` in the last period, with no scene open, while the curfew binds. It's the UI's cue that it's time for bed. |

On a new game with the defaults:

```ts
{ day: 1, weekday: 'Monday', weekdayIndex: 0, period: 'morning', periodLabel: 'morning', label: 'Day 1 · Monday morning', curfew: false }
```

## Drawing it

`view.plugins.calendar` is a [`CalendarView`](#calendarview): the day, the weekday, the period and the whole `label`, which is also in `view.when`. `curfew` is `true` in the last period while the curfew binds, which is your cue to send the player to bed.

`@ifloom/plugin-calendar/react` marks the clock with the calendar's parts, for a game drawn with [`@ifloom/react`](/docs/react). List `calendarUi` in the game's [`plugins`](/docs/react/kit#the-plugins-option) and [`CalendarClock`](#calendarclock) is drawn wherever the React UI's own [`Clock`](/docs/react/components#clock) is. The Plain JS tab uses `runner`, `add` and `drawChoices` from the vanilla template's `src/main.ts`, whose `draw` hands each part the runner's [snapshot](/docs/reference/runner#runnersnapshot), and the Vue tab reads `view`, `snapshot` and `runner` from the vue template's `src/runner.ts` (see [Start the runner](/docs/guide/frameworks#start-the-runner)).

::include[../../../../snippets/plain/calendar.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../snippets/react/mount-calendar.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../snippets/vue/Calendar.vue]{meta='tab="Vue" tab-group="framework"'}

The React UI is yours to leave out. Draw the plugin yourself from `view.plugins.calendar`, or from [`useCalendar`](#usecalendar) with your own markup, and nothing of ours is drawn: that's as much a way to use the plugin as ours. React and `@ifloom/react` are optional peers of the plugin, and a game drawn with another UI never loads this subpath.

### calendarUi

```ts
const calendarUi: PluginUi
```

The plugin's [`PluginUi`](/docs/react/kit#pluginui): [`CalendarClock`](#calendarclock) is drawn wherever the React UI's own [`Clock`](/docs/react/components#clock) is.

### CalendarClock

```tsx
function CalendarClock(props: { className?: string }): JSX.Element | null
```

Where the game is in time, the line the plugins' labels write (`view.when`, "Day 3 · Wednesday morning"), as the React UI's own [`Clock`](/docs/react/components#clock) draws it, with the calendar's pieces on it for a stylesheet: `data-day`, `data-weekday`, `data-period`, and `data-curfew` while the curfew binds. `calendarUi` draws it in the `Clock`'s place, in the side column and in the top bar on a phone.

```css
[data-part="clock"][data-period="night"] { color: var(--primary); }
```

Replaceable as `CalendarClock` in [`components`](/docs/react/components#components). Parts: `clock`.

### useCalendar

```ts
function useCalendar(): CalendarView | null
```

The calendar plugin's view, [`CalendarView`](#the-view), piece by piece: the day, the weekday, the period, its label, the whole line, and whether the curfew binds. `null` in a game without the plugin. `CalendarClock` is drawn from it.

::include[../../../../snippets/react/use-calendar.tsx]

## The state

### CalendarState

```ts
type CalendarState = { day: number; period: string }
```

What the plugin keeps in a save, at `state.plugins.calendar`: the day, from `0`, and the period's id. A UI reads the view, not this.

The engine once kept a clock of its own, at `state.time`. [`loadState`](/docs/reference/saves#loadstate) carries a save from then (save version 4 or older) forward. Its `time` moves to `plugins.calendar` as `{ version: 1, state: { day, period } }`, with the same day and period, except that the old last period, `'sleep'`, becomes `'late'`. A save that already has a `calendar` entry keeps it. In a game without the calendar, the entry is never read.

To set the clock by hand while testing, use the [debug plugin](/docs/plugins/debug)'s `debug/time` command. It goes through [`calendar/set`](#effects). It's refused in a game with no calendar.

## For code

The helpers are properties of `calendar`, the plugin's factory, and write the content objects for you, typed. `calendar.sleep` returns a [`CommandRef`](/docs/reference/custom#commandref), `calendar.pass` an `Effect`, and the rest a `Condition`.

### Helpers

```ts
const calendar: {
  (options?: CalendarOptions): DefinedPlugin<CalendarState, CalendarView>
  sleep(): CommandRef
  pass(n?: number): EffectRef          // n = 1
  period(...ids: string[]): Condition
  weekday(...days: number[]): Condition
  weekend(): Condition
  day(range: Range): Condition
}
```

## Checks

When the game loads, the calendar reports problems with its options. Each is pinned on `base`, with `where` as `options <option>`:

- No periods (`options periods`, `a calendar needs at least one period`).
- Two periods with the same id (`options periods`, `two periods share an id`).
- A `start.period` the calendar doesn't have (`options start`, `no period called "…"`).
- A `sleep.wake` or `sleep.from` period it doesn't have (`options sleep`, `no period called "…"`).
- A weekend day outside the week (`options weekend`, `no day 9 in a week of 7`).
- Anything the `curfew` condition names that the game doesn't have (`options curfew`, `unknown kind "pet"`).

```text
base · options periods · two periods share an id
base · options start · no period called "noon"
base · options sleep · no period called "pm"
base · options weekend · no day 9 in a week of 7
```

## Gotchas

- **List the calendar first.** Other plugins' `onTurn` hooks then see the new day. If you list it after them, it moves the clock after they've run.
- **`rules.onTurn` sees the old clock.** It runs before the calendar's `onTurn` hook. To act on the day that's just begun, use [`rules.onTurnDone`](/docs/reference/rules#onturndone), which runs after it.
- **A pass inside a turn's end ends no turn.** Applied from `rules.onTurn`, or from another plugin's `onTurn` hook, `calendar/pass` still moves the clock. The turns it would end do nothing, as any [`turn` effect](/docs/reference/effects#turn) there does.
- **`calendar/set` and `write` end no turn.** They put the clock somewhere, and `state.turn` stays where it was.
- **The weekday counts from day 0, but a week turn counts from `start.day`.** With `start: { day: 3 }` and `turn: 'week'`, the game starts on a Thursday and each week turn runs from Thursday to Wednesday.
- **A long pass shows its turn rules the start of each day it crosses.** Only the first `rules.onTurn` of a pass that ends several turns sees the clock where the pass began. Each later one sees the clock at the start of the unit the turn before moved it to.

## See it in an example

Small Town: [`examples/showcase/src/game.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/game.ts) makes the clock with `calendar({ start: { day: 0, period: 'night' } })` and lists it first. The packs in [`examples/showcase/src/story/`](https://github.com/IFLoom/ifloom/tree/main/examples/showcase/src/story) pass time with `calendar.pass`, go to bed with `calendar.sleep()`, and keep hours with `calendar.period`, `calendar.weekday` and `calendar.day`.
