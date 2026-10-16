/**
 * Small Town, played: the showcase's first days, through every system it
 * uses. If this passes, the features the docs point at work together.
 */
import { describe, expect, it } from 'vitest'
import { apply, checkGame, holds, startingState, statValue, view, type Command, type GameState } from '@ifloom/engine'
import type { DevicesView } from '@ifloom/plugin-devices'
import type { EffectsView } from '@ifloom/plugin-effects'
import type { FeedsView } from '@ifloom/plugin-feed'
import type { MessagesView } from '@ifloom/plugin-messages'
import type { QuestsView } from '@ifloom/plugin-quests'
import { wearing } from '@ifloom/plugin-wardrobe'
import { sleep } from '@ifloom/plugin-calendar'
import { go, type PlacesState, type PlacesView } from '@ifloom/plugin-places'
import { call, talk } from '@ifloom/plugin-cast'
import { clock, openCamera, smallTown } from '../src/game.ts'

/** The town on a given day at a given time; a day is a turn here. */
const on = (state: GameState, day: number, period: string): GameState => clock.write({ ...state, turn: day }, { day, period })

const { game, problems } = smallTown()

function run(state: GameState, ...commands: Command[]): GameState {
  for (const command of commands) {
    const out = apply(state, game, command)
    expect(out.refused, JSON.stringify(command)).toBeUndefined()
    state = out.state
  }
  return state
}

const act = (id: string): Command => ({ type: 'activity', id })
const quests = (state: GameState) => view(state, game).plugins.quests as QuestsView

describe('Small Town', () => {
  it('loads with nothing wrong', () => {
    expect(problems).toEqual([])
    // Checked again as it stands, the loaded game is the same.
    expect(checkGame(game).problems).toEqual([])
  })

  it('holds the player in moving day until they unpack', () => {
    const start = startingState(game)
    expect(view(start, game).scene.title).toBe('Moving day')
    expect(apply(start, game, go('high-street')).refused).toBe('Unpack first.')
    const unpacked = run(start, { type: 'choose', id: 'unpack' })
    expect(quests(unpacked).active.map((quest) => quest.id)).toEqual(['settle', 'friend'])
  })

  it('names the cat on moving day, and says the name after', () => {
    let state = run(startingState(game), { type: 'input', id: 'catName', value: ' Biscuit ' }, { type: 'choose', id: 'unpack' })
    expect(view(state, game).scene.body).toContain('Biscuit has claimed the warm spot')
    expect(apply(state, game, { type: 'input', id: 'catName', value: 'Rex' }).refused).toBe('Not now.')
    state = run(on(state, 1, 'morning'), go('high-street'), go('cafe'), act('buySandwich'))
    expect(view(state, game).pack.find((item) => item.id === 'sandwich')?.useLabel).toBe('Eat the sandwich')
    state = run({ ...state, stats: { ...state.stats, energy: 50 } }, { type: 'use', itemId: 'sandwich' })
    expect(state.stats.energy).toBe(75)
    expect(state.items.sandwich).toBe(0)
  })

  it('plays a first day: a note under the door, coffee, Ava, a photo and a post', () => {
    let state = run(startingState(game), { type: 'choose', id: 'unpack' })
    state = run(on(state, 1, 'morning'), go('high-street'))
    expect(view(state, game).notices.unseen[0].title).toBe('A note under your door')
    expect(state.collections.notes.map((note) => note.id)).toEqual(['welcome'])

    state = run(state, go('cafe'))
    expect(view(state, game).scene.body).toContain('Ava is behind the counter')
    expect(view(state, game).scene.body).toContain('very yellow')
    expect(holds(state, wearing('raincoat'), game)).toBe(true)

    // The café's stage: the counter while Ava is on shift, and a hotspot on her that talks to her.
    const cafe = (view(state, game).plugins.places as PlacesView).location!
    expect(cafe.stage).toEqual({
      aspect: '16/10',
      layers: [{ id: 'counter', src: 'art/photo/ava.svg' }],
      hotspots: [{ id: 'ava', rect: [36, 22, 28, 44], label: 'Talk to Ava', command: talk('ava'), layer: 'counter' }],
    })

    state = run(state, act('coffee'))
    expect(state.stats).toMatchObject({ coins: 9, energy: 95 })
    expect(apply(state, game, act('coffee')).refused).toBe('One is enough for today.')

    state = run(state, talk('ava'), { type: 'choose', id: 'chat' }, { type: 'choose', id: 'bye' })
    state = run(state, openCamera, act('photo-ava'), act('post'))
    const social = (view(state, game).plugins.feed as FeedsView).feeds[0]
    expect(social.posts[0]).toMatchObject({ mine: true, text: 'New town, new faces.' })
    expect(social.posts[0].likes).toBeGreaterThan(2)
    expect(quests(state).done.map((quest) => quest.id)).toEqual(['settle'])
  })

  it('brings Ava’s text the next day, and she picks up in the evening', () => {
    let state = run(startingState(game), { type: 'choose', id: 'unpack' })
    state = run(on(state, 1, 'morning'), go('high-street'), go('cafe'))
    state = run(state, talk('ava'), { type: 'choose', id: 'bye' }, go('high-street'), go('flat'))
    expect(apply(state, game, call('ava')).refused).toBe('She’s busy at the counter. Try her this evening.')
    state = run(on(state, 1, 'night'), sleep())
    expect(state.stats.energy).toBe(100)
    const texts = (view(state, game).plugins.messages as MessagesView).channels[0]
    expect(texts.threads[0].messages[0].text).toContain('Coffee’s on me')
    const devices = (view(state, game).plugins.devices as DevicesView).devices[0]
    expect(devices.badge).toBeGreaterThan(0)
    state = run(on(state, 2, 'evening'), call('ava'))
    expect(view(state, game).scene.title).toBe('Ava, on the phone')
  })

  it('charges rent on Sundays, and meets Ava by the river once a friendship has had time', () => {
    let state = run(startingState(game), { type: 'choose', id: 'unpack' })
    state = run(on(state, 1, 'morning'), go('high-street'), go('cafe'))
    state = run(state, talk('ava'), { type: 'choose', id: 'bye' })
    // A Sunday a week in, with 40 coins and Ava a friend.
    state = { ...on(state, 6, 'evening'), stats: { ...state.stats, coins: 40 }, entities: { ...state.entities, character: { ...state.entities.character, ava: { ...state.entities.character.ava, stats: { friendship: 30 } } } } }
    state = run(state, go('high-street'), go('park'))
    expect(state.stats.coins).toBe(10)
    expect(view(state, game).notices.unseen.map((notice) => notice.title)).toContain('Rent paid: 30 coins')
    state = run(state, talk('ava'))
    expect(view(state, game).scene.title).toBe('By the river')
    state = run(state, { type: 'choose', id: 'stay' })
    expect(quests(state).done.map((quest) => quest.id)).toContain('friend')
  })

  it('draws something to happen when you sit a while at the café, and a quiet table when nothing can', () => {
    const sitDown = (seed: number) => {
      let state = run(startingState(game, { seed }), { type: 'choose', id: 'unpack' })
      state = run(on(state, 1, 'morning'), go('high-street'), go('cafe'), act('sit'))
      return state
    }
    const drawn = new Set(Array.from({ length: 20 }, (_, seed) => sitDown(seed).sceneId))
    expect(drawn.size).toBeGreaterThan(1)
    for (const id of drawn) expect(['cafe.window', 'cafe.crossword', 'cafe.break']).toContain(id)
    // Every storylet's when has run out: the window seen twice, the crossword done, and Ava off on a Sunday.
    const state = sitDown(1)
    const spent = { ...on(state, 6, 'afternoon'), sceneId: null, seen: { ...state.seen, 'cafe.window': 2, 'cafe.crossword': 1 } }
    const after = run(spent, act('sit'))
    expect(view(after, game).scene.title).toBe('A quiet table')
  })

  it('plays quick feet at the park: inputs in time win coins, letting the clock run out loses', () => {
    let state = run(startingState(game), { type: 'choose', id: 'unpack' })
    state = run(on(state, 1, 'morning'), go('high-street'), go('park'), act('arrows'))
    expect(view(state, game).minigame).toMatchObject({ id: 'arrows', title: 'Quick feet', timeLeft: 1500, inputs: ['up', 'down', 'left', 'right'] })
    expect(apply(state, game, act('jog')).refused).toBe('Finish this first.')
    const coins = state.stats.coins
    // Three arrows pressed in time, after a moment's thought; the last two left to time out.
    for (let round = 0; round < 3; round += 1) {
      const arrow = state.minigame!.state
      expect(view(state, game).scene.body).toContain(`${arrow[0].toUpperCase()}${arrow.slice(1)}!`)
      state = run(state, { type: 'tick', ms: 400 }, { type: 'minigame', input: arrow })
    }
    state = run(state, { type: 'tick', ms: 1500 }, { type: 'tick', ms: 1500 })
    expect(state.minigame).toBeNull()
    expect(state.stats.coins).toBe(coins + 5)
    expect(view(state, game).scene.title).toBe('Quick feet')
    expect(view(state, game).scene.body).toContain('you win')

    // Again, and this time every arrow times out in one long wait.
    state = run(state, { type: 'choose', id: 'leave' }, act('arrows'), { type: 'tick', ms: 10_000 })
    expect(state.minigame).toBeNull()
    expect(state.sceneId).toBe('park.arrows-lost')
    expect(state.flags['minigame:arrows']).toBe(2)
  })

  it('leaves you caffeinated after a coffee, for the rest of the day and the next', () => {
    let state = run(startingState(game), { type: 'choose', id: 'unpack' })
    state = run(on(state, 1, 'morning'), go('high-street'), go('cafe'), act('coffee'), go('high-street'), go('office'), act('work'))
    // 80 kept, plus 15 for the coffee, less 30 for the shift: 65, and 10 more on top while it lasts.
    expect(state.stats.energy).toBe(65)
    expect(statValue(state, game, 'energy')).toBe(75)
    const effects = () => (view(state, game).plugins.effects as EffectsView).active
    expect(effects()).toEqual([expect.objectContaining({ id: 'caffeinated', label: 'Caffeinated', turnsLeft: 2 })])
    state = run(on(state, 1, 'night'), sleep())
    expect(effects()).toEqual([expect.objectContaining({ turnsLeft: 1 })])
    state = run(on(state, 2, 'night'), sleep())
    expect(effects()).toEqual([])
  })

  it('keeps the phone in the pocket at work', () => {
    let state = run(startingState(game), { type: 'choose', id: 'unpack' })
    state = run(on(state, 1, 'morning'), go('high-street'), go('office'))
    expect(apply(state, game, openCamera).refused).toBe('Not at work.')
    state = run(state, act('work'))
    expect(state.stats.coins).toBe(32)
  })

  it('takes the example mod: fog in the weather, a quieter park, and no problems', async () => {
    const { mods, memoryDriver } = await import('@ifloom/engine')
    const { readFileSync } = await import('node:fs')
    const store = mods('small-town', memoryDriver())
    await store.add(readFileSync(new URL('../mods/fog-season.json', import.meta.url), 'utf8'))
    const modded = smallTown({ mods: await store.packs() })
    expect(modded.problems).toEqual([])
    expect(modded.game.prose?.variants('street.weather')).toContain('street.weather/fog')
    const fresh = startingState(modded.game)
    const park = { ...fresh, sceneId: null, phase: 'open', plugins: { ...fresh.plugins, places: { version: 1, state: { at: 'park' } satisfies PlacesState } } }
    expect(view(park, modded.game).scene.body).toContain('fog')
  })

  it('has the debugger only when built with it', () => {
    expect(view(startingState(game), game).plugins.debug).toBeUndefined()
    const dev = smallTown({ withDebug: true }).game
    expect(view(startingState(dev), dev).plugins.debug).toBeDefined()
  })
})
