import { useQuests } from '@ifloom/plugin-quests/react'

export function Objective() {
  const quests = useQuests()
  const tracked = quests?.active.find((quest) => quest.tracked)
  return tracked ? (
    <p className="text-sm">
      {tracked.name}: {tracked.hint}
    </p>
  ) : null
}
