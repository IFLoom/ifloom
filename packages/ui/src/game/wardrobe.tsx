import { whyNot, type Command } from '@ifloom/engine'
import { Button } from '../components/ui/button.tsx'
import { cn } from '../lib/utils.ts'
import { useGame } from './context.tsx'
import { useWords } from './words.ts'

/** The wardrobe plugin's view, as the UI reads it. */
type WardrobeData = {
  slots: { id: string; label: string; item: string | null; name: string | null }[]
  spare: { id: string; name: string; slot: string }[]
}

/**
 * What the player has on, slot by slot, with what else they could wear. Each
 * button is greyed out with the engine's own reason when it can't be done.
 * Draws nothing in a game without the wardrobe plugin.
 */
export function WardrobePanel({ className }: { className?: string }) {
  const { view, runner, send } = useGame()
  const words = useWords()
  const data = view.plugins.wardrobe as WardrobeData | undefined
  if (!data) return null
  const button = (label: string, command: Command, key: string) => {
    const reason = whyNot(runner.state, runner.game, command)
    return (
      <Button key={key} size="sm" variant="outline" disabled={Boolean(reason)} title={reason} onClick={() => send(command)}>
        {label}
      </Button>
    )
  }
  return (
    <section className={cn('flex flex-col gap-2 text-sm', className)} data-wardrobe>
      <h3 className="font-semibold">{words('wardrobe')}</h3>
      {data.slots.map((slot) => (
        <div key={slot.id} className="flex flex-wrap items-center gap-2" data-slot-id={slot.id}>
          <span className="w-16 text-muted-foreground">{slot.label}</span>
          <span className="flex-1">{slot.name ?? words('nothingOn')}</span>
          {slot.item ? button(words('takeOff'), { type: 'custom', name: 'wardrobe/takeOff', with: { slot: slot.id } }, 'off') : null}
          {data.spare
            .filter((entry) => entry.slot === slot.id)
            .map((entry) => button(`${words('wear')} ${entry.name}`, { type: 'custom', name: 'wardrobe/wear', with: { item: entry.id } }, entry.id))}
        </div>
      ))}
    </section>
  )
}
