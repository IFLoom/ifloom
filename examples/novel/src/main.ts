import { READING_LAYOUT, mountGame } from '@ifloom/react'
import { theLetter } from './game.ts'
import './styles.css'

// A page to read: no side column, no clock, no map.
mountGame(theLetter(), { layout: READING_LAYOUT })
