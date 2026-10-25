import { mountGame } from '@ifloom/react'
import { devicesUi } from '@ifloom/plugin-devices/react'
import { feedUi } from '@ifloom/plugin-feed/react'
import { messagesUi } from '@ifloom/plugin-messages/react'
import module from './game.ts'

// A button for each device goes in the side column. An app's messages and feed are drawn by those plugins' UIs, so list them too.
mountGame(module.build(), { plugins: [devicesUi, messagesUi, feedUi] })
