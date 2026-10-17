import { mountGame } from '@ifloom/react'
import game from './game.ts'
import { Layout } from './layout.tsx'
import './styles.css'

// `layout` is the page, in `layout.tsx`. `pages` opens on a title screen
// with New game, Continue, Load and Settings. Leave it out to start straight
// in the story.
mountGame(game, { layout: Layout, pages: true })
