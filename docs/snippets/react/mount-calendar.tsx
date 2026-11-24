import { mountGame } from '@ifloom/react'
import { calendarUi } from '@ifloom/plugin-calendar/react'
import module from './game.ts'

// CalendarClock is rendered wherever the React UI’s own Clock is.
mountGame(module.build(), { plugins: [calendarUi] })
