import type { GameState, Result } from '@ifloom/engine'
import type { JobView, JobsView } from '@ifloom/plugin-jobs'
import { badgeVariants } from '../components/ui/badge.tsx'
import { buttonVariants } from '../components/ui/button.tsx'
import { ChoiceButton, usePriceText } from './choices.tsx'
import { useGame } from './context.tsx'
import { overridable, usePart } from './overrides.tsx'
import { useWords } from './words.ts'

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
  const words = useWords()
  const priceText = usePriceText()
  const board = usePart('jobs', 'flex flex-col gap-3', className)
  const heading = usePart('jobs-title', 'font-heading font-semibold')
  const card = usePart('job', 'flex flex-col gap-2 rounded-lg border p-3')
  const jobTitle = usePart('job-title', 'flex flex-wrap items-center gap-2 font-medium')
  const rank = usePart('job-rank', badgeVariants({ variant: 'secondary' }))
  const fired = usePart('job-fired', badgeVariants({ variant: 'outline' }))
  const text = usePart('job-text', 'text-sm text-muted-foreground')
  const details = usePart('job-details', 'flex flex-col gap-0.5 text-sm')
  const pay = usePart('job-pay', '')
  const shift = usePart('job-shift', '')
  const next = usePart('job-next', 'text-muted-foreground')
  const record = usePart('job-record', 'text-xs text-muted-foreground')
  const actions = usePart('job-actions', 'flex flex-col gap-1.5')
  const quit = usePart('button', `${buttonVariants({ size: 'sm', variant: 'ghost' })} self-start`)
  const jobs = useJobs()
  const shown = only ? (jobs?.jobs ?? []).filter((job) => only.includes(job.id)) : (jobs?.jobs ?? [])
  if (!jobs || !shown.length) return null
  const shiftLine = (inDays: number) => (inDays === 0 ? words('shiftToday') : inDays === 1 ? words('shiftTomorrow') : words('shiftInDays', { n: inDays }))
  const nextLine = (job: JobView) => {
    const up = job.next
    if (!up) return null
    if (up.shiftsToGo === 0) return words('jobNextRankSoon', { title: up.title })
    return up.shiftsToGo === 1 ? words('jobNextRankOne', { title: up.title }) : words('jobNextRank', { title: up.title, n: up.shiftsToGo })
  }
  return (
    <section {...board} data-jobs>
      {title === false ? null : <h3 {...heading}>{title ?? words('jobs')}</h3>}
      {shown.map((job) => {
        const paid = priceText(job.pay)
        const promotion = nextLine(job)
        return (
          <article key={job.id} {...card} data-job={job.id} data-hired={job.hired ? '' : undefined} data-fired={job.firedOn !== null ? '' : undefined}>
            <p {...jobTitle}>
              {job.title}
              {/* The rank, unless it's only the job's own title again. */}
              {job.rank && job.rank.title !== job.title ? <span {...rank}>{job.rank.title}</span> : null}
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
                {job.hired ? (
                  <button type="button" {...quit} onClick={() => jobs.quit(job.id)}>
                    {words('quitJob')}
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
