import type { View } from '@ifloom/engine'
// add and drawChoices, as in the vanilla template's src/main.ts.
import { add, drawChoices } from './runner.ts'

/** The `jobs` panel, from drawPanel: jobs.open() opens it, and jobs.open(['dogs']) with { job: ['dogs'] } for only those. */
export function drawJobs(parent: HTMLElement, view: View): void {
  if (view.panel?.panel !== 'jobs') return
  const only = view.panel.with.job
  const jobs = (view.plugins.jobs?.jobs ?? []).filter((job) => !Array.isArray(only) || only.includes(job.id))
  for (const job of jobs) {
    const card = add(parent, 'section', '', 'job')
    add(card, 'h3', job.rank ? `${job.name}: ${job.rank.name}` : job.name)
    add(card, 'p', job.description)
    const pay = job.pay?.stats?.map((stat) => stat.text).join(', ')
    if (pay) add(card, 'p', `Pays ${pay} a shift`)
    if (job.nextShift) add(card, 'p', job.nextShift.inDays ? `Next shift in ${job.nextShift.inDays} days` : 'A shift today')
    // Ready-made buttons: Apply while you don't have the job, Work while you do, each with why it can't be done.
    drawChoices(
      card,
      [job.apply, job.work].filter((button) => button !== null),
    )
  }
}
