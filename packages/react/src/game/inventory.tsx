import { whyNot, type GameState, type HeldView, type Result, type Runner } from '@ifloom/engine'
import type { InventoryThing, InventoryView } from '@ifloom/plugin-inventory'
import { buttonVariants } from '../components/ui/button.tsx'
import { ChoiceButton } from './choices.tsx'
import { useGame } from './context.tsx'
import { overridable, usePart } from './overrides.tsx'
import { useWords } from './words.ts'

/** What `useInventory` returns: the inventory plugin's view, and its commands. */
export type InventoryControls = InventoryView & {
  /** Use one of a thing you hold: sends `inventory/use`, refused with its reason as the button says. */
  use: (ref: string) => Result<GameState>
  /** Drop one of a thing you hold: sends `inventory/drop`. */
  drop: (ref: string) => Result<GameState>
  /** Give one of a thing you hold to someone who can hold things: sends `inventory/give`. */
  give: (ref: string, to: string) => Result<GameState>
}

/** The inventory plugin's view with its commands, or null in a game without the plugin. `Inventory` is drawn from it when it's there. */
export function useInventory(): InventoryControls | null {
  const { view, send } = useGame()
  const data = view.plugins.inventory as InventoryView | undefined
  if (!data) return null
  return {
    ...data,
    use: (ref) => send({ type: 'custom', name: 'inventory/use', with: { id: ref } }),
    drop: (ref) => send({ type: 'custom', name: 'inventory/drop', with: { id: ref } }),
    give: (ref, to) => send({ type: 'custom', name: 'inventory/give', with: { id: ref, to } }),
  }
}

/** A thing you hold as the card draws it: the plugin's, with its buttons, or the engine's `view.held` without the plugin. */
type Shown = Pick<InventoryThing, 'ref' | 'name' | 'desc' | 'count' | 'at'> & Partial<Pick<InventoryThing, 'use' | 'drop'>>

function InventoryImpl({ className, title: titleText, drop: showDrop = false }: { className?: string; title?: string | false; drop?: boolean }) {
  const { view, runner, send } = useGame()
  const words = useWords()
  const plugin = useInventory()
  const section = usePart('inventory', 'flex flex-col gap-2 text-sm', className)
  const title = usePart('inventory-title', 'font-heading font-semibold')
  const row = usePart('item', 'flex flex-col gap-1')
  const name = usePart('item-name', 'font-medium')
  const count = usePart('item-count', 'text-muted-foreground')
  const text = usePart('item-text', 'text-xs text-muted-foreground')
  const dropButton = usePart('item-drop', `${buttonVariants({ size: 'sm', variant: 'ghost' })} self-start`)
  const held: Shown[] = plugin ? plugin.things : view.held.map((thing: HeldView) => ({ ...thing }))
  if (!view.pack.length && !held.length) return null
  return (
    <section {...section} data-inventory>
      {titleText === false ? null : <h3 {...title}>{titleText ?? words('inventory')}</h3>}
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
        {held.map((thing) => (
          <li key={`${thing.at}/${thing.ref}`} {...row} data-thing={thing.ref} data-at={thing.at}>
            <p>
              <span {...name}>{thing.name}</span>
              {thing.count > 1 ? <span {...count}> {words('itemCount', { n: thing.count })}</span> : null}
            </p>
            {thing.desc ? <p {...text}>{thing.desc}</p> : null}
            {thing.use ? <ChoiceButton choice={thing.use} /> : null}
            {showDrop && thing.drop ? (
              <button {...dropButton} disabled={Boolean(thing.drop.disabled)} title={thing.drop.disabled} onClick={() => send(thing.drop!.command)}>
                {words('drop')}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * What you carry: the things you hold (`view.held`), each with a button that
 * uses it when the inventory plugin gives it one, greyed out with the
 * engine's reason when it can't be used now. With `drop`, a button that drops
 * one too. Items from the older item list (`view.pack`) come first, with
 * their own use buttons.
 */
export const Inventory = overridable('Inventory', InventoryImpl)

function whyNotUse(runner: Runner, itemId: string): string | undefined {
  return whyNot(runner.state, runner.game, { type: 'use', id: itemId })
}
