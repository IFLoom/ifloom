import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { badgeVariants } from '../components/ui/badge.tsx'
import { buttonVariants } from '../components/ui/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/dialog.tsx'
import { useGame } from './context.tsx'
import { useDialogParts } from './dialog.tsx'
import { Icon } from './icon.tsx'
import { Notice } from './notices.tsx'
import { overridable, usePart } from './overrides.tsx'
import { Plugins, usePluginUis } from './plugins.tsx'
import { useWords } from './words.ts'

/** A layout effect in the browser, a plain effect on the server (where it never runs). */
const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

function NoticeStripImpl({ className }: { className?: string }) {
  const { view, send } = useGame()
  const words = useWords()
  const plugins = usePluginUis()
  const [showNotices, setShowNotices] = useState(false)
  const row = useRef<HTMLElement>(null)
  const [empty, setEmpty] = useState(false)
  const strip = usePart('notice-strip', 'flex flex-wrap gap-2', className)
  const item = usePart('notice-strip-item', buttonVariants({ size: 'sm', variant: 'outline' }))
  const badge = usePart('badge', badgeVariants())
  const { dialog, overlay, title, close } = useDialogParts()
  const allSeen = usePart('button', buttonVariants({ size: 'sm', variant: 'ghost' }))
  const unseen = view.notices.unseen
  // What the plugin UIs add to the row, such as each app with a badge; they draw nothing when there's nothing new.
  const more = plugins.some((ui) => ui.layout?.strip?.length)
  // Hidden while nothing in the row drew anything.
  useBrowserLayoutEffect(() => {
    const now = row.current ? row.current.childElementCount === 0 : empty
    if (now !== empty) setEmpty(now)
  })
  if (!unseen.length && !more) return null
  return (
    <nav {...strip} ref={row} aria-label={words('unread')} hidden={empty || undefined}>
      {unseen.length ? (
        <button type="button" {...item} data-strip="notices" onClick={() => setShowNotices(true)}>
          {words('notices')}
          <span {...badge}>{unseen.length}</span>
        </button>
      ) : null}
      <Plugins at="strip" />
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
 * Renders a row of unread counts as the `notice-strip` part. It starts with the unseen notices, then the plugin UIs'
 * components at the `strip` spot, such as each device app with a badge.
 *
 * Each count is a button that opens it, the notices in a dialog or the device on that app. It renders nothing when
 * nothing is unread, and no built-in layout includes it.
 */
export const NoticeStrip = overridable('NoticeStrip', NoticeStripImpl)
