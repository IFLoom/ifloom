/**
 * @ifloom/plugin-jobs/react: the jobs plugin's React UI, for a game drawn
 * with `@ifloom/react`. List `jobsUi` in the game's `plugins`
 * to have the `jobs` panel drawn as a job board, or draw it yourself from
 * `useJobs`.
 */
import type { ComponentProps } from 'react'
import type { GameState, Result } from '@ifloom/engine'
import type { JobView, JobsView } from '../index.ts'
import { buttonVariants, ChoiceButton, overridable, type Override, type PluginUi, useGame, useKitPart, usePart, useWords } from '@ifloom/react'

/** The jobs plugin's words, in English. A game rewords any with `ui.<key>` in its strings. */
export const JOBS_WORDS = {
  applyJob: 'Apply',
  jobFired: 'Let go',
  jobMissed: 'Missed: {n}',
  jobNextRank: 'Next: {title}, after {n} more shifts',
  jobNextRankOne: 'Next: {title}, after 1 more shift',
  jobNextRankSoon: 'Next: {title}',
  jobPay: 'Pays {pay} a shift',
  jobShifts: 'Shifts worked: {n}',
  jobs: 'Jobs',
  shiftInDays: 'Next shift: in {n} days',
  shiftToday: 'Next shift: today',
  shiftTomorrow: 'Next shift: tomorrow',
  workShift: 'Work a shift',
} as const

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

/** What `useJobs` returns: the jobs plugin's view, the jobs held, and its commands. */
export type JobsControls = JobsView & {
  /** The jobs the player holds, in the order the game declares them. */
  held: JobView[]
  /** Apply for a job: sends `jobs/apply`, refused with the reason its `apply` button gives. */
  apply: (job: string) => Result<GameState>
  /** Work a shift: sends `jobs/work`. */
  work: (job: string) => Result<GameState>
  /** Leave a job: sends `jobs/quit`. The player can apply again. */
  quit: (job: string) => Result<GameState>
}

/** The jobs plugin's view with its commands, or null in a game without the plugin. `JobBoard` is drawn from it. */
export function useJobs(): JobsControls | null {
  const { view, send } = useGame()
  const jobs = view.plugins.jobs as JobsView | undefined
  if (!jobs) return null
  const command = (name: string, id: string) => send({ type: 'custom', name: `jobs/${name}`, with: { id } })
  return {
    ...jobs,
    held: jobs.jobs.filter((job) => job.hired),
    apply: (job) => command('apply', job),
    work: (job) => command('work', job),
    quit: (job) => command('quit', job),
  }
}

function JobBoardImpl({ className, title, jobs: only }: { className?: string; title?: string | false; jobs?: readonly string[] }) {
  const { send } = useGame()
  const words = useWords(JOBS_WORDS)
  const board = usePart('jobs', 'flex flex-col gap-3', className)
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
  const jobs = useJobs()
  const shown = only ? (jobs?.jobs ?? []).filter((job) => only.includes(job.id)) : (jobs?.jobs ?? [])
  if (!jobs || !shown.length) return null
  const shiftLine = (inDays: number) => (inDays === 0 ? words('shiftToday') : inDays === 1 ? words('shiftTomorrow') : words('shiftInDays', { n: inDays }))
  const nextLine = (job: JobView) => {
    const up = job.next
    if (!up) return null
    if (up.shiftsToGo === 0) return words('jobNextRankSoon', { title: up.name })
    return up.shiftsToGo === 1 ? words('jobNextRankOne', { title: up.name }) : words('jobNextRank', { title: up.name, n: up.shiftsToGo })
  }
  return (
    <section {...board} data-jobs>
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
 * The job board: every job, with its rank once held, what a shift pays, the
 * next shift, how far to the next rank and the shifts worked and missed. A
 * job not held has an Apply button, greyed out with what's missing; a job held
 * has Work a shift, with the shift's cost and why it can't be worked now, and
 * Quit. A job the player was fired from says so. `jobs` shows only those
 * jobs, by id, as a newspaper's ads would; `title={false}` leaves the heading
 * off, as the `jobs` panel does under its dialog's title. A thin default on `useJobs`.
 */
export const JobBoard = overridable('JobBoard', JobBoardImpl)

/** The `jobs` panel: the jobs on the open board, as the view has them, already filtered by what it was opened with. */
function JobsPanel() {
  const board = useJobs()?.panel
  return board ? <JobBoard title={false} jobs={board.map((job) => job.id)} /> : null
}

/**
 * The jobs plugin's React UI, for `plugins` on `mountGame` or
 * `GameProvider`: the `jobs` panel, which `jobs.open()` opens, drawn as the
 * `JobBoard` (only the jobs it was opened with, if any), and the jobs' words.
 * It puts nothing in the layout by itself: content opens the board.
 */
export const jobsUi: PluginUi = {
  id: 'jobs',
  words: JOBS_WORDS,
  panels: { jobs: { component: JobsPanel, title: 'jobs' } },
}
