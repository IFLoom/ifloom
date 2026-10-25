---
title: "Jobs"
description: "Jobs with hiring requirements, shifts that cost stats and time and pay a wage, promotion ladders, and getting fired."
---
`@ifloom/plugin-jobs` adds jobs the player applies for, works shifts at, gets promoted in and can be fired from. A shift costs stats such as energy, and time on the calendar, and pays a wage in a spendable stat. A job can have a ladder of ranks, each paying more. Missing shifts, or a condition such as a low performance stat, gets the player fired.

```ts
import { jobs, jobsOf, jobOf, type JobDef, type ShiftDef, type RankDef, type FireDef, type JobsState, type HeldJob, type JobsView, type JobView, type RankView } from '@ifloom/plugin-jobs'
```

The plugin's engine side draws nothing: its React UI is a [subpath of its own](#the-react-ui), and any UI can draw it. Its commands work on any button, such as a location's actions, and the button shows the shift's cost and greys out with the reason. For a job board, its view lists every job, and [Building UI for plugins](/docs/recipes/plugin-ui#a-job-board) builds one.

## Install

List the package in your game's `package.json`, beside the engine:

```json
{
  "dependencies": {
    "@ifloom/engine": "^0.0.0",
    "@ifloom/plugin-jobs": "^0.0.0"
  }
}
```

Then add `jobs()` to the game's `plugins`. [Adding one](/docs/plugins#adding-one) has the details.

The plugin works on its own. It cooperates with the [calendar](/docs/plugins/calendar) and [places](/docs/plugins/places) when the game has them:

- **Calendar.** A job's `days` are the calendar's weekdays and its `hours` are periods. A shift's `passes` moves the clock on, and "a day" for one shift a day and for missed shifts is the calendar's day.
- **Places.** A job's `at` lists where shifts are worked.

Without the calendar, every day has a shift, a day is a turn, and a shift takes no time. Without places, a shift can be worked anywhere.

## jobs

```ts
function jobs(): DefinedPlugin<JobsState, JobsView>
```

Builds the plugin, with the id `jobs`. The player holds no job in a new game.

## Writing jobs

Jobs are content. They go in your content's [`data`](/docs/reference/loader#content) under `jobs.jobs`, and are merged by id, so a mod can add a job or replace one. This is the showcase's café job:

```ts
import type { Content } from '@ifloom/engine'
import { jobs, type JobDef } from '@ifloom/plugin-jobs'

const weekend: JobDef = {
  id: 'weekend',
  name: 'Weekend help',
  description: 'Saturday mornings behind the counter at the Corner Café.',
  blocked: [{ when: { not: { stat: 'friendship', of: 'character:ava', gte: 10 } }, reason: 'Ava doesn’t know you well enough yet.' }],
  at: ['cafe'],
  days: [5],
  hours: ['morning'],
  shift: { cost: { energy: 25 }, passes: 1 },
  ranks: [
    { id: 'help', name: 'Weekend help', pay: { coins: 12 } },
    { id: 'barista', name: 'Barista', pay: { coins: 16 }, requires: { shifts: 3 } },
  ],
  fire: { missed: 2 },
}

const town: Content = {
  data: { jobs: { jobs: [weekend] } },
}

// Buttons for the café's actions.
const buttons = [
  { id: 'ask-work', label: 'Ask Ava about weekend work', command: jobs.apply('weekend') },
  { id: 'shift', label: 'Work the Saturday shift', command: jobs.work('weekend') },
]
```

### JobDef

```ts
type JobDef = {
  id: string
  name: string
  description?: string
  blocked?: Blocked[]
  at?: string[]
  days?: number[]
  hours?: string[]
  shift: ShiftDef
  ranks: RankDef[]
  fire?: FireDef
}
```

| Field | What it is |
|---|---|
| `id` | Unique among jobs. Commands name the job by it. |
| `name` | Its name on the job board and in its notices. |
| `description` | A line or two about it. |
| `blocked` | Why an application is refused. Each is a [`Blocked`](/docs/reference/actions#blocked) entry, `{ when, reason }`, as an action's are. The first whose `when` holds refuses `jobs/apply` with its `reason`. |
| `at` | The [places](/docs/plugins/places) locations shifts are worked at. Anywhere if left out. |
| `days` | The calendar's weekdays it has shifts on, from 0 (with the default week, 0 is Monday and 5 is Saturday). Every day if left out. |
| `hours` | The calendar's periods a shift can start in. Any if left out. |
| `shift` | What a shift takes. See [ShiftDef](#shiftdef). |
| `ranks` | The ladder, lowest first. The player is hired at the first. See [RankDef](#rankdef). |
| `fire` | What gets the player fired. See [FireDef](#firedef). |

### ShiftDef

```ts
type ShiftDef = { cost?: Record<string, number>; passes?: number; effects?: EffectRef[] }
```

| Field | What it is |
|---|---|
| `cost` | Stats a shift spends, such as `{ energy: 25 }`. Checked against what the stat reads, as an action's cost is, and shown as the button's price. |
| `passes` | How many of the calendar's periods it takes, applied as [`calendar/pass`](/docs/plugins/calendar#effects). The calendar's [price note](/docs/plugins/calendar#price-notes), such as `until afternoon`, shows on the button. |
| `effects` | More effects, applied after the cost and the time and before the pay, such as a performance stat going up. |

### RankDef

```ts
type RankDef = {
  id: string
  name: string
  pay: Record<string, number>
  requires?: { shifts?: number; when?: Condition }
}
```

| Field | What it is |
|---|---|
| `id` | Unique within the job. [`jobs.hired(job, rank)`](#conditions) names it. |
| `name` | What the player reads, such as "Barista". |
| `pay` | What a shift pays at this rank, by stat, such as `{ coins: 16 }`. |
| `requires` | What it takes to be promoted to it: shifts worked in all, a condition, or both. The first rank can't have one. |

The player is promoted after any command once the next rank's `requires` are met, and can go up more than one rank at once. Each promotion raises a notice.

### FireDef

```ts
type FireDef = { missed?: number; when?: Condition }
```

| Field | What it is |
|---|---|
| `missed` | Fired once the player has missed this many shifts in all. |
| `when` | Fired as soon as this holds after a command, such as `{ stat: 'performance', lt: 20 }`. |

## Shifts

`jobs/work` works one shift. It's refused with the first of these that applies:

1. `There’s no such job.`
2. `You don’t work there.` when the player doesn't hold the job.
3. `You aren’t at work.` when the game has places and the player isn't at one of the job's `at`.
4. `No shift today.` when the game has the calendar and today isn't one of the job's `days`.
5. `Not a time for a shift.` when the game has the calendar and it isn't one of the job's `hours`.
6. `You’ve done today’s shift.` when the player has already worked one today.
7. The stat's own [`lacking`](/docs/reference/stats#statdef) line, when the player has too little for the cost.

A shift applies, in order: the cost, the time (`passes`), the shift's own `effects`, then the pay at the player's rank. Each is an ordinary effect, so the game's `rules.onStat` and the calendar see them. The shift is then counted.

### Missed shifts

After every command, the plugin looks at the days that ended during it. Each one that had a shift for a job the player holds, and that they didn't work, counts as a missed shift. The day the player was hired doesn't count. With the calendar, only the job's `days` have shifts. Without it, every turn is a day with a shift.

Days that pass outside a command, such as a test moving the clock with [`write`](/docs/reference/plugins#defineplugin), aren't counted.

### Firing

After every command, the player is fired from a job whose `fire.missed` has been reached or whose `fire.when` holds. They lose the job, a notice is raised, and `jobs/apply` refuses them with `They won’t have you back.` The [`jobs/hire`](#commands-and-effects) effect can still take them on again.

### A weekly payday

A rank's `pay` is paid at the end of each shift. For wages that come once a week, pay into a stat the player doesn't spend and pay that out on payday. Declare a hidden stat, pay the rank in it, and move it into coins from [`rules.onTurn`](/docs/reference/rules#a-days-end-step-by-step) on the right night:

```ts
import type { GameRules, StatDef } from '@ifloom/engine'

const stats: StatDef[] = [{ id: 'owed', label: 'Wages owed', max: 9999, listed: false }]

// in the job: ranks: [{ id: 'help', name: 'Weekend help', pay: { owed: 12 } }]

const rules: GameRules = {
  // Friday night, in a game whose turn is a day and starts on a Monday.
  onTurn: (state, { apply }) =>
    (state.turn - 1) % 7 === 4
      ? apply([
          { stat: 'coins', by: state.stats.owed ?? 0 },
          { stat: 'owed', to: 0 },
          { notify: 'Payday', id: 'payday', tag: 'money' },
        ])
      : state,
}
```

Days missed add nothing to `owed`, so the week's pay is the wage times the days worked.

### "Worked today"

`jobs.worked(job)` holds once a shift at the job is done today, for the rest of the day. It reads the same record as the refusal "You’ve done today’s shift.", so the two always agree. Without a job it holds for any job the player holds. Use it for a reminder such as "Work is due" on every screen:

```ts
import { jobs } from '@ifloom/plugin-jobs'
import { calendar } from '@ifloom/plugin-calendar'

// a line in a place's body
{ prose: 'warn.work', when: { all: [jobs.hired('weekend'), calendar.weekday(5), { not: jobs.worked('weekend') }] } }
```

A day is the calendar's day, or a turn in a game without the calendar. `jobs.shifts` counts every shift instead.

## Conditions

| Content writes | Helper | Holds when |
|---|---|---|
| `{ 'jobs/hired': { job, rank? } }` | `jobs.hired(job, rank?)` | The player holds the job, at that rank if given. |
| `{ 'jobs/fired': { job } }` | `jobs.fired(job)` | The player was fired from it and hasn't been hired again. |
| `{ 'jobs/shifts': { job, gte… } }` | `jobs.shifts(job, range)` | The player holds the job and has worked a number of shifts in the [range](/docs/reference/conditions#range). |
| `{ 'jobs/worked': { job } }`, or `true` for any job | `jobs.worked(job?)` | A shift at the job was worked today: the calendar's day, or this turn without the calendar. See ["Worked today"](#worked-today). |

## Commands and effects

| Content writes | Helper | Does |
|---|---|---|
| `{ 'jobs/apply': { id } }` | `jobs.apply(job)` | A command. Hires the player at the first rank of the job `id`, unless one of its `blocked` entries holds. Refused with `You already work there.` when they do. |
| `{ 'jobs/work': { id } }` | `jobs.work(job)` | A command. Works a shift at the job `id`: see [Shifts](#shifts). |
| `{ 'jobs/quit': { id } }` | `jobs.quit(job)` | A command. Leaves the job `id`. They can apply again. |
| `{ 'jobs/hire': { job } }` | `jobs.hire(job)` | An effect. Hires the player now without asking its `blocked` entries, even after they were fired. |
| `{ 'jobs/fire': { job } }` | `jobs.fire(job)` | An effect. Fires the player now, with the notice. |

## Opening the job board

Nothing about a job is drawn by itself. Content opens the job board in the `jobs` [panel](/docs/reference/panels) with `jobs.open`, from anything that runs effects: a town hall's action, a choice in a person's scene, a newspaper's `use`, a job site's button on a laptop. Give it job ids to show only those, as a newspaper's ads would.

```ts
import { jobs } from '@ifloom/plugin-jobs'

// Every job: { panel: 'jobs' }
{ id: 'work', effects: [{ scene: null }, jobs.open()] }
// Only the paper's ads: { panel: 'jobs', with: { job: ['dogs'] } }
{ id: 'paper', name: 'newspaper', description: 'Today’s Gazette.', use: { label: 'Read the job ads', effects: [jobs.open(['dogs'])] } }
```

The board stays open while the player applies, and closes when a turn ends or the scene changes, so working a shift that passes time closes it. See [How long a panel stays open](/docs/reference/panels#how-long-a-panel-stays-open).

The checker reports a `job` list entry the game doesn't have (`unknown job "circus"`), and a `job` that isn't a list of ids.

## Strings

| Key | English |
|---|---|
| `jobs/unknown` | `There’s no such job.` |
| `jobs/alreadyHired` | `You already work there.` |
| `jobs/wasFired` | `They won’t have you back.` |
| `jobs/notHired` | `You don’t work there.` |
| `jobs/notHere` | `You aren’t at work.` |
| `jobs/noShiftToday` | `No shift today.` |
| `jobs/notNow` | `Not a time for a shift.` |
| `jobs/workedToday` | `You’ve done today’s shift.` |
| `jobs/promoted` | `Promoted: {title}`, the notice's title, with the new rank's name. |
| `jobs/firedNotice` | `You’ve lost your job: {title}`, with the job's name. |

The notices are tagged `jobs`, with the ids `job.<id>.rank` and `job.<id>.fired`.

## The view

`view(state, game).plugins.jobs` is a `JobsView`.

Its [React UI](#the-react-ui) draws the `jobs` panel as a [`JobBoard`](#jobboard) in a dialog, through [`PanelHost`](/docs/react/components#panelhost). [`useJobs`](#usejobs) gives the same data and the apply, work and quit commands with no markup.

### JobsView

```ts
type JobsView = { jobs: JobView[] }
```

Every job, in the order the game declares them.

### JobView

```ts
type JobView = {
  id: string
  name: string
  description: string
  hired: boolean
  firedOn: number | null
  rank: RankView | null
  next: (RankView & { shiftsToGo: number }) | null
  pay: Price | null
  shifts: number
  missed: number
  nextShift: { day: number; inDays: number } | null
  apply: RenderedChoice | null
  work: RenderedChoice | null
}
type RankView = { id: string; name: string; pay: Price | null }
```

| Field | What it is |
|---|---|
| `firedOn` | The day the player was fired, or `null`. |
| `rank` | The rank held, or `null` when not hired. |
| `next` | The next rank up and how many more shifts it needs, or `null` at the top or when not hired. `shiftsToGo` is 0 when the shifts are done and only its `when` is missing. |
| `pay` | What a shift pays now, as a [`Price`](/docs/reference/view#price). For a job not held, the first rank's pay. |
| `shifts`, `missed` | Shifts worked and missed in all. |
| `nextShift` | The next day with a shift, the calendar's day or the turn, and how many days away (0 for today). `null` when not hired, or when there's none in the next two weeks. |
| `apply` | The button that applies, built with [`renderAction`](/docs/reference/view#renderaction), or `null` once hired or fired. Its `disabled` is the reason of the first `blocked` entry that holds. |
| `work` | The button that works a shift, or `null` when not hired. Its `price` is the shift's cost, and its `disabled` says why not. |

## The React UI

`@ifloom/plugin-jobs/react` draws the job board, for a game drawn with [`@ifloom/react`](/docs/react). List `jobsUi` in the game's [`plugins`](/docs/react/kit#the-plugins-option) and the `jobs` panel, which [`jobs.open`](#opening-the-job-board) opens, is drawn as the [`JobBoard`](#jobboard), only the jobs it was opened with if it names any.

It's yours to leave out. Draw the plugin yourself from `view.plugins.jobs`, or from [`useJobs`](#usejobs) with your own markup, and nothing of ours is drawn: that's as much a way to use the plugin as ours. React and `@ifloom/react` are optional peers of the plugin, and a game drawn with another UI never loads this subpath.

```tsx
import { mountGame } from '@ifloom/react'
import { jobsUi } from '@ifloom/plugin-jobs/react'

mountGame(game, { plugins: [jobsUi] })
```

### jobsUi

```ts
const jobsUi: PluginUi
```

The plugin's [`PluginUi`](/docs/react/kit#pluginui): the `jobs` panel, which [`jobs.open`](#opening-the-job-board) opens, is drawn as the [`JobBoard`](#jobboard), only the jobs it was opened with if it names any.

Its words are in `JOBS_WORDS`. A game rewords any of them with `ui.<key>` in its strings, as it does the React UI's own: `{ 'ui.applyJob': '…' }`.

| Key | English |
|---|---|
| `ui.applyJob` | `Apply` |
| `ui.jobFired` | `Let go` |
| `ui.jobMissed` | `Missed: {n}` |
| `ui.jobNextRank` | `Next: {title}, after {n} more shifts` |
| `ui.jobNextRankOne` | `Next: {title}, after 1 more shift` |
| `ui.jobNextRankSoon` | `Next: {title}` |
| `ui.jobPay` | `Pays {pay} a shift` |
| `ui.jobShifts` | `Shifts worked: {n}` |
| `ui.jobs` | `Jobs` |
| `ui.quitJob` | `Quit` |
| `ui.shiftInDays` | `Next shift: in {n} days` |
| `ui.shiftToday` | `Next shift: today` |
| `ui.shiftTomorrow` | `Next shift: tomorrow` |
| `ui.workShift` | `Work a shift` |

### JobBoard

```tsx
function JobBoard(props: { className?: string; title?: string | false; jobs?: readonly string[] }): JSX.Element | null
```

Every [job](/docs/plugins/jobs), held or not, from [`JobView`](/docs/plugins/jobs#jobview)s, under the heading `ui.jobs` or `title` (`false` leaves it out). `jobs` shows only those, by id, as the `jobs` panel does for `with.job`. Each job (`data-job`, with `data-hired` while it's held and `data-fired` once the player was fired) shows its title, the rank held on a badge (unless it has the job's own title), its description, and:

- what a shift pays (`ui.jobPay`, `Pays 12 coins a shift`)
- the next shift (`ui.shiftToday`, `ui.shiftTomorrow` or `ui.shiftInDays`), for a job held
- the next rank and how many more shifts it needs (`ui.jobNextRank`, `ui.jobNextRankOne`, or `ui.jobNextRankSoon` when shifts aren't what's missing)
- the shifts worked and missed (`ui.jobShifts`, `ui.jobMissed`)
- **Let go** (`ui.jobFired`) on a job the player was fired from.

A job not held has **Apply** (`ui.applyJob`), a [`ChoiceButton`](/docs/react/components#choicebutton) from the job's `apply` button, greyed out with the reason of its first `blocked` entry that holds. A job held has **Work a shift** (`ui.workShift`), with the shift's cost as its price and the reason it can't be worked now, such as `No shift today.`, and a **Quit** button (`ui.quitJob`) that sends `jobs/quit`.

It draws nothing in a game without the plugin or with no jobs to show.

Replaceable as `JobBoard` in [`components`](/docs/react/components#components). Parts: `jobs`, `jobs-title`, `job` (with `data-job`, `data-hired` and `data-fired`), `job-title`, `job-rank`, `job-fired`, `job-text`, `job-details`, `job-pay`, `job-shift`, `job-next`, `job-record`, `job-actions`, `choice` and `button`.

### useJobs

```ts
function useJobs(): JobsControls | null

type JobsControls = JobsView & {
  held: JobView[]
  apply: (job: string) => Result<GameState>
  work: (job: string) => Result<GameState>
  quit: (job: string) => Result<GameState>
}
```

The jobs plugin's view ([`JobsView`](/docs/plugins/jobs#jobsview): `jobs`), the jobs held as `held`, and its commands, or `null` in a game without the plugin. `apply`, `work` and `quit` send `jobs/apply`, `jobs/work` and `jobs/quit`. [`JobBoard`](#jobboard) is drawn from it.

```tsx
import { useJobs } from '@ifloom/plugin-jobs/react'

function NextShift() {
  const job = useJobs()?.held[0]
  if (!job?.nextShift) return null
  return <p className="text-sm">{job.name}: next shift in {job.nextShift.inDays} days</p>
}
```

## The state

### JobsState

```ts
type JobsState = { held: Record<string, HeldJob>; fired: Record<string, number> }
type HeldJob = { rank: number; shifts: number; missed: number; hiredOn: number; lastWorked: number | null }
```

What the plugin keeps in a save, at `state.plugins.jobs`: each job the player holds, with their rank (from 0), shifts worked and missed, the day they were hired and the day of their last shift, and each job they were fired from, with the day. A save from before the plugin was added loads with no jobs held.

## For code

### Helpers

```ts
const jobs: {
  (): DefinedPlugin<JobsState, JobsView>
  apply(job: string): CommandRef
  work(job: string): CommandRef
  quit(job: string): CommandRef
  hire(job: string): EffectRef
  fire(job: string): EffectRef
  hired(job: string, rank?: string): Condition
  fired(job: string): Condition
  shifts(job: string, range: Range): Condition
  worked(job?: string): Condition
  open(jobs?: string[]): Effect
}
```

`jobs.open` opens the job board in the `jobs` panel, with only `jobs` on it if given. See [Opening the job board](#opening-the-job-board).

### jobsOf and jobOf

```ts
function jobsOf(game: Game): JobDef[]
function jobOf(game: Game, id: string): JobDef | undefined
```

The game's jobs, merged from its content and packs: `game.data.jobs.jobs`. `jobOf` is the one with this id, or `undefined`.

## Checks

When the game loads, the plugin reports these problems against the content or pack each job came from, with `where` as `jobs <id>`:

- No ranks (`has no ranks`), two ranks with one id, or `requires` on the first rank.
- An unknown stat in the shift's cost or a rank's pay (`rank barista: unknown stat "gold"`).
- Anything a `blocked` entry, the shift's effects, a rank's `when` or `fire.when` names that the game doesn't have.
- A `days` entry that isn't a whole number from 0, a negative `passes`, or `fire.missed` below 1.
- An unknown location in `at`, when the game has places.

A command that names a job the game doesn't have gives `unknown job "…"` where it's written.

## Gotchas

- **One shift a day.** Even with several `hours`, a job has one shift a day.
- **A day is the calendar's, not a turn.** With the calendar's turn set to a period, several turns can pass in a day and still be one shift.
- **Missed shifts count in all, not in a row.** Working a shift doesn't clear them. Use `fire.when` with a stat of your own for anything subtler, such as a performance stat that shifts raise and missed days lower.
- **Promotion is checked after every command,** not only after a shift, so a rank whose `when` reads a stat can come from anywhere the stat goes up.

## See it in an example

Small Town: `weekend` in [`examples/showcase/src/story/cafe.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/cafe.ts) is Saturday mornings at the café, with a promotion after three shifts and firing after two missed. Ava's "Ask about weekend work" choice opens the whole board with `jobs.open()`. `dogs`, walking dogs in the park on weekday evenings ([`examples/showcase/src/story/park.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/park.ts)), is in the newspaper's ads, whose `use` opens the board with only that job.
