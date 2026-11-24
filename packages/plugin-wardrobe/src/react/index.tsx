/**
 * The wardrobe plugin's React UI, for a game rendered with `@ifloom/react`.
 *
 * List `wardrobeUi` in the game's `plugins` to render what the player wears as the `wardrobe` panel. To render it
 * yourself, read `useWardrobe`.
 */
import type { ComponentProps } from 'react'
import type { EntityRef, GameState, RenderedChoice, Result } from '@ifloom/engine'
import { wardrobe, type WardrobeView } from '../index.ts'
import { Section, usePart } from '@ifloom/react'
import { buttonVariants, overridable, type Override, pluginKit, type PluginUi, useKitPart, usePlugin } from '@ifloom/react/kit'

/** The wardrobe plugin's UI words, in English. A game rewords any of them with `ui.<key>` in its strings. */
export const WARDROBE_WORDS = {
  nothingOn: 'Nothing',
  wardrobe: 'Wearing',
} as const

/** The wardrobe plugin's UI, declared once: its id and its words, for `usePlugin` and `wardrobeUi`. */
const WARDROBE = pluginKit('wardrobe', WARDROBE_WORDS)

declare module '@ifloom/react' {
  interface OverridableComponents {
    WardrobeCard: Override<ComponentProps<typeof WardrobeCard>>
  }
  interface PartNames {
    'wardrobe': true
    'wardrobe-slot': true
    'wardrobe-slot-name': true
    'wardrobe-title': true
    'wardrobe-worn': true
  }
}

/** A slot as `useWardrobe` returns it, with the thing in it and the buttons that take it off or put another thing on. */
export type WardrobeSlotControls = WardrobeView['slots'][number] & {
  /** The `wear` buttons of the spare things for this slot, from the view's `spare`. */
  wear: RenderedChoice[]
}

/** The wardrobe plugin's view, slot by slot with its buttons, and functions that send its commands, as `useWardrobe` returns it. */
export type WardrobeControls = Omit<WardrobeView, 'slots'> & {
  /** The game's slots in order, each with the thing in it and its buttons. */
  slots: WardrobeSlotControls[]
  /** Sends `wardrobe/wear` for a thing the player holds, by its reference, such as `'clothing:scarf'`. */
  wear: (entity: EntityRef) => Result<GameState>
  /** Sends `wardrobe/takeOff`, which empties the slot with this id. */
  takeOff: (slot: string) => Result<GameState>
}

/** Returns the wardrobe plugin's view and commands from the running game, or null in a game without the plugin. It re-renders when the view changes. */
export function useWardrobe(): WardrobeControls | null {
  const { view, send } = usePlugin(WARDROBE)
  if (!view) return null
  return {
    ...view,
    slots: view.slots.map((slot) => ({
      ...slot,
      wear: view.spare.filter((entry) => entry.slot === slot.id).map((entry) => entry.wear),
    })),
    wear: (entity) => send(wardrobe.wear(entity)),
    takeOff: (slot) => send(wardrobe.takeOff(slot)),
  }
}

function WardrobeCardImpl({ className, title: titleText }: { className?: string; title?: string | false }) {
  const { words, send } = usePlugin(WARDROBE)
  const section = usePart('wardrobe', 'flex flex-col gap-2 text-sm', className)
  const title = useKitPart('heading', 'wardrobe-title')
  const row = usePart('wardrobe-slot', 'flex flex-wrap items-center gap-2')
  const slotName = useKitPart('label', 'wardrobe-slot-name')
  const worn = usePart('wardrobe-worn', 'flex-1')
  const buttonAttrs = usePart('button', buttonVariants({ size: 'sm', variant: 'outline' }))
  const data = useWardrobe()
  if (!data) return null
  const button = (label: string, choice: RenderedChoice) => (
    <button key={choice.id} {...buttonAttrs} disabled={Boolean(choice.disabled)} title={choice.disabled} onClick={() => send(choice.command)}>
      {label}
    </button>
  )
  return (
    <section {...section} data-wardrobe>
      {titleText === false ? null : <h3 {...title}>{titleText ?? words('wardrobe')}</h3>}
      {data.slots.map((slot) => (
        <div key={slot.id} {...row} data-slot-id={slot.id} data-worn={slot.entity ?? undefined}>
          <span {...slotName}>{slot.label}</span>
          <span {...worn}>{slot.name ?? words('nothingOn')}</span>
          {slot.takeOff ? button(slot.takeOff.label, slot.takeOff) : null}
          {slot.wear.map((choice) => button(choice.label, choice))}
        </div>
      ))}
    </section>
  )
}

/**
 * Renders what the player has on from `view.plugins.wardrobe`, slot by slot, with the other things they could wear.
 * It renders nothing without the plugin.
 *
 * A button that can't be used now is disabled with the engine's reason.
 *
 * A preset can style the parts `wardrobe`, `wardrobe-title`, `wardrobe-slot`, `wardrobe-slot-name` and `wardrobe-worn`.
 */
export const WardrobeCard = overridable('WardrobeCard', WardrobeCardImpl)

/**
 * Renders a Wearing section that folds, holding the `WardrobeCard`. `wardrobeUi` doesn't place it, so put it in your
 * layout's `<Sidebar>` to keep what the player wears on screen.
 */
export function WardrobeSection() {
  const { words } = usePlugin(WARDROBE)
  return (
    <Section id="wardrobe" title={words('wardrobe')} collapsible>
      <WardrobeCard title={false} />
    </Section>
  )
}

/**
 * The wardrobe plugin's React UI, for `plugins` on `mountGame` or `GameProvider`. It renders the `wardrobe` panel,
 * which a closet's button or any `{ panel: 'wardrobe' }` opens, as a `WardrobeCard`, and adds the plugin's words.
 *
 * It adds nothing to the sidebar, where a layout can place `WardrobeSection`.
 */
export const wardrobeUi: PluginUi = {
  ...WARDROBE,
  panels: { wardrobe: { component: () => <WardrobeCard title={false} />, title: 'wardrobe' } },
}
