import { describe, expect, it } from 'vitest'
import { whyNot } from '../../src/availability.ts'
import { definePlugin } from '../../src/plugin.ts'
import { apply } from '../../src/reduce.ts'
import { loadGame } from '../../src/loader.ts'
import { STRINGS, say } from '../../src/strings.ts'
import type { Game } from '../../src/game.ts'
import { begin, fixture } from '../fixtures/town.ts'

describe('the strings table', () => {
  it('says the engine’s words when the game gives none', () => {
    const game = fixture()
    expect(whyNot(begin(game, { sceneId: 'rosa.hello' }), game, { type: 'action', id: 'go-street' })).toBe(STRINGS.finishFirst)
    expect(say(game, 'notEnough', { stat: 'coins', n: 3 })).toBe('Not enough coins.')
  })

  it('says the game’s words instead, in refusals and labels', () => {
    const game: Game = {
      ...fixture(),
      strings: { finishFirst: 'Not yet, love.' },
    }
    const busy = begin(game, { sceneId: 'rosa.hello' })
    expect(whyNot(busy, game, { type: 'action', id: 'go-street' })).toBe('Not yet, love.')
    expect(apply(busy, game, { type: 'action', id: 'go-street' }).reason).toBe('Not yet, love.')
  })

  it('come from packs too, so a translation can ship as a mod, later packs winning', () => {
    const { scenes: _s, introScene: _in, storylines, actions, stats, ...base } = fixture()
    const town = { name: 'town', storylines, actions, stats, scenes: _s }
    const dutch = { name: 'nl', strings: { finishFirst: 'Eerst dit afmaken.', tooEarly: 'Te vroeg.' } }
    const fixes = { name: 'nl-fixes', strings: { tooEarly: 'Nog te vroeg.' } }
    const { game } = loadGame([{ name: 'base', strings: { tooEarly: 'Too soon.' } }, town, dutch, fixes], { ...base })
    expect(say(game, 'finishFirst')).toBe('Eerst dit afmaken.')
    expect(say(game, 'tooEarly')).toBe('Nog te vroeg.')
  })

  it('cover plugins’ lines, by their id, with the plugin’s English as the fallback', () => {
    const kites = definePlugin({ id: 'kites', version: 1, strings: { noWind: 'There is no wind for {kite}.' } })
    const game: Game = { ...fixture(), plugins: [kites] }
    expect(say(game, 'kites/noWind', { kite: 'the red one' })).toBe('There is no wind for the red one.')
    expect(say({ ...game, strings: { 'kites/noWind': 'Flat calm.' } }, 'kites/noWind')).toBe('Flat calm.')
  })

  it('show a key nobody wrote as itself, so it is easy to find', () => {
    expect(say(fixture(), 'kites/noWind')).toBe('kites/noWind')
  })
})
