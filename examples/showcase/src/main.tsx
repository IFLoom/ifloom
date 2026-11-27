import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { indexedDbDriver, localStorageDriver } from '@ifloom/browser'
import { createRunner, describeProblem, mods, profile, saves, startingState } from '@ifloom/engine'
import { GameShell, poweredByIFLoom, type PagesOptions } from '@ifloom/react'
import { unlockedPacks } from '@ifloom/plugin-unlocks'
import { smallTown } from './game.ts'
import { Layout } from './layout.tsx'
import { townUi } from './ui.ts'
import './styles.css'

const driver = localStorageDriver(window.localStorage)
// The profile keeps what outlives a save: the player's settings, and the supporter code once it has worked.
// It's opened before the game is built, to find the supporter content the player's code opens.
const stored = profile({ id: 'small-town' }, driver)
const unlocked = await unlockedPacks('small-town', stored)

// The player's mods live in IndexedDB; they're loaded over the town at start-up. Without the storage, the town starts without them.
const modStore = mods('small-town', indexedDbDriver({ database: 'small-town-mods' }))
const modPacks = await modStore.packs()
if (!modPacks.ok) console.warn(modPacks.reason, modPacks.cause)
const built = smallTown({ withDebug: import.meta.env.DEV, unlocked: unlocked.packs, mods: modPacks.ok ? modPacks.value : [] })
const { game } = built
const problems = built.problems.map(describeProblem)
if (problems.length) console.warn(problems.join('\n'))

// The title screen's New game starts afresh with a random seed; this state is
// only what's in play until the player picks something there.
const runner = createRunner(game, startingState(game, { seed: Math.floor(Math.random() * 2 ** 31) }), {
  history: { depth: 50 },
  backlog: { limit: 200 },
  saves: saves(game, driver),
  profile: stored,
  autosave: { every: 'turn' },
})

const pages: PagesOptions = {
  subtitle: 'A new flat, a new town, and a cat with no name.',
  // The cards shown as the game opens, in order: a studio's, the engine's, then the game's own.
  // A click, Enter or Space skips one; Escape skips them all.
  splash: {
    cards: [
      { id: 'studio', title: 'Corner Shop Games', text: 'presents', ms: 1800 },
      poweredByIFLoom(),
      { id: 'logo', title: 'Small Town', text: 'A new flat, a new town, and a cat with no name.', ms: 2500, transition: { in: 'zoom', out: 'fade', ms: 800 } },
    ],
  },
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* `keys`: 1 to 9 pick the choices on screen, each showing its number, and Escape opens the menu. */}
    {/* `plugins`: the plugins' own UIs. The unlocks UI puts a code box on the settings page; a code that opens new content reloads the page to add it, as a mod does. */}
    <GameShell
      runner={runner}
      pages={pages}
      layout={Layout}
      keys
      mods={{ store: modStore, problems, onChange: () => location.reload() }}
      plugins={townUi({ problems: unlocked.problems, onChange: () => location.reload() })}
    />
  </StrictMode>,
)
