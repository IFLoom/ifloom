import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/utils.ts'

/** Renders the provider that tooltips below it share, Radix's `Tooltip.Provider`, which sets their delay. */
export const TooltipProvider = TooltipPrimitive.Provider
/** Renders a tooltip's root, Radix's `Tooltip.Root`, which holds whether it's open. */
export const Tooltip = TooltipPrimitive.Root
/** Renders the element that opens its tooltip on hover or focus, Radix's `Tooltip.Trigger`. */
export const TooltipTrigger = TooltipPrimitive.Trigger

/** Renders a tooltip's box in a portal, 4 pixels from its trigger unless `sideOffset` says otherwise. */
export function TooltipContent({ className, sideOffset = 4, ...props }: ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn('z-50 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground shadow-md', className)}
        {...props}
      />
    </TooltipPrimitive.Portal>
  )
}
