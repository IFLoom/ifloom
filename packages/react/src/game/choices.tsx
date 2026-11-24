import type { Price, RenderedChoice } from '@ifloom/engine'
import { buttonVariants } from '../components/ui/button.tsx'
import { useGame } from './context.tsx'
import { Icon } from './icon.tsx'
import { useChoiceKey } from './keys.tsx'
import { overridable, usePart } from './overrides.tsx'
import { cn, PROSE } from '../lib/utils.ts'

function PriceTagImpl({ price, className }: { price: Price; className?: string }) {
  const attrs = usePart('choice-price', 'text-xs font-normal text-price', className)
  if (!price.text) return null
  return <span {...attrs}>{price.text}</span>
}

/**
 * Renders a choice's or action's price as the `choice-price` part, from the price's `text`, which names its stats and
 * then plugins' notes such as "until evening".
 */
export const PriceTag = overridable('PriceTag', PriceTagImpl)

function ChoiceButtonImpl({ choice, className }: { choice: RenderedChoice; className?: string }) {
  const { send } = useGame()
  const button = usePart(
    'choice',
    `${buttonVariants({ variant: choice.disabled ? 'outline' : 'secondary' })} h-auto w-full flex-col items-start gap-0.5 py-2 text-left whitespace-normal`,
    className,
  )
  const label = usePart('choice-label', 'flex w-full items-center gap-2')
  const warning = usePart('choice-warning', 'text-xs font-normal text-muted-foreground')
  const irreversible = usePart('choice-irreversible', 'text-xs font-normal text-destructive')
  const reason = usePart('choice-reason', 'text-xs font-normal text-muted-foreground')
  const keyHint = usePart('choice-key', 'rounded border px-1.5 font-mono text-xs font-normal text-muted-foreground')
  const key = useChoiceKey(choice)
  return (
    <button
      {...button}
      disabled={Boolean(choice.disabled)}
      onClick={() => send(choice.command)}
      data-choice={choice.id}
      data-choice-key={key ?? undefined}
      aria-keyshortcuts={key ? String(key) : undefined}
    >
      <span {...label}>
        {key ? (
          <kbd {...keyHint} aria-hidden>
            {key}
          </kbd>
        ) : null}
        <span className="flex-1">{choice.label}</span>
        {choice.warning ? <Icon name="warning" label={choice.warning} /> : null}
      </span>
      {choice.price ? <PriceTag price={choice.price} /> : null}
      {choice.irreversible ? <span {...irreversible}>{choice.irreversible}</span> : null}
      {choice.disabled ? <span {...reason}>{choice.disabled}</span> : null}
      {!choice.disabled && choice.warning ? <span {...warning}>{choice.warning}</span> : null}
    </button>
  )
}

/**
 * Renders a choice or an action from its `RenderedChoice` as a `choice` button with its label and price. A disabled
 * button shows its reason on the button itself, not on hover.
 *
 * A warning, the reason a plugin's guard will refuse it softly such as running past dawn, is marked and written under
 * it, and so is an irreversible note. With `keys` on, a numbered choice shows its number key.
 */
export const ChoiceButton = overridable('ChoiceButton', ChoiceButtonImpl)

function ChoiceListImpl({ choices, className, part = 'choices' }: { choices: RenderedChoice[]; className?: string; part?: 'choices' | 'actions' }) {
  const attrs = usePart(part, cn(PROSE, 'flex flex-col gap-2'), className)
  if (!choices.length) return null
  return (
    <div {...attrs}>
      {choices.map((choice) => (
        <ChoiceButton key={choice.id} choice={choice} />
      ))}
    </div>
  )
}

/**
 * Renders a list of choices or actions as `ChoiceButton`s, one per row, and nothing for an empty list. `part` names it
 * `'choices'`, or `'actions'` for the room's actions.
 */
export const ChoiceList = overridable('ChoiceList', ChoiceListImpl)
