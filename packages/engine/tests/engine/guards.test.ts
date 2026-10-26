import { callOf } from '../../src/custom.ts'
import { describe, expect, it } from 'vitest'
import { effectsOf, warningOf, whyNot } from '../../src/availability.ts'
import { definePlugin } from '../../src/plugin.ts'
import { apply, applyEffects } from '../../src/reduce.ts'
import { view } from '../../src/view.ts'
import type { Game } from '../../src/game.ts'
import { begin, fixture } from '../fixtures/town.ts'
import { withCafe } from '../fixtures/cafe.ts'

/**
 * The tide: it rises with each `tide/rise`, and a turn ends whenever it goes
 * over the top. It refuses outright to let anyone swim at high tide, warns
 * against rising it past the top, and prices every rise in its own words.
 */
const tide = definePlugin<{ height: number }>({
  id: 'tide',
  version: 1,
  start: () => ({ height: 0 }),
  effects: {
    rise: (_state, args, { slice, set, apply }) => {
      const height = slice.height + Number(args.by ?? 1)
      // Over the top: back to the bottom, and that is a turn.
      return height > 3 ? apply([{ turn: true }], set({ height: 0 })) : set({ height })
    },
  },
  commands: {
    paddle: {
      run: (_state, _args, { apply }) => apply([{ 'tide/rise': { by: 2 } }]),
      effectsOf: () => [{ 'tide/rise': { by: 2 } }],
    },
  },
  guard: (_state, { command, effects }, { slice }) => {
    if (command.type === 'action' && command.id === 'swim' && slice.height >= 3) return 'Not at high tide.'
    const rising = effects.flatMap((effect) => (callOf(effect)?.name === 'tide/rise' ? [callOf(effect)!] : []))
    const by = rising.reduce((sum, call) => sum + Number(call.with.by ?? 1), 0)
    return slice.height + by > 3 ? { reason: 'The tide would turn.', soft: true } : undefined
  },
  price: (_state, effects) => {
    const rises = effects.filter((effect) => callOf(effect)?.name === 'tide/rise').length
    return rises ? [`the tide rises ${rises === 1 ? 'once' : `${rises} times`}`] : undefined
  },
  label: (_state, { slice }) => `Tide ${slice.height}`,
})

function shore(rules: Parameters<typeof fixture>[0] = {}): Game {
  const town = fixture(rules)
  return {
    ...town,
    plugins: [tide],
    actions: [
      // The town's things to do, and none of its buttons: waiting is done by its command here.
      ...(town.actions ?? []).map(({ label: _label, ...action }) => action),
      { id: 'swim', label: 'Swim', effects: [{ 'tide/rise': true }] },
      { id: 'dig', label: 'Dig', cost: { stats: { coins: 1 } }, effects: [{ 'tide/rise': { by: 2 } }, { stat: 'luck', by: 1 }] },
      { id: 'paddle', label: 'Paddle', command: { type: 'custom', name: 'tide/paddle' } },
    ],
  }
}

const at = (game: Game, height: number) => tide.write(begin(game), { height })
const action = (game: Game, height: number, id: string) => view(at(game, height), game).actions.find((entry) => entry.id === id)!

describe('effectsOf', () => {
  it('says what each kind of command would apply, before it runs', () => {
    const game = shore()
    const state = begin(game)
    expect(effectsOf(state, game, { type: 'action', id: 'dig' })).toEqual([{ stat: 'coins', by: -1 }, { 'tide/rise': { by: 2 } }, { stat: 'luck', by: 1 }])
    expect(effectsOf(state, game, { type: 'custom', name: 'tide/paddle' })).toEqual([{ 'tide/rise': { by: 2 } }])
    expect(effectsOf(state, game, { type: 'leave' })).toEqual([])
  })
})

describe('plugin guards', () => {
  it('refuse outright, the button and the reducer alike', () => {
    const game = shore()
    expect(whyNot(at(game, 3), game, { type: 'action', id: 'swim' })).toBe('Not at high tide.')
    expect(action(game, 3, 'swim').disabled).toBe('Not at high tide.')
    expect(apply(at(game, 3), game, { type: 'action', id: 'swim' }).reason).toBe('Not at high tide.')
  })

  it('warn softly: the button stays pressable with the warning, and the reducer refuses it', () => {
    const game = shore()
    const dig = action(game, 2, 'dig')
    expect(dig.disabled).toBeUndefined()
    expect(dig.warning).toBe('The tide would turn.')
    expect(apply(at(game, 2), game, { type: 'action', id: 'dig' }).reason).toBe('The tide would turn.')
    expect(warningOf(at(game, 0), game, { type: 'action', id: 'dig' })).toBeUndefined()
    expect(action(game, 2, 'paddle').warning).toBe('The tide would turn.')
  })
})

describe('plugin prices and labels', () => {
  it('add notes to a button’s price, and say where the game is', () => {
    const game = shore()
    expect(action(game, 0, 'dig').price).toEqual({
      stats: [{ id: 'coins', amount: 1, text: '1c' }],
      notes: ['the tide rises once'],
      text: '1c · the tide rises once',
    })
    expect(action(game, 0, 'paddle').price).toEqual({ notes: ['the tide rises once'], text: 'the tide rises once' })
    // The separator is a string a game can reword.
    const worded = { ...game, strings: { ...game.strings, priceSeparator: ', ' } }
    expect(action(worded, 0, 'dig').price?.text).toBe('1c, the tide rises once')
    expect(view(at(game, 2), game).when).toBe('Tide 2')
    expect(view(begin(fixture()), fixture()).when).toBeNull()
  })
})

describe('a plugin applying effects', () => {
  it('can end a turn, and the turn rules run as for any other', () => {
    const game = shore({ onTurn: (state) => ({ ...state, kv: { ...state.kv, turned: true } }) })
    const state = applyEffects(at(game, 3), game, [{ 'tide/rise': true }])
    expect(state.turn).toBe(begin(game).turn + 1)
    expect(state.kv.turned).toBe(true)
    expect(tide.read(state, game)).toEqual({ height: 0 })
  })

  it('cannot end a second turn from inside a turn’s end', () => {
    const game = shore({ onTurn: (_state, { apply }) => apply([{ 'tide/rise': { by: 9 } }]) })
    const state = applyEffects(begin(game), game, [{ turn: true }])
    expect(state.turn).toBe(begin(game).turn + 1)
    expect(tide.read(state, game)).toEqual({ height: 0 })
  })
})

describe('locks by effect', () => {
  it('stop only the commands that would apply that effect', () => {
    const game = shore({ locks: [{ when: { kv: 'storm' }, deny: ['*'], effect: 'tide/rise', reason: 'Not in a storm.' }] })
    const stormy = { ...begin(game), kv: { storm: true } }
    expect(whyNot(stormy, game, { type: 'action', id: 'dig' })).toBe('Not in a storm.')
    expect(whyNot(stormy, game, { type: 'custom', name: 'tide/paddle' })).toBe('Not in a storm.')
    expect(whyNot(stormy, game, { type: 'action', id: 'read' })).toBeUndefined()
    const built = fixture({ locks: [{ when: { kv: 'storm' }, deny: ['action'], effect: 'turn', reason: 'Not yet.' }] })
    const turning = { ...built, actions: [...(built.actions ?? []), { id: 'rest', effects: [{ turn: true }] }] }
    expect(whyNot({ ...begin(turning), kv: { storm: true } }, turning, { type: 'action', id: 'rest' })).toBe('Not yet.')
    expect(whyNot({ ...begin(turning), kv: { storm: true } }, turning, { type: 'action', id: 'read' })).toBeUndefined()
  })
})

describe('scene choices', () => {
  it('are greyed out by a lock or a guard, as the reducer will refuse them', () => {
    const { game } = withCafe()
    const locked = { ...game, rules: { ...game.rules }, locks: [{ when: { kv: 'rush' }, deny: ['choose' as const], except: [], reason: 'Not in the rush.' }] }
    const state = { ...begin(locked), sceneId: 'cafe.counter', kv: { rush: true } }
    const chat = view(state, locked).scene.choices.find((choice) => choice.id === 'chat')!
    expect(chat.disabled).toBe('Not in the rush.')
    expect(apply(state, locked, { type: 'choose', id: 'chat' }).reason).toBe('Not in the rush.')
  })
})
