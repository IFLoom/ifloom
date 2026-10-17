import { describe, expect, it } from 'vitest'
import { holds } from '../../src/condition.ts'
import { buildEffects } from '../../src/custom.ts'
import { problemsOf } from '../fixtures/checked.ts'
import { SCHEMA, loadGame } from '../../src/loader.ts'
import { proseStore } from '../../src/prose.ts'
import { view } from '../../src/view.ts'
import type { Game } from '../../src/game.ts'
import { begin, fixture } from '../fixtures/town.ts'

describe('custom functions belong to their game', () => {
  const sunny = { ...fixture(), custom: { conditions: { fine: () => true } } }
  const rainy = { ...fixture(), custom: { conditions: { fine: () => false } } }

  it('answers a custom condition from the game it is asked about', () => {
    expect(holds(begin(sunny), { custom: 'fine' }, sunny)).toBe(true)
    expect(holds(begin(rainy), { custom: 'fine' }, rainy)).toBe(false)
    expect(holds(begin(sunny), { custom: 'fine' }, fixture())).toBe(false)
  })

  it('runs a custom effect by name, and drops one the game does not have', () => {
    const game = { ...fixture(), custom: { effects: { tip: (_state: unknown, args: Record<string, unknown>) => [{ kind: 'stat' as const, stat: 'coins', by: Number(args.by) }] } } }
    expect(buildEffects(begin(game), game, [{ custom: 'tip', with: { by: 2 } }])).toEqual([{ kind: 'stat', stat: 'coins', by: 2 }])
    expect(buildEffects(begin(game), game, [{ custom: 'nothing' }])).toEqual([])
  })

  it('reports a ceiling that names a value nobody declared', () => {
    const game = { ...fixture(), stats: [{ id: 'puff', label: 'Puff', max: { value: 'gone' } }] }
    expect(problemsOf(game)).toContain('stat puff: no custom value named "gone"')
  })

  it('keeps the base game’s functions when packs are loaded over it', () => {
    const base = { ...fixture(), custom: { conditions: { fine: () => true } } }
    const { scenes: _s, items, storylines, activities, stats, ...rest } = base
    const { game } = loadGame([{ id: 'town', schema: SCHEMA, items, storylines, activities, stats }], rest)
    expect(holds(begin(game), { custom: 'fine' }, game)).toBe(true)
  })

  it('runs one data scene with each game’s own functions', () => {
    const scene = { id: 'sky', body: [{ text: 'sky', when: { custom: 'fine' } }], choices: [] }
    const prose = (game: Game) => proseStore(game, { sky: 'Blue sky.' })
    const sunnyGame: Game = { ...sunny, scenes: [scene], introScene: 'sky' }
    const rainyGame: Game = { ...rainy, scenes: [scene], introScene: 'sky' }
    sunnyGame.prose = prose(sunnyGame)
    rainyGame.prose = prose(rainyGame)
    expect(view({ ...begin(sunnyGame), sceneId: 'sky' }, sunnyGame).scene.body).toBe('Blue sky.')
    expect(view({ ...begin(rainyGame), sceneId: 'sky' }, rainyGame).scene.body).toBe('')
  })
})
