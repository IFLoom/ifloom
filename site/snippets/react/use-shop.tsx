import { useShop } from '@ifloom/plugin-shop/react'

export function QuickSandwich() {
  const shop = useShop()
  const counter = shop?.here[0]
  const sandwich = counter?.goods.find((good) => good.entity === 'item:sandwich')
  if (!shop || !counter || !sandwich) return null
  return (
    <button disabled={Boolean(sandwich.buy.disabled)} onClick={() => shop.buy(counter.id, 'item:sandwich')}>
      A sandwich to go
    </button>
  )
}
