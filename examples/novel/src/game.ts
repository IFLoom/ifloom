/**
 * The Letter: a linear novel in three chapters, as small as IFLoom gets.
 *
 * No plugins, no places, no characters, no clock. What it uses is what a
 * novel with light tracking needs: a name the player types, one stat, choices
 * the engine remembers on its own (`{ chose }`), a kv key counted up
 * (`{ kv, by }`), a chapter as a turn, a migration step for
 * saves from the game's first version, no saving until the reader has typed
 * a name, and endings that start the story over with `newGame`.
 *
 * This file only puts the game together. The stat is in `world/stats.ts`,
 * and each chapter is a file of its own in `story/`, its words written in
 * its scenes.
 */
import { loadGame, startingState, type Content, type Loaded } from '@ifloom/engine'
import { defineGame } from '@ifloom/cli/game'
import { stats } from './world/stats.ts'
import { ch1 } from './story/ch1.ts'
import { ch2 } from './story/ch2.ts'
import { ch3 } from './story/ch3.ts'

/** The game's content: what every chapter shares, then the chapters. */
export const content: Content[] = [stats, ch1, ch2, ch3]

/** The game: its content, with a base that says what it is, and rules that name its saves and carry old ones forward. */
export function theLetter(): Loaded {
  return loadGame(content, {
    id: 'the-letter',
    title: 'The Letter',
    // Version 2 counts `fibs` where version 1 counted `lies`. A version-1 save is carried
    // forward by the step below when it loads, so a reader mid-story keeps their count.
    version: 2,
    rules: {
      migrations: {
        1: (state) => {
          const { lies, ...kv } = state.kv
          return lies === undefined ? state : { ...state, kv: { ...kv, fibs: lies } }
        },
      },
      saveName: (state) => (typeof state.kv.playerName === 'string' ? state.kv.playerName : null),
    },
  })
}

/** What the command line reads: the game, and where `ifloom playtest` and `ifloom snapshot` start, a reader who has already typed a name. */
export default defineGame({
  build: theLetter,
  start: (game) => startingState(game, { kv: { playerName: 'Sam' } }),
})
