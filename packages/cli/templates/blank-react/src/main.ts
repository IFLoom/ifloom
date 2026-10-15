import { READING_LAYOUT, mountGame } from '@ifloom/react'
import game from './game.ts'
import './styles.css'

mountGame(game, { layout: READING_LAYOUT })
