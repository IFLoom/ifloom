import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createRunner, indexedDbDriver, localStorageDriver, mods, profile, saves, startingState } from '@ifloom/engine'
import { GameShell, type PagesOptions } from '@ifloom/react'
import { smallTown } from './game.ts'
import { layout } from './layout.ts'
import './styles.css'

// The player's mods live in IndexedDB; they're loaded over the town at start-up.
const modStore = mods('small-town', indexedDbDriver({ database: 'small-town-mods' }))
const { game, problems } = smallTown({ withDebug: import.meta.env.DEV, mods: await modStore.packs() })
if (problems.length) console.warn(problems.join('\n'))

const driver = localStorageDriver(window.localStorage)
// The profile keeps what outlives a save: the player's settings, for one.
const stored = profile(game, driver)

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
function showTextSize(settings: unknown) {
  const size = (settings as Record<string, unknown> | undefined)?.textSize
  document.documentElement.dataset.textSize = size === 'large' ? 'large' : 'normal'
}
void stored.get('core:settings').then(showTextSize)
stored.subscribe((namespace, value) => {
  if (namespace === 'core:settings') showTextSize(value)
})

const pages: PagesOptions = {
  subtitle: 'A new flat, a new town, and a cat with no name.',
  credits: ['Small Town is the IFLoom showcase.', { label: 'Made with IFLoom', href: 'https://ifloom.dev/' }],
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* `keys`: 1 to 9 pick the choices on screen, each showing its number, and Escape opens the menu. */}
    <GameShell runner={runner} pages={pages} layout={layout} keys mods={{ store: modStore, problems, onChange: () => location.reload() }} />
  </StrictMode>,
)
