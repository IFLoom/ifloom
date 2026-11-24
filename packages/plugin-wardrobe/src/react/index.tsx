/**
 * @ifloom/plugin-wardrobe/react: the wardrobe plugin's React UI, for a game drawn
 * with `@ifloom/react`. List `wardrobeUi` in the game's
 * `plugins` to have what the player wears as the `wardrobe` panel, or draw
 * it yourself from `useWardrobe`.
 */
import type { ComponentProps } from 'react'
import type { EntityRef, GameState, RenderedChoice, Result } from '@ifloom/engine'
import { wardrobe, type WardrobeView } from '../index.ts'
import { buttonVariants, overridable, type Override, pluginKit, type PluginUi, Section, useKitPart, usePart, usePlugin } from '@ifloom/react'

/** The wardrobe plugin's words, in English. A game rewords any with `ui.<key>` in its strings. */
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

/** A wardrobe slot as `useWardrobe` gives it: what's in it, and the view's buttons to take it off or put something else on. */
export type WardrobeSlotControls = WardrobeView['slots'][number] & {
  /** The `wear` button of each spare thing for this slot, from the view's `spare`. */
  wear: RenderedChoice[]
}

/** What `useWardrobe` returns: the wardrobe plugin's view, slot by slot with its buttons, and its commands. */
export type WardrobeControls = Omit<WardrobeView, 'slots'> & {
  /** Every slot, in order, with what is in it and its buttons. */
  slots: WardrobeSlotControls[]
  /** Put on a thing you hold, by its reference (`'clothing:scarf'`): sends `wardrobe/wear`. */
  wear: (entity: EntityRef) => Result<GameState>
  /** Empty a slot by its id: sends `wardrobe/takeOff`. */
  takeOff: (slot: string) => Result<GameState>
}

/** The wardrobe plugin's view with its buttons and commands, or null in a game without the plugin. `WardrobeCard` is drawn from it. */
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
 * What the player has on, slot by slot, with what else they could wear. Each
 * button is greyed out with the engine's own reason when it can't be done.
 * Draws nothing in a game without the wardrobe plugin. A thin default on
 * `useWardrobe`.
 */
export const WardrobeCard = overridable('WardrobeCard', WardrobeCardImpl)

/**
 * A Wearing section for the side column: the `WardrobeCard`, folding in
 * place. `wardrobeUi` doesn't put it anywhere; place it in your layout's
 * `<Sidebar>` to keep what the player wears in view.
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
 * The wardrobe plugin's React UI, for `plugins` on `mountGame` or
 * `GameProvider`: the `wardrobe` panel with the `WardrobeCard`, opened by a
 * closet place's button or any `{ panel: 'wardrobe' }`, and the wardrobe's
 * words. It adds nothing to the side column; a layout can place
 * `WardrobeSection` there.
 */
export const wardrobeUi: PluginUi = {
  ...WARDROBE,
  panels: { wardrobe: { component: () => <WardrobeCard title={false} />, title: 'wardrobe' } },
}
