import { describe, expect, it } from 'vitest'
import {
  createRunner,
  entitiesOf,
  entityKv,
  entityName,
  holds,
  loadGame,
  loadState,
  replay,
  statValue,
  type Game,
  type GameState,
  type Content,
} from '@ifloom/engine'
import { freshState, loadChecked, play } from '@ifloom/engine/testing'
import { drawEntity, generators, templatesOf, type PoolDef, type TemplateDef } from '../src/index.ts'

const pools: PoolDef[] = [
  { id: 'first', values: ['Ana', 'Ben', 'Cleo', 'Dev', 'Esme', 'Finn'] },
  { id: 'last', values: ['Hart', 'Moss', 'Reed'] },
  // Most people walk; a few have a dog; one in a hundred a parrot.
  {
    id: 'company',
    values: [
      { value: 'none', weight: 60 },
      { value: 'dog', weight: 39 },
      { value: 'parrot', weight: 1 },
    ],
  },
]
const visitor: TemplateDef = {
  id: 'visitor',
  of: 'visitor',
  name: { join: [{ pool: 'first' }, { pool: 'last' }] },
  stats: { mood: { between: [1, 5] }, patience: 3 },
  kv: { company: { pool: 'company' }, local: true },
}

function game(): Game {
  const town: Content = {
    name: 'town',
    kinds: [{ id: 'visitor', label: 'Visitor' }],
    stats: [
      { id: 'mood', label: 'Mood', of: 'visitor', max: 5 },
      { id: 'patience', label: 'Patience', of: 'visitor' },
    ],
    actions: [
      { id: 'crowd', effects: [generators.generate('visitor', 3)] },
      { id: 'one', effects: [generators.generate('visitor')] },
      { id: 'sleep', effects: [{ turn: true }] },
    ],
    data: { generators: { pools, templates: [visitor] } },
  }
  return loadChecked([town], { id: 'g', title: 'g', plugins: [generators()] })
}

/** Each action in turn, by id. */
const run = (state: GameState, g: Game, ...ids: string[]): GameState => play(state, g, ...ids.map((id) => ({ type: 'action', id }) as const))

const fresh = (g: Game, seed = 7) => freshState(g, { seed })
/** Each visitor as it reads: its name, its stats and its kv store. */
const visitors = (state: GameState, g: Game) =>
  entitiesOf(state, g, 'visitor').map((ref) => ({
    name: entityName(state, g, ref),
    stats: { mood: statValue(state, g, 'mood', ref), patience: statValue(state, g, 'patience', ref) },
    kv: entityKv(state, g, ref),
  }))

describe('generators', () => {
  it('make entities of a kind from a template: pools, ranges and fixed values', () => {
    const g = game()
    const state = run(fresh(g), g, 'crowd')
    expect(entitiesOf(state, g, 'visitor')).toEqual(['visitor:#1', 'visitor:#2', 'visitor:#3'])
    for (const made of visitors(state, g)) {
      expect(made.name).toMatch(/^(Ana|Ben|Cleo|Dev|Esme|Finn) (Hart|Moss|Reed)$/)
      expect(made.stats.mood).toBeGreaterThanOrEqual(1)
      expect(made.stats.mood).toBeLessThanOrEqual(5)
      expect(made.stats.patience).toBe(3)
      expect(['none', 'dog', 'parrot']).toContain(made.kv.company)
      expect(made.kv.local).toBe(true)
    }
    expect(holds(state, g, { count: 'visitor', gte: 3 })).toBe(true)
  })

  it('draw each one differently, and the same again from the same save', () => {
    const g = game()
    const once = visitors(run(fresh(g), g, 'crowd'), g)
    const again = visitors(run(fresh(g), g, 'crowd'), g)
    expect(again).toEqual(once)
    // Twenty visitors over different seeds aren't all the same person.
    const names = new Set(Array.from({ length: 20 }, (_, seed) => visitors(run(fresh(g, seed), g, 'one'), g)[0].name))
    expect(names.size).toBeGreaterThan(5)
    // One at a time makes the same three as three at once.
    expect(visitors(run(fresh(g), g, 'one', 'one', 'one'), g)).toEqual(once)
  })

  it('pick from a pool by weight', () => {
    const g = game()
    const template = templatesOf(g)[0]
    const company = Array.from({ length: 400 }, (_, n) => drawEntity(fresh(g), g, template, n + 1).kv.company)
    const dogs = company.filter((value) => value === 'dog').length
    const nobody = company.filter((value) => value === 'none').length
    expect(nobody).toBeGreaterThan(dogs)
    expect(dogs).toBeGreaterThan(100)
  })

  it('replay exactly, and an old save loads', () => {
    const g = game()
    const runner = createRunner(g, fresh(g))
    for (const id of ['crowd', 'sleep', 'one', 'crowd']) runner.apply({ type: 'action', id })
    expect(entitiesOf(runner.state, g, 'visitor')).toHaveLength(7)
    expect(replay(g, runner.log())).toEqual({ ok: true, value: runner.state })
    const { plugins: _none, ...old } = fresh(g)
    const loadedRead = loadState(JSON.parse(JSON.stringify({ ...old, plugins: {} })), g)
    if (!loadedRead.ok) throw new Error(loadedRead.reason)
    const loaded = loadedRead.value
    expect(visitors(run(loaded, g, 'one'), g)).toHaveLength(1)
  })

  it('make one like another, with a description, a picture, tags, traits and a holder, keeping only the stats that differ', () => {
    const regular: TemplateDef = {
      id: 'regular',
      like: 'visitor:pattern',
      description: { pool: 'company' },
      image: 'art/visitor.png',
      tags: ['regular'],
      traits: { 'town/seat': { table: 2 } },
      at: 'player',
      stats: { mood: { between: [1, 1] }, patience: 0 },
    }
    const { game: g, problems } = loadGame(
      [
        {
          name: 'town',
          kinds: [{ id: 'visitor', label: 'Visitor', unique: true }],
          stats: [
            { id: 'mood', label: 'Mood', of: 'visitor', max: 5 },
            { id: 'patience', label: 'Patience', of: 'visitor' },
          ],
          entities: [{ id: 'pattern', of: 'visitor', name: 'A regular', stats: { mood: 1, patience: 4 } }],
          actions: [{ id: 'one', effects: [generators.generate('regular')] }],
          data: { generators: { pools, templates: [regular] } },
        },
      ],
      { id: 'g', title: 'g', plugins: [generators()] },
    )
    expect(problems).toEqual([])
    const state = run(fresh(g), g, 'one')
    const record = state.entities.visitor['#1']
    // The mood drawn is the pattern's, so it isn't kept; the patience differs from the pattern's 4, so it is.
    expect(record).toMatchObject({
      like: 'visitor:pattern',
      image: 'art/visitor.png',
      tags: ['regular'],
      traitData: { 'town/seat': { table: 2 } },
      stats: { patience: 0 },
    })
    expect(['none', 'dog', 'parrot']).toContain(record.description)
    expect(record.stats).not.toHaveProperty('mood')
    expect(entityName(state, g, 'visitor:#1')).toBe('A regular')
    expect(state.held.player).toEqual({ 'visitor:#1': 1 })
  })

  it('report templates and pools that name what the game does not have, and their own mistakes', () => {
    const loaded = loadGame(
      [
        {
          name: 'mod',
          kinds: [{ id: 'stall', label: 'Stall' }],
          actions: [
            { id: 'x', effects: [generators.generate('nope')] },
            { id: 'y', effects: [generators.generate('ghost', 0)] },
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
      'action x: unknown template "nope"',
      'action y: count must be a whole number, 1 or more',
      'templates ghost: unknown kind "ghost"',
      'templates ghost: no ghost stat named "fear"',
      'templates ghost: unknown pool "names"',
      'pools empty: has nothing to pick: no values, or every weight is 0',
      'templates ghost: stat fear: between [5, 1] runs backwards',
    ])
  })
})
