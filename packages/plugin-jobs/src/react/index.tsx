/**
 * The jobs plugin's React UI, for a game rendered with `@ifloom/react`.
 *
 * List `jobsUi` in the game's `plugins` to render the `jobs` panel as a job board. To render it yourself, read
 * `useJobs`.
 */
import type { ComponentProps } from 'react'
import type { GameState, Result } from '@ifloom/engine'
import { jobs, type JobView, type JobsView } from '../index.ts'
import { ChoiceButton, usePart } from '@ifloom/react'
import { buttonVariants, overridable, type Override, pluginKit, type PluginUi, useKitPart, usePlugin } from '@ifloom/react/kit'

/** The jobs plugin's UI words, in English. A game rewords any of them with `ui.<key>` in its strings. */
export const JOBS_WORDS = {
  /** The label of the button that applies for a job. */
  applyJob: 'Apply',
  /** The badge on a job the player was fired from. */
  jobFired: 'Let go',
  /** The count of shifts missed, with `{n}`. */
  jobMissed: 'Missed: {n}',
  /** The line that names the next rank, with its `{title}` and the `{n}` shifts still to work. */
  jobNextRank: 'Next: {title}, after {n} more shifts',
  /** The line that names the next rank, with its `{title}`, when one shift is still to work. */
  jobNextRankOne: 'Next: {title}, after 1 more shift',
  /** The line that names the next rank, with its `{title}`, when no more shifts are needed. */
  jobNextRankSoon: 'Next: {title}',
  /** The line that gives a shift's pay, with `{pay}`. */
  jobPay: 'Pays {pay} a shift',
  /** The count of shifts worked, with `{n}`. */
  jobShifts: 'Shifts worked: {n}',
  /** The title of the job board. */
  jobs: 'Jobs',
  /** The line that gives the next shift, `{n}` days ahead. */
  shiftInDays: 'Next shift: in {n} days',
  /** The line that gives the next shift as today. */
  shiftToday: 'Next shift: today',
  /** The line that gives the next shift as tomorrow. */
  shiftTomorrow: 'Next shift: tomorrow',
  /** The label of the button that works a shift. */
  workShift: 'Work a shift',
} as const

/** The jobs plugin's UI, declared once: its id and its words, for `usePlugin` and `jobsUi`. */
const JOBS = pluginKit('jobs', JOBS_WORDS)

declare module '@ifloom/react' {
  interface OverridableComponents {
    JobBoard: Override<ComponentProps<typeof JobBoard>>
  }
  interface PartNames {
    'job': true
    'job-actions': true
    'job-details': true
    'job-fired': true
    'job-next': true
    'job-pay': true
    'job-rank': true
    'job-record': true
    'job-shift': true
    'job-text': true
    'job-title': true
    'jobs': true
    'jobs-title': true
  }
}

/** The jobs plugin's view with the jobs held and functions that send its commands, as `useJobs` returns it. */
export type JobsControls = JobsView & {
  /** The jobs the player holds, in the order the game declares them. */
  held: JobView[]
  /** Sends `jobs/apply` for the job. A refusal carries the same reason its `apply` button shows. */
  apply: (job: string) => Result<GameState>
  /** Sends `jobs/work`, which works a shift at the job. */
  work: (job: string) => Result<GameState>
  /** Sends `jobs/quit`, which leaves the job. The player can apply again. */
  quit: (job: string) => Result<GameState>
}

/** Returns the jobs plugin's view and commands from the running game, or null in a game without the plugin. It re-renders when the view changes. */
export function useJobs(): JobsControls | null {
  const { view, send } = usePlugin(JOBS)
  if (!view) return null
  return {
    ...view,
    held: view.jobs.filter((job) => job.hired),
    apply: (job) => send(jobs.apply(job)),
    work: (job) => send(jobs.work(job)),
    quit: (job) => send(jobs.quit(job)),
  }
}

function JobBoardImpl({ className, title, jobs: only }: { className?: string; title?: string | false; jobs?: readonly string[] }) {
  const { words, send } = usePlugin(JOBS)
  const list = usePart('jobs', 'flex flex-col gap-3', className)
  const heading = useKitPart('heading', 'jobs-title')
  const card = useKitPart('card', 'job')
  const jobTitle = useKitPart('title', 'job-title')
  const rank = useKitPart('badge', 'job-rank')
  const fired = useKitPart('badge', 'job-fired')
  const text = useKitPart('note', 'job-text')
  const details = usePart('job-details', 'flex flex-col gap-0.5 text-sm')
  const pay = usePart('job-pay', '')
  const shift = usePart('job-shift', '')
  const next = useKitPart('note', 'job-next')
  const record = useKitPart('note', 'job-record')
  const actions = useKitPart('commands', 'job-actions')
  const quit = usePart('button', `${buttonVariants({ size: 'sm', variant: 'ghost' })} self-start`)
  const board = useJobs()
  const shown = only ? (board?.jobs ?? []).filter((job) => only.includes(job.id)) : (board?.jobs ?? [])
  if (!board || !shown.length) return null
  const shiftLine = (inDays: number) => (inDays === 0 ? words('shiftToday') : inDays === 1 ? words('shiftTomorrow') : words('shiftInDays', { n: inDays }))
  const nextLine = (job: JobView) => {
    const up = job.next
    if (!up) return null
    if (up.shiftsToGo === 0) return words('jobNextRankSoon', { title: up.name })
    return up.shiftsToGo === 1 ? words('jobNextRankOne', { title: up.name }) : words('jobNextRank', { title: up.name, n: up.shiftsToGo })
  }
  return (
    <section {...list} data-jobs>
      {title === false ? null : <h3 {...heading}>{title ?? words('jobs')}</h3>}
      {shown.map((job) => {
        const paid = job.pay?.text
        const promotion = nextLine(job)
        return (
          <article key={job.id} {...card} data-job={job.id} data-hired={job.hired ? '' : undefined} data-fired={job.firedOn !== null ? '' : undefined}>
            <p {...jobTitle}>
              {job.name}
              {/* The rank, unless it's only the job's own name again. */}
              {job.rank && job.rank.name !== job.name ? <span {...rank}>{job.rank.name}</span> : null}
              {job.firedOn !== null ? <span {...fired}>{words('jobFired')}</span> : null}
            </p>
            {job.description ? <p {...text}>{job.description}</p> : null}
            <div {...details}>
              {paid ? <p {...pay}>{words('jobPay', { pay: paid })}</p> : null}
              {job.nextShift ? <p {...shift}>{shiftLine(job.nextShift.inDays)}</p> : null}
              {promotion ? <p {...next}>{promotion}</p> : null}
              {job.hired ? (
                <p {...record}>
                  {words('jobShifts', { n: job.shifts })}
                  {job.missed ? ` · ${words('jobMissed', { n: job.missed })}` : null}
                </p>
              ) : null}
            </div>
            {job.apply || job.work ? (
              <div {...actions}>
                {job.apply ? <ChoiceButton choice={{ ...job.apply, label: words('applyJob') }} /> : null}
                {job.work ? <ChoiceButton choice={{ ...job.work, label: words('workShift') }} /> : null}
                {job.quit ? (
                  <button type="button" {...quit} disabled={Boolean(job.quit.disabled)} title={job.quit.disabled} onClick={() => send(job.quit!.command)}>
                    {job.quit.label}
                  </button>
                ) : null}
              </div>
            ) : null}
          </article>
        )
      })}
    </section>
  )
}

/**
 * Renders the job board from `view.plugins.jobs.jobs`, each job with its rank, pay, next shift, promotion and record.
 * The `jobs` prop shows only those jobs by id, and `title={false}` leaves the heading off.
 *
 * A job not held has an Apply button, and a job held has Work a shift and Quit. A disabled button shows the engine's
 * reason, and a job the player was fired from says so. A preset can style the parts `jobs`, `jobs-title`, `job`,
 * `job-title`, `job-rank`, `job-fired`, `job-text`, `job-details`, `job-pay`, `job-shift`, `job-next`, `job-record`
 * and `job-actions`.
 */
export const JobBoard = overridable('JobBoard', JobBoardImpl)

/** The `jobs` panel: the jobs on the open board, as the view has them, already filtered by what it was opened with. */
function JobsPanel() {
  const board = useJobs()?.panel
  return board ? <JobBoard title={false} jobs={board.map((job) => job.id)} /> : null
}

/**
 * The jobs plugin's React UI, for `plugins` on `mountGame` or `GameProvider`. It renders the `jobs` panel, which
 * `jobs.open()` opens, as a `JobBoard` of the jobs it was opened with, and adds the plugin's words.
 *
 * It adds nothing to the layout, so the board shows only when content opens it.
 */
export const jobsUi: PluginUi = {
  ...JOBS,
  panels: { jobs: { component: JobsPanel, title: 'jobs' } },
}
