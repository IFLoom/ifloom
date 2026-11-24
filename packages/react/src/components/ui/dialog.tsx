import * as DialogPrimitive from '@radix-ui/react-dialog'
import { XIcon } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/utils.ts'

/** Renders a dialog's root, Radix's `Dialog.Root`, which holds whether the dialog is open. */
export const Dialog = DialogPrimitive.Root
/** Renders the control that opens its dialog, Radix's `Dialog.Trigger`. */
export const DialogTrigger = DialogPrimitive.Trigger
/** Renders a control that closes its dialog, Radix's `Dialog.Close`. */
export const DialogClose = DialogPrimitive.Close

/** The props of `DialogContent`, Radix's `Dialog.Content` props with the options below. */
export type DialogContentProps = ComponentProps<typeof DialogPrimitive.Content> & {
  /**
   * True to leave out the built-in classes on the content, the overlay and the close button, so the caller styles
   * them all. False if left out.
   */
  bare?: boolean
  /** The close button's text for screen readers. `'Close'` if left out. */
  closeLabel?: string
  /** The close button's icon. An X if left out. */
  closeIcon?: ReactNode
  /** The props of the overlay behind the dialog, such as a `className` or a `data-part`. */
  overlayProps?: ComponentProps<typeof DialogPrimitive.Overlay>
  /** The props of the close button. */
  closeProps?: ComponentProps<typeof DialogPrimitive.Close>
}

/** Renders a dialog's box in a portal, over an overlay, with a close button in its corner. */
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

/** Renders a dialog's header, a `<div>` that stacks its title and description. */
export function DialogHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="dialog-header" className={cn('flex flex-col gap-1.5', className)} {...props} />
}

/** Renders a dialog's title, which screen readers announce. `bare` leaves out its built-in classes. */
export function DialogTitle({ className, bare = false, ...props }: ComponentProps<typeof DialogPrimitive.Title> & { bare?: boolean }) {
  return <DialogPrimitive.Title data-slot="dialog-title" className={bare ? className : cn('text-lg font-semibold leading-none', className)} {...props} />
}

/** Renders a dialog's description in the muted colour, which screen readers read after the title. */
export function DialogDescription({ className, ...props }: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description data-slot="dialog-description" className={cn('text-sm text-muted-foreground', className)} {...props} />
}
