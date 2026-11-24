import { mountGame } from '@ifloom/react'
import { shopUi } from '@ifloom/plugin-shop/react'
import module from './game.ts'

// The shop panel is rendered as the vendor's counter, in a dialog titled with its name.
mountGame(module.build(), { plugins: [shopUi] })
