import { describe, expect, it } from 'vitest'
import { carryChain, runChain, type Chain } from '../../src/chain.ts'

/** A step that writes down who ran it, from which version, so a test reads the order off the value. */
const note =
  (who: string) =>
  (version: number) =>
  (log: string[]): string[] => [...log, `${who}${version}`]

/** Steps from only these versions, each noted. */
const only = (who: string, versions: number[]) => (version: number) => (versions.includes(version) ? note(who)(version) : undefined)

describe('an upgrade chain', () => {
  it('runs each step from its version up to the target, in order', () => {
    const run = runChain([], { from: 2, to: 5, gap: 'refuse', step: note('e') })
    expect(run).toEqual({ ok: true, value: ['e2', 'e3', 'e4'], moved: true })
  })

  it('carries a value past a version with no step, when its gap rule says so', () => {
    expect(runChain([], { from: 1, to: 5, gap: 'carry', step: only('e', [2, 4]) })).toEqual({ ok: true, value: ['e2', 'e4'], moved: true })
  })

  it('refuses at the first version with no step, when its gap rule says so, naming the chain', () => {
    const main: Chain<string[]> = { from: 1, to: 5, gap: 'refuse', step: only('e', [1, 2, 4]) }
    expect(runChain([], main)).toEqual({ ok: false, chain: main, version: 3 })
  })

  it('stamps every version it passes, step or none', () => {
    const run = runChain<{ log: string[]; at: number }>(
      { log: [], at: 1 },
      {
        from: 1,
        to: 4,
        gap: 'carry',
        step: (version) => (version === 2 ? (value) => ({ ...value, log: [...value.log, `saw ${value.at}`] }) : undefined),
        stamp: (value, at) => ({ ...value, at }),
      },
    )
    expect(run.ok && run.value).toEqual({ log: ['saw 2'], at: 4 })
  })

  it('has nothing to do, and says so, when it starts at its target', () => {
    expect(runChain(['as it was'], { from: 3, to: 3, gap: 'refuse', step: note('e') })).toEqual({ ok: true, value: ['as it was'], moved: false })
  })

  it('brings each chain beside it up to a version before its own step from there, in the order given', () => {
    const run = carryChain([], { from: 1, to: 4, step: note('e') }, [
      { from: 1, to: 4, step: only('a', [1, 3]) },
      { from: 2, to: 4, step: note('b') },
    ])
    expect(run.value).toEqual(['a1', 'e1', 'b2', 'e2', 'a3', 'b3', 'e3'])
  })

  it('stops a chain beside it at its own target, and runs one that goes further after the main chain is done', () => {
    const run = carryChain([], { from: 1, to: 3, step: note('e') }, [
      { from: 1, to: 2, step: note('a') },
      { from: 1, to: 5, step: note('b') },
    ])
    expect(run.value).toEqual(['a1', 'b1', 'e1', 'b2', 'e2', 'b3', 'b4'])
  })

  it('counts a chain beside it passing a version as moving, even with the main chain at its target', () => {
    expect(carryChain(['x'], { from: 3, to: 3, step: note('e') }, [{ from: 1, to: 2, step: () => undefined }])).toEqual({ value: ['x'], moved: true })
  })

  it('fails on a chain beside it that refuses a gap', () => {
    const beside: Chain<string[]> = { from: 1, to: 3, gap: 'refuse', step: only('a', [1]) }
    expect(runChain([], { from: 1, to: 3, gap: 'carry', step: note('e') }, [beside])).toEqual({ ok: false, chain: beside, version: 2 })
  })
})
