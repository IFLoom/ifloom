/**
 * @ifloom/plugin-wardrobe/react: the wardrobe plugin's React UI, for a game drawn
 * with `@ifloom/react`. List `wardrobeUi` in the game's
 * `plugins` to have what the player wears as the `wardrobe` panel, or draw
 * it yourself from `useWardrobe`.
 */
import type { ComponentProps } from 'react'
import type { GameState, RenderedChoice, Result } from '@ifloom/engine'
import type { WardrobeView } from '../index.ts'
import { buttonVariants, overridable, type Override, type PluginUi, Section, useGame, useKitPart, usePart, useWords } from '@ifloom/react'

/** The wardrobe plugin's words, in English. A game rewords any with `ui.<key>` in its strings. */
export const WARDROBE_WORDS = {
  nothingOn: 'Nothing',
  wardrobe: 'Wearing',
} as const

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
  wear: (entity: string) => Result<GameState>
  /** Empty a slot by its id: sends `wardrobe/takeOff`. */
  takeOff: (slot: string) => Result<GameState>
}

/** The wardrobe plugin's view with its buttons and commands, or null in a game without the plugin. `WardrobeCard` is drawn from it. */
export function useWardrobe(): WardrobeControls | null {
  const { view, send } = useGame()
  const data = view.plugins.wardrobe as WardrobeView | undefined
  if (!data) return null
  return {
    ...data,
    slots: data.slots.map((slot) => ({
      ...slot,
      wear: data.spare.filter((entry) => entry.slot === slot.id).map((entry) => entry.wear),
    })),
    wear: (entity) => send({ type: 'custom', name: 'wardrobe/wear', with: { id: entity } }),
    takeOff: (slot) => send({ type: 'custom', name: 'wardrobe/takeOff', with: { id: slot } }),
  }
}

function WardrobeCardImpl({ className, title: titleText }: { className?: string; title?: string | false }) {
  const { send } = useGame()
  const words = useWords(WARDROBE_WORDS)
  const section = usePart('wardrobe', 'flex flex-col gap-2 text-sm', className)
  const title = usePart('wardrobe-title', 'font-heading font-semibold')
  const row = usePart('wardrobe-slot', 'flex flex-wrap items-center gap-2')
  const slotName = useKitPart('label', 'wardrobe-slot-name', 'min-w-8 text-muted-foreground')
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
  const words = useWords(WARDROBE_WORDS)
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
  id: 'wardrobe',
  words: WARDROBE_WORDS,
  panels: { wardrobe: { component: () => <WardrobeCard title={false} />, title: 'wardrobe' } },
}
