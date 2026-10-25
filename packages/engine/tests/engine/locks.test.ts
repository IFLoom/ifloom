import { describe, expect, it } from 'vitest'
import { actionBlocked } from '../../src/action.ts'
import { lockedBy, lockedOut } from '../../src/locks.ts'
import { apply } from '../../src/reduce.ts'
import { view } from '../../src/view.ts'
import { activities, begin, fixture } from '../fixtures/town.ts'

describe('locks', () => {
  it('stops what it denies while its condition holds, and says why', () => {
    const game = fixture({
      locks: [{ when: { kv: 'phase', is: ['night'] }, deny: ['action'], reason: 'It is dark.' }],
    })
    const day = begin(game)
    const night = begin(game, { kv: { phase: 'night' } })
    expect(lockedBy(day, game, { type: 'action', id: 'read' })).toBeUndefined()
    expect(lockedBy(night, game, { type: 'action', id: 'read' })).toBe('It is dark.')
    const refused = apply(night, game, { type: 'action', id: 'read' })
    expect(refused.ok).toBe(false)
    expect(refused.reason).toBe('It is dark.')
    expect(apply(day, game, { type: 'action', id: 'read' }).ok).toBe(true)
  })

  it('can stop everything but a few commands, and then nothing is on offer while no scene is open', () => {
    const game = fixture({
      locks: [{ when: { kv: 'phase', is: ['intro'] }, deny: ['*'], except: ['choose'], reason: 'Not yet.' }],
    })
    const intro = begin(game, { kv: { phase: 'intro', at: 'shop' } })
    expect(lockedOut(intro, game)).toBe(true)
    expect(lockedBy(intro, game, { type: 'action', id: 'rest' })).toBe('Not yet.')
    expect(lockedBy(intro, game, { type: 'choose', id: 'x' })).toBeUndefined()
    expect(view(intro, game).actions).toEqual([])
    expect(view(begin(game, { kv: { at: 'shop' } }), game).actions.length).toBeGreaterThan(0)
  })

  it('greys a button out, or with `hide` leaves it off the screen', () => {
    const game = fixture({
      locks: [
        { when: { kv: 'phase', is: ['open'] }, deny: ['action'], reason: 'Not now.' },
        { when: { kv: 'phase', is: ['quiet'] }, deny: ['action'], hide: true, reason: 'Stay still.' },
      ],
    })
    expect(view(begin(game), game).actions.find((action) => action.id === 'wait')?.disabled).toBe('Not now.')
    expect(view(begin(game, { kv: { phase: 'quiet' } }), game).actions.map((action) => action.id)).not.toContain('wait')
  })

  it('can stop only the activities that end the turn', () => {
    const game = fixture({
      locks: [{ when: { kv: 'phase', is: ['open'] }, deny: ['action'], effect: 'turn', reason: 'Not yet.' }],
    })
    const state = begin(game)
    const rest = activities.find((activity) => activity.id === 'rest')!
    const tidy = activities.find((activity) => activity.id === 'tidy')!
    expect(actionBlocked(state, game, rest)).toBe('Not yet.')
    expect(actionBlocked(state, game, tidy)).toBeUndefined()
  })
})
