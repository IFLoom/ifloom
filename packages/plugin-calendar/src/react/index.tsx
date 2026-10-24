/**
 * @ifloom/plugin-calendar/react: the calendar plugin's React UI, for a game
 * drawn with `@ifloom/react`. List `calendarUi` in the game's `plugins` to
 * have the clock say the day and the period with their parts marked, or draw
 * it yourself from `useCalendar`.
 */
import type { ComponentProps } from 'react'
import { overridable, useGame, usePart, type Override, type PluginUi } from '@ifloom/react'
import type { CalendarView } from '../index.ts'

declare module '@ifloom/react' {
  interface OverridableComponents {
    CalendarClock: Override<ComponentProps<typeof CalendarClock>>
  }
}

/** The calendar plugin's view, piece by piece: the day, the weekday, the period and the curfew, or null in a game without the plugin. `CalendarClock` is drawn from it. */
export function useCalendar(): CalendarView | null {
  const { view } = useGame()
  return (view.plugins.calendar as CalendarView | undefined) ?? null
}

function CalendarClockImpl({ className }: { className?: string }) {
  const { view } = useGame()
  const calendar = useCalendar()
  const attrs = usePart('clock', 'text-sm text-muted-foreground', className)
  // The whole line the plugins wrote, as the core `Clock` has it, so another plugin's label still shows.
  const when = view.when || calendar?.label
  if (!when) return null
  return (
    <p {...attrs} data-day={calendar?.day} data-weekday={calendar?.weekday} data-period={calendar?.period} data-curfew={calendar?.curfew ? '' : undefined}>
      {when}
    </p>
  )
}

/**
 * Where the game is in time, as the core `Clock` draws it ("Day 3 ·
 * Wednesday morning"), with the calendar's pieces on it for styling:
 * `data-day`, `data-weekday`, `data-period`, and `data-curfew` while the
 * curfew binds. The calendar UI draws it in the `Clock`'s place. A thin
 * default on `useCalendar`.
 */
export const CalendarClock = overridable('CalendarClock', CalendarClockImpl)

/**
 * The calendar plugin's React UI, for `plugins` on `mountGame` or
 * `GameProvider`: `CalendarClock` wherever the core `Clock` is, in the side
 * column and the top bar on a phone.
 */
export const calendarUi: PluginUi = {
  id: 'calendar',
  components: { Clock: ({ Default: _default, ...props }) => <CalendarClock {...props} /> },
}
