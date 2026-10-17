import { mountGame } from '@ifloom/react'
import { cornerCafe } from './game.ts'
import { Layout } from './layout.tsx'
import './styles.css'

// The café's own layout puts the books on the story: see layout.tsx.
mountGame(cornerCafe(), { layout: Layout })
