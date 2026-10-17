import type { ComponentType } from 'react'
import { GameProvider, type GameProviderProps } from './context.tsx'
import { DefaultLayout } from './layout.tsx'
import type { PagesOptions } from './pages.tsx'
import { LayoutOptionsProvider } from './regions.tsx'

export type GameShellProps = Omit<GameProviderProps, 'children'> & {
  /**
   * The page, as a component: a `Game` with a `Sidebar`, a `Story` and the
   * rest, as in your `src/layout.tsx`. `DefaultLayout` if left out.
   */
  layout?: ComponentType
  /**
   * The title screen and the pages around it: `true`, or what they show.
   * Off if left out, and the game starts straight away. The layout's `Game`
   * draws them.
   */
  pages?: boolean | PagesOptions
}

/**
 * The whole React UI: the game's provider and its layout, `DefaultLayout`
 * unless you give your own. Every part a layout uses is exported on its own,
 * so a game can build another page entirely.
 */
export function GameShell({ layout: Layout = DefaultLayout, pages, ...provider }: GameShellProps) {
  return (
    <GameProvider {...provider}>
      <LayoutOptionsProvider pages={pages}>
        <Layout />
      </LayoutOptionsProvider>
    </GameProvider>
  )
}
