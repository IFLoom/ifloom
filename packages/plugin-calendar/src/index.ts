/**
 * A calendar: the periods of a day, the days of a week, a bed to go to and a
 * curfew to keep, and what a turn is in this game — a period, a day or a week.
 *
 * The engine's only clock is the turn. This plugin keeps a day and a period
 * of its own, moves them on whenever a turn ends, and ends turns itself when
 * content passes time with `{ 'calendar/pass': n }`.
 */
import { callOf, holds, inRange, stringOf, type CommandRef, type Condition, type Effect, type EffectRef, type GameState, type Range } from '@ifloom/engine'
import {
  arg,
  defineCalls,
  definePlugin,
  type CommandsOf,
  type ConditionsOf,
  type DefinedPlugin,
  type EffectsOf,
  type PluginContext,
  type PluginProblem,
} from '@ifloom/engine/plugin'
import { CONTENT_VERSION, contentMigrations } from './upgrade.ts'

/** A period of the day, one entry of `CalendarOptions.periods`. A bare string in `periods` is a period with only an id. */
export type PeriodDef = {
  /** The period's id, such as `'morning'`. */
  id: string
  /** The period's name as the player reads it. The id if left out. */
  label?: string
}

/** Settings for `calendar()`. Every field is optional and has the default its comment gives. */
export type CalendarOptions = {
  /** The periods of a day, in order. Morning, afternoon, evening, night and late if left out. */
  periods?: (string | PeriodDef)[]
  /** The number of days in a week. 7 if left out. */
  week?: number
  /** The days of the week that are the weekend, counting from 0. The last two days of the week if left out. */
  weekend?: number[]
  /**
   * The length of a turn, one `'period'`, one `'day'` or one `'week'`. `'day'` if left out.
   *
   * Passing time ends a turn at each boundary it crosses, and a turn ended any other way moves the clock to the start
   * of the next. With `false`, the clock and the turn run independently.
   */
  turn?: 'period' | 'day' | 'week' | false
  /** The day and period a new game starts at. Day 0 and the first period if left out. */
  start?: { day?: number; period?: string }
  /**
   * The settings of the `calendar/sleep` command. `false` leaves the command out.
   *
   * `from` lists the periods the player can sleep from, the last three if left out. `wake` is the period the player
   * wakes in the next day, the first if left out.
   */
  sleep?: { from?: string[]; wake?: string } | false
  /**
   * The curfew's condition. While it holds, the calendar warns against passing time over the end of the day, and the
   * engine refuses that command so the player goes to bed instead.
   *
   * The curfew always binds if left out, and never with `false`.
   */
  curfew?: Condition | false
}

/** The clock a save keeps for the calendar. The plugin reads the periods and the week from its options, so the save keeps only the day and period. */
export type CalendarState = {
  /** The day, counting from 0. */
  day: number
  /** The id of the period the clock is in. */
  period: string
}

/** The calendar as the player sees it, in `view.plugins.calendar`. Its `label` is the line a UI's clock shows. */
export type CalendarView = {
  /** The day, counting from 1 as the player does. */
  day: number
  /** The weekday's name, such as `'Wednesday'`. In a week of other than 7 days, it reads "Day 3 of the week". */
  weekday: string
  /** The weekday's position in the week, counting from 0. */
  weekdayIndex: number
  /** The period's id, such as `'morning'`. */
  period: string
  /** The period's name as the player reads it, such as `'Morning'`. */
  periodLabel: string
  /** The calendar's whole line, such as "Day 3 · Wednesday morning", from the `calendar/label` string. */
  label: string
  /** True in the day's last period, with no scene open, while the curfew binds. A UI can offer bed then. */
  curfew: boolean
}

/**
 * What content writes for each of the plugin's calls (from `CALLS`), its
 * queries' answers and its view, so a call with a misspelled argument fails
 * to compile.
 */
declare module '@ifloom/engine' {
  interface ConditionRegistry extends ConditionsOf<typeof CALLS> {}
  interface EffectRegistry extends EffectsOf<typeof CALLS> {}
  interface CommandRegistry extends CommandsOf<typeof CALLS> {}
  interface ViewRegistry {
    calendar: CalendarView
  }
}

const ID = 'calendar'

/** The plugin's calls, and what each takes. */
const CALLS = defineCalls(ID, {
  conditions: {
    /** In one of these periods: `{ period: ['morning', 'afternoon'] }`. */
    period: { period: arg.strings() },
    /** On one of these days of the week, from 0: `{ day: [0, 1, 2, 3, 4] }`. */
    weekday: { day: arg.numbers() },
    /** At the weekend. */
    weekend: {},
    /** The day, from 0, in a range: `{ gte: 6 }`. */
    day: { ...arg.bounds },
    /** The curfew binds right now. */
    curfew: {},
  },
  effects: {
    /** Time goes by that many periods, or one with no `by`. */
    pass: { by: arg.number().optional(1) },
    /** Put the clock somewhere. Ends no turn. */
    set: { day: arg.number().optional(), period: arg.string().optional() },
  },
  commands: {
    /** Go to bed. */
    sleep: {},
  },
})
const DEFAULT_PERIODS: PeriodDef[] = [{ id: 'morning' }, { id: 'afternoon' }, { id: 'evening' }, { id: 'night' }, { id: 'late' }]
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/** How many periods of time the effects pass, in total. */
function passed(effects: readonly Effect[]): number {
  return effects.reduce((sum, effect) => {
    const call = callOf(effect)
    if (call?.name !== CALLS.effects.pass.call) return sum
    return sum + periodsIn(CALLS.effects.pass.read(call.with).by)
  }, 0)
}

/** How many whole periods `by` passes: none for less than one. */
function periodsIn(by: number): number {
  return Math.max(0, Math.floor(by))
}

/** Build a calendar. List it before other plugins, so theirs see the new day when a turn ends. */
function calendarPlugin(options: CalendarOptions = {}): DefinedPlugin<CalendarState, CalendarView> {
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

  return definePlugin<CalendarState, CalendarView, typeof CALLS>({
    id: ID,
    version: 1,
    calls: CALLS,
    contentVersion: CONTENT_VERSION,
    contentMigrations,
    strings,
    start: () => ({ day: startDay, period: options.start?.period ?? ids[0] }),
    conditions: {
      /** `{ 'calendar/period': { period: ['morning', 'afternoon'] } }`. */
      period: (_state, { period }, { slice }) => period.includes(slice.period),
      /** `{ 'calendar/weekday': { day: [0, 1, 2, 3, 4] } }`: Monday to Friday, in a seven-day week. */
      weekday: (_state, { day }, { slice }) => day.includes(weekdayIndex(slice.day)),
      /** `{ 'calendar/weekend': true }`. */
      weekend: (_state, _args, { slice }) => weekend.includes(weekdayIndex(slice.day)),
      /** `{ 'calendar/day': { gte: 6 } }`: the day, from 0, in a range. */
      day: (state, range, { slice, game }) => inRange(state, game, slice.day, range),
      /** `{ 'calendar/curfew': true }`: the curfew binds right now. */
      curfew: (state, _args, context) => curfewBinds(state, context),
    },
    effects: {
      /** `{ 'calendar/pass': { by: 2 } }`: time goes by that many periods, or one with no `by`. */
      pass: (state, { by }, context) => pass(state, periodsIn(by), context),
      /** `{ 'calendar/set': { day, period } }`: put the clock somewhere. Ends no turn. */
      // A period the calendar does not have leaves the period as it was.
      set: (_state, { day, period }, { slice, set }) =>
        set({
          day: day === undefined ? slice.day : Math.max(0, Math.floor(day)),
          period: period !== undefined && ids.includes(period) ? period : slice.period,
        }),
    },
    commands: {
      sleep: {
        whyNot: (state, _args, { slice, game }) => {
          // A calendar with `sleep: false` has no bed: there is no such thing to do.
          if (!sleep) return stringOf(game, 'noSuchAction')
          if (state.sceneId) return stringOf(game, 'finishFirst')
          return sleep.from.includes(slice.period) ? undefined : stringOf(game, `${ID}/tooEarly`)
        },
        run: (state, _args, context) => (sleep ? pass(state, untilMorning(context.slice), context) : state),
        effectsOf: (_state, _args, { slice }) => (sleep ? [CALLS.effects.pass({ by: untilMorning(slice) })] : []),
      },
    },
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
      if (command.type === 'custom' && command.name === CALLS.commands.sleep.call) return undefined
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
      // A calendar with `sleep: false` has no sleep command, so content that names one is wrong.
      calls: (table, name) =>
        !sleep && table === 'commands' && name === 'sleep' ? [{ problem: 'this calendar has no sleep (sleep: false), so no calendar/sleep' }] : [],
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

/** The command that goes to bed. */
const sleep = (): CommandRef => CALLS.commands.sleep()
/** Time going by: `n` periods. */
const pass = (n = 1): EffectRef => CALLS.effects.pass({ by: n })
/** True in any of these periods. */
const period = (...ids: string[]): Condition => CALLS.conditions.period({ period: ids })
/** True on any of these days of the week, from 0. */
const weekday = (...days: number[]): Condition => CALLS.conditions.weekday({ day: days })
/** True at the weekend. */
const weekend = (): Condition => CALLS.conditions.weekend()
/** The day, from 0, in a range: `calendar.day({ gte: 6 })`. */
const day = (range: Range): Condition => CALLS.conditions.day(range)

/**
 * Returns the calendar plugin, for the game's `plugins`. List it before other plugins, so their hooks see the new day
 * when a turn ends.
 *
 * Its helpers write its calls, such as `calendar.sleep()` and `calendar.day({ gte: 3 })`.
 */
export const calendar = Object.assign(calendarPlugin, {
  /** Returns the `calendar/sleep` command, which passes time to the waking period of the next day. */
  sleep,
  /** Returns the `calendar/pass` effect, which moves the clock on `n` periods (1 if left out). */
  pass,
  /** Returns the `calendar/period` condition, which holds in any of the periods named. */
  period,
  /** Returns the `calendar/weekday` condition, which holds on any of the days of the week named, counting from 0. */
  weekday,
  /** Returns the `calendar/weekend` condition, which holds on a day in `CalendarOptions.weekend`. */
  weekend,
  /** Returns the `calendar/day` condition, which holds while the day, counting from 0, is in the range. */
  day,
})
