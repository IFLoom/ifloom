import { mountGame } from '@ifloom/react'
import { unlocksUi } from '@ifloom/plugin-unlocks/react'
import module from './game.ts'

// The UnlocksPanel is on the settings page with pages on, or behind an Enter a code button in the menu without them.
mountGame(module.build(), { plugins: [unlocksUi] })
