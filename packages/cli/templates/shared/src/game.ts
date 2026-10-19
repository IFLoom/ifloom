/**
 * The game, put together from its content. This file only assembles: what the
 * whole game shares is in `world/`, one file per kind (stats, items, people),
 * and the story is in `story/`, one file per area (a place, a chapter or a
 * character's arc). Add a new file's content to the list when you make one.
 *
 * The docs: https://ifloom.dev/docs/guide/organising
 */
import { loadGame } from '@ifloom/engine'
import { stats } from './world/stats.ts'
import { opening } from './story/opening.ts'

/** The game, and anything the loader found wrong with it. `ifloom check` reads this. */
export default loadGame([stats, opening], { id: '{{name}}', title: '{{title}}', introScene: 'start' })
