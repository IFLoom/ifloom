import { useState } from 'react'
import { badgeVariants } from '../components/ui/badge.tsx'
import { buttonVariants } from '../components/ui/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/dialog.tsx'
import { useGame } from './context.tsx'
import { DeviceDialog, useDevice, useDevices } from './device.tsx'
import { Icon } from './icon.tsx'
import { Notice } from './notices.tsx'
import { overridable, usePart } from './overrides.tsx'
import { useWords } from './words.ts'

function NoticeStripImpl({ className }: { className?: string }) {
  const { view, send } = useGame()
  const words = useWords()
  const devices = useDevices()
  const device = useDevice()
  const [showNotices, setShowNotices] = useState(false)
  const strip = usePart('notice-strip', 'flex flex-wrap gap-2', className)
  const item = usePart('notice-strip-item', buttonVariants({ size: 'sm', variant: 'outline' }))
  const badge = usePart('badge', badgeVariants())
  const dialog = usePart(
    'dialog',
    'fixed top-1/2 left-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border bg-background p-6 shadow-lg',
  )
  const overlay = usePart('dialog-overlay', 'fixed inset-0 z-50 bg-black/50')
  const title = usePart('dialog-title', 'font-heading text-lg font-semibold leading-none')
  const close = usePart('dialog-close', 'absolute top-4 right-4 rounded-sm opacity-70 hover:opacity-100')
  const allSeen = usePart('button', buttonVariants({ size: 'sm', variant: 'ghost' }))
  const unseen = view.notices.unseen
  // Each app with a badge, on any device: the button opens the device on that app.
  const apps = devices.flatMap((entry) => entry.apps.filter((app) => app.badge && !app.disabled).map((app) => ({ device: entry, app })))
  if (!unseen.length && !apps.length) return null
  return (
    <nav {...strip} aria-label={words('unread')}>
      {unseen.length ? (
        <button type="button" {...item} data-strip="notices" onClick={() => setShowNotices(true)}>
          {words('notices')}
          <span {...badge}>{unseen.length}</span>
        </button>
      ) : null}
      {apps.map(({ device: entry, app }) => (
        <button
          key={`${entry.id}/${app.id}`}
          type="button"
          {...item}
          data-strip={`${entry.id}/${app.id}`}
          onClick={() => {
            device.open(entry.id)
            send(app.command)
          }}
        >
          {app.name}
          {typeof app.badge === 'number' ? <span {...badge}>{app.badge}</span> : <span {...badge} aria-label={words('unread')} />}
        </button>
      ))}
      <DeviceDialog deviceId={device.openId} onClose={device.close} />
      <Dialog open={showNotices && unseen.length > 0} onOpenChange={(next) => setShowNotices(next)}>
        <DialogContent bare {...dialog} overlayProps={overlay} closeProps={close} closeIcon={<Icon name="close" />} closeLabel={words('close')}>
          <DialogTitle bare {...title}>
            {words('notices')}
          </DialogTitle>
          <DialogDescription className="sr-only">{words('notices')}</DialogDescription>
          <div className="flex flex-col gap-2">
            {unseen.map((notice) => (
              <Notice key={notice.id} notice={notice} />
            ))}
          </div>
          <button type="button" {...allSeen} onClick={() => send({ type: 'dismiss' })}>
            {words('allSeen')}
          </button>
        </DialogContent>
      </Dialog>
    </nav>
  )
}

/**
 * What's waiting for the player, as a row of counts: unseen notices, and each
 * app with a badge on the game's devices. A count is a button that opens where
 * it is: the notices in a dialog, or the device on that app. Nothing when
 * there's nothing unread. It's the `'notice-strip'` layout part, which no
 * built-in layout includes.
 */
export const NoticeStrip = overridable('NoticeStrip', NoticeStripImpl)
