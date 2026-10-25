import { mountGame } from '@ifloom/react'
import { placesUi } from '@ifloom/plugin-places/react'
import module from './game.ts'

// The LocationCard and the Exits go in the story, before the room’s actions.
mountGame(module.build(), { plugins: [placesUi] })
