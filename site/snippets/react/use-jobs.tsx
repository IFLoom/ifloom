import { useJobs } from '@ifloom/plugin-jobs/react'

export function NextShift() {
  const job = useJobs()?.held[0]
  if (!job?.nextShift) return null
  return (
    <p className="text-sm">
      {job.name}: next shift in {job.nextShift.inDays} days
    </p>
  )
}
