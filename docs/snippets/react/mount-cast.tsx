import { mountGame } from '@ifloom/react'
import { castUi } from '@ifloom/plugin-cast/react'
import module from './game.ts'

// A People section in the side column opens everyone met, and who’s here goes after the room’s actions.
mountGame(module.build(), { plugins: [castUi] })
