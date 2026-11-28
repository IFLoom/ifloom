import { describe, expect, it } from 'vitest'
import { checkGame, describeProblem } from '../../src/check.ts'
import { holds } from '../../src/condition.ts'
import { explain } from '../../src/explain.ts'
import { startingState } from '../../src/intake.ts'
import { loadGame } from '../../src/loader.ts'
import { definePlugin } from '../../src/plugin.ts'
import { applyEffects } from '../../src/reduce.ts'
import type { Game } from '../../src/game.ts'

/** A jar of sweets, which only its own effect fills, and which content reads through its values. */
const jar = definePlugin<{ sweets: Record<string, number> }>({
  id: 'jar',
  version: 1,
  start: () => ({ sweets: {} }),
  effects: {
    fill: (_state, args, { slice, set }) => {
      const sweet = String(args.sweet)
      return set({ sweets: { ...slice.sweets, [sweet]: (slice.sweets[sweet] ?? 0) + Number(args.by ?? 1) } })
    },
  },
  values: {
    count: (_state, args, { slice }) => slice.sweets[String(args.sweet)] ?? 0,
    favourite: (_state, _args, { slice }) => Object.entries(slice.sweets).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '',
  },
})

function game(): Game {
  const loaded = loadGame([{ name: 'shop', scenes: [{ id: 'counter', title: 'The counter', body: [], choices: [] }] }], {
    id: 'shop',
    title: 'The Shop',
    plugins: [jar],
    rules: { values: { mood: () => 'sunny' } },
  })
  expect(loaded.problems.map(describeProblem)).toEqual([])
  return loaded.game
}

describe('the value condition', () => {
  it('compares a plugin’s value as kv compares a key: a range, is, or set', () => {
    const g = game()
    const state = applyEffects(startingState(g), g, [{ 'jar/fill': { sweet: 'toffee', by: 2 } }])
    expect(holds(state, g, { value: 'jar/count', with: { sweet: 'toffee' }, gte: 2 })).toBe(true)
    expect(holds(state, g, { value: 'jar/count', with: { sweet: 'toffee' }, gt: 2 })).toBe(false)
    expect(holds(state, g, { value: 'jar/count', with: { sweet: 'toffee' }, is: 2 })).toBe(true)
    expect(holds(state, g, { value: 'jar/count', with: { sweet: 'toffee' } })).toBe(true)
    // 0 and '' aren't set, and text counts as 0 in a range.
    expect(holds(state, g, { value: 'jar/count', with: { sweet: 'mint' } })).toBe(false)
    expect(holds(startingState(g), g, { value: 'jar/favourite' })).toBe(false)
    expect(holds(state, g, { value: 'jar/favourite', is: ['toffee', 'mint'] })).toBe(true)
    expect(holds(state, g, { value: 'jar/favourite', gte: 1 })).toBe(false)
  })

  it('reads the game’s own values, and never holds for one nobody declares', () => {
    const g = game()
    const state = startingState(g)
    expect(holds(state, g, { value: 'game/mood', is: 'sunny' })).toBe(true)
    expect(holds(state, g, { value: 'game/missing', is: 0 })).toBe(false)
    expect(holds(state, g, { value: 'game/missing', lte: 0 })).toBe(false)
  })

  it('takes amounts as its bounds', () => {
    const g = game()
    const state = applyEffects(startingState(g), g, [{ 'jar/fill': { sweet: 'toffee', by: 3 } }, { kv: 'wanted', to: 3 }])
    expect(holds(state, g, { value: 'jar/count', with: { sweet: 'toffee' }, gte: { kv: 'wanted' } })).toBe(true)
  })

  it('explains what it read and what it wanted', () => {
    const g = game()
    const state = startingState(g)
    expect(explain(state, g, { value: 'jar/count', with: { sweet: 'toffee' }, gte: 1 }).why).toBe('value jar/count is 0; wants 1 or more')
    expect(explain(state, g, { value: 'game/missing' }).why).toBe('value game/missing is not declared; wants set')
  })

  it('is checked for a value nobody declares', () => {
    const g = game()
    const broken = {
      ...g,
      scenes: [{ id: 'counter', title: 'The counter', body: [], choices: [{ id: 'buy', label: 'Buy', when: { value: 'jar/nope' } }] }],
    } as Game
    expect(checkGame(broken).problems.map(describeProblem).join('\n')).toContain('jar/nope')
  })
})
