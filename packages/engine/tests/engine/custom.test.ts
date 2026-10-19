import { describe, expect, it } from 'vitest'
import { holds } from '../../src/condition.ts'
import { buildEffects, previewEffects, type CustomEffect } from '../../src/custom.ts'
import { apply, applyEffects } from '../../src/reduce.ts'
import { definePlugin } from '../../src/plugin.ts'
import { effectsOf, whyNot } from '../../src/availability.ts'
import { renderAction } from '../../src/screen.ts'
import { fillTokens } from '../../src/prose.ts'
import { problemsOf } from '../fixtures/checked.ts'
import { loadGame } from '../../src/loader.ts'
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
    const game = {
      ...fixture(),
      custom: { effects: { tip: (_state: unknown, args: Record<string, unknown>) => [{ kind: 'stat' as const, stat: 'coins', by: Number(args.by) }] } },
    }
    expect(buildEffects(begin(game), game, [{ custom: 'tip', with: { by: 2 } }])).toEqual([{ kind: 'custom', name: 'tip', with: { by: 2 } }])
    expect(buildEffects(begin(game), game, [{ custom: 'nothing' }])).toEqual([])
    expect(applyEffects(begin(game), game, buildEffects(begin(game), game, [{ custom: 'tip', with: { by: 2 } }])).stats.coins).toBe(5)
    // What a button would do, before it runs: worked out against the state now.
    expect(previewEffects(begin(game), game, [{ kind: 'custom', name: 'tip', with: { by: 2 } }])).toEqual([{ kind: 'stat', stat: 'coins', by: 2 }])
  })

  it('runs a custom effect in its turn, on the state the effects before it left', () => {
    // Doubles the coins the player has when it runs.
    const double: CustomEffect = (state) => [{ kind: 'stat', stat: 'coins', by: state.stats.coins }]
    const game = { ...fixture(), custom: { effects: { double } } }
    const state = applyEffects(
      begin(game),
      game,
      buildEffects(begin(game), game, [{ kind: 'stat', stat: 'coins', by: 4 }, { custom: 'double' }, { custom: 'double' }]),
    )
    // 3 + 4 = 7, doubled to 14, doubled to 28.
    expect(state.stats.coins).toBe(28)
  })

  it('hands a custom function the game, the plugins’ queries and values, and seeded draws', () => {
    const tides = definePlugin<{ high: boolean }>({
      id: 'tides',
      version: 1,
      start: () => ({ high: true }),
      queries: { high: (_state, _args, { slice }) => slice.high },
      values: { height: (_state, args, { slice }) => (slice.high ? 3 : 1) * Number(args.times ?? 1) },
    })
    const seen: unknown[] = []
    const game: Game = {
      ...fixture(),
      plugins: [tides],
      custom: {
        conditions: { highTide: (_state, _args, { query }) => query<boolean>('tides/high') === true },
        effects: {
          wade: (_state, _args, { game, value, roll }) => {
            seen.push(game.id, roll(6, 'wade'), roll(6, 'wade'))
            return [{ kind: 'stat', stat: 'coins', by: Number(value('tides/height', { times: 2 })) }]
          },
        },
        values: { tide: (_state, args, { value }) => `${value('tides/height')} ${String(args.unit)}` },
      },
    }
    game.prose = proseStore(game, {})
    expect(holds(begin(game), { custom: 'highTide' }, game)).toBe(true)
    expect(applyEffects(begin(game), game, buildEffects(begin(game), game, [{ custom: 'wade' }])).stats.coins).toBe(9)
    expect(seen[0]).toBe('fixture')
    expect(seen[1]).toBe(seen[2])
    expect(fillTokens('{{v:tide unit=feet}} and {{v:tides/height times=2}}', begin(game), game)).toBe('3 feet and 6')
  })

  it('takes a plugin’s command in short, as content and the runner write it', () => {
    const bells = definePlugin({
      id: 'bells',
      version: 1,
      commands: {
        ring: {
          whyNot: (_state, args) => (args.times === 0 ? 'Silence.' : undefined),
          run: (state, args) => ({ ...state, kv: { ...state.kv, rung: Number(args.times) } }),
          effectsOf: () => [{ kind: 'stat', stat: 'coins', by: -1 }],
        },
      },
    })
    const game: Game = { ...fixture(), plugins: [bells], actions: [{ id: 'ring', label: 'Ring', command: { 'bells/ring': { times: 2 } } }] }
    const applied = apply(begin(game), game, { 'bells/ring': { times: 3 } })
    expect(applied.ok && applied.state.kv.rung).toBe(3)
    expect(whyNot(begin(game), game, { 'bells/ring': { times: 0 } })).toBe('Silence.')
    expect(effectsOf(begin(game), game, { 'bells/ring': { times: 1 } })).toEqual([{ kind: 'stat', stat: 'coins', by: -1 }])
    // The view shows it in the long form.
    expect(renderAction(begin(game), game, game.actions![0]).command).toEqual({ type: 'custom', name: 'bells/ring', with: { times: 2 } })
    expect(problemsOf(game)).toEqual([])
  })

  it('reports a short call whose arguments are not an object, and asks it with none', () => {
    const tides = definePlugin({ id: 'tides', version: 1, conditions: { high: (_state, args) => args.at === undefined } })
    const game: Game = {
      ...fixture(),
      plugins: [tides],
      actions: [{ id: 'wade', label: 'Wade', command: { type: 'activity', id: 'wait' }, when: { 'tides/high': ['noon'] } as never }],
    }
    expect(problemsOf(game)).toEqual([
      'action wade: "tides/high" takes its arguments as an object, such as { "tides/high": { … } }, or true for none; this one has ["noon"]',
    ])
    expect(holds(begin(game), { 'tides/high': ['noon'] } as never, game)).toBe(true)
  })

  it("reports a key content can't hold, rather than dropping it quietly", () => {
    const { scenes: _s, storylines, activities, stats, ...rest } = fixture()
    const { problems } = loadGame([{ name: 'town', storylines, activities, stats, actions: [] } as never], rest)
    expect(problems.map((problem) => `${problem.pack} · ${problem.where} · ${problem.what}`)).toContain(
      'town · content · content has no "actions", so it was left out',
    )
    expect(problems.filter((problem) => problem.where === 'content')).toHaveLength(1)
  })

  it('reports a ceiling that names a value nobody declared', () => {
    const game = { ...fixture(), stats: [{ id: 'puff', label: 'Puff', max: { value: 'gone' } }] }
    expect(problemsOf(game)).toContain('stat puff: no custom value named "gone"')
  })

  it('keeps the base game’s functions when content is loaded over it', () => {
    const base = { ...fixture(), custom: { conditions: { fine: () => true } } }
    const { scenes: _s, storylines, activities, stats, ...rest } = base
    const { game } = loadGame([{ name: 'town', storylines, activities, stats }], rest)
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
