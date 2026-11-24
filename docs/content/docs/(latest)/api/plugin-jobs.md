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

What gets the player fired.

```ts shape
import type { FireDef } from '@ifloom/plugin-jobs'
type FireDef = {
  missed?: number
  when?: Condition
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `missed` | `number` | yes |  | Fired after missing this many shifts in all. |
| `when` | [`Condition`](/docs/api/engine#condition) | yes |  | Fired as soon as this holds after a command: a performance stat too low, say. |

### HeldJob

Type. Explained in [Jobs](/docs/plugins/jobs#heldjob).

A job the player holds, as the save keeps it.

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
| `rank` | `number` |  |  | Which rank, from 0. |
| `shifts` | `number` |  |  | Shifts worked in all. |
| `missed` | `number` |  |  | Shifts missed in all. |
| `hiredOn` | `number` |  |  | The day they were hired: the calendar's day, or the turn without one. |
| `lastWorked` | `number \| null` |  |  | The day of the last shift worked, or null. |

### JobDef

Type. Explained in [Jobs](/docs/plugins/jobs#jobdef).

A job in the game's content: one entry of `data.jobs.jobs`, the plugin's list of jobs.

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
| `id` | `string` |  |  |  |
| `name` | `string` |  |  | What the player reads: "Weekend help". |
| `description` | `string` | yes |  | A line or two about it, for the job board. |
| `blocked` | [`Blocked[]`](/docs/api/engine#blocked) | yes |  | Why an application is refused: the first entry whose `when` holds gives its reason. |
| `days` | `number[]` | yes |  | The weekdays it has shifts on, with the calendar plugin, from 0. Every day if left out. |
| `hours` | `string[]` | yes |  | The periods a shift can start in, with the calendar plugin. Any if left out. |
| `shift` | [`ShiftDef`](#shiftdef) |  |  | What a shift costs, pays and takes. See `ShiftDef`. |
| `ranks` | [`RankDef[]`](#rankdef) |  |  | The ladder, lowest first. The player is hired at the first. |
| `fire` | [`FireDef`](#firedef) | yes |  | When the player is fired for missing shifts. Never, if left out. |

### jobOf

Function. Explained in [Jobs](/docs/plugins/jobs#jobsof-and-jobof).

One of the game's jobs, by id.

```ts shape
import { jobOf } from '@ifloom/plugin-jobs'
function jobOf(game: Game, id: string): JobDef | undefined
```

Uses: [`Game`](/docs/api/engine#game), [`JobDef`](#jobdef).

### jobs

Function. Explained in [Jobs](/docs/plugins/jobs#jobs).

The plugin, with its helpers on it: `jobs()` makes the plugin for the
game's `plugins`, and content is written with `jobs.apply('cafe')` and `jobs.fire('cafe')`.

```ts shape
import { jobs } from '@ifloom/plugin-jobs'
function jobs(): DefinedPlugin<JobsState, JobsView>
```

Uses: [`DefinedPlugin`](/docs/api/engine-plugin#definedplugin), [`JobsState`](#jobsstate), [`JobsView`](#jobsview).

| Helper | Signature | Description |
|---|---|---|
| `jobs.open` | `(jobs?: string[]):` [`Effect`](/docs/api/engine#effect) |  |
| `jobs.apply` | `(job: string):` [`CommandRef`](/docs/api/engine#commandref) |  |
| `jobs.work` | `(job: string):` [`CommandRef`](/docs/api/engine#commandref) |  |
| `jobs.quit` | `(job: string):` [`CommandRef`](/docs/api/engine#commandref) |  |
| `jobs.hire` | `(job: string):` [`EffectRef`](/docs/api/engine#effectref) |  |
| `jobs.fire` | `(job: string):` [`EffectRef`](/docs/api/engine#effectref) |  |
| `jobs.hired` | `(job: string, rank?: string):` [`Condition`](/docs/api/engine#condition) |  |
| `jobs.fired` | `(job: string):` [`Condition`](/docs/api/engine#condition) |  |
| `jobs.shifts` | `(job: string, range:` [`Range`](/docs/api/engine#range)`):` [`Condition`](/docs/api/engine#condition) |  |
| `jobs.worked` | `(job?: string):` [`Condition`](/docs/api/engine#condition) |  |

### jobsOf

Function. Explained in [Jobs](/docs/plugins/jobs#jobsof-and-jobof).

The game's jobs: `data.jobs.jobs`, from its content and packs.

```ts shape
import { jobsOf } from '@ifloom/plugin-jobs'
function jobsOf(game: Game): JobDef[]
```

Uses: [`Game`](/docs/api/engine#game), [`JobDef`](#jobdef).

### JobsState

Type. Explained in [Jobs](/docs/plugins/jobs#jobsstate).

What the plugin keeps in a save.

```ts shape
import type { JobsState } from '@ifloom/plugin-jobs'
type JobsState = {
  held: Record<string, HeldJob>
  fired: Record<string, number>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `held` | `Record<string,` [`HeldJob`](#heldjob)`>` |  |  | The jobs the player holds, by id. |
| `fired` | `Record<string, number>` |  |  | Jobs the player was fired from, with the day. They can't apply again. |

### JobsView

Type. Explained in [Jobs](/docs/plugins/jobs#jobsview).

```ts shape
import type { JobsView } from '@ifloom/plugin-jobs'
type JobsView = {
  jobs: JobView[]
  panel: JobView[] | null
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `jobs` | [`JobView[]`](#jobview) |  |  | Every job, in the order the game declares them. |
| `panel` | [`JobView[]`](#jobview) `\| null` |  |  | The jobs on the open job board, the `jobs` panel: only those its `with.job` lists, or every job when it lists none. Null while no job board is open. What a UI draws in the panel, already filtered. |

### JobView

Type. Explained in [Jobs](/docs/plugins/jobs#jobview).

A job as the UI shows it.

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
| `id` | `string` |  |  |  |
| `name` | `string` |  |  |  |
| `description` | `string` |  |  | A line or two about it; `''` with none. |
| `hired` | `boolean` |  |  | Whether the player holds it now. |
| `firedOn` | `number \| null` |  |  | The day the player was fired, or null. |
| `rank` | [`RankView`](#rankview) `\| null` |  |  | The rank held, or null when not hired. |
| `next` | `(`[`RankView`](#rankview) `& { shiftsToGo: number }) \| null` |  |  | The next rank up, and how many more shifts it needs (0 when shifts aren't what's missing), or null at the top or when not hired. |
| `pay` | [`Price`](/docs/api/engine#price) `\| null` |  |  | What a shift pays now: the rank's pay, or the first rank's for a job not held. |
| `shifts` | `number` |  |  | Shifts worked in all. |
| `missed` | `number` |  |  | Shifts missed in all. |
| `nextShift` | `{ day: number; inDays: number } \| null` |  |  | The next day with a shift: `inDays` 0 for today. Null when not hired or nothing is due in the next two weeks. |
| `apply` | [`RenderedChoice`](/docs/api/engine#renderedchoice) `\| null` |  |  | The button that applies, or null once hired or fired. Its `disabled` says what's missing. |
| `work` | [`RenderedChoice`](/docs/api/engine#renderedchoice) `\| null` |  |  | The button that works a shift, or null when not hired. Its `price` is the shift's cost. |
| `quit` | [`RenderedChoice`](/docs/api/engine#renderedchoice) `\| null` |  |  | The button that leaves the job, labelled with the `jobs/quit` string (`Quit`), or null when not hired. |

### RankDef

Type. Explained in [Jobs](/docs/plugins/jobs#rankdef).

One step on a job's ladder.

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
| `id` | `string` |  |  |  |
| `name` | `string` |  |  | What the player reads: "Barista". |
| `pay` | `Record<string, number>` |  |  | What a shift pays at this rank, by stat: `{ coins: 18 }`. |
| `requires` | `{ shifts?: number; when?:` [`Condition`](/docs/api/engine#condition) `}` | yes |  | What it takes to be promoted to it. The first rank, where the player starts, needs nothing. |

### RankView

Type. Explained in [Jobs](/docs/plugins/jobs#rankview).

A rank as the UI shows it.

```ts shape
import type { RankView } from '@ifloom/plugin-jobs'
type RankView = {
  id: string
  name: string
  pay: Price | null
}
```

### ShiftDef

Type. Explained in [Jobs](/docs/plugins/jobs#shiftdef).

What working one shift takes.

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
| `blocked` | [`Blocked[]`](/docs/api/engine#blocked) | yes |  | Why a shift is refused: the first entry whose `when` holds gives its reason. A workplace is one, with the places plugin: `places.onlyAt(['cafe'], { string: 'jobs/notHere' })`, which never holds without it. |
| `cost` | `Record<string, number>` | yes |  | Stats it spends, by id: `{ energy: 30 }`. Checked before the shift, like an action's cost. |
| `passes` | `number` | yes |  | How many of the calendar's periods it takes. None if left out, or without the calendar. |
| `effects` | [`EffectRef[]`](/docs/api/engine#effectref) | yes |  | More effects, applied after the cost and before the pay: a performance stat going up, say. |

## @ifloom/plugin-jobs/react

- Functions: [`useJobs`](#usejobs)
- Constants: [`JobBoard`](#jobboard), [`JOBS_WORDS`](#jobs_words), [`jobsUi`](#jobsui)
- Types: [`JobsControls`](#jobscontrols)

### JobBoard

Const. Explained in [Jobs](/docs/plugins/jobs#jobboard).

The job board: every job, with its rank once held, what a shift pays, the
next shift, how far to the next rank and the shifts worked and missed. A
job not held has an Apply button, greyed out with what's missing; a job held
has Work a shift, with the shift's cost and why it can't be worked now, and
Quit. A job the player was fired from says so. `jobs` shows only those
jobs, by id, as a newspaper's ads would; `title={false}` leaves the heading
off, as the `jobs` panel does under its dialog's title. A thin default on `useJobs`.

```ts shape
import { JobBoard } from '@ifloom/plugin-jobs/react'
const JobBoard: ComponentType<{ className?: string; title?: string | false; jobs?: readonly string[]; }>
```

### JOBS_WORDS

Const.

The jobs plugin's words, in English. A game rewords any with `ui.<key>` in its strings.

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

### JobsControls

Type.

What `useJobs` returns: the jobs plugin's view, the jobs held, and its commands.

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
| `jobs` | [`JobView[]`](#jobview) |  |  | Every job, in the order the game declares them. |
| `panel` | [`JobView[]`](#jobview) `\| null` |  |  | The jobs on the open job board, the `jobs` panel: only those its `with.job` lists, or every job when it lists none. Null while no job board is open. What a UI draws in the panel, already filtered. |
| `held` | [`JobView[]`](#jobview) |  |  | The jobs the player holds, in the order the game declares them. |
| `apply` | `(job: string) =>` [`Result`](/docs/api/engine#result)`<`[`GameState`](/docs/api/engine#gamestate)`>` |  |  | Apply for a job: sends `jobs/apply`, refused with the reason its `apply` button gives. |
| `work` | `(job: string) =>` [`Result`](/docs/api/engine#result)`<`[`GameState`](/docs/api/engine#gamestate)`>` |  |  | Work a shift: sends `jobs/work`. |
| `quit` | `(job: string) =>` [`Result`](/docs/api/engine#result)`<`[`GameState`](/docs/api/engine#gamestate)`>` |  |  | Leave a job: sends `jobs/quit`. The player can apply again. |

### jobsUi

Const. Explained in [Jobs](/docs/plugins/jobs#jobsui).

The jobs plugin's React UI, for `plugins` on `mountGame` or
`GameProvider`: the `jobs` panel, which `jobs.open()` opens, drawn as the
`JobBoard` (only the jobs it was opened with, if any), and the jobs' words.
It puts nothing in the layout by itself: content opens the board.

```ts shape
import { jobsUi } from '@ifloom/plugin-jobs/react'
const jobsUi: PluginUi
```

Uses: [`PluginUi`](/docs/api/react-kit#pluginui).

### useJobs

Function. Explained in [Jobs](/docs/plugins/jobs#usejobs).

The jobs plugin's view with its commands, or null in a game without the plugin. `JobBoard` is drawn from it.

```ts shape
import { useJobs } from '@ifloom/plugin-jobs/react'
function useJobs(): JobsControls | null
```

Uses: [`JobsControls`](#jobscontrols).
