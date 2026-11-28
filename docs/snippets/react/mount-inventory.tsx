import { mountGame } from '@ifloom/react'
import { inventoryUi } from '@ifloom/plugin-inventory/react'
import module from './game.ts'

// InventoryCard is rendered in the sidebar and the inventory panel, with a button that uses each usable thing.
mountGame(module.build(), { plugins: [inventoryUi] })
