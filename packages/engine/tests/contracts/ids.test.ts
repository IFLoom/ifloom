import { describe, expect, it } from 'vitest'
import type { Content } from '../../src/loader.ts'
import { offences, proseOffences } from './ids-rule.ts'
import { smallTown, content as town } from '../../../../examples/showcase/src/game.ts'
import { content as letter } from '../../../../examples/novel/src/game.ts'
import { content as corner } from '../../../../examples/cafe/src/game.ts'
import fogSeason from '../../../../examples/showcase/mods/fog-season.json'

describe('ids and separators (ADR 0010)', () => {
  it('holds the examples’ content and the showcase’s mod to the rule', () => {
    const content: [string, Content][] = [
      ...[...town, ...letter, ...corner].map((piece, index): [string, Content] => [`content[${index}]`, piece]),
      ['mod:fog-season', fogSeason.pack as unknown as Content],
    ]
    expect(content.flatMap(([where, piece]) => [...offences(piece, where), ...proseOffences(piece, where)])).toEqual([])
  })

  it('holds the first-party plugins’ content in the showcase to the rule', () => {
    const { game } = smallTown({ withDebug: true })
    expect(offences(game.data, 'data')).toEqual([])
    expect(offences(game.kinds, 'kinds')).toEqual([])
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
    expect(proseOffences({ prose: { 'a.b': '', 'a#b': '', 'a/b': '' } }, 'p')).toEqual(['p prose: "a/b" is not an id, or scene#choice'])
  })
})
