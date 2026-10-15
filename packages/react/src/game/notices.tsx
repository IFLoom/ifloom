import { buttonVariants } from '../components/ui/button.tsx'
import { useGame } from './context.tsx'
import { Icon } from './icon.tsx'
import { overridable, usePart } from './overrides.tsx'
import { Picture } from './picture.tsx'
import { useWords } from './words.ts'
import type { NoticeView } from '@ifloom/engine'

function NoticeImpl({ notice }: { notice: NoticeView }) {
  const { send } = useGame()
  const words = useWords()
  const card = usePart('notice', 'flex items-start gap-3 rounded-lg border bg-card p-3 shadow-card')
  const image = usePart('notice-image', 'size-10 rounded object-cover')
  const title = usePart('notice-title', 'text-sm font-medium')
  const text = usePart('notice-text', 'text-sm text-muted-foreground')
  const dismiss = usePart('notice-dismiss', `${buttonVariants({ variant: 'ghost', size: 'icon' })}`)
  return (
    <div {...card} data-notice={notice.id}>
      {notice.image ? <Picture {...image} src={notice.image} alt="" /> : null}
      <div className="flex-1">
        <p {...title}>{notice.title}</p>
        {notice.text ? <p {...text}>{notice.text}</p> : null}
      </div>
      <button {...dismiss} aria-label={words('dismiss')} onClick={() => send({ type: 'dismiss', id: notice.id })}>
        <Icon name="close" />
      </button>
    </div>
  )
}

/** One notice: its picture, title and text, and a button to dismiss it. */
export const Notice = overridable('Notice', NoticeImpl)

function NoticesImpl({ className, limit = 3 }: { className?: string; limit?: number }) {
  const { view } = useGame()
  const list = usePart('notices', 'flex flex-col gap-2', className)
  const unseen = view.notices.unseen.slice(0, limit)
  if (!unseen.length) return null
  return (
    <div {...list} role="status">
      {unseen.map((notice) => (
        <Notice key={notice.id} notice={notice} />
      ))}
    </div>
  )
}

/** Unseen notices, newest first, up to `limit`. The `'notices'` part, in the layout's overlay by default. */
export const Notices = overridable('Notices', NoticesImpl)
