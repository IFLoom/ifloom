import { mountGame } from '@ifloom/react'
import { achievementsUi } from '@ifloom/plugin-achievements/react'
import module from './game.ts'

// An Achievements button goes in the side column, and the title screen offers an achievements page when pages are on.
mountGame(module.build(), { plugins: [achievementsUi] })
