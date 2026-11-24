import { mountGame } from '@ifloom/react'
import { unlocksUi } from '@ifloom/plugin-unlocks/react'
import module from './game.ts'

// A Cheats button in the side column opens the CheatPanel. With unlocks, a code box goes on the settings page too.
mountGame(module.build(), { plugins: [unlocksUi] })
