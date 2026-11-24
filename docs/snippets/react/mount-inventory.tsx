import { mountGame } from '@ifloom/react'
import { inventoryUi } from '@ifloom/plugin-inventory/react'
import module from './game.ts'

// InventoryCard is rendered wherever the React UI’s own Inventory is, with a button that uses each usable thing.
mountGame(module.build(), { plugins: [inventoryUi] })
