---
title: "Jobs"
description: "The jobs plugin adds jobs the player applies for, works shifts at, is promoted in and can be fired from."
---
`@ifloom/plugin-jobs` adds jobs the player applies for, works shifts at, is promoted in and can be fired from. A shift costs stats such as energy and time on the clock, and pays a wage at the rank the player holds. The game declares its jobs in `data.jobs.jobs`, so a mod adds or changes one. Jobs needs no other plugin, and it cooperates with the [calendar](/docs/reference/plugins/calendar) for shift days, hours and time, and with [places](/docs/reference/plugins/places) for a workplace. [Add a plugin](/docs/how-to/add-a-plugin) installs it, and [Open a shop, a job board or another panel](/docs/how-to/open-a-panel) opens a job board.

In the showcase: `examples/showcase/src/story/cafe.ts`, whose `weekend` job is Saturday mornings at the café with a promotion after three shifts, and `examples/showcase/src/story/park.ts`, whose `dogs` job is in the newspaper's ads.

```ts
import {
  jobs,
  jobsOf,
  jobOf,
  type FireDef,
  type HeldJob,
  type JobDef,
  type JobsState,
  type JobsView,
  type JobView,
  type RankDef,
  type RankView,
  type ShiftDef,
} from '@ifloom/plugin-jobs'
```

## jobs

The plugin's factory, which returns the plugin with the id `jobs`. It takes no options. Every field of its result is in [`jobs`](/docs/api/plugin-jobs#jobs), and its helpers are listed under [Functions](#functions).

A new game holds no job. After every command that goes through, the plugin's [`onCommand`](/docs/reference/plugin-api#oncommand) hook reviews each job the player holds, in this order:

1. It counts a missed shift for each day that ended during the command, had a shift and wasn't worked. The day the player was hired doesn't count, and days that pass outside a command aren't counted.
2. It fires the player from a job whose `fire.missed` is reached or whose `fire.when` holds.
3. It promotes the player up every rank whose `requires` are met, so one command can climb several ranks.

A day is the calendar's day, or a turn in a game without the calendar. List jobs after the calendar in `plugins`, so the hook sees the new day.

```ts
import { loadGame, type Content } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { jobs } from '@ifloom/plugin-jobs'
import { places } from '@ifloom/plugin-places'

declare const town: Content

export const { game } = loadGame([town], { id: 'small-town', title: 'Small Town', plugins: [calendar(), places({ start: 'flat' }), jobs()] })
```

## Content

### JobDef

A job the game declares in `data.jobs.jobs`. Every field is in [`JobDef`](/docs/api/plugin-jobs#jobdef).

The loader merges jobs by id, so a mod adds a job or replaces one whole. `blocked` holds [`Blocked`](/docs/reference/actions#blocked) entries that refuse an application while their `when` holds, with the reason of the first that holds. `days` are the calendar's weekdays with a shift, from 0 (Monday with the default week), and `hours` are the periods a shift can start in. With no `days` every day has a shift, and with no `hours` any period does. Without the calendar, every turn has a shift.

```ts
import type { Content } from '@ifloom/engine'
import type { JobDef } from '@ifloom/plugin-jobs'
import { places } from '@ifloom/plugin-places'

const weekend: JobDef = {
  id: 'weekend',
  name: 'Weekend help',
  description: 'Saturday mornings behind the counter at the Corner Café.',
  blocked: [{ when: { not: { stat: 'friendship', of: 'character:ava', gte: 10 } }, reason: 'Ava doesn’t know you well enough yet.' }],
  days: [5],
  hours: ['morning'],
  shift: { cost: { energy: 25 }, passes: 1, blocked: [places.onlyAt(['cafe'], { string: 'jobs/notHere' })] },
  ranks: [
    { id: 'help', name: 'Weekend help', pay: { coins: 12 } },
    { id: 'barista', name: 'Barista', pay: { coins: 16 }, requires: { shifts: 3 } },
  ],
  fire: { missed: 2 },
}

export const cafe: Content = { data: { jobs: { jobs: [weekend] } } }
```

### ShiftDef

What one shift of a job costs, takes and does, in its `shift`. Every field is in [`ShiftDef`](/docs/api/plugin-jobs#shiftdef).

`blocked` refuses a shift while an entry's `when` holds. A workplace is one entry, [`places.onlyAt()`](/docs/reference/plugins/places#functions), which never holds in a game without places. `cost` is what a shift spends, checked against what each stat reads, as an action's cost is. `passes` is how many of the calendar's periods a shift takes, applied as [`calendar/pass`](/docs/reference/plugins/calendar#calendarpass), so the button shows the calendar's price note, such as `until afternoon`. Without the calendar a shift takes no time.

A shift applies the cost, then the time, then the shift's own `effects`, then the pay at the player's rank. Each is an ordinary effect, so the game's [`onStat`](/docs/reference/rules) hook and the calendar see them.

### RankDef

One rank on a job's ladder, an entry of its `ranks`, lowest first. Every field is in [`RankDef`](/docs/api/plugin-jobs#rankdef).

The player is hired at the first rank, which has no `requires`. `pay` is what a shift pays at the rank, by stat. `requires` holds the shifts worked in all and a condition the next rank needs, and the plugin promotes the player after any command once both are met, with a notice. A rank's `id` is unique within its job, and [`jobs/hired`](#jobshired) names it.

### FireDef

What gets the player fired from a job, in its `fire`. Every field is in [`FireDef`](/docs/api/plugin-jobs#firedef).

`missed` fires the player once they've missed that many shifts in all, and working a shift doesn't clear the count. `when` fires them as soon as it holds after a command, such as a performance stat below 20 that shifts raise and missed days lower. The player is never fired with no `fire`.

A fired player loses the job, gets a notice, and `jobs/apply` refuses them with `They won’t have you back.`. The [`jobs/hire`](#jobshire) effect can still take them on again.

## Conditions

Each condition is a [plugin call](/docs/reference/custom#plugincall), written by the helper beside it. An unknown job is false.

### jobs/hired

Holds while the player holds the job, at the rank `rank` if given.

```ts fragment
{ 'jobs/hired': { job: 'weekend', rank: 'barista' } } // jobs.hired('weekend', 'barista')
```

### jobs/fired

Holds once the player has been fired from the job, until something hires them again.

```ts fragment
{ 'jobs/fired': { job: 'weekend' } } // jobs.fired('weekend')
```

### jobs/shifts

Holds while the player holds the job and the shifts worked there fall in the [range](/docs/reference/common#range).

```ts fragment
{ 'jobs/shifts': { job: 'weekend', gte: 3 } } // jobs.shifts('weekend', { gte: 3 })
```

### jobs/worked

Holds once a shift at the job is done today, for the rest of the day. With no job it holds for any job the player holds. It reads the same record as the refusal `You’ve done today’s shift.`, so the two always agree.

```ts fragment
{ 'jobs/worked': { job: 'weekend' } } // jobs.worked('weekend')
```

A line in a location's body reminds the player on a Saturday they haven't worked yet:

```ts
import type { Block } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { jobs } from '@ifloom/plugin-jobs'

export const reminder: Block = { text: 'Work is due.', when: { all: [jobs.hired('weekend'), calendar.weekday(5), { not: jobs.worked('weekend') }] } }
```

## Effects

### jobs/hire

Hires the player at the job's first rank now, without asking its `blocked` entries, and clears a firing. It does nothing while the player holds the job, or for a job the game doesn't have.

```ts fragment
{ 'jobs/hire': { job: 'weekend' } } // jobs.hire('weekend')
```

### jobs/fire

Fires the player from the job now, with the notice. It does nothing while the player doesn't hold the job.

```ts fragment
{ 'jobs/fire': { job: 'weekend' } } // jobs.fire('weekend')
```

## Commands

Each command names its job `id`, and a [lock](/docs/reference/locks) names it `jobs/apply`, `jobs/work` or `jobs/quit`, or all three as `jobs/*`.

### jobs/apply

Hires the player at the job's first rank.

```ts fragment
{ 'jobs/apply': { id: 'weekend' } } // jobs.apply('weekend')
```

The plugin refuses it, in this order:

1. With `There’s no such job.` (`jobs/unknown`) for a job the game doesn't have.
2. With `You already work there.` (`jobs/alreadyHired`) while the player holds the job.
3. With `They won’t have you back.` (`jobs/wasFired`) once the player was fired from it.
4. With the reason of the job's first `blocked` entry that holds.

### jobs/work

Works one shift at the job, which applies the [shift](#shiftdef) and counts it. A job has one shift a day, however many `hours` it lists, and with the calendar's turn set to a period, several turns can pass in a day with still one shift. A shift that pays raises a [notice](/docs/reference/notices), `Paid 12 coins at Weekend help` (`jobs/paid`), with the pay of the rank it was worked at, tagged `jobs`. A game that wants no pay notice rewords `jobs/paid` to `''`.

```ts fragment
{ 'jobs/work': { id: 'weekend' } } // jobs.work('weekend')
```

The command tells the engine what it spends (the [`spends`](/docs/reference/plugin-api#spends) of a plugin command), so a button that sends it shows the shift's cost as its price. The plugin refuses it, in this order:

1. With `There’s no such job.` for a job the game doesn't have.
2. With `You don’t work there.` (`jobs/notHired`) when the player doesn't hold the job.
3. With the reason of the shift's first `blocked` entry that holds, such as `You aren’t at work.` away from the workplace.
4. With `You’ve done today’s shift.` (`jobs/workedToday`) once the player worked one today.
5. With `No shift today.` (`jobs/noShiftToday`) when the game has the calendar and today isn't one of the job's `days`.
6. With `Not a time for a shift.` (`jobs/notNow`) when the game has the calendar and the period isn't one of the job's `hours`.
7. With the stat's [`lacking`](/docs/reference/stats#statwords) line when the player has too little for the cost.

### jobs/quit

Leaves the job, keeping no record of it, so the player can apply again. The plugin refuses it with `You don’t work there.` when the player doesn't hold the job.

```ts fragment
{ 'jobs/quit': { id: 'weekend' } } // jobs.quit('weekend')
```

## Values

Prose prints this as a token.

| Key | Meaning |
|---|---|
| `{{jobs/rank job=weekend}}` | The name of the rank the player holds at the job, such as `Barista`, and empty when they don't hold it. |

A fallback covers the empty case, as in `You work as {{jobs/rank job=weekend|nothing yet}}.`. The name is the rank's `name`, so a translation's [words table](/docs/reference/words) changes it too. The [`jobs/hired`](#jobshired) condition with its `rank` tests which rank the player holds.

## State

### JobsState

The jobs a save keeps at `state.plugins.jobs`: each job the player holds, by id, and the day they were fired from each job, by id. Every field is in [`JobsState`](/docs/api/plugin-jobs#jobsstate).

The save keeps no job's name, shift or ranks, which the plugin reads from content. A UI reads [`JobsView`](#jobsview) instead.

### HeldJob

One job the player holds, an entry of `held`. Every field is in [`HeldJob`](/docs/api/plugin-jobs#heldjob).

`rank` is the rank's place in the job's `ranks`, from 0. `shifts` and `missed` count in all. `hiredOn` and `lastWorked` are days, the calendar's or the turn, and `lastWorked` is `null` before the first shift.

## View

The plugin adds nothing to the room or the screen. A job board shows when content opens the `jobs` [panel](/docs/reference/panels) with `jobs.open()`, or when a UI lists the jobs itself. The plugin raises notices tagged `jobs` for a promotion, with the id `job.<id>.rank`, and for a firing, with the id `job.<id>.fired`.

### JobsView

The jobs as the player sees them, in `view.plugins.jobs`. Every field is in [`JobsView`](/docs/api/plugin-jobs#jobsview).

`jobs` lists every job, in the order the game declares them. `panel` lists the jobs on the open job board, found through the engine's [`panelOf`](/docs/reference/panels#panelof): only those the panel's `with.job` names, or every job when it names none. It's `null` while no `jobs` panel is open.

```ts fragment
{ jobs: [{ id: 'weekend', name: 'Weekend help', hired: false, rank: null, pay: { text: '12 coins', … }, apply: { … }, work: null, quit: null, … }], panel: null }
```

### JobView

One job as the player sees it, an entry of `jobs` or `panel`. Every field is in [`JobView`](/docs/api/plugin-jobs#jobview).

`pay` is what a shift pays now as a [`Price`](/docs/reference/view#price), the held rank's, or the first rank's for a job not held. `next` is the next rank up with `shiftsToGo`, the shifts it still needs, which is 0 when only its `when` is missing, and `null` at the top or when not hired. `nextShift` is the next day with a shift and `inDays`, 0 for today, or `null` when not hired or when no shift falls in the next 14 days.

`apply`, `work` and `quit` are [`RenderedChoice`](/docs/reference/view#renderedchoice) buttons. `apply` is labelled with the job's name, and it's `null` once the player holds the job or was fired from it. `work` is labelled with the job's name, with the shift's cost as its `price`, and `quit` is labelled with the `jobs/quit` string. Both are `null` when not hired, and each has the reason it's refused in `disabled`.

### RankView

One rank as the player sees it, in a job's `rank` and `next`: its id, its name and what a shift at it pays. Every field is in [`RankView`](/docs/api/plugin-jobs#rankview).

[Render a job board](/docs/how-to/render/things-plugins#render-a-job-board) renders this view in Plain JS, React and Vue.

## React UI

The React UI is optional: the `@ifloom/plugin-jobs/react` subpath renders the job board for a game that uses [`@ifloom/react`](/docs/reference/react), and a game rendered another way never loads it. [Show plugins in the React UI](/docs/how-to/react/show-plugin-uis) adds it to a game.

### jobsUi

The plugin's [`PluginUi`](/docs/reference/react/kit#pluginui), listed in `mountGame`'s `plugins`. It renders the `jobs` panel as the [`JobBoard`](#jobboard), with only the jobs the panel names if it names any. Its type is in [`jobsUi`](/docs/api/plugin-jobs#jobsui).

### JOBS_WORDS

The words the jobs UI uses, by key, which a game rewords as `ui.<key>` in its strings as it does the React UI's own. Its value is in [`JOBS_WORDS`](/docs/api/plugin-jobs#jobs_words). The quit button uses the plugin's own [strings](#strings).

| Key | Meaning |
|---|---|
| `ui.jobs` | `Jobs`, the title of the board. |
| `ui.applyJob` | `Apply`, the label of a job's apply button. |
| `ui.workShift` | `Work a shift`, the label of a held job's work button. |
| `ui.jobPay` | `Pays {pay} a shift`. |
| `ui.shiftToday`, `ui.shiftTomorrow`, `ui.shiftInDays` | `Next shift: today`, `Next shift: tomorrow` and `Next shift: in {n} days`. |
| `ui.jobNextRank`, `ui.jobNextRankOne`, `ui.jobNextRankSoon` | `Next: {title}, after {n} more shifts`, `Next: {title}, after 1 more shift`, and `Next: {title}` when only the rank's condition is missing. |
| `ui.jobShifts`, `ui.jobMissed` | `Shifts worked: {n}` and `Missed: {n}`. |
| `ui.jobFired` | `Let go`, the badge on a job the player was fired from. |

### JobBoard

Renders the jobs from `view.plugins.jobs`, held or not, under the heading `ui.jobs`. Its props are in [`JobBoard`](/docs/api/plugin-jobs#jobboard).

Each job shows its name, the rank held on a badge, its description, its pay, the next shift, the next rank and the shifts worked and missed. A job not held has **Apply**, a [`ChoiceButton`](/docs/reference/react/components#choicebutton) from its `apply` button, refused with the reason of the first `blocked` entry that holds. A held job has **Work a shift**, with the shift's cost as its price, and the view's **Quit** button. `jobs` shows only those jobs, by id, and `title` replaces the heading, or leaves it out as `false`.

It renders nothing in a game without the plugin or with no jobs to show. A game replaces it as `JobBoard` in [`components`](/docs/reference/react/components#components). Its parts are `jobs`, `jobs-title`, `job` (with `data-job`, `data-hired` and `data-fired`), `job-title`, `job-rank`, `job-fired`, `job-text`, `job-details`, `job-pay`, `job-shift`, `job-next`, `job-record`, `job-actions`, `choice` and `button`.

### useJobs

Returns the jobs' view from the running game with the jobs held and an `apply`, a `work` and a `quit` that send its commands, or `null` in a game without the plugin. It re-renders when the view changes. Its signature is in [`useJobs`](/docs/api/plugin-jobs#usejobs).

### JobsControls

The value `useJobs` returns, a [`JobsView`](#jobsview) with `held`, `apply(job)`, `work(job)` and `quit(job)`. Every field is in [`JobsControls`](/docs/api/plugin-jobs#jobscontrols). `held` lists the jobs the player holds, in the order the game declares them, and each command returns the runner's [`Result`](/docs/reference/common#result).

::include[../../../../../snippets/react/use-jobs.tsx]

## Functions

The helpers are properties of `jobs` and write its calls, typed:

- **`jobs.apply(job)`**, **`jobs.work(job)`** and **`jobs.quit(job)`** return the [commands](#commands) as a [`CommandRef`](/docs/reference/custom#commandref).
- **`jobs.hire(job)`** and **`jobs.fire(job)`** return the [effects](#effects).
- **`jobs.hired(job, rank?)`**, **`jobs.fired(job)`**, **`jobs.shifts(job, range)`** and **`jobs.worked(job?)`** return the [conditions](#conditions).
- **`jobs.open(jobs?)`** returns the engine's [`panel`](/docs/reference/effects#panel) effect that opens the job board, `{ panel: 'jobs' }`, or `{ panel: 'jobs', with: { job: jobs } }` to show only those jobs.

The café's notice opens a board with only the weekend job:

```ts
import type { ActionDef } from '@ifloom/engine'
import { jobs } from '@ifloom/plugin-jobs'

export const notice: ActionDef = { id: 'notice', label: 'Read the notice by the till', effects: [jobs.open(['weekend'])] }
```

### jobsOf

Returns the game's jobs from `data.jobs.jobs`, merged from its content and packs, in order. Its signature is in [`jobsOf`](/docs/api/plugin-jobs#jobsof).

### jobOf

Returns the job with this id, or `undefined` when the game has none. Its signature is in [`jobOf`](/docs/api/plugin-jobs#jobof).

```ts given
import { jobOf, jobsOf } from '@ifloom/plugin-jobs'

jobsOf(game).map((job) => job.id) // ['weekend', 'dogs']
jobOf(game, 'weekend')?.ranks[1]?.name // 'Barista'
```

## Checks

When the game loads, the plugin reports problems with each job against the content or pack it came from, with `where` as `jobs <id>`:

| Problem | Cause |
|---|---|
| `has no ranks` | The job's `ranks` is empty. |
| `two ranks are called "help"` | Two ranks of the job share an id. |
| `the first rank, "help", is where the player starts, so it can't have requires` | The first rank has `requires`. |
| `shift: unknown stat "stamina"`, `rank barista: unknown stat "gold"` | The shift's cost or a rank's pay names a stat the game doesn't have. |
| `blocked: unknown kind "thing"` | A `blocked` entry, the shift's effects, a rank's `when` or `fire.when` names something the game doesn't have. |
| `days: 7.5 is not a weekday` | A `days` entry isn't a whole number from 0. |
| `shift.passes must be 0 or more`, `fire.missed must be 1 or more` | `passes` is negative, or `fire.missed` is below 1. |

A `jobs` condition, effect or command that names a job the game doesn't have gives `unknown job "circus"` where it's written, such as `action y: unknown job "circus"`. A `jobs` panel whose `job` names a job the game doesn't have gives the same, and one whose `job` isn't a list gives `the jobs panel's job is a list of job ids`. A shift's `places.onlyAt()` entry that names an unknown location is reported by places.

## Strings

A game, a pack or a translation rewords these by their full key in its [strings](/docs/reference/strings#stringkey-and-strings).

| Key | Meaning |
|---|---|
| `jobs/unknown` | `There’s no such job.` |
| `jobs/alreadyHired` | `You already work there.` |
| `jobs/wasFired` | `They won’t have you back.` |
| `jobs/notHired` | `You don’t work there.` |
| `jobs/notHere` | `You aren’t at work.`, a reason for a shift's `places.onlyAt()` entry, written `{ string: 'jobs/notHere' }`. The plugin doesn't use it itself. |
| `jobs/noShiftToday` | `No shift today.` |
| `jobs/notNow` | `Not a time for a shift.` |
| `jobs/workedToday` | `You’ve done today’s shift.` |
| `jobs/promoted` | `Promoted: {title}`, the promotion notice's title, with the new rank's name. |
| `jobs/paid` | `Paid {pay} at {title}`, the notice a paid shift raises, with its pay and the job's name. Reworded to `''`, no notice. |
| `jobs/firedNotice` | `You’ve lost your job: {title}`, the firing notice's title, with the job's name. |
| `jobs/quit` | `Quit`, the label of a held job's `quit` button. |

## Caveats

- Missed shifts count in all, not in a row, so a `fire.when` on a stat of your own suits anything subtler.
- The plugin promotes after every command, not only after a shift, so a rank whose `when` reads a stat can come from anywhere the stat goes up.
- A rank's pay arrives at the end of each shift. For a weekly payday, [Run things each day](/docs/how-to/schedule-daily-work) pays a hidden stat and moves it into coins on the right night.
