// src/game.ts
import { loadGame } from '@ifloom/engine'
import { defineGame } from '@ifloom/cli/game'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { cast } from '@ifloom/plugin-cast'
import { stats } from './world/stats.ts'
import { actions } from './world/actions.ts'
import { people } from './world/cast.ts'
import { opening } from './story/opening.ts'
import { highStreet } from './story/high-street.ts'
import { cafe } from './story/cafe.ts'

export default defineGame({
  build: ({ unlocked }) =>
    loadGame(
      [stats, actions, people, opening, highStreet, cafe],
      { id: 'my-town', title: 'My Town', plugins: [calendar({ turn: 'period' }), places({ start: 'house' }), cast()] },
      { packs: unlocked },
    ),
})
