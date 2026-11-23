import { useCheats } from '@ifloom/plugin-cheats/react'

export function QuickCoins() {
  const cheats = useCheats()
  const coins = cheats?.cheats.find((cheat) => cheat.id === 'coins')
  if (!cheats || !coins) return null
  return (
    <button disabled={Boolean(coins.button.disabled)} onClick={() => cheats.use('coins')}>
      {coins.name}
    </button>
  )
}
