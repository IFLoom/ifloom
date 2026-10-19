import { describe, expect, it } from 'vitest'
import type { Game } from '../../src/game.ts'
import { loadGame, type Content } from '../../src/loader.ts'
import { describeProblem } from '../../src/check.ts'
import { poolPick } from '../../src/features/media.ts'
import { featureContext } from '../../src/core.ts'
import { apply } from '../../src/reduce.ts'
import { startingState } from '../../src/intake.ts'
import { pick, weighted } from '../../src/random.ts'
import { problemsOf } from '../fixtures/checked.ts'
import { view } from '../../src/view.ts'
import { fixture } from '../fixtures/town.ts'

const seeds = Array.from({ length: 400 }, (_, n) => n)

function tally<T extends string>(draws: T[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const draw of draws) out[draw] = (out[draw] ?? 0) + 1
  return out
}

describe('weighted', () => {
  const items = ['bread', 'cake', 'tea']

  it('draws by weight, a weight left out counting as 1', () => {
    const weights: Record<string, number | undefined> = { bread: 8, cake: undefined, tea: 1 }
    const counts = tally(seeds.map((seed) => weighted(items, (item) => weights[item], 'bakery', seed)!))
    // Bread is 8 in 10; cake and tea about 1 in 10 each.
    expect(counts.bread).toBeGreaterThan(280)
    expect(counts.cake).toBeGreaterThan(15)
    expect(counts.tea).toBeGreaterThan(15)
  })

  it('draws the same from the same parts, and something else from others', () => {
    const weight = () => 1.5
    expect(weighted(items, weight, 'a', 1)).toBe(weighted(items, weight, 'a', 1))
    const draws = new Set(seeds.slice(0, 30).map((seed) => weighted(items, weight, 'a', seed)))
    expect(draws.size).toBe(3)
  })

  it('draws what pick would when every weight is 1', () => {
    for (const seed of seeds.slice(0, 50)) expect(weighted(items, () => 1, 'menu', seed)).toBe(pick(items, 'menu', seed))
  })

  it('never draws a weight of 0 or less, and gives undefined when nothing can be drawn', () => {
    const draws = new Set(seeds.map((seed) => weighted(items, (item) => (item === 'tea' ? 1 : item === 'cake' ? 0 : -2), seed)))
    expect([...draws]).toEqual(['tea'])
    expect(weighted(items, () => 0, 'x')).toBeUndefined()
    expect(weighted([], () => 1, 'x')).toBeUndefined()
  })
})

describe('weights in content', () => {
  it('make a heavier variants member come up more often', () => {
    const pack: Content = {
      name: 'street',
      prose: { 'weather.sun': 'The sun is out.', 'weather.rain': 'It drizzles.', 'street#leave': 'Leave' },
      variants: { 'street.weather': [{ text: 'weather.sun', weight: 9 }, 'weather.rain'] },
      scenes: [{ id: 'street', body: [{ variants: 'street.weather' }], choices: [{ id: 'leave', effects: [{ kind: 'scene', scene: null }] }] }],
    }
    const { game, problems } = loadGame([pack], { id: 'weather', title: 'Weather' })
    expect(problems).toEqual([])
    const bodies = seeds.map((seed) => view({ ...startingState(game, { seed }), sceneId: 'street' }, game).scene.body)
    const counts = tally(bodies)
    expect(counts['The sun is out.']).toBeGreaterThan(320)
    expect(counts['It drizzles.']).toBeGreaterThan(10)
  })

  it('report a variants member weighing 0 or less', () => {
    const pack: Content = { name: 'street', prose: { a: 'A' }, variants: { v: [{ text: 'a', weight: 0 }] } }
    expect(loadGame([pack], { id: 'g', title: 'G' }).problems.map(describeProblem)).toContain(
      'street · variants v · "a" has a weight of 0; a weight must be above 0',
    )
  })

  it('make a heavier pool file picked more often', () => {
    const game: Game = {
      ...fixture(),
      media: { pools: { door: [{ src: 'door/blue.jpg', weight: 9 }, { src: 'door/red.jpg' }] } },
    }
    const counts = tally(seeds.map((seed) => poolPick(startingState(game, { seed }), game, { pool: 'door', owner: 'flat', slot: '0' }, featureContext())!))
    expect(counts['door/blue.jpg']).toBeGreaterThan(320)
    expect(counts['door/red.jpg']).toBeGreaterThan(10)
    const zero: Game = { ...game, media: { pools: { door: [{ src: 'door/blue.jpg', weight: 0 }] } } }
    expect(problemsOf(zero)).toContain('pool door: file 0 has a weight of 0; a weight must be above 0')
  })

  it('put a heavier playlist track earlier in a shuffled order', () => {
    const tracks = { a: { src: 'a.ogg', channel: 'music' }, b: { src: 'b.ogg', channel: 'music' }, c: { src: 'c.ogg', channel: 'music' } }
    const game: Game = {
      ...fixture(),
      audio: { tracks: { ...tracks, radio: { playlist: [{ track: 'a', weight: 20 }, 'b', 'c'], order: 'shuffle' } }, default: { music: 'radio' } },
    }
    const orders = seeds.map((seed) => view(startingState(game, { seed }), game).audio.channels.music.playlist!.tracks)
    // Every order still plays every track once.
    for (const order of orders) expect([...order].sort()).toEqual(['a', 'b', 'c'])
    const first = tally(orders.map((order) => order[0]))
    expect(first.a).toBeGreaterThan(320)
    // The order is drawn from the save, so it replays.
    const again = view(apply(startingState(game, { seed: 3 }), game, { type: 'activity', id: 'wait' }).state, game)
    expect(again.audio.channels.music.playlist!.tracks).toEqual(orders[3])
  })

  it('report a playlist weight that is not above 0, or on a playlist that does not shuffle', () => {
    const tracks = { a: { src: 'a.ogg', channel: 'music' }, b: { src: 'b.ogg', channel: 'music' } }
    const game: Game = {
      ...fixture(),
      audio: {
        tracks: {
          ...tracks,
          radio: { playlist: [{ track: 'a', weight: -1 }, 'b'], order: 'shuffle' },
          album: { playlist: [{ track: 'a', weight: 2 }, 'b'] },
        },
      },
    }
    const problems = problemsOf(game)
    expect(problems).toContain('track radio: "a" has a weight of -1; a weight must be above 0')
    expect(problems).toContain('track album: "a" has a weight, but only a shuffled playlist uses weights')
  })
})
