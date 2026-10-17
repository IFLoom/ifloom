import { useState } from 'react'
import { buttonVariants } from '../components/ui/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/dialog.tsx'
import { Backlog } from './backlog.tsx'
import { useGame } from './context.tsx'
import { Icon } from './icon.tsx'
import { useMenuKey } from './keys.tsx'
import { ModManager } from './mods.tsx'
import { UnlocksPanel } from './unlocks.tsx'
import { overridable, usePart } from './overrides.tsx'
import { SavesMenu } from './saves.tsx'
import { usePage } from './pages.tsx'
import { useWords } from './words.ts'

function GameMenuImpl({ className }: { className?: string }) {
  const { runner, mods, unlocks, view } = useGame()
  const words = useWords()
  const pages = usePage()
  const [open, setOpen] = useState<'menu' | 'saves' | 'backlog' | 'mods' | 'unlocks' | null>(null)
  const { undo, backlog } = runner.offers
  // With pages on, codes are entered on the settings page; without, in the menu.
  const codes = Boolean(unlocks && view.plugins.unlocks)
  const shown = Boolean(runner.saves || undo || backlog || mods || codes || pages.enabled)
  useMenuKey(shown ? () => setOpen('menu') : null)
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
  if (!shown) return null
  const heading =
    open === 'saves' ? words('saves')
    : open === 'mods' ? words('mods')
    : open === 'unlocks' ? words('enterCode')
    : open === 'menu' ? words('menu')
    : words('backlog')
  const buttons = (
    <>
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
      {codes && !pages.enabled ? (
        <button {...opener} onClick={() => setOpen('unlocks')}>
          {words('enterCode')}
        </button>
      ) : null}
      {pages.enabled && (view.settings.length || codes) ? (
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
    </>
  )
  return (
    <div {...menu} data-menu>
      {buttons}
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
          {open === 'menu' ? <div className="flex flex-col gap-2">{buttons}</div> : null}
          {open === 'saves' ? <SavesMenu onLoaded={() => setOpen(null)} /> : null}
          {open === 'backlog' ? <Backlog /> : null}
          {open === 'mods' ? <ModManager /> : null}
          {open === 'unlocks' ? <UnlocksPanel /> : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * The player's menu: saves, the backlog, undo and redo — each only if the game
 * turned it on when it made the runner, and mods and codes when the provider
 * has them. With pages on, it also has Settings (if the game has any, or
 * codes, which are entered there) and Title screen, which switch to those
 * pages. With
 * `keys` on, Escape opens the same buttons in a dialog.
 */
export const GameMenu = overridable('GameMenu', GameMenuImpl)
