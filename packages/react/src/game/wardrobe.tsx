import { renderAction, type GameState, type RenderedChoice, type Result } from '@ifloom/engine'
import type { WardrobeView } from '@ifloom/plugin-wardrobe'
import { buttonVariants } from '../components/ui/button.tsx'
import { useGame } from './context.tsx'
import { overridable, usePart } from './overrides.tsx'
import { useWords } from './words.ts'

/** A wardrobe slot as `useWardrobe` gives it: what's in it, and buttons to take it off or put something else on. */
export type WardrobeSlotControls = WardrobeView['slots'][number] & {
  /** Takes off what's in the slot, or null when it's empty. Greyed out with the engine's reason when it can't be done now. */
  takeOff: RenderedChoice | null
  /** One button for each spare piece of clothing for this slot, labelled with its name. */
  wear: RenderedChoice[]
}

/** What `useWardrobe` returns: the wardrobe plugin's view, slot by slot with its buttons, and its commands. */
export type WardrobeControls = Omit<WardrobeView, 'slots'> & {
  /** Every slot, in order, with what is in it and its buttons. */
  slots: WardrobeSlotControls[]
  /** Put on a piece of clothing by its item id: sends `wardrobe/wear`. */
  wear: (id: string) => Result<GameState>
  /** Empty a slot by its id: sends `wardrobe/takeOff`. */
  takeOff: (slot: string) => Result<GameState>
}

/** The wardrobe plugin's view with its buttons and commands, or null in a game without the plugin. `WardrobeCard` is drawn from it. */
export function useWardrobe(): WardrobeControls | null {
  const { view, runner, send } = useGame()
  const data = view.plugins.wardrobe as WardrobeView | undefined
  if (!data) return null
  const button = (id: string, label: string, name: string, with_: Record<string, string>) =>
    renderAction(runner.state, runner.game, { id, label, command: { type: 'custom', name, with: with_ } })
  return {
    ...data,
    slots: data.slots.map((slot) => ({
      ...slot,
      takeOff: slot.item ? button(`takeOff.${slot.id}`, slot.name ?? slot.item, 'wardrobe/takeOff', { id: slot.id }) : null,
      wear: data.spare.filter((entry) => entry.slot === slot.id).map((entry) => button(`wear.${entry.id}`, entry.name, 'wardrobe/wear', { id: entry.id })),
    })),
    wear: (id) => send({ type: 'custom', name: 'wardrobe/wear', with: { id } }),
    takeOff: (slot) => send({ type: 'custom', name: 'wardrobe/takeOff', with: { id: slot } }),
  }
}

function WardrobeCardImpl({ className }: { className?: string }) {
  const { send } = useGame()
  const words = useWords()
  const section = usePart('wardrobe', 'flex flex-col gap-2 text-sm', className)
  const title = usePart('wardrobe-title', 'font-heading font-semibold')
  const row = usePart('wardrobe-slot', 'flex flex-wrap items-center gap-2')
  const slotName = usePart('wardrobe-slot-name', 'w-16 text-muted-foreground')
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
      <h3 {...title}>{words('wardrobe')}</h3>
      {data.slots.map((slot) => (
        <div key={slot.id} {...row} data-slot-id={slot.id}>
          <span {...slotName}>{slot.label}</span>
          <span {...worn}>{slot.name ?? words('nothingOn')}</span>
          {slot.takeOff ? button(words('takeOff'), slot.takeOff) : null}
          {slot.wear.map((choice) => button(words('wearItem', { item: choice.label }), choice))}
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
