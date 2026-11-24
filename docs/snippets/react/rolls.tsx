import { DiceRoll, useScene } from '@ifloom/react'

// Scene draws a roll above the block whose `dice` hint names it, and the others over the scene for a moment.
// To show them somewhere of your own: the last command's rolls while they're new, so each tumbles once.
export function LastRolls() {
  const { rolls } = useScene()
  return (
    <div key={rolls.at} className="rolls">
      {rolls.fresh.map((roll) => (
        <DiceRoll key={roll.key} roll={roll} />
      ))}
    </div>
  )
}
