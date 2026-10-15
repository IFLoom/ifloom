import type { Price, RenderedChoice } from '@ifloom/engine'
import { TriangleAlertIcon } from 'lucide-react'
import { Button } from '../components/ui/button.tsx'
import { cn } from '../lib/utils.ts'
import { useGame } from './context.tsx'

/** What a button costs, as the engine wrote it: stats, then plugins' notes ("until evening"). */
export function PriceTag({ price, className }: { price: Price; className?: string }) {
  const parts = [...(price.stats ?? []).map((stat) => stat.text), ...(price.notes ?? [])]
  if (!parts.length) return null
  return <span className={cn('text-xs font-normal text-price', className)}>{parts.join(' · ')}</span>
}

/**
 * A choice or an action as a button: its label, its price, and — when it is
 * greyed out — the reason, on the button itself so the player never has to
 * hover to learn why. A warning — pressable, but the game would refuse it, as
 * running past dawn — is marked and written under it.
 */
export function ChoiceButton({ choice, className }: { choice: RenderedChoice; className?: string }) {
  const { send } = useGame()
  return (
    <Button
      variant={choice.disabled ? 'outline' : 'secondary'}
      className={cn('h-auto w-full flex-col items-start gap-0.5 py-2 text-left whitespace-normal', className)}
      disabled={Boolean(choice.disabled)}
      onClick={() => send(choice.command)}
      data-choice={choice.id}
    >
      <span className="flex w-full items-center gap-2">
        <span className="flex-1">{choice.label}</span>
        {choice.warning ? <TriangleAlertIcon aria-label={choice.warning} /> : null}
      </span>
      {choice.price ? <PriceTag price={choice.price} /> : null}
      {choice.irreversible ? <span className="text-xs font-normal text-destructive">{choice.irreversible}</span> : null}
      {choice.disabled ? <span className="text-xs font-normal text-muted-foreground">{choice.disabled}</span> : null}
      {!choice.disabled && choice.warning ? <span className="text-xs font-normal text-muted-foreground">{choice.warning}</span> : null}
    </Button>
  )
}

/** A list of choices or actions, one per row. */
export function ChoiceList({ choices, className }: { choices: RenderedChoice[]; className?: string }) {
  if (!choices.length) return null
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {choices.map((choice) => (
        <ChoiceButton key={choice.id} choice={choice} />
      ))}
    </div>
  )
}
