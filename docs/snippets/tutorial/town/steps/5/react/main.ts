// src/main.ts
import { mountGame } from '@ifloom/react'
import { placesUi } from '@ifloom/plugin-places/react'
import module from './game.ts'
import { Layout } from './layout.tsx'
import './styles.css'

mountGame(module.build(), { layout: Layout, pages: true, plugins: [placesUi] })
