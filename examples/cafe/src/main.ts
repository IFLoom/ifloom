import { mountGame } from '@ifloom/react'
import { cornerCafe } from './game.ts'
import './styles.css'

// The books on the stage, where the eye goes: the staff and the menu over the week's buttons.
mountGame(cornerCafe(), { layout: { sidebar: ['title', 'stats', 'menu'], stage: ['scene', 'entities', 'actions', 'inputs'] } })
