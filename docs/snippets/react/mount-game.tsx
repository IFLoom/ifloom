import { mountGame } from '@ifloom/react'
import module from './game.ts'

// mountGame makes the runner with browserRunner, plays the sound, runs the clock and maps the keys.
// Its default layout renders every part the Render it yourself pages cover.
mountGame(module.build())
