/** The Letter, read through: the novel shape needs nothing but the core. */
import { describe, expect, it } from 'vitest'
import { apply, holds, startingState, view, type Command, type GameState } from '@ifloom/engine'
import { theLetter } from '../src/game.ts'

const { game, problems } = theLetter()

function read(state: GameState, ...commands: Command[]): GameState {
  for (const command of commands) {
    const out = apply(state, game, command)
    expect(out.refused).toBeUndefined()
    state = out.state
  }
  return state
}

const choose = (id: string): Command => ({ type: 'choose', id })

describe('The Letter', () => {
  it('loads with no plugins, places, characters or clock to declare', () => {
    expect(problems).toEqual([])
    expect(game.plugins ?? []).toEqual([])
    const state = startingState(game)
    const shown = view(state, game)
    expect(shown.scene.title).toBe('Chapter one: the mat')
  })

  it('asks for a name before the story moves, and the prose uses it', () => {
    let state = startingState(game)
    expect(view(state, game).scene.choices).toEqual([])
    expect(view(state, game).inputs.playerName).toBeDefined()
    state = read(state, { type: 'input', id: 'playerName', value: 'Robin' })
    expect(view(state, game).scene.body).toContain('You turn it over, Robin.')
    expect(view(state, game).scene.choices.map((choice) => choice.id)).toEqual(['open', 'shelf'])
  })

  it('remembers an early choice and branches on it two chapters on', () => {
    const named = read(startingState(game), { type: 'input', id: 'playerName', value: 'Robin' })
    const opened = read(named, choose('open'))
    expect(holds(opened, { chose: 'ch1.mat/open' }, game)).toBe(true)
    expect(view(opened, game).scene.body).toContain('the postcard tucked inside')
    expect(view(opened, game).scene.choices.map((choice) => choice.id)).toEqual(['truth', 'deny', 'blame'])
    const shelved = read(named, choose('shelf'))
    expect(view(shelved, game).scene.body).toContain('still sealed')
    expect(view(shelved, game).scene.choices.map((choice) => choice.id)).toEqual(['truth', 'deny'])
  })

  it('counts lies and reads the count back as a range, with a chapter as a turn', () => {
    const named = read(startingState(game), { type: 'input', id: 'playerName', value: 'Robin' })
    const tangled = read(named, choose('open'), choose('blame'))
    expect(tangled.flags.lies).toBe(2)
    expect(tangled.turn).toBe(2)
    expect(view(tangled, game).scene.body).toContain('she has clearly been talking')
    const honest = read(named, choose('open'), choose('truth'))
    expect(view(honest, game).scene.body).toContain('she smiles before you speak')
  })

  it('opens the braver ending only to a reader with the courage for it', () => {
    const named = read(startingState(game), { type: 'input', id: 'playerName', value: 'Robin' })
    const brave = read(named, choose('open'), choose('truth'))
    expect(brave.stats.courage).toBe(3)
    expect(read(brave, choose('hand')).sceneId).toBe('end.kept')
    const timid = read(named, choose('shelf'), choose('deny'))
    expect(view(timid, game).scene.choices.map((choice) => choice.id)).toEqual(['post'])
    expect(read(timid, choose('post')).sceneId).toBe('end.posted')
  })

  it('counts as finished at either ending, and a New Game+ remembers the first read', () => {
    const named = read(startingState(game), { type: 'input', id: 'playerName', value: 'Robin' })
    const ended = read(named, choose('shelf'), choose('deny'), choose('post'))
    expect(holds(ended, game.finished!, game)).toBe(true)
    expect(holds(named, game.finished!, game)).toBe(false)
    expect(view(named, game).scene.body).not.toContain('stood here before')
    const again = startingState(game, { carry: ended })
    expect(again.flags.readBefore).toBe(true)
    expect(again.flags.lies).toBeUndefined()
    expect(view(again, game).scene.body).toContain('stood here before')
  })
})
