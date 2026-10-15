import { TooltipProvider } from '../components/ui/tooltip.tsx'
import { cn } from '../lib/utils.ts'
import { GameProvider, type GameProviderProps } from './context.tsx'
import { DEFAULT_LAYOUT, Parts, Sidebar, type Layout } from './layout.tsx'
import { Notices } from './notices.tsx'

export type GameShellProps = Omit<GameProviderProps, 'children'> & {
  className?: string
  /**
   * Which parts go where: the base UI's own if left out. With no `sidebar`,
   * the stage is the whole page: `layout={READING_LAYOUT}` for a novel.
   */
  layout?: Layout
}

/**
 * The whole base UI: a side column and the stage, notices over the corner.
 * Which parts go in each is the layout's; every part is also exported on its
 * own, so a game that wants another page entirely builds it from the same pieces.
 */
export function GameShell({ className, layout, ...provider }: GameShellProps) {
  const sidebar = layout ? (layout.sidebar ?? []) : DEFAULT_LAYOUT.sidebar
  const stage = layout?.stage ?? DEFAULT_LAYOUT.stage
  return (
    <GameProvider {...provider}>
      <TooltipProvider>
        <div className={cn('mx-auto grid min-h-screen gap-6 p-4', sidebar.length ? 'max-w-6xl md:grid-cols-[18rem_1fr]' : 'max-w-2xl', className)}>
          {sidebar.length ? <Sidebar parts={sidebar} /> : null}
          <main className="flex flex-col gap-6">
            <Parts parts={stage} />
          </main>
        </div>
        <Notices className="fixed right-4 bottom-4 z-40 w-80" />
      </TooltipProvider>
    </GameProvider>
  )
}
