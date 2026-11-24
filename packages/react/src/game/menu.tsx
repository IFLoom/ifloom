import { useState } from 'react'
import { buttonVariants } from '../components/ui/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/dialog.tsx'
import { Backlog } from './backlog.tsx'
import { useGame } from './context.tsx'
import { useDialogParts } from './dialog.tsx'
import { Icon } from './icon.tsx'
import { useMenuKey } from './keys.tsx'
import { ModManager } from './mods.tsx'
import { overridable, usePart } from './overrides.tsx'
import { SavesMenu } from './saves.tsx'
import { usePage } from './pages.tsx'
import { usePluginUis } from './plugins.tsx'
import { uiSay, useWords } from './words.ts'

function GameMenuImpl({ className }: { className?: string }) {
  const { runner, mods, view, snapshot } = useGame()
  const words = useWords()
  const pages = usePage()
  // Each plugin UI's settings: on the settings page with pages on, and behind a button of their own in the menu without.
  const settings = usePluginUis().flatMap((ui) =>
    ui.settings ? [{ id: ui.id, label: uiSay(runner.game, ui.settings.label, {}, ui.words ?? {}), Draw: ui.settings.component }] : [],
  )
  const [open, setOpen] = useState<'menu' | 'saves' | 'backlog' | 'mods' | `plugin:${string}` | null>(null)
  const { undo, backlog } = runner.offers
  const shown = Boolean(runner.saves || undo || backlog || mods || settings.length || pages.enabled)
  useMenuKey(shown ? () => setOpen('menu') : null)
  const menu = usePart('menu', 'flex flex-wrap gap-2', className)
  const opener = usePart('menu-button', buttonVariants({ size: 'sm', variant: 'outline' }))
  const step = usePart('menu-button', buttonVariants({ size: 'sm', variant: 'ghost' }))
  const { dialog, overlay, title, close } = useDialogParts()
  if (!shown) return null
  const plugin = open?.startsWith('plugin:') ? settings.find((entry) => `plugin:${entry.id}` === open) : undefined
  const heading = plugin
    ? plugin.label
    : open === 'saves'
      ? words('saves')
      : open === 'mods'
        ? words('mods')
        : open === 'menu'
          ? words('menu')
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
      {pages.enabled
        ? null
        : settings.map((entry) => (
            <button key={entry.id} {...opener} data-menu-plugin={entry.id} onClick={() => setOpen(`plugin:${entry.id}`)}>
              {entry.label}
            </button>
          ))}
      {pages.enabled && (view.settings.length || settings.length || mods) ? (
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
          <button {...step} disabled={!snapshot.canUndo} onClick={() => runner.undo()}>
            {words('undo')}
          </button>
          <button {...step} disabled={!snapshot.canRedo} onClick={() => runner.redo()}>
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
        <DialogContent bare {...dialog} overlayProps={overlay} closeProps={close} closeIcon={<Icon name="close" />} closeLabel={words('close')}>
          <DialogTitle bare {...title}>
            {heading}
          </DialogTitle>
          <DialogDescription className="sr-only">{heading}</DialogDescription>
          {open === 'menu' ? <div className="flex flex-col gap-2">{buttons}</div> : null}
          {open === 'saves' ? <SavesMenu onLoaded={() => setOpen(null)} /> : null}
          {open === 'backlog' ? <Backlog /> : null}
          {open === 'mods' ? <ModManager /> : null}
          {plugin ? <plugin.Draw /> : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * Renders the player's menu as the `menu` part, with buttons for saves, the backlog, undo and redo when the runner has
 * them. With `keys` on, Escape opens the same buttons in a dialog.
 *
 * It adds mods when the provider has them, and each plugin UI's `settings`, such as the unlocks plugin's code box,
 * behind a button of its own. With pages on, it has Settings and Title screen buttons instead, which switch to those
 * pages, and the mods and the plugin UIs' settings move to the settings page.
 */
export const GameMenu = overridable('GameMenu', GameMenuImpl)
