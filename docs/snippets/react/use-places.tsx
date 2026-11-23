import { usePlaces } from '@ifloom/plugin-places/react'

export function ExitList() {
  const places = usePlaces()
  if (!places) return null
  return (
    <ul>
      {places.exits.map((exit) => (
        <li key={exit.id}>
          <button disabled={Boolean(exit.disabled)} onClick={() => places.go(exit.id)}>
            {exit.label}
          </button>
        </li>
      ))}
    </ul>
  )
}
