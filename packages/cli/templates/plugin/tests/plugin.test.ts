import { describe, expect, it } from 'vitest'
import { apply, checkGame, holds, loadGame, startingState, view, type Game, type Content } from '@ifloom/engine'
import { __camel__, __camel__Marked, mark__Pascal__, mark__Pascal__Command, type __Pascal__Entry } from '../src/index.ts'

const entries: __Pascal__Entry[] = [
  { id: 'bread', label: 'A loaf of bread' },
  { id: 'milk', label: 'A pint of milk' },
]

function game(extra: Partial<Content> = {}): Game {
  const town: Content = {
    name: 'town',
    actions: [{ id: 'shop', effects: [mark__Pascal__('bread')] }],
    data: { '__id__': { entries } },
    ...extra,
  }
  const loaded = loadGame([town], { id: '__id__-town', title: '{{title}} town', plugins: [__camel__()] })
  expect(loaded.problems).toEqual([])
  return loaded.game
}

const shown = (g: Game, state = startingState(g)) => __camel__().viewIn(view(state, g))!

// TODO: replace these with the plugin's real behaviour. For each plugin it
// cooperates with, add a describe block: the game with that plugin, and without it.
describe('__id__', () => {
  it('marks an entry through its effect and its command, and shows it', () => {
    const g = game()
    const fresh = { ...startingState(g), sceneId: null }
    expect(shown(g, fresh).entries.map((entry) => entry.marked)).toEqual([false, false])
    const shopped = apply(fresh, g, { type: 'action', id: 'shop' })
    expect(shopped.reason).toBeUndefined()
    expect(holds(shopped.state, __camel__Marked('bread'), g)).toBe(true)
    const milk = apply(shopped.state, g, mark__Pascal__Command('milk'))
    expect(shown(g, milk.state).entries.map((entry) => entry.marked)).toEqual([true, true])
  })

  it('refuses to mark what is not there', () => {
    const g = game()
    expect(apply({ ...startingState(g), sceneId: null }, g, mark__Pascal__Command('cheese')).reason).toBe('There is nothing like that.')
  })

  it('reports an entry content names that the game lacks', () => {
    const loaded = loadGame([{ name: 'town', actions: [{ id: 'shop', effects: [mark__Pascal__('cheese')] }], data: { '__id__': { entries } } }], {
      id: '__id__-town',
      title: '{{title}} town',
      plugins: [__camel__()],
    })
    expect(loaded.problems.map((problem) => problem.what)).toEqual(['unknown entry "cheese"'])
  })

  it('reports two entries with one id in a hand-built game (loading merges entries by id)', () => {
    const g = game()
    const doubled = { ...g, data: { '__id__': { entries: [...entries, entries[0]] } } }
    expect(checkGame(doubled).problems.map((problem) => problem.what)).toContain('two entries share this id')
  })
})
