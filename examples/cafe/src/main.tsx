import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createRunner, localStorageDriver, saves, startingState } from '@ifloom/engine'
import { GameShell } from '@ifloom/ui'
import { cornerCafe } from './game.ts'
import './styles.css'

const { game, problems } = cornerCafe()
if (problems.length) console.warn(problems.join('\n'))

const runner = createRunner(game, startingState(game, { seed: Math.floor(Math.random() * 2 ** 31) }), {
  history: { depth: 50 },
  saves: saves(game, localStorageDriver(window.localStorage)),
  autosave: { every: 'turn' },
})

// The books on the stage, where the eye goes: the staff and the menu over the week's buttons.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameShell runner={runner} layout={{ sidebar: ['title', 'stats', 'menu'], stage: ['scene', 'entities', 'actions', 'inputs'] }} />
  </StrictMode>,
)
