import { useInventory } from '@ifloom/plugin-inventory/react'

export function Snacks() {
  const bag = useInventory()
  if (!bag) return null
  const food = bag.things.filter((thing) => thing.ref.startsWith('item:') && thing.use)
  return food.map((thing) => (
    <button key={thing.ref} onClick={() => bag.use(thing.ref)}>
      {thing.use?.label}
    </button>
  ))
}
