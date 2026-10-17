import { mountGame } from '@ifloom/react'
import { theLetter } from './game.ts'
import { Layout } from './layout.tsx'
import './styles.css'

// A page to read: no side column, no clock, no map. It opens on a title
// screen, which offers New Game+ once the reader has reached an ending.
mountGame(theLetter(), { layout: Layout, pages: { subtitle: 'A novel in three chapters' } })
