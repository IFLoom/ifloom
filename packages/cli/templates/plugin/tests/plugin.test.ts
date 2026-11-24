import { describe, expect, it } from 'vitest'
import { apply, checkGame, holds, loadGame, view, type Content, type Game, type Plugin } from '@ifloom/engine'
import { freshState, loadChecked, partnerCases, play } from '@ifloom/engine/testing'
import { __camel__, type __Pascal__Entry } from '../src/index.ts'

const entries: __Pascal__Entry[] = [
  { id: 'bread', label: 'A loaf of bread' },
  { id: 'milk', label: 'A pint of milk' },
]

const town: Content = {
  name: 'town',
  actions: [{ id: 'shop', effects: [__camel__.mark('bread')] }],
  data: { '__id__': { entries } },
}

/** The town with these plugins, failing on any problem the content checker finds. */
const game = (plugins: Plugin[] = [__camel__()]): Game => loadChecked([town], { id: '__id__-town', title: '{{title}} town', plugins })

const shown = (g: Game, state = freshState(g)) => __camel__().viewIn(view(state, g))!

// TODO: replace these with the plugin's real behaviour.
describe('__id__', () => {
  it('refuses to mark what is not there', () => {
    const g = game()
    expect(apply(freshState(g), g, __camel__.markCommand('cheese')).reason).toBe('There is nothing like that.')
  })

  it('reports an entry content names that the game lacks', () => {
    const loaded = loadGame([{ ...town, actions: [{ id: 'shop', effects: [__camel__.mark('cheese')] }] }], {
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

// The plugin alone, then with each plugin it cooperates with: list a partner here, such as
// `places({ start: 'street' })`, once it's in the plugin's `cooperates`, and test what it changes in its own block.
for (const { name, plugins } of partnerCases(__camel__(), [])) {
  describe(`__id__, ${name}`, () => {
    it('marks an entry through its effect and its command, and shows it', () => {
      const g = game(plugins)
      expect(shown(g).entries.map((entry) => entry.marked)).toEqual([false, false])
      const shopped = play(freshState(g), g, { type: 'action', id: 'shop' })
      expect(holds(shopped, g, __camel__.marked('bread'))).toBe(true)
      const both = play(shopped, g, __camel__.markCommand('milk'))
      expect(shown(g, both).entries.map((entry) => entry.marked)).toEqual([true, true])
    })
  })
}
