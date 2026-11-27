import { describe, expect, it } from 'vitest'
import {
  apply,
  checkGame,
  createRunner,
  holds,
  loadGame,
  loadState,
  replay,
  startingState,
  view,
  type Game,
  type GameState,
  type Content,
} from '@ifloom/engine'
import type { Plugin } from '@ifloom/engine/plugin'
import { freshState, loadChecked, play } from '@ifloom/engine/testing'
import { cheatsOf, unlocks, type CheatDef, type UnlocksView } from '../src/index.ts'

const supporter = { not: { 'unlocks/has': { unlock: 'supporter' } } }

const defs: CheatDef[] = [
  { id: 'coins', name: '+20 coins', description: 'A little help.', effects: [{ stat: 'coins', by: 20 }] },
  { id: 'map', name: 'Show the map', group: 'Story', once: { per: 'game' }, effects: [{ kv: 'map', to: true }] },
  {
    id: 'gold',
    name: '+500 coins',
    group: 'Supporters',
    blocked: [{ when: supporter, reason: 'For supporters.' }],
    effects: [{ stat: 'coins', by: 500 }],
  },
  {
    id: 'secret',
    name: 'Skip to the end',
    group: 'Supporters',
    blocked: [{ when: supporter, reason: 'For supporters.', hide: true }],
    effects: [{ scene: 'ending' }],
  },
]

/** The unlock a supporter cheat waits for. Its hash is a stand-in: these tests record it with `unlocks.record`, never a code. */
const supporterUnlock = { id: 'supporter', name: 'Supporter edition', hash: 'a'.repeat(64) }

function game(options: { pack?: Partial<Content>; plugins?: Plugin<any>[] } = {}): Game {
  const town: Content = {
    name: 'town',
    stats: [{ id: 'coins', label: 'Coins', start: 5, max: 9999 }],
    scenes: [
      { id: 'intro', body: [], choices: [] },
      { id: 'ending', body: [], choices: [] },
    ],
    actions: [{ id: 'rest', effects: [{ turn: true }] }],
    data: { unlocks: { unlocks: [supporterUnlock], cheats: defs } },
    ...options.pack,
  }
  return loadChecked([{ name: 'base', locks: [{ when: { scene: ['intro'] }, deny: ['*'], reason: 'Finish the intro.' }] }, town], {
    id: 'g',
    title: 'g',
    plugins: [unlocks(), ...(options.plugins ?? [])],
  })
}

const shown = (g: Game, state: GameState): UnlocksView => view(state, g).plugins.unlocks!

describe('cheats', () => {
  it('runs a cheat’s effects through a lock, in a scene, with no turn passing', () => {
    const g = game()
    const start = { ...startingState(g), sceneId: 'intro' }
    expect(apply(start, g, { type: 'action', id: 'rest' }).reason).toBe('Finish the intro.')
    const after = play(start, g, unlocks.cheat('coins'), unlocks.cheat('coins'))
    expect(after.stats.coins).toBe(45)
    expect(after.turn).toBe(start.turn)
    expect(after.sceneId).toBe('intro')
  })

  it('logs each use with its turn, for content and a replay to read', () => {
    const g = game()
    let state = play(freshState(g), g, unlocks.cheat('coins'), { type: 'action', id: 'rest' }, unlocks.cheat('coins'))
    expect(unlocks().read(state, g).cheated).toEqual([
      { cheat: 'coins', turn: 0 },
      { cheat: 'coins', turn: 1 },
    ])
    expect(holds(state, g, unlocks.cheated())).toBe(true)
    expect(holds(state, g, unlocks.cheated('coins'))).toBe(true)
    expect(holds(state, g, unlocks.cheated('map'))).toBe(false)
    state = play(state, g, unlocks.cheat('map'))
    expect(shown(g, state).cheated).toBe(3)
    expect(shown(g, state).cheats.map((cheat) => [cheat.id, cheat.used])).toEqual([
      ['coins', 2],
      ['map', 1],
      ['gold', 0],
    ])
    expect(holds(freshState(g), g, unlocks.cheated())).toBe(false)
  })

  it('shows each cheat as a button, with its group, and refuses a once cheat used', () => {
    const g = game()
    const before = shown(g, freshState(g))
    expect(before.cheats.map((cheat) => cheat.id)).toEqual(['coins', 'map', 'gold'])
    expect(before.cheats[0]).toMatchObject({ name: '+20 coins', description: 'A little help.', group: null, once: null, used: 0 })
    expect(before.cheats[0].button).toMatchObject({
      id: 'cheat.coins',
      label: '+20 coins',
      command: { type: 'custom', name: 'unlocks/cheat', with: { id: 'coins' } },
    })
    expect(before.cheats[0].button.disabled).toBeUndefined()
    expect(before.cheats[0].button.price).toBeUndefined()
    expect(before.cheats[1]).toMatchObject({ group: 'Story', once: 'game' })
    const used = play(freshState(g), g, unlocks.cheat('map'))
    expect(shown(g, used).cheats[1].button.disabled).toBe('Already used.')
    expect(apply(used, g, unlocks.cheat('map')).reason).toBe('Already used.')
  })

  it('refuses a cheat once a turn until the turn ends, with its own reason', () => {
    const daily: CheatDef = { id: 'nap', name: 'Nap', once: { per: 'turn', reason: 'Once a day.' }, effects: [{ stat: 'coins', by: 1 }] }
    const g = game({ pack: { data: { unlocks: { unlocks: [supporterUnlock], cheats: [...defs, daily] } } } })
    const used = play(freshState(g), g, unlocks.cheat('nap'))
    expect(apply(used, g, unlocks.cheat('nap')).reason).toBe('Once a day.')
    expect(apply(apply(used, g, { type: 'action', id: 'rest' }).state, g, unlocks.cheat('nap')).ok).toBe(true)
  })

  it('refuses a cheat that isn’t there', () => {
    const g = game()
    expect(apply(freshState(g), g, unlocks.cheat('nothing')).reason).toBe('There’s no such cheat.')
  })

  it('replays exactly, and an old save with no state for the plugin loads', () => {
    const g = game()
    const runner = createRunner(g, freshState(g))
    runner.apply(unlocks.cheat('coins'))
    runner.apply({ type: 'action', id: 'rest' })
    runner.apply(unlocks.cheat('map'))
    runner.apply(unlocks.cheat('coins'))
    expect(replay(g, runner.log())).toEqual({ ok: true, value: runner.state })
    const { plugins: _none, ...old } = freshState(g)
    const loaded = loadState(JSON.parse(JSON.stringify({ ...old, plugins: {} })), g)
    if (!loaded.ok) throw new Error(loaded.reason)
    expect(shown(g, loaded.value).cheated).toBe(0)
    expect(unlocks().read(play(loaded.value, g, unlocks.cheat('coins')), g).cheated).toHaveLength(1)
  })

  it('lets content react to a cheat being used', () => {
    const g = game({ pack: { actions: [{ id: 'honest', blocked: [{ when: unlocks.cheated(), reason: 'You cheated.' }], effects: [] }] } })
    expect(apply(freshState(g), g, { type: 'action', id: 'honest' }).reason).toBeUndefined()
    expect(apply(play(freshState(g), g, unlocks.cheat('coins')), g, { type: 'action', id: 'honest' }).reason).toBe('You cheated.')
  })

  it('reports a cheat content names that the game lacks, and what a cheat names', () => {
    const loaded = loadGame(
      [
        {
          name: 'town',
          actions: [{ id: 'peek', blocked: [{ when: unlocks.cheated('nope'), reason: 'x' }], effects: [] }],
          data: { unlocks: { cheats: [{ id: 'coins', name: '+20 coins', effects: [{ stat: 'coins', by: 20 }] }] } },
        },
      ],
      { id: 'g', title: 'g', plugins: [unlocks()] },
    )
    expect(loaded.problems.map((problem) => problem.what).sort()).toEqual(['unknown cheat "nope"', 'unknown stat "coins"'])
  })

  it('reports a cheat with no name, no effects or two with one id', () => {
    const g = game()
    const broken = {
      ...g,
      data: { unlocks: { unlocks: [supporterUnlock], cheats: [...defs, defs[0], { id: 'blank', name: ' ', effects: [] }] } },
    }
    const problems = checkGame(broken).problems.map((problem) => problem.what)
    expect(problems).toContain('two cheats share this id')
    expect(problems).toContain('has no name')
    expect(problems).toContain('has no effects')
  })

  it('reads its cheats from every pack, merged by id', () => {
    const g = game()
    expect(cheatsOf(g).map((cheat) => cheat.id)).toEqual(['coins', 'map', 'gold', 'secret'])
  })
})

describe('cheats behind an unlock', () => {
  it('keeps a supporter cheat greyed out, or hidden, until the unlock is recorded', () => {
    const g = game()
    const locked = shown(g, freshState(g))
    expect(locked.cheats.map((cheat) => cheat.id)).toEqual(['coins', 'map', 'gold'])
    expect(locked.cheats[2].button.disabled).toBe('For supporters.')
    expect(apply(freshState(g), g, unlocks.cheat('gold')).reason).toBe('For supporters.')
    expect(apply(freshState(g), g, unlocks.cheat('secret')).reason).toBe('For supporters.')

    const unlocked = play(freshState(g), g, unlocks.record('supporter'))
    const open = shown(g, unlocked)
    expect(open.cheats.map((cheat) => cheat.id)).toEqual(['coins', 'map', 'gold', 'secret'])
    expect(open.cheats.every((cheat) => cheat.button.disabled === undefined)).toBe(true)
    const rich = play(unlocked, g, unlocks.cheat('gold'), unlocks.cheat('secret'))
    expect(rich.stats.coins).toBe(505)
    expect(rich.sceneId).toBe('ending')
  })
})
