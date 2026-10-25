import { describe, expect, it } from 'vitest'
import { apply } from '../../src/reduce.ts'
import { view } from '../../src/view.ts'
import { NOTICES_KEPT } from '../../src/notices.ts'
import type { Game } from '../../src/game.ts'
import { begin, fixture } from '../fixtures/town.ts'

function withNotices(): Game {
  return {
    ...fixture(),
    actions: [
      ...(fixture().actions ?? []),
      { id: 'rent', effects: [{ notify: 'Rent is due', id: 'rent', tag: 'money' }] },
      { id: 'post', effects: [{ notify: 'A letter came', tag: 'post', image: 'notes/letter.png' }] },
      { id: 'hum', effects: [{ notify: 'Something hums' }] },
    ],
  }
}

const act = (id: string) => ({ type: 'action' as const, id })

describe('notices', () => {
  it('are shown newest first, counted by tag, until dismissed', () => {
    const game = withNotices()
    let state = begin(game)
    for (const id of ['rent', 'post', 'hum']) state = apply(state, game, act(id)).state
    const shown = view(state, game).notices
    expect(shown.unseen.map((notice) => notice.title)).toEqual(['Something hums', 'A letter came', 'Rent is due'])
    expect(shown.byTag).toEqual({ money: 1, post: 1, '': 1 })
    // A picture is resolved from the game's art folder, as every picture in the view is.
    expect(shown.unseen.map((notice) => notice.image)).toEqual([null, 'art/notes/letter.png', null])
    state = apply(state, game, { type: 'dismiss', id: 'rent' }).state
    expect(view(state, game).notices.byTag).toEqual({ post: 1, '': 1 })
    state = apply(state, game, { type: 'dismiss' }).state
    expect(view(state, game).notices).toEqual({ unseen: [], byTag: {} })
  })

  it('raised again with the same id come back unseen, as the newest', () => {
    const game = withNotices()
    let state = apply(begin(game), game, act('rent')).state
    state = apply(state, game, { type: 'dismiss' }).state
    state = apply(apply(state, game, act('post')).state, game, act('rent')).state
    expect(state.notices.map((notice) => [notice.id, notice.seen])).toEqual([
      [state.notices[0].id, false],
      ['rent', false],
    ])
    expect(state.notices.filter((notice) => notice.id === 'rent')).toHaveLength(1)
  })

  it('keep only the newest few', () => {
    const game = withNotices()
    let state = begin(game)
    for (let i = 0; i < NOTICES_KEPT + 5; i += 1) state = apply(state, game, act('hum')).state
    expect(state.notices).toHaveLength(NOTICES_KEPT)
    expect(new Set(state.notices.map((notice) => notice.id)).size).toBe(NOTICES_KEPT)
  })
})
