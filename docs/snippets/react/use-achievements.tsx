import { useAchievements } from '@ifloom/plugin-achievements/react'

export function Trophies() {
  const data = useAchievements()
  return data ? (
    <span>
      {data.earned}/{data.total}
    </span>
  ) : null
}
