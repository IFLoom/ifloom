import { lockedContent } from '@ifloom/plugin-unlocks'
import { build } from './game.ts'

const { game } = build()
console.log(`${game.title}: ${Object.keys(lockedContent()).join(', ')}`)
