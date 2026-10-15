import { whyNot, type Runner } from '@ifloom/engine'
import { cn } from '../lib/utils.ts'
import { ChoiceButton } from './choices.tsx'
import { useGame } from './context.tsx'
import { useWords } from './words.ts'

/**
 * What the player carries (`view.pack`), with a button for each item that does
 * something — greyed out with the engine's reason when it can't be used now.
 */
export function Inventory({ className }: { className?: string }) {
  const { view, runner } = useGame()
  const words = useWords()
  if (!view.pack.length) return null
  return (
    <section className={cn('flex flex-col gap-2 text-sm', className)} data-inventory>
      <h3 className="font-semibold">{words('inventory')}</h3>
      <ul className="flex flex-col gap-2">
        {view.pack.map((item) => (
          <li key={item.id} className="flex flex-col gap-1" data-item={item.id}>
            <p>
              <span className="font-medium">{item.name}</span>
              {item.count > 1 ? <span className="text-muted-foreground"> ×{item.count}</span> : null}
            </p>
            {item.desc ? <p className="text-xs text-muted-foreground">{item.desc}</p> : null}
            {item.useLabel ? (
              <ChoiceButton
                choice={{
                  id: `use-${item.id}`,
                  label: item.useLabel,
                  command: { type: 'use', itemId: item.id },
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

function whyNotUse(runner: Runner, itemId: string): string | undefined {
  return whyNot(runner.state, runner.game, { type: 'use', itemId })
}
