import { READING_LAYOUT, mountGame } from '@ifloom/react'
import game from './game.ts'
import './styles.css'

// `pages` opens on a title screen with New game, Continue, Load and
// Settings. Leave it out to start straight in the story.
mountGame(game, { layout: READING_LAYOUT, pages: true })
