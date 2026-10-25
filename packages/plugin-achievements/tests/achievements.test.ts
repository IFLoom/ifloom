import { describe, expect, it } from 'vitest'
import {
  apply,
  createRunner,
  holds,
  loadGame,
  loadState,
  memoryDriver,
  profile,
  replay,
  startingState,
  view,
  type Game,
  type GameState,
  type Content,
} from '@ifloom/engine'
import { achievementEarned, achievements, grantAchievement, progressValue, type AchievementDef, type AchievementsView } from '../src/index.ts'

const defs: AchievementDef[] = [
  { id: 'regular', title: 'A regular', description: 'Ten coffees at the café.', progress: { value: { kv: 'coffees' }, target: 10 } },
  { id: 'saver', title: 'Nest egg', progress: { value: 'coins', target: 50 }, when: { kv: 'bank' } },
  { id: 'river', title: 'Dusk by the river', description: 'Sit by the river at dusk.', secret: true, when: { kv: 'dusk' } },
  { id: 'kind', title: 'A kind word', description: 'Given by a scene.' },
]

function game(extra: Partial<Content> = {}): Game {
  const town: Content = {
    name: 'town',
    stats: [
      { id: 'coins', label: 'Coins', start: 10, max: 999 },
      { id: 'charm', label: 'Charm', start: 2 },
    ],
    actions: [
      { id: 'earn', effects: [{ stat: 'coins', by: 30 }] },
      { id: 'bank', effects: [{ kv: 'bank', to: true }] },
      { id: 'dusk', effects: [{ kv: 'dusk', to: true }] },
      { id: 'kindness', effects: [grantAchievement('kind')] },
    ],
    data: { achievements: { achievements: defs } },
    ...extra,
  }
  const loaded = loadGame([town], { id: 'g', title: 'g', plugins: [achievements()] })
  expect(loaded.problems).toEqual([])
  return loaded.game
}

function run(state: GameState, g: Game, ...ids: string[]): GameState {
  for (const id of ids) {
    const out = apply(state, g, { type: 'action', id })
    expect(out.reason).toBeUndefined()
    state = out.state
  }
  return state
}

const fresh = (g: Game) => ({ ...startingState(g), sceneId: null })
const shown = (state: GameState, g: Game) => view(state, g).plugins.achievements as AchievementsView
const coffees = (state: GameState, n: number): GameState => ({ ...state, kv: { ...state.kv, coffees: n } })

describe('achievements', () => {
  it('list every achievement, secret ones as ??? until earned', () => {
    const g = game()
    expect(shown(fresh(g), g)).toEqual({
      achievements: [
        {
          id: 'regular',
          title: 'A regular',
          description: 'Ten coffees at the café.',
          image: null,
          secret: false,
          earned: false,
          earnedOn: null,
          progress: { value: 0, target: 10 },
        },
        { id: 'saver', title: 'Nest egg', description: '', image: null, secret: false, earned: false, earnedOn: null, progress: { value: 10, target: 50 } },
        { id: 'river', title: '???', description: '', image: null, secret: true, earned: false, earnedOn: null, progress: null },
        { id: 'kind', title: 'A kind word', description: 'Given by a scene.', image: null, secret: false, earned: false, earnedOn: null, progress: null },
      ],
      earned: 0,
      total: 4,
    })
  })

  it('are earned the first time their condition holds after a command, with a notice', () => {
    const g = game()
    const state = run(fresh(g), g, 'dusk')
    expect(holds(state, achievementEarned('river'), g)).toBe(true)
    expect(shown(state, g).achievements[2]).toMatchObject({ title: 'Dusk by the river', description: 'Sit by the river at dusk.', earned: true, earnedOn: 0 })
    expect(view(state, g).notices.unseen.map((notice) => notice.title)).toEqual(['Achievement: Dusk by the river'])
    // Earned once: the condition holding again changes nothing.
    const again = run(state, g, 'dusk')
    expect(again.notices).toEqual(state.notices)
  })

  it('count progress, and are earned at the target when they have no condition', () => {
    const g = game()
    let state = coffees(fresh(g), 4)
    expect(shown(state, g).achievements[0].progress).toEqual({ value: 4, target: 10 })
    state = run(coffees(state, 10), g, 'bank')
    expect(shown(state, g).achievements[0]).toMatchObject({ earned: true, progress: { value: 10, target: 10 } })
    // With a condition, the condition decides, and progress is only shown.
    expect(shown(state, g).achievements[1]).toMatchObject({ earned: true, progress: { value: 50, target: 50 } })
  })

  it('read progress from a stat, a formula, an entity’s stat, a kv key or a custom value', () => {
    const g = game()
    const state = { ...fresh(g), kv: { coffees: 3, mood: 'fine' } }
    expect(progressValue('coins', state, g)).toBe(10)
    expect(progressValue({ sum: ['coins', { scale: 'charm', by: 5 }] }, state, g)).toBe(20)
    expect(progressValue({ kv: 'coffees' }, state, g)).toBe(3)
    expect(progressValue({ kv: 'mood' }, state, g)).toBe(0)
    expect(progressValue({ value: 'achievements/earned' }, state, g)).toBe(0)
    expect(progressValue({ stat: 'coins' }, state, g)).toBe(10)
  })

  it('can be granted by an effect', () => {
    const g = game()
    const state = run(fresh(g), g, 'kindness')
    expect(shown(state, g)).toMatchObject({ earned: 1 })
    expect(view(state, g).notices.unseen[0].title).toBe('Achievement: A kind word')
  })

  it('are kept in the profile, which outlives saves, and shown earned from it', async () => {
    const g = game()
    const driver = memoryDriver()
    const runner = createRunner(g, fresh(g), { profile: profile(g, driver) })
    runner.apply({ type: 'action', id: 'dusk' })
    runner.apply({ type: 'action', id: 'kindness' })
    runner.apply({ type: 'action', id: 'dusk' })
    await runner.settled()
    expect(await runner.profile!.get('achievements')).toEqual({ earned: ['river', 'kind'] })
    // A new game has earned nothing in its save, but the runner's view shows what the profile remembers.
    await runner.newGame()
    await runner.settled()
    expect(holds(runner.state, achievementEarned('river'), g)).toBe(false)
    const ever = runner.view().plugins.achievements as AchievementsView
    expect(ever.earned).toBe(2)
    expect(ever.achievements[2]).toMatchObject({ title: 'Dusk by the river', earned: true, earnedOn: null })
    // A view built without a runner has no profile: only this save's achievements.
    expect(shown(runner.state, g).earned).toBe(0)
    // A second runner on the same profile sees it once it has read it.
    const later = createRunner(g, fresh(g), { profile: profile(g, driver) })
    await later.settled()
    expect((later.view().plugins.achievements as AchievementsView).earned).toBe(2)
  })

  it('follow the profile as it changes, with a new view of the same state', async () => {
    const g = game()
    const stored = profile(g, memoryDriver())
    const runner = createRunner(g, fresh(g), { profile: stored })
    await runner.settled()
    const before = runner.view()
    const heard: GameState[] = []
    runner.subscribe((state) => heard.push(state))
    // Earned in another save: written to the profile by something else.
    await stored.set('achievements', { earned: ['kind'] })
    expect(heard).toEqual([runner.state])
    const after = runner.view()
    expect(after).not.toBe(before)
    expect(runner.view()).toBe(after)
    expect((after.plugins.achievements as AchievementsView).achievements[3]).toMatchObject({ earned: true, earnedOn: null })
    expect(after.scene).toBe(before.scene)
    // Writing what it already shows changes nothing.
    await stored.set('achievements', { earned: ['kind'] })
    expect(heard).toHaveLength(1)
    expect(runner.view()).toBe(after)
  })

  it('replay exactly, and an old save with no state for the plugin loads', () => {
    const g = game()
    const runner = createRunner(g, fresh(g))
    for (const id of ['earn', 'dusk', 'bank', 'kindness']) runner.apply({ type: 'action', id })
    expect(replay(g, runner.log())).toEqual({ ok: true, value: runner.state })
    const { plugins: _none, ...old } = fresh(g)
    const loadedRead = loadState(JSON.parse(JSON.stringify({ ...old, plugins: {} })), g)
    if (!loadedRead.ok) throw new Error(loadedRead.reason)
    const loaded = loadedRead.value
    expect(shown(loaded, g).earned).toBe(0)
    expect(shown(run(loaded, g, 'dusk'), g).earned).toBe(1)
  })

  it('report achievements that name what the game does not have', () => {
    const loaded = loadGame(
      [
        {
          name: 'mod',
          actions: [{ id: 'x', effects: [grantAchievement('nope')] }],
          data: {
            achievements: {
              achievements: [
                { id: 'a', title: 'A', when: { entity: 'thing:moonstone', at: 'you' }, progress: { value: { sum: ['luck', 1] }, target: 0 } },
                { id: 'b', title: 'B', progress: { value: { value: 'game/nothing' }, target: 3 } },
              ],
            },
          },
        },
      ],
      { id: 'g', title: 'g', plugins: [achievements()] },
    )
    expect(loaded.problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual([
      'action x: unknown achievement "nope"',
      'achievements a: when: unknown kind "thing"',
      'achievements a: progress: unknown stat "luck"',
      'achievements b: progress: no custom value named "game/nothing"',
      'achievements a: progress target must be more than 0',
    ])
  })
})
