import { describe, expect, it } from 'vitest'
import { checkGame } from '../../src/check.ts'
import { creditsOf } from '../../src/features/credits.ts'
import { loadGame, type Content } from '../../src/loader.ts'
import { SCHEMA } from '../../src/upgrade.ts'
import { problemsOf } from '../fixtures/checked.ts'

const base = { id: 'harbour', title: 'Harbour' }

const team: Content = {
  name: 'team',
  credits: [
    { id: 'team', title: 'Team', credits: [{ name: 'Ada', role: 'Writer' }] },
    { id: 'images', title: 'Images', credits: [{ name: 'Sam Lee', role: 'Cover photograph', licence: 'CC BY 4.0', href: 'https://example.com/sam' }] },
  ],
}

describe('credits', () => {
  it('keep their groups in the order each was first declared, adding a later file’s credits to a group with its id', () => {
    const more: Content = {
      name: 'more',
      credits: [
        { id: 'patrons', title: 'Patrons', credits: [{ name: 'Kit', role: 'Gold patron' }] },
        { id: 'team', title: 'The team', credits: [{ name: 'Bo', role: 'Art' }] },
      ],
    }
    const { game, problems } = loadGame([team, more], base)
    expect(problems).toEqual([])
    expect(game.credits?.map((group) => [group.id, group.title, group.credits.map((credit) => credit.name)])).toEqual([
      ['team', 'The team', ['Ada', 'Bo']],
      ['images', 'Images', ['Sam Lee']],
      ['patrons', 'Patrons', ['Kit']],
    ])
  })

  it('let a mod credit itself, and name the mod a problem in its credits came from', () => {
    const mod = {
      id: 'lighthouse-mod',
      schema: SCHEMA,
      credits: [
        { id: 'mods', title: 'Mods', credits: [{ name: 'Rin', role: 'Lighthouse mod' }] },
        { id: 'team', title: 'Team', credits: [{ name: '', role: 'Testing' }] },
      ],
    }
    const { game } = loadGame([team], base, { packs: [mod] })
    expect(creditsOf(game).map((group) => group.id)).toEqual(['team', 'images', 'mods'])
    expect(checkGame(game).problems).toContainEqual({ pack: 'game', where: 'credits team credit 2', what: 'a credit needs its name' })
    expect(checkGame(game).problems.filter((problem) => problem.where.startsWith('credits mods'))).toEqual([])
  })

  it('leave out a group with no credits from creditsOf, and give none for a game that credits no one', () => {
    const { game } = loadGame([{ name: 'empty', credits: [{ id: 'soon', title: 'Coming soon', credits: [] }] }], base)
    expect(game.credits).toHaveLength(1)
    expect(creditsOf(game)).toEqual([])
    expect(creditsOf(loadGame([], base).game)).toEqual([])
  })

  it('are checked: a group needs its title, a credit its name, and a link must be http, https or mailto', () => {
    const { game } = loadGame(
      [
        {
          name: 'bad',
          credits: [
            {
              id: 'team',
              title: '',
              credits: [
                { name: 'Ada', href: 'javascript:alert(1)' },
                { name: 'Bo', href: 'mailto:bo@example.com' },
              ],
            },
            { id: 'thanks', title: 'Thanks', credits: 'everyone' as never },
          ],
        },
      ],
      base,
    )
    expect(problemsOf(game)).toEqual([
      'credits team: a credit group needs its title',
      'credits team credit 1: href must start with http://, https:// or mailto:',
      'credits thanks: credits must be a list',
    ])
  })

  it('list a credit’s picture among the files the game names', () => {
    const { game } = loadGame(
      [{ name: 'art', credits: [{ id: 'cast', title: 'Models', credits: [{ name: 'Jo', role: 'Model', art: 'credits/jo.png' }] }] }],
      base,
    )
    expect(checkGame(game).files).toContainEqual({ path: 'art/credits/jo.png', type: 'picture', where: 'credits cast credit 1' })
  })
})
