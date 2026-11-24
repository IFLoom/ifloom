import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/utils.ts'

/** Returns the Tailwind classes for a badge's `variant`, shadcn/ui's badge variants. `default` if left out. */
export const badgeVariants = cva('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors', {
  variants: {
    /** The badge's look, `default`, `secondary`, `outline` or `destructive`. `default` if left out. */
    variant: {
      default: 'border-transparent bg-primary text-primary-foreground',
      secondary: 'border-transparent bg-secondary text-secondary-foreground',
      outline: 'text-foreground',
      destructive: 'border-transparent bg-destructive text-destructive-foreground',
    },
  },
  defaultVariants: { variant: 'default' },
})

/** The props of `Badge`, a `<span>`'s props and a `variant`. */
export type BadgeProps = ComponentProps<'span'> & VariantProps<typeof badgeVariants>

/** Renders shadcn/ui's badge, a small rounded label in a `<span>`. */
export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}
