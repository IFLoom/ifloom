import { mountGame } from '@ifloom/react'
import { wardrobeUi } from '@ifloom/plugin-wardrobe/react'
import module from './game.ts'

// The wardrobe panel draws the WardrobeCard: a place with wardrobe.closet() gets a button that opens it.
mountGame(module.build(), { plugins: [wardrobeUi] })
