import type { ComponentProps } from 'react'
import { cn } from '../../lib/utils.ts'

/** Renders shadcn/ui's card, a bordered `<div>` on the card colour. */
export function Card({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="card" className={cn('rounded-xl border bg-card text-card-foreground shadow-sm', className)} {...props} />
}

/** Renders a card's header, a `<div>` that stacks its title and description. */
export function CardHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="card-header" className={cn('flex flex-col gap-1 p-4', className)} {...props} />
}

/** Renders a card's title as an `<h3>`. */
export function CardTitle({ className, ...props }: ComponentProps<'h3'>) {
  return <h3 data-slot="card-title" className={cn('font-semibold leading-none', className)} {...props} />
}

/** Renders a card's description as a `<p>` in the muted colour. */
export function CardDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p data-slot="card-description" className={cn('text-sm text-muted-foreground', className)} {...props} />
}

/** Renders a card's content, a padded `<div>`. */
export function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('p-4 pt-0', className)} {...props} />
}

/** Renders a card's footer, a padded `<div>` that lines its children up in a row. */
export function CardFooter({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="card-footer" className={cn('flex items-center p-4 pt-0', className)} {...props} />
}
