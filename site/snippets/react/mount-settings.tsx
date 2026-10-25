import { mountGame } from '@ifloom/react'
import module from './game.ts'

// `pages` opens on a title screen whose Settings page draws every setting the game declares, play and ui alike.
mountGame(module.build(), { pages: true })
