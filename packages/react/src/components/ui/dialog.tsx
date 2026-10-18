import * as DialogPrimitive from '@radix-ui/react-dialog'
import { XIcon } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/utils.ts'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export type DialogContentProps = ComponentProps<typeof DialogPrimitive.Content> & {
  /** Skip the built-in classes on the content, the overlay and the close button, so the caller styles them all. */
  bare?: boolean
  /** The screen-reader text on the close button. */
  closeLabel?: string
  /** The close button's icon. */
  closeIcon?: ReactNode
  /** Attributes for the overlay behind the dialog (a `className`, a `data-part`). */
  overlayProps?: ComponentProps<typeof DialogPrimitive.Overlay>
  /** Attributes for the close button. */
  closeProps?: ComponentProps<typeof DialogPrimitive.Close>
}

export function DialogContent({ className, children, bare = false, closeLabel = 'Close', closeIcon, overlayProps, closeProps, ...props }: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        data-slot="dialog-overlay"
        {...overlayProps}
        className={bare ? overlayProps?.className : cn('fixed inset-0 z-50 bg-black/50', overlayProps?.className)}
      />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={
          bare
            ? className
            : cn(
                'fixed top-1/2 left-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border bg-background p-6 shadow-lg',
                className,
              )
        }
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          {...closeProps}
          className={bare ? closeProps?.className : cn('absolute top-4 right-4 rounded-sm opacity-70 hover:opacity-100', closeProps?.className)}
        >
          {closeIcon ?? <XIcon />}
          <span className="sr-only">{closeLabel}</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function DialogHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="dialog-header" className={cn('flex flex-col gap-1.5', className)} {...props} />
}

export function DialogTitle({ className, bare = false, ...props }: ComponentProps<typeof DialogPrimitive.Title> & { bare?: boolean }) {
  return <DialogPrimitive.Title data-slot="dialog-title" className={bare ? className : cn('text-lg font-semibold leading-none', className)} {...props} />
}

export function DialogDescription({ className, ...props }: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description data-slot="dialog-description" className={cn('text-sm text-muted-foreground', className)} {...props} />
}
