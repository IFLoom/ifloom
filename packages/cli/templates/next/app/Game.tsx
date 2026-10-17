'use client'
/**
 * The game, drawn with the React UI. It runs in the browser only: the runner
 * reads saves and settings from localStorage, so it starts after the page has
 * loaded, and the server sends an empty spot for it.
 */
import { useEffect, useState } from 'react'
import { browserRunner, type Runner } from '@ifloom/engine'
import { GameShell, useAudio } from '@ifloom/react'
import loaded from '../src/game.ts'
import { Layout } from '../src/layout.tsx'

export function Game() {
  const [runner, setRunner] = useState<Runner | null>(null)

  useEffect(() => {
    if (loaded.problems.length) console.warn(loaded.problems)
    // A new game with a random seed, undo, saves in localStorage and an autosave each turn.
    let live = true
    void browserRunner(loaded.game).then((made) => {
      if (live) setRunner(made)
    })
    return () => {
      live = false
    }
  }, [])

  return runner ? <Playing runner={runner} /> : null
}

function Playing({ runner }: { runner: Runner }) {
  // Plays what the game's `audio` asks for, from the first click or key press.
  useAudio({ runner })
  // `layout` is the page, in `src/layout.tsx`. `pages` opens on a title
  // screen with New game, Continue, Load and Settings. Leave it out to start
  // straight in the story.
  return <GameShell runner={runner} layout={Layout} pages />
}
