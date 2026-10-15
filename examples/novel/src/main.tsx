import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createRunner, localStorageDriver, saves, startingState } from '@ifloom/engine'
import { GameShell, READING_LAYOUT } from '@ifloom/ui'
import { theLetter } from './game.ts'
import './styles.css'

const { game, problems } = theLetter()
if (problems.length) console.warn(problems.join('\n'))

// A page to read: no side column, no clock, no map.
const runner = createRunner(game, startingState(game, { seed: Math.floor(Math.random() * 2 ** 31) }), {
  history: { depth: 50 },
  saves: saves(game, localStorageDriver(window.localStorage)),
  autosave: { every: 'turn' },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameShell runner={runner} layout={READING_LAYOUT} />
  </StrictMode>,
)
