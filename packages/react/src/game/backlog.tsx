import type { BacklogEntry } from '@ifloom/engine'
import { ScrollArea } from '../components/ui/scroll-area.tsx'
import { useGame } from './context.tsx'
import { overridable, usePart } from './overrides.tsx'
import { Beat } from './scene.tsx'
import { useWords } from './words.ts'

/**
 * Returns the backlog's entries from the runner's snapshot, oldest first, and re-renders when they change. It's empty
 * unless the runner's backlog is on.
 */
export function useBacklog(): readonly BacklogEntry[] {
  return useGame().snapshot.backlog
}

function BacklogImpl({ className }: { className?: string }) {
  const words = useWords()
  const entries = useBacklog()
  const list = usePart('backlog', 'h-96', className)
  const entry = usePart('backlog-entry', 'flex flex-col gap-2')
  const title = usePart('backlog-title', 'font-heading font-medium')
  const chose = usePart('backlog-choice', 'text-sm text-muted-foreground italic')
  const empty = usePart('backlog-empty', 'text-sm text-muted-foreground')
  if (!entries.length) return <p {...empty}>{words('backlogEmpty')}</p>
  return (
    <ScrollArea {...list}>
      <ol className="flex flex-col gap-4 pr-3">
        {entries.map((item, index) => (
          <li key={index} {...entry} data-backlog={item.sceneId}>
            <h4 {...title}>{item.title}</h4>
            {item.beats.map((beat, at) => (
              <Beat key={at} beat={beat} />
            ))}
            {item.chose ? <p {...chose}>{words('chose', { label: item.chose })}</p> : null}
          </li>
        ))}
      </ol>
    </ScrollArea>
  )
}

/**
 * Renders the backlog as the `backlog` part, the scenes the player has seen oldest first, each followed by the choice
 * made in it. It needs the runner's backlog on.
 */
export const Backlog = overridable('Backlog', BacklogImpl)
