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
      body: [{ prose: 'counter' }],
      choices: [
        {
          id: 'cake',
          label: 'Buy a slice of cake',
          cost: { stats: { coins: 2 }, reasons: { coins: 'Cake is two coins.' } },
          effects: [{ kv: 'cake', to: true }],
        },
        { id: 'usual', labels: [{ when: { kv: 'regular' }, label: 'The usual, please' }], label: 'Something warm', effects: [] },
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
  prose: { counter: 'The cake looks good.' },
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

  it('read a label as written, and labels by state, for choices and actions alike', () => {
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

  it('report a label written as a prose key the game has, as content wrote one before schema 25', () => {
    const old: Content = {
      ...cafe,
      prose: { ...cafe.prose, 'counter.usual': 'Something warm', 'counter#leave': 'Leave' },
      scenes: [{ id: 'counter', body: [{ prose: 'counter' }], choices: [{ id: 'usual', label: 'counter.usual' }, { id: 'leave' }] }],
    }
    const { problems } = loadGame([old], { id: 'cafe', title: 'Café' })
    expect(problems.map(describeProblem)).toEqual([
      'cafe · scene counter · label "counter.usual" names the prose "counter.usual", but a label is words written in place now (schema 25): write the words',
      'cafe · scene counter · no label: its words are no longer read from the prose "counter#leave" (schema 25), so give it label: "Leave"',
    ])
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
