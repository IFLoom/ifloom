import { useCalendar } from '@ifloom/plugin-calendar/react'

export function Weekday() {
  const calendar = useCalendar()
  return calendar ? <span>{calendar.weekday}</span> : null
}
