import { mountGame } from '@ifloom/react'
import { debugUi } from '@ifloom/plugin-debug/react'
import module from './game.ts'

// The DebugCard goes at the end of the story. It does nothing in a build without the plugin.
mountGame(module.build(), { plugins: [debugUi] })
