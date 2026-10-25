import { describe, expect, it } from 'vitest'
import { apply } from '../../src/reduce.ts'
import { whyNot } from '../../src/availability.ts'
import { checkGame } from '../../src/check.ts'
import { view } from '../../src/view.ts'
import { definePlugin } from '../../src/plugin.ts'
import type { Game } from '../../src/game.ts'
import type { Command, GameState } from '../../src/types.ts'
import { activities, begin, fixture } from '../fixtures/town.ts'

/** The town with a counter and a notice board that open panels, one of them as the turn ends. */
function withPanels(rules: Parameters<typeof fixture>[0] = {}): Game {
  return {
    ...fixture(rules),
    actions: [
      ...activities,
      { id: 'counter', effects: [{ panel: 'shop', with: { vendor: 'bakery' } }] },
      { id: 'board', effects: [{ panel: 'jobs' }] },
      { id: 'late-board', effects: [{ turn: true }, { panel: 'jobs', with: { job: ['baker'] } }] },
      { id: 'look-away', effects: [{ panel: null }] },
      { id: 'meet-rosa', effects: [{ scene: 'rosa.hello' }] },
    ],
  }
}

const act = (id: string): Command => ({ type: 'action', id })

function run(game: Game, state: GameState, ...commands: Command[]): GameState {
  return commands.reduce((next, command) => {
    const result = apply(next, game, command)
    if (!result.ok) throw new Error(`${JSON.stringify(command)}: ${result.reason}`)
    return result.state
  }, state)
}

describe('panels', () => {
  it('open by name with what they need, show in the view, and close on closePanel', () => {
    const game = withPanels()
    const open = run(game, begin(game), act('counter'))
    expect(open.panel).toEqual({ panel: 'shop', with: { vendor: 'bakery' } })
    expect(view(open, game).panel).toEqual({ panel: 'shop', with: { vendor: 'bakery' } })
    const closed = run(game, open, { type: 'closePanel' })
    expect(closed.panel).toBeNull()
    expect(view(closed, game).panel).toBeNull()
    expect(whyNot(closed, game, { type: 'closePanel' })).toBe('Nothing is open.')
  })

  it('start closed, and give an empty `with` when the effect gives none', () => {
    const game = withPanels()
    expect(begin(game).panel).toBeNull()
    expect(run(game, begin(game), act('board')).panel).toEqual({ panel: 'jobs', with: {} })
  })

  it('are replaced by another, and closed by `panel: null`', () => {
    const game = withPanels()
    const state = run(game, begin(game), act('counter'), act('board'))
    expect(state.panel?.panel).toBe('jobs')
    expect(run(game, state, act('look-away')).panel).toBeNull()
  })

  it('stay open while the player uses them, and close as a turn ends or the scene changes', () => {
    const game = withPanels()
    const open = run(game, begin(game), act('counter'))
    // Buying, applying, reading: nothing that moves the story on.
    expect(run(game, open, act('read'), act('wait')).panel?.panel).toBe('shop')
    expect(run(game, open, act('rest')).panel).toBeNull()
    expect(run(game, open, act('meet-rosa')).panel).toBeNull()
  })

  it('stay open after the command that opened them, even one that ends a turn', () => {
    const game = withPanels()
    const state = run(game, begin(game), act('late-board'))
    expect(state.turn).toBe(begin(game).turn + 1)
    expect(state.panel).toEqual({ panel: 'jobs', with: { job: ['baker'] } })
  })

  it('can always be closed, whatever lock is on', () => {
    const game = withPanels({ locks: [{ when: { kv: 'busy' }, deny: ['*'], reason: 'Busy.' }] })
    const state = run(game, begin(game), act('counter'))
    const busy = { ...state, kv: { ...state.kv, busy: true } }
    expect(whyNot(busy, game, act('wait'))).toBe('Busy.')
    expect(run(game, busy, { type: 'closePanel' }).panel).toBeNull()
  })

  it('are checked by the plugins that know them, and any other name passes', () => {
    const counter = definePlugin({
      id: 'counter',
      version: 1,
      panelProblems: (panel, args, _game, tools) =>
        panel !== 'shop' ? [] : args.vendor === undefined ? ['the shop panel needs a vendor'] : tools.problems([{ entity: String(args.vendor) }]),
    })
    const game: Game = {
      ...withPanels(),
      plugins: [counter],
      actions: [
        ...activities,
        { id: 'a', effects: [{ panel: 'shop', with: { vendor: 'nowhere' } }] },
        { id: 'b', effects: [{ panel: 'shop' }] },
        { id: 'c', effects: [{ panel: 'mine', with: { anything: 1 } }] },
      ],
    }
    expect(checkGame(game).problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual([
      'action a: unknown entity "nowhere": name one as "kind:id"',
      'action b: the shop panel needs a vendor',
    ])
  })
})

describe('a scene’s panel', () => {
  function withStall(): Game {
    const town = fixture()
    return {
      ...town,
      scenes: [
        ...town.scenes,
        {
          id: 'stall',
          body: [],
          choices: [{ id: 'bye', label: 'stall#bye', effects: [{ scene: null }] }],
          panel: { panel: 'prices', with: { stall: 'bread' } },
        },
      ],
      actions: [...activities, { id: 'counter', effects: [{ panel: 'shop', with: { vendor: 'bakery' } }] }],
    }
  }

  it('is open, as view.panel, for as long as the scene is', () => {
    const game = withStall()
    const at = { ...begin(game), sceneId: 'stall' }
    expect(view(at, game).panel).toEqual({ panel: 'prices', with: { stall: 'bread' }, scene: 'stall' })
    expect(at.panel).toBeNull()
    expect(apply(at, game, { type: 'closePanel' }).ok).toBe(false)
    const left = apply(at, game, { type: 'choose', id: 'bye' }).state
    expect(view(left, game).panel).toBeNull()
  })

  it('gives way to one the panel effect opened', () => {
    const game = withStall()
    const opened = { ...begin(game), sceneId: 'stall', panel: { panel: 'shop', with: { vendor: 'bakery' } } }
    expect(view(opened, game).panel).toEqual({ panel: 'shop', with: { vendor: 'bakery' } })
  })

  it('is checked as the panel effect is', () => {
    const shop = definePlugin<null>({
      id: 'shop',
      version: 1,
      panelProblems: (panel, args) => (panel === 'prices' && !args.stall ? ['prices needs a stall'] : []),
    })
    const town = fixture()
    const game: Game = { ...town, plugins: [shop], scenes: [...town.scenes, { id: 'stall', body: [], choices: [], panel: { panel: 'prices' } }] }
    expect(checkGame(game).problems.map((problem) => `${problem.where}: ${problem.what}`)).toContain('scene stall: prices needs a stall')
  })
})
