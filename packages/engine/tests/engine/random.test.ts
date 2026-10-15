import { describe, expect, it } from 'vitest'
import { chance, hash, pick, roll } from '../../src/random.ts'

/**
 * The bug this guards against: a hash of the shape `n * 31 + charCode` maps
 * "…:0", "…:1", "…:2" onto three integers one apart. Read a value out of the
 * high bits of those and it never changes — which is how a whole shift of
 * referrals once came out as the same client, the same day and the same code,
 * five times over.
 */
describe('hash', () => {
  it('changes everything when the last character changes', () => {
    const a = hash('a-fairly-long-deterministic-key:0')
    const b = hash('a-fairly-long-deterministic-key:1')
    expect(a).not.toBe(b)
    // Not merely different — different across the whole word.
    const differing = [...Array(32).keys()].filter(
      (bit) => ((a >>> bit) & 1) !== ((b >>> bit) & 1),
    )
    expect(differing.length).toBeGreaterThan(8)
  })

  it('does not walk in step for a run of indices', () => {
    const steps = [0, 1, 2, 3, 4].map((i) => hash(`seed:${i}`))
    const gaps = steps.slice(1).map((value, i) => value - steps[i])
    expect(new Set(gaps).size).toBeGreaterThan(1)
  })

  it('is stable, because a save has to deal the same cards twice', () => {
    expect(hash('psych')).toBe(hash('psych'))
  })
})

describe('roll and pick', () => {
  it('stays inside the range', () => {
    for (let i = 0; i < 200; i += 1) {
      const value = roll(7, 'x', i)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(7)
    }
  })

  it('spreads a run of indices across the whole range', () => {
    const seen = new Set([...Array(40).keys()].map((i) => roll(5, 'tray', i)))
    expect(seen.size).toBe(5)
  })

  it('gives different answers for different fields of the same draw', () => {
    const fields = ['client', 'day', 'code', 'sessions', 'nhs']
    const values = fields.map((field) => roll(100, 'seed', 3, 1, field))
    expect(new Set(values).size).toBeGreaterThan(3)
  })

  it('picks from a list without leaving anything out', () => {
    const items = ['a', 'b', 'c', 'd']
    const seen = new Set([...Array(60).keys()].map((i) => pick(items, i)))
    expect(seen).toEqual(new Set(items))
  })

  it('lands a chance about as often as it says', () => {
    const hits = [...Array(600).keys()].filter((i) => chance(3, 10, 'roll', i))
    expect(hits.length).toBeGreaterThan(120)
    expect(hits.length).toBeLessThan(240)
  })
})
