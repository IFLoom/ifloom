import { describe, expect, it } from 'vitest'
import type { Pack } from '../../src/loader.ts'
import { offences, proseOffences } from './ids-rule.ts'
import { smallTown } from '../../../../examples/showcase/src/game.ts'
import { town } from '../../../../examples/showcase/src/content/town.ts'
import { letter } from '../../../../examples/novel/src/game.ts'
import { corner } from '../../../../examples/cafe/src/game.ts'
import fogSeason from '../../../../examples/showcase/mods/fog-season.json'

describe('ids and separators (ADR 0010)', () => {
  it('holds the examples’ packs and the showcase’s mod to the rule', () => {
    const packs = [town, letter, corner, fogSeason.pack as unknown as Pack]
    expect(packs.flatMap((pack) => [...offences(pack, pack.id), ...proseOffences(pack)])).toEqual([])
  })

  it('holds the first-party plugins’ content in the showcase to the rule', () => {
    const { game } = smallTown({ withDebug: true })
    expect(offences(game.data, 'data')).toEqual([])
    expect(offences(game.collections, 'collections')).toEqual([])
    expect(Object.keys(game.data ?? {}).length).toBeGreaterThan(5)
  })

  it('catches what breaks it', () => {
    expect(offences({ id: 'cafe/counter', when: { chose: 'cafe.counter/buy' }, of: 'character/ava' }, 'x')).toEqual([
      'x.id: "cafe/counter" is not an id',
      'x.when.chose: "cafe.counter/buy" is not scene#choice',
    ])
    expect(offences({ 'quests/done': { quest: 'a' }, 'my.thing/x/y': true, custom: 'a/b/c' }, 'x')).toEqual([
      'x.my.thing/x/y: "my.thing/x/y" is not plugin/name',
      'x.custom: "a/b/c" is not plugin/name',
    ])
    expect(proseOffences({ id: 'p', schema: 1, prose: { 'a.b': '', 'a#b': '', 'a/b': '' } })).toEqual(['p prose: "a/b" is not an id, or scene#choice'])
  })
})
