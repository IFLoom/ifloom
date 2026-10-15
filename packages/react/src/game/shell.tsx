import type { ReactNode } from 'react'
import { GameProvider, type GameProviderProps } from './context.tsx'
import { DEFAULT_LAYOUT, Parts, Sidebar, type Layout } from './layout.tsx'
import { overridable, usePart } from './overrides.tsx'
import { Screens, ScreensProvider, type ScreensOptions } from './screens.tsx'

export type GameShellProps = Omit<GameProviderProps, 'children'> & {
  className?: string
  /**
   * Which parts go where: the React UI's own if left out. With no `sidebar`,
   * the stage is the whole page: `layout={READING_LAYOUT}` for a novel.
   */
  layout?: Layout
  /**
   * The title screen and the screens around it: `true`, or what they show.
   * Off if left out, and the game starts straight away.
   */
  screens?: boolean | ScreensOptions
}

const NO_SCREENS: ScreensOptions = {}

export type FrameProps = {
  /** The side column, already drawn. Null when the layout has none. */
  sidebar: ReactNode
  /** The stage's parts, already drawn. */
  stage: ReactNode
  /** What floats over the page: notices, by default. */
  overlay: ReactNode
  className?: string
}

function FrameImpl({ sidebar, stage, overlay, className }: FrameProps) {
  const page = usePart(
    'page',
    sidebar
      ? 'mx-auto grid min-h-screen max-w-(--width-page) gap-(--gap-page) p-4 font-body md:grid-cols-[var(--width-sidebar)_1fr]'
      : 'mx-auto grid min-h-screen max-w-(--width-reading) gap-(--gap-page) p-4 font-body',
    className,
  )
  const main = usePart('stage', 'flex flex-col gap-(--gap-page)')
  const over = usePart('overlay', 'fixed right-4 bottom-4 z-40 w-(--width-notice) max-w-[calc(100vw-2rem)]')
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
export function GameShell({ className, layout, screens, ...provider }: GameShellProps) {
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
      <WithScreens screens={screens}>{frame}</WithScreens>
    </GameProvider>
  )
}

/**
 * The game, or with `screens` on, the screens around it: the game shows
 * only on the `game` screen. Used inside a `GameProvider`.
 */
export function WithScreens({ screens, children }: { screens?: boolean | ScreensOptions; children: ReactNode }) {
  if (!screens) return <>{children}</>
  return (
    <ScreensProvider options={screens === true ? NO_SCREENS : screens}>
      <Screens game={children} />
    </ScreensProvider>
  )
}
