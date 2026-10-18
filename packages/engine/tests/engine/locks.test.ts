import { describe, expect, it } from 'vitest'
import { activityBlocked } from '../../src/activity.ts'
import { lockedBy, lockedOut } from '../../src/locks.ts'
import { apply } from '../../src/reduce.ts'
import { view } from '../../src/view.ts'
import { activities, begin, fixture } from '../fixtures/town.ts'

describe('locks', () => {
  it('stops what it denies while its condition holds, and says why', () => {
    const game = fixture({
      locks: [{ when: { phase: ['night'] }, deny: ['activity'], reason: 'It is dark.' }],
    })
    const day = begin(game)
    const night = begin(game, { phase: 'night' })
    expect(lockedBy(day, game, { type: 'activity', id: 'read' })).toBeUndefined()
    expect(lockedBy(night, game, { type: 'activity', id: 'read' })).toBe('It is dark.')
    const refused = apply(night, game, { type: 'activity', id: 'read' })
    expect(refused.ok).toBe(false)
    expect(refused.reason).toBe('It is dark.')
    expect(apply(day, game, { type: 'activity', id: 'read' }).ok).toBe(true)
  })

  it('can stop everything but a few commands, and then nothing is on offer while no scene is open', () => {
    const game = fixture({
      locks: [{ when: { phase: ['intro'] }, deny: ['*'], except: ['choose'], reason: 'Not yet.' }],
    })
    const intro = begin(game, { phase: 'intro', kv: { at: 'shop' } })
    expect(lockedOut(intro, game)).toBe(true)
    expect(lockedBy(intro, game, { type: 'activity', id: 'rest' })).toBe('Not yet.')
    expect(lockedBy(intro, game, { type: 'choose', id: 'x' })).toBeUndefined()
    expect(view(intro, game).actions).toEqual([])
    expect(view(begin(game, { kv: { at: 'shop' } }), game).actions.length).toBeGreaterThan(0)
  })

  it('greys a button out, or with `hide` leaves it off the screen', () => {
    const game = fixture({
      locks: [
        { when: { phase: ['open'] }, deny: ['activity'], reason: 'Not now.' },
        { when: { phase: ['quiet'] }, deny: ['activity'], hide: true, reason: 'Stay still.' },
      ],
    })
    expect(view(begin(game), game).actions.find((action) => action.id === 'wait')?.disabled).toBe('Not now.')
    expect(view(begin(game, { phase: 'quiet' }), game).actions.map((action) => action.id)).not.toContain('wait')
  })

  it('can stop only the activities that end the turn', () => {
    const game = fixture({
      locks: [{ when: { phase: ['open'] }, deny: ['activity'], effect: 'turn', reason: 'Not yet.' }],
    })
    const state = begin(game)
    const rest = activities.find((activity) => activity.id === 'rest')!
    const tidy = activities.find((activity) => activity.id === 'tidy')!
    expect(activityBlocked(state, game, rest)).toBe('Not yet.')
    expect(activityBlocked(state, game, tidy)).toBeUndefined()
  })
})
