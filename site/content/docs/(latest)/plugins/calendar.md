---
title: "Calendar"
---
`@ifloom/plugin-calendar` gives a game days and times of day. It splits a day into periods (morning, afternoon and so on), counts days into weeks, adds a bed to go to and an optional curfew, and decides what a [turn](/docs/reference/state#turn) is in your game: one period, one day or one week.

You'd want it when time matters to the story: shops with opening hours, people who keep a schedule, a job you go to on weekdays, a day that ends when the player goes to bed. A linear novel usually doesn't need it, since the engine's turn counter is enough to date things.

The engine's only clock is the turn, `state.turn`, and it dates everything in turns. It has no days, periods or weekdays of its own. The calendar keeps a day and a period of its own, moves them on whenever a turn ends, and ends turns itself when content passes time with `calendar/pass`.

Here's where each time-related part of a game comes from:

- **Time passing** is the [`calendar/pass`](#effects) effect, on an activity or a choice.
- **Bed** is the [`sleep()`](#commands) command, usually on a room's action.
- **Opening hours** are a [place](/docs/plugins/places)'s [`locked`](/docs/plugins/places#locationdef) entries, written with the calendar's [conditions](#conditions), such as `{ when: { not: period('morning', 'afternoon') }, reason: 'Closed. Opens tomorrow morning.' }`.
- **Schedules** are a [cast](/docs/plugins/cast) character's [`schedule`](/docs/plugins/cast#where-people-are) entries, with the calendar's conditions as their `when`, such as `{ location: 'cafe', when: period('morning', 'afternoon') }`.
- **The header** is the calendar's [label](#the-label), at `view.when`.

```ts
import {
  calendar, sleep, pass, period, weekday, weekend, day,
  type CalendarOptions, type CalendarState, type CalendarView, type PeriodDef,
} from '@ifloom/plugin-calendar'
```

## Install

List the package in your game's `package.json`, beside the engine:

```json
{
  "dependencies": {
    "@ifloom/engine": "0.0.0",
    "@ifloom/plugin-calendar": "0.0.0"
  }
}
```

Then add `calendar(...)` to the game's `plugins`. [Adding one](/docs/plugins#adding-one) has the details.

List the calendar first. At the end of a turn, plugins' `turn` hooks run in the order `game.plugins` lists them. The calendar's hook is what moves the clock on, so plugins listed after it see the new day and plugins listed before it see the old one. The showcase's list starts like this:

```ts
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { quests } from '@ifloom/plugin-quests'

const plugins = [calendar({ start: { day: 0, period: 'night' } }), places({ start: 'flat' }), quests()]
```

## calendar

```ts
function calendar(options?: CalendarOptions): DefinedPlugin<CalendarState>
```

Builds the plugin, with the id `calendar`. Call it once, when you build the game. With no options, a day has five periods, a week has seven days, a turn is a day, and the game starts on Monday morning.

```ts
import { loadGame, startingState, type Pack } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'

declare const town: Pack

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
| `id` | What content names the period by, as in `period('evening')` or `start: { period: 'evening' }`. Unique among the periods. |
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

With `turn: 'period'`, every period passed ends a turn, so `pass(3)` ends three. With `turn: 'week'`, a turn ends each time the clock enters a new seven-day block, counted from `start.day`. With five periods a day, `pass(30)` from day 0 morning lands on day 6 morning with no turn ended, and `pass(5)` more ends one. With `turn: false`, passing time never ends a turn.

### Ending a turn another way

A turn ended any other way moves the clock to the start of the next unit. A [`{ kind: 'turn' }`](/docs/reference/effects#turn) effect on a choice or an activity runs the calendar's `turn` hook, which moves the clock:

| `turn` | The clock goes to |
|---|---|
| `'period'` | The next period. |
| `'day'` | The first period of the next day. |
| `'week'` | The first period of the first day of the next week, counted from `start.day`. |
| `false` | Nowhere. It stays put. |

So a management game whose turn is a week can close the week with a button:

```ts
import { type ActivityDef } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'

const clock = calendar({ turn: 'week' })
const activities: ActivityDef[] = [{ id: 'closeTheWeek', effects: [{ kind: 'turn' }] }]
```

From day 0 at any period, the `closeTheWeek` activity ends turn 0 and the clock reads day 7, morning. Run it again and it reads day 14, morning.

### What the game's turn rules see

`rules.turn` and `onTurn` see the clock as the turn ended. At the end of a turn, the engine asks [`rules.turn`](/docs/reference/rules#turn) first, then runs [`rules.onTurn`](/docs/reference/rules#onturn), then each plugin's `turn` hook. So the game's own rules see the clock before the calendar moves it. If the player goes to bed at night, `rules.turn` sees the clock at day 0, night, not day 1, morning. Plugins listed after the calendar see the new day.

When one pass ends several turns, the first turn's rules see the clock where the pass began. Each later turn's rules see the clock where the turn before left it, which is the start of the day (or period, or week) that turn ends.

## A worked example

A Monday in Small Town, the [showcase](/docs/guide/showcase)'s world. The player does a shift at the office, finds the café shut by the evening, goes jogging by the river until late, and goes to bed. The office is shut at weekends, and the café only opens in the morning and afternoon.

```ts
import { SCHEMA, apply, loadGame, startingState, view, whyNot, type GameState, type Pack } from '@ifloom/engine'
import { calendar, pass, period, sleep, weekday } from '@ifloom/plugin-calendar'
import { go, onlyAt, places, type LocationDef } from '@ifloom/plugin-places'

const act = (id: string, label: string) => ({ id, label, command: { type: 'activity' as const, id } })
const place = (id: string, name: string, exits: string[]): LocationDef =>
  ({ id, name, tag: 'Small Town', kind: 'street', art: '', exits, body: [{ text: `place.${id}` }] })

const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  stats: [{ id: 'coins', label: 'Coins', start: 12 }],
  data: {
    places: {
      locations: [
        { ...place('flat', 'Your flat', ['high-street']), actions: [{ id: 'bed', label: 'Go to bed', command: sleep() }] },
        place('high-street', 'High Street', ['flat', 'cafe', 'park', 'office']),
        {
          ...place('cafe', 'The Corner Café', ['high-street']),
          locked: [{ when: { not: period('morning', 'afternoon') }, reason: 'Closed. Opens tomorrow morning.' }],
        },
        { ...place('park', 'Riverside Park', ['high-street']), actions: [act('jog', 'Go for a jog')] },
        {
          ...place('office', 'The Office', ['high-street']),
          locked: [{ when: weekday(5, 6), reason: 'Shut at weekends.' }],
          actions: [act('work', 'Do a shift')],
        },
      ],
    },
  },
  activities: [
    { id: 'work', requires: [onlyAt(['office'])], effects: [pass(2), { kind: 'stat', key: 'coins', by: 20 }] },
    { id: 'jog', requires: [onlyAt(['park'])], effects: [pass(1)] },
  ],
  prose: {
    'place.flat': 'Boxes everywhere.',
    'place.high-street': 'Shops and puddles.',
    'place.cafe': 'The espresso machine hisses.',
    'place.park': 'The river runs brown and quick.',
    'place.office': 'Strip lights and a kettle.',
    diary: 'Day {{v:calendar/day}}, a {{v:calendar/weekday}} {{v:calendar/period}}.',
  },
}

const { game } = loadGame([town], {
  id: 'small-town',
  title: 'Small Town',
  plugins: [calendar(), places({ start: 'flat' })],
})
```

Here's how it plays. `button` finds an idle-screen button by id, and `walk` takes several exits in turn:

```ts
let state: GameState = startingState(game)
const button = (id: string) => view(state, game).actions.find((action) => action.id === id)!
const walk = (...to: string[]) => { for (const id of to) state = apply(state, game, go(id)).state }

view(state, game).when            // 'Day 1 · Monday morning · Your flat'
game.prose!.line('diary', state)  // 'Day 1, a Monday morning.'
whyNot(state, game, sleep())      // 'Too early.'

walk('high-street', 'office')
button('work').price              // { notes: ['until evening'] }
state = apply(state, game, { type: 'activity', id: 'work' }).state
view(state, game).when            // 'Day 1 · Monday evening · The Office'

walk('high-street')
whyNot(state, game, go('cafe'))   // 'Closed. Opens tomorrow morning.'

walk('park')
state = apply(state, game, { type: 'activity', id: 'jog' }).state   // evening → night
state = apply(state, game, { type: 'activity', id: 'jog' }).state   // night → late
state.turn                        // 0: still Monday

button('jog').warning             // 'That would run past dawn.'
apply(state, game, { type: 'activity', id: 'jog' }).refused   // 'That would run past dawn.'

walk('high-street', 'flat')
button('bed').price               // { notes: ['until tomorrow morning'] }
state = apply(state, game, sleep()).state
view(state, game).when            // 'Day 2 · Tuesday morning · Your flat'
state.turn                        // 1
```

A UI reads the calendar at [`view.plugins.calendar`](#the-view) and the label at `view.when`.

## Conditions

| Content writes | Helper | Holds when |
|---|---|---|
| `{ 'calendar/period': ['evening', 'night'] }` | `period('evening', 'night')` | It's one of these periods. |
| `{ 'calendar/weekday': [0, 1, 2, 3, 4] }` | `weekday(0, 1, 2, 3, 4)` | It's one of these days of the week, from `0`. In a seven-day week, `0` is Monday. |
| `{ 'calendar/weekend': true }` | `weekend()` | It's one of the [`weekend`](#calendaroptions) days. |
| `{ 'calendar/day': { gte: 6 } }` | `day({ gte: 6 })` | The day, from `0`, is in this [range](/docs/reference/conditions#range). |
| `{ 'calendar/curfew': true }` | none | The [curfew](#calendaroptions) binds right now. |

These are the short forms, with the full name as the only key (see [plugin calls](/docs/reference/custom#plugincall)). A list becomes `with: { value: [...] }`, so the long form of the first row is `{ custom: 'calendar/period', with: { value: ['evening', 'night'] } }`. A single period or weekday works too, as in `{ 'calendar/period': 'evening' }`.

You can use them anywhere a [condition](/docs/reference/conditions) goes: a block's `when`, a choice, a requirement, a lock or a schedule.

`calendar/day` counts from `0`, as the state does, but the player reads the day from `1`. So `day({ gte: 6 })` holds from what the header calls Day 7.

## Effects

| Content writes | Helper | Does |
|---|---|---|
| `{ 'calendar/pass': 2 }` or `{ 'calendar/pass': { periods: 2 } }` | `pass(2)` | Passes that many periods, ending a turn at each boundary crossed. See [What a turn is](#what-a-turn-is). `pass()` is one period. |
| `{ 'calendar/set': { day: 3, period: 'evening' } }` | none | Puts the clock there. A field you leave out stays as it is. Ends no turn. |

They work in a data scene choice's effects and an activity's `effects`. In a plain-effect list (an item's use, what `rules.turn` returns, or a plugin's [`effectsOf`](/docs/reference/plugins#saying-what-a-command-does)), write the long form: `{ kind: 'custom', name: 'calendar/pass', with: { periods: 2 } }`.

A count that isn't a number passes nothing, a fraction is rounded down, and a negative count passes nothing. `calendar/set` ignores a period the calendar doesn't have, and leaves the period as it was.

## Commands

| Command | Helper | Does |
|---|---|---|
| `{ type: 'custom', name: 'calendar/sleep' }` | `sleep()` | Goes to bed. It passes time to the [`wake`](#calendaroptions) period of the next day, ending a turn as [`calendar/pass`](#effects) does. |

A calendar built with `sleep: false` has no `calendar/sleep` command at all. The engine treats it as any unknown command and refuses it with `There is no such thing to do.` ([`noSuchAction`](/docs/reference/strings#refusals)). With a sleep command, `calendar/sleep` is refused, in this order, with:

- `Finish this first.` (the engine's [`finishFirst`](/docs/reference/strings#refusals)) while a scene is open.
- `Too early.` ([`calendar/tooEarly`](#strings)) in a period that isn't in `sleep.from`.

Its [`effectsOf`](/docs/reference/plugins#saying-what-a-command-does) is the pass it makes: `[{ kind: 'custom', name: 'calendar/pass', with: { periods: n } }]`. So a bed button carries a [price](#price-notes) (`until tomorrow morning`), and a lock on `calendar/pass` stops it.

A lock names it `calendar/sleep`, or `calendar/*`.

### Locks by effect

A [lock with `effect`](/docs/reference/locks#lock) stops every command that would pass time, whether it's an activity, a choice or bed.

```ts
import { type Lock } from '@ifloom/engine'

const locks: Lock[] = [{ when: { kv: 'ill' }, deny: ['*'], effect: 'calendar/pass', reason: 'You feel too ill.' }]
```

While `ill` is set, the jog button and the bed button are both greyed out with `You feel too ill.` The lock doesn't stop an activity whose only effect is `{ kind: 'turn' }`, since that activity passes no time in its own list. In the same way, `effect: 'turn'` doesn't stop `calendar/pass`, because the turns it ends are applied inside it rather than listed.

## Queries

These answer other plugins' code, through the context's [`query`](/docs/reference/plugins#queries). Content can't ask them.

| Query | Answers |
|---|---|
| `calendar/now` | The clock: a copy of [`CalendarState`](#calendarstate), `{ day, period }`. |
| `calendar/periods` | The period ids, in order. |
| `calendar/bedtime` | `true` in a period [`sleep`](#commands) can be used from. Always `false` with `sleep: false`. |

For example, a market stall plugin that shuts at night, when the game has a calendar, can ask the time in its own condition:

```ts
import { definePlugin } from '@ifloom/engine'

const stall = definePlugin<{ stock: number }>({
  id: 'stall',
  version: 1,
  start: () => ({ stock: 5 }),
  conditions: {
    // { 'stall/open': true }: open unless it's night. In a game without a calendar, always open.
    open: (_state, _args, { query }) => {
      const now = query<{ day: number; period: string }>('calendar/now')
      return now ? now.period !== 'night' && now.period !== 'late' : true
    },
  },
})
```

## Values

| Prose writes | Prints |
|---|---|
| `{{v:calendar/day}}` | The day as the player counts it, from `1`. |
| `{{v:calendar/weekday}}` | The weekday's name, such as `Monday`. |
| `{{v:calendar/period}}` | The period's word, such as `morning`, or its [`label`](#perioddef). |

```ts
const prose = { diary: 'Day {{v:calendar/day}}, a {{v:calendar/weekday}} {{v:calendar/period}}.' }
// On a new game: 'Day 1, a Monday morning.'
```

## The turn hook, the guard, prices and the label

The calendar watches every command, not only its own, through the plugin fields described under [Guards, prices and labels](/docs/reference/plugins#guards-prices-and-labels).

### The turn hook

Its [`turn` hook](/docs/reference/plugins#hooks) moves the clock to the start of the next unit, as described in [What a turn is](#what-a-turn-is). It runs on every turn, however the turn ended. When `calendar/pass` ended the turn, the pass then puts the clock exactly where it was sent.

### The guard

While the curfew binds, a command whose effects would pass time over the end of the day gets a soft refusal, `That would run past dawn.` ([`calendar/pastDawn`](#strings)). The button can still be pressed and carries the line as its `warning`, but the command is refused with it all the same, so the UI can offer bed instead.

The guard adds up every `calendar/pass` in the command's effects (from [`effectsOf`](/docs/reference/actions#effectsof)). It warns when the current period plus that many reaches past the last period. At `night`, `pass(1)` is fine (night to late) and `pass(3)` isn't. It never warns against [`sleep`](#commands), because bed is the way past dawn.

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

## The state

### CalendarState

```ts
type CalendarState = { day: number; period: string }
```

What the plugin keeps in a save, at `state.plugins.calendar`: the day, from `0`, and the period's id. A UI reads the view, not this.

The engine once kept a clock of its own, at `state.time`. [`loadState`](/docs/reference/saves#loadstate) carries a save from then (save version 4 or older) forward. Its `time` moves to `plugins.calendar` as `{ version: 1, state: { day, period } }`, with the same day and period, except that the old last period, `'sleep'`, becomes `'late'`. A save that already has a `calendar` entry keeps it. In a game without the calendar, the entry is never read.

To set the clock by hand while testing, use the [debug plugin](/docs/plugins/debug)'s `debug/time` command. It goes through [`calendar/set`](#effects). It's refused in a game with no calendar.

## For code

The helpers write the content objects for you, typed. `sleep` returns a `Command`, `pass` an `EffectRef`, and the rest a `Condition`.

### Helpers

```ts
const sleep: () => Command
const pass: (n?: number) => EffectRef          // n = 1
const period: (...ids: string[]) => Condition
const weekday: (...days: number[]) => Condition
const weekend: () => Condition
const day: (range: Range) => Condition
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

- **List the calendar first.** Other plugins' `turn` hooks then see the new day. If you list it after them, it moves the clock after they've run.
- **The game's own turn rules see the old clock.** `rules.turn` and `onTurn` run before the calendar's `turn` hook. To act on the day that's just begun, do it in a plugin listed after the calendar, or read the clock in the next command.
- **A pass inside a turn's end ends no turn.** In what `rules.turn` returns, or from another plugin's `turn` hook, `calendar/pass` still moves the clock. The turns it would end do nothing, as any [`turn` effect](/docs/reference/effects#turn) there does.
- **`calendar/set` and `write` end no turn.** They put the clock somewhere, and `state.turn` stays where it was.
- **The weekday counts from day 0, but a week turn counts from `start.day`.** With `start: { day: 3 }` and `turn: 'week'`, the game starts on a Thursday and each week turn runs from Thursday to Wednesday.
- **A long pass shows its turn rules the start of each day it crosses.** Only the first `rules.turn` of a pass that ends several turns sees the clock where the pass began. Each later one sees the clock at the start of the unit the turn before moved it to.

## See it in an example

Small Town: [`examples/showcase/src/game.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/game.ts) makes the clock with `calendar({ start: { day: 0, period: 'night' } })` and lists it first. [`examples/showcase/src/content/town.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/content/town.ts) passes time with `pass`, goes to bed with `sleep()`, and keeps hours with `period`, `weekday` and `day`.
