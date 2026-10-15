import { describe, expect, it } from 'vitest'
import { apply } from '../../src/reduce.ts'
import { holds } from '../../src/condition.ts'
import { view } from '../../src/view.ts'
import { validatePack } from '../../src/validate.ts'
import { proseStore } from '../../src/prose.ts'
import type { Game } from '../../src/game.ts'
import { begin, fixture, townProse } from '../fixtures/town.ts'

function withGallery(): Game {
  const game: Game = {
    ...fixture(),
    collections: [{ id: 'gallery', name: 'Photos', max: 2 }],
    activities: [
      ...fixture().activities,
      { id: 'snapHouse', effects: [{ kind: 'collect', to: 'gallery', entry: { id: 'house', title: 'The house', text: 'photo.house', image: 'art/house.jpg' } }] },
      { id: 'snapStreet', effects: [{ kind: 'collect', to: 'gallery', entry: { id: 'street', title: 'The street' } }] },
      { id: 'snapShop', effects: [{ kind: 'collect', to: 'gallery', entry: { id: 'shop', title: 'The shop', data: { blurry: true } } }] },
      { id: 'deleteHouse', effects: [{ kind: 'discard', from: 'gallery', id: 'house' }] },
    ],
  }
  game.prose = proseStore(game, { ...townProse, 'photo.house': 'The front door, {{playerFirst}}’s bike against it.' })
  return game
}

const act = (id: string) => ({ type: 'activity' as const, id })

describe('collections', () => {
  it('keep what is collected, with the turn, and show it with its words filled in', () => {
    const game = withGallery()
    const state = apply(begin(game, { flags: { playerFirst: 'Sam' } }), game, act('snapHouse')).state
    expect(state.collections.gallery).toEqual([
      { id: 'house', title: 'The house', text: 'photo.house', image: 'art/house.jpg', turn: 2 },
    ])
    expect(view(state, game).collections.gallery).toEqual({
      name: 'Photos',
      entries: [{ id: 'house', title: 'The house', text: 'The front door, Sam’s bike against it.', image: 'art/house.jpg', data: {}, turn: 2 }],
    })
  })

  it('leave an entry that is already there as it is', () => {
    const game = withGallery()
    let state = apply(begin(game), game, act('snapHouse')).state
    state = apply({ ...state, turn: 5 }, game, act('snapHouse')).state
    expect(state.collections.gallery.map((entry) => [entry.id, entry.turn])).toEqual([['house', 2]])
  })

  it('keep only the newest when there is a limit, and let an entry be taken out', () => {
    const game = withGallery()
    let state = begin(game)
    for (const id of ['snapHouse', 'snapStreet', 'snapShop']) state = apply(state, game, act(id)).state
    expect(state.collections.gallery.map((entry) => entry.id)).toEqual(['street', 'shop'])
    state = apply(apply(begin(game), game, act('snapHouse')).state, game, act('deleteHouse')).state
    expect(state.collections.gallery).toEqual([])
  })

  it('answer conditions about what is in them', () => {
    const game = withGallery()
    const state = apply(apply(begin(game), game, act('snapHouse')).state, game, act('snapStreet')).state
    expect(holds(state, { collection: 'gallery' }, game)).toBe(true)
    expect(holds(state, { collection: 'gallery', id: 'house' }, game)).toBe(true)
    expect(holds(state, { collection: 'gallery', id: 'shop' }, game)).toBe(false)
    expect(holds(state, { collection: 'gallery', gte: 3 }, game)).toBe(false)
    expect(holds(begin(game), { collection: 'gallery' }, game)).toBe(false)
  })

  it('are checked: an effect into a collection the game does not declare is reported', () => {
    const game = { ...withGallery(), items: [{ id: 'camera', name: 'camera', desc: '', kind: 'gear' as const, use: { label: 'Snap', effects: [{ kind: 'collect' as const, to: 'album', entry: { id: 'x' } }] } }] }
    expect(validatePack(game).join('\n')).toContain('collection album is not declared')
    const notes = { ...withGallery(), items: [{ id: 'pen', name: 'pen', desc: '', kind: 'gear' as const, use: { label: 'Write', effects: [{ kind: 'notify' as const, title: 'Wrote', text: 'note.unwritten' }] } }] }
    expect(validatePack(notes).join('\n')).toContain('no prose for note.unwritten')
  })
})
