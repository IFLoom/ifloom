'use client'
/**
 * The game, drawn with the React UI. It runs in the browser only: the runner
 * reads saves and settings from localStorage, so it starts after the page has
 * loaded, and the server sends an empty spot for it.
 */
import { useEffect, useState } from 'react'
import { browserRunner } from '@ifloom/browser'
import type { Runner } from '@ifloom/engine'
import { GameShell, type PluginUi } from '@ifloom/react'
import module from '../src/game.ts'
import { Layout } from '../src/layout.tsx'

/** The plugins' own UIs. One list for the whole app, so the provider keeps the same one. */
const PLUGINS: PluginUi[] = []

export function Game() {
  const [runner, setRunner] = useState<Runner | null>(null)

  useEffect(() => {
    // The game module builds the game, and says what the loader found wrong with it.
    const { game, problems } = module.build()
    if (problems.length) console.warn(problems)
    // A new game with a random seed, undo, saves in localStorage and an autosave each turn.
    let live = true
    void browserRunner(game).then((made) => {
      if (live) setRunner(made)
    })
    return () => {
      live = false
    }
  }, [])

  return runner ? <Playing runner={runner} /> : null
}

function Playing({ runner }: { runner: Runner }) {
  // `layout` is the page, in `src/layout.tsx`. `pages` opens on a title
  // screen with New game, Continue, Load and Settings. Leave it out to start
  // straight in the story. `plugins` lists the UIs of the plugins in
  // src/game.ts, such as `shopUi` from `@ifloom/plugin-shop/react`; leave one
  // out to draw that plugin yourself. The shell plays what the game's `audio`
  // asks for, from the first click or key press.
  return <GameShell runner={runner} layout={Layout} pages plugins={PLUGINS} />
}
