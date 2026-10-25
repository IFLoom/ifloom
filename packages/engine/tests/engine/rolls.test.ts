import { describe, expect, it } from 'vitest'
import { apply } from '../../src/reduce.ts'
import { holds } from '../../src/condition.ts'
import { checkGame } from '../../src/check.ts'
import { explain } from '../../src/explain.ts'
import { view } from '../../src/view.ts'
import { replay } from '../../src/runner.ts'
import { readDice } from '../../src/features/rolls.ts'
import { fillTokens } from '../../src/prose.ts'
import type { Game } from '../../src/game.ts'
import type { Command, Effect, GameState } from '../../src/types.ts'
import { activities, begin, fixture } from '../fixtures/town.ts'

/** The town with activities that roll dice, and a trigger that rolls once the player has read. */
function withDice(extra: Effect[] = []): Game {
  return {
    ...fixture(),
    actions: [
      ...activities,
      { id: 'skim', effects: [{ roll: 'skim', dice: '2d6', against: 8 }] },
      {
        id: 'twice',
        effects: [
          { roll: 'first', dice: '1d20' },
          { roll: 'second', dice: '1d20' },
        ],
      },
      { id: 'clever', effects: [{ roll: 'think', dice: { count: 1, sides: 6 }, plus: { stat: 'intelligence' } }] },
      { id: 'coin', effects: [{ roll: 'coin', dice: 'd2+3' }] },
      { id: 'extra', effects: extra },
    ],
    triggers: [{ id: 'weather', when: { kv: 'outside' }, effects: [{ roll: 'weather', dice: 'd100' }] }],
  }
}

const act = (id: string): Command => ({ type: 'action', id })

function run(game: Game, state: GameState, ...commands: Command[]): GameState {
  return commands.reduce((next, command) => {
    const result = apply(next, game, command)
    if (!result.ok) throw new Error(`${JSON.stringify(command)}: ${result.reason}`)
    return result.state
  }, state)
}

describe('readDice', () => {
  it('reads notation and the object form', () => {
    expect(readDice('2d6+1')).toEqual({ count: 2, sides: 6, plus: 1 })
    expect(readDice('1d20')).toEqual({ count: 1, sides: 20, plus: 0 })
    expect(readDice('d100')).toEqual({ count: 1, sides: 100, plus: 0 })
    expect(readDice('3D8 - 2')).toEqual({ count: 3, sides: 8, plus: -2 })
    expect(readDice({ count: 2, sides: 10 })).toEqual({ count: 2, sides: 10, plus: 0 })
    expect(readDice({ sides: 4 })).toEqual({ count: 1, sides: 4, plus: 0 })
  })

  it('says what is wrong with dice it cannot read', () => {
    expect(readDice('2x6')).toEqual({ problem: 'dice "2x6" is not dice notation such as "2d6+1", "1d20" or "d100"' })
    expect(readDice('1d1')).toEqual({ problem: 'dice have 1 sides; a die needs at least 2' })
    expect(readDice('0d6')).toEqual({ problem: '0 dice; a roll throws 1 to 100' })
    expect(readDice({ count: 1.5, sides: 6 })).toHaveProperty('problem')
    expect(readDice(6)).toHaveProperty('problem')
  })
})

describe('the roll effect', () => {
  it('throws the dice, keeps the total in the kv store and records the roll', () => {
    const game = withDice()
    const state = run(game, begin(game), act('skim'))
    const [roll] = state.rolls.last
    expect(roll.key).toBe('skim')
    expect(roll.dice).toBe('2d6')
    expect(roll.faces).toHaveLength(2)
    for (const face of roll.faces) expect(face >= 1 && face <= 6).toBe(true)
    expect(roll.total).toBe(roll.faces[0] + roll.faces[1])
    expect(roll.plus).toBe(0)
    expect(roll.against).toBe(8)
    expect(roll.passed).toBe(roll.total >= 8)
    expect(state.kv.skim).toBe(roll.total)
    expect(state.rolls.latest.skim).toEqual(roll)
    expect(state.rolls.made).toBe(1)
    expect(fillTokens('You scored {{skim}}.', state, game)).toBe(`You scored ${roll.total}.`)
  })

  it('adds the notation’s own number and a stat’s value', () => {
    const game = withDice()
    const coin = run(game, begin(game), act('coin')).rolls.last[0]
    expect(coin.plus).toBe(3)
    expect(coin.total).toBe(coin.faces[0] + 3)
    const think = run(game, begin(game), act('clever')).rolls.last[0]
    expect(think.plus).toBe(5)
    expect(think.total).toBe(think.faces[0] + 5)
  })

  it('makes the same rolls on a replay, and different ones each time it is made', () => {
    const game = withDice()
    const start = begin(game, { seed: 7 })
    const commands = [act('skim'), act('skim'), act('twice')]
    const played = run(game, start, ...commands)
    const replayed = replay(game, { game: game.id, start, commands })
    expect(replayed.ok && replayed.value.rolls).toEqual(played.rolls)
    expect(replayed.ok && replayed.value.kv).toEqual(played.kv)
    // Each roll counts up the save's rolls, so trying again in the same turn draws afresh.
    let state = start
    const totals = new Set<string>()
    for (let n = 0; n < 12; n += 1) {
      state = run(game, state, act('twice'))
      totals.add(state.rolls.last.map((roll) => roll.faces.join(',')).join('|'))
    }
    expect(state.turn).toBe(start.turn)
    expect(totals.size).toBeGreaterThan(6)
    expect(state.rolls.made).toBe(24)
  })

  it('draws two rolls in one command from different seeds', () => {
    const game = withDice()
    // Over many seeds, the two d20s of one command are not the same draw.
    let same = 0
    for (let seed = 1; seed <= 40; seed += 1) {
      const [first, second] = run(game, begin(game, { seed }), act('twice')).rolls.last
      if (first.faces[0] === second.faces[0]) same += 1
    }
    expect(same).toBeLessThan(10)
  })

  it('flags a critical: every die on its top face or every die on 1', () => {
    const game = withDice()
    const seen = new Set<string | undefined>()
    for (let seed = 1; seed <= 200; seed += 1) {
      const roll = run(game, begin(game, { seed }), act('coin')).rolls.last[0]
      seen.add(roll.critical)
      expect(roll.critical).toBe(roll.faces[0] === 2 ? 'max' : 'min')
    }
    expect(seen).toEqual(new Set(['max', 'min']))
    for (let seed = 1; seed <= 100; seed += 1) {
      const roll = run(game, begin(game, { seed }), act('skim')).rolls.last[0]
      const want = roll.faces.every((face) => face === 6) ? 'max' : roll.faces.every((face) => face === 1) ? 'min' : undefined
      expect(roll.critical).toBe(want)
    }
  })

  it('rolls nothing for dice it cannot read', () => {
    const game = withDice([{ roll: 'bad', dice: '2x6' }])
    const state = run(game, begin(game), act('extra'))
    expect(state.rolls.made).toBe(0)
    expect(state.kv.bad).toBeUndefined()
  })
})

describe('the rolls in the view', () => {
  it('are the last command’s only, in order', () => {
    const game = withDice()
    const twice = run(game, begin(game), act('twice'))
    expect(view(twice, game).rolls.map((roll) => roll.key)).toEqual(['first', 'second'])
    const after = run(game, twice, act('wait'))
    expect(view(after, game).rolls).toEqual([])
    // The latest under each key stays for the condition.
    expect(after.rolls.latest.first).toEqual(twice.rolls.last[0])
    const again = run(game, after, act('skim'))
    expect(view(again, game).rolls.map((roll) => roll.key)).toEqual(['skim'])
  })

  it('include a roll a trigger made in the same command', () => {
    const game = withDice()
    const state = run(game, begin(game, { kv: { outside: true } }), act('skim'))
    expect(view(state, game).rolls.map((roll) => roll.key)).toEqual(['skim', 'weather'])
    expect(state.rolls.latest.weather.dice).toBe('1d100')
  })
})

describe('the roll condition', () => {
  it('asks whether a roll was made, passed or failed, and critical', () => {
    const game = withDice()
    const state = begin(game)
    expect(holds(state, { roll: 'skim' }, game)).toBe(false)
    const pass = { key: 'skim', dice: '2d6', faces: [6, 6], plus: 0, total: 12, against: 8, passed: true, critical: 'max' as const }
    const passed = { ...state, rolls: { made: 1, last: [], latest: { skim: pass } } }
    expect(holds(passed, { roll: 'skim' }, game)).toBe(true)
    expect(holds(passed, { roll: 'skim', passed: true }, game)).toBe(true)
    expect(holds(passed, { roll: 'skim', passed: false }, game)).toBe(false)
    expect(holds(passed, { roll: 'skim', critical: true }, game)).toBe(true)
    expect(holds(passed, { roll: 'skim', critical: 'max' }, game)).toBe(true)
    expect(holds(passed, { roll: 'skim', critical: 'min' }, game)).toBe(false)
    expect(holds(passed, { roll: 'skim', critical: false }, game)).toBe(false)
    const plain = { ...pass, faces: [3, 2], total: 5, passed: false, critical: undefined }
    const failed = { ...state, rolls: { made: 1, last: [], latest: { skim: plain } } }
    expect(holds(failed, { roll: 'skim', passed: false, critical: false }, game)).toBe(true)
    expect(explain(failed, { roll: 'skim', passed: true }, game).why).toBe('roll skim is 5 on 2d6, failed; wants passed')
  })
})

describe('checking rolls', () => {
  it('reports dice, keys, plus and against that are wrong, and an unknown stat', () => {
    const game = withDice([
      { roll: 'ok', dice: '2d6+1', plus: { stat: 'intelligence' }, against: 9 },
      { roll: 'bad', dice: '2x6' },
      { roll: 'one', dice: { sides: 1 } },
      { roll: '9lives', dice: 'd6' },
      { roll: 'strong', dice: 'd6', plus: { stat: 'strength' } },
      { roll: 'odd', dice: 'd6', plus: [2] as unknown as number, against: { stat: 'x' } },
    ])
    const problems = checkGame(game).problems.map((problem) => problem.what)
    expect(problems).toEqual([
      'dice "2x6" is not dice notation such as "2d6+1", "1d20" or "d100"',
      'dice have 1 sides; a die needs at least 2',
      'roll key "9lives" must be letters, digits and _, not starting with a digit, so {{key}} can show it',
      'roll plus: unknown stat "strength"',
      'roll plus: an amount is a number, a stat id, a formula, { stat }, { kv }, { value } or { count }; this one is [2]',
      'roll against: unknown stat "x"',
    ])
  })
})
