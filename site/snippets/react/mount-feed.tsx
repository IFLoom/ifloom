import { mountGame } from '@ifloom/react'
import { feedUi } from '@ifloom/plugin-feed/react'
import module from './game.ts'

// A FeedSection is drawn wherever a device’s app shows a feed.
mountGame(module.build(), { plugins: [feedUi] })
