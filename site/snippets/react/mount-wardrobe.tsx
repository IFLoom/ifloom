import { mountGame } from '@ifloom/react'
import { wardrobeUi } from '@ifloom/plugin-wardrobe/react'
import module from './game.ts'

// A Wearing section in the side column holds the WardrobeCard.
mountGame(module.build(), { plugins: [wardrobeUi] })
