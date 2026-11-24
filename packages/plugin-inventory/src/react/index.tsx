/**
 * The inventory plugin's React UI, for a game rendered with `@ifloom/react`.
 *
 * List `inventoryUi` in the game's `plugins` to render the things the player holds, each with a button that uses it.
 * To render them yourself, read `useInventory`.
 */
import type { EntityRef, GameState, Holder, Result } from '@ifloom/engine'
import type { ComponentProps } from 'react'
import { ChoiceButton, type InventoryProps, useGame, usePart } from '@ifloom/react'
import { buttonVariants, overridable, type Override, pluginKit, type PluginUi, usePlugin } from '@ifloom/react/kit'
import { inventory, type InventoryThing, type InventoryView } from '../index.ts'

/** The inventory plugin's UI words, in English. A game rewords any of them with `ui.<key>` in its strings. */
export const INVENTORY_WORDS = {
  drop: 'Drop',
} as const

/** The inventory plugin's UI, declared once: its id and its words, for `usePlugin` and `inventoryUi`. */
const INVENTORY = pluginKit('inventory', INVENTORY_WORDS)

declare module '@ifloom/react' {
  interface OverridableComponents {
    InventoryCard: Override<ComponentProps<typeof InventoryCard>>
  }
  interface PartNames {
    'thing-drop': true
  }
}

/** The inventory plugin's view with functions that send its commands, as `useInventory` returns it. */
export type InventoryControls = InventoryView & {
  /** Sends `inventory/use` for one of a thing the player holds. A refusal carries the same reason the button shows. */
  use: (ref: EntityRef) => Result<GameState>
  /** Sends `inventory/drop` for one of a thing the player holds. */
  drop: (ref: EntityRef) => Result<GameState>
  /** Sends `inventory/give`, which gives one of a thing the player holds to another holder. */
  give: (ref: EntityRef, to: Holder) => Result<GameState>
}

/** Returns the inventory plugin's view and commands from the running game, or null in a game without the plugin. It re-renders when the view changes. */
export function useInventory(): InventoryControls | null {
  const { view, send } = usePlugin(INVENTORY)
  if (!view) return null
  return {
    ...view,
    use: (ref) => send(inventory.use(ref)),
    drop: (ref) => send(inventory.drop(ref)),
    give: (ref, to) => send(inventory.give(ref, to)),
  }
}

/** A thing you hold as the card draws it: the plugin's, with its buttons. */
type Shown = Pick<InventoryThing, 'ref' | 'name' | 'description' | 'count' | 'at'> & Partial<Pick<InventoryThing, 'use' | 'drop'>>

function InventoryCardImpl({ className, title: titleText, drop: showDrop = false }: InventoryProps) {
  const { view } = useGame()
  const { words, send } = usePlugin(INVENTORY)
  const plugin = useInventory()
  const section = usePart('inventory', 'flex flex-col gap-2 text-sm', className)
  const title = usePart('inventory-title', 'font-heading font-semibold')
  const row = usePart('thing', 'flex flex-col gap-1')
  const name = usePart('thing-name', 'font-medium')
  const count = usePart('thing-count', 'text-muted-foreground')
  const text = usePart('thing-text', 'text-xs text-muted-foreground')
  const dropButton = usePart('thing-drop', `${buttonVariants({ size: 'sm', variant: 'ghost' })} self-start`)
  const held: Shown[] = plugin ? plugin.things : view.held.map((thing) => ({ ...thing }))
  if (!held.length) return null
  return (
    <section {...section} data-inventory>
      {titleText === false ? null : <h3 {...title}>{titleText ?? words('inventory')}</h3>}
      <ul className="flex flex-col gap-2">
        {held.map((thing) => (
          <li key={`${thing.at}/${thing.ref}`} {...row} data-thing={thing.ref} data-at={thing.at}>
            <p>
              <span {...name}>{thing.name}</span>
              {thing.count > 1 ? <span {...count}> {words('heldCount', { n: thing.count })}</span> : null}
            </p>
            {thing.description ? <p {...text}>{thing.description}</p> : null}
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
 * Renders the things the player holds from `view.plugins.inventory`, each usable one with a button. It replaces the
 * core `Inventory`, and falls back to `view.held` without the plugin.
 *
 * It takes the core `Inventory`'s props.
 *
 * A button that can't be used now is disabled with the engine's reason, and the `drop` prop adds a button that drops
 * one. A preset can style the parts `inventory`, `inventory-title`, `thing`, `thing-name`, `thing-count`, `thing-text`
 * and `thing-drop`.
 */
export const InventoryCard = overridable('InventoryCard', InventoryCardImpl)

/**
 * The inventory plugin's React UI, for `plugins` on `mountGame` or `GameProvider`. It renders `InventoryCard` wherever
 * the core `Inventory` goes, in the sidebar and the `inventory` panel, and adds the plugin's words.
 */
export const inventoryUi: PluginUi = {
  ...INVENTORY,
  components: { Inventory: ({ Default: _default, ...props }) => <InventoryCard {...props} /> },
}
