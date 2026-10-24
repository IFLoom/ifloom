import type { HeldView } from '@ifloom/engine'
import { useGame } from './context.tsx'
import { overridable, usePart } from './overrides.tsx'
import { useWords } from './words.ts'

export type InventoryProps = {
  className?: string
  /** Replaces the heading; `false` leaves it out, as under a section's title. */
  title?: string | false
  /** A drop button on each thing, where a plugin's UI draws one, such as the inventory plugin's. The core list has none. */
  drop?: boolean
}

function InventoryImpl({ className, title: titleText }: InventoryProps) {
  const { view } = useGame()
  const words = useWords()
  const section = usePart('inventory', 'flex flex-col gap-2 text-sm', className)
  const title = usePart('inventory-title', 'font-heading font-semibold')
  const row = usePart('thing', 'flex flex-col gap-1')
  const name = usePart('thing-name', 'font-medium')
  const count = usePart('thing-count', 'text-muted-foreground')
  const text = usePart('thing-text', 'text-xs text-muted-foreground')
  if (!view.held.length) return null
  return (
    <section {...section} data-inventory>
      {titleText === false ? null : <h3 {...title}>{titleText ?? words('inventory')}</h3>}
      <ul className="flex flex-col gap-2">
        {view.held.map((thing: HeldView) => (
          <li key={`${thing.at}/${thing.ref}`} {...row} data-thing={thing.ref} data-at={thing.at}>
            <p>
              <span {...name}>{thing.name}</span>
              {thing.count > 1 ? <span {...count}> {words('heldCount', { n: thing.count })}</span> : null}
            </p>
            {thing.desc ? <p {...text}>{thing.desc}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * What you carry: the things you hold (`view.held`), each with its count and
 * a line about it. The inventory plugin's UI draws its own `InventoryCard` in
 * its place, with a button that uses each thing and, with `drop`, one that
 * drops it.
 */
export const Inventory = overridable('Inventory', InventoryImpl)
