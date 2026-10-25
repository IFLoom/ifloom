import { DiceRoll, useFreshRolls } from '@ifloom/react'

// Scene draws a roll above the block whose `dice` hint names it, and the others over the scene for a moment.
// To show them somewhere of your own: the last command's rolls while they're new, so each tumbles once.
export function LastRolls() {
  const { rolls, at } = useFreshRolls()
  return (
    <div key={at} className="rolls">
      {rolls.map((roll) => (
        <DiceRoll key={roll.key} roll={roll} />
      ))}
    </div>
  )
}
