// src/main.ts
import { mountGame } from '@ifloom/react'
import { calendarUi } from '@ifloom/plugin-calendar/react'
import { placesUi } from '@ifloom/plugin-places/react'
import { castUi } from '@ifloom/plugin-cast/react'
import module from './game.ts'
import { Layout } from './layout.tsx'
import './styles.css'

// The title screen's Continue carries on from the newest save, the autosave included.
mountGame(module.build(), {
  layout: Layout,
  pages: true,
  // Each plugin's own UI: the calendar's, where you are with the ways out, and who's here with a Talk button.
  plugins: [calendarUi, placesUi, castUi],
  // Over browserRunner's defaults: undo never goes back past the start of a turn,
  // and the game autosaves whenever the scene changes.
  runner: { history: { depth: 50, stopAtNewTurn: true }, autosave: { every: 'scene' } },
})
