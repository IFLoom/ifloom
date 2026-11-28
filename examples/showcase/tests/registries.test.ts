import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  createRunner,
  startingState,
  type CommandRef,
  type Condition,
  type CustomContext,
  type EffectRef,
  type EntityRef,
  type Someone,
  type View,
} from '@ifloom/engine'
import type { CalendarState } from '@ifloom/plugin-calendar'
import type { ShopView } from '@ifloom/plugin-shop'
import type { QuestsView } from '@ifloom/plugin-quests'
import { smallTown } from '../src/game.ts'

/**
 * The registries: each plugin declares what its calls take, its queries
 * answer and its view holds, so content written in code is checked. These
 * hold to it at compile time (`npm run typecheck`), and the lines that must
 * not compile are marked `@ts-expect-error`, which fails if they ever do.
 */
describe('typed registries', () => {
  it('check a plugin’s call against what it declares', () => {
    const done: Condition = { 'quests/done': { quest: 'bread' } }
    // @ts-expect-error a misspelled argument
    const misspelled: Condition = { 'quests/done': { qeust: 'bread' } }
    // @ts-expect-error an argument of the wrong type
    const wrongType: EffectRef = { 'quests/start': { quest: 3 } }
    // @ts-expect-error a command missing what it needs
    const missing: CommandRef = { 'shop/buy': { vendor: 'counter' } }
    const buy: CommandRef = { 'shop/buy': { vendor: 'counter', entity: 'food:bun', count: 2 } }
    const weekend: Condition = { 'calendar/weekend': true }
    expect([done, misspelled, wrongType, missing, buy, weekend]).toHaveLength(6)
  })

  it('take any arguments for a call nobody declares, a third-party plugin’s', () => {
    const stamp: EffectRef = { 'loyalty/stamp': { card: 'cafe', by: 1 } }
    const plain: Condition = { 'loyalty/full': true }
    expect([stamp, plain]).toHaveLength(2)
  })

  it('check the game’s own calls, which src/rules.ts declares', () => {
    const post: EffectRef = { 'game/postLatest': true }
    // @ts-expect-error the game declares postLatest with no arguments
    const withArgs: EffectRef = { 'game/postLatest': { photo: 'ava' } }
    expect([post, withArgs]).toHaveLength(2)
  })

  it('type a declared query’s answer, and leave an undeclared one to the caller', () => {
    expectTypeOf<ReturnType<typeof now>>().toEqualTypeOf<CalendarState | undefined>()
    expectTypeOf<ReturnType<typeof here>>().toEqualTypeOf<string | null | undefined>()
    expectTypeOf<ReturnType<typeof stamps>>().toEqualTypeOf<number | undefined>()
  })

  it('type view.plugins for each plugin that declares its view', () => {
    expectTypeOf<View['plugins']['shop']>().toEqualTypeOf<ShopView | undefined>()
    expectTypeOf<View['plugins']['quests']>().toEqualTypeOf<QuestsView | undefined>()
    expectTypeOf<View['plugins']['loyalty']>().toEqualTypeOf<unknown>()
    const { game } = smallTown()
    const view = createRunner(game, startingState(game)).view()
    expect(view.plugins.shop?.vendors).toBeDefined()
  })

  it('name an entity by kind and id', () => {
    const ava: EntityRef = 'character:ava'
    // @ts-expect-error a bare id is not a reference
    const bare: EntityRef = 'ava'
    const someone: Someone[] = ['player', 'you', ava]
    expect([ava, bare, someone]).toHaveLength(3)
  })
})

const now = (context: CustomContext) => context.query('calendar/now')
const here = (context: CustomContext) => context.query('places/here')
const stamps = (context: CustomContext) => context.query<number>('loyalty/stamps', { card: 'cafe' })
