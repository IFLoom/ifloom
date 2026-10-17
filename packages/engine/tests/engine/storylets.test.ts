import { describe, expect, it } from 'vitest'
import { SCHEMA, loadGame, type Pack } from '../../src/loader.ts'
import { describeProblem } from '../../src/check.ts'
import { apply } from '../../src/reduce.ts'
import { startingState } from '../../src/intake.ts'
import { createRunner, replay } from '../../src/runner.ts'
import type { DataScene } from '../../src/scene.ts'
import { problemsOf } from '../fixtures/checked.ts'

const leave = [{ id: 'leave', effects: [{ kind: 'scene' as const, id: null }] }]

/** A café with things that might happen while you sit there. */
function scene(id: string, extra: Partial<DataScene> = {}): DataScene {
  return { id, body: [{ text: `${id}.text` }], choices: leave, ...extra }
}

function cafe(scenes: DataScene[], extra: Partial<Pack> = {}) {
  const pack: Pack = {
    id: 'cafe',
    schema: SCHEMA,
    prose: Object.fromEntries(scenes.flatMap((entry) => [[`${entry.id}.text`, entry.id], [`${entry.id}#leave`, 'Leave']])),
    scenes,
    activities: [
      { id: 'sit', effects: [{ kind: 'scene', from: 'cafe', otherwise: 'cafe.quiet' }] },
      { id: 'linger', effects: [{ kind: 'scene', from: 'cafe' }] },
      { id: 'tip', effects: [{ kind: 'kv', key: 'tipped', to: true }] },
    ],
    ...extra,
  }
  return loadGame([pack], { id: 'cafe-game', title: 'The Café' })
}

const gossip = scene('cafe.gossip', { drawnFrom: ['cafe'], when: { not: { seen: 'cafe.gossip' } } })
const busker = scene('cafe.busker', { drawnFrom: ['cafe', 'street'], weight: 3 })
const regular = scene('cafe.regular', { drawnFrom: ['cafe'], when: { kv: 'tipped' } })
const quiet = scene('cafe.quiet')

const seeds = Array.from({ length: 300 }, (_, n) => n)

function sit(seed: number, game = cafe([gossip, busker, regular, quiet]).game) {
  return apply(startingState(game, { seed }), game, { type: 'activity', id: 'sit' }).state
}

describe('storylets', () => {
  it('open a scene drawn from the named set, only one whose when holds', () => {
    const { game, problems } = cafe([gossip, busker, regular, quiet])
    expect(problems).toEqual([])
    const drawn = new Set(seeds.map((seed) => sit(seed, game).sceneId))
    // The regular only comes in once the player has tipped.
    expect([...drawn].sort()).toEqual(['cafe.busker', 'cafe.gossip'])
    const tipped = (seed: number) => {
      const state = apply(startingState(game, { seed }), game, { type: 'activity', id: 'tip' }).state
      return apply(state, game, { type: 'activity', id: 'sit' }).state.sceneId
    }
    expect(new Set(seeds.map(tipped)).has('cafe.regular')).toBe(true)
  })

  it('draw by weight', () => {
    const counts = { busker: 0, gossip: 0 }
    for (const seed of seeds) counts[sit(seed).sceneId === 'cafe.busker' ? 'busker' : 'gossip'] += 1
    // Three to one.
    expect(counts.busker).toBeGreaterThan(counts.gossip * 2)
    expect(counts.gossip).toBeGreaterThan(30)
  })

  it('open otherwise when nothing can be drawn, and do nothing without one', () => {
    const { game } = cafe([gossip, quiet])
    const first = sit(1, game)
    expect(first.sceneId).toBe('cafe.gossip')
    const after = apply({ ...first, sceneId: null }, game, { type: 'activity', id: 'sit' }).state
    expect(after.sceneId).toBe('cafe.quiet')
    const nothing = apply({ ...first, sceneId: null }, game, { type: 'activity', id: 'linger' })
    expect(nothing.ok).toBe(true)
    expect(nothing.state.sceneId).toBeNull()
  })

  it('draw something new each time in a turn, and replay the same draws', () => {
    const { game } = cafe([busker, scene('cafe.cat', { drawnFrom: ['cafe'], weight: 3 }), quiet])
    const runner = createRunner(game, startingState(game, { seed: 4 }))
    const opened: (string | null)[] = []
    for (let n = 0; n < 12; n += 1) {
      runner.apply({ type: 'activity', id: 'sit' })
      opened.push(runner.state.sceneId)
      runner.apply({ type: 'choose', id: 'leave' })
    }
    expect(new Set(opened).size).toBe(2)
    expect(replay(game, runner.log())).toEqual(runner.state)
  })

  it('report a draw no scene is in, an unknown otherwise and a bad weight', () => {
    const problems = cafe([scene('cafe.lonely', { weight: 2 }), scene('cafe.heavy', { drawnFrom: ['cafe'], weight: 0 }), scene('cafe.picky', { when: { kv: 'x' } })], {
      activities: [
        { id: 'sit', effects: [{ kind: 'scene', from: 'nowhere', otherwise: 'cafe.gone' }] },
      ],
    }).problems.map(describeProblem)
    expect(problems).toEqual(
      expect.arrayContaining([
        'cafe · activity sit · draws from "nowhere", but no scene is drawn from it',
        'cafe · activity sit · goes to unknown scene "cafe.gone"',
        'cafe · scene cafe.heavy · weight must be above 0',
        'cafe · scene cafe.lonely · has a weight but no drawnFrom, so it is never drawn',
        'cafe · scene cafe.picky · has a when but no drawnFrom; when only gates draws',
      ]),
    )
  })

  it('are checked in a hand-built game too', () => {
    const { game } = cafe([gossip, quiet])
    const broken = { ...game, activities: [{ id: 'sit', effects: [{ kind: 'scene' as const, from: 'nowhere', otherwise: 'cafe.gone' }] }] }
    expect(problemsOf(broken)).toEqual(expect.arrayContaining(['activity sit: draws from "nowhere", but no scene is drawn from it', 'activity sit: goes to unknown scene "cafe.gone"']))
  })
})
