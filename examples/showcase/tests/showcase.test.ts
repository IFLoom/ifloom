/**
 * Small Town, played: the showcase's first days, through every system it
 * uses. If this passes, the features the docs point at work together.
 */
import { describe, expect, it } from 'vitest'
import { commandOf, apply, checkGame, createRunner, memoryDriver, profile, replay, entitiesOf, entityOf, holds, inlineChoices, startingState, statValue, view, type Command, type GameState, type CommandRef } from '@ifloom/engine'
import type { AchievementsView } from '@ifloom/plugin-achievements'
import type { DevicesView } from '@ifloom/plugin-devices'
import type { StatusesView } from '@ifloom/plugin-statuses'
import { applyFor, work, type JobsView } from '@ifloom/plugin-jobs'
import type { FeedsView } from '@ifloom/plugin-feed'
import type { MessagesView } from '@ifloom/plugin-messages'
import type { QuestsView } from '@ifloom/plugin-quests'
import { buy, type ShopView } from '@ifloom/plugin-shop'
import { wearing } from '@ifloom/plugin-wardrobe'
import { sleep } from '@ifloom/plugin-calendar'
import { go, type PlacesState, type PlacesView } from '@ifloom/plugin-places'
import { call, talk } from '@ifloom/plugin-cast'
import { cheatUsed, runCheat, type CheatsView } from '@ifloom/plugin-cheats'
import { hasUnlock, lockContent, recordUnlock, startUnlocks, unlockDefs, unlockedPacks } from '@ifloom/plugin-unlocks'
import { readFileSync } from 'node:fs'
import { clock, openCamera, smallTown } from '../src/game.ts'
import supporterPack from '../src/unlocks/supporter.ts'

/** The town on a given day at a given time; a day is a turn here. */
const on = (state: GameState, day: number, period: string): GameState => clock.write({ ...state, turn: day }, { day, period })

const { game, problems } = smallTown()

function run(state: GameState, ...commands: CommandRef[]): GameState {
  for (const command of commands) {
    const out = apply(state, game, command)
    expect(out.reason, JSON.stringify(command)).toBeUndefined()
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
    expect(apply(start, game, go('high-street')).reason).toBe('Unpack first.')
    const unpacked = run(start, { type: 'choose', id: 'unpack' })
    expect(quests(unpacked).active.map((quest) => quest.id)).toEqual(['settle', 'friend'])
  })

  it('names the cat on moving day, and says the name after', () => {
    let state = run(startingState(game), { type: 'input', id: 'catName', to: ' Biscuit ' }, { type: 'choose', id: 'unpack' })
    expect(view(state, game).scene.body).toContain('Biscuit has claimed the warm spot')
    expect(apply(state, game, { type: 'input', id: 'catName', to: 'Rex' }).reason).toBe('Not now.')
    state = run(on(state, 1, 'morning'), go('high-street'), go('cafe'), buy('counter', 'sandwich'))
    expect(view(state, game).pack.find((item) => item.id === 'sandwich')?.useLabel).toBe('Eat the sandwich')
    state = run({ ...state, stats: { ...state.stats, energy: 50 } }, { type: 'use', id: 'sandwich' })
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
      hotspots: [{ id: 'ava', rect: [36, 22, 28, 44], label: 'Talk to Ava', command: commandOf(talk('ava')), layer: 'counter' }],
    })

    state = run(state, act('coffee'))
    expect(state.stats).toMatchObject({ coins: 9, energy: 95 })
    expect(apply(state, game, act('coffee')).reason).toBe('One is enough for today.')

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
    expect(apply(state, game, call('ava')).reason).toBe('She’s busy at the counter. Try her this evening.')
    state = run(on(state, 1, 'night'), sleep())
    expect(state.stats.energy).toBe(100)
    const texts = (view(state, game).plugins.messages as MessagesView).channels[0]
    expect(texts.threads[0].messages[0].text).toContain('Coffee’s on me')
    const devices = (view(state, game).plugins.devices as DevicesView).devices[0]
    expect(devices.badge).toBeGreaterThan(0)
    // The flat's prose says so, with a link in the line that opens the phone's messages.
    const flat = view(state, game)
    expect(flat.scene.beats.at(-1)).toMatchObject({ kind: 'text', text: 'Your phone buzzes on the sill: a message. Check it.' })
    const [check] = inlineChoices(flat.scene.beats)
    expect(check).toMatchObject({ id: 'read-text', command: { type: 'custom', name: 'devices/open', with: { id: 'texts' } } })
    expect(flat.actions.map((action) => action.id)).not.toContain('read-text')
    const opened = run(state, check.command)
    expect((view(opened, game).plugins.devices as DevicesView).devices[0].open?.id).toBe('texts')
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
    // The secret achievement is ??? until the evening by the river.
    const achievements = () => (view(state, game).plugins.achievements as AchievementsView).achievements
    expect(achievements()).toEqual([
      expect.objectContaining({ id: 'nest-egg', title: 'Nest egg', earned: false, progress: { value: 10, target: 100 } }),
      expect.objectContaining({ id: 'river', title: '???', earned: false }),
    ])
    state = run(state, talk('ava'))
    expect(view(state, game).scene.title).toBe('By the river')
    state = run(state, { type: 'choose', id: 'stay' })
    expect(quests(state).done.map((quest) => quest.id)).toContain('friend')
    expect(achievements()[1]).toMatchObject({ title: 'Dusk by the river', earned: true })
    expect(view(state, game).notices.unseen.map((notice) => notice.title)).toContain('Achievement: Dusk by the river')
  })

  it('offers a free cheat on moving day, and keeps the supporter one greyed out until the unlock is recorded', () => {
    let state = startingState(game)
    const coins = state.stats.coins
    // Moving day locks everything but the scene; a cheat still works, and no time passes.
    state = run(state, runCheat('coins'))
    expect(state.stats.coins).toBe(coins + 20)
    expect(state.turn).toBe(0)
    expect(holds(state, cheatUsed('coins'), game)).toBe(true)
    const shown = (s: GameState) => view(s, game).plugins.cheats as CheatsView
    expect(shown(state).cheats.map((cheat) => [cheat.id, cheat.button.disabled ?? null])).toEqual([
      ['coins', null],
      ['energy', 'For supporters.'],
    ])
    expect(apply(state, game, runCheat('energy')).reason).toBe('For supporters.')
    const supporter = run({ ...state, stats: { ...state.stats, energy: 10 } }, recordUnlock('supporter'))
    expect(run(supporter, runCheat('energy')).stats.energy).toBe(100)
  })

  it('unlocks the supporter edition with the code in .env: the cheat at once, and the café scene once the game is built again', async () => {
    // The showcase's code is public on purpose, so anyone can try it; a real game keeps its codes out of the repo.
    const code = /IFLOOM_UNLOCK_SUPPORTER=(.+)/.exec(readFileSync(new URL('../.env', import.meta.url), 'utf8'))![1].trim()
    const supporter = unlockDefs(game).find((entry) => entry.id === 'supporter')!
    const content = { supporter: await lockContent(code, game.id, supporter, [supporterPack]) }
    const driver = memoryDriver()
    const runner = createRunner(game, startingState(game, { seed: 4 }), { history: true, profile: profile(game, driver) })
    const codes = startUnlocks(runner, { content })
    expect(await codes.enter('SMALL-TOWN-FAN')).toEqual({ ok: false, reason: 'That code doesn’t unlock anything.' })
    const entered = await codes.enter(code.toLowerCase())
    expect(entered).toEqual({ ok: true, value: { unlock: 'supporter', label: 'Supporter edition', already: false, restart: true } })
    expect(holds(runner.state, hasUnlock('supporter'), game)).toBe(true)
    expect(runner.apply(runCheat('energy')).ok).toBe(true)
    // Replayed, the unlock and the cheat play the same.
    const replayed = replay(game, runner.log())
    expect(replayed.ok && replayed.value).toEqual(runner.state)

    // The next launch: the profile's proof opens the content, and the café can draw the back room.
    await runner.settled()
    const opened = await unlockedPacks(game.id, profile({ id: game.id }, driver), content)
    expect(opened.problems).toEqual([])
    const full = smallTown({ unlocked: opened.packs })
    expect(full.problems).toEqual([])
    let state: GameState = apply(startingState(full.game, { seed: 4 }), full.game, recordUnlock('supporter')).state
    state = apply(state, full.game, { type: 'choose', id: 'unpack' }).state
    state = apply(on(state, 1, 'morning'), full.game, go('high-street')).state
    state = apply(state, full.game, go('cafe')).state
    state = apply(state, full.game, act('sit')).state
    expect(state.sceneId).toBe('cafe.back-room')
    expect(view(state, full.game).scene.title).toBe('The back room')
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
    expect(apply(state, game, act('jog')).reason).toBe('Finish this first.')
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
    expect(state.kv['minigame:arrows']).toBe(2)
  })

  it('leaves you caffeinated after a coffee, for the rest of the day and the next', () => {
    let state = run(startingState(game), { type: 'choose', id: 'unpack' })
    state = run(on(state, 1, 'morning'), go('high-street'), go('cafe'), act('coffee'), go('high-street'), go('office'), act('work'))
    // 80 kept, plus 15 for the coffee, less 30 for the shift: 65, and 10 more on top while it lasts.
    expect(state.stats.energy).toBe(65)
    expect(statValue(state, game, 'energy')).toBe(75)
    const effects = () => (view(state, game).plugins.statuses as StatusesView).active
    expect(effects()).toEqual([expect.objectContaining({ id: 'caffeinated', label: 'Caffeinated', turnsLeft: 2 })])
    state = run(on(state, 1, 'night'), sleep())
    expect(effects()).toEqual([expect.objectContaining({ turnsLeft: 1 })])
    state = run(on(state, 2, 'night'), sleep())
    expect(effects()).toEqual([])
  })

  it('sells a sandwich at the café as a plain activity too, beside the counter', () => {
    let state = run(startingState(game), { type: 'choose', id: 'unpack' })
    state = run(on(state, 1, 'morning'), go('high-street'), go('cafe'))
    const labels = view(state, game).actions.map((action) => action.label)
    expect(labels).toEqual(expect.arrayContaining(['Buy a sandwich']))
    // The counter sells one too, from the shop's view, which the React UI draws as the counter's dialog.
    expect((view(state, game).plugins.shop as ShopView).vendors[0].goods.map((good) => good.item)).toContain('sandwich')
    const button = view(state, game).actions.find((action) => action.id === 'buy-sandwich')!
    expect(button.price?.stats).toEqual([{ id: 'coins', amount: 4, text: '4 coins' }])
    const coins = state.stats.coins
    state = run(state, act('buySandwich'))
    expect(state.stats.coins).toBe(coins - 4)
    expect(state.items.sandwich).toBe(1)
    // Only in the café.
    expect(apply(run(state, go('high-street')), game, act('buySandwich')).reason).toBeDefined()
  })

  it('sells from the café counter: two flapjacks a day, half off one thing, and half back on a sandwich', () => {
    let state = run(startingState(game), { type: 'choose', id: 'unpack' })
    state = run(on(state, 1, 'morning'), go('high-street'), go('cafe'))
    const counter = () => (view(state, game).plugins.shop as ShopView).vendors[0]
    expect(counter()).toMatchObject({ id: 'counter', here: true, closed: null })
    expect(counter().goods.filter((good) => good.off > 0)).toHaveLength(1)
    // Each good's buy button carries today's price, and greys out with the reason.
    const flapjack = () => counter().goods.find((good) => good.item === 'flapjack')!
    expect(flapjack().buy.price?.stats?.[0].id).toBe('coins')
    state = run(state, buy('counter', 'flapjack'), buy('counter', 'flapjack'))
    expect(apply(state, game, buy('counter', 'flapjack')).reason).toBe('Sold out.')
    expect(flapjack().buy.disabled).toBe('Sold out.')
    const coins = state.stats.coins
    state = run(state, buy('counter', 'sandwich'), { type: 'custom', name: 'shop/sell', with: { vendor: 'counter', item: 'sandwich' } })
    expect(state.stats.coins).toBe(coins - counter().goods[0].buy.price!.stats![0].amount + 2)
    // Closed in the evening, with the café.
    expect(apply(on(state, 1, 'evening'), game, buy('counter', 'sandwich')).reason).toBe('Closed.')
  })

  it('takes you on at the café for Saturday mornings once Ava knows you, and pays for each shift', () => {
    let state = run(startingState(game), { type: 'choose', id: 'unpack' })
    state = run(on(state, 1, 'morning'), go('high-street'), go('cafe'))
    expect(apply(state, game, applyFor('weekend')).reason).toBe('Ava doesn’t know you well enough yet.')
    state = run(state, talk('ava'), { type: 'choose', id: 'chat' }, { type: 'choose', id: 'bye' })
    state = { ...state, entities: { ...state.entities, character: { ...state.entities.character, ava: { ...state.entities.character.ava, stats: { friendship: 10 } } } } }
    state = run(state, applyFor('weekend'))
    const job = () => (view(state, game).plugins.jobs as JobsView).jobs[0]
    expect(job()).toMatchObject({ hired: true, rank: { title: 'Weekend help' }, nextShift: { day: 5, inDays: 4 } })
    expect(apply(state, game, work('weekend')).reason).toBe('No shift today.')
    // Saturday morning: a shift takes the morning and 25 energy, and pays 12 coins.
    state = on({ ...state, stats: { ...state.stats, energy: 100 } }, 5, 'morning')
    const coins = state.stats.coins
    state = run(state, work('weekend'))
    expect(state.stats).toMatchObject({ coins: coins + 12, energy: 75 })
    expect(clock.read(state, game)).toEqual({ day: 5, period: 'afternoon' })
    expect(job()).toMatchObject({ shifts: 1, nextShift: { day: 12, inDays: 7 } })
  })

  it('fills the park with two new visitors each day, drawn from the town’s pools', () => {
    let state = run(startingState(game), { type: 'choose', id: 'unpack' })
    state = run(on(state, 1, 'morning'), go('high-street'), go('park'))
    const visitors = () => entitiesOf(state, 'visitor').map((ref) => entityOf(state, ref)!)
    expect(visitors()).toHaveLength(2)
    for (const visitor of visitors()) {
      expect(['Ruth', 'Omar', 'Lena', 'Theo', 'Priya', 'Jonah', 'Maud', 'Kit']).toContain(visitor.name)
      expect(['alone', 'a dog', 'a pushchair']).toContain(visitor.kv.with)
    }
    expect(view(state, game).scene.body).toContain('A few people are out along the path')
    const first = visitors()
    // Back the next day: yesterday's have gone home, and two more are out.
    state = run(on(state, 2, 'morning'), go('high-street'), go('park'))
    expect(entitiesOf(state, 'visitor')).toEqual(['visitor:#3', 'visitor:#4'])
    expect(visitors()).not.toEqual(first)
  })

  it('keeps the phone in the pocket at work', () => {
    let state = run(startingState(game), { type: 'choose', id: 'unpack' })
    state = run(on(state, 1, 'morning'), go('high-street'), go('office'))
    expect(apply(state, game, openCamera).reason).toBe('Not at work.')
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
    expect(modded.game.prose?.variants('street.weather')).toContain('street.weather.fog')
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
