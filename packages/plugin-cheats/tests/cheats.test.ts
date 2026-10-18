import { describe, expect, it } from 'vitest'
import {
  SCHEMA,
  apply,
  checkGame,
  createRunner,
  definePlugin,
  holds,
  loadGame,
  loadState,
  replay,
  startingState,
  view,
  type CommandRef,
  type Game,
  type GameState,
  type Pack,
  type Plugin,
} from '@ifloom/engine'
import { cheatDefs, cheatUsed, cheats, runCheat, type CheatDef, type CheatsView } from '../src/index.ts'

const supporter = { not: { 'unlocks/has': { unlock: 'supporter' } } }

const defs: CheatDef[] = [
  { id: 'coins', label: '+20 coins', description: 'A little help.', effects: [{ kind: 'stat', stat: 'coins', by: 20 }] },
  { id: 'map', label: 'Show the map', group: 'Story', once: true, effects: [{ kind: 'kv', key: 'map', to: true }] },
  {
    id: 'gold',
    label: '+500 coins',
    group: 'Supporters',
    blocked: [{ when: supporter, reason: 'For supporters.' }],
    effects: [{ kind: 'stat', stat: 'coins', by: 500 }],
  },
  {
    id: 'secret',
    label: 'Skip to the end',
    group: 'Supporters',
    blocked: [{ when: supporter, reason: 'For supporters.', hide: true }],
    effects: [{ kind: 'scene', scene: 'ending' }],
  },
]

/**
 * A stand-in for the unlocks plugin, which cheats only names: `unlocks/has`
 * holds for an unlock whose kv key `unlock.<id>` is true.
 */
const unlocksStub: Plugin<null> = definePlugin<null>({
  id: 'unlocks',
  version: 1,
  conditions: { has: (state, args) => state.kv[`unlock.${String(args.unlock)}`] === true },
})

function game(options: { pack?: Partial<Pack>; plugins?: Plugin<any>[] } = {}): Game {
  const town: Pack = {
    id: 'town',
    schema: SCHEMA,
    stats: [{ id: 'coins', label: 'Coins', start: 5, max: 9999 }],
    scenes: [
      { id: 'intro', body: [], choices: [] },
      { id: 'ending', body: [], choices: [] },
    ],
    activities: [
      { id: 'rest', effects: [{ kind: 'turn' }] },
      { id: 'support', effects: [{ kind: 'kv', key: 'unlock.supporter', to: true }] },
    ],
    data: { cheats: { cheats: defs } },
    ...options.pack,
  }
  const loaded = loadGame([town], {
    id: 'g',
    title: 'g',
    plugins: [cheats(), ...(options.plugins ?? [])],
    // A scene that stops everything: cheats still work.
    rules: { locks: [{ when: { scene: ['intro'] }, deny: ['*'], reason: 'Finish the intro.' }] },
  })
  expect(loaded.problems).toEqual([])
  return loaded.game
}

const fresh = (g: Game): GameState => ({ ...startingState(g), sceneId: null })
const shown = (g: Game, state: GameState): CheatsView => cheats().viewIn(view(state, g))!

function run(state: GameState, g: Game, ...commands: CommandRef[]): GameState {
  return commands.reduce<GameState>((s, command) => {
    const out = apply(s, g, command)
    expect(out.reason).toBeUndefined()
    return out.state
  }, state)
}

describe('cheats', () => {
  it('runs a cheat’s effects through a lock, in a scene, with no turn passing', () => {
    const g = game()
    const start = { ...startingState(g), sceneId: 'intro' }
    expect(apply(start, g, { type: 'activity', id: 'rest' }).reason).toBe('Finish the intro.')
    const after = run(start, g, runCheat('coins'), runCheat('coins'))
    expect(after.stats.coins).toBe(45)
    expect(after.turn).toBe(start.turn)
    expect(after.sceneId).toBe('intro')
  })

  it('logs each use with its turn, for content and a replay to read', () => {
    const g = game()
    let state = run(fresh(g), g, runCheat('coins'), { type: 'activity', id: 'rest' }, runCheat('coins'))
    expect(cheats().read(state, g).used).toEqual([
      { cheat: 'coins', turn: 0 },
      { cheat: 'coins', turn: 1 },
    ])
    expect(holds(state, cheatUsed(), g)).toBe(true)
    expect(holds(state, cheatUsed('coins'), g)).toBe(true)
    expect(holds(state, cheatUsed('map'), g)).toBe(false)
    state = run(state, g, runCheat('map'))
    expect(shown(g, state).used).toBe(3)
    expect(shown(g, state).cheats.map((cheat) => [cheat.id, cheat.used])).toEqual([
      ['coins', 2],
      ['map', 1],
      ['gold', 0],
    ])
    expect(holds(fresh(g), cheatUsed(), g)).toBe(false)
  })

  it('shows each cheat as a button, with its group, and refuses a once cheat used', () => {
    const g = game()
    const before = shown(g, fresh(g))
    expect(before.cheats.map((cheat) => cheat.id)).toEqual(['coins', 'map', 'gold'])
    expect(before.cheats[0]).toMatchObject({ label: '+20 coins', description: 'A little help.', group: null, once: false, used: 0 })
    expect(before.cheats[0].button).toMatchObject({
      id: 'cheat.coins',
      label: '+20 coins',
      command: { type: 'custom', name: 'cheats/use', with: { id: 'coins' } },
    })
    expect(before.cheats[0].button.disabled).toBeUndefined()
    expect(before.cheats[0].button.price).toBeUndefined()
    expect(before.cheats[1]).toMatchObject({ group: 'Story', once: true })
    const used = run(fresh(g), g, runCheat('map'))
    expect(shown(g, used).cheats[1].button.disabled).toBe('Already used.')
    expect(apply(used, g, runCheat('map')).reason).toBe('Already used.')
  })

  it('refuses a cheat that isn’t there', () => {
    const g = game()
    expect(apply(fresh(g), g, runCheat('nothing')).reason).toBe('There’s no such cheat.')
  })

  it('replays exactly, and an old save with no state for the plugin loads', () => {
    const g = game()
    const runner = createRunner(g, fresh(g))
    runner.apply(runCheat('coins'))
    runner.apply({ type: 'activity', id: 'rest' })
    runner.apply(runCheat('map'))
    runner.apply(runCheat('coins'))
    expect(replay(g, runner.log())).toEqual({ ok: true, value: runner.state })
    const { plugins: _none, ...old } = fresh(g)
    const loaded = loadState(JSON.parse(JSON.stringify({ ...old, plugins: {} })), g)
    if (!loaded.ok) throw new Error(loaded.reason)
    expect(shown(g, loaded.value).used).toBe(0)
    expect(cheats().read(run(loaded.value, g, runCheat('coins')), g).used).toHaveLength(1)
  })

  it('lets content react to a cheat being used', () => {
    const g = game({ pack: { activities: [{ id: 'honest', blocked: [{ when: cheatUsed(), reason: 'You cheated.' }], effects: [] }] } })
    expect(apply(fresh(g), g, { type: 'activity', id: 'honest' }).reason).toBeUndefined()
    expect(apply(run(fresh(g), g, runCheat('coins')), g, { type: 'activity', id: 'honest' }).reason).toBe('You cheated.')
  })

  it('reports a cheat content names that the game lacks, and what a cheat names', () => {
    const loaded = loadGame(
      [
        {
          id: 'town',
          schema: SCHEMA,
          activities: [{ id: 'peek', blocked: [{ when: cheatUsed('nope'), reason: 'x' }], effects: [] }],
          data: { cheats: { cheats: [{ id: 'coins', label: '+20 coins', effects: [{ kind: 'stat', stat: 'coins', by: 20 }] }] } },
        },
      ],
      { id: 'g', title: 'g', plugins: [cheats()] },
    )
    expect(loaded.problems.map((problem) => problem.what).sort()).toEqual(['unknown cheat "nope"', 'unknown stat "coins"'])
  })

  it('reports a cheat with no label, no effects or two with one id', () => {
    const g = game()
    const broken = {
      ...g,
      data: { cheats: { cheats: [...defs, defs[0], { id: 'blank', label: ' ', effects: [] }] } },
    }
    const problems = checkGame(broken).problems.map((problem) => problem.what)
    expect(problems).toContain('two cheats share this id')
    expect(problems).toContain('has no label')
    expect(problems).toContain('has no effects')
  })

  it('reads its cheats from every pack, merged by id', () => {
    const g = game()
    expect(cheatDefs(g).map((cheat) => cheat.id)).toEqual(['coins', 'map', 'gold', 'secret'])
  })
})

describe('cheats with an unlocks plugin (a stand-in)', () => {
  it('keeps a supporter cheat greyed out, or hidden, until the unlock holds', () => {
    const g = game({ plugins: [unlocksStub] })
    const locked = shown(g, fresh(g))
    expect(locked.cheats.map((cheat) => cheat.id)).toEqual(['coins', 'map', 'gold'])
    expect(locked.cheats[2].button.disabled).toBe('For supporters.')
    expect(apply(fresh(g), g, runCheat('gold')).reason).toBe('For supporters.')
    expect(apply(fresh(g), g, runCheat('secret')).reason).toBe('For supporters.')

    const unlocked = run(fresh(g), g, { type: 'activity', id: 'support' })
    const open = shown(g, unlocked)
    expect(open.cheats.map((cheat) => cheat.id)).toEqual(['coins', 'map', 'gold', 'secret'])
    expect(open.cheats.every((cheat) => cheat.button.disabled === undefined)).toBe(true)
    const rich = run(unlocked, g, runCheat('gold'), runCheat('secret'))
    expect(rich.stats.coins).toBe(505)
    expect(rich.sceneId).toBe('ending')
  })

  it('without the plugin, the condition is false, so a supporter cheat stays refused', () => {
    const g = game()
    expect(g.plugins?.some((plugin) => plugin.id === 'unlocks')).toBe(false)
    expect(apply(run(fresh(g), g, { type: 'activity', id: 'support' }), g, runCheat('gold')).reason).toBe('For supporters.')
  })
})
