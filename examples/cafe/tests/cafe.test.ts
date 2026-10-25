/** The Corner Café, played a few weeks: the management shape needs entities, `each`, `count` and a turn. */
import { describe, expect, it } from 'vitest'
import { apply, entitiesOf, holds, startingState, statValue, view, type Command, type GameState } from '@ifloom/engine'
import { cornerCafe } from '../src/game.ts'

const { game, problems } = cornerCafe()

function play(state: GameState, ...commands: Command[]): GameState {
  for (const command of commands) {
    const out = apply(state, game, command)
    expect(out.reason).toBeUndefined()
    state = out.state
  }
  return state
}

const act = (id: string): Command => ({ type: 'action', id })
const open = (): GameState => play(startingState(game), { type: 'choose', id: 'begin' })

describe('The Corner Café', () => {
  it('loads with no places, characters or plugins, and shows its staff and menu', () => {
    expect(problems).toEqual([])
    const shown = view(open(), game)
    expect(shown.stats.map((stat) => stat.text)).toEqual(['£120', '20'])
    expect(shown.entities.staff.entries.map((entry) => entry.name)).toEqual(['Ana'])
    expect(shown.entities.dish.plural).toBe('Menu')
    expect(shown.entities.dish.entries.map((entry) => entry.stats.map((stat) => stat.text))).toEqual([
      ['£4', '2'],
      ['£6', '3'],
    ])
    expect(shown.actions.map((action) => action.id)).toEqual(['end-week', 'lunch', 'soup', 'hire'])
  })

  it('hires in play: each new member of staff gets their own numbers and the next id', () => {
    let state = play(open(), act('hire'))
    expect(view(state, game).scene.body).toContain('Wages are 12 a week already.')
    state = play(state, { type: 'choose', id: 'dev' }, act('hire'), { type: 'choose', id: 'fen' })
    expect(entitiesOf(state, game, 'staff')).toEqual(['staff:ana', 'staff:#1', 'staff:#2'])
    // Ana is declared, so the save keeps only what changed about her; Dev was hired in play, with his own numbers.
    expect(state.entities.staff['#1']).toEqual({ name: 'Dev', stats: { skill: 2, morale: 80, wage: 8 } })
    expect(holds(state, { count: 'staff', gte: 3 }, game)).toBe(true)
    state = play(state, act('hire'), { type: 'choose', id: 'dev' })
    expect(apply(state, game, act('hire')).reason).toBe('There is no room behind the counter.')
  })

  it('ends a week: takings in, wages out, everyone a little more tired, and the turn moves on', () => {
    const before = open()
    const after = play(before, act('end-week'))
    expect(after.turn).toBe(1)
    // Ten covers, plus Ana's skill twice, plus reputation over five: 24, at £26 a cover, over ten.
    expect(after.stats.coins).toBe(120 + Math.round((24 * 26) / 10) - 12)
    expect(statValue(after, game, 'morale', 'staff:ana')).toBe(52)
  })

  it('loses staff whose morale runs out, and says so when nobody is left', () => {
    let state = open()
    for (let week = 0; week < 6; week += 1) state = play(state, act('end-week'))
    expect(entitiesOf(state, game, 'staff')).toEqual([])
    expect(state.notices.map((notice) => notice.title)).toContain('Nobody to open up tomorrow.')
    // With nobody in the kitchen nothing sells, but nobody is paid either.
    const coins = state.stats.coins
    expect(play(state, act('end-week')).stats.coins).toBe(coins)
  })

  it('keeps a team that is looked after, and a happy team earns a review once', () => {
    let state = play(open(), act('hire'), { type: 'choose', id: 'dev' })
    state = play(state, act('lunch'))
    expect(state.stats.reputation).toBe(30)
    expect(state.notices.map((notice) => notice.title)).toEqual(['A glowing review in the local paper.'])
    for (let week = 0; week < 6; week += 1) state = play(state, act('lunch'), act('end-week'))
    expect(entitiesOf(state, game, 'staff')).toEqual(['staff:ana', 'staff:#1'])
    expect(state.stats.reputation).toBe(30)
  })

  it('reads reputation in levels, and says when word gets round', () => {
    expect(view(open(), game).statsById.reputation.level).toEqual({ level: 0, next: 40, progress: 0.5 })
    let state = play(open(), act('hire'), { type: 'choose', id: 'dev' })
    state = play({ ...state, stats: { ...state.stats, reputation: 35 } }, act('lunch'))
    expect(state.stats.reputation).toBe(45)
    expect(state.notices.map((notice) => notice.title)).toContain('Word gets round: Reputation is now level 1.')
  })
})
