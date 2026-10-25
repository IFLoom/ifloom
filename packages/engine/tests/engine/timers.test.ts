import { describe, expect, it } from 'vitest'
import { apply } from '../../src/reduce.ts'
import { whyNot } from '../../src/availability.ts'
import { view } from '../../src/view.ts'
import { checkGame } from '../../src/check.ts'
import { holds } from '../../src/condition.ts'
import { loadState } from '../../src/intake.ts'
import { loadGame } from '../../src/loader.ts'
import { SCHEMA } from '../../src/upgrade.ts'
import { createRunner, replay } from '../../src/runner.ts'
import type { Game, MinigameDef, TimerDef } from '../../src/index.ts'
import type { Command, GameState } from '../../src/types.ts'
import { begin, fixture } from '../fixtures/town.ts'
import { unwrap } from '../fixtures/result.ts'

/** The phone rings for ten seconds; missing it leaves a note. The kettle boils in four, and says so. */
const phone: TimerDef = {
  id: 'phone',
  label: 'The phone',
  ms: 10_000,
  effects: [
    { kv: 'missed', to: true },
    { stat: 'coins', by: -1 },
  ],
}
const kettle: TimerDef = { id: 'kettle', ms: 4000, effects: [{ kv: 'boiled', by: 1 }] }
/** Starts the kettle again whenever it runs out: one long tick boils it over and over. */
const again: TimerDef = {
  id: 'again',
  ms: 1000,
  effects: [{ kv: 'rounds', by: 1 }, { timer: 'again' }],
}

/** A coin in the air for a second: the minigame's own timer, beside the named ones. */
const toss: MinigameDef = {
  id: 'toss',
  start: 'air',
  states: { air: { after: { ms: 1000, go: 'down' } }, down: { final: { effects: [{ kv: 'landed', to: true }] } } },
}

function withTimers(extra: Partial<Game> = {}): Game {
  const base = fixture()
  return {
    ...base,
    timers: [phone, kettle, again],
    minigames: [toss],
    actions: [
      ...(base.actions ?? []),
      { id: 'ring', effects: [{ timer: 'phone' }] },
      { id: 'boil', effects: [{ timer: 'kettle' }] },
      { id: 'answer', effects: [{ timer: 'phone', to: null }] },
      { id: 'snooze', effects: [{ timer: 'phone', by: 5000 }] },
      { id: 'hurry', effects: [{ timer: 'phone', by: -60_000 }] },
      { id: 'short', effects: [{ timer: 'phone', to: 2000 }] },
      { id: 'flip', effects: [{ minigame: 'toss' }] },
      { id: 'loop', effects: [{ timer: 'again' }] },
    ],
    ...extra,
  }
}

function run(state: GameState, game: Game, ...commands: Command[]): GameState {
  for (const command of commands) {
    const out = apply(state, game, command)
    expect(out.reason, JSON.stringify(command)).toBeUndefined()
    state = out.state
  }
  return state
}

const act = (id: string): Command => ({ type: 'action', id })
const tick = (ms: number): Command => ({ type: 'tick', ms })

describe('timers', () => {
  it('start from an effect, count down with ticks, and show in the view without their effects', () => {
    const game = withTimers()
    let state = run(begin(game), game, act('ring'))
    expect(state.timers).toEqual({ phone: { left: 10_000, total: 10_000 } })
    state = run(state, game, tick(2500))
    expect(state.timers.phone).toEqual({ left: 7500, total: 10_000 })
    expect(view(state, game).timers).toEqual([{ id: 'phone', label: 'The phone', left: 7500, total: 10_000 }])
    expect(JSON.stringify(view(state, game).timers)).not.toContain('missed')
    expect(view(begin(game), game).timers).toEqual([])
  })

  it('run their effects when they run out, and stop', () => {
    const game = withTimers()
    const coins = begin(game).stats.coins ?? 3
    let state = run(begin(game), game, act('ring'), tick(9999))
    expect(state.kv.missed).toBeUndefined()
    state = run(state, game, tick(1))
    expect(state.kv.missed).toBe(true)
    expect(state.stats.coins).toBe(coins - 1)
    expect(state.timers).toEqual({})
  })

  it('stop without their effects, take more time, and start again from the top', () => {
    const game = withTimers()
    const answered = run(begin(game), game, act('ring'), tick(3000), act('answer'))
    expect(answered.timers).toEqual({})
    // Nothing left to count down: no tick goes through, so its effects never run.
    expect(whyNot(answered, game, tick(60_000))).toBe('Nothing is counting down.')
    expect(answered.kv.missed).toBeUndefined()
    // Five more seconds on seven left: twelve, over a length that grows to fit.
    const snoozed = run(begin(game), game, act('ring'), tick(3000), act('snooze'))
    expect(snoozed.timers.phone).toEqual({ left: 12_000, total: 12_000 })
    // Ringing again starts it from the top.
    expect(run(snoozed, game, act('ring')).timers.phone).toEqual({ left: 10_000, total: 10_000 })
    // `to` starts it for that long.
    expect(run(begin(game), game, act('short')).timers.phone).toEqual({ left: 2000, total: 2000 })
    // Adding to one that isn't running does nothing.
    expect(run(begin(game), game, act('snooze')).timers).toEqual({})
  })

  it('take time away down to 0, and one at 0 runs out on the next tick', () => {
    const game = withTimers()
    const hurried = run(begin(game), game, act('ring'), act('hurry'))
    expect(hurried.timers.phone).toEqual({ left: 0, total: 10_000 })
    expect(hurried.kv.missed).toBeUndefined()
    expect(run(hurried, game, tick(1)).kv.missed).toBe(true)
  })

  it('run out in the order they would have in one long tick, and count on from there', () => {
    const game = withTimers()
    const state = run(begin(game), game, act('ring'), act('boil'), tick(30_000))
    // The kettle (4 s) before the phone (10 s), each once.
    expect(state.kv).toMatchObject({ boiled: 1, missed: true })
    expect(state.timers).toEqual({})
    // A timer its own effects start again counts from the moment it ran out: 3.5 seconds is three rounds, half a second into the fourth.
    const looped = run(begin(game), game, act('loop'), tick(3500))
    expect(looped.kv.rounds).toBe(3)
    expect(looped.timers.again).toEqual({ left: 500, total: 1000 })
  })

  it('answer the timer condition: running, and how long is left', () => {
    const game = withTimers()
    const state = run(begin(game), game, act('ring'), tick(7500))
    expect(holds(state, game, { timer: 'phone' })).toBe(true)
    expect(holds(state, game, { timer: 'phone', lte: 3000 })).toBe(true)
    expect(holds(state, game, { timer: 'phone', gt: 3000 })).toBe(false)
    expect(holds(state, game, { timer: 'kettle' })).toBe(false)
    expect(holds(state, game, { timer: 'kettle', lte: 3000 })).toBe(false)
  })

  it('refuse a tick with nothing counting down, and one of no length', () => {
    const game = withTimers()
    expect(whyNot(begin(game), game, tick(100))).toBe('Nothing is counting down.')
    const ringing = run(begin(game), game, act('ring'))
    expect(whyNot(ringing, game, tick(0))).toBe('A tick is a number of milliseconds above 0.')
    expect(whyNot(ringing, game, tick(100))).toBeUndefined()
  })

  it('share the tick with a minigame: whichever runs out first goes first', () => {
    const game = withTimers()
    // The kettle runs while the coin is in the air, and boils after it lands.
    const state = run(begin(game), game, act('boil'), act('flip'), tick(500))
    expect(state.minigame?.elapsed).toBe(500)
    expect(state.timers.kettle?.left).toBe(3500)
    const later = run(state, game, tick(5000))
    expect(later.minigame).toBeNull()
    expect(later.kv).toMatchObject({ landed: true, boiled: 1 })
  })

  it('keep a minigame played alone exactly as before', () => {
    const game = withTimers()
    const state = run(begin(game), game, act('flip'), tick(999))
    expect(state.minigame?.elapsed).toBe(999)
    expect(run(state, game, tick(1)).kv.landed).toBe(true)
  })

  it('are logged as ticks and play back exactly', () => {
    const game = withTimers()
    const runner = createRunner(game, begin(game), { history: true })
    runner.apply(act('ring'))
    runner.apply(tick(4000))
    runner.apply(act('boil'))
    runner.apply(tick(7000))
    expect(runner.state.kv).toMatchObject({ missed: true, boiled: 1 })
    expect(unwrap(replay(game, runner.log()))).toEqual(runner.state)
    // Undo skips the ticks: back to before the kettle, with the first tick kept.
    expect(runner.undo()).toBe(true)
    expect(runner.state.timers).toEqual({ phone: { left: 6000, total: 10_000 } })
  })

  it('load from a save without them, and keep running ones', () => {
    const game = withTimers()
    const { timers: _gone, ...old } = begin(game)
    const loaded = loadState(JSON.parse(JSON.stringify(old)), game)
    expect(loaded.ok && loaded.value.timers).toEqual({})
    const ringing = run(begin(game), game, act('ring'), tick(1000))
    const back = loadState(JSON.parse(JSON.stringify(ringing)), game)
    expect(back.ok && back.value.timers).toEqual({ phone: { left: 9000, total: 10_000 } })
  })

  it('merge by id from packs', () => {
    const { scenes: _s, introScene: _in, timers: _t, ...base } = withTimers()
    const { game } = loadGame([{ timers: [phone, kettle] }], base, { packs: [{ id: 'mod:slow', schema: SCHEMA, timers: [{ ...phone, ms: 20_000 }] }] })
    expect(game.timers?.map((timer) => [timer.id, timer.ms])).toEqual([
      ['phone', 20_000],
      ['kettle', 4000],
    ])
  })
})

describe('the timer checks', () => {
  const problems = (game: Game) =>
    checkGame(game)
      .problems.filter((problem) => problem.where.includes('timer') || problem.what.includes('timer'))
      .map((problem) => `${problem.where} · ${problem.what}`)

  it('pass the timers above', () => {
    expect(problems(withTimers())).toEqual([])
  })

  it('report an unknown timer, a bad length, a bad to or by, and one declared twice', () => {
    const game = withTimers({
      timers: [phone, phone, kettle, again, { id: 'never', ms: 0 }],
      triggers: [
        {
          id: 'odd',
          when: { timer: 'nope' },
          effects: [
            { timer: 'phone', to: -5 },
            { timer: 'phone', by: Number.NaN },
          ],
        },
      ],
    })
    const found = problems(game).join('\n')
    expect(found).toContain('unknown timer "nope"')
    expect(found).toContain('timer never · a timer needs ms above 0')
    expect(found).toContain('to must be a number of milliseconds above 0')
    expect(found).toContain('by must be a number of milliseconds')
    expect(found).toContain('timer phone · two timers share this id')
  })
})
