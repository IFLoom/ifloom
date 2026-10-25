import { mountGame } from '@ifloom/react'
import { questsUi } from '@ifloom/plugin-quests/react'
import module from './game.ts'

// A Quests section in the side column opens the quest log, with the count of news on its button.
mountGame(module.build(), { plugins: [questsUi] })
