import { describe, expect, it } from 'vitest'
import {
  apply,
  fillTokens,
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
import { places } from '@ifloom/plugin-places'
import { jobs, type JobDef, type JobsView } from '../src/index.ts'

/**
 * Weekend help at the café: friends of the owner only, Saturday mornings,
 * 20 energy and the morning, 12 coins, 18 as a barista after three shifts.
 * Two missed Saturdays, or a grumpy manner, and you're out.
 */
const cafe: JobDef = {
  id: 'cafe',
  name: 'Weekend help',
  description: 'Saturdays at the Corner Café.',
  blocked: [{ when: { not: { kv: 'metAva' } }, reason: 'Ava needs to know you first.' }],
  days: [5],
  hours: ['morning'],
  // Worked at the café, with places; anywhere without.
  shift: { cost: { energy: 20 }, passes: 1, effects: [{ stat: 'manner', by: 1 }], blocked: [places.onlyAt(['cafe'], { string: 'jobs/notHere' })] },
  ranks: [
    { id: 'help', name: 'Weekend help', pay: { coins: 12 } },
    { id: 'barista', name: 'Barista', pay: { coins: 18 }, requires: { shifts: 3 } },
    { id: 'manager', name: 'Manager', pay: { coins: 30 }, requires: { shifts: 5, when: { stat: 'manner', gte: 15 } } },
  ],
  fire: { missed: 2, when: { stat: 'manner', lt: 1 } },
}

const place = (id: string, exits: string[]) => places.location({ id, name: id, exits, body: [] })

function game(...partners: Plugin[]): Game {
  const town: Content = {
    name: 'town',
    stats: [
      { id: 'coins', label: 'Coins', start: 0, max: 999, spendable: true, format: '{n} coins' },
      { id: 'energy', label: 'Energy', start: 100, spendable: true, lacking: 'Too tired.' },
      { id: 'manner', label: 'Manner', start: 5 },
    ],
    actions: [
      { id: 'meet', effects: [{ kv: 'metAva', to: true }] },
      { id: 'sleep', effects: [{ turn: true }] },
      { id: 'rest', effects: [{ stat: 'energy', to: 100 }] },
      { id: 'snap', effects: [{ stat: 'manner', to: 0 }] },
      { id: 'hired', effects: [jobs.hire('cafe')] },
      { id: 'sacked', effects: [jobs.fire('cafe')] },
      // A week goes by, with the calendar's five periods a day.
      { id: 'week', effects: [{ 'calendar/pass': { by: 35 } }] },
    ],
    data: { jobs: { jobs: [cafe] } },
    entities: partners.some((plugin) => plugin.id === 'places') ? [place('street', ['cafe']), place('cafe', ['street'])] : [],
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

const act = (id: string): Command => ({ type: 'action', id })
const fresh = (g: Game) => ({ ...startingState(g), sceneId: null })
const board = (state: GameState, g: Game) => (view(state, g).plugins.jobs as JobsView).jobs[0]

describe('jobs, on their own', () => {
  it('hire only when the requirements hold, in their own words', () => {
    const g = game()
    expect(whyNot(fresh(g), g, jobs.apply('cafe'))).toBe('Ava needs to know you first.')
    expect(board(fresh(g), g)).toMatchObject({
      hired: false,
      rank: null,
      apply: { disabled: 'Ava needs to know you first.' },
      work: null,
      pay: { stats: [{ id: 'coins', amount: 12, text: '12 coins' }] },
    })
    const state = run(fresh(g), g, act('meet'), jobs.apply('cafe'))
    expect(holds(state, g, jobs.hired('cafe'))).toBe(true)
    expect(holds(state, g, jobs.hired('cafe', 'help'))).toBe(true)
    expect(whyNot(state, g, jobs.apply('cafe'))).toBe('You already work there.')
    expect(board(state, g)).toMatchObject({ hired: true, rank: { id: 'help', name: 'Weekend help' }, apply: null, next: { id: 'barista', shiftsToGo: 3 } })
  })

  it('work a shift a day: pay the cost, run the shift’s effects, pay the wage', () => {
    const g = game()
    let state = run(fresh(g), g, act('meet'), jobs.apply('cafe'))
    expect(board(state, g).work).toMatchObject({ price: { stats: [{ id: 'energy', amount: 20 }] } })
    state = run(state, g, jobs.work('cafe'))
    expect(state.stats).toMatchObject({ coins: 12, energy: 80, manner: 6 })
    expect(whyNot(state, g, jobs.work('cafe'))).toBe('You’ve done today’s shift.')
    expect(holds(state, g, jobs.shifts('cafe', { gte: 1 }))).toBe(true)
    expect(holds(state, g, jobs.worked('cafe'))).toBe(true)
    expect(holds(state, g, jobs.worked())).toBe(true)
    expect(holds(state, g, jobs.worked('other'))).toBe(false)
    // Without the calendar a day is a turn, and every day has a shift.
    state = run(state, g, act('sleep'))
    expect(holds(state, g, jobs.worked())).toBe(false)
    expect(board(state, g).nextShift).toEqual({ day: 1, inDays: 0 })
    expect(whyNot({ ...state, stats: { ...state.stats, energy: 10 } }, g, jobs.work('cafe'))).toBe('Too tired.')
  })

  it('promote up the ladder as shifts and conditions allow, with a notice and more pay', () => {
    const g = game()
    let state = run(fresh(g), g, act('meet'), jobs.apply('cafe'))
    for (let n = 0; n < 3; n += 1) state = run(state, g, act('rest'), jobs.work('cafe'), act('sleep'))
    expect(board(state, g).rank).toMatchObject({ id: 'barista', pay: { stats: [{ id: 'coins', amount: 18, text: '18 coins' }] } })
    expect(view(state, g).notices.unseen.map((notice) => notice.title)).toContain('Promoted: Barista')
    const coins = state.stats.coins
    state = run(state, g, act('rest'), jobs.work('cafe'), act('sleep'), act('rest'), jobs.work('cafe'))
    expect(state.stats.coins).toBe(coins + 36)
    // Five shifts, but manager wants a manner of 15 too.
    expect(board(state, g).rank!.id).toBe('barista')
    state = run({ ...state, stats: { ...state.stats, manner: 15 } }, g, act('sleep'))
    expect(board(state, g).rank!.id).toBe('manager')
  })

  it('print the rank held in prose with {{jobs/rank job=…}}, and the fallback when not hired', () => {
    const g = game()
    const line = 'You work as {{jobs/rank job=cafe|nothing yet}}.'
    let state: GameState = fresh(g)
    expect(fillTokens(state, g, line)).toBe('You work as nothing yet.')
    state = run(state, g, act('meet'), jobs.apply('cafe'))
    expect(fillTokens(state, g, line)).toBe('You work as Weekend help.')
    for (let n = 0; n < 3; n += 1) state = run(state, g, act('rest'), jobs.work('cafe'), act('sleep'))
    expect(fillTokens(state, g, line)).toBe('You work as Barista.')
  })

  it('fire after missed shifts, or when the fire condition holds', () => {
    const g = game()
    const hiredState = run(fresh(g), g, act('meet'), jobs.apply('cafe'))
    // The day they're hired doesn't count; each day after with no shift does.
    let state = run(hiredState, g, act('sleep'), act('sleep'))
    expect(board(state, g)).toMatchObject({ hired: true, missed: 1 })
    state = run(state, g, act('sleep'))
    expect(board(state, g)).toMatchObject({ hired: false, firedOn: 3, apply: null, work: null })
    expect(holds(state, g, jobs.fired('cafe'))).toBe(true)
    expect(view(state, g).notices.unseen.map((notice) => notice.title)).toContain('You’ve lost your job: Weekend help')
    expect(whyNot(state, g, jobs.apply('cafe'))).toBe('They won’t have you back.')
    const rude = run(hiredState, g, act('snap'))
    expect(holds(rude, g, jobs.fired('cafe'))).toBe(true)
  })

  it('hire and fire by effect, and quit by command', () => {
    const g = game()
    let state = run(fresh(g), g, act('hired'))
    expect(holds(state, g, jobs.hired('cafe'))).toBe(true)
    expect(board(fresh(g), g).quit).toBeNull()
    expect(board(state, g).quit).toMatchObject({ label: 'Quit', command: { type: 'custom', name: 'jobs/quit', with: { id: 'cafe' } } })
    state = run(state, g, board(state, g).quit!.command)
    expect(holds(state, g, jobs.hired('cafe'))).toBe(false)
    expect(holds(state, g, jobs.fired('cafe'))).toBe(false)
    state = run(state, g, act('hired'), act('sacked'))
    expect(holds(state, g, jobs.fired('cafe'))).toBe(true)
    // Hired again by an effect: the story can give a second chance.
    expect(holds(run(state, g, act('hired')), g, jobs.hired('cafe'))).toBe(true)
  })

  it('replay exactly, and an old save with no state for the plugin loads', () => {
    const g = game()
    const runner = createRunner(g, fresh(g))
    for (const command of [act('meet'), jobs.apply('cafe'), jobs.work('cafe'), act('sleep'), act('sleep'), jobs.work('cafe')]) runner.apply(command)
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
        { name: 'base', actions: [{ id: 'y', label: 'Y', command: jobs.work('nope') }] },
        {
          name: 'mod',
          data: {
            jobs: {
              jobs: [
                {
                  id: 'bad',
                  name: 'Bad',
                  blocked: [{ when: { not: { entity: 'thing:badge', at: 'you' } }, reason: 'x' }],
                  shift: { cost: { stamina: 1 } },
                  ranks: [
                    { id: 'a', name: 'A', pay: { gold: 1 }, requires: { shifts: 1 } },
                    { id: 'a', name: 'A', pay: {} },
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
    let state = run(fresh(g), g, act('meet'), jobs.apply('cafe'))
    expect(whyNot(state, g, jobs.work('cafe'))).toBe('No shift today.')
    expect(board(state, g).nextShift).toEqual({ day: 5, inDays: 5 })
    state = clock.write(state, { day: 5, period: 'afternoon' })
    expect(whyNot(state, g, jobs.work('cafe'))).toBe('Not a time for a shift.')
    state = clock.write(state, { day: 5, period: 'morning' })
    state = run(state, g, jobs.work('cafe'))
    // The shift took the morning, and was the work's price note.
    expect(clock.read(state, g)).toEqual({ day: 5, period: 'afternoon' })
    // Done for the day says so, not that the hours are over.
    expect(whyNot(state, g, jobs.work('cafe'))).toBe('You’ve done today’s shift.')
    // Worked today for the rest of the calendar's day, as the refusal reads it.
    expect(holds(state, g, jobs.worked('cafe'))).toBe(true)
    expect(board(state, g)).toMatchObject({ shifts: 1, missed: 0, nextShift: { day: 12, inDays: 7 } })
    // A whole week passes in one go: one Saturday missed, the weekdays not counted.
    state = run(state, g, act('week'))
    expect(clock.read(state, g)).toEqual({ day: 12, period: 'afternoon' })
    expect(holds(state, g, jobs.worked('cafe'))).toBe(false)
    expect(board(state, g)).toMatchObject({ hired: true, missed: 0 })
    state = run(state, g, act('week'))
    expect(board(state, g)).toMatchObject({ hired: true, missed: 1 })
    state = run(state, g, act('week'))
    expect(board(state, g)).toMatchObject({ hired: false })
  })

  it('price a shift with the calendar’s note for the time it takes', () => {
    const clock = calendar({ turn: 'period' })
    const g = game(clock)
    const state = clock.write(run(fresh(g), g, act('meet'), jobs.apply('cafe')), { day: 5, period: 'morning' })
    expect(board(state, g).work?.price?.notes?.length).toBeGreaterThan(0)
  })
})

describe('jobs with places', () => {
  it('are worked only at the workplace', () => {
    const g = game(places({ start: 'street' }))
    const state = run(fresh(g), g, act('meet'), jobs.apply('cafe'))
    expect(whyNot(state, g, jobs.work('cafe'))).toBe('You aren’t at work.')
    expect(run(state, g, places.go('cafe'), jobs.work('cafe')).stats.coins).toBe(12)
  })
})

describe('the jobs panel', () => {
  it('opens the job board, or some of its jobs, and stays open as the player applies', () => {
    expect(jobs.open()).toEqual({ panel: 'jobs' })
    expect(jobs.open(['cafe'])).toEqual({ panel: 'jobs', with: { job: ['cafe'] } })
    const base = game()
    const g = { ...base, actions: [...(base.actions ?? []), { id: 'paper', effects: [jobs.open(['cafe'])] }] }
    const open = run(fresh(g), g, act('meet'), { type: 'action', id: 'paper' })
    expect(view(open, g).panel).toEqual({ panel: 'jobs', with: { job: ['cafe'] } })
    // The view's panel is the board as opened: only the jobs it lists, and none while it is shut.
    expect((view(open, g).plugins.jobs as JobsView).panel?.map((job) => job.id)).toEqual(['cafe'])
    expect((view(fresh(g), g).plugins.jobs as JobsView).panel).toBeNull()
    expect(run(open, g, jobs.apply('cafe')).panel).toEqual(open.panel)
  })

  it('checks the jobs a panel lists', () => {
    const loaded = loadGame(
      [
        {
          name: 'town',
          data: { jobs: { jobs: [{ ...cafe, blocked: [], shift: {}, fire: undefined, ranks: [{ id: 'help', name: 'Help' }] }] } },
          actions: [
            { id: 'a', effects: [jobs.open(['cafe'])] },
            { id: 'b', effects: [jobs.open(['cafe', 'circus'])] },
            { id: 'c', effects: [{ panel: 'jobs', with: { job: 'cafe' } }] },
            { id: 'd', effects: [jobs.open()] },
          ],
        },
      ],
      { id: 'g', title: 'g', plugins: [jobs()] },
    )
    expect(loaded.problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual([
      'action b: unknown job "circus"',
      "action c: the jobs panel's job is a list of job ids",
    ])
  })
})
