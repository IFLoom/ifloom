import { describe, expect, expectTypeOf, it } from 'vitest'
import { applyEffects } from '../../src/reduce.ts'
import { checkGame } from '../../src/check.ts'
import { callOf } from '../../src/calls.ts'
import type { Effect } from '../../src/types.ts'
import { begin, fixture } from '../fixtures/town.ts'

describe('effects told apart by their key', () => {
  it('apply as conditions are written: the key names the target', () => {
    const game = fixture()
    const state = applyEffects(begin(game), game, [
      { stat: 'coins', by: -2 },
      { kv: 'met', to: true },
      { scene: 'rosa.hello' },
      { notify: 'Rent day', tag: 'money' },
    ])
    expect(state.stats.coins).toBe(1)
    expect(state.kv.met).toBe(true)
    expect(state.sceneId).toBe('rosa.hello')
    expect(state.notices.at(-1)).toMatchObject({ title: 'Rent day', tag: 'money' })
  })

  it('narrow by their key in TypeScript', () => {
    const effect = { stat: 'coins', by: 1 } as Effect
    if ('stat' in effect) expectTypeOf(effect.stat).toEqualTypeOf<string>()
    if ('scene' in effect) expectTypeOf(effect.scene).toEqualTypeOf<string | null | { from: string; otherwise?: string }>()
    expect(callOf({ 'calendar/pass': { by: 2 } })).toEqual({ name: 'calendar/pass', with: { by: 2 } })
    expect(callOf({ stat: 'coins', by: 1 })).toBeUndefined()
  })

  it('are reported with two keys, with none, or in the old form', () => {
    const game = {
      ...fixture(),
      actions: [{ id: 'odd', effects: [{ stat: 'coins', kv: 'met', by: 1 }, { by: 1 }, { kind: 'stat', stat: 'coins', by: 1 }] as never }],
    }
    expect(checkGame(game).problems.map((problem) => problem.what)).toEqual([
      'an effect does one thing, but this one has 2 keys that each say what it does: stat, kv',
      'an effect needs one key that says what it does, such as stat or kv, or a call by name; this one has only "by"',
      'effects are told apart by their key now, as { stat: … }, not { kind: "stat" }',
    ])
  })
})
