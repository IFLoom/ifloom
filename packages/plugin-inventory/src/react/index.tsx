/**
 * @ifloom/plugin-inventory/react: the inventory plugin's React UI, for a game
 * drawn with `@ifloom/react`. List `inventoryUi` in the game's `plugins` to
 * have what the player carries drawn with a button that uses each thing, or
 * draw it yourself from `useInventory`.
 */
import type { EntityRef, GameState, Holder, Result } from '@ifloom/engine'
import type { ComponentProps } from 'react'
import {
  buttonVariants,
  ChoiceButton,
  type InventoryProps,
  overridable,
  type Override,
  pluginKit,
  type PluginUi,
  useGame,
  usePart,
  usePlugin,
} from '@ifloom/react'
import { inventory, type InventoryThing, type InventoryView } from '../index.ts'

/** The inventory plugin's words, in English. A game rewords any with `ui.<key>` in its strings. */
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

/** What `useInventory` returns: the inventory plugin's view, and its commands. */
export type InventoryControls = InventoryView & {
  /** Use one of a thing you hold: sends `inventory/use`, refused with its reason as the button says. */
  use: (ref: EntityRef) => Result<GameState>
  /** Drop one of a thing you hold: sends `inventory/drop`. */
  drop: (ref: EntityRef) => Result<GameState>
  /** Give one of a thing you hold to someone who can hold things: sends `inventory/give`. */
  give: (ref: EntityRef, to: Holder) => Result<GameState>
}

/** The inventory plugin's view with its commands, or null in a game without the plugin. `InventoryCard` is drawn from it. */
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
 * What you carry, with the inventory plugin's buttons: the things you hold,
 * each with a button that uses it when it's usable, greyed out with the
 * engine's reason when it can't be used now, and with `drop` a button that
 * drops one. It takes the same props as the core `Inventory`, and the
 * inventory UI draws it in that one's place. A thin default on `useInventory`.
 */
export const InventoryCard = overridable('InventoryCard', InventoryCardImpl)

/**
 * The inventory plugin's React UI, for `plugins` on `mountGame` or
 * `GameProvider`: `InventoryCard` drawn wherever the core `Inventory` is,
 * in the side column and the `inventory` panel, and the inventory's words.
 */
export const inventoryUi: PluginUi = {
  ...INVENTORY,
  components: { Inventory: ({ Default: _default, ...props }) => <InventoryCard {...props} /> },
}
