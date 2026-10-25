import { mountGame } from '@ifloom/react'
import { messagesUi } from '@ifloom/plugin-messages/react'
import module from './game.ts'

// A MessagesSection is drawn wherever a device’s app shows a messages channel.
mountGame(module.build(), { plugins: [messagesUi] })
