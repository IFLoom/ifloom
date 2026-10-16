import { useState } from 'react'
import { buttonVariants } from '../components/ui/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/dialog.tsx'
import { Backlog } from './backlog.tsx'
import { useGame } from './context.tsx'
import { Icon } from './icon.tsx'
import { ModManager } from './mods.tsx'
import { overridable, usePart } from './overrides.tsx'
import { SavesMenu } from './saves.tsx'
import { usePage } from './pages.tsx'
import { useWords } from './words.ts'

function GameMenuImpl({ className }: { className?: string }) {
  const { runner, mods, view } = useGame()
  const words = useWords()
  const pages = usePage()
  const [open, setOpen] = useState<'saves' | 'backlog' | 'mods' | null>(null)
  const menu = usePart('menu', 'flex flex-wrap gap-2', className)
  const opener = usePart('menu-button', buttonVariants({ size: 'sm', variant: 'outline' }))
  const step = usePart('menu-button', buttonVariants({ size: 'sm', variant: 'ghost' }))
  const dialog = usePart(
    'dialog',
    'fixed top-1/2 left-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border bg-background p-6 shadow-lg',
  )
  const overlay = usePart('dialog-overlay', 'fixed inset-0 z-50 bg-black/50')
  const title = usePart('dialog-title', 'font-heading text-lg font-semibold leading-none')
  const close = usePart('dialog-close', 'absolute top-4 right-4 rounded-sm opacity-70 hover:opacity-100')
  const { undo, backlog } = runner.offers
  if (!runner.saves && !undo && !backlog && !mods && !pages.enabled) return null
  const heading = open === 'saves' ? words('saves') : open === 'mods' ? words('mods') : words('backlog')
  return (
    <div {...menu} data-menu>
      {runner.saves ? (
        <button {...opener} onClick={() => setOpen('saves')}>
          {words('saves')}
        </button>
      ) : null}
      {backlog ? (
        <button {...opener} onClick={() => setOpen('backlog')}>
          {words('backlog')}
        </button>
      ) : null}
      {mods ? (
        <button {...opener} onClick={() => setOpen('mods')}>
          {words('mods')}
        </button>
      ) : null}
      {pages.enabled && view.settings.length ? (
        <button {...opener} onClick={() => pages.go('settings')}>
          {words('settings')}
        </button>
      ) : null}
      {pages.enabled ? (
        <button {...opener} onClick={() => pages.go('title')}>
          {words('titlePage')}
        </button>
      ) : null}
      {undo ? (
        <>
          <button {...step} disabled={!runner.canUndo} onClick={() => runner.undo()}>
            {words('undo')}
          </button>
          <button {...step} disabled={!runner.canRedo} onClick={() => runner.redo()}>
            {words('redo')}
          </button>
        </>
      ) : null}
      <Dialog open={open !== null} onOpenChange={(next) => (next ? undefined : setOpen(null))}>
        <DialogContent
          bare
          {...dialog}
          overlayProps={overlay}
          closeProps={close}
          closeIcon={<Icon name="close" />}
          closeLabel={words('close')}
        >
          <DialogTitle bare {...title}>
            {heading}
          </DialogTitle>
          <DialogDescription className="sr-only">{heading}</DialogDescription>
          {open === 'saves' ? <SavesMenu onLoaded={() => setOpen(null)} /> : null}
          {open === 'backlog' ? <Backlog /> : null}
          {open === 'mods' ? <ModManager /> : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * The player's menu: saves, the backlog, undo and redo — each only if the game
 * turned it on when it made the runner. With pages on, it also has Settings
 * (if the game has any) and Title screen, which switch to those pages.
 */
export const GameMenu = overridable('GameMenu', GameMenuImpl)
