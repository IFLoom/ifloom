import type { ReactNode } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/dialog.tsx'
import { Icon } from './icon.tsx'
import { usePart } from './overrides.tsx'
import { useWords } from './words.ts'

/**
 * The classes every dialog of the UI starts from, so they all look alike: the
 * preset's body font and colours (a dialog is drawn in <body>, outside the
 * page), a gap at the sides on a phone, and no taller than the window, with
 * its own scroll.
 */
export const DIALOG_CLASSES = {
  dialog:
    'fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-lg border bg-background p-6 font-body text-foreground shadow-lg',
  overlay: 'fixed inset-0 z-50 bg-black/50',
  title: 'font-heading text-lg font-semibold leading-none',
  close: 'absolute top-4 right-4 rounded-sm opacity-70 hover:opacity-100',
} as const

/**
 * Returns the attributes for a dialog's `dialog`, `dialog-overlay`, `dialog-title` and `dialog-close` parts, with
 * `extra` classes on the dialog. Every dialog of the UI uses them, so they all look alike.
 */
export function useDialogParts(extra?: string) {
  return {
    dialog: usePart('dialog', DIALOG_CLASSES.dialog, extra),
    overlay: usePart('dialog-overlay', DIALOG_CLASSES.overlay),
    title: usePart('dialog-title', DIALOG_CLASSES.title),
    close: usePart('dialog-close', DIALOG_CLASSES.close),
  }
}

/**
 * Renders a dialog with the UI's `dialog` parts, open while `open` is true and titled `title`. It calls `onClose` when
 * the player closes it.
 *
 * The menu, `PanelHost` and the plugins' UIs use it, and a layout of your own can too.
 */
export function PartDialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const words = useWords()
  const { dialog, overlay, title: heading, close } = useDialogParts()
  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      {open ? (
        <DialogContent
          bare
          {...dialog}
          overlayProps={overlay}
          closeProps={close}
          closeIcon={<Icon name="close" />}
          closeLabel={words('close')}
          // Focus the dialog itself, not its first button, so Enter on opening buys nothing.
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            ;(event.currentTarget as HTMLElement | null)?.focus()
          }}
        >
          <DialogTitle bare {...heading}>
            {title}
          </DialogTitle>
          <DialogDescription className="sr-only">{title}</DialogDescription>
          {children}
        </DialogContent>
      ) : null}
    </Dialog>
  )
}
