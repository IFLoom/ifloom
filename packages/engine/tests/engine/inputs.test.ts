import { describe, expect, it } from 'vitest'
import { apply } from '../../src/reduce.ts'
import { whyNot } from '../../src/availability.ts'
import { view } from '../../src/view.ts'
import type { Game } from '../../src/game.ts'
import { begin, fixture } from '../fixtures/town.ts'

function withInputs(): Game {
  return {
    ...fixture(),
    inputs: [
      { id: 'petName', label: 'Name the cat', kind: 'text', maxLength: 12 },
      { id: 'alarm', label: 'Alarm', kind: 'number', min: 5, max: 10, variable: 'wakeAt' },
      { id: 'tea', label: 'Tea or coffee', kind: 'choice', options: [{ value: 'tea', label: 'Tea' }, { value: 'coffee', label: 'Coffee' }] },
      { id: 'secret', label: 'Password', kind: 'text', when: { flag: 'knowsDoor' } },
    ],
  }
}

describe('inputs', () => {
  it('write what the player typed or picked, trimmed, to the variable', () => {
    const game = withInputs()
    let state = apply(begin(game), game, { type: 'input', id: 'petName', value: '  Biscuit ' }).state
    state = apply(state, game, { type: 'input', id: 'alarm', value: 7 }).state
    state = apply(state, game, { type: 'input', id: 'tea', value: 'coffee' }).state
    expect(state.flags).toMatchObject({ petName: 'Biscuit', wakeAt: 7, tea: 'coffee' })
    expect(view(state, game).inputs.alarm).toMatchObject({ kind: 'number', min: 5, max: 10, value: 7 })
  })

  it('refuse what the declaration does not allow, in words the player can read', () => {
    const game = withInputs()
    const state = begin(game)
    const say = (id: string, value?: string | number) => whyNot(state, game, { type: 'input', id, value })
    expect(say('petName')).toBe('Enter something first.')
    expect(say('petName', '   ')).toBe('Enter something first.')
    expect(say('petName', 'Sir Biscuit the Third')).toBe('Keep it to 12 characters.')
    expect(say('alarm', 11)).toBe('Between 5 and 10.')
    expect(say('alarm', 'seven')).toBe('Enter a number.')
    expect(say('tea', 'water')).toBe('That is not one of the options.')
    expect(say('secret', 'open')).toBe('Not now.')
    expect(say('nope', 'x')).toBe('There is no such thing to fill in.')
  })

  it('are only offered in the view while they apply', () => {
    const game = withInputs()
    expect(Object.keys(view(begin(game), game).inputs)).toEqual(['petName', 'alarm', 'tea'])
    expect(Object.keys(view(begin(game, { flags: { knowsDoor: true } }), game).inputs)).toContain('secret')
  })
})
