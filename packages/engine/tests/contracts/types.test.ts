import { describe, expect, expectTypeOf, it } from 'vitest'
import type { Command, Condition, Content, Effect, Game, GameState, Pack, View } from '../../src/index.ts'
import type { Reference } from '../../src/plugin-api.ts'
import type { EffectKey } from '../../src/types.ts'
import type {
  FrozenCommand,
  FrozenCondition,
  FrozenContent,
  FrozenEffect,
  FrozenEffectKey,
  FrozenGame,
  FrozenGameState,
  FrozenPack,
  FrozenReference,
  FrozenView,
} from './frozen-types.ts'

/**
 * The public types are built from the features' pieces now (`features/`), and
 * the React UI, the audio player and the plugins compile against them. These
 * hold each built type to a frozen copy of the shape it had before, both
 * ways, so building them differently can't change what they accept.
 *
 * `typecheck` checks this file: each line below is `true` only while the two
 * types are assignable both ways, and fails to compile otherwise.
 */
type Mutual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

const shapes = {
  condition: true as Mutual<Condition, FrozenCondition>,
  effect: true as Mutual<Effect, FrozenEffect>,
  command: true as Mutual<Command, FrozenCommand>,
  state: true as Mutual<GameState, FrozenGameState>,
  game: true as Mutual<Game, FrozenGame>,
  pack: true as Mutual<Pack, FrozenPack>,
  content: true as Mutual<Content, FrozenContent>,
  view: true as Mutual<View, FrozenView>,
  reference: true as Mutual<Reference, FrozenReference>,
} satisfies Record<string, true>

describe('the built public types', () => {
  it('are assignable both ways to the frozen shapes', () => {
    expect(Object.values(shapes).every(Boolean)).toBe(true)
    expectTypeOf<Condition>().toExtend<FrozenCondition>()
    expectTypeOf<FrozenCondition>().toExtend<Condition>()
    expectTypeOf<Effect>().toExtend<FrozenEffect>()
    expectTypeOf<FrozenEffect>().toExtend<Effect>()
    expectTypeOf<Command>().toExtend<FrozenCommand>()
    expectTypeOf<FrozenCommand>().toExtend<Command>()
    expectTypeOf<GameState>().toExtend<FrozenGameState>()
    expectTypeOf<FrozenGameState>().toExtend<GameState>()
    expectTypeOf<Game>().toExtend<FrozenGame>()
    expectTypeOf<FrozenGame>().toExtend<Game>()
    expectTypeOf<Pack>().toExtend<FrozenPack>()
    expectTypeOf<FrozenPack>().toExtend<Pack>()
    expectTypeOf<Content>().toExtend<FrozenContent>()
    expectTypeOf<FrozenContent>().toExtend<Content>()
    expectTypeOf<View>().toExtend<FrozenView>()
    expectTypeOf<FrozenView>().toExtend<View>()
  })

  it('keep the kinds a condition, effect and command can be', () => {
    expectTypeOf<EffectKey>().toEqualTypeOf<FrozenEffectKey>()
    expectTypeOf<Command['type']>().toEqualTypeOf<FrozenCommand['type']>()
  })
})
