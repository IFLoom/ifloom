import { describe, expect, it } from 'vitest'
import {
  SCHEMA,
  apply,
  createRunner,
  entitiesOf,
  entityOf,
  holds,
  loadGame,
  loadState,
  replay,
  startingState,
  type Game,
  type GameState,
  type Pack,
} from '@ifloom/engine'
import { drawEntity, generate, generators, templateDefs, type PoolDef, type TemplateDef } from '../src/index.ts'

const pools: PoolDef[] = [
  { id: 'first', values: ['Ana', 'Ben', 'Cleo', 'Dev', 'Esme', 'Finn'] },
  { id: 'last', values: ['Hart', 'Moss', 'Reed'] },
  // Most people walk; a few have a dog; one in a hundred a parrot.
  { id: 'company', values: [{ value: 'none', weight: 60 }, { value: 'dog', weight: 39 }, { value: 'parrot', weight: 1 }] },
]
const visitor: TemplateDef = {
  id: 'visitor',
  of: 'visitor',
  name: { join: [{ pool: 'first' }, { pool: 'last' }] },
  stats: { mood: { between: [1, 5] }, patience: 3 },
  kv: { company: { pool: 'company' }, local: true },
}

function game(): Game {
  const town: Pack = {
    id: 'town',
    schema: SCHEMA,
    kinds: [{ id: 'visitor', label: 'Visitor' }],
    stats: [
      { id: 'mood', label: 'Mood', of: 'visitor', max: 5 },
      { id: 'patience', label: 'Patience', of: 'visitor' },
    ],
    activities: [
      { id: 'crowd', effects: [generate('visitor', 3)] },
      { id: 'one', effects: [generate('visitor')] },
      { id: 'sleep', effects: [{ kind: 'turn' }] },
    ],
    data: { generators: { pools, templates: [visitor] } },
  }
  const loaded = loadGame([town], { id: 'g', title: 'g', plugins: [generators()] })
  expect(loaded.problems).toEqual([])
  return loaded.game
}

function run(state: GameState, g: Game, ...ids: string[]): GameState {
  for (const id of ids) {
    const out = apply(state, g, { type: 'activity', id })
    expect(out.reason).toBeUndefined()
    state = out.state
  }
  return state
}

const fresh = (g: Game, seed = 7) => ({ ...startingState(g, { seed }), sceneId: null })
const visitors = (state: GameState) => entitiesOf(state, 'visitor').map((ref) => entityOf(state, ref)!)

describe('generators', () => {
  it('make entities of a kind from a template: pools, ranges and fixed values', () => {
    const g = game()
    const state = run(fresh(g), g, 'crowd')
    expect(entitiesOf(state, 'visitor')).toEqual(['visitor:#1', 'visitor:#2', 'visitor:#3'])
    for (const made of visitors(state)) {
      expect(made.name).toMatch(/^(Ana|Ben|Cleo|Dev|Esme|Finn) (Hart|Moss|Reed)$/)
      expect(made.stats.mood).toBeGreaterThanOrEqual(1)
      expect(made.stats.mood).toBeLessThanOrEqual(5)
      expect(made.stats.patience).toBe(3)
      expect(['none', 'dog', 'parrot']).toContain(made.kv.company)
      expect(made.kv.local).toBe(true)
    }
    expect(holds(state, { count: 'visitor', gte: 3 }, g)).toBe(true)
  })

  it('draw each one differently, and the same again from the same save', () => {
    const g = game()
    const once = visitors(run(fresh(g), g, 'crowd'))
    const again = visitors(run(fresh(g), g, 'crowd'))
    expect(again).toEqual(once)
    // Twenty visitors over different seeds aren't all the same person.
    const names = new Set(Array.from({ length: 20 }, (_, seed) => visitors(run(fresh(g, seed), g, 'one'))[0].name))
    expect(names.size).toBeGreaterThan(5)
    // One at a time makes the same three as three at once.
    expect(visitors(run(fresh(g), g, 'one', 'one', 'one'))).toEqual(once)
  })

  it('pick from a pool by weight', () => {
    const g = game()
    const template = templateDefs(g)[0]
    const company = Array.from({ length: 400 }, (_, n) => drawEntity(template, fresh(g), g, n + 1).kv.company)
    const dogs = company.filter((value) => value === 'dog').length
    const nobody = company.filter((value) => value === 'none').length
    expect(nobody).toBeGreaterThan(dogs)
    expect(dogs).toBeGreaterThan(100)
  })

  it('replay exactly, and an old save loads', () => {
    const g = game()
    const runner = createRunner(g, fresh(g))
    for (const id of ['crowd', 'sleep', 'one', 'crowd']) runner.apply({ type: 'activity', id })
    expect(entitiesOf(runner.state, 'visitor')).toHaveLength(7)
    expect(replay(g, runner.log())).toEqual({ ok: true, value: runner.state })
    const { plugins: _none, ...old } = fresh(g)
    const loadedRead = loadState(JSON.parse(JSON.stringify({ ...old, plugins: {} })), g)
    if (!loadedRead.ok) throw new Error(loadedRead.reason)
    const loaded = loadedRead.value
    expect(visitors(run(loaded, g, 'one'))).toHaveLength(1)
  })

  it('report templates and pools that name what the game does not have, and their own mistakes', () => {
    const loaded = loadGame(
      [
        {
          id: 'mod',
          schema: SCHEMA,
          kinds: [{ id: 'stall', label: 'Stall' }],
          activities: [
            { id: 'x', effects: [generate('nope')] },
            { id: 'y', effects: [generate('ghost', 0)] },
          ],
          data: {
            generators: {
              pools: [{ id: 'empty', values: [{ value: 'a', weight: 0 }] }],
              templates: [{ id: 'ghost', of: 'ghost', name: { pool: 'names' }, stats: { fear: { between: [5, 1] } } }],
            },
          },
        },
      ],
      { id: 'g', title: 'g', plugins: [generators()] },
    )
    expect(loaded.problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual([
      'activity x: unknown template "nope"',
      'activity y: count must be a whole number, 1 or more',
      'templates ghost: unknown kind "ghost"',
      'templates ghost: no ghost stat named "fear"',
      'templates ghost: unknown pool "names"',
      'pools empty: has nothing to pick: no values, or every weight is 0',
      'templates ghost: stat fear: between [5, 1] runs backwards',
    ])
  })
})
