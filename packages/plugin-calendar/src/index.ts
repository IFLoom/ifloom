/**
 * A calendar: the periods of a day, the days of a week, a bed to go to and a
 * curfew to keep, and what a turn is in this game — a period, a day or a week.
 *
 * The engine's only clock is the turn. This plugin keeps a day and a period
 * of its own, moves them on whenever a turn ends, and ends turns itself when
 * content passes time with `{ 'calendar/pass': n }`.
 */
import {
  callOf,
  definePlugin,
  holds,
  inRange,
  stringOf,
  type CommandRef,
  type Condition,
  type DefinedPlugin,
  type Effect,
  type EffectRef,
  type GameState,
  type PluginContext,
  type PluginProblem,
  type Range,
} from '@ifloom/engine'
import { CONTENT_VERSION, contentMigrations } from './upgrade.ts'

/** A period of the day: its id, and what the player reads (the id, if left out). */
export type PeriodDef = { id: string; label?: string }

export type CalendarOptions = {
  /** The periods of a day, in order. Morning, afternoon, evening, night and late if left out. */
  periods?: (string | PeriodDef)[]
  /** Days in a week. 7 if left out. */
  week?: number
  /** Which days of the week are the weekend, counting from 0. The last two if left out. */
  weekend?: number[]
  /**
   * What a turn is: one `'period'`, one `'day'` (the default) or one `'week'`.
   * Passing time ends a turn at each boundary it crosses, and a turn ended any
   * other way moves the clock to the start of the next. `false`: the clock and
   * the turn go their own ways.
   */
  turn?: 'period' | 'day' | 'week' | false
  /** Where a new game starts: day 0 and the first period if left out. */
  start?: { day?: number; period?: string }
  /**
   * The `sleep` command: the periods it can be used from (the last three if
   * left out) and the one it wakes in, the next day (the first if left out).
   * `false`: no sleep command.
   */
  sleep?: { from?: string[]; wake?: string } | false
  /**
   * While this holds, passing time over the end of the day is warned against
   * and refused — the player is to go to bed instead. Always, if left out;
   * `false`, never.
   */
  curfew?: Condition | false
}

/** The calendar's state: the day (from 0) and the period. */
export type CalendarState = { day: number; period: string }

/** What the UI reads at `view.plugins.calendar`. */
export type CalendarView = {
  /** From 1, as the player counts. */
  day: number
  weekday: string
  /** From 0. */
  weekdayIndex: number
  period: string
  periodLabel: string
  /** The whole of it, as the header shows it: "Day 3 · Wednesday morning". */
  label: string
  /** The last period, with no scene open, while the curfew binds: time for bed. */
  curfew: boolean
}

/**
 * What content writes for each of the plugin's calls, its queries' answers
 * and its view, so a call with a misspelled argument fails to compile.
 */
declare module '@ifloom/engine' {
  interface ConditionRegistry {
    'calendar/period': { period: string | readonly string[] }
    'calendar/weekday': { day: number | readonly number[] }
    'calendar/weekend': true
    'calendar/day': Range | true
    'calendar/curfew': true
  }
  interface EffectRegistry {
    'calendar/pass': { by?: number } | true
    'calendar/set': { day?: number; period?: string }
  }
  interface CommandRegistry {
    'calendar/sleep': true
  }
  interface QueryRegistry {
    'calendar/now': () => CalendarState
    'calendar/periods': () => string[]
    'calendar/bedtime': () => boolean
  }
  interface ViewRegistry {
    calendar: CalendarView
  }
}

const ID = 'calendar'
const DEFAULT_PERIODS: PeriodDef[] = [{ id: 'morning' }, { id: 'afternoon' }, { id: 'evening' }, { id: 'night' }, { id: 'late' }]
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/** How many periods of time the effects pass, in total. */
function passed(effects: readonly Effect[]): number {
  return effects.reduce((sum, effect) => {
    const call = callOf(effect)
    if (call?.name !== `${ID}/pass`) return sum
    return sum + periodsIn(call.with)
  }, 0)
}

/** `{ by: n }`, or one period with none. */
function periodsIn(args: Record<string, unknown>): number {
  const n = Number(args.by ?? 1)
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0
}

/** Build a calendar. List it before other plugins, so theirs see the new day when a turn ends. */
export function calendar(options: CalendarOptions = {}): DefinedPlugin<CalendarState, CalendarView> {
  const periods = (options.periods ?? DEFAULT_PERIODS).map((entry) => (typeof entry === 'string' ? { id: entry } : entry))
  const ids = periods.map((entry) => entry.id)
  const P = ids.length
  const week = options.week ?? 7
  const weekend = options.weekend ?? [week - 2, week - 1].filter((day) => day >= 0)
  const turn = options.turn ?? 'day'
  const startDay = options.start?.day ?? 0
  const sleep = options.sleep === false ? null : { from: options.sleep?.from ?? ids.slice(-3), wake: options.sleep?.wake ?? ids[0] }
  const curfew = options.curfew

  const index = (period: string) => Math.max(0, ids.indexOf(period))
  /** The clock as one count of periods since day 0 began. */
  const absolute = (clock: CalendarState) => clock.day * P + index(clock.period)
  const fromAbsolute = (n: number): CalendarState => ({ day: Math.floor(n / P), period: ids[((n % P) + P) % P] })
  /** Which turn-unit a moment falls in: its period, its day, or its week counted from the start. */
  const unit = (n: number) => (turn === 'period' ? n : turn === 'day' ? Math.floor(n / P) : Math.floor((Math.floor(n / P) - startDay) / week))
  const weekdayIndex = (day: number) => ((day % week) + week) % week
  const curfewBinds = (state: GameState, context: PluginContext<CalendarState>) =>
    curfew === false ? false : curfew === undefined ? true : holds(state, context.game, curfew)

  /** Move the clock on by n periods, ending a turn at every boundary crossed. */
  function pass(state: GameState, n: number, context: PluginContext<CalendarState>): GameState {
    const from = absolute(context.slice)
    const target = from + n
    const turns = turn === false ? 0 : unit(target) - unit(from)
    const after = turns > 0 ? context.apply([{ turn: { by: turns } }], state) : state
    // The turns moved the clock to the start of each new unit; it lands exactly where it was sent.
    return context.set(fromAbsolute(target), after)
  }

  /** Periods from now to the next day's waking period. */
  const untilMorning = (clock: CalendarState) => (sleep ? P - index(clock.period) + index(sleep.wake) : 0)

  const strings: Record<string, string> = {
    tooEarly: 'Too early.',
    pastDawn: 'That would run past dawn.',
    until: 'until {period}',
    tomorrow: 'until tomorrow {period}',
    later: 'until {weekday} {period}',
    label: 'Day {day} · {weekday} {period}',
  }
  for (const period of periods) strings[`period.${period.id}`] = period.label ?? period.id
  for (let n = 0; n < week; n += 1) strings[`weekday.${n}`] = week === 7 ? WEEKDAYS[n] : `Day ${n + 1} of the week`

  const words = (context: PluginContext<CalendarState>, clock: CalendarState) => ({
    day: clock.day + 1,
    weekday: stringOf(context.game, `${ID}/weekday.${weekdayIndex(clock.day)}`),
    period: stringOf(context.game, `${ID}/period.${clock.period}`),
  })

  return definePlugin<CalendarState, CalendarView>({
    id: ID,
    version: 1,
    contentVersion: CONTENT_VERSION,
    contentMigrations,
    strings,
    start: () => ({ day: startDay, period: options.start?.period ?? ids[0] }),
    conditions: {
      /** `{ 'calendar/period': { period: ['morning', 'afternoon'] } }`. */
      period: (_state, args, { slice }) => list(args.period).includes(slice.period),
      /** `{ 'calendar/weekday': { day: [0, 1, 2, 3, 4] } }`: Monday to Friday, in a seven-day week. */
      weekday: (_state, args, { slice }) => list(args.day).map(Number).includes(weekdayIndex(slice.day)),
      /** `{ 'calendar/weekend': true }`. */
      weekend: (_state, _args, { slice }) => weekend.includes(weekdayIndex(slice.day)),
      /** `{ 'calendar/day': { gte: 6 } }`: the day, from 0, in a range. */
      day: (state, args, { slice, game }) => inRange(state, game, slice.day, args as Range),
      /** `{ 'calendar/curfew': true }`: the curfew binds right now. */
      curfew: (state, _args, context) => curfewBinds(state, context),
    },
    effects: {
      /** `{ 'calendar/pass': { by: 2 } }`: time goes by that many periods, or one with no `by`. */
      pass: (state, args, context) => pass(state, periodsIn(args), context),
      /** `{ 'calendar/set': { day, period } }`: put the clock somewhere. Ends no turn. */
      // A period the calendar does not have leaves the period as it was.
      set: (_state, args, { slice, set }) =>
        set({
          day: args.day === undefined ? slice.day : Math.max(0, Math.floor(Number(args.day))),
          period: args.period !== undefined && ids.includes(String(args.period)) ? String(args.period) : slice.period,
        }),
    },
    // A calendar with `sleep: false` has no sleep command at all.
    commands: sleep
      ? {
          sleep: {
            whyNot: (state, _args, { slice, game }) => {
              if (state.sceneId) return stringOf(game, 'finishFirst')
              return sleep.from.includes(slice.period) ? undefined : stringOf(game, `${ID}/tooEarly`)
            },
            run: (state, _args, context) => pass(state, untilMorning(context.slice), context),
            effectsOf: (_state, _args, { slice }) => [{ [`${ID}/pass`]: { by: untilMorning(slice) } }],
          },
        }
      : {},
    queries: {
      now: (_state, _args, { slice }) => ({ ...slice }),
      periods: () => [...ids],
      /** Is it a time the player could go to bed? */
      bedtime: (_state, _args, { slice }) => Boolean(sleep?.from.includes(slice.period)),
    },
    values: {
      day: (_state, _args, { slice }) => slice.day + 1,
      weekday: (_state, _args, context) => words(context, context.slice).weekday,
      period: (_state, _args, context) => words(context, context.slice).period,
    },
    // A turn ended by anything else moves the clock to the start of the next one.
    onTurn: (state, { slice, set }) => {
      if (turn === false) return state
      const now = absolute(slice)
      if (turn === 'period') return set(fromAbsolute(now + 1))
      if (turn === 'day') return set({ day: slice.day + 1, period: ids[0] })
      const weekIndex = Math.floor((slice.day - startDay) / week)
      return set({ day: startDay + (weekIndex + 1) * week, period: ids[0] })
    },
    guard: (state, { command, effects }, context) => {
      // Sleep is the way past dawn, not something to be warned off.
      if (command.type === 'custom' && command.name === `${ID}/sleep`) return undefined
      const n = passed(effects)
      if (n <= 0 || index(context.slice.period) + n < P) return undefined
      return curfewBinds(state, context) ? { reason: stringOf(context.game, `${ID}/pastDawn`), soft: true } : undefined
    },
    price: (_state, effects, context) => {
      const n = passed(effects)
      if (n <= 0) return undefined
      const after = fromAbsolute(absolute(context.slice) + n)
      const { weekday, period } = words(context, after)
      const days = after.day - context.slice.day
      return [stringOf(context.game, days === 0 ? `${ID}/until` : days === 1 ? `${ID}/tomorrow` : `${ID}/later`, { weekday, period })]
    },
    label: (_state, context) => stringOf(context.game, `${ID}/label`, words(context, context.slice)),
    view: (state, context): CalendarView => {
      const { slice } = context
      const shown = words(context, slice)
      return {
        day: shown.day,
        weekday: shown.weekday,
        weekdayIndex: weekdayIndex(slice.day),
        period: slice.period,
        periodLabel: shown.period,
        label: stringOf(context.game, `${ID}/label`, shown),
        curfew: curfewBinds(state, context) && !state.sceneId && index(slice.period) === P - 1,
      }
    },
    references: {
      content: () => (curfew ? [{ list: 'options', id: 'curfew', refs: [{ when: curfew }] }] : []),
    },
    check: () => {
      const problems: PluginProblem[] = []
      const say = (id: string, what: string) => problems.push({ list: 'options', id, what })
      if (!P) say('periods', 'a calendar needs at least one period')
      if (new Set(ids).size !== P) say('periods', 'two periods share an id')
      const known = (id: string | undefined, where: string) => {
        if (id !== undefined && !ids.includes(id)) say(where, `no period called "${id}"`)
      }
      known(options.start?.period, 'start')
      if (sleep) {
        known(sleep.wake, 'sleep')
        for (const id of sleep.from) known(id, 'sleep')
      }
      for (const day of weekend) if (day < 0 || day >= week) say('weekend', `no day ${day} in a week of ${week}`)
      return problems
    },
  })
}

/** One or several, as a list: `period: 'morning'` or `period: ['morning', 'noon']`. */
function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value === undefined ? [] : [value]
}

/** The command that goes to bed. */
export const sleep = (): CommandRef => ({ [`${ID}/sleep`]: true })
/** Time going by: `n` periods. */
export const pass = (n = 1): EffectRef => ({ [`${ID}/pass`]: { by: n } })
/** True in any of these periods. */
export const period = (...ids: string[]): Condition => ({ [`${ID}/period`]: { period: ids } })
/** True on any of these days of the week, from 0. */
export const weekday = (...days: number[]): Condition => ({ [`${ID}/weekday`]: { day: days } })
/** True at the weekend. */
export const weekend = (): Condition => ({ [`${ID}/weekend`]: true })
/** The day, from 0, in a range: `day({ gte: 6 })`. */
export const day = (range: Range): Condition => ({ [`${ID}/day`]: range })
