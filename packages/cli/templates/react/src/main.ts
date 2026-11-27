import { mountGame } from '@ifloom/react'
import module from './game.ts'
import { Layout } from './layout.tsx'
import './styles.css'

// `layout` is the page, in `layout.tsx`. `pages` opens on the "Powered by
// IFLoom" splash card, then a title screen with New game, Continue, Load and
// Settings. Leave it out to start straight in the story. To add your own
// splash cards, or turn them off, pass `pages: { splash: { cards: [...] } }`
// or `pages: { splash: false }`. `plugins` lists the UIs of the plugins in game.ts, such as
// `shopUi` from `@ifloom/plugin-shop/react`; leave one out to draw that
// plugin yourself.
mountGame(module.build(), { layout: Layout, pages: true, plugins: [] })
