import { XIcon } from 'lucide-react'
import { Button } from '../components/ui/button.tsx'
import { cn } from '../lib/utils.ts'
import { useGame } from './context.tsx'
import { useWords } from './words.ts'
import { Picture } from './picture.tsx'

/** Unseen notices, newest first, each with a button to dismiss it. */
export function Notices({ className, limit = 3 }: { className?: string; limit?: number }) {
  const { view, send } = useGame()
  const words = useWords()
  const unseen = view.notices.unseen.slice(0, limit)
  if (!unseen.length) return null
  return (
    <div className={cn('flex flex-col gap-2', className)} role="status">
      {unseen.map((notice) => (
        <div key={notice.id} className="flex items-start gap-3 rounded-lg border bg-card p-3 shadow-md" data-notice={notice.id}>
          {notice.image ? <Picture src={notice.image} alt="" className="size-10 rounded object-cover" /> : null}
          <div className="flex-1">
            <p className="text-sm font-medium">{notice.title}</p>
            {notice.text ? <p className="text-sm text-muted-foreground">{notice.text}</p> : null}
          </div>
          <Button variant="ghost" size="icon" aria-label={words('dismiss')} onClick={() => send({ type: 'dismiss', id: notice.id })}>
            <XIcon />
          </Button>
        </div>
      ))}
    </div>
  )
}
