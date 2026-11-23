import { useState } from 'react'
import { useUnlocks } from '@ifloom/plugin-unlocks/react'

export function CodeBox() {
  const unlocks = useUnlocks()
  const [code, setCode] = useState('')
  if (!unlocks?.available) return null
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void unlocks.enter(code)
      }}
    >
      <input value={code} onChange={(event) => setCode(event.target.value)} />
      <button disabled={unlocks.checking}>Unlock</button>
      {unlocks.message ?? (unlocks.entered ? `Unlocked: ${unlocks.entered.name}.` : null)}
      {unlocks.restart ? (
        <button type="button" onClick={unlocks.restart}>
          Restart
        </button>
      ) : null}
    </form>
  )
}
