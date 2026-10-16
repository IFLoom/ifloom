import type { ReactNode } from 'react'
import { GameProvider, type GameProviderProps } from './context.tsx'
import { DEFAULT_LAYOUT, Parts, Sidebar, type Layout } from './layout.tsx'
import { overridable, usePart } from './overrides.tsx'
import { Pages, PagesProvider, type PagesOptions } from './pages.tsx'

export type GameShellProps = Omit<GameProviderProps, 'children'> & {
  className?: string
  /**
   * Which parts go where: the React UI's own if left out. With no `sidebar`,
   * the stage is the whole page: `layout={READING_LAYOUT}` for a novel.
   */
  layout?: Layout
  /**
   * The title screen and the pages around it: `true`, or what they show.
   * Off if left out, and the game starts straight away.
   */
  pages?: boolean | PagesOptions
}

const NO_PAGES: PagesOptions = {}

export type FrameProps = {
  /** The side column, already drawn. Null when the layout has none. */
  sidebar: ReactNode
  /** The stage's parts, already drawn. */
  stage: ReactNode
  /** What floats over the page as it scrolls, and sits after it at the end: notices, by default. */
  overlay: ReactNode
  className?: string
}

function FrameImpl({ sidebar, stage, overlay, className }: FrameProps) {
  const page = usePart(
    'page',
    sidebar
      ? 'mx-auto grid min-h-screen content-start max-w-(--width-page) gap-(--gap-page) p-4 font-body md:grid-cols-[var(--width-sidebar)_1fr]'
      : 'mx-auto grid min-h-screen content-start max-w-(--width-reading) gap-(--gap-page) p-4 font-body',
    className,
  )
  const main = usePart('stage', 'flex flex-col gap-(--gap-page)')
  // The overlay comes after the stage, across the page, and sticks to the bottom
  // of the window: it floats over the page while you scroll, and sits after
  // the content at the end, so nothing is left under it.
  const over = usePart('overlay', 'sticky bottom-4 z-40 order-last col-span-full self-end justify-self-end w-full max-w-full md:w-(--width-notice) empty:hidden')
  return (
    <div {...page} data-has-sidebar={sidebar ? '' : undefined}>
      {sidebar}
      <main {...main}>{stage}</main>
      {overlay ? <div {...over}>{overlay}</div> : null}
    </div>
  )
}

/**
 * The page's skeleton: where the side column, the stage and the overlay go.
 * Replace it in `components` for a top bar, a column on the right, a
 * full-screen stage, or any other shape of page.
 */
export const Frame = overridable('Frame', FrameImpl)

/**
 * The whole React UI: the game's parts laid out in a side column, the stage and
 * an overlay, inside a `Frame`. Which parts go in each is the layout's; every
 * part is also exported on its own, so a game can build another page entirely.
 */
export function GameShell({ className, layout, pages, ...provider }: GameShellProps) {
  const sidebar = layout ? (layout.sidebar ?? []) : DEFAULT_LAYOUT.sidebar
  const stage = layout?.stage ?? DEFAULT_LAYOUT.stage
  const overlay = layout?.overlay ?? DEFAULT_LAYOUT.overlay
  const frame = (
    <Frame
      className={className}
      sidebar={sidebar.length ? <Sidebar parts={sidebar} /> : null}
      stage={<Parts parts={stage} />}
      overlay={overlay.length ? <Parts parts={overlay} /> : null}
    />
  )
  return (
    <GameProvider {...provider}>
      <WithPages pages={pages}>{frame}</WithPages>
    </GameProvider>
  )
}

/**
 * The game, or with `pages` on, the pages around it: the game shows
 * only on the `game` page. Used inside a `GameProvider`.
 */
export function WithPages({ pages, children }: { pages?: boolean | PagesOptions; children: ReactNode }) {
  if (!pages) return <>{children}</>
  return (
    <PagesProvider options={pages === true ? NO_PAGES : pages}>
      <Pages game={children} />
    </PagesProvider>
  )
}
