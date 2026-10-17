import { describe, expect, it } from 'vitest'
import { SCHEMA, apply, applyEffects as applyBuilt, buildEffects, holds, loadGame, startingState, view, whyNot, type Game, type GameRules, type GameState } from '@ifloom/engine'
import { calendar, day, pass, period, sleep, weekday, weekend, type CalendarOptions, type CalendarView } from '../src/index.ts'

/** A house with no map: a nap, an afternoon out, a long walk, and bed. */
function house(options: CalendarOptions = {}, rules: GameRules = {}): { game: Game; clock: ReturnType<typeof calendar> } {
  const clock = calendar(options)
  const { game, problems } = loadGame(
    [
      {
        id: 'house',
        schema: SCHEMA,
        activities: [
          { id: 'nap', effects: [pass(1)] },
          { id: 'outing', effects: [pass(2), { kind: 'kv', key: 'out', to: true }] },
          { id: 'walk', effects: [pass(3)] },
          { id: 'rest', effects: [{ kind: 'turn' }] },
        ],
        prose: { diary: 'Day {{v:calendar/day}}, a {{v:calendar/weekday}} {{v:calendar/period}}.' },
      },
    ],
    {
      id: 'house',
      title: 'The House',
      plugins: [clock],
      rules,
      actions: [
        { id: 'nap', label: 'Nap', command: { type: 'activity', id: 'nap' } },
        { id: 'outing', label: 'Go out', command: { type: 'activity', id: 'outing' } },
        { id: 'walk', label: 'Long walk', command: { type: 'activity', id: 'walk' } },
        // A calendar with no sleep has no bed to offer.
        ...(options.sleep === false ? [] : [{ id: 'bed', label: 'Bed', command: sleep() }]),
      ],
    },
  )
  expect(problems).toEqual([])
  return { game, clock }
}

/** Apply effects as content writes them, short forms and all. */
const applyEffects = (state: GameState, game: Game, refs: Parameters<typeof buildEffects>[2]) => applyBuilt(state, game, buildEffects(state, game, refs))
const act = (id: string) => ({ type: 'activity' as const, id })
function run(game: Game, state: GameState, ...commands: Parameters<typeof apply>[2][]): GameState {
  for (const command of commands) {
    const out = apply(state, game, command)
    expect(out.reason).toBeUndefined()
    state = out.state
  }
  return state
}
const button = (game: Game, state: GameState, id: string) => view(state, game).actions.find((entry) => entry.id === id)!

describe('the calendar', () => {
  it('starts on day 0 in the first period, and says so in the view and the header', () => {
    const { game, clock } = house()
    const state = startingState(game)
    expect(clock.read(state, game)).toEqual({ day: 0, period: 'morning' })
    const shown = view(state, game)
    expect(shown.when).toBe('Day 1 · Monday morning')
    expect(shown.plugins.calendar).toEqual({
      day: 1,
      weekday: 'Monday',
      weekdayIndex: 0,
      period: 'morning',
      periodLabel: 'morning',
      label: 'Day 1 · Monday morning',
      curfew: false,
    } satisfies CalendarView)
    expect(game.prose!.line('diary', state)).toBe('Day 1, a Monday morning.')
  })

  it('passes time, ending a turn at each new day when a turn is a day', () => {
    const { game, clock } = house()
    let state = run(game, startingState(game), act('outing'))
    expect(clock.read(state, game)).toEqual({ day: 0, period: 'evening' })
    expect(state.turn).toBe(0)
    state = clock.write(state, { day: 0, period: 'night' })
    state = applyEffects(state, game, [pass(4)])
    expect(clock.read(state, game)).toEqual({ day: 1, period: 'evening' })
    expect(state.turn).toBe(1)
    state = applyEffects(state, game, [pass(11)])
    expect(clock.read(state, game)).toEqual({ day: 3, period: 'night' })
    expect(state.turn).toBe(3)
  })

  it('ends a turn every period, or every week, when that is what a turn is', () => {
    const periodic = house({ turn: 'period' })
    const one = applyEffects(startingState(periodic.game), periodic.game, [pass(3)])
    expect(one.turn).toBe(3)
    const weekly = house({ turn: 'week' })
    let state = applyEffects(startingState(weekly.game), weekly.game, [pass(5 * 6)])
    expect(weekly.clock.read(state, weekly.game)).toEqual({ day: 6, period: 'morning' })
    expect(state.turn).toBe(0)
    state = applyEffects(state, weekly.game, [pass(5)])
    expect(state.turn).toBe(1)
    const still = house({ turn: false })
    expect(applyEffects(startingState(still.game), still.game, [pass(20)]).turn).toBe(0)
  })

  it('moves the clock on when content ends a turn itself: a week of turns, a week on', () => {
    const { game, clock } = house({ turn: 'week' })
    let state = run(game, startingState(game), act('nap'), act('rest'))
    expect(state.turn).toBe(1)
    expect(clock.read(state, game)).toEqual({ day: 7, period: 'morning' })
    state = run(game, state, act('rest'))
    expect(clock.read(state, game)).toEqual({ day: 14, period: 'morning' })
    const daily = house()
    expect(daily.clock.read(run(daily.game, startingState(daily.game), act('nap'), act('rest')), daily.game)).toEqual({ day: 1, period: 'morning' })
  })

  it('shows the game’s onTurn the clock as the turn ended, as `before`', () => {
    const seen: string[] = []
    const { game, clock } = house({}, {
      onTurn: (state, { before }) => {
        seen.push(`${state.turn}: ${JSON.stringify(clock.read(before, game))}`)
        return state
      },
    })
    run(game, clock.write(startingState(game), { day: 0, period: 'night' }), sleep())
    expect(seen).toEqual(['1: {"day":0,"period":"night"}'])
  })

  it('goes to bed only late enough, and wakes the next morning a turn on', () => {
    const { game, clock } = house()
    expect(whyNot(startingState(game), game, sleep())).toBe('Too early.')
    const state = run(game, clock.write(startingState(game), { day: 2, period: 'evening' }), sleep())
    expect(clock.read(state, game)).toEqual({ day: 3, period: 'morning' })
    expect(state.turn).toBe(1)
    const late = house({ sleep: { from: ['late'], wake: 'afternoon' } })
    expect(whyNot(late.clock.write(startingState(late.game), { day: 0, period: 'night' }), late.game, sleep())).toBe('Too early.')
    const woke = run(late.game, late.clock.write(startingState(late.game), { day: 0, period: 'late' }), sleep())
    expect(late.clock.read(woke, late.game)).toEqual({ day: 1, period: 'afternoon' })
  })

  it('warns against running past dawn, refuses it, and never warns against bed', () => {
    const { game, clock } = house()
    const night = clock.write(startingState(game), { day: 0, period: 'night' })
    expect(button(game, night, 'nap').warning).toBeUndefined()
    expect(button(game, night, 'walk').warning).toBe('That would run past dawn.')
    expect(apply(night, game, act('walk')).reason).toBe('That would run past dawn.')
    expect(button(game, night, 'bed').warning).toBeUndefined()
    const late = clock.write(startingState(game), { day: 0, period: 'late' })
    expect((view(late, game).plugins.calendar as CalendarView).curfew).toBe(true)
    const free = house({ curfew: { kv: 'nightOwl', is: false } })
    const owl = { ...free.clock.write(startingState(free.game), { day: 0, period: 'night' }), kv: { nightOwl: true } }
    expect(apply(owl, free.game, act('walk')).ok).toBe(true)
  })

  it('prices a button by where the clock will be', () => {
    const { game, clock } = house()
    expect(button(game, startingState(game), 'outing').price).toEqual({ notes: ['until evening'] })
    expect(button(game, clock.write(startingState(game), { day: 0, period: 'night' }), 'nap').price).toEqual({ notes: ['until late'] })
    expect(button(game, clock.write(startingState(game), { day: 0, period: 'evening' }), 'bed').price).toEqual({ notes: ['until tomorrow morning'] })
    // Further than tomorrow, the day by name.
    const far = { ...game, actions: [{ id: 'trek', label: 'Trek', command: { type: 'activity' as const, id: 'trek' } }], activities: [...(game.activities ?? []), { id: 'trek', effects: [pass(11)] }] }
    expect(button(far, clock.write(startingState(far), { day: 0, period: 'morning' }), 'trek').price).toEqual({ notes: ['until Wednesday afternoon'] })
  })

  it('answers conditions on the period, the weekday, the weekend and the day', () => {
    const { game, clock } = house()
    const saturday = clock.write(startingState(game), { day: 5, period: 'evening' })
    expect(holds(saturday, period('evening', 'night'), game)).toBe(true)
    expect(holds(saturday, period('morning'), game)).toBe(false)
    expect(holds(saturday, weekday(5), game)).toBe(true)
    expect(holds(saturday, weekend(), game)).toBe(true)
    expect(holds(clock.write(saturday, { day: 2, period: 'evening' }), weekend(), game)).toBe(false)
    expect(holds(saturday, day({ gte: 5 }), game)).toBe(true)
    expect(holds(saturday, day({ lt: 5 }), game)).toBe(false)
  })

  it('has no bed when it has no sleep, and sets only a period it has', () => {
    const { game, clock } = house({ sleep: false, curfew: false })
    expect(whyNot(startingState(game), game, sleep())).toBe('There is no such thing to do.')
    const set = applyEffects(startingState(game), game, [{ 'calendar/set': { day: 3, period: 'teatime' } }])
    expect(clock.read(set, game)).toEqual({ day: 3, period: 'morning' })
    const short = house({ week: 1 })
    expect(view(startingState(short.game), short.game).when).toBe('Day 1 · Day 1 of the week morning')
  })

  it('takes its own periods, week and words', () => {
    const { game, clock } = house({ periods: ['dawn', { id: 'dusk', label: 'after dark' }], week: 3, weekend: [2], start: { day: 1, period: 'dusk' } })
    const state = startingState(game)
    expect(clock.read(state, game)).toEqual({ day: 1, period: 'dusk' })
    expect(view(state, game).when).toBe('Day 2 · Day 2 of the week after dark')
    const renamed = { ...game, strings: { ...game.strings, 'calendar/weekday.1': 'Moonday', 'calendar/label': '{weekday}, {period}' } }
    expect(view(state, renamed).when).toBe('Moonday, after dark')
  })

  it('stops what passes time with a lock by effect', () => {
    const { game } = house({}, { locks: [{ when: { kv: 'ill' }, deny: ['*'], effect: 'calendar/pass', reason: 'You feel too ill.' }] })
    const ill = { ...startingState(game), kv: { ill: true } }
    expect(whyNot(ill, game, act('nap'))).toBe('You feel too ill.')
    expect(whyNot(ill, game, act('rest'))).toBeUndefined()
  })

  it('reports a calendar set up wrong when the game loads', () => {
    const { problems } = loadGame([], {
      id: 'bad',
      title: 'Bad',
      plugins: [calendar({ periods: ['am', 'am'], start: { period: 'noon' }, sleep: { from: ['pm'] }, weekend: [9], curfew: { kv: 'x', of: 'pet:cat' } })],
    })
    expect(problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual([
      'options curfew: unknown kind "pet"',
      'options periods: two periods share an id',
      'options start: no period called "noon"',
      'options sleep: no period called "pm"',
      'options weekend: no day 9 in a week of 7',
    ])
  })
})
