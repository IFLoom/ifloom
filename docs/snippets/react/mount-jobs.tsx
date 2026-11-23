import { mountGame } from '@ifloom/react'
import { jobsUi } from '@ifloom/plugin-jobs/react'
import module from './game.ts'

// The jobs panel is drawn as the JobBoard, with only the jobs it was opened with if it names any.
mountGame(module.build(), { plugins: [jobsUi] })
