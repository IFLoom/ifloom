/**
 * The acceptance test from design/devices.md: a smartphone on the sidebar with
 * notifications, messages, a creator app, a camera, a gallery, social media
 * and contacts — every app declared as data, and the only code one custom
 * effect that rolls how a post did.
 */
import { describe, expect, it } from 'vitest'
import { apply, loadGame, startingState, view, type Game, type GameState, type Content, type CommandRef, type GameRules } from '@ifloom/engine'
import { devices, type DevicesView } from '@ifloom/plugin-devices'
import { feed, type FeedsView } from '@ifloom/plugin-feed'
import { messages, type MessagesView } from '@ifloom/plugin-messages'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { cast } from '@ifloom/plugin-cast'
import { phone } from '../src/index.ts'

const clock = calendar()

const kit = phone({
  sidebar: true,
  wallpaper: 'art/wall.jpg',
  feeds: [
    { id: 'social', name: 'Social' },
    { id: 'fans', name: 'Fans' },
  ],
  apps: [
    {
      id: 'camera',
      name: 'Camera',
      icon: 'camera',
      sections: [{ actions: [{ id: 'photo', label: 'Take a photo', command: { type: 'action', id: 'photo' } }] }],
    },
    {
      id: 'studio',
      name: 'Fans · post',
      icon: 'star',
      sections: [{ blocks: [{ prose: 'studio.stats' }] }, { actions: [{ id: 'post', label: 'Post a photo', command: { type: 'action', id: 'post' } }] }],
    },
  ],
})

const town: Content = {
  name: 'town',
  stats: [
    { id: 'energy', label: 'Energy', start: 50, spendable: true },
    { id: 'subscribers', label: 'Subscribers' },
  ],
  storylines: [{ id: 'ava', name: 'Ava' }],
  scenes: [
    { id: 'ava.hi', body: [{ prose: 'ava.hi' }], choices: [{ id: 'bye', label: 'Bye', effects: [{ scene: null }] }] },
    { id: 'ava.call', body: [{ prose: 'ava.call' }], choices: [{ id: 'bye', label: 'Hang up', effects: [{ scene: null }] }] },
  ],
  actions: [
    {
      id: 'photo',
      blocked: [{ when: { not: cast.here('ava') }, reason: 'Nobody to take a picture of.' }],
      effects: [{ create: 'photo', with: { id: 'ava.cafe', name: 'Ava at the café', image: 'art/ava-cafe.jpg' }, at: 'player' }],
    },
    {
      id: 'post',
      cost: { stats: { energy: 10 } },
      blocked: [
        { when: { not: { count: { of: 'photo', at: 'you' } } }, reason: 'Nothing to post yet.' },
        { when: { kv: 'postedToday' }, reason: 'You have posted today.' },
      ],
      effects: [
        calendar.pass(1),
        feed.post('fans', 'fans.ava-cafe', { text: 'Coffee with a friend.', image: 'art/ava-cafe.jpg' }),
        { kv: 'postedToday', to: true },
        { 'game/fanReaction': true },
      ],
    },
  ],
  prose: {
    'place.house': 'Home.',
    'place.cafe': 'Coffee.',
    'place.work': 'Desks.',
    'ava.hi': 'Hi.',
    'ava.call': '"Hey you."',
    'ava.hey': 'Good seeing you today.',
    'studio.stats': '{{v:game/subscribersLine}}',
  },
  entities: [
    places.location({ id: 'house', name: 'House', description: 'Home', exits: ['cafe', 'work'], body: [{ prose: 'place.house' }] }),
    places.location({ id: 'cafe', name: 'Café', description: 'Café', exits: ['house'], body: [{ prose: 'place.cafe' }] }),
    places.location({ id: 'work', name: 'Work', description: 'Work', exits: ['house'], body: [{ prose: 'place.work' }] }),
    cast.person({
      id: 'ava',
      name: 'Ava',
      description: 'Friend',
      ui: { hue: 200 },
      home: 'cafe',
      talk: 'ava.hi',
      storyline: 'ava',
      call: { scene: 'ava.call', when: { not: calendar.period('night') }, busy: 'Straight to voicemail.' },
    }),
  ],
  data: {
    messages: {
      messages: [
        // A text that arrives the day after the café.
        {
          id: 'ava.hey',
          channel: 'texts',
          from: 'ava',
          when: { all: [{ seen: 'ava.hi' }, { since: 'ava.hi', gte: 1 }] },
          body: [{ prose: 'ava.hey' }],
          replies: [{ id: 'reply', label: 'You too!' }],
        },
      ],
    },
  },
}

/** The game's own code: a line for the subscribers, and how a post did. */
const rules: GameRules = {
  values: { subscribersLine: (state) => `${state.stats.subscribers ?? 0} subscribers` },
  // How a post did: the game's own roll, here a fixed one.
  effects: { fanReaction: () => [{ stat: 'subscribers', by: 5 }, feed.react('fans.ava-cafe', { likes: 12, from: 'ava', text: 'Love this' })] },
}

function game(): Game {
  const loaded = loadGame(
    [kit.content, { name: 'base', resets: { postedToday: false }, locks: [{ when: places.at('work'), deny: ['devices/*'], reason: 'Not at work.' }] }, town],
    {
      id: 'phone-town',
      title: 'Phone town',
      rules,

      plugins: [clock, places({ start: 'house' }), cast(), ...kit.plugins],
    },
  )
  expect(loaded.problems).toEqual([])
  return loaded.game
}

const begin = (g: Game): GameState => clock.write({ ...startingState(g), sceneId: null }, { day: 1, period: 'morning' })
const phoneOf = (state: GameState, g: Game) => (view(state, g).plugins.devices as DevicesView).devices[0]

function run(state: GameState, g: Game, ...commands: CommandRef[]): GameState {
  for (const command of commands) {
    const out = apply(state, g, command)
    expect(out.reason, JSON.stringify(command)).toBeUndefined()
    state = out.state
  }
  return state
}

describe('a smartphone on the sidebar', () => {
  it('is there from the start, with the stock apps and the game’s own', () => {
    const g = game()
    const device = phoneOf(begin(g), g)
    expect(device).toMatchObject({ id: 'phone', frame: 'phone', sidebar: true, wallpaper: 'art/wall.jpg', badge: 0, open: null })
    expect(device.apps.map((app) => app.name)).toEqual(['Messages', 'Social', 'Fans', 'Contacts', 'Gallery', 'Camera', 'Fans · post'])
  })

  it('gets a text when the story allows, with a notice and a badge, and replies to it', () => {
    const g = game()
    let state = run(begin(g), g, places.go('cafe'), cast.talk('ava'), { type: 'choose', id: 'bye' })
    state = run(state, g, places.go('house'))
    state = run(clock.write(state, { day: 1, period: 'night' }), g, calendar.sleep())
    expect(view(state, g).notices.byTag).toEqual({ texts: 1 })
    expect(phoneOf(state, g).badge).toBe(1)
    expect(phoneOf(state, g).apps.find((app) => app.id === 'texts')?.badge).toBe(1)
    state = run(state, g, devices.open('texts'), messages.reply('ava.hey', 'reply'))
    const texts = (view(state, g).plugins.messages as MessagesView).channels[0]
    expect(texts.threads[0].messages[0].replied).toBe('You too!')
    expect(phoneOf(state, g).badge).toBe(0)
  })

  it('takes a photo only with someone to take, and keeps it in the gallery', () => {
    const g = game()
    let state = run(begin(g), g, devices.open('camera'))
    expect(phoneOf(state, g).open?.sections[0]).toMatchObject({
      type: 'actions',
      actions: [{ label: 'Take a photo', disabled: 'Nobody to take a picture of.' }],
    })
    state = run(state, g, devices.close('phone'), places.go('cafe'), devices.open('camera'), { type: 'action', id: 'photo' }, devices.open('gallery'))
    expect(phoneOf(state, g).open?.sections[0]).toMatchObject({
      type: 'list',
      entries: [{ id: 'photo:ava.cafe', title: 'Ava at the café', image: 'art/ava-cafe.jpg' }],
    })
  })

  it('posts to the creator app once a day, at a price, and the post does what the game rolls', () => {
    const g = game()
    let state = run(begin(g), g, places.go('cafe'), { type: 'action', id: 'photo' }, devices.open('studio'))
    const post = () => phoneOf(state, g).open?.sections[1]
    expect(post()).toMatchObject({ type: 'actions', actions: [{ label: 'Post a photo', disabled: undefined }] })
    state = run(state, g, { type: 'action', id: 'post' })
    expect(state.stats).toMatchObject({ energy: 40, subscribers: 5 })
    expect(phoneOf(state, g).open?.sections[0]).toEqual({ type: 'prose', text: '5 subscribers', beats: [{ type: 'text', text: '5 subscribers' }] })
    expect(post()).toMatchObject({ actions: [{ disabled: 'You have posted today.' }] })
    const fans = (view(state, g).plugins.feed as FeedsView).feeds.find((entry) => entry.id === 'fans')!
    expect(fans.posts[0]).toMatchObject({ mine: true, text: 'Coffee with a friend.', likes: 12, comments: [{ name: 'Ava', text: 'Love this' }] })
  })

  it('calls the people the player has met, unless they don’t pick up', () => {
    const g = game()
    expect(phoneOf(run(begin(g), g, devices.open('contacts')), g).open?.sections[0]).toEqual({ type: 'list', entries: [] })
    let state = run(begin(g), g, places.go('cafe'), cast.talk('ava'), { type: 'choose', id: 'bye' })
    state = run(state, g, places.go('house'), devices.open('contacts'))
    expect(phoneOf(state, g).open?.sections[0]).toMatchObject({ type: 'list', entries: [{ id: 'ava', actions: [{ label: 'Call', disabled: undefined }] }] })
    state = run(state, g, cast.call('ava'))
    expect(state.sceneId).toBe('ava.call')
    expect(places.where(state)).toBe('house')
    const night = clock.write(begin(g), { day: 1, period: 'night' })
    expect(apply(night, g, cast.call('ava')).reason).toBe('Straight to voicemail.')
  })

  it('stays in the pocket at work: its apps greyed out, and one left open closes', () => {
    const g = game()
    const state = run(begin(g), g, devices.open('camera'), places.go('work'))
    expect(apply(state, g, devices.open('texts')).reason).toBe('Not at work.')
    expect(phoneOf(state, g).open).toBeNull()
    expect(phoneOf(state, g).apps.every((app) => app.disabled === 'Not at work.')).toBe(true)
  })
})
