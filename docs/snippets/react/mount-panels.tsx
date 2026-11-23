import { Inventory, mountGame, type PanelComponent } from '@ifloom/react'
import module from './game.ts'

// PanelHost, in the default layout, draws view.panel by its name. A panel of your own goes in `panels`, over a built-in one:
// content opens this one with { panel: 'pockets' }, and it's given what the panel was opened with as `data`.
const Pockets: PanelComponent = () => <Inventory title="Your pockets" />

mountGame(module.build(), { panels: { pockets: Pockets } })
