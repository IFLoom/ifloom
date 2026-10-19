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
function withPanels(rules: Game['rules'] = {}): Game {
  return {
    ...fixture(rules),
    activities: [
      ...activities,
      { id: 'counter', effects: [{ kind: 'panel', panel: 'shop', with: { vendor: 'bakery' } }] },
      { id: 'board', effects: [{ kind: 'panel', panel: 'jobs' }] },
      { id: 'late-board', effects: [{ kind: 'turn' }, { kind: 'panel', panel: 'jobs', with: { job: ['baker'] } }] },
      { id: 'look-away', effects: [{ kind: 'panel', panel: null }] },
      { id: 'meet-rosa', effects: [{ kind: 'scene', scene: 'rosa.hello' }] },
    ],
  }
}

const act = (id: string): Command => ({ type: 'activity', id })

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
      activities: [
        ...activities,
        { id: 'a', effects: [{ kind: 'panel', panel: 'shop', with: { vendor: 'nowhere' } }] },
        { id: 'b', effects: [{ kind: 'panel', panel: 'shop' }] },
        { id: 'c', effects: [{ kind: 'panel', panel: 'mine', with: { anything: 1 } }] },
      ],
    }
    expect(checkGame(game).problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual([
      'activity a: unknown entity "nowhere": name one as "kind:id"',
      'activity b: the shop panel needs a vendor',
    ])
  })
})
