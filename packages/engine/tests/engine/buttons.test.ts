import { describe, expect, it } from 'vitest'
import { loadGame, type Content } from '../../src/loader.ts'
import { apply } from '../../src/reduce.ts'
import { startingState } from '../../src/intake.ts'
import { view } from '../../src/view.ts'
import { describeProblem } from '../../src/check.ts'
import { upgradePack } from '../../src/upgrade.ts'
import { unwrap } from '../fixtures/result.ts'

/** A café counter: a choice with a cost, and actions with the fields a choice has. */
const cafe: Content = {
  name: 'cafe',
  stats: [{ id: 'coins', label: 'Coins', start: 3, spendable: true }],
  kv: { regular: false },
  scenes: [
    {
      id: 'counter',
      body: [{ text: 'counter' }],
      choices: [
        {
          id: 'cake',
          label: 'Buy a slice of cake',
          cost: { stats: { coins: 2 }, reasons: { coins: 'Cake is two coins.' } },
          effects: [{ kv: 'cake', to: true }],
        },
        { id: 'usual', labels: [{ when: { kv: 'regular' }, label: 'The usual, please' }], label: 'counter.usual', effects: [] },
        { id: 'leave', label: 'Leave', tags: ['exit'], irreversible: 'The café shuts behind you.', effects: [{ scene: null }] },
      ],
    },
  ],
  actions: [
    {
      id: 'tip',
      label: 'Leave a tip',
      labels: [{ when: { kv: 'regular' }, label: 'Tip as usual' }],
      tags: ['kind'],
      irreversible: 'A tip is a tip.',
      cost: { stats: { coins: 1 } },
      effects: [{ kv: 'tipped', to: true }],
    },
  ],
  prose: { counter: 'The cake looks good.', 'counter.usual': 'Something warm' },
}

const load = () => loadGame([cafe], { id: 'cafe', title: 'Café' })

describe('buttons', () => {
  it('give a choice a cost, priced, checked and spent through choose as an action’s is', () => {
    const { game, problems } = load()
    expect(problems).toEqual([])
    const at = { ...startingState(game), sceneId: 'counter' }
    const cake = view(at, game).scene.choices.find((choice) => choice.id === 'cake')!
    expect(cake).toMatchObject({ label: 'Buy a slice of cake', price: { stats: [{ id: 'coins', amount: 2, text: '2' }] } })
    const after = apply(at, game, { type: 'choose', id: 'cake' }).state
    expect([after.stats.coins, after.kv.cake]).toEqual([1, true])
    // Too little left: greyed out with the cost's own words, and refused with them.
    expect(view(after, game).scene.choices.find((choice) => choice.id === 'cake')?.disabled).toBe('Cake is two coins.')
    expect(apply(after, game, { type: 'choose', id: 'cake' })).toMatchObject({ ok: false, reason: 'Cake is two coins.' })
  })

  it('read a label as words, or as a prose key the game has, and labels by state, for choices and actions alike', () => {
    const { game } = load()
    const at = { ...startingState(game), sceneId: 'counter' }
    expect(view(at, game).scene.choices.map((choice) => [choice.id, choice.label])).toEqual([
      ['cake', 'Buy a slice of cake'],
      ['usual', 'Something warm'],
      ['leave', 'Leave'],
    ])
    const regular = { ...at, kv: { ...at.kv, regular: true } }
    expect(view(regular, game).scene.choices[1].label).toBe('The usual, please')
    const idle = { ...regular, sceneId: null }
    expect(view(idle, game).actions[0]).toMatchObject({ id: 'tip', label: 'Tip as usual', tags: ['kind'], irreversible: 'A tip is a tip.' })
    expect(view(at, game).scene.choices[2]).toMatchObject({ tags: ['exit'], irreversible: 'The café shuts behind you.' })
  })

  it('report a label that reads as a prose key with no prose', () => {
    const typo: Content = { ...cafe, scenes: [{ id: 'counter', body: [{ text: 'counter' }], choices: [{ id: 'usual', label: 'counter#usaul' }] }] }
    const { problems } = loadGame([typo], { id: 'cafe', title: 'Café' })
    expect(problems.map(describeProblem)).toContain('cafe · scene counter · no prose for "counter#usaul"')
  })

  it('call a minigame’s numbers its kv, from schema 22', () => {
    const old = { id: 'mod', schema: 21, minigames: [{ id: 'darts', start: 'throw', vars: { score: 0 }, states: { throw: { final: {} } } }] }
    expect(unwrap(upgradePack(old, [])).minigames).toEqual([{ id: 'darts', start: 'throw', kv: { score: 0 }, states: { throw: { final: {} } } }])
  })

  it('name a labels entry’s words label, from schema 22', () => {
    const old = {
      id: 'mod',
      schema: 21,
      scenes: [{ id: 'counter', body: [], choices: [{ id: 'usual', labels: [{ when: { kv: 'regular' }, key: 'counter#usual' }] }] }],
    }
    expect(unwrap(upgradePack(old, [])).scenes?.[0]).toMatchObject({
      choices: [{ id: 'usual', labels: [{ when: { kv: 'regular' }, label: 'counter#usual' }] }],
    })
  })
})
