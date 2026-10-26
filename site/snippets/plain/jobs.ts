import type { RunnerSnapshot } from '@ifloom/engine'
// add and drawChoices, as in the vanilla template's src/main.ts.
import { add, drawChoices } from './runner.ts'

/** The `jobs` panel, from drawPanel: jobs.open() opens it, and jobs.open(['dogs']) with only those. */
export function drawJobs(parent: HTMLElement, { view }: RunnerSnapshot): void {
  // The jobs on the open board, already filtered by what it was opened with; null while it's shut.
  for (const job of view.plugins.jobs?.panel ?? []) {
    const card = add(parent, 'section', '', 'job')
    add(card, 'h3', job.rank ? `${job.name}: ${job.rank.name}` : job.name)
    add(card, 'p', job.description)
    if (job.pay) add(card, 'p', `Pays ${job.pay.text} a shift`)
    if (job.nextShift) add(card, 'p', job.nextShift.inDays ? `Next shift in ${job.nextShift.inDays} days` : 'A shift today')
    // Ready-made buttons: Apply while you don't have the job, Work and Quit while you do, each with why it can't be done.
    drawChoices(
      card,
      [job.apply, job.work, job.quit].filter((button) => button !== null),
    )
  }
}
