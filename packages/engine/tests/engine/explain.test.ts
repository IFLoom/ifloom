import { describe, expect, it } from 'vitest'
import { holds } from '../../src/condition.ts'
import { explain, explainText } from '../../src/explain.ts'
import { begin, fixture } from '../fixtures/town.ts'

describe('explain', () => {
  const game = fixture()
  const state = begin(game, { flags: { metRosa: true }, stats: { intelligence: 12, coins: 3, luck: 0 } })
  const condition = {
    all: [
      { flag: 'metRosa' },
      { any: [{ stat: 'coins', gte: 5 }, { tier: 'intelligence', gte: 1 }] },
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

  it('says what each leaf read and what it wanted', () => {
    const [, either, notOpen] = explain(state, condition, game).parts ?? []
    expect(either.parts?.[0].why).toBe('stat coins is 3; wants 5 or more')
    expect(either.parts?.[1].why).toBe('stat intelligence is in band 1; wants band 1 or more')
    expect(notOpen.parts?.[0].why).toBe('phase is open; wants one of open')
  })

  it('prints as an indented tree for a log or a debug panel', () => {
    const text = explainText(explain(state, condition, game))
    expect(text.split('\n')[0]).toBe('✗ all of 3: 1 fail')
    expect(text).toContain('    ✗ stat coins is 3; wants 5 or more')
  })
})
