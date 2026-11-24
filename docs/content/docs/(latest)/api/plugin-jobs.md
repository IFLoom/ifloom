---
title: "@ifloom/plugin-jobs"
description: "Every export of @ifloom/plugin-jobs and its /react subpath: its signature and its fields."
---
Generated from the source of `@ifloom/plugin-jobs` and `@ifloom/plugin-jobs/react` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

## @ifloom/plugin-jobs

- Functions: [`jobOf`](#jobof), [`jobs`](#jobs), [`jobsOf`](#jobsof)
- Types: [`FireDef`](#firedef), [`HeldJob`](#heldjob), [`JobDef`](#jobdef), [`JobsState`](#jobsstate), [`JobsView`](#jobsview), [`JobView`](#jobview), [`RankDef`](#rankdef), [`RankView`](#rankview), [`ShiftDef`](#shiftdef)

### FireDef

Type. Explained in [Jobs](/docs/plugins/jobs#firedef).

The rules that get the player fired from a job, which the game declares in a `JobDef`'s `fire`.

```ts shape
import type { FireDef } from '@ifloom/plugin-jobs'
type FireDef = {
  missed?: number
  when?: Condition
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `missed` | `number` | yes |  | The number of missed shifts, in all, that gets the player fired. At least 1. |
| `when` | [`Condition`](/docs/api/engine#condition) | yes |  | The condition that gets the player fired as soon as it holds after a command, such as a performance stat too low. |

### HeldJob

Type. Explained in [Jobs](/docs/plugins/jobs#heldjob).

The record a save keeps for a job the player holds, in `JobsState`'s `held`. The job's definition is read from content.

```ts shape
import type { HeldJob } from '@ifloom/plugin-jobs'
type HeldJob = {
  rank: number
  shifts: number
  missed: number
  hiredOn: number
  lastWorked: number | null
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `rank` | `number` |  |  | The index of the rank the player holds, from 0. |
| `shifts` | `number` |  |  | The number of shifts the player has worked at the job. |
| `missed` | `number` |  |  | The number of shifts the player has missed at the job. |
| `hiredOn` | `number` |  |  | The day the player was hired, the calendar's day or the turn without the calendar. |
| `lastWorked` | `number \| null` |  |  | The day of the last shift worked, or null before the first. |

### JobDef

Type. Explained in [Jobs](/docs/plugins/jobs#jobdef).

A job the game declares in `data.jobs.jobs`. It needs at least one rank.

```ts shape
import type { JobDef } from '@ifloom/plugin-jobs'
type JobDef = {
  id: string
  name: string
  description?: string
  blocked?: Blocked[]
  days?: number[]
  hours?: string[]
  shift: ShiftDef
  ranks: RankDef[]
  fire?: FireDef
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The job's id. |
| `name` | `string` |  |  | The job's name, such as "Weekend help". |
| `description` | `string` | yes |  | The job's line or two for the job board. |
| `blocked` | [`Blocked[]`](/docs/api/engine#blocked) | yes |  | The reasons an application is refused. The first entry whose `when` holds gives its reason. |
| `days` | `number[]` | yes |  | The weekdays the job has shifts on, from 0, read with the calendar plugin. Every day if left out. |
| `hours` | `string[]` | yes |  | The calendar periods a shift can start in. Any period if left out. |
| `shift` | [`ShiftDef`](#shiftdef) |  |  | The job's shift, its cost, time and effects. |
| `ranks` | [`RankDef[]`](#rankdef) |  |  | The job's ladder of ranks, lowest first. The player is hired at the first. |
| `fire` | [`FireDef`](#firedef) | yes |  | The rules that get the player fired. The player is never fired if left out. |

### jobOf

Function. Explained in [Jobs](/docs/plugins/jobs#jobsof-and-jobof).

Returns the job with this id, or undefined when the game has none.

```ts shape
import { jobOf } from '@ifloom/plugin-jobs'
function jobOf(game: Game, id: string): JobDef | undefined
```

Uses: [`Game`](/docs/api/engine#game), [`JobDef`](#jobdef).

### jobs

Function. Explained in [Jobs](/docs/plugins/jobs#jobs).

The jobs plugin's factory, with its helpers as properties. `jobs()` returns the plugin for the game's `plugins`,
and content calls helpers such as `jobs.apply('cafe')` and `jobs.fire('cafe')`.

```ts shape
import { jobs } from '@ifloom/plugin-jobs'
function jobs(): DefinedPlugin<JobsState, JobsView>
```

Uses: [`DefinedPlugin`](/docs/api/engine-plugin#definedplugin), [`JobsState`](#jobsstate), [`JobsView`](#jobsview).

| Helper | Signature | Description |
|---|---|---|
| `jobs.open` | `(jobs?: string[]):` [`Effect`](/docs/api/engine#effect) | Returns the effect that opens the job board in the `jobs` panel, showing only `jobs` if given. |
| `jobs.apply` | `(job: string):` [`CommandRef`](/docs/api/engine#commandref) | Returns the `jobs/apply` command, which applies for the job. |
| `jobs.work` | `(job: string):` [`CommandRef`](/docs/api/engine#commandref) | Returns the `jobs/work` command, which works a shift at the job. |
| `jobs.quit` | `(job: string):` [`CommandRef`](/docs/api/engine#commandref) | Returns the `jobs/quit` command, which leaves the job. |
| `jobs.hire` | `(job: string):` [`EffectRef`](/docs/api/engine#effectref) | Returns the `jobs/hire` effect, which hires the player now without checking the job's `blocked`. |
| `jobs.fire` | `(job: string):` [`EffectRef`](/docs/api/engine#effectref) | Returns the `jobs/fire` effect, which fires the player from the job now, with a notice. |
| `jobs.hired` | `(job: string, rank?: string):` [`Condition`](/docs/api/engine#condition) | Returns the `jobs/hired` condition, which holds while the player holds the job, at `rank` if given. |
| `jobs.fired` | `(job: string):` [`Condition`](/docs/api/engine#condition) | Returns the `jobs/fired` condition, which holds once the player has been fired from the job. |
| `jobs.shifts` | `(job: string, range:` [`Range`](/docs/api/engine#range)`):` [`Condition`](/docs/api/engine#condition) | Returns the `jobs/shifts` condition, which holds while the shifts worked at a held job fall in the range. |
| `jobs.worked` | `(job?: string):` [`Condition`](/docs/api/engine#condition) | Returns the `jobs/worked` condition, which holds once the player has worked a shift today, at `job` or at any job. |

### jobsOf

Function. Explained in [Jobs](/docs/plugins/jobs#jobsof-and-jobof).

Returns the game's jobs, from `data.jobs.jobs` in its content and packs.

```ts shape
import { jobsOf } from '@ifloom/plugin-jobs'
function jobsOf(game: Game): JobDef[]
```

Uses: [`Game`](/docs/api/engine#game), [`JobDef`](#jobdef).

### JobsState

Type. Explained in [Jobs](/docs/plugins/jobs#jobsstate).

The jobs a save keeps for the player, held and fired. Jobs themselves are read from content.

```ts shape
import type { JobsState } from '@ifloom/plugin-jobs'
type JobsState = {
  held: Record<string, HeldJob>
  fired: Record<string, number>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `held` | `Record<string,` [`HeldJob`](#heldjob)`>` |  |  | The jobs the player holds, by job id. |
| `fired` | `Record<string, number>` |  |  | The day the player was fired from each job, by job id. The player can't apply for these again. |

### JobsView

Type. Explained in [Jobs](/docs/plugins/jobs#jobsview).

The jobs as the player sees them, in `view.plugins.jobs`.

```ts shape
import type { JobsView } from '@ifloom/plugin-jobs'
type JobsView = {
  jobs: JobView[]
  panel: JobView[] | null
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `jobs` | [`JobView[]`](#jobview) |  |  | The game's jobs, in the order the game declares them. |
| `panel` | [`JobView[]`](#jobview) `\| null` |  |  | The jobs on the open `jobs` panel, or null while it's closed. It holds only the jobs the panel's `with.job` names, or every job when it names none. |

### JobView

Type. Explained in [Jobs](/docs/plugins/jobs#jobview).

A job as the player sees it, in `view.plugins.jobs.jobs`.

```ts shape
import type { JobView } from '@ifloom/plugin-jobs'
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
  quit: RenderedChoice | null
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The job's id. |
| `name` | `string` |  |  | The job's name. |
| `description` | `string` |  |  | The job's description, or `''` when it has none. |
| `hired` | `boolean` |  |  | True while the player holds the job. |
| `firedOn` | `number \| null` |  |  | The day the player was fired from the job, or null. |
| `rank` | [`RankView`](#rankview) `\| null` |  |  | The rank the player holds, or null when not hired. |
| `next` | `(`[`RankView`](#rankview) `& { shiftsToGo: number }) \| null` |  |  | The next rank up with the number of shifts still needed for it, or null at the top or when not hired. `shiftsToGo` is 0 when only the rank's condition is missing. |
| `pay` | [`Price`](/docs/api/engine#price) `\| null` |  |  | The pay for a shift now, the held rank's or the first rank's for a job not held. |
| `shifts` | `number` |  |  | The number of shifts the player has worked at the job. |
| `missed` | `number` |  |  | The number of shifts the player has missed at the job. |
| `nextShift` | `{ day: number; inDays: number } \| null` |  |  | The next day with a shift, with `inDays` 0 for today. Null when not hired or when no shift falls in the next two weeks. |
| `apply` | [`RenderedChoice`](/docs/api/engine#renderedchoice) `\| null` |  |  | The button that applies, or null once hired or fired. Its `disabled` gives the reason an application is refused. |
| `work` | [`RenderedChoice`](/docs/api/engine#renderedchoice) `\| null` |  |  | The button that works a shift, or null when not hired. Its `price` is the shift's cost. |
| `quit` | [`RenderedChoice`](/docs/api/engine#renderedchoice) `\| null` |  |  | The button that leaves the job, labelled with the `jobs/quit` string (`Quit`), or null when not hired. |

### RankDef

Type. Explained in [Jobs](/docs/plugins/jobs#rankdef).

A rank on a job's ladder, which the game declares in a `JobDef`'s `ranks`. The player starts at the first.

```ts shape
import type { RankDef } from '@ifloom/plugin-jobs'
type RankDef = {
  id: string
  name: string
  pay: Record<string, number>
  requires?: { shifts?: number; when?: Condition }
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The rank's id, unique within its job. |
| `name` | `string` |  |  | The rank's name, such as "Barista". |
| `pay` | `Record<string, number>` |  |  | The pay for a shift at this rank, by stat, such as `{ coins: 18 }`. |
| `requires` | `{ shifts?: number; when?:` [`Condition`](/docs/api/engine#condition) `}` | yes |  | The rank's requirements for a promotion, a number of shifts worked and a condition. The first rank, where the player starts, can't have any. |

### RankView

Type. Explained in [Jobs](/docs/plugins/jobs#rankview).

A rank as the player sees it, in a `JobView`'s `rank` and `next`.

```ts shape
import type { RankView } from '@ifloom/plugin-jobs'
type RankView = {
  id: string
  name: string
  pay: Price | null
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The rank's id. |
| `name` | `string` |  |  | The rank's name. |
| `pay` | [`Price`](/docs/api/engine#price) `\| null` |  |  | The pay for a shift at this rank, or null when it pays nothing. |

### ShiftDef

Type. Explained in [Jobs](/docs/plugins/jobs#shiftdef).

A job's shift, which the game declares in a `JobDef`'s `shift`. It sets what one shift costs, takes and does.

```ts shape
import type { ShiftDef } from '@ifloom/plugin-jobs'
type ShiftDef = {
  blocked?: Blocked[]
  cost?: Record<string, number>
  passes?: number
  effects?: EffectRef[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `blocked` | [`Blocked[]`](/docs/api/engine#blocked) | yes |  | The reasons a shift is refused. The first entry whose `when` holds gives its reason. A workplace is one entry, such as `places.onlyAt(['cafe'], { string: 'jobs/notHere' })`, which never holds without the places plugin. |
| `cost` | `Record<string, number>` | yes |  | The stats a shift spends, by id, such as `{ energy: 30 }`. The plugin refuses the shift while the player has too little, as for an action's cost. |
| `passes` | `number` | yes |  | The number of the calendar's periods a shift takes. None if left out, or without the calendar. |
| `effects` | [`EffectRef[]`](/docs/api/engine#effectref) | yes |  | The shift's other effects, which run after the cost and the time and before the pay, such as raising a performance stat. |

## @ifloom/plugin-jobs/react

- Functions: [`useJobs`](#usejobs)
- Constants: [`JobBoard`](#jobboard), [`JOBS_WORDS`](#jobs_words), [`jobsUi`](#jobsui)
- Types: [`JobsControls`](#jobscontrols)

### JobBoard

Const. Explained in [Jobs](/docs/plugins/jobs#jobboard).

Renders the job board from `view.plugins.jobs.jobs`, each job with its rank, pay, next shift, promotion and record.
The `jobs` prop shows only those jobs by id, and `title={false}` leaves the heading off.

A job not held has an Apply button, and a job held has Work a shift and Quit. A disabled button shows the engine's
reason, and a job the player was fired from says so. A preset can style the parts `jobs`, `jobs-title`, `job`,
`job-title`, `job-rank`, `job-fired`, `job-text`, `job-details`, `job-pay`, `job-shift`, `job-next`, `job-record`
and `job-actions`.

```ts shape
import { JobBoard } from '@ifloom/plugin-jobs/react'
const JobBoard: ComponentType<{ className?: string; title?: string | false; jobs?: readonly string[]; }>
```

### JOBS_WORDS

Const.

The jobs plugin's UI words, in English. A game rewords any of them with `ui.<key>` in its strings.

```ts shape
import { JOBS_WORDS } from '@ifloom/plugin-jobs/react'
const JOBS_WORDS: {
  applyJob: 'Apply'
  jobFired: 'Let go'
  jobMissed: 'Missed: {n}'
  jobNextRank: 'Next: {title}, after {n} more shifts'
  jobNextRankOne: 'Next: {title}, after 1 more shift'
  jobNextRankSoon: 'Next: {title}'
  jobPay: 'Pays {pay} a shift'
  jobShifts: 'Shifts worked: {n}'
  jobs: 'Jobs'
  shiftInDays: 'Next shift: in {n} days'
  shiftToday: 'Next shift: today'
  shiftTomorrow: 'Next shift: tomorrow'
  workShift: 'Work a shift'
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `applyJob` | `'Apply'` |  |  | The label of the button that applies for a job. |
| `jobFired` | `'Let go'` |  |  | The badge on a job the player was fired from. |
| `jobMissed` | `'Missed: {n}'` |  |  | The count of shifts missed, with `{n}`. |
| `jobNextRank` | `'Next: {title}, after {n} more shifts'` |  |  | The line that names the next rank, with its `{title}` and the `{n}` shifts still to work. |
| `jobNextRankOne` | `'Next: {title}, after 1 more shift'` |  |  | The line that names the next rank, with its `{title}`, when one shift is still to work. |
| `jobNextRankSoon` | `'Next: {title}'` |  |  | The line that names the next rank, with its `{title}`, when no more shifts are needed. |
| `jobPay` | `'Pays {pay} a shift'` |  |  | The line that gives a shift's pay, with `{pay}`. |
| `jobShifts` | `'Shifts worked: {n}'` |  |  | The count of shifts worked, with `{n}`. |
| `jobs` | `'Jobs'` |  |  | The title of the job board. |
| `shiftInDays` | `'Next shift: in {n} days'` |  |  | The line that gives the next shift, `{n}` days ahead. |
| `shiftToday` | `'Next shift: today'` |  |  | The line that gives the next shift as today. |
| `shiftTomorrow` | `'Next shift: tomorrow'` |  |  | The line that gives the next shift as tomorrow. |
| `workShift` | `'Work a shift'` |  |  | The label of the button that works a shift. |

### JobsControls

Type.

The jobs plugin's view with the jobs held and functions that send its commands, as `useJobs` returns it.

```ts shape
import type { JobsControls } from '@ifloom/plugin-jobs/react'
type JobsControls = {
  jobs: JobView[]
  panel: JobView[] | null
  held: JobView[]
  apply: (job: string) => Result<GameState>
  work: (job: string) => Result<GameState>
  quit: (job: string) => Result<GameState>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `jobs` | [`JobView[]`](#jobview) |  |  | The game's jobs, in the order the game declares them. |
| `panel` | [`JobView[]`](#jobview) `\| null` |  |  | The jobs on the open `jobs` panel, or null while it's closed. It holds only the jobs the panel's `with.job` names, or every job when it names none. |
| `held` | [`JobView[]`](#jobview) |  |  | The jobs the player holds, in the order the game declares them. |
| `apply` | `(job: string) =>` [`Result`](/docs/api/engine#result)`<`[`GameState`](/docs/api/engine#gamestate)`>` |  |  | Sends `jobs/apply` for the job. A refusal carries the same reason its `apply` button shows. |
| `work` | `(job: string) =>` [`Result`](/docs/api/engine#result)`<`[`GameState`](/docs/api/engine#gamestate)`>` |  |  | Sends `jobs/work`, which works a shift at the job. |
| `quit` | `(job: string) =>` [`Result`](/docs/api/engine#result)`<`[`GameState`](/docs/api/engine#gamestate)`>` |  |  | Sends `jobs/quit`, which leaves the job. The player can apply again. |

### jobsUi

Const. Explained in [Jobs](/docs/plugins/jobs#jobsui).

The jobs plugin's React UI, for `plugins` on `mountGame` or `GameProvider`. It renders the `jobs` panel, which
`jobs.open()` opens, as a `JobBoard` of the jobs it was opened with, and adds the plugin's words.

It adds nothing to the layout, so the board shows only when content opens it.

```ts shape
import { jobsUi } from '@ifloom/plugin-jobs/react'
const jobsUi: PluginUi
```

Uses: [`PluginUi`](/docs/api/react-kit#pluginui).

### useJobs

Function. Explained in [Jobs](/docs/plugins/jobs#usejobs).

Returns the jobs plugin's view and commands from the running game, or null in a game without the plugin. It re-renders when the view changes.

```ts shape
import { useJobs } from '@ifloom/plugin-jobs/react'
function useJobs(): JobsControls | null
```

Uses: [`JobsControls`](#jobscontrols).
