import { describe, expect, it } from 'vitest'
import {
  apply,
  createRunner,
  holds,
  loadGame,
  loadState,
  replay,
  startingState,
  view,
  whyNot,
  type Command,
  type Game,
  type GameState,
  type Content,
  type Plugin,
  type CommandRef,
} from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { go, places, type LocationDef } from '@ifloom/plugin-places'
import { applyFor, fire, hasJob, hire, jobs, openJobs, quit, shiftsWorked, wasFired, work, workedToday, type JobDef, type JobsView } from '../src/index.ts'

/**
 * Weekend help at the café: friends of the owner only, Saturday mornings,
 * 20 energy and the morning, 12 coins, 18 as a barista after three shifts.
 * Two missed Saturdays, or a grumpy manner, and you're out.
 */
const cafe: JobDef = {
  id: 'cafe',
  title: 'Weekend help',
  description: 'Saturdays at the Corner Café.',
  blocked: [{ when: { not: { kv: 'metAva' } }, reason: 'Ava needs to know you first.' }],
  at: ['cafe'],
  days: [5],
  hours: ['morning'],
  shift: { cost: { energy: 20 }, passes: 1, effects: [{ kind: 'stat', stat: 'manner', by: 1 }] },
  ranks: [
    { id: 'help', title: 'Weekend help', pay: { coins: 12 } },
    { id: 'barista', title: 'Barista', pay: { coins: 18 }, requires: { shifts: 3 } },
    { id: 'manager', title: 'Manager', pay: { coins: 30 }, requires: { shifts: 5, when: { stat: 'manner', gte: 15 } } },
  ],
  fire: { missed: 2, when: { stat: 'manner', lt: 1 } },
}

const place = (id: string, exits: string[]): LocationDef => ({ id, name: id, tag: '', art: '', exits, body: [] })

function game(...partners: Plugin[]): Game {
  const town: Content = {
    name: 'town',
    stats: [
      { id: 'coins', label: 'Coins', start: 0, max: 999, spendable: true, format: '{n} coins' },
      { id: 'energy', label: 'Energy', start: 100, spendable: true, lacking: 'Too tired.' },
      { id: 'manner', label: 'Manner', start: 5 },
    ],
    activities: [
      { id: 'meet', effects: [{ kind: 'kv', key: 'metAva', to: true }] },
      { id: 'sleep', effects: [{ kind: 'turn' }] },
      { id: 'rest', effects: [{ kind: 'stat', stat: 'energy', to: 100 }] },
      { id: 'snap', effects: [{ kind: 'stat', stat: 'manner', to: 0 }] },
      { id: 'hired', effects: [hire('cafe')] },
      { id: 'sacked', effects: [fire('cafe')] },
      // A week goes by, with the calendar's five periods a day.
      { id: 'week', effects: [{ custom: 'calendar/pass', with: { by: 35 } }] },
    ],
    data: {
      jobs: { jobs: [cafe] },
      ...(partners.some((plugin) => plugin.id === 'places') ? { places: { locations: [place('street', ['cafe']), place('cafe', ['street'])] } } : {}),
    },
  }
  const loaded = loadGame([town], { id: 'g', title: 'g', plugins: [...partners, jobs()] })
  expect(loaded.problems).toEqual([])
  return loaded.game
}

function run(state: GameState, g: Game, ...commands: CommandRef[]): GameState {
  for (const command of commands) {
    const out = apply(state, g, command)
    expect(out.reason, JSON.stringify(command)).toBeUndefined()
    state = out.state
  }
  return state
}

const act = (id: string): Command => ({ type: 'activity', id })
const fresh = (g: Game) => ({ ...startingState(g), sceneId: null })
const board = (state: GameState, g: Game) => (view(state, g).plugins.jobs as JobsView).jobs[0]

describe('jobs, on their own', () => {
  it('hire only when the requirements hold, in their own words', () => {
    const g = game()
    expect(whyNot(fresh(g), g, applyFor('cafe'))).toBe('Ava needs to know you first.')
    expect(board(fresh(g), g)).toMatchObject({
      hired: false,
      rank: null,
      apply: { disabled: 'Ava needs to know you first.' },
      work: null,
      pay: { stats: [{ id: 'coins', amount: 12, text: '12 coins' }] },
    })
    const state = run(fresh(g), g, act('meet'), applyFor('cafe'))
    expect(holds(state, hasJob('cafe'), g)).toBe(true)
    expect(holds(state, hasJob('cafe', 'help'), g)).toBe(true)
    expect(whyNot(state, g, applyFor('cafe'))).toBe('You already work there.')
    expect(board(state, g)).toMatchObject({ hired: true, rank: { id: 'help', title: 'Weekend help' }, apply: null, next: { id: 'barista', shiftsToGo: 3 } })
  })

  it('work a shift a day: pay the cost, run the shift’s effects, pay the wage', () => {
    const g = game()
    let state = run(fresh(g), g, act('meet'), applyFor('cafe'))
    expect(board(state, g).work).toMatchObject({ price: { stats: [{ id: 'energy', amount: 20 }] } })
    state = run(state, g, work('cafe'))
    expect(state.stats).toMatchObject({ coins: 12, energy: 80, manner: 6 })
    expect(whyNot(state, g, work('cafe'))).toBe('You’ve done today’s shift.')
    expect(holds(state, shiftsWorked('cafe', { gte: 1 }), g)).toBe(true)
    expect(holds(state, workedToday('cafe'), g)).toBe(true)
    expect(holds(state, workedToday(), g)).toBe(true)
    expect(holds(state, workedToday('other'), g)).toBe(false)
    // Without the calendar a day is a turn, and every day has a shift.
    state = run(state, g, act('sleep'))
    expect(holds(state, workedToday(), g)).toBe(false)
    expect(board(state, g).nextShift).toEqual({ day: 1, inDays: 0 })
    expect(whyNot({ ...state, stats: { ...state.stats, energy: 10 } }, g, work('cafe'))).toBe('Too tired.')
  })

  it('promote up the ladder as shifts and conditions allow, with a notice and more pay', () => {
    const g = game()
    let state = run(fresh(g), g, act('meet'), applyFor('cafe'))
    for (let n = 0; n < 3; n += 1) state = run(state, g, act('rest'), work('cafe'), act('sleep'))
    expect(board(state, g).rank).toMatchObject({ id: 'barista', pay: { stats: [{ id: 'coins', amount: 18, text: '18 coins' }] } })
    expect(view(state, g).notices.unseen.map((notice) => notice.title)).toContain('Promoted: Barista')
    const coins = state.stats.coins
    state = run(state, g, act('rest'), work('cafe'), act('sleep'), act('rest'), work('cafe'))
    expect(state.stats.coins).toBe(coins + 36)
    // Five shifts, but manager wants a manner of 15 too.
    expect(board(state, g).rank!.id).toBe('barista')
    state = run({ ...state, stats: { ...state.stats, manner: 15 } }, g, act('sleep'))
    expect(board(state, g).rank!.id).toBe('manager')
  })

  it('fire after missed shifts, or when the fire condition holds', () => {
    const g = game()
    const hiredState = run(fresh(g), g, act('meet'), applyFor('cafe'))
    // The day they're hired doesn't count; each day after with no shift does.
    let state = run(hiredState, g, act('sleep'), act('sleep'))
    expect(board(state, g)).toMatchObject({ hired: true, missed: 1 })
    state = run(state, g, act('sleep'))
    expect(board(state, g)).toMatchObject({ hired: false, firedOn: 3, apply: null, work: null })
    expect(holds(state, wasFired('cafe'), g)).toBe(true)
    expect(view(state, g).notices.unseen.map((notice) => notice.title)).toContain('You’ve lost your job: Weekend help')
    expect(whyNot(state, g, applyFor('cafe'))).toBe('They won’t have you back.')
    const rude = run(hiredState, g, act('snap'))
    expect(holds(rude, wasFired('cafe'), g)).toBe(true)
  })

  it('hire and fire by effect, and quit by command', () => {
    const g = game()
    let state = run(fresh(g), g, act('hired'))
    expect(holds(state, hasJob('cafe'), g)).toBe(true)
    state = run(state, g, quit('cafe'))
    expect(holds(state, hasJob('cafe'), g)).toBe(false)
    expect(holds(state, wasFired('cafe'), g)).toBe(false)
    state = run(state, g, act('hired'), act('sacked'))
    expect(holds(state, wasFired('cafe'), g)).toBe(true)
    // Hired again by an effect: the story can give a second chance.
    expect(holds(run(state, g, act('hired')), hasJob('cafe'), g)).toBe(true)
  })

  it('replay exactly, and an old save with no state for the plugin loads', () => {
    const g = game()
    const runner = createRunner(g, fresh(g))
    for (const command of [act('meet'), applyFor('cafe'), work('cafe'), act('sleep'), act('sleep'), work('cafe')]) runner.apply(command)
    expect(replay(g, runner.log())).toEqual({ ok: true, value: runner.state })
    const { plugins: _none, ...old } = fresh(g)
    const loadedRead = loadState(JSON.parse(JSON.stringify({ ...old, plugins: {} })), g)
    if (!loadedRead.ok) throw new Error(loadedRead.reason)
    const loaded = loadedRead.value
    expect(board(loaded, g).hired).toBe(false)
  })

  it('report jobs that name what the game does not have, and their own mistakes', () => {
    const loaded = loadGame(
      [
        { name: 'base', actions: [{ id: 'y', label: 'Y', command: work('nope') }] },
        {
          name: 'mod',
          data: {
            jobs: {
              jobs: [
                {
                  id: 'bad',
                  title: 'Bad',
                  blocked: [{ when: { not: { entity: 'thing:badge', at: 'you' } }, reason: 'x' }],
                  shift: { cost: { stamina: 1 } },
                  ranks: [
                    { id: 'a', title: 'A', pay: { gold: 1 }, requires: { shifts: 1 } },
                    { id: 'a', title: 'A', pay: {} },
                  ],
                  fire: { missed: 0 },
                },
              ],
            },
          },
        },
      ],
      { id: 'g', title: 'g', plugins: [jobs()] },
    )
    expect(loaded.problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual([
      'action y: unknown job "nope"',
      'jobs bad: blocked: unknown kind "thing"',
      'jobs bad: shift: unknown stat "stamina"',
      'jobs bad: rank a: unknown stat "gold"',
      'jobs bad: two ranks are called "a"',
      'jobs bad: the first rank, "a", is where the player starts, so it can\'t have requires',
      'jobs bad: fire.missed must be 1 or more',
    ])
  })
})

describe('jobs with the calendar', () => {
  it('fall on their weekdays and periods, take time, and count only missed shift days', () => {
    // No curfew, so a week can go by in one command.
    const clock = calendar({ turn: 'period', curfew: false })
    const g = game(clock)
    // Day 0 is a Monday: no shift until Saturday, day 5.
    let state = run(fresh(g), g, act('meet'), applyFor('cafe'))
    expect(whyNot(state, g, work('cafe'))).toBe('No shift today.')
    expect(board(state, g).nextShift).toEqual({ day: 5, inDays: 5 })
    state = clock.write(state, { day: 5, period: 'afternoon' })
    expect(whyNot(state, g, work('cafe'))).toBe('Not a time for a shift.')
    state = clock.write(state, { day: 5, period: 'morning' })
    state = run(state, g, work('cafe'))
    // The shift took the morning, and was the work's price note.
    expect(clock.read(state, g)).toEqual({ day: 5, period: 'afternoon' })
    // Done for the day says so, not that the hours are over.
    expect(whyNot(state, g, work('cafe'))).toBe('You’ve done today’s shift.')
    // Worked today for the rest of the calendar's day, as the refusal reads it.
    expect(holds(state, workedToday('cafe'), g)).toBe(true)
    expect(board(state, g)).toMatchObject({ shifts: 1, missed: 0, nextShift: { day: 12, inDays: 7 } })
    // A whole week passes in one go: one Saturday missed, the weekdays not counted.
    state = run(state, g, act('week'))
    expect(clock.read(state, g)).toEqual({ day: 12, period: 'afternoon' })
    expect(holds(state, workedToday('cafe'), g)).toBe(false)
    expect(board(state, g)).toMatchObject({ hired: true, missed: 0 })
    state = run(state, g, act('week'))
    expect(board(state, g)).toMatchObject({ hired: true, missed: 1 })
    state = run(state, g, act('week'))
    expect(board(state, g)).toMatchObject({ hired: false })
  })

  it('price a shift with the calendar’s note for the time it takes', () => {
    const clock = calendar({ turn: 'period' })
    const g = game(clock)
    const state = clock.write(run(fresh(g), g, act('meet'), applyFor('cafe')), { day: 5, period: 'morning' })
    expect(board(state, g).work?.price?.notes?.length).toBeGreaterThan(0)
  })
})

describe('jobs with places', () => {
  it('are worked only at the workplace', () => {
    const g = game(places({ start: 'street' }))
    const state = run(fresh(g), g, act('meet'), applyFor('cafe'))
    expect(whyNot(state, g, work('cafe'))).toBe('You aren’t at work.')
    expect(run(state, g, go('cafe'), work('cafe')).stats.coins).toBe(12)
  })
})

describe('the jobs panel', () => {
  it('opens the job board, or some of its jobs, and stays open as the player applies', () => {
    expect(openJobs()).toEqual({ kind: 'panel', panel: 'jobs' })
    expect(openJobs(['cafe'])).toEqual({ kind: 'panel', panel: 'jobs', with: { job: ['cafe'] } })
    const base = game()
    const g = { ...base, activities: [...(base.activities ?? []), { id: 'paper', effects: [openJobs(['cafe'])] }] }
    const open = run(fresh(g), g, act('meet'), { type: 'activity', id: 'paper' })
    expect(view(open, g).panel).toEqual({ panel: 'jobs', with: { job: ['cafe'] } })
    expect(run(open, g, applyFor('cafe')).panel).toEqual(open.panel)
  })

  it('checks the jobs a panel lists', () => {
    const loaded = loadGame(
      [
        {
          name: 'town',
          data: { jobs: { jobs: [{ ...cafe, blocked: [], shift: {}, fire: undefined, ranks: [{ id: 'help', title: 'Help' }] }] } },
          activities: [
            { id: 'a', effects: [openJobs(['cafe'])] },
            { id: 'b', effects: [openJobs(['cafe', 'circus'])] },
            { id: 'c', effects: [{ kind: 'panel', panel: 'jobs', with: { job: 'cafe' } }] },
            { id: 'd', effects: [openJobs()] },
          ],
        },
      ],
      { id: 'g', title: 'g', plugins: [jobs()] },
    )
    expect(loaded.problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual([
      'activity b: unknown job "circus"',
      "activity c: the jobs panel's job is a list of job ids",
    ])
  })
})
