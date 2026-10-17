import { whyNot, type Command } from '@ifloom/engine'
import type { WardrobeView } from '@ifloom/plugin-wardrobe'
import { buttonVariants } from '../components/ui/button.tsx'
import { useGame } from './context.tsx'
import { overridable, usePart } from './overrides.tsx'
import { useWords } from './words.ts'


function WardrobeCardImpl({ className }: { className?: string }) {
  const { view, runner, send } = useGame()
  const words = useWords()
  const section = usePart('wardrobe', 'flex flex-col gap-2 text-sm', className)
  const title = usePart('wardrobe-title', 'font-heading font-semibold')
  const row = usePart('wardrobe-slot', 'flex flex-wrap items-center gap-2')
  const slotName = usePart('wardrobe-slot-name', 'w-16 text-muted-foreground')
  const worn = usePart('wardrobe-worn', 'flex-1')
  const buttonAttrs = usePart('button', buttonVariants({ size: 'sm', variant: 'outline' }))
  const data = view.plugins.wardrobe as WardrobeView | undefined
  if (!data) return null
  const button = (label: string, command: Command, key: string) => {
    const reason = whyNot(runner.state, runner.game, command)
    return (
      <button key={key} {...buttonAttrs} disabled={Boolean(reason)} title={reason} onClick={() => send(command)}>
        {label}
      </button>
    )
  }
  return (
    <section {...section} data-wardrobe>
      <h3 {...title}>{words('wardrobe')}</h3>
      {data.slots.map((slot) => (
        <div key={slot.id} {...row} data-slot-id={slot.id}>
          <span {...slotName}>{slot.label}</span>
          <span {...worn}>{slot.name ?? words('nothingOn')}</span>
          {slot.item ? button(words('takeOff'), { type: 'custom', name: 'wardrobe/takeOff', with: { id: slot.id } }, 'off') : null}
          {data.spare
            .filter((entry) => entry.slot === slot.id)
            .map((entry) => button(words('wearItem', { item: entry.name }), { type: 'custom', name: 'wardrobe/wear', with: { id: entry.id } }, entry.id))}
        </div>
      ))}
    </section>
  )
}

/**
 * What the player has on, slot by slot, with what else they could wear. Each
 * button is greyed out with the engine's own reason when it can't be done.
 * Draws nothing in a game without the wardrobe plugin.
 */
export const WardrobeCard = overridable('WardrobeCard', WardrobeCardImpl)
