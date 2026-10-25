import { localStorageDriver } from '@ifloom/browser'
import { profile } from '@ifloom/engine'
import { mountGame } from '@ifloom/react'
import { unlockedPacks } from '@ifloom/plugin-unlocks'
import { unlocksUiWith } from '@ifloom/plugin-unlocks/react'
import module from './game.ts'

// What the player's codes opened, from the profile, before the game is built with it.
const opened = await unlockedPacks('small-town', profile({ id: 'small-town' }, localStorageDriver()))

// A code box on the settings page; a new code builds the game again with what it opened.
const unlocks = unlocksUiWith({ problems: opened.problems, onChange: () => location.reload() })
mountGame(module.build({ unlocked: opened.packs }), { pages: true, plugins: [unlocks] })
