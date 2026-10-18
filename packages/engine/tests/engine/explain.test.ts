import { describe, expect, it } from 'vitest'
import { holds } from '../../src/condition.ts'
import { explain, explainText } from '../../src/explain.ts'
import { begin, fixture } from '../fixtures/town.ts'

describe('explain', () => {
  const game = fixture()
  const state = begin(game, { kv: { metRosa: true }, stats: { intelligence: 12, coins: 3, luck: 0 } })
  const condition = {
    all: [
      { kv: 'metRosa' },
      {
        any: [
          { stat: 'coins', gte: 5 },
          { level: 'intelligence', gte: 1 },
        ],
      },
      { not: { phase: ['open'] } },
    ],
  }

  it('agrees with holds, and marks every part true or false', () => {
    const answer = explain(state, condition, game)
    expect(answer.holds).toBe(holds(state, condition, game))
    expect(answer.holds).toBe(false)
    expect(answer.parts?.map((part) => part.holds)).toEqual([true, true, false])
    expect(answer.parts?.[1].parts?.map((part) => part.holds)).toEqual([false, true])
  })

  it('holds nowhere for a condition with two kinds, rather than picking one, and says why', () => {
    // Before core features registered, `flag` (now `kv`) was asked first here and the condition held.
    const two = { kv: 'metRosa', phase: ['open'] } as never
    expect(holds(state, two, game)).toBe(false)
    expect(explain(state, two, game)).toEqual({ holds: false, why: 'a condition with 2 kinds (kv, phase); wants one' })
    const both = { all: [{ kv: 'metRosa' }], not: { kv: 'metRosa' } } as never
    expect(explain(state, both, game)).toEqual({ holds: false, why: 'a condition with 2 kinds (all, not); wants one' })
  })

  it('says what each leaf read and what it wanted', () => {
    const [, either, notOpen] = explain(state, condition, game).parts ?? []
    expect(either.parts?.[0].why).toBe('stat coins is 3; wants 5 or more')
    expect(either.parts?.[1].why).toBe('stat intelligence is at level 1; wants 1 or more')
    expect(notOpen.parts?.[0].why).toBe('phase is open; wants one of open')
  })

  it('prints as an indented tree for a log or a debug panel', () => {
    const text = explainText(explain(state, condition, game))
    expect(text.split('\n')[0]).toBe('✗ all of 3: 1 fail')
    expect(text).toContain('    ✗ stat coins is 3; wants 5 or more')
  })
})
