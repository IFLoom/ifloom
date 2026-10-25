import { describe, expect, it } from 'vitest'
import { holds } from '../../src/condition.ts'
import { explain, explainText } from '../../src/explain.ts'
import type { Game } from '../../src/game.ts'
import { loadGame, type Content } from '../../src/loader.ts'
import { describeProblem } from '../../src/check.ts'
import { apply } from '../../src/reduce.ts'
import { startingState } from '../../src/intake.ts'
import { statLevel, statValue, type Formula, type StatDef } from '../../src/stats.ts'
import { problemsOf } from '../fixtures/checked.ts'
import { view } from '../../src/view.ts'
import { begin, fixture } from '../fixtures/town.ts'

/** The town fixture with more stats: two kept ones, and whatever a test derives from them. */
function withStats(...more: StatDef[]): Game {
  const game = fixture()
  return {
    ...game,
    stats: [...game.stats!, { id: 'baking', label: 'Baking', start: 4 }, { id: 'patience', label: 'Patience', start: 6 }, ...more],
    actions: [
      ...(game.actions ?? []),
      { id: 'bake', effects: [{ stat: 'baking', by: 5 }] },
      { id: 'set', effects: [{ stat: 'skill', to: 50 }] },
      { id: 'nudge', effects: [{ stat: 'skill', by: 5 }] },
    ],
  }
}

const derived = (derive: Formula, extra: Partial<StatDef> = {}): Game => withStats({ id: 'skill', label: 'Skill', derive, ...extra })

describe('derived stats', () => {
  it('work out each kind of formula', () => {
    const value = (formula: Formula) => {
      const game = derived(formula, { min: -100, max: 1000 })
      return statValue(startingState(game), game, 'skill')
    }
    expect(value(7)).toBe(7)
    expect(value('baking')).toBe(4)
    expect(value({ sum: ['baking', 'patience', 1] })).toBe(11)
    expect(value({ product: ['baking', 'patience'] })).toBe(24)
    expect(value({ min: ['baking', 'patience'] })).toBe(4)
    expect(value({ max: ['baking', 'patience'] })).toBe(6)
    expect(value({ scale: 'patience', by: 0.5 })).toBe(3)
    expect(value({ clamp: { sum: ['baking', 'patience'] }, max: 8 })).toBe(8)
    expect(value({ clamp: -5, min: 0 })).toBe(0)
    // Formulas nest, and one derived stat can read another.
    const chain = withStats({ id: 'skill', label: 'Skill', derive: { sum: ['twice', 1] } }, { id: 'twice', label: 'Twice', derive: { scale: 'baking', by: 2 } })
    expect(statValue(startingState(chain), chain, 'skill')).toBe(9)
  })

  it('are held to the stat’s range', () => {
    const game = derived({ product: ['baking', 'patience', 10] })
    expect(statValue(startingState(game), game, 'skill')).toBe(100)
  })

  it('are read like any stat: conditions, the view, explanations', () => {
    const game = derived({ sum: ['baking', 'patience'] })
    const state = begin(game)
    expect(state.stats.skill).toBeUndefined()
    expect(holds(state, game, { stat: 'skill', gte: 10 })).toBe(true)
    expect(holds(state, game, { stat: 'skill', gt: 10 })).toBe(false)
    expect(view(state, game).statsById.skill).toMatchObject({ value: 10, text: '10' })
    expect(explainText(explain(state, game, { stat: 'skill', gte: 11 }))).toContain('stat skill is 10')
    const baked = apply(state, game, { type: 'action', id: 'bake' }).state
    expect(view(baked, game).statsById.skill.value).toBe(15)
  })

  it('are never written: the effects do nothing, and the loader says so', () => {
    const game = derived({ sum: ['baking', 'patience'] })
    for (const id of ['set', 'nudge']) {
      const after = apply(begin(game), game, { type: 'action', id }).state
      expect(after.stats.skill).toBeUndefined()
      expect(statValue(after, game, 'skill')).toBe(10)
    }
    expect(problemsOf(game)).toEqual(expect.arrayContaining(['action set: stat "skill" is derived: it is worked out, never written']))
    const pack: Content = {
      name: 'town',
      stats: [
        { id: 'baking', label: 'Baking' },
        { id: 'skill', label: 'Skill', derive: 'baking', spendable: true, start: 3 },
      ],
      actions: [{ id: 'set', effects: [{ stat: 'skill', to: 5 }], cost: { stats: { skill: 1 } } }],
    }
    const problems = loadGame([pack], { id: 'g', title: 'G' }).problems.map(describeProblem)
    expect(problems).toEqual(
      expect.arrayContaining([
        'town · action set · stat "skill" is derived: it is worked out, never written',
        'town · action set · spends stat "skill", which is derived and never written',
        'town · stat skill · a derived stat cannot be spendable: it is never written',
        'town · stat skill · a derived stat has no start: it is worked out',
      ]),
    )
  })

  it('work for an entity’s stats, reading the same entity', () => {
    const game: Game = {
      ...fixture(),
      kinds: [{ id: 'staff', label: 'Member of staff' }],
      stats: [
        ...fixture().stats!,
        { id: 'speed', label: 'Speed', of: 'staff', start: 3 },
        { id: 'care', label: 'Care', of: 'staff', start: 2 },
        { id: 'service', label: 'Service', of: 'staff', derive: { sum: ['speed', 'care'] } },
      ],
      entities: [
        { id: 'ana', of: 'staff', name: 'Ana', stats: { speed: 7 } },
        { id: 'ben', of: 'staff', name: 'Ben' },
      ],
    }
    const state = begin(game)
    expect(state.entities.staff?.ana?.stats?.service).toBeUndefined()
    expect(statValue(state, game, 'service', 'staff:ana')).toBe(9)
    expect(statValue(state, game, 'service', 'staff:ben')).toBe(5)
    expect(holds(state, game, { count: 'staff', where: { stat: 'service', of: '$', gte: 8 } })).toBe(true)
    expect(view(state, game).entities.staff.entries.map((entry) => entry.stats.find((stat) => stat.key === 'service')?.value)).toEqual([9, 5])
  })

  it('report unknown stats, another owner’s and cycles', () => {
    const pack: Content = {
      name: 'town',
      kinds: [{ id: 'staff', label: 'Staff' }],
      stats: [
        { id: 'speed', label: 'Speed', of: 'staff' },
        { id: 'a', label: 'A', derive: { sum: ['b', 'nothing'] } },
        { id: 'b', label: 'B', derive: { scale: 'a', by: 2 } },
        { id: 'c', label: 'C', derive: 'speed' },
      ],
    }
    const problems = loadGame([pack], { id: 'g', title: 'G' }).problems.map(describeProblem)
    expect(problems).toEqual(
      expect.arrayContaining([
        'town · stat a · derive reads unknown stat "nothing"',
        'town · stat a · derive goes round in a cycle: a → b → a',
        'town · stat c · derive reads stat "speed", which belongs to staff, not the player',
      ]),
    )
    expect(problems.filter((problem) => problem.includes('cycle'))).toHaveLength(1)
  })
})

describe('levels', () => {
  const levelled = (levels: StatDef['levels']) => withStats({ id: 'cooking', label: 'Cooking', levels })

  it('are where a stat stands against its thresholds', () => {
    const game = levelled({ at: [10, 30, 60] })
    const at = (value: number) => statLevel(begin(game, { stats: { ...startingState(game).stats, cooking: value } }), game, 'cooking')
    expect(at(0)).toEqual({ level: 0, next: 10, progress: 0 })
    expect(at(5)).toEqual({ level: 0, next: 10, progress: 0.5 })
    expect(at(10)).toEqual({ level: 1, next: 30, progress: 0 })
    expect(at(45)).toEqual({ level: 2, next: 60, progress: 0.5 })
    expect(at(80)).toEqual({ level: 3, next: null, progress: 1 })
    expect(statLevel(begin(game), game, 'baking')).toBeUndefined()
  })

  it('answer the level condition', () => {
    const game = levelled({ at: [10, 30] })
    const state = begin(game, { stats: { ...startingState(game).stats, cooking: 12 } })
    expect(holds(state, game, { level: 'cooking' })).toBe(true)
    expect(holds(state, game, { level: 'cooking', gte: 2 })).toBe(false)
    // A stat without levels is always level 0.
    expect(holds(state, game, { level: 'baking', lt: 1 })).toBe(true)
    expect(explainText(explain(state, game, { level: 'cooking', gte: 2 }))).toContain('stat cooking is at level 1')
  })

  it('show in the view only on a stat that has them', () => {
    const game = levelled({ at: [10, 30] })
    const stats = view(begin(game, { stats: { ...startingState(game).stats, cooking: 20 } }), game).statsById
    expect(stats.cooking.level).toEqual({ level: 1, next: 30, progress: 0.5 })
    expect(stats.baking).not.toHaveProperty('level')
  })

  it('raise a notice on a level-up only when the stat declares one', () => {
    const quiet = withStats({ id: 'cooking', label: 'Cooking', levels: { at: [5] } })
    const loud = withStats({ id: 'cooking', label: 'Cooking', levels: { at: [5, 10], notice: '{label} is now level {level}.' } })
    const cook = (game: Game, from: number) => {
      const withCook = { ...game, actions: [...(game.actions ?? []), { id: 'cook', effects: [{ stat: 'cooking', by: 3 }] }] }
      return apply(begin(withCook, { stats: { ...startingState(game).stats, cooking: from } }), withCook, { type: 'action', id: 'cook' }).state
    }
    expect(cook(quiet, 3).notices).toEqual([])
    // 3 to 6 passes 5.
    expect(cook(loud, 3).notices).toEqual([{ id: 'level.cooking', title: 'Cooking is now level 1.', tag: 'level', turn: 2, seen: false }])
    // 6 to 9 stays at level 1.
    expect(cook(loud, 6).notices).toEqual([])
  })

  it('report thresholds out of order or outside the range', () => {
    const pack: Content = {
      name: 'town',
      stats: [
        { id: 'a', label: 'A', levels: { at: [10, 5] } },
        { id: 'b', label: 'B', max: 50, levels: { at: [10, 60] } },
        { id: 'c', label: 'C', levels: { at: [] } },
      ],
    }
    const problems = loadGame([pack], { id: 'g', title: 'G' }).problems.map(describeProblem)
    expect(problems).toEqual([
      'town · stat a · levels.at must go up, each threshold above the last',
      "town · stat b · levels.at 60 outside the stat's range (0 to 50)",
      'town · stat c · levels.at needs at least one threshold',
    ])
  })
})
