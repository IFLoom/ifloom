import { useStatuses } from '@ifloom/plugin-statuses/react'

export function StatusIcons() {
  const active = useStatuses()?.active ?? []
  return <p>{active.map((status) => `${status.name} (${status.turnsLeft})`).join(', ')}</p>
}
