# Calendar

`@ifloom/plugin-calendar` gives a game a calendar: the periods of a day, the days of a week, a bed to go to and a curfew to keep. It also says what a **turn** is in this game: one period, one day or one week.

The engine's only clock is the [turn](/reference/state#turn), `state.turn`. Everything the engine dates, it dates in turns. Days, periods, weekdays, bed and the curfew are this plugin's alone: the core has none of them. The calendar keeps a day and a period of its own, moves them on whenever a turn ends, and ends turns itself when content passes time with `calendar/pass`.

So everything time-shaped in a game is written with it:

- **time passing** is the [`calendar/pass`](#effects) effect, on an activity or a choice;
- **bed** is its [`sleep()`](#commands) command, on a room action;
- **opening hours** are a [place](/plugins/places)'s [`locked`](/plugins/places#locationdef) entries with its [conditions](#conditions): `locked: [{ when: { not: period('morning', 'afternoon') }, reason: 'Closed. Opens tomorrow morning.' }]`;
- **schedules** are a [cast](/plugins/cast) character's [`schedule`](/plugins/cast#where-people-are) entries with its conditions as `when`: `{ location: 'cafe', when: { all: [weekday(0, 1, 2, 3, 4), period('morning', 'afternoon')] } }`;
- **the header** is its [label](#the-label), at `view.when`.

```ts
import {
  calendar, sleep, pass, period, weekday, weekend, day,
  type CalendarOptions, type CalendarState, type CalendarView, type PeriodDef,
} from '@ifloom/plugin-calendar'
```

## Install

Add the package beside the engine, and add `calendar(...)` to the game's `plugins`. See [Adding one](/plugins/#adding-one).

```json
{
  "dependencies": {
    "@ifloom/engine": "file:../ifloom/packages/engine",
    "@ifloom/plugin-calendar": "file:../ifloom/packages/plugin-calendar"
  }
}
```

**List the calendar first in `plugins`.** At the end of a turn, plugins' `turn` hooks run in the order `game.plugins` lists them. The calendar's hook is what moves the clock on, so plugins listed after it see the new day, and plugins listed before it see the old one.

```ts
plugins: [calendar(), places({ start: 'house' }), quests(), wardrobe({ /* ... */ })]
```

## calendar

```ts
function calendar(options?: CalendarOptions): DefinedPlugin<CalendarState>
```

The plugin, with the id `calendar`. Call it once, when the game is built. With no options, a day has five periods, a week has seven days, a turn is a day, and the game starts on Monday morning.

```ts
const clock = calendar()

const { game } = loadGame(packs, {
  id: 'small-town',
  title: 'Small Town',
  plugins: [clock],
})

clock.read(startingState(game), game)   // { day: 0, period: 'morning' }
```

`read` and `write` come from [`definePlugin`](/reference/plugins#defineplugin). They are for tests and tools: `clock.write(state, { day: 2, period: 'evening' })` puts the clock somewhere without ending a turn.

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
| `turn` | What a turn is: one `'period'`, one `'day'` or one `'week'`. `false`: the clock and the turn go their own ways. See [What a turn is](#what-a-turn-is). | `'day'` |
| `start` | Where a new game starts: a day, from `0`, and a period. | Day `0`, the first period |
| `sleep` | The [`sleep`](#commands) command: `from`, the periods it can be used in, and `wake`, the period it wakes in the next day. `false`: the command is always refused. | `from`: the last three periods (`evening`, `night`, `late`); `wake`: the first (`morning`) |
| `curfew` | While this [condition](/reference/conditions) holds, passing time over the end of the day is warned against and refused. See [The guard](#the-guard). `false`: never. | Always binds |

The options are code, not content: a mod cannot change them.

### PeriodDef

```ts
type PeriodDef = { id: string; label?: string }
```

| Field | What it is |
|---|---|
| `id` | What content names the period by: `period('evening')`, `start: { period: 'evening' }`. Unique among the periods. |
| `label` | What the player reads. The id if left out. |

```ts
calendar({ periods: ['dawn', 'day', { id: 'dusk', label: 'after dark' }] })
```

The label is the default for the string `calendar/period.<id>`, so a game or a translation can still reword it; see [Strings](#strings).

## What a turn is

`turn` decides how the calendar and the turn keep step. Whatever it is, two things move the clock.

**Passing time ends a turn at each boundary it crosses.** [`calendar/pass`](#effects) counts the turn units between where the clock is and where it is going. It ends that many turns, through the context's [`apply`](/reference/plugins#applying-effects), as a [`turn`](/reference/effects#turn) effect with `by`. Then it puts the clock exactly where it was sent. With the default `turn: 'day'`:

| From | Passes | Lands on | Turns ended |
|---|---|---|---|
| day 0, morning | 2 | day 0, evening | 0 |
| day 0, night | 4 | day 1, evening | 1 |
| day 1, evening | 11 | day 3, night | 2 |

With `turn: 'period'`, every period passed ends a turn: `pass(3)` ends three. With `turn: 'week'`, a turn ends each time the clock enters a new seven-day block, counted from `start.day`. Five periods a day, so `pass(30)` from day 0 morning lands on day 6 morning with no turn ended, and `pass(5)` more ends one. With `turn: false`, passing time never ends a turn.

**A turn ended any other way moves the clock to the start of the next unit.** A [`{ kind: 'turn' }`](/reference/effects#turn) effect on a choice or an activity runs the calendar's `turn` hook, which moves the clock:

| `turn` | The clock goes to |
|---|---|
| `'period'` | The next period. |
| `'day'` | The first period of the next day. |
| `'week'` | The first period of the first day of the next week, counted from `start.day`. |
| `false` | Nowhere: it stays put. |

So a café game whose turn is a week can close the week with a button:

```ts
calendar({ turn: 'week' })

activities: [
  { id: 'closeTheWeek', effects: [{ kind: 'turn' }] },
],
```

From day 0 at any period, **Close the week** ends turn 0 and the clock reads day 7, morning. Pressed again, day 14, morning.

**`rules.turn` and `onTurn` see the clock as the turn ended.** At the end of a turn, [`rules.turn`](/reference/rules#turn) is asked first, then [`rules.onTurn`](/reference/rules#onturn) runs, then each plugin's `turn` hook. So the game's own rules see the clock before the calendar moves it. Going to bed at night, `rules.turn` is asked with the clock at day 0, night, not day 1, morning. Plugins listed after the calendar see the new day.

When one pass ends several turns, the first is asked with the clock where the pass began. Each later one is asked with the clock where the turn before it left it: the start of the day (or period, or week) that turn ends.

## A worked example

A weekday at the café. The player can start a shift on a weekday, have a coffee, walk out along the river, and go to bed. On weekends, the market is open.

```ts
import { SCHEMA, need, type Pack } from '@ifloom/engine'
import { calendar, pass, period, sleep, weekday, weekend } from '@ifloom/plugin-calendar'
import { onlyAt, places } from '@ifloom/plugin-places'

const act = (id: string, label: string) => ({ id, label, command: { type: 'activity' as const, id } })

const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  // stats (coins) ...
  data: {
    places: {
      locations: [
        // house, high-street, market ...
        {
          id: 'cafe', name: 'Café', tag: 'Café', kind: 'venue', exits: ['high-street'], art: '',
          body: [{ text: 'cafe/open' }, { text: 'cafe/closing', when: period('evening', 'night', 'late') }],
          actions: [act('shift', 'Work a shift'), act('coffee', 'Have a coffee'), act('river', 'Walk by the river')],
        },
      ],
    },
  },
  activities: [
    {
      id: 'shift',
      requires: [onlyAt(['cafe']), need('The café is shut at the weekend.', weekday(0, 1, 2, 3, 4))],
      effects: [pass(2), { kind: 'stat', key: 'coins', by: 12 }],
    },
    { id: 'coffee', requires: [onlyAt(['cafe'])], effects: [pass(1)] },
    { id: 'river', requires: [onlyAt(['cafe'])], effects: [pass(3)] },
    { id: 'stall', requires: [onlyAt(['market']), need('The market is on at the weekend.', weekend())], effects: [pass(1)] },
  ],
  prose: {
    'cafe/open': 'The espresso machine hisses.',
    'cafe/closing': 'Chairs are going up on the tables.',
    diary: 'Day {{v:calendar/day}}, a {{v:calendar/weekday}} {{v:calendar/period}}.',
  },
}

const { game } = loadGame([town], {
  id: 'small-town',
  title: 'Small Town',
  plugins: [calendar(), places({ start: 'cafe' })],
  actions: [{ id: 'bed', label: 'Go to bed', command: sleep() }],
})
```

How it plays:

```ts
const button = (state: GameState, id: string) => view(state, game).actions.find((a) => a.id === id)!

view(state, game).when            // 'Day 1 · Monday morning · Café'
game.prose!.line('diary', state)  // 'Day 1, a Monday morning.'
button(state, 'shift').price      // { notes: ['until evening'] }
whyNot(state, game, sleep())      // 'Too early.'

state = apply(state, game, { type: 'activity', id: 'shift' }).state   // morning → evening
state = apply(state, game, { type: 'activity', id: 'coffee' }).state  // evening → night
state.turn                        // 0: still Monday

button(state, 'river').warning    // 'That would run past dawn.'
apply(state, game, { type: 'activity', id: 'river' }).refused   // 'That would run past dawn.'
button(state, 'bed').price        // { notes: ['until tomorrow morning'] }

state = apply(state, game, sleep()).state
view(state, game).when            // 'Day 2 · Tuesday morning · Café'
state.turn                        // 1
```

A UI reads the calendar at [`view.plugins.calendar`](#the-view) and the label at `view.when`.

## Conditions

| Content writes | Helper | Holds when |
|---|---|---|
| `{ 'calendar/period': ['evening', 'night'] }` | `period('evening', 'night')` | It is one of these periods. |
| `{ 'calendar/weekday': [0, 1, 2, 3, 4] }` | `weekday(0, 1, 2, 3, 4)` | It is one of these days of the week, from `0`. In a seven-day week, `0` is Monday. |
| `{ 'calendar/weekend': true }` | `weekend()` | It is one of the [`weekend`](#calendaroptions) days. |
| `{ 'calendar/day': { gte: 6 } }` | `day({ gte: 6 })` | The day, from `0`, is in this [range](/reference/conditions#range). |
| `{ 'calendar/curfew': true }` | none | The [curfew](#calendaroptions) binds right now. |

These are the short forms, with the full name as the only key (see [plugin calls](/reference/custom#plugincall)). A list becomes `with: { value: [...] }`, so the long form of the first row is `{ custom: 'calendar/period', with: { value: ['evening', 'night'] } }`. A single period or weekday works too: `{ 'calendar/period': 'evening' }`.

Use them anywhere a [condition](/reference/conditions) goes: a block's `when`, a choice, a requirement, a lock, a schedule.

**Gotcha.** `calendar/day` counts from `0`, as the state does. The player reads the day from `1`: `day({ gte: 6 })` holds from what the header calls Day 7.

## Effects

| Content writes | Helper | Does |
|---|---|---|
| `{ 'calendar/pass': 2 }` or `{ 'calendar/pass': { periods: 2 } }` | `pass(2)` | Passes that many periods, ending a turn at each boundary crossed. See [What a turn is](#what-a-turn-is). `pass()` is one period. |
| `{ 'calendar/set': { day: 3, period: 'evening' } }` | none | Puts the clock there. Either field left out stays as it is. Ends no turn. |

They work in a data scene choice's effects and an activity's `effects`. In a plain-effect list (an item's use, what `rules.turn` returns, a plugin's [`effectsOf`](/reference/plugins#saying-what-a-command-does)), write the long form: `{ kind: 'custom', name: 'calendar/pass', with: { periods: 2 } }`.

A count that is not a number passes nothing, a fraction is rounded down, and a negative count passes nothing. `calendar/set` ignores a period the calendar does not have: the period stays as it was.

## Commands

| Command | Helper | Does |
|---|---|---|
| `{ type: 'custom', name: 'calendar/sleep' }` | `sleep()` | Goes to bed: passes time to the [`wake`](#calendaroptions) period of the next day, ending a turn as [`calendar/pass`](#effects) does. |

A calendar built with `sleep: false` has no `calendar/sleep` command at all: sending it is refused as any unknown command is. Otherwise `calendar/sleep` is refused, in this order, with:

- `Finish this first.` (the engine's [`finishFirst`](/reference/strings#refusals)) while a scene is open;
- `Too early.` ([`calendar/tooEarly`](#strings)) in a period not in `sleep.from`.

Its [`effectsOf`](/reference/plugins#saying-what-a-command-does) is the pass it makes: `[{ kind: 'custom', name: 'calendar/pass', with: { periods: n } }]`. So a bed button carries a [price](#price-notes) (`until tomorrow morning`), and a lock on `calendar/pass` stops it.

A lock names it `calendar/sleep`, or `calendar/*`.

### Locks by effect

A [lock with `effect`](/reference/locks#lock) stops every command that would pass time, whatever it is: an activity, a choice, bed.

```ts
locks: [{ when: { flag: 'ill' }, deny: ['*'], effect: 'calendar/pass', reason: 'You feel too ill.' }]
```

While `ill` is set, **Have a coffee** and **Go to bed** are both greyed out with `You feel too ill.` An activity whose only effect is `{ kind: 'turn' }` is not stopped by it, since it passes no time in its own list. In the same way, `effect: 'turn'` does not stop `calendar/pass`: the turns it ends are applied inside it, not listed.

## Queries

Answers for other plugins' code, through the context's [`query`](/reference/plugins#queries). Content cannot ask them.

| Query | Answers |
|---|---|
| `calendar/now` | The clock: a copy of [`CalendarState`](#calendarstate), `{ day, period }`. |
| `calendar/periods` | The period ids, in order. |
| `calendar/bedtime` | `true` in a period [`sleep`](#commands) can be used from. `false` with `sleep: false`. |

```ts
// A shop plugin that shuts at night, if the game has a calendar.
const now = query<{ day: number; period: string }>('calendar/now')
const open = now ? now.period !== 'night' && now.period !== 'late' : true
```

## Values

| Prose writes | Prints |
|---|---|
| <code v-pre>{{v:calendar/day}}</code> | The day as the player counts it, from `1`. |
| <code v-pre>{{v:calendar/weekday}}</code> | The weekday's name: `Monday`. |
| <code v-pre>{{v:calendar/period}}</code> | The period's word: `morning`, or its [`label`](#perioddef). |

```ts
prose: { diary: 'Day {{v:calendar/day}}, a {{v:calendar/weekday}} {{v:calendar/period}}.' }
// 'Day 1, a Monday morning.'
```

## The turn hook, the guard, prices and the label

The calendar watches every command, not only its own, through the plugin fields described under [Guards, prices and labels](/reference/plugins#guards-prices-and-labels).

### The turn hook

Its [`turn` hook](/reference/plugins#hooks) moves the clock to the start of the next unit, as in [What a turn is](#what-a-turn-is). It runs on every turn, however the turn ended. When `calendar/pass` ended the turn, the pass then puts the clock exactly where it was sent.

### The guard

While the curfew binds, a command whose effects would pass time over the end of the day gets a **soft** refusal: `That would run past dawn.` ([`calendar/pastDawn`](#strings)). The button can still be pressed and carries the line as its `warning`, and the command is refused with it all the same, so the UI can offer bed instead.

The guard adds up every `calendar/pass` in the command's effects (from [`effectsOf`](/reference/actions#effectsof)) and warns when the current period plus that many reaches past the last period. At `night`, `pass(1)` is fine (night to late) and `pass(3)` is not. It never warns against [`sleep`](#commands): bed is the way past dawn.

To let the player stay up, give a curfew that stops holding:

```ts
calendar({ curfew: { flag: 'nightOwl', is: false } })
```

### Price notes

Every button whose effects pass time gets a note saying where the clock will be, in its [`price.notes`](/reference/view#price):

| Where the pass lands | Note |
|---|---|
| The same day | `until evening` ([`calendar/until`](#strings)) |
| The next day | `until tomorrow morning` ([`calendar/tomorrow`](#strings)) |
| Further on | `until Wednesday afternoon` ([`calendar/later`](#strings)) |

### The label

`Day 1 · Monday morning` ([`calendar/label`](#strings)), which the view shows as [`view.when`](/reference/view#the-clock-and-the-player), ahead of any later plugin's label: with the [places](/plugins/places) plugin listed after it, `Day 1 · Monday morning · High Street`. The day is counted from `1`.

## Strings

The plugin's lines, in the [strings table](/reference/strings#plugins-strings). A game, a pack or a translation rewords them by their full key, `calendar/...`.

| Key | English |
|---|---|
| `calendar/tooEarly` | `Too early.` |
| `calendar/pastDawn` | `That would run past dawn.` |
| `calendar/until` | `until {period}` |
| `calendar/tomorrow` | `until tomorrow {period}` |
| `calendar/later` | `until {weekday} {period}` |
| `calendar/label` | `Day {day} · {weekday} {period}` |
| `calendar/period.<id>` | The period's `label`, or its id: `calendar/period.morning` is `morning`. |
| `calendar/weekday.<n>` | `Monday` to `Sunday` for `0` to `6` in a seven-day week. In a week of any other length, `Day <n + 1> of the week`. |

`{day}` is from `1`, `{weekday}` and `{period}` are the player's words.

```ts
strings: {
  'calendar/label': '{weekday}, {period}',
  'calendar/period.late': 'the small hours',
}
```

`calendar/sleep` also says the engine's own [`finishFirst`](/reference/strings#refusals) (`Finish this first.`), reworded with it.

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
| `label` | The whole of it, as the header shows it: `Day 3 · Wednesday morning`. |
| `curfew` | `true` in the last period, with no scene open, while the curfew binds: time for bed. |

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

**A save from before the calendar.** The engine once kept a clock of its own, at `state.time`. A save made then (save version 4 or older) is carried forward by [`migrate`](/reference/saves#migrate): its `time` moves to `plugins.calendar` as `{ version: 1, state: { day, period } }`, with the same day and period, except the old last period, `'sleep'`, which becomes `'late'`. A save that already has a `calendar` entry keeps it. In a game without the calendar, the entry is simply never read.

**Setting it by hand.** The [debug plugin](/plugins/debug)'s `debug/time` command sets this clock, through [`calendar/set`](#effects); it is refused in a game with no calendar.

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

When the game loads, the calendar reports problems with its options, pinned on `base`, with `where` as `options <option>`:

- no periods (`options periods`, `a calendar needs at least one period`);
- two periods with the same id (`options periods`, `two periods share an id`);
- a `start.period` the calendar does not have (`options start`, `no period called "…"`);
- a `sleep.wake` or `sleep.from` period it does not have (`options sleep`, `no period called "…"`);
- a weekend day outside the week (`options weekend`, `no day 9 in a week of 7`);
- anything the `curfew` condition names that the game does not have (`options curfew`, `unknown kind "pet"`).

```text
base · options periods · two periods share an id
base · options start · no period called "noon"
base · options sleep · no period called "pm"
base · options weekend · no day 9 in a week of 7
```

## Gotchas

- **List the calendar first.** Other plugins' `turn` hooks then see the new day. Listed after them, it moves the clock after they have run.
- **The game's own turn rules see the old clock.** `rules.turn` and `onTurn` run before the calendar's `turn` hook. To act on the day just begun, do it in a plugin listed after the calendar, or read the clock in the next command.
- **A pass inside a turn's end ends no turn.** In what `rules.turn` returns, or from another plugin's `turn` hook, `calendar/pass` still moves the clock, but the turns it would end do nothing, as any [`turn` effect](/reference/effects#turn) there does.
- **`calendar/set` and `write` end no turn.** They put the clock somewhere; `state.turn` stays where it was.
- **The weekday counts from day 0; a week turn counts from `start.day`.** With `start: { day: 3 }` and `turn: 'week'`, the game starts on a Thursday and each week turn runs Thursday to Wednesday.
- **A long pass shows its turn rules the start of each day it crosses.** Only the first `rules.turn` of a pass that ends several turns sees the clock where the pass began; each later one sees the clock at the start of the unit the turn before moved it to.
