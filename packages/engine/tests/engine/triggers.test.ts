import { describe, expect, it } from 'vitest'
import { apply } from '../../src/reduce.ts'
import type { Game } from '../../src/game.ts'
import { begin, fixture } from '../fixtures/town.ts'

function withTriggers(): Game {
  return {
    ...fixture(),
    triggers: [
      // A note through the door the first time the player goes out.
      {
        id: 'note',
        when: { kv: 'at', is: 'street' },
        effects: [
          { kind: 'notify', title: 'A note on the mat' },
          { kind: 'kv', key: 'note', to: true },
        ],
      },
      // Fires off the one before it, in the same pass.
      { id: 'read', when: { kv: 'note' }, effects: [{ kind: 'stat', stat: 'intelligence', by: 1 }] },
      // Every turn the player is in the shop, once a turn.
      { id: 'smell', once: 'turn', when: { kv: 'at', is: 'shop' }, effects: [{ kind: 'stat', stat: 'luck', by: 1 }] },
      // Opens a scene, which counts as seen.
      { id: 'rosa', when: { kv: 'callRosa' }, effects: [{ kind: 'scene', scene: 'rosa.hello' }] },
    ],
  }
}

describe('triggers', () => {
  it('fire the first time their condition holds after a command, and only once', () => {
    const game = withTriggers()
    let state = apply(begin(game), game, { type: 'activity', id: 'go-street' }).state
    expect(state.notices.map((notice) => notice.title)).toEqual(['A note on the mat'])
    expect(state.stats.intelligence).toBe(6)
    state = apply(apply(state, game, { type: 'activity', id: 'go-house' }).state, game, { type: 'activity', id: 'go-street' }).state
    expect(state.notices).toHaveLength(1)
    expect(state.fired).toMatchObject({ note: 2, read: 2 })
  })

  it('can fire once a turn', () => {
    const game = withTriggers()
    const shop = begin(game, { kv: { at: 'street' } })
    let state = apply(shop, game, { type: 'activity', id: 'go-shop' }).state
    state = apply(state, game, { type: 'activity', id: 'read' }).state
    expect(state.stats.luck).toBe(1)
    state = apply({ ...state, turn: 3 }, game, { type: 'activity', id: 'read' }).state
    expect(state.stats.luck).toBe(2)
  })

  it('count a scene they open as seen', () => {
    const game = {
      ...withTriggers(),
      activities: [...(fixture().activities ?? []), { id: 'ring', effects: [{ kind: 'kv' as const, key: 'callRosa', to: true }] }],
    }
    const state = apply(begin(game), game, { type: 'activity', id: 'ring' }).state
    expect(state.sceneId).toBe('rosa.hello')
    expect(state.seen['rosa.hello']).toBe(1)
  })
})
