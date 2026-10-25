import { mountGame } from '@ifloom/react'
import { cheatsUi } from '@ifloom/plugin-cheats/react'
import module from './game.ts'

// A Cheats button in the side column opens the CheatPanel.
mountGame(module.build(), { plugins: [cheatsUi] })
