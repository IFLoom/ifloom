import { describe, expect, expectTypeOf, it } from 'vitest'
import { apply } from '../../src/reduce.ts'
import { holds } from '../../src/condition.ts'
import { checkGame } from '../../src/check.ts'
import { definePlugin } from '../../src/plugin.ts'
import { arg, defineCalls, defineData, list, type CommandsOf, type ConditionsOf, type EffectsOf } from '../../src/pluginCalls.ts'
import type { CommandRef, ConditionRegistry, EffectRef } from '../../src/calls.ts'
import type { Condition } from '../../src/types.ts'
import { translatableFields } from '../../src/words.ts'
import { begin, fixture } from '../fixtures/town.ts'
import type { Game } from '../../src/game.ts'

/** A plugin with a data list and three calls, each declared once. */
type Card = { id: string; name: string; stamps: number }

const DATA = defineData('loyalty', { cards: list<Card>({ noun: 'card', words: { name: true } }) })

const CALLS = defineCalls('loyalty', {
  conditions: { full: { card: arg.entry(DATA.cards) }, among: { card: arg.entries(DATA.cards) } },
  effects: { stamp: { card: arg.entry(DATA.cards), by: arg.number().optional(1), note: arg.words().optional() } },
  commands: { redeem: { id: arg.entry(DATA.cards), at: arg.entity().optional() } },
})

declare module '../../src/calls.ts' {
  interface ConditionRegistry extends ConditionsOf<typeof CALLS> {}
  interface EffectRegistry extends EffectsOf<typeof CALLS> {}
  interface CommandRegistry extends CommandsOf<typeof CALLS> {}
}

/** What each implementation was handed, in order. */
const seen: unknown[] = []

const loyalty = definePlugin<{ stamps: Record<string, number> }, unknown, typeof CALLS>({
  id: 'loyalty',
  version: 1,
  calls: CALLS,
  data: DATA,
  start: () => ({ stamps: {} }),
  conditions: {
    full: (_state, { card }, { slice, game }) => {
      seen.push(card)
      return (slice.stamps[card] ?? 0) >= (DATA.cards.get(game, card)?.stamps ?? Infinity)
    },
    among: (_state, { card }) => {
      seen.push(card)
      expectTypeOf(card).toEqualTypeOf<string[]>()
      return card.includes('cafe')
    },
  },
  effects: {
    stamp: (_state, { card, by, note }, { slice, set }) => {
      seen.push({ card, by, note })
      expectTypeOf(by).toEqualTypeOf<number>()
      expectTypeOf(note).toEqualTypeOf<string | undefined>()
      return set({ stamps: { ...slice.stamps, [card]: (slice.stamps[card] ?? 0) + by } })
    },
  },
  commands: {
    redeem: {
      run: (state, { id, at }) => {
        seen.push({ id, at })
        return state
      },
    },
  },
})

const cards: Card[] = [{ id: 'cafe', name: 'Café card', stamps: 2 }]

function game(extra: Partial<Game> = {}): Game {
  return { ...fixture(), plugins: [loyalty], data: { loyalty: { cards } }, ...extra }
}

describe('a plugin’s calls, declared once', () => {
  it('types content against the declaration, through the registries the plugin extends from it', () => {
    const full: Condition = { 'loyalty/full': { card: 'cafe' } }
    // @ts-expect-error a misspelt argument
    const misspelt: Condition = { 'loyalty/full': { crad: 'cafe' } }
    // @ts-expect-error an argument of the wrong type
    const wrong: EffectRef = { 'loyalty/stamp': { card: 'cafe', by: 'two' } }
    // An effect whose arguments may all be left out but one: `card` is needed.
    // @ts-expect-error a missing argument
    const missing: EffectRef = { 'loyalty/stamp': { by: 2 } }
    const among: Condition = { 'loyalty/among': { card: ['cafe', 'bakery'] } }
    expectTypeOf<ConditionRegistry['loyalty/full']>().toEqualTypeOf<{ card: string }>()
    expect([full, misspelt, wrong, missing, among]).toHaveLength(5)
  })

  it('gives a writer for each call, whose key is the call’s full name, typed', () => {
    const stamp = CALLS.effects.stamp({ card: 'cafe' })
    expect(stamp).toEqual({ 'loyalty/stamp': { card: 'cafe' } })
    expectTypeOf(stamp).toExtend<EffectRef>()
    const redeem: CommandRef = CALLS.commands.redeem({ id: 'cafe' })
    expect(redeem).toEqual({ 'loyalty/redeem': { id: 'cafe' } })
    expect(CALLS.conditions.full.call).toBe('loyalty/full')
    // Never called: what must not compile.
    const _wrong = () => {
      // @ts-expect-error a writer takes what its call takes
      CALLS.conditions.full({ card: 3 })
      // @ts-expect-error there is no writer for a call the plugin doesn't declare
      CALLS.conditions.empty({ card: 'cafe' })
    }
    expect(_wrong).toBeTypeOf('function')
    // @ts-expect-error a writer's call can't be assigned where another call is wanted
    const other: { 'loyalty/among': unknown } = CALLS.conditions.full({ card: 'cafe' })
    expect(other).toBeDefined()
  })

  it('hands each implementation its arguments read from what content wrote, whatever that was', () => {
    seen.length = 0
    const g = game()
    const state = begin(g)
    holds(state, g, { 'loyalty/among': { card: 'cafe' } } as Condition)
    holds(state, g, { 'loyalty/full': true } as unknown as Condition)
    const stamped = apply(state, g, { type: 'custom', name: 'loyalty/redeem', with: { id: 'cafe', extra: 1 } })
    expect(stamped.ok).toBe(true)
    // A list of one is a list, a missing text is '', an undeclared argument isn't handed on.
    expect(seen).toEqual([['cafe'], '', { id: 'cafe', at: undefined }])
  })

  it('refuses a command sent with an argument of the wrong shape, before it runs', () => {
    seen.length = 0
    const g = game()
    const refused = apply(begin(g), g, { type: 'custom', name: 'loyalty/redeem', with: { id: 7 } })
    expect(refused.ok).toBe(false)
    expect(refused.ok ? '' : refused.reason).toBe('That can’t be done: "id" must be a card\'s id.')
    expect(seen).toEqual([])
  })

  it('reads a fallback for an argument content left out', () => {
    seen.length = 0
    const g = game({ actions: [{ id: 'stamp', effects: [{ 'loyalty/stamp': { card: 'cafe' } }] }] })
    const after = apply(begin(g), g, { type: 'action', id: 'stamp' })
    expect(seen).toEqual([{ card: 'cafe', by: 1, note: undefined }])
    expect(loyalty.read(after.state, g).stamps).toEqual({ cafe: 1 })
  })

  it('reports to the content checker what a call leaves out, gets wrong, doesn’t take, or names that the game lacks', () => {
    const g = game({
      actions: [
        { id: 'a', effects: [{ 'loyalty/stamp': { card: 'bakery' } } as unknown as EffectRef] },
        { id: 'b', effects: [{ 'loyalty/stamp': { by: 2 } } as unknown as EffectRef] },
        { id: 'c', effects: [{ 'loyalty/stamp': { card: 'cafe', by: 'two' } } as unknown as EffectRef] },
        { id: 'd', effects: [{ 'loyalty/stamp': { card: 'cafe', count: 2 } } as unknown as EffectRef] },
        { id: 'e', command: { 'loyalty/redeem': { id: 'cafe', at: 'shop:nowhere' } } },
        { id: 'f', effects: [{ 'loyalty/stamp': { card: 'cafe', by: 2 } }] },
      ],
    })
    const problems = checkGame(g).problems.map((problem) => `${problem.where}: ${problem.what}`)
    expect(problems).toContain('action a: unknown card "bakery"')
    expect(problems).toContain('action b: "loyalty/stamp" needs "card"')
    expect(problems).toContain('action c: "loyalty/stamp"\'s "by" must be a number; this one is "two"')
    expect(problems).toContain('action d: "loyalty/stamp" takes no "count"; it takes "card", "by", "note"')
    expect(problems).toContain('action e: unknown kind "shop"')
    expect(problems.filter((line) => line.startsWith('action f:'))).toEqual([])
  })

  it('reaches the words in a call’s arguments and in a data list, for a translation', () => {
    const g = game({ actions: [{ id: 'stamp', label: 'Stamp', effects: [{ 'loyalty/stamp': { card: 'cafe', note: 'Thank you!' } }] }] })
    const keys = translatableFields(g).map((field) => `${field.key}=${field.text}`)
    expect(keys).toContain('loyalty/cards.cafe.name=Café card')
    expect(keys.some((key) => key.startsWith('action.stamp.loyalty/stamp.') && key.endsWith('.note=Thank you!'))).toBe(true)
  })

  it('refuses a plugin whose implementations and declaration differ', () => {
    const calls = defineCalls('odd', { conditions: { one: {} }, commands: { two: { id: arg.string() } } })
    expect(() =>
      definePlugin<null, unknown, typeof calls>({
        id: 'odd',
        version: 1,
        calls,
        // @ts-expect-error the declared condition `one` has no implementation
        conditions: {},
        commands: { two: { run: (state) => state } },
      }),
    ).toThrow('"odd/one" is declared in its calls\' conditions but not implemented')
    expect(() =>
      definePlugin<null, unknown, typeof calls>({
        id: 'odd',
        version: 1,
        calls,
        conditions: { one: () => true },
        // @ts-expect-error `three` isn't declared
        effects: { three: (state) => state },
        commands: { two: { run: (state) => state } },
      }),
    ).toThrow('"odd/three" is implemented but not declared')
  })
})

describe('a plugin’s data lists, declared once', () => {
  it('reads each list typed, leaving out what isn’t an entry, and finds one by any id content wrote', () => {
    const g = game({ data: { loyalty: { cards: [...cards, 'junk' as never, { name: 'no id' } as never] } } })
    expectTypeOf(DATA.cards.all(g)).toEqualTypeOf<Card[]>()
    expect(DATA.cards.all(g).map((card) => card.id)).toEqual(['cafe'])
    expect(DATA.cards.get(g, 'cafe')?.name).toBe('Café card')
    expect(DATA.cards.get(g, 3)).toBeUndefined()
    expect(DATA.cards.ref('cafe')).toEqual({ entry: 'cafe', plugin: 'loyalty', list: 'cards', noun: 'card' })
    expect(DATA.cards.content(g, (card) => [{ stat: card.id }])).toEqual([{ list: 'cards', id: 'cafe', refs: [{ stat: 'cafe' }] }])
  })
})
