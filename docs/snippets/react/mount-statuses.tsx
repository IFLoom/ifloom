import { mountGame } from '@ifloom/react'
import { statusesUi } from '@ifloom/plugin-statuses/react'
import module from './game.ts'

// The StatusList goes under the stats in the side column.
mountGame(module.build(), { plugins: [statusesUi] })
