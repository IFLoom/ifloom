import { describe, expect, it } from 'vitest'
import type { Content, Plugin } from '../../src/index.ts'
import { boundaryProblems, exportedNames, freshState, loadChecked, partnerCases, play, undocumentedExports } from '../../src/testing.ts'

const town: Content = {
  name: 'town',
  stats: [{ id: 'coins', label: 'Coins', start: 2, spendable: true }],
  actions: [{ id: 'earn', effects: [{ stat: 'coins', by: 1 }] }],
}

const base = { id: 'g', title: 'g' }

/** A plugin with nothing in it but its id and who it cooperates with. */
const plugin = (id: string, cooperates?: string[]): Plugin => ({ id, version: 1, start: () => ({}), cooperates })

describe('the testing helpers', () => {
  it('load a game, or throw with every problem the checker found', () => {
    expect(loadChecked([town], base).id).toBe('g')
    expect(() => loadChecked([{ name: 'town', actions: [{ id: 'go', effects: [{ scene: 'nowhere' }] }] }], base)).toThrow(
      /1 content problem\(s\):\n {2}town · action go · .*nowhere/,
    )
  })

  it('start a game with no scene open', () => {
    const g = loadChecked([town], base)
    expect(freshState(g)).toMatchObject({ sceneId: null, stats: { coins: 2 } })
    expect(freshState(g, { seed: 3 }).seed).toBe(3)
  })

  it('play commands in turn, and throw on the first one refused with its reason', () => {
    const g = loadChecked([town], base)
    const earn = { type: 'action', id: 'earn' } as const
    expect(play(freshState(g), g, earn, earn).stats.coins).toBe(4)
    expect(() => play(freshState(g), g, earn, { type: 'action', id: 'nope' })).toThrow(/^Command 2, \{"type":"action","id":"nope"\}, was refused: \w/)
  })

  it('list a plugin alone and with each partner it cooperates with', () => {
    const shop = plugin('shop', ['places', 'calendar'])
    const places = plugin('places')
    const calendar = plugin('calendar')
    const cases = partnerCases(shop, [places, calendar])
    expect(cases.map(({ name, partner, plugins }) => [name, partner, plugins.map((each) => each.id)])).toEqual([
      ['alone', null, ['shop']],
      ['with places', 'places', ['places', 'shop']],
      ['with calendar', 'calendar', ['calendar', 'shop']],
    ])
    expect([cases[0].has('places'), cases[1].has('places'), cases[1].has('shop')]).toEqual([false, true, true])
    expect(() => partnerCases(shop, [plugin('cast')])).toThrow("shop doesn't cooperate with cast")
    expect(() => partnerCases(shop, [places, places])).toThrow('places is listed twice')
  })

  it('report what breaks the plugin rules in a package’s source', () => {
    expect(
      boundaryProblems({
        'src/index.ts': "import { definePlugin } from '@ifloom/engine'\nimport { helper } from './helper.ts'\nconst page = 'window.open()'",
        'src/helper.ts': "import { other } from '@ifloom/plugin-places'\nimport { Ui } from './react/index.tsx'\nwindow.alert('hi')",
        'src/react/index.tsx':
          "import { useGame } from '@ifloom/react'\nimport { x } from '@ifloom/react/kit'\nimport { y } from '../index.ts'\nimport React from 'react'",
      }),
    ).toEqual([
      'src/helper.ts → @ifloom/plugin-places',
      'src/helper.ts → ./react/index.tsx',
      'src/helper.ts: uses a browser global outside src/react/',
      'src/react/index.tsx → @ifloom/react/kit',
    ])
    expect(boundaryProblems({})).toEqual(['no source files to check'])
  })

  it('list the exports a docs page doesn’t name', () => {
    const source = 'export function shop() {}\nexport type ShopView = {}\nexport { goodsOf, type Good as ShopGood } from "./goods.ts"\nconst hidden = 1'
    expect(exportedNames(source)).toEqual(['ShopGood', 'ShopView', 'goodsOf', 'shop'])
    expect(undocumentedExports([source], 'Call `shop()` and read `ShopView`; `goodsOfAll` is something else.')).toEqual(['ShopGood', 'goodsOf'])
  })
})
