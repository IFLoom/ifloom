import { useState } from 'react'
import { Button } from '../components/ui/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/dialog.tsx'
import { cn } from '../lib/utils.ts'
import { Backlog } from './backlog.tsx'
import { useGame } from './context.tsx'
import { ModManager } from './mods.tsx'
import { SavesMenu } from './saves.tsx'
import { useWords } from './words.ts'

/**
 * The player's menu: saves, the backlog, undo and redo — each only if the game
 * turned it on when it made the runner.
 */
export function GameMenu({ className }: { className?: string }) {
  const { runner, mods } = useGame()
  const words = useWords()
  const [open, setOpen] = useState<'saves' | 'backlog' | 'mods' | null>(null)
  const { undo, backlog } = runner.offers
  if (!runner.saves && !undo && !backlog && !mods) return null
  const title = open === 'saves' ? words('saves') : open === 'mods' ? words('mods') : words('backlog')
  return (
    <div className={cn('flex flex-wrap gap-2', className)} data-menu>
      {runner.saves ? (
        <Button size="sm" variant="outline" onClick={() => setOpen('saves')}>
          {words('saves')}
        </Button>
      ) : null}
      {backlog ? (
        <Button size="sm" variant="outline" onClick={() => setOpen('backlog')}>
          {words('backlog')}
        </Button>
      ) : null}
      {mods ? (
        <Button size="sm" variant="outline" onClick={() => setOpen('mods')}>
          {words('mods')}
        </Button>
      ) : null}
      {undo ? (
        <>
          <Button size="sm" variant="ghost" disabled={!runner.canUndo} onClick={() => runner.undo()}>
            {words('undo')}
          </Button>
          <Button size="sm" variant="ghost" disabled={!runner.canRedo} onClick={() => runner.redo()}>
            {words('redo')}
          </Button>
        </>
      ) : null}
      <Dialog open={open !== null} onOpenChange={(next) => (next ? undefined : setOpen(null))}>
        <DialogContent>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{title}</DialogDescription>
          {open === 'saves' ? <SavesMenu onLoaded={() => setOpen(null)} /> : null}
          {open === 'backlog' ? <Backlog /> : null}
          {open === 'mods' ? <ModManager /> : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
