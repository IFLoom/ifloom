import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createRunner, indexedDbDriver, localStorageDriver, mods, saves, startingState } from '@ifloom/engine'
import { GameShell } from '@ifloom/react'
import { smallTown } from './game.ts'
import './styles.css'

// The player's mods live in IndexedDB; they're loaded over the town at start-up.
const modStore = mods('small-town', indexedDbDriver({ database: 'small-town-mods' }))
const { game, problems } = smallTown({ withDebug: import.meta.env.DEV, mods: await modStore.packs() })
if (problems.length) console.warn(problems.join('\n'))

// A fresh seed per new game, so each playthrough deals its own variants.
const runner = createRunner(game, startingState(game, { seed: Math.floor(Math.random() * 2 ** 31) }), {
  history: { depth: 50 },
  backlog: { limit: 200 },
  saves: saves(game, localStorageDriver(window.localStorage)),
  autosave: { every: 'turn' },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameShell runner={runner} mods={{ store: modStore, problems, onChange: () => location.reload() }} />
  </StrictMode>,
)
