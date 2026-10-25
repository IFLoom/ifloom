import type { View } from '@ifloom/engine'
// add, as in the vanilla template's src/main.ts.
import { add } from './runner.ts'

/** Where the game is in time, with the calendar's pieces on it for a stylesheet, and a nudge at curfew. */
export function drawCalendar(parent: HTMLElement, view: View): void {
  const calendar = view.plugins.calendar
  if (!calendar) return
  const clock = add(parent, 'p', calendar.label, 'clock')
  Object.assign(clock.dataset, { day: String(calendar.day), weekday: calendar.weekday, period: calendar.period })
  // The last period of the day, with the curfew binding: time for bed.
  if (calendar.curfew) add(parent, 'p', 'It’s late. Time for bed.', 'curfew')
}
