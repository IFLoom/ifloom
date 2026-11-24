import * as TabsPrimitive from '@radix-ui/react-tabs'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/utils.ts'

/** Renders a set of tabs, Radix's `Tabs.Root`, which holds the open tab's value. */
export const Tabs = TabsPrimitive.Root

/** Renders the row of tab triggers. */
export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn('inline-flex h-9 items-center rounded-lg bg-muted p-1 text-muted-foreground', className)}
      {...props}
    />
  )
}

/** Renders one tab's trigger, which opens the `TabsContent` with the same `value`. */
export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow',
        className,
      )}
      {...props}
    />
  )
}

/** Renders one tab's content, shown while its trigger is open. */
export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn('mt-2 outline-none', className)} {...props} />
}
