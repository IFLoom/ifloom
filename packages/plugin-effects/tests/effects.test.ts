import { describe, expect, it } from 'vitest'
import {
  SCHEMA,
  apply,
  createRunner,
  holds,
  loadGame,
  loadState,
  replay,
  startingState,
  statValue,
  view,
  whyNot,
  type Command,
  type Game,
  type GameState,
  type Pack,
} from '@ifloom/engine'
import { applyEffect, effectActive, effects, removeEffect, type EffectDef, type EffectsView } from '../src/index.ts'

const caffeinated: EffectDef = {
  id: 'caffeinated',
  label: 'Caffeinated',
  turns: 2,
  modifiers: [{ stat: 'energy', add: 10 }],
  onStart: [{ kind: 'kv', key: 'buzzing', to: true }],
  onEnd: [{ kind: 'kv', key: 'buzzing', to: false }],
}
/** A cold: a stack per sneeze, at most three, each taking a fifth off energy and a coin a turn for tissues. */
const cold: EffectDef = {
  id: 'cold',
  label: 'A cold',
  turns: 3,
  reapply: 'stack',
  max: 3,
  modifiers: [{ stat: 'energy', multiply: 0.8 }],
  onStart: [{ kind: 'stat', key: 'sneezes', by: 1 }],
  eachTurn: [{ kind: 'stat', key: 'coins', by: -1 }],
  onEnd: [{ kind: 'stat', key: 'recovered', by: 1 }],
}

function game(extra: EffectDef[] = []): Game {
  const town: Pack = {
    id: 'town',
    schema: SCHEMA,
    stats: [
      { id: 'energy', label: 'Energy', start: 50, spendable: true },
      { id: 'coins', label: 'Coins', start: 20, max: 999 },
      { id: 'sneezes', label: 'Sneezes' },
      { id: 'recovered', label: 'Recovered' },
      { id: 'stamina', label: 'Stamina', derive: { scale: 'energy', by: 2 }, max: 1000 },
    ],
    activities: [
      { id: 'coffee', effects: [applyEffect('caffeinated')] },
      { id: 'sneeze', effects: [applyEffect('cold')] },
      { id: 'rest', effects: [{ kind: 'turn' }] },
      { id: 'cure', effects: [removeEffect('cold')] },
      { id: 'cureFully', effects: [removeEffect('cold', true)] },
      { id: 'climb', cost: { stats: { energy: 55 } } },
      { id: 'tire', effects: [{ kind: 'stat', key: 'energy', by: -10 }] },
    ],
    data: { effects: { effects: [caffeinated, cold, ...extra] } },
  }
  const loaded = loadGame([town], { id: 'g', title: 'g', plugins: [effects()] })
  expect(loaded.problems).toEqual([])
  return loaded.game
}

function run(state: GameState, g: Game, ...ids: string[]): GameState {
  for (const id of ids) {
    const out = apply(state, g, { type: 'activity', id })
    expect(out.refused).toBeUndefined()
    state = out.state
  }
  return state
}

const fresh = (g: Game) => ({ ...startingState(g), sceneId: null })
const shown = (state: GameState, g: Game) => view(state, g).plugins.effects as EffectsView

describe('timed effects', () => {
  it('change what a stat reads while they last, and never write it', () => {
    const g = game()
    const state = run(fresh(g), g, 'coffee')
    expect(statValue(state, g, 'energy')).toBe(60)
    expect(state.stats.energy).toBe(50)
    expect(holds(state, { stat: 'energy', gte: 60 }, g)).toBe(true)
    expect(view(state, g).statsById.energy.value).toBe(60)
    // A derived stat reads the changed value.
    expect(statValue(state, g, 'stamina')).toBe(120)
    // A cost is checked against what the stat reads.
    expect(whyNot(state, g, { type: 'activity', id: 'climb' })).toBeUndefined()
    expect(whyNot(fresh(g), g, { type: 'activity', id: 'climb' })).toBeTruthy()
    // Effects write the kept value underneath.
    const tired = run(state, g, 'tire')
    expect(tired.stats.energy).toBe(40)
    expect(statValue(tired, g, 'energy')).toBe(50)
  })

  it('run onStart, count down at the end of each turn, and run onEnd when they run out', () => {
    const g = game()
    let state = run(fresh(g), g, 'coffee')
    expect(state.kv.buzzing).toBe(true)
    expect(shown(state, g).active).toEqual([
      { id: 'caffeinated', label: 'Caffeinated', summary: '', turnsLeft: 2, stacks: 1, modifiers: [{ stat: 'energy', add: 10 }] },
    ])
    state = run(state, g, 'rest')
    expect(shown(state, g).active[0].turnsLeft).toBe(1)
    expect(holds(state, effectActive('caffeinated'), g)).toBe(true)
    state = run(state, g, 'rest')
    expect(shown(state, g).active).toEqual([])
    expect(holds(state, effectActive('caffeinated'), g)).toBe(false)
    expect(state.kv.buzzing).toBe(false)
    expect(statValue(state, g, 'energy')).toBe(50)
  })

  it('refresh by default: applied again, the turns start over and onStart does not run again', () => {
    const g = game([{ id: 'count', label: 'Counted', turns: 2, onStart: [{ kind: 'stat', key: 'sneezes', by: 1 }] }])
    let state = run(fresh(g), g, 'rest')
    state = apply(state, g, { type: 'custom', name: 'effects/apply', with: { id: 'count' } }).state
    state = run(state, g, 'rest')
    state = apply(state, g, { type: 'custom', name: 'effects/apply', with: { id: 'count' } }).state
    expect(shown(state, g).active[0]).toMatchObject({ turnsLeft: 2, stacks: 1 })
    expect(state.stats.sneezes).toBe(1)
  })

  it('stack up to their max, each stack with its own turns, modifiers and hooks', () => {
    const g = game()
    let state = run(fresh(g), g, 'sneeze', 'rest', 'sneeze')
    expect(shown(state, g).active[0]).toMatchObject({ stacks: 2, turnsLeft: 3, modifiers: [{ stat: 'energy', multiply: 0.8 * 0.8 }] })
    expect(statValue(state, g, 'energy')).toBeCloseTo(32)
    expect(state.stats.sneezes).toBe(2)
    expect(holds(state, effectActive('cold', { gte: 2 }), g)).toBe(true)
    expect(holds(state, effectActive('cold', { gte: 3 }), g)).toBe(false)
    // One coin a turn for the first stack's first turn, then two a turn.
    expect(state.stats.coins).toBe(19)
    state = run(state, g, 'sneeze', 'sneeze')
    // At three, a fourth takes the oldest off and puts a fresh one on: no onStart.
    expect(shown(state, g).active[0]).toMatchObject({ stacks: 3 })
    expect(state.stats.sneezes).toBe(3)
    // The oldest stacks run out first, each running onEnd.
    state = run(state, g, 'rest', 'rest')
    expect(state.stats.coins).toBe(19 - 3 - 3)
    expect(state.stats.recovered).toBe(0)
    state = run(state, g, 'rest')
    expect(state.stats.recovered).toBe(3)
    expect(shown(state, g).active).toEqual([])
  })

  it('come off with effects/remove, running onEnd only when asked', () => {
    const g = game()
    const sick = run(fresh(g), g, 'sneeze', 'sneeze')
    const cured = run(sick, g, 'cure')
    expect(holds(cured, effectActive('cold'), g)).toBe(false)
    expect(cured.stats.recovered).toBe(0)
    const fully = run(sick, g, 'cureFully')
    expect(fully.stats.recovered).toBe(2)
  })

  it('take commands, refused for an unknown effect or one that is not active', () => {
    const g = game()
    const remove: Command = { type: 'custom', name: 'effects/remove', with: { id: 'cold' } }
    expect(whyNot(fresh(g), g, remove)).toBe('That isn’t affecting you.')
    expect(whyNot(fresh(g), g, { type: 'custom', name: 'effects/apply', with: { id: 'flu' } })).toBe('Nothing like that can happen.')
    const sick = run(fresh(g), g, 'sneeze')
    expect(holds(apply(sick, g, remove).state, effectActive('cold'), g)).toBe(false)
  })

  it('replay exactly from a command log', () => {
    const g = game()
    const runner = createRunner(g, fresh(g))
    for (const id of ['sneeze', 'coffee', 'rest', 'sneeze', 'rest', 'rest']) runner.apply({ type: 'activity', id })
    expect(replay(g, runner.log())).toEqual(runner.state)
  })

  it('load an old save that has no state for the plugin', () => {
    const g = game()
    const { plugins: _none, ...old } = fresh(g)
    const loaded = loadState(JSON.parse(JSON.stringify({ ...old, plugins: {} })), g)
    if (typeof loaded === 'string') throw new Error(loaded)
    expect(shown(loaded, g).active).toEqual([])
    expect(statValue(run(loaded, g, 'coffee'), g, 'energy')).toBe(60)
  })

  it('report effects that name what the game does not have, and their own mistakes', () => {
    const loaded = loadGame(
      [
        {
          id: 'mod',
          schema: SCHEMA,
          stats: [{ id: 'energy', label: 'Energy' }],
          activities: [{ id: 'x', effects: [applyEffect('flu')] }],
          data: {
            effects: {
              effects: [
                { id: 'bad', label: 'Bad', turns: 0, max: 2, modifiers: [{ stat: 'luck', add: 1 }], onEnd: [{ kind: 'item', id: 'moonstone', by: 1 }] },
              ],
            },
          },
        },
      ],
      { id: 'g', title: 'g', plugins: [effects()] },
    )
    expect(loaded.problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual([
      'activity x: unknown effect "flu"',
      'effects bad: unknown stat "luck"',
      'effects bad: onEnd: unknown item "moonstone"',
      'effects bad: turns must be 1 or more',
      'effects bad: max only applies with reapply: "stack"',
    ])
  })
})
