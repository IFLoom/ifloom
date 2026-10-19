/**
 * The Corner Café: a management game, a week at a time.
 *
 * The shape this shows is the one a management game needs: things the game
 * keeps several of (staff, dishes), each with numbers of its own; people
 * hired and leaving in play; upkeep that runs over all of them each week; and
 * triggers that watch counts. A turn is a week, ended by a button. No places,
 * no characters, no clock: the café is the whole world.
 *
 * A game like this is mostly data, so most of it is in `world/`, a file per
 * kind (stats, staff, the menu, activities, triggers), with its two scenes in
 * `story/` and its sums in `rules.ts`. This file only puts it together.
 */
import { loadGame, startingState, type Content, type Game } from '@ifloom/engine'
import { custom } from './rules.ts'
import { stats } from './world/stats.ts'
import { staff } from './world/staff.ts'
import { menu } from './world/menu.ts'
import { activities } from './world/activities.ts'
import { triggers } from './world/triggers.ts'
import { opening } from './story/opening.ts'
import { hiring } from './story/hiring.ts'

/** The game's content: the world, by kind, then the story. */
export const content: Content[] = [stats, staff, menu, activities, triggers, opening, hiring]

/** The game: its content, with a base that has its own sums and the buttons the café always has. */
export function cornerCafe(): { game: Game; problems: string[] } {
  const { game, problems } = loadGame(content, {
    id: 'corner-cafe',
    title: 'The Corner Café',
    introScene: 'opening',
    custom,
    actions: [
      { id: 'end-week', label: 'Count the till and end the week', command: { type: 'activity', id: 'endWeek' } },
      { id: 'lunch', label: 'Buy the staff lunch', command: { type: 'activity', id: 'staffLunch' } },
      { id: 'soup', label: 'Better ingredients for the soup', command: { type: 'activity', id: 'improveSoup' } },
      { id: 'hire', label: 'Put a card in the window', command: { type: 'activity', id: 'interview' } },
    ],
  })
  return { game, problems: problems.map((problem) => `${problem.pack} · ${problem.where} · ${problem.what}`) }
}

const built = cornerCafe()
export default built

/** Where `ifloom playtest` starts: the doors already open. */
export const start = (game: Game) => ({ ...startingState(game), sceneId: null })
