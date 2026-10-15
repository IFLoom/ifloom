/**
 * The acceptance test from design/devices.md: a smartphone on the sidebar with
 * notifications, messages, a creator app, a camera, a gallery, social media
 * and contacts — every app declared as data, and the only code one custom
 * effect that rolls how a post did.
 */
import { describe, expect, it } from 'vitest'
import { SCHEMA, apply, loadGame, startingState, view, type Command, type Game, type GameState, type Pack } from '@ifloom/engine'
import { closeApp, openApp, type DevicesView } from '@ifloom/plugin-devices'
import { postTo, react, type FeedsView } from '@ifloom/plugin-feed'
import { replyTo, type MessagesView } from '@ifloom/plugin-messages'
import { calendar, pass, period, sleep } from '@ifloom/plugin-calendar'
import { at, go, places, where } from '@ifloom/plugin-places'
import { call, cast, here, talk } from '@ifloom/plugin-cast'
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
      sections: [{ actions: [{ id: 'photo', label: 'Take a photo', command: { type: 'activity', id: 'photo' } }] }],
    },
    {
      id: 'studio',
      name: 'Fans · post',
      icon: 'star',
      sections: [
        { prose: [{ text: 'studio.stats' }] },
        { actions: [{ id: 'post', label: 'Post a photo', command: { type: 'activity', id: 'post' } }] },
      ],
    },
  ],
})

const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  stats: [
    { id: 'energy', label: 'Energy', start: 50, spendable: true },
    { id: 'subscribers', label: 'Subscribers' },
  ],
  storylines: [{ id: 'ava', name: 'Ava' }],
  scenes: [
    { id: 'ava.hi', body: [{ text: 'ava.hi' }], choices: [{ id: 'bye', effects: [{ kind: 'scene', id: null }] }] },
    { id: 'ava.call', body: [{ text: 'ava.call' }], choices: [{ id: 'bye', effects: [{ kind: 'scene', id: null }] }] },
  ],
  activities: [
    {
      id: 'photo',
      requires: [{ reason: 'Nobody to take a picture of.', when: here('ava') }],
      effects: [{ kind: 'collect', to: 'gallery', entry: { id: 'ava.cafe', title: 'Ava at the café', image: 'art/ava-cafe.jpg' } }],
    },
    {
      id: 'post',
      cost: { stats: { energy: 10 } },
      requires: [
        { reason: 'Nothing to post yet.', when: { collection: 'gallery' } },
        { reason: 'You have posted today.', when: { not: { flag: 'postedToday' } } },
      ],
      effects: [
        pass(1),
        postTo('fans', 'fans.ava-cafe', { text: 'fans.ava-cafe', image: 'art/ava-cafe.jpg' }),
        { kind: 'flag', key: 'postedToday', value: true },
        { custom: 'fanReaction' },
      ],
    },
  ],
  prose: {
    'place.house': 'Home.',
    'place.cafe': 'Coffee.',
    'place.work': 'Desks.',
    'ava.hi': 'Hi.',
    'ava.hi#bye': 'Bye',
    'ava.call': '"Hey you."',
    'ava.call#bye': 'Hang up',
    'ava.hey': 'Good seeing you today.',
    'ava.hey#reply': 'You too!',
    'studio.stats': '{{v:subscribersLine}}',
    'fans.ava-cafe': 'Coffee with a friend.',
    'fans.nice': 'Love this',
  },
  data: {
    cast: {
      characters: [
        {
          id: 'ava',
          name: 'Ava',
          role: 'Friend',
          hue: 200,
          home: 'cafe',
          talk: 'ava.hi',
          storyline: 'ava',
          call: { scene: 'ava.call', when: { not: period('night') }, busy: 'Straight to voicemail.' },
        },
      ],
    },
    places: {
      locations: [
        { id: 'house', name: 'House', tag: 'Home', kind: 'room', exits: ['cafe', 'work'], art: '', body: [{ text: 'place.house' }] },
        { id: 'cafe', name: 'Café', tag: 'Café', kind: 'room', exits: ['house'], art: '', body: [{ text: 'place.cafe' }] },
        { id: 'work', name: 'Work', tag: 'Work', kind: 'room', exits: ['house'], art: '', body: [{ text: 'place.work' }] },
      ],
    },
    messages: {
      messages: [
        // A text that arrives the day after the café.
        { id: 'ava.hey', channel: 'texts', from: 'ava', when: { all: [{ seen: 'ava.hi' }, { since: 'ava.hi', gte: 1 }] }, body: [{ text: 'ava.hey' }], replies: [{ id: 'reply' }] },
      ],
    },
  },
  custom: {
    values: { subscribersLine: (state) => `${state.stats.subscribers ?? 0} subscribers` },
    // How a post did: the game's own roll, here a fixed one.
    effects: { fanReaction: () => [{ kind: 'stat', key: 'subscribers', by: 5 }, react('fans.ava-cafe', { likes: 12, from: 'ava', text: 'fans.nice' })] },
  },
}

function game(): Game {
  const loaded = loadGame([town], {
    id: 'phone-town',
    title: 'Phone town',
    introScene: 'none',
    plugins: [clock, places({ start: 'house' }), cast(), ...kit.plugins],
    collections: kit.collections,
    rules: {
      resets: { postedToday: false },
      // No phone at work.
      locks: [{ when: at('work'), deny: ['devices/*'], reason: 'Not at work.' }],
    },
  })
  expect(loaded.problems).toEqual([])
  return loaded.game
}

const begin = (g: Game): GameState => clock.write({ ...startingState(g), sceneId: null }, { day: 1, period: 'morning' })
const phoneOf = (state: GameState, g: Game) => (view(state, g).plugins.devices as DevicesView).devices[0]

function run(state: GameState, g: Game, ...commands: Command[]): GameState {
  for (const command of commands) {
    const out = apply(state, g, command)
    expect(out.refused, JSON.stringify(command)).toBeUndefined()
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
    let state = run(begin(g), g, go('cafe'), talk('ava'), { type: 'choose', id: 'bye' })
    state = run(state, g, go('house'))
    state = run(clock.write(state, { day: 1, period: 'night' }), g, sleep())
    expect(view(state, g).notices.byTag).toEqual({ texts: 1 })
    expect(phoneOf(state, g).badge).toBe(1)
    expect(phoneOf(state, g).apps.find((app) => app.id === 'texts')?.badge).toBe(1)
    state = run(state, g, openApp('texts'), replyTo('ava.hey', 'reply'))
    const texts = (view(state, g).plugins.messages as MessagesView).channels[0]
    expect(texts.threads[0].messages[0].replied).toBe('You too!')
    expect(phoneOf(state, g).badge).toBe(0)
  })

  it('takes a photo only with someone to take, and keeps it in the gallery', () => {
    const g = game()
    let state = run(begin(g), g, openApp('camera'))
    expect(phoneOf(state, g).open?.sections[0]).toMatchObject({ kind: 'actions', actions: [{ label: 'Take a photo', disabled: 'Nobody to take a picture of.' }] })
    state = run(state, g, closeApp('phone'), go('cafe'), openApp('camera'), { type: 'activity', id: 'photo' }, openApp('gallery'))
    expect(phoneOf(state, g).open?.sections[0]).toMatchObject({ kind: 'list', entries: [{ id: 'ava.cafe', title: 'Ava at the café' }] })
  })

  it('posts to the creator app once a day, at a price, and the post does what the game rolls', () => {
    const g = game()
    let state = run(begin(g), g, go('cafe'), { type: 'activity', id: 'photo' }, openApp('studio'))
    const post = () => phoneOf(state, g).open?.sections[1]
    expect(post()).toMatchObject({ kind: 'actions', actions: [{ label: 'Post a photo', disabled: undefined }] })
    state = run(state, g, { type: 'activity', id: 'post' })
    expect(state.stats).toMatchObject({ energy: 40, subscribers: 5 })
    expect(phoneOf(state, g).open?.sections[0]).toEqual({ kind: 'prose', text: '5 subscribers' })
    expect(post()).toMatchObject({ actions: [{ disabled: 'You have posted today.' }] })
    const fans = (view(state, g).plugins.feed as FeedsView).feeds.find((entry) => entry.id === 'fans')!
    expect(fans.posts[0]).toMatchObject({ mine: true, text: 'Coffee with a friend.', likes: 12, comments: [{ name: 'Ava', text: 'Love this' }] })
  })

  it('calls the people the player has met, unless they don’t pick up', () => {
    const g = game()
    expect(phoneOf(run(begin(g), g, openApp('contacts')), g).open?.sections[0]).toEqual({ kind: 'list', entries: [] })
    let state = run(begin(g), g, go('cafe'), talk('ava'), { type: 'choose', id: 'bye' })
    state = run(state, g, go('house'), openApp('contacts'))
    expect(phoneOf(state, g).open?.sections[0]).toMatchObject({ kind: 'list', entries: [{ id: 'ava', actions: [{ label: 'Call', disabled: undefined }] }] })
    state = run(state, g, call('ava'))
    expect(state.sceneId).toBe('ava.call')
    expect(where(state)).toBe('house')
    const night = clock.write(begin(g), { day: 1, period: 'night' })
    expect(apply(night, g, call('ava')).refused).toBe('Straight to voicemail.')
  })

  it('stays in the pocket at work: its apps greyed out, and one left open closes', () => {
    const g = game()
    const state = run(begin(g), g, openApp('camera'), go('work'))
    expect(apply(state, g, openApp('texts')).refused).toBe('Not at work.')
    expect(phoneOf(state, g).open).toBeNull()
    expect(phoneOf(state, g).apps.every((app) => app.disabled === 'Not at work.')).toBe(true)
  })
})
