import { useEffect, useRef, type ComponentType } from 'react'
import type { AudioOptions } from '@ifloom/audio'
import { hasAudio, startPlayer } from './audio.ts'
import { TextSize } from './display.tsx'
import { GameProvider, useGame, type GameProviderProps } from './context.tsx'
import { DefaultLayout } from './layout.tsx'
import { WithPages, type PagesOptions } from './pages.tsx'

export type GameShellProps = Omit<GameProviderProps, 'children'> & {
  /**
   * The page, as a component: a `Game` with a `Sidebar`, a `Story` and the
   * rest, as in your `src/layout.tsx`, or any component of your own, since
   * `useGame()` and every built-in component work in it. `DefaultLayout` if
   * left out.
   */
  layout?: ComponentType
  /**
   * The title screen and the pages around the game: `true`, or what they show.
   * Off if left out, and the game starts straight away. With them on, the
   * layout is drawn on the `game` page.
   */
  pages?: boolean | PagesOptions
  /**
   * Sound, through `@ifloom/audio`. It starts on its own when the game lists
   * any tracks in `game.audio`; `false` turns it off, and an object is passed
   * to `startAudio` as its options.
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
 * The whole React UI, and the one root every entry draws (`mountGame` draws
 * it too): the game's provider (the snapshot, the UI options, the keys and
 * the clock), the game's sound, its text size, the pages if `pages` is on,
 * and the layout, `DefaultLayout` unless you give your own. Every part a
 * layout uses is exported on its own, so a game can build another page
 * entirely.
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
