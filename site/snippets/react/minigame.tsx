import { useMinigame } from '@ifloom/react'

// Scene draws a MinigameCard while one runs, and runs its clock. For one minigame of your own, give mountGame's
// `panels` a component under the minigame's id, such as `{ arrows: ArrowPad }`.
export function ArrowPad() {
  // With keys: true, the arrow keys press the inputs too.
  const { minigame, send } = useMinigame({ keys: true })
  if (!minigame) return null
  return (
    <div className="arrows">
      <p>{minigame.label}</p>
      {minigame.inputs.map((input) => (
        <button key={input} onClick={() => send(input)}>
          {input}
        </button>
      ))}
    </div>
  )
}
