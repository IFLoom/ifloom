import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { indexedDbDriver, localStorageDriver } from '@ifloom/browser'
import { createRunner, describeProblem, mods, profile, saves, startingState } from '@ifloom/engine'
import { GameShell, type PagesOptions } from '@ifloom/react'
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

// The player's mods live in IndexedDB; they're loaded over the town at start-up.
const modStore = mods('small-town', indexedDbDriver({ database: 'small-town-mods' }))
const built = smallTown({ withDebug: import.meta.env.DEV, unlocked: unlocked.packs, mods: await modStore.packs() })
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

// `textSize` is a ui setting: it lives in the profile, never in the game. Put
// it on <html> as `data-text-size`, now and whenever it changes, and
// styles.css does the rest. It applies on every page, the title included.
function showTextSize() {
  document.documentElement.dataset.textSize = runner.snapshot().settings.textSize === 'large' ? 'large' : 'normal'
}
showTextSize()
runner.subscribe(showTextSize)

const pages: PagesOptions = {
  subtitle: 'A new flat, a new town, and a cat with no name.',
  credits: ['Small Town is the IFLoom showcase.', { label: 'Made with IFLoom', href: 'https://ifloom.dev/' }],
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
