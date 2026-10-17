import type { ReactNode } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/dialog.tsx'
import { Icon } from './icon.tsx'
import { usePart } from './overrides.tsx'
import { useWords } from './words.ts'

/**
 * A dialog drawn with the UI's `dialog` parts, as the menu's and the devices'
 * are: open while `open` is true, titled `title`, calling `onClose` when the
 * player closes it. Internal: the shop and the achievements use it.
 */
export function PartDialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const words = useWords()
  const dialog = usePart(
    'dialog',
    'fixed top-1/2 left-1/2 z-50 grid max-h-[90vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-lg border bg-background p-6 font-body shadow-lg',
  )
  const overlay = usePart('dialog-overlay', 'fixed inset-0 z-50 bg-black/50')
  const heading = usePart('dialog-title', 'font-heading text-lg font-semibold leading-none')
  const close = usePart('dialog-close', 'absolute top-4 right-4 rounded-sm opacity-70 hover:opacity-100')
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
