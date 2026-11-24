/**
 * The game, put together from its content. This file only assembles: what the
 * whole game shares is in `world/`, one file per kind (stats, things, people),
 * and the story is in `story/`, one file per area (a place, a chapter or a
 * character's arc). Add a new file's content to the list when you make one.
 *
 * The docs: https://ifloom.dev/docs/how-to/organise-your-files
 */
import { loadGame } from '@ifloom/engine'
import { defineGame, probe } from '@ifloom/cli/game'
import { stats } from './world/stats.ts'
import { opening } from './story/opening.ts'

/**
 * The game module. `build` makes the game, with anything the loader found
 * wrong with it. The page calls it, and so do `ifloom check`, `playtest`,
 * `snapshot` and `words`.
 */
export default defineGame({
  build: ({ unlocked }) => loadGame([stats, opening], { id: '{{name}}', title: '{{title}}' }, { packs: unlocked }),
  // The states `ifloom snapshot` reads every scene in: the first screen, and after knocking, played as the player would.
  probes: (game) => [probe('start', game, []), probe('knocked', game, [{ play: { type: 'choose', id: 'knock' } }])],
})
