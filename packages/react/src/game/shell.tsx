import { useEffect, useRef, type ComponentType } from 'react'
import type { AudioOptions } from '@ifloom/audio'
import { hasAudio, startPlayer } from './audio.ts'
import { TextSize } from './display.tsx'
import { GameProvider, useGame, type GameProviderProps } from './context.tsx'
import { DefaultLayout } from './layout.tsx'
import { WithPages, type PagesOptions } from './pages.tsx'

/** The props of `GameShell`, the {@link GameProviderProps} without `children`, with a layout, pages and sound. */
export type GameShellProps = Omit<GameProviderProps, 'children'> & {
  /**
   * The layout, the page as a component, such as a `Game` with a `Sidebar` and a `Story` in your `src/layout.tsx`.
   * `DefaultLayout` if left out.
   *
   * Any component of your own works, since `useGame()` and every built-in component work inside it.
   */
  layout?: ComponentType
  /**
   * The title screen and the pages around the game, `true` or the {@link PagesOptions} for them. Off if left out, and
   * the game starts straight away.
   *
   * With pages on, the layout renders on the `game` page.
   */
  pages?: boolean | PagesOptions
  /**
   * The game's sound through `@ifloom/audio`, which starts when the game declares any audio. `false` turns it off, and
   * an object goes to `startAudio` as its options.
   */
  audio?: false | AudioOptions
}

/** Plays the game's sound while it's drawn, unless the game has none or `audio` is false. Draws nothing. */
function Sound({ audio }: { audio?: false | AudioOptions }) {
  const { runner } = useGame()
  // Read once, when the player starts; a new object each render doesn't restart it.
  const latest = useRef(audio)
  latest.current = audio
  const on = audio !== false && hasAudio(runner.game)
  useEffect(() => {
    if (!on) return
    const options = latest.current
    return startPlayer(runner, options === false ? undefined : options, false)
  }, [on, runner])
  return null
}

/**
 * Renders the whole React UI for a runner, the root that `mountGame` renders too. It renders the layout,
 * `DefaultLayout` unless you give your own, inside the game's provider.
 *
 * It also plays the game's sound, sets its text size and, with `pages` on, renders the pages around the game. Every
 * part a layout uses is exported on its own, so a game can build another page entirely.
 */
export function GameShell({ layout: Layout = DefaultLayout, pages, audio, ...provider }: GameShellProps) {
  return (
    <GameProvider {...provider}>
      <Sound audio={audio} />
      <TextSize />
      <WithPages pages={pages}>
        <Layout />
      </WithPages>
    </GameProvider>
  )
}
