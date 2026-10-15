import { ScrollArea } from '../components/ui/scroll-area.tsx'
import { cn } from '../lib/utils.ts'
import { useGame } from './context.tsx'
import { Beat } from './scene.tsx'
import { useWords } from './words.ts'

/** What was shown, oldest first, each scene followed by the choice made in it. Needs the runner's backlog on. */
export function Backlog({ className }: { className?: string }) {
  const { runner, view } = useGame()
  const words = useWords()
  // Read on every render: the view changes after every command, so this follows it.
  void view
  const entries = runner.backlog()
  if (!entries.length) return <p className="text-sm text-muted-foreground">{words('backlogEmpty')}</p>
  return (
    <ScrollArea className={cn('h-96', className)}>
      <ol className="flex flex-col gap-4 pr-3">
        {entries.map((entry, index) => (
          <li key={index} className="flex flex-col gap-2" data-backlog={entry.sceneId}>
            <h4 className="font-medium">{entry.title}</h4>
            {entry.beats.map((beat, at) => (
              <Beat key={at} beat={beat} />
            ))}
            {entry.chose ? <p className="text-sm text-muted-foreground italic">{words('chose', { label: entry.chose })}</p> : null}
          </li>
        ))}
      </ol>
    </ScrollArea>
  )
}
