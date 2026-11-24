// src/main.ts
import { mountGame } from '@ifloom/react'
import { calendarUi } from '@ifloom/plugin-calendar/react'
import { placesUi } from '@ifloom/plugin-places/react'
import { castUi } from '@ifloom/plugin-cast/react'
import module from './game.ts'
import { Layout } from './layout.tsx'
import './styles.css'

mountGame(module.build(), { layout: Layout, pages: true, plugins: [calendarUi, placesUi, castUi] })
