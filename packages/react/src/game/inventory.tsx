import { whyNot, type Runner } from '@ifloom/engine'
import { ChoiceButton } from './choices.tsx'
import { useGame } from './context.tsx'
import { overridable, usePart } from './overrides.tsx'
import { useWords } from './words.ts'

function InventoryImpl({ className }: { className?: string }) {
  const { view, runner } = useGame()
  const words = useWords()
  const section = usePart('inventory', 'flex flex-col gap-2 text-sm', className)
  const title = usePart('inventory-title', 'font-heading font-semibold')
  const row = usePart('item', 'flex flex-col gap-1')
  const name = usePart('item-name', 'font-medium')
  const count = usePart('item-count', 'text-muted-foreground')
  const text = usePart('item-text', 'text-xs text-muted-foreground')
  if (!view.pack.length) return null
  return (
    <section {...section} data-inventory>
      <h3 {...title}>{words('inventory')}</h3>
      <ul className="flex flex-col gap-2">
        {view.pack.map((item) => (
          <li key={item.id} {...row} data-item={item.id}>
            <p>
              <span {...name}>{item.name}</span>
              {item.count > 1 ? <span {...count}> {words('itemCount', { n: item.count })}</span> : null}
            </p>
            {item.desc ? <p {...text}>{item.desc}</p> : null}
            {item.useLabel ? (
              <ChoiceButton
                choice={{
                  id: `use-${item.id}`,
                  label: item.useLabel,
                  command: { type: 'use', id: item.id },
                  disabled: whyNotUse(runner, item.id),
                }}
              />
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * What the player carries (`view.pack`), with a button for each item that does
 * something — greyed out with the engine's reason when it can't be used now.
 */
export const Inventory = overridable('Inventory', InventoryImpl)

function whyNotUse(runner: Runner, itemId: string): string | undefined {
  return whyNot(runner.state, runner.game, { type: 'use', id: itemId })
}
