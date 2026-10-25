/**
 * Small Town, played: the showcase's first days, through every system it
 * uses. If this passes, the features the docs point at work together.
 */
import { describe, expect, it } from 'vitest'
import {
  commandOf,
  apply,
  checkGame,
  createRunner,
  memoryDriver,
  profile,
  replay,
  entitiesOf,
  entityKv,
  entityName,
  entityOf,
  heldCount,
  holds,
  inlineChoices,
  loadState,
  startingState,
  statValue,
  view,
  writeEntity,
  type Command,
  type GameState,
  type CommandRef,
} from '@ifloom/engine'
import type { AchievementsView } from '@ifloom/plugin-achievements'
import type { DevicesView } from '@ifloom/plugin-devices'
import type { StatusesView } from '@ifloom/plugin-statuses'
import { jobs, type JobsView } from '@ifloom/plugin-jobs'
import type { FeedsView } from '@ifloom/plugin-feed'
import { messages, type MessagesView } from '@ifloom/plugin-messages'
import type { QuestsView } from '@ifloom/plugin-quests'
import { shop, type ShopView } from '@ifloom/plugin-shop'
import { inventory, type InventoryView } from '@ifloom/plugin-inventory'
import { wardrobe } from '@ifloom/plugin-wardrobe'
import { calendar } from '@ifloom/plugin-calendar'
import { places, type PlacesState, type PlacesView } from '@ifloom/plugin-places'
import { cast, type CastView } from '@ifloom/plugin-cast'
import { cheats, type CheatsView } from '@ifloom/plugin-cheats'
import { unlocks, lockContent, startUnlocks, unlocksOf, unlockedPacks } from '@ifloom/plugin-unlocks'
import { checkUiHints } from '@ifloom/react'
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

const act = (id: string): Command => ({ type: 'action', id })
const quests = (state: GameState) => view(state, game).plugins.quests as QuestsView

describe('Small Town', () => {
  it('loads with nothing wrong', () => {
    expect(problems).toEqual([])
    // Checked again as it stands, the loaded game is the same.
    expect(checkGame(game).problems).toEqual([])
    // The engine only checks hints are data; the React UI checks they're hints it can draw.
    expect(checkUiHints(game)).toEqual([])
  })

  it('holds the player in moving day until they unpack', () => {
    const start = startingState(game)
    expect(view(start, game).scene.title).toBe('Moving day')
    expect(apply(start, game, places.go('high-street')).reason).toBe('Unpack first.')
    const unpacked = run(start, { type: 'choose', id: 'unpack' })
    expect(quests(unpacked).active.map((quest) => quest.id)).toEqual(['settle', 'friend'])
  })

  it('names the cat on moving day, and says the name after', () => {
    let state = run(startingState(game), { type: 'input', id: 'catName', to: ' Biscuit ' }, { type: 'choose', id: 'unpack' })
    expect(view(state, game).scene.body).toContain('Biscuit has claimed the warm spot')
    expect(apply(state, game, { type: 'input', id: 'catName', to: 'Rex' }).reason).toBe('Not now.')
    state = run(on(state, 1, 'morning'), places.go('high-street'), places.go('cafe'), shop.buy('counter', 'item:sandwich'))
    const carried = (view(state, game).plugins.inventory as InventoryView).things
    expect(carried.find((thing) => thing.ref === 'item:sandwich')?.use?.label).toBe('Eat the sandwich')
    state = run({ ...state, stats: { ...state.stats, energy: 50 } }, inventory.use('item:sandwich'))
    expect(state.stats.energy).toBe(75)
    expect(heldCount(state, game, 'item:sandwich')).toBe(0)
  })

  it('plays a first day: a note under the door, coffee, Ava, a photo and a post', () => {
    let state = run(startingState(game), { type: 'choose', id: 'unpack' })
    state = run(on(state, 1, 'morning'), places.go('high-street'))
    expect(view(state, game).notices.unseen[0].title).toBe('A note under your door')
    expect(heldCount(state, game, 'note:welcome', 'player')).toBe(1)

    state = run(state, places.go('cafe'))
    expect(view(state, game).scene.body).toContain('Ava is behind the counter')
    expect(view(state, game).scene.body).toContain('very yellow')
    expect(holds(state, game, wardrobe.wearing('clothing:raincoat'))).toBe(true)

    // The café's stage: the counter while Ava is on shift, and a hotspot on her that talks to her.
    const cafe = (view(state, game).plugins.places as PlacesView).location!
    expect(cafe.stage).toEqual({
      aspect: '16/10',
      layers: [{ id: 'counter', src: 'art/photo/ava.svg' }],
      hotspots: [{ id: 'ava', rect: [36, 22, 28, 44], label: 'Talk to Ava', command: commandOf(cast.talk('ava')), layer: 'counter' }],
    })

    state = run(state, act('places/coffee'))
    expect(state.stats).toMatchObject({ coins: 9, energy: 95 })
    expect(apply(state, game, act('places/coffee')).reason).toBe('One is enough for today.')

    state = run(state, cast.talk('ava'), { type: 'choose', id: 'chat' }, { type: 'choose', id: 'bye' })
    state = run(state, openCamera, act('devices/photo-ava'), act('devices/post'))
    const social = (view(state, game).plugins.feed as FeedsView).feeds[0]
    expect(social.posts[0]).toMatchObject({ mine: true, text: 'New town, new faces.' })
    expect(social.posts[0].likes).toBeGreaterThan(2)
    expect(quests(state).done.map((quest) => quest.id)).toEqual(['settle'])
    // The photo is a thing you keep, in the phone's gallery; Sam's note is in Notes.
    const app = (id: string) => (view(run(state, commandOf({ 'devices/open': { id } })), game).plugins.devices as DevicesView).devices[0].open?.sections[0]
    expect(app('gallery')).toEqual({ type: 'list', entries: [{ id: 'photo:ava', title: 'Ava at work', text: '', image: 'art/photo/ava.svg', actions: [] }] })
    expect(app('notes')).toMatchObject({
      type: 'list',
      entries: [{ id: 'note:welcome', title: 'Welcome note', text: expect.stringContaining('Bins go out Thursday') }],
    })
  })

  it('brings Ava’s text the next day, and she picks up in the evening', () => {
    let state = run(startingState(game), { type: 'choose', id: 'unpack' })
    state = run(on(state, 1, 'morning'), places.go('high-street'), places.go('cafe'))
    state = run(state, cast.talk('ava'), { type: 'choose', id: 'bye' }, places.go('high-street'), places.go('flat'))
    expect(apply(state, game, cast.call('ava')).reason).toBe('She’s busy at the counter. Try her this evening.')
    state = run(on(state, 1, 'night'), calendar.sleep())
    expect(state.stats.energy).toBe(100)
    const texts = (view(state, game).plugins.messages as MessagesView).channels[0]
    expect(texts.threads[0].messages[0].text).toContain('Coffee’s on me')
    const devices = (view(state, game).plugins.devices as DevicesView).devices[0]
    expect(devices.badge).toBeGreaterThan(0)
    // The flat's prose says so, with a link in the line that opens the phone's messages.
    const flat = view(state, game)
    expect(flat.scene.beats.at(-1)).toMatchObject({ type: 'text', text: 'Your phone buzzes on the sill: a message. Check it.' })
    const [check] = inlineChoices(flat.scene.beats)
    expect(check).toMatchObject({ id: 'read-text', command: { type: 'custom', name: 'devices/open', with: { id: 'texts' } } })
    expect(flat.actions.map((action) => action.id)).not.toContain('read-text')
    const opened = run(state, check.command)
    expect((view(opened, game).plugins.devices as DevicesView).devices[0].open?.id).toBe('texts')
    state = run(on(state, 2, 'evening'), cast.call('ava'))
    expect(view(state, game).scene.title).toBe('Ava, on the phone')
  })

  it('draws a line of Ava’s small talk each day once her text is answered, never one twice in three days', () => {
    let state = run(startingState(game), { type: 'choose', id: 'unpack' })
    state = run(on(state, 1, 'morning'), places.go('high-street'), places.go('cafe'))
    state = run(state, cast.talk('ava'), { type: 'choose', id: 'bye' }, places.go('high-street'), places.go('flat'))
    state = run(on(state, 1, 'night'), calendar.sleep())
    const lines = (at: GameState) =>
      (view(at, game).plugins.messages as MessagesView).channels[0].threads[0].messages.filter((message) => message.id.startsWith('ava.chat.'))
    // Nothing until she has her answer.
    state = run(state, messages.reply('ava.text', 'yes'))
    expect(lines(state)).toHaveLength(1)
    // A week of nights in: one line each morning.
    for (let night = 2; night < 8; night += 1) state = run(on(state, night, 'night'), calendar.sleep())
    const drawn = lines(state)
    expect(drawn).toHaveLength(7)
    // Each line rests three days after it comes.
    drawn.forEach((line, at) => {
      const again = drawn.slice(at + 1).find((later) => later.id === line.id)
      if (again) expect(again.turn - line.turn).toBeGreaterThanOrEqual(3)
    })
    expect(new Set(drawn.map((line) => line.key)).size).toBe(7)
  })

  it('rings the phone at home one evening once her text is answered: answer within ten seconds, or miss the call', () => {
    let state = run(startingState(game), { type: 'choose', id: 'unpack' })
    state = run(on(state, 1, 'morning'), places.go('high-street'), places.go('cafe'))
    state = run(state, cast.talk('ava'), { type: 'choose', id: 'bye' }, places.go('high-street'), places.go('flat'))
    state = run(on(state, 1, 'night'), calendar.sleep())
    // Answering her text in the evening at home: the phone rings straight after, with ten seconds on it.
    state = run(on(state, 2, 'evening'), messages.reply('ava.text', 'yes'))
    expect(state.sceneId).toBe('flat.ring')
    expect(view(state, game).timers).toEqual([{ id: 'flat.ring', label: 'Ringing', left: 10_000, total: 10_000 }])
    // Picked up in time: Ava's call, and no missed call.
    const answered = run(state, { type: 'tick', ms: 6000 }, { type: 'choose', id: 'answer' })
    expect(view(answered, game).scene.title).toBe('Ava, on the phone')
    expect(answered.timers).toEqual({})
    expect(answered.kv.missedAva).toBeUndefined()
    // Left ringing: at ten seconds it stops, the scene closes and a missed call waits.
    const missed = run(state, { type: 'tick', ms: 4000 }, { type: 'tick', ms: 6000 })
    expect(missed.sceneId).toBeNull()
    expect(missed.kv.missedAva).toBe(true)
    expect(missed.notices.map((notice) => notice.title)).toContain('Missed call: Ava')
    // It rings once.
    expect(run(on(missed, 3, 'evening'), { type: 'action', id: 'places/wardrobe' }).sceneId).toBeNull()
  })

  it('charges rent on Sundays, and meets Ava by the river once a friendship has had time', () => {
    let state = run(startingState(game), { type: 'choose', id: 'unpack' })
    state = run(on(state, 1, 'morning'), places.go('high-street'), places.go('cafe'))
    state = run(state, cast.talk('ava'), { type: 'choose', id: 'bye' })
    // A Sunday a week in, with 40 coins and Ava a friend.
    state = writeEntity({ ...on(state, 6, 'evening'), stats: { ...state.stats, coins: 40 } }, 'character:ava', {
      ...entityOf(state, game, 'character:ava'),
      stats: { friendship: 30 },
    })
    state = run(state, places.go('high-street'), places.go('park'))
    expect(state.stats.coins).toBe(10)
    expect(view(state, game).notices.unseen.map((notice) => notice.title)).toContain('Rent paid: 30 coins')
    // The secret achievement is ??? until the evening by the river.
    const achievements = () => (view(state, game).plugins.achievements as AchievementsView).achievements
    expect(achievements()).toEqual([
      expect.objectContaining({ id: 'nest-egg', title: 'Nest egg', earned: false, progress: { value: 10, target: 100 } }),
      expect.objectContaining({ id: 'river', title: '???', earned: false }),
    ])
    state = run(state, cast.talk('ava'))
    expect(view(state, game).scene.title).toBe('By the river')
    state = run(state, { type: 'choose', id: 'stay' })
    expect(quests(state).done.map((quest) => quest.id)).toContain('friend')
    expect(achievements()[1]).toMatchObject({ title: 'Dusk by the river', earned: true })
    expect(view(state, game).notices.unseen.map((notice) => notice.title)).toContain('Achievement: Dusk by the river')
  })

  it('keeps a shell from the river, and gives it to Ava at the café', () => {
    let state = run(startingState(game), { type: 'choose', id: 'unpack' })
    state = run(on(state, 1, 'morning'), places.go('high-street'), places.go('cafe'))
    state = run(state, cast.talk('ava'), { type: 'choose', id: 'bye' })
    state = writeEntity({ ...on(state, 6, 'evening'), stats: { ...state.stats, coins: 40 } }, 'character:ava', {
      ...entityOf(state, game, 'character:ava'),
      stats: { friendship: 30 },
    })
    state = run(state, places.go('high-street'), places.go('park'), cast.talk('ava'), { type: 'choose', id: 'shell' })
    // What you hold is in the view, after the raincoat and the paper you came with and Sam's note; the keepsake kind itself isn't listed.
    const held = () => view(state, game).held.map((thing) => thing.ref)
    expect(held()).toEqual(['clothing:raincoat', 'item:paper', 'note:welcome', 'keepsake:shell'])
    // The inventory shows only what it's for: no notes or photos, which the phone keeps.
    expect((view(state, game).plugins.inventory as InventoryView).things.map((thing) => thing.ref)).toEqual([
      'clothing:raincoat',
      'item:paper',
      'keepsake:shell',
    ])
    expect(view(state, game).held[3]).toMatchObject({ ref: 'keepsake:shell', name: 'A river shell', count: 1, at: 'player' })
    expect(view(state, game).entities.keepsake).toBeUndefined()
    // The evening reads on: the shell's line, the question again, then sitting with her, then home.
    expect(view(state, game).scene.beats.some((beat) => beat.type === 'chose' && beat.label === 'Pocket a smooth shell from the bank')).toBe(true)
    expect(view(state, game).scene.choices.map((choice) => choice.id)).toEqual(['ducks', 'stay'])
    state = run(state, { type: 'choose', id: 'stay' }, { type: 'choose', id: 'home' })
    // The next morning at the café she takes it, and keeps it by the till.
    state = run(on(state, 7, 'morning'), places.go('high-street'), places.go('cafe'), cast.talk('ava'), { type: 'choose', id: 'shell' })
    expect(holds(state, game, { entity: 'keepsake:shell', at: 'character:ava' })).toBe(true)
    expect(held()).toEqual(['clothing:raincoat', 'item:paper', 'note:welcome'])
    expect(statValue(state, game, 'friendship', 'character:ava')).toBeGreaterThanOrEqual(35)
  })

  it('leaves the paper where you drop it, in the flat, until you pick it up again', () => {
    let state = on(run(startingState(game), { type: 'choose', id: 'unpack' }), 1, 'morning')
    const lying = () => (view(state, game).plugins.places as PlacesView).things.map((thing) => [thing.ref, thing.name, thing.count])
    state = run(state, inventory.drop('item:paper'))
    expect(heldCount(state, game, 'item:paper')).toBe(0)
    expect(holds(state, game, { entity: 'item:paper', at: 'location:flat' })).toBe(true)
    expect(lying()).toEqual([['item:paper', 'newspaper', 1]])
    // Out on the high street it isn't there; back in the flat, it is.
    state = run(state, places.go('high-street'))
    expect(lying()).toEqual([])
    state = run(state, places.go('flat'), places.pickUp('item:paper'))
    expect(heldCount(state, game, 'item:paper')).toBe(1)
    expect(lying()).toEqual([])
  })

  it('shows Ava as an entity once met: her line, her portrait, and the friendship she keeps', () => {
    let state = run(startingState(game), { type: 'choose', id: 'unpack' })
    state = run(on(state, 1, 'morning'), places.go('high-street'), places.go('cafe'))
    expect((view(state, game).plugins.cast as CastView).present[0]).toMatchObject({
      id: 'ava',
      ref: 'character:ava',
      fullName: 'Ava Marsh',
      desc: 'Runs the café',
      portrait: 'art/character/ava.svg',
    })
    expect(view(state, game).entities.character.entries).toEqual([])
    state = run(state, cast.talk('ava'), { type: 'choose', id: 'chat' }, { type: 'choose', id: 'bye' })
    expect(view(state, game).entities.character.entries[0]).toMatchObject({
      ref: 'character:ava',
      name: 'Ava',
      desc: 'Runs the café',
      image: 'art/character/ava.svg',
      stats: [{ key: 'friendship' }],
    })
  })

  it('offers a free cheat on moving day, and keeps the supporter one greyed out until the unlock is recorded', () => {
    let state = startingState(game)
    const coins = state.stats.coins
    // Moving day locks everything but the scene; a cheat still works, and no time passes.
    state = run(state, cheats.use('coins'))
    expect(state.stats.coins).toBe(coins + 20)
    expect(state.turn).toBe(0)
    expect(holds(state, game, cheats.used('coins'))).toBe(true)
    const shown = (s: GameState) => view(s, game).plugins.cheats as CheatsView
    expect(shown(state).cheats.map((cheat) => [cheat.id, cheat.button.disabled ?? null])).toEqual([
      ['coins', null],
      ['energy', 'For supporters.'],
    ])
    expect(apply(state, game, cheats.use('energy')).reason).toBe('For supporters.')
    const supporter = run({ ...state, stats: { ...state.stats, energy: 10 } }, unlocks.record('supporter'))
    expect(run(supporter, cheats.use('energy')).stats.energy).toBe(100)
  })

  it('unlocks the supporter edition with the code in .env: the cheat at once, and the café scene once the game is built again', async () => {
    // The showcase's code is public on purpose, so anyone can try it; a real game keeps its codes out of the repo.
    const code = /IFLOOM_UNLOCK_SUPPORTER=(.+)/.exec(readFileSync(new URL('../.env', import.meta.url), 'utf8'))![1].trim()
    const supporter = unlocksOf(game).find((entry) => entry.id === 'supporter')!
    const content = { supporter: await lockContent(code, game.id, supporter, [supporterPack]) }
    const driver = memoryDriver()
    const runner = createRunner(game, startingState(game, { seed: 4 }), { history: true, profile: profile(game, driver) })
    const codes = startUnlocks(runner, { content })
    expect(await codes.enter('SMALL-TOWN-FAN')).toEqual({ ok: false, reason: 'That code doesn’t unlock anything.' })
    const entered = await codes.enter(code.toLowerCase())
    expect(entered).toEqual({ ok: true, value: { unlock: 'supporter', label: 'Supporter edition', already: false, restart: true } })
    expect(holds(runner.state, game, unlocks.has('supporter'))).toBe(true)
    expect(runner.apply(cheats.use('energy')).ok).toBe(true)
    // Replayed, the unlock and the cheat play the same.
    const replayed = replay(game, runner.log())
    expect(replayed.ok && replayed.value).toEqual(runner.state)

    // The next launch: the profile's proof opens the content, and the café can draw the back room.
    await runner.settled()
    const opened = await unlockedPacks(game.id, profile({ id: game.id }, driver), content)
    expect(opened.problems).toEqual([])
    const full = smallTown({ unlocked: opened.packs })
    expect(full.problems).toEqual([])
    let state: GameState = apply(startingState(full.game, { seed: 4 }), full.game, unlocks.record('supporter')).state
    state = apply(state, full.game, { type: 'choose', id: 'unpack' }).state
    state = apply(on(state, 1, 'morning'), full.game, places.go('high-street')).state
    state = apply(state, full.game, places.go('cafe')).state
    state = apply(state, full.game, act('places/sit')).state
    expect(state.sceneId).toBe('cafe.back-room')
    expect(view(state, full.game).scene.title).toBe('The back room')
  })

  it('draws something to happen when you sit a while at the café, and a quiet table when nothing can', () => {
    const sitDown = (seed: number) => {
      let state = run(startingState(game, { seed }), { type: 'choose', id: 'unpack' })
      state = run(on(state, 1, 'morning'), places.go('high-street'), places.go('cafe'), act('places/sit'))
      return state
    }
    const drawn = new Set(Array.from({ length: 20 }, (_, seed) => sitDown(seed).sceneId))
    expect(drawn.size).toBeGreaterThan(1)
    for (const id of drawn) expect(['cafe.window', 'cafe.crossword', 'cafe.break']).toContain(id)
    // Every storylet's when has run out: the window seen twice, the crossword done, and Ava off on a Sunday.
    const state = sitDown(1)
    const spent = {
      ...on(state, 6, 'afternoon'),
      sceneId: null,
      seen: { ...state.seen, 'cafe.window': { n: 2, first: 1, last: 5 }, 'cafe.crossword': { n: 1, first: 4, last: 4 } },
    }
    const after = run(spent, act('places/sit'))
    expect(view(after, game).scene.title).toBe('A quiet table')
  })

  it('plays quick feet at the park: inputs in time win coins, letting the clock run out loses', () => {
    let state = run(startingState(game), { type: 'choose', id: 'unpack' })
    state = run(on(state, 1, 'morning'), places.go('high-street'), places.go('park'), act('places/arrows'))
    expect(view(state, game).minigame).toMatchObject({ id: 'arrows', title: 'Quick feet', timeLeft: 1500, inputs: ['up', 'down', 'left', 'right'] })
    expect(apply(state, game, act('places/jog')).reason).toBe('Finish this first.')
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
    state = run(state, { type: 'choose', id: 'leave' }, act('places/arrows'), { type: 'tick', ms: 10_000 })
    expect(state.minigame).toBeNull()
    expect(state.sceneId).toBe('park.arrows-lost')
    expect(state.kv['minigame:arrows']).toBe(2)
  })

  it('leaves you caffeinated after a coffee, for the rest of the day and the next', () => {
    let state = run(startingState(game), { type: 'choose', id: 'unpack' })
    state = run(
      on(state, 1, 'morning'),
      places.go('high-street'),
      places.go('cafe'),
      act('places/coffee'),
      places.go('high-street'),
      places.go('office'),
      act('places/work'),
    )
    // 80 kept, plus 15 for the coffee, less 30 for the shift: 65, and 10 more on top while it lasts.
    expect(state.stats.energy).toBe(65)
    expect(statValue(state, game, 'energy')).toBe(75)
    const effects = () => (view(state, game).plugins.statuses as StatusesView).active
    expect(effects()).toEqual([expect.objectContaining({ id: 'caffeinated', label: 'Caffeinated', turnsLeft: 2 })])
    state = run(on(state, 1, 'night'), calendar.sleep())
    expect(effects()).toEqual([expect.objectContaining({ turnsLeft: 1 })])
    state = run(on(state, 2, 'night'), calendar.sleep())
    expect(effects()).toEqual([])
  })

  it('sells a sandwich at the café as a plain action too, beside the counter', () => {
    let state = run(startingState(game), { type: 'choose', id: 'unpack' })
    state = run(on(state, 1, 'morning'), places.go('high-street'), places.go('cafe'))
    const labels = view(state, game).actions.map((action) => action.label)
    expect(labels).toEqual(expect.arrayContaining(['Buy a sandwich']))
    // The counter sells one too, from the shop's view, which the React UI draws as the counter's dialog.
    expect((view(state, game).plugins.shop as ShopView).vendors[0].goods.map((good) => good.entity)).toContain('item:sandwich')
    const button = view(state, game).actions.find((action) => action.id === 'buy-sandwich')!
    expect(button.price?.stats).toEqual([{ id: 'coins', amount: 4, text: '4 coins' }])
    const coins = state.stats.coins
    state = run(state, act('places/buy-sandwich'))
    expect(state.stats.coins).toBe(coins - 4)
    expect(heldCount(state, game, 'item:sandwich')).toBe(1)
    // Only in the café.
    expect(apply(run(state, places.go('high-street')), game, act('places/buy-sandwich')).reason).toBeDefined()
  })

  it('sells from the café counter: two flapjacks a day, half off one thing, and half back on a sandwich', () => {
    let state = run(startingState(game), { type: 'choose', id: 'unpack' })
    state = run(on(state, 1, 'morning'), places.go('high-street'), places.go('cafe'))
    const counter = () => (view(state, game).plugins.shop as ShopView).vendors[0]
    expect(counter()).toMatchObject({ id: 'counter', here: true, closed: null })
    expect(counter().goods.filter((good) => good.off > 0)).toHaveLength(1)
    // Each good's buy button carries today's price, and greys out with the reason.
    const flapjack = () => counter().goods.find((good) => good.entity === 'item:flapjack')!
    expect(flapjack().buy.price?.stats?.[0].id).toBe('coins')
    expect(flapjack().stock).toBe(2)
    state = run(state, shop.buy('counter', 'item:flapjack'), shop.buy('counter', 'item:flapjack'))
    expect(apply(state, game, shop.buy('counter', 'item:flapjack')).reason).toBe('Sold out.')
    expect(flapjack().buy.disabled).toBe('Sold out.')
    // The counter holds its flapjacks, as any holder holds things; a sandwich never runs out.
    expect(heldCount(state, game, 'item:flapjack', 'vendor:counter')).toBe(0)
    expect(counter().goods[0].stock).toBeNull()
    const coins = state.stats.coins
    state = run(state, shop.buy('counter', 'item:sandwich'), shop.sell('counter', 'item:sandwich'))
    expect(state.stats.coins).toBe(coins - counter().goods[0].buy.price!.stats![0].amount + 2)
    // Baked again the next morning.
    expect(apply(on(state, 2, 'morning'), game, shop.buy('counter', 'item:flapjack')).reason).toBeUndefined()
    // Closed in the evening, with the café.
    expect(apply(on(state, 1, 'evening'), game, shop.buy('counter', 'item:sandwich')).reason).toBe('Closed.')
  })

  it('carries a save from before things were entities: the counter’s flapjacks and the raincoat on', () => {
    const now = on(run(startingState(game), { type: 'choose', id: 'unpack' }), 1, 'morning')
    const old = {
      ...now,
      plugins: {
        ...now.plugins,
        shop: { version: 1, state: { sold: { counter: { flapjack: { n: 1, at: 1 } } } } },
        wardrobe: { version: 1, state: { worn: { coat: 'raincoat', neck: null } } },
      },
    }
    const loaded = loadState(JSON.parse(JSON.stringify(old)), game)
    if (!loaded.ok) throw new Error(loaded.reason)
    expect(loaded.value.plugins.shop.state).toEqual({ stocked: { counter: { 'item:flapjack': { at: 1, left: 1 } } } })
    expect(loaded.value.plugins.wardrobe.state).toEqual({ worn: { player: { coat: 'clothing:raincoat', neck: null } } })
    expect(holds(loaded.value, game, wardrobe.wearing('clothing:raincoat'))).toBe(true)
    const flapjack = (view(loaded.value, game).plugins.shop as ShopView).vendors[0].goods.find((good) => good.entity === 'item:flapjack')!
    expect(flapjack.stock).toBe(1)
  })

  it('takes you on at the café for Saturday mornings once Ava knows you, and pays for each shift', () => {
    let state = run(startingState(game), { type: 'choose', id: 'unpack' })
    state = run(on(state, 1, 'morning'), places.go('high-street'), places.go('cafe'))
    expect(apply(state, game, jobs.apply('weekend')).reason).toBe('Ava doesn’t know you well enough yet.')
    state = run(state, cast.talk('ava'), { type: 'choose', id: 'chat' }, { type: 'choose', id: 'bye' })
    state = writeEntity(state, 'character:ava', { ...entityOf(state, game, 'character:ava'), stats: { friendship: 10 } })
    state = run(state, jobs.apply('weekend'))
    const job = () => (view(state, game).plugins.jobs as JobsView).jobs[0]
    expect(job()).toMatchObject({ hired: true, rank: { title: 'Weekend help' }, nextShift: { day: 5, inDays: 4 } })
    expect(apply(state, game, jobs.work('weekend')).reason).toBe('No shift today.')
    // Saturday morning: a shift takes the morning and 25 energy, and pays 12 coins.
    state = on({ ...state, stats: { ...state.stats, energy: 100 } }, 5, 'morning')
    const coins = state.stats.coins
    state = run(state, jobs.work('weekend'))
    expect(state.stats).toMatchObject({ coins: coins + 12, energy: 75 })
    expect(clock.read(state, game)).toEqual({ day: 5, period: 'afternoon' })
    expect(job()).toMatchObject({ shifts: 1, nextShift: { day: 12, inDays: 7 } })
  })

  it('fills the park with two new visitors each day, drawn from the town’s pools', () => {
    let state = run(startingState(game), { type: 'choose', id: 'unpack' })
    state = run(on(state, 1, 'morning'), places.go('high-street'), places.go('park'))
    const visitors = () => entitiesOf(state, game, 'visitor').map((ref) => ({ name: entityName(state, game, ref), kv: entityKv(state, game, ref) }))
    expect(visitors()).toHaveLength(2)
    for (const visitor of visitors()) {
      expect(['Ruth', 'Omar', 'Lena', 'Theo', 'Priya', 'Jonah', 'Maud', 'Kit']).toContain(visitor.name)
      expect(['alone', 'a dog', 'a pushchair']).toContain(visitor.kv.with)
    }
    expect(view(state, game).scene.body).toContain('A few people are out along the path')
    const first = visitors()
    // Back the next day: yesterday's have gone home, and two more are out.
    state = run(on(state, 2, 'morning'), places.go('high-street'), places.go('park'))
    expect(entitiesOf(state, game, 'visitor')).toEqual(['visitor:#3', 'visitor:#4'])
    expect(visitors()).not.toEqual(first)
  })

  it("carries the React UI's inline pieces in the flat's prose as written, with the words in the text", () => {
    const state = run(startingState(game), { type: 'choose', id: 'unpack' })
    const [room] = view(state, game).scene.beats
    expect(room.type === 'text' && room.text).toContain('and the radiator knocks when it feels like it')
    expect(room.type === 'text' && room.spans?.find((span) => span.type === 'ui')).toEqual({
      type: 'ui',
      name: 'modal',
      text: 'the radiator knocks',
      args: ['notice.welcome', "Sam's note"],
    })
  })

  it('skims a stone at the park on two dice against 8, and counts the ducks as you come in', () => {
    let state = run(startingState(game), { type: 'choose', id: 'unpack' })
    state = run(on(state, 1, 'morning'), places.go('high-street'), places.go('park'))
    // The ducks' roll came with arriving, from the park's trigger, and no line hints it.
    const [ducks] = view(state, game).rolls
    expect(ducks).toMatchObject({ key: 'ducks', dice: '1d6', plus: 2 })
    expect(view(state, game).scene.body).toContain(`${ducks.total} of them paddle over`)
    // The stones line holds the inline action that rolls.
    const inline = view(state, game).scene.beats.flatMap((beat) => ('spans' in beat && beat.spans ? beat.spans : []))
    expect(inline.some((span) => span.type === 'action' && span.text === 'Try to skim a stone' && span.choice.id === 'skim')).toBe(true)
    state = run(state, act('places/skim'))
    const [skim] = view(state, game).rolls
    expect(skim).toMatchObject({ key: 'skim', dice: '2d6', against: 8 })
    expect(state.kv.skim).toBe(skim.total)
    const body = view(state, game).scene.body
    const line = skim.critical === 'max' ? 'Skip after skip' : skim.passed ? 'The stone skips once' : 'Plop.'
    expect(body).toContain(line)
    // The line under the dice carries the React UI's hint.
    expect(view(state, game).scene.beats.find((beat) => beat.type === 'text' && beat.text.startsWith(line))?.ui).toEqual({ dice: 'skim' })
    // A new day resets `skimmed`, and the outcome is gone until you skim again.
    expect(game.resets?.skimmed).toBe(false)
    expect(view({ ...state, kv: { ...state.kv, skimmed: false } }, game).scene.body).not.toContain(line)
  })

  it('keeps the phone in the pocket at work', () => {
    let state = run(startingState(game), { type: 'choose', id: 'unpack' })
    state = run(on(state, 1, 'morning'), places.go('high-street'), places.go('office'))
    expect(apply(state, game, openCamera).reason).toBe('Not at work.')
    state = run(state, act('places/work'))
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
    const park = {
      ...fresh,
      sceneId: null,
      kv: { ...fresh.kv, phase: 'open' },
      plugins: { ...fresh.plugins, places: { version: 1, state: { at: 'park' } satisfies PlacesState } },
    }
    expect(view(park, modded.game).scene.body).toContain('fog')
  })

  it('takes the French mod: one words table over the labels, names and words in place, and no problems', async () => {
    const { mods, memoryDriver, translatableFields } = await import('@ifloom/engine')
    const { readFileSync } = await import('node:fs')
    const store = mods('small-town', memoryDriver())
    await store.add(readFileSync(new URL('../mods/french.json', import.meta.url), 'utf8'))
    const french = smallTown({ mods: await store.packs() })
    expect(french.problems).toEqual([])
    const intro = view(startingState(french.game), french.game).scene
    expect(intro.title).toBe('Le jour du déménagement')
    expect(intro.beats[0]).toMatchObject({ type: 'text', text: expect.stringContaining('La camionnette repart') })
    expect(intro.beats[0].type === 'text' && intro.beats[0].spans?.find((span) => span.type === 'tip')).toMatchObject({
      text: 'laverie',
      tip: expect.stringContaining('Sam, de'),
    })
    expect(intro.choices.map((choice) => choice.label)).toEqual(['Déballer'])
    const fresh = startingState(french.game)
    const home = on({ ...fresh, sceneId: null, kv: { ...fresh.kv, phase: 'open' } }, 1, 'morning')
    const room = view(home, french.game)
    expect(room.scene.title).toBe('Votre appartement')
    expect(room.actions.map((action) => action.label)).toEqual(expect.arrayContaining(['Aller au lit', 'Attendre un peu']))
    // Every key in it names a field the English game has.
    const keys = new Set(translatableFields(game).map((field) => field.key))
    const pack = JSON.parse(readFileSync(new URL('../mods/french.json', import.meta.url), 'utf8')).pack as { words: Record<string, string> }
    expect(Object.keys(pack.words).filter((key) => !keys.has(key))).toEqual([])
    // The English game is as it was.
    expect(view(startingState(game), game).scene.title).toBe('Moving day')
  })

  it('has the debugger only when built with it', () => {
    expect(view(startingState(game), game).plugins.debug).toBeUndefined()
    const dev = smallTown({ withDebug: true }).game
    expect(view(startingState(dev), dev).plugins.debug).toBeDefined()
  })
})
