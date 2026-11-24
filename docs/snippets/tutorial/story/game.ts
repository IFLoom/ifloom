// src/game.ts
import { loadGame } from '@ifloom/engine'
import { defineGame } from '@ifloom/cli/game'
import { stats } from './world/stats.ts'
import { opening } from './story/opening.ts'

export default defineGame({
  build: ({ unlocked }) => loadGame([stats, opening], { id: 'last-bus', title: 'The Last Bus' }, { packs: unlocked }),
})
