/**
 * The inventory plugin's React UI, for a game rendered with `@ifloom/react`.
 *
 * List `inventoryUi` in the game's `plugins` to render the things the player holds in the sidebar and the `inventory`
 * panel, each with a button that uses it. To render them yourself, read `useInventory`.
 */
import type { EntityRef, GameState, Result } from '@ifloom/engine'
import type { ComponentProps } from 'react'
import { ChoiceButton, Section, usePart } from '@ifloom/react'
import { buttonVariants, overridable, type Override, pluginKit, type PluginUi, useKitPart, usePlugin } from '@ifloom/react/kit'
import { inventory, type Holder, type InventoryView } from '../index.ts'

/** The inventory plugin's UI words, in English. A game rewords any of them with `ui.<key>` in its strings. */
export const INVENTORY_WORDS = {
  /** The heading over the things the player carries. */
  inventory: 'Carrying',
  /** The count beside a thing held more than once, with `{n}` for the number. */
  heldCount: '×{n}',
  /** The label of the button that drops one. */
  drop: 'Drop',
} as const

/** The props of `InventoryCard`. */
export type InventoryProps = {
  /** Classes added to the `inventory` part's own. */
  className?: string
  /** The heading, the `inventory` word if left out. `false` leaves it out, as under a section's title. */
  title?: string | false
  /** True to give each thing a button that drops one. */
  drop?: boolean
}

/** The inventory plugin's UI, declared once: its id and its words, for `usePlugin` and `inventoryUi`. */
const INVENTORY = pluginKit('inventory', INVENTORY_WORDS)

declare module '@ifloom/react' {
  interface OverridableComponents {
    InventoryCard: Override<ComponentProps<typeof InventoryCard>>
  }
  interface PartNames {
    inventory: true
    'inventory-title': true
    thing: true
    'thing-name': true
    'thing-count': true
    'thing-text': true
    'thing-drop': true
  }
}

/** The inventory plugin's view with functions that send its commands, as `useInventory` returns it. */
export type InventoryControls = InventoryView & {
  /** Sends `inventory/use` for one of a thing the player holds. A refusal carries the same reason the button shows. */
  use: (ref: EntityRef) => Result<GameState>
  /** Sends `inventory/drop` for one of a thing the player holds. */
  drop: (ref: EntityRef) => Result<GameState>
  /** Sends `inventory/give`, which gives one of a thing the player holds to someone. */
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

function InventoryCardImpl({ className, title: titleText, drop: showDrop = false }: InventoryProps) {
  const { words, send } = usePlugin(INVENTORY)
  const plugin = useInventory()
  const section = usePart('inventory', 'flex flex-col gap-2 text-sm', className)
  const title = useKitPart('heading', 'inventory-title')
  const row = useKitPart('item', 'thing', 'flex flex-col gap-1')
  const name = useKitPart('title', 'thing-name')
  const count = usePart('thing-count', 'text-muted-foreground')
  const text = useKitPart('note', 'thing-text')
  const dropButton = usePart('thing-drop', `${buttonVariants({ size: 'sm', variant: 'ghost' })} self-start`)
  const held = plugin?.things ?? []
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
            {showDrop ? (
              <button {...dropButton} disabled={Boolean(thing.drop.disabled)} title={thing.drop.disabled} onClick={() => send(thing.drop.command)}>
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
 * Renders the things the player holds from `view.plugins.inventory`, each usable one with a button. It renders nothing
 * while they hold nothing, or in a game without the plugin.
 *
 * A button that can't be used now is disabled with the engine's reason, and the `drop` prop adds a button that drops
 * one. A preset can style the parts `inventory`, `inventory-title`, `thing`, `thing-name`, `thing-count`, `thing-text`
 * and `thing-drop`.
 */
export const InventoryCard = overridable('InventoryCard', InventoryCardImpl)

/** Renders `InventoryCard` in a folding sidebar section titled with the `inventory` word. It hides itself while nothing is held. */
export function InventorySection() {
  const { words } = usePlugin(INVENTORY)
  return (
    <Section id="inventory" title={words('inventory')} collapsible>
      <InventoryCard title={false} />
    </Section>
  )
}

/**
 * The inventory plugin's React UI, for `plugins` on `mountGame` or `GameProvider`. It adds `InventorySection` to the
 * sidebar and an `inventory` panel, and the plugin's words.
 */
export const inventoryUi: PluginUi = {
  ...INVENTORY,
  layout: { sidebar: [() => <InventorySection />] },
  panels: { inventory: { component: () => <InventoryCard title={false} />, title: 'inventory' } },
}
