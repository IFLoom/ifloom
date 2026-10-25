import { describe, expect, it } from 'vitest'
import { amountOf, inRange } from '../../src/amount.ts'
import { checkGame, describeProblem } from '../../src/check.ts'
import { holds } from '../../src/condition.ts'
import { explain } from '../../src/explain.ts'
import { loadGame, type Content } from '../../src/loader.ts'
import { applyEffects } from '../../src/reduce.ts'
import { startingState } from '../../src/intake.ts'
import { statMax, statValue } from '../../src/stats.ts'
import { heldCount } from '../../src/holdings.ts'
import { view } from '../../src/view.ts'
import type { Amount, Effect, GameState } from '../../src/types.ts'
import type { Game } from '../../src/game.ts'
import type { GameRules } from '../../src/game.ts'

/** A flat with rent to pay, a purse, staff with wages, and a larder of apples. */
const flat: Content = {
  name: 'flat',
  kinds: [
    { id: 'staff', label: 'Staff', unique: true },
    { id: 'food', label: 'Food' },
  ],
  stats: [
    { id: 'coins', label: 'Coins', start: 12, max: 999, spendable: true },
    { id: 'rent', label: 'Rent', start: 10, max: 999 },
    { id: 'fitness', label: 'Fitness', start: 40 },
    { id: 'energy', label: 'Energy', start: 30, max: { stat: 'fitness' }, min: { kv: 'floor' } },
    { id: 'loop', label: 'Loop', derive: { sum: ['coins', 500] }, max: { stat: 'loop' } },
    { id: 'wage', label: 'Wage', of: 'staff', start: 3 },
  ],
  storylines: [{ id: 'baker', name: 'The baker' }],
  entities: [
    { id: 'ana', of: 'staff', name: 'Ana', stats: { wage: 4 } },
    { id: 'ben', of: 'staff', name: 'Ben' },
    { id: 'apple', of: 'food', name: 'Apple', at: { player: 3 } },
  ],
  kv: { tips: 5, floor: 2, mood: 'fine' },
}

const rules: GameRules = {
  values: { bonus: (_state, args) => Number(args.times ?? 1) * 2 },
  conditions: { over: (_state, args) => Number(args.n) > Number(args.gte) },
}

function game(extra: Content[] = []): Game {
  const loaded = loadGame([flat, ...extra], { id: 'flat', title: 'The Flat', rules })
  expect(loaded.problems.map(describeProblem)).toEqual([])
  return loaded.game
}

const run = (state: GameState, g: Game, effects: Effect[]) => applyEffects(state, g, effects)

describe('amountOf', () => {
  it('reads a number, a stat, a formula, a kv key, a value and a count', () => {
    const g = game()
    const state = startingState(g)
    const read = (amount: Amount) => amountOf(state, g, amount)
    expect(read(7)).toBe(7)
    expect(read('rent')).toBe(10)
    expect(read({ stat: 'coins' })).toBe(12)
    expect(read({ stat: 'wage', of: 'staff:ana' })).toBe(4)
    expect(read({ stat: 'wage', of: 'staff:ben' })).toBe(3)
    expect(read({ sum: ['rent', 2] })).toBe(12)
    expect(read({ kv: 'tips' })).toBe(5)
    // A key whose value isn't a number counts as 0, as does an owner that isn't there.
    expect(read({ kv: 'mood' })).toBe(0)
    expect(read({ kv: 'met', of: 'storyline:baker' })).toBe(0)
    expect(read({ stat: 'wage', of: 'staff:nobody' })).toBe(0)
    expect(read({ value: 'game/bonus', with: { times: 3 } })).toBe(6)
    expect(read({ value: 'game/missing' })).toBe(0)
    expect(read({ count: 'staff' })).toBe(2)
    expect(read({ count: { of: 'food', at: 'player' }, units: true })).toBe(3)
    expect(read({ count: 'staff', where: { stat: 'wage', of: '$', gte: 4 } })).toBe(1)
  })
})

describe('an amount as a range bound', () => {
  it('holds coins at least the rent, and explains it with the rent worked out', () => {
    const g = game()
    const state = startingState(g)
    const canPay = { stat: 'coins', gte: { stat: 'rent' } } as const
    expect(holds(state, canPay, g)).toBe(true)
    const short = run(state, g, [{ stat: 'rent', by: 5 }])
    expect(holds(short, canPay, g)).toBe(false)
    expect(explain(short, canPay, g).why).toBe('stat coins is 12; wants 15 or more')
  })

  it('works out bounds in every kind of condition, a call’s included', () => {
    const g = game()
    const state = startingState(g)
    expect(holds(state, { kv: 'tips', lt: { stat: 'rent' } }, g)).toBe(true)
    expect(holds(state, { turn: { lt: { kv: 'tips' } } }, g)).toBe(true)
    expect(holds(state, { count: 'staff', gte: { kv: 'floor' } }, g)).toBe(true)
    // A call's own bounds are worked out before it is asked.
    expect(holds(state, { 'game/over': { n: 11, gte: { stat: 'rent' } } }, g)).toBe(true)
    expect(holds(state, { 'game/over': { n: 9, gte: { stat: 'rent' } } }, g)).toBe(false)
  })

  it('reads amounts in inRange only when it is given the state and the game', () => {
    const g = game()
    const state = startingState(g)
    expect(inRange(12, { gte: { stat: 'rent' } }, state, g)).toBe(true)
    expect(inRange(12, { gte: { stat: 'rent' } })).toBe(false)
    expect(inRange(12, { gte: 10 })).toBe(true)
  })
})

describe('an amount in an effect', () => {
  it('changes a stat by another stat, a kv key and a count', () => {
    const g = game()
    let state = run(startingState(g), g, [{ stat: 'coins', by: { kv: 'tips' } }])
    expect(statValue(state, g, 'coins')).toBe(17)
    state = run(state, g, [{ stat: 'coins', by: { scale: 'rent', by: -1 } }])
    expect(statValue(state, g, 'coins')).toBe(7)
    state = run(state, g, [{ stat: 'coins', to: { count: 'staff' } }])
    expect(statValue(state, g, 'coins')).toBe(2)
  })

  it('pays each of the staff their own wage, with $ in the amount', () => {
    const g = game()
    const state = run(startingState(g), g, [{ each: 'staff', effects: [{ stat: 'coins', by: { scale: { stat: 'wage', of: '$' }, by: -1 } }] }])
    expect(statValue(state, g, 'coins')).toBe(5)
  })

  it('changes a kv key, a holding and a draw’s ends by amounts', () => {
    const g = game()
    let state = run(startingState(g), g, [
      { kv: 'tips', by: { stat: 'rent' } },
      { entity: 'food:apple', by: { kv: 'floor' } },
    ])
    expect(state.kv.tips).toBe(15)
    expect(heldCount(state, g, 'food:apple')).toBe(5)
    state = run(state, g, [{ kv: 'draw', random: [{ kv: 'floor' }, { kv: 'floor' }] }])
    expect(state.kv.draw).toBe(2)
  })

  it('prices a choice by the amount its effect reads now', () => {
    const scene: Content = {
      scenes: [
        {
          id: 'landlord',
          title: 'The landlord',
          body: [],
          choices: [{ id: 'pay', label: 'Pay the rent', effects: [{ stat: 'coins', by: { scale: 'rent', by: -1 } }] }],
        },
      ],
    }
    const g = game([scene])
    const state = { ...startingState(g), sceneId: 'landlord' }
    expect(view(state, g).scene?.choices[0].price?.stats).toEqual([{ id: 'coins', amount: 10, text: '10' }])
  })

  it('rolls with a stat added and a kv key to beat', () => {
    const g = game()
    const state = run(startingState(g), g, [{ roll: 'climb', dice: '1d6', plus: { stat: 'rent' }, against: { kv: 'tips' } }])
    const roll = state.rolls.latest.climb
    expect(roll.plus).toBe(10)
    expect(roll.against).toBe(5)
    expect(roll.passed).toBe(true)
  })
})

describe('an amount as a stat’s bounds', () => {
  it('moves a ceiling and a floor with the game', () => {
    const g = game()
    let state = startingState(g)
    expect(statMax(state, g, 'energy')).toBe(40)
    state = run(state, g, [{ stat: 'energy', by: 50 }])
    expect(statValue(state, g, 'energy')).toBe(40)
    state = run(state, g, [{ stat: 'energy', to: 0 }])
    expect(statValue(state, g, 'energy')).toBe(2)
    expect(view(state, g).statsById.energy).toMatchObject({ min: 2, max: 40 })
  })

  it('reads a ceiling that comes back to itself as the default there, rather than going round', () => {
    const g = game()
    // The derived 512 is held to a ceiling read while it is being worked out: 100 there.
    expect(statMax(startingState(g), g, 'loop')).toBe(100)
    expect(statValue(startingState(g), g, 'loop')).toBe(100)
  })
})

describe('checking amounts', () => {
  it('reports an amount naming an unknown stat, kv owner or value, and one of the wrong shape', () => {
    const bad: Content = {
      name: 'bad',
      actions: [
        {
          id: 'odd',
          effects: [
            { stat: 'coins', by: { stat: 'gold' } },
            { kv: 'tips', by: { kv: 'x', of: 'storyline:nobody' } },
            { stat: 'coins', to: { value: 'game/nothing' } },
            { stat: 'coins', by: { count: 'ghosts' } },
            { stat: 'coins', by: [3] as unknown as Amount },
          ],
          blocked: [{ when: { stat: 'coins', gte: { stat: 'debt' } }, reason: 'No.' }],
        },
      ],
    }
    const loaded = loadGame([flat, bad], { id: 'flat', title: 'The Flat', rules })
    const problems = checkGame(loaded.game).problems.map((problem) => `${problem.where}: ${problem.what}`)
    expect(problems).toEqual([
      'action odd: unknown stat "debt"',
      'action odd: unknown stat "gold"',
      'action odd: unknown storyline "nobody"',
      'action odd: no custom value named "game/nothing"',
      'action odd: unknown kind "ghosts"',
      'action odd: an amount is a number, a stat id, a formula, { stat }, { kv }, { value } or { count }; this one is [3]',
    ])
  })
})
