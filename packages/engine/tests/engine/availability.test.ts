import { describe, expect, it } from 'vitest'
import { whyNot } from '../../src/availability.ts'
import type { Game } from '../../src/game.ts'
import { apply } from '../../src/reduce.ts'
import type { GameState } from '../../src/types.ts'
import { view } from '../../src/view.ts'
import { begin, fixture } from '../fixtures/town.ts'

/** Every button the view offers, with the reason or the warning it shows. */
function buttons(state: GameState, game: Game) {
  const shown = view(state, game)
  return [
    ...shown.actions.map(({ command, disabled, warning }) => ({ command, disabled, warning })),
    ...shown.scene.choices.map(({ command, disabled, warning }) => ({ command, disabled, warning })),
  ]
}

describe('one answer to "can I do this?"', () => {
  const town = fixture({ locks: [{ when: { phase: ['night'] }, deny: ['activity'], except: [], reason: 'Shut for the night.' }] })
  const game: Game = {
    ...town,
    actions: [
      ...(town.actions ?? []),
      { id: 'tidy', label: 'Tidy up', command: { type: 'activity', id: 'tidy' } },
      { id: 'read', label: 'Read', command: { type: 'activity', id: 'read' } },
      { id: 'rest', label: 'Rest', command: { type: 'activity', id: 'rest' } },
      { id: 'ghost', label: 'Haunt', command: { type: 'activity', id: 'haunt' } },
    ],
  }
  const closed = { rosa: { closedUntil: 9, kv: {} } }
  const states: GameState[] = [
    begin(game),
    begin(game, { phase: 'night' }),
    begin(game, { kv: { at: 'street' } }),
    begin(game, { kv: { at: 'shop' }, turn: 5 }),
    begin(game, { kv: { at: 'shop' }, storylines: closed }),
    begin(game, { kv: { at: 'shop' }, sceneId: 'rosa.hello' }),
  ]

  it('gives every button the reason the reducer refuses with', () => {
    let checked = 0
    for (const state of states) {
      for (const button of buttons(state, game)) {
        const result = apply(state, game, button.command)
        expect({ command: button.command, refused: result.reason }).toEqual({
          command: button.command,
          refused: button.disabled ?? button.warning,
        })
        checked += 1
      }
    }
    expect(checked).toBeGreaterThan(12)
  })

  it('will not open a scene over another', () => {
    const inScene = begin(game, { sceneId: 'rosa.hello' })
    expect(whyNot(inScene, game, { type: 'scene', id: 'rosa.hello' })).toBe('Finish this first.')
  })

  it('says plainly what is wrong with a command no button offers', () => {
    const state = begin(game)
    expect(whyNot(state, game, { type: 'activity', id: 'haunt' })).toBe('There is no such thing to do.')
    expect(whyNot(state, game, { type: 'choose', id: 'x' })).toBe('There is nothing to choose.')
  })
})
