import { READING_LAYOUT, mountGame } from '@ifloom/react'
import { theLetter } from './game.ts'
import './styles.css'

// A page to read: no side column, no clock, no map. It opens on a title
// screen, which offers New Game+ once the reader has reached an ending.
mountGame(theLetter(), { layout: READING_LAYOUT, screens: { subtitle: 'A novel in three chapters' } })
