import { describe, expect, it } from 'vitest'
import {
  SCHEMA,
  apply,
  holds,
  loadGame,
  startingState,
  view,
  whyNot,
  type Game,
  type GameState,
  type Pack,
} from '@ifloom/engine'
import { cast } from '@ifloom/plugin-cast'
import { messageArrived, messageReplied, messages, readThread, replyTo, type MessagesView } from '../src/index.ts'
import { calendar, pass, period } from '@ifloom/plugin-calendar'

const clock = calendar()

const plugin = messages()
/** The channels, as the base game's content. */
const channels = { messages: { channels: [{ id: 'texts', name: 'Messages' }, { id: 'post', name: 'Post' }] } }

function game(extra: Partial<Pack> = {}): Game {
  const pack: Pack = {
    id: 'town',
    schema: SCHEMA,
    storylines: [{ id: 'ava', name: 'Ava' }],
    scenes: [{ id: 'ava.hi', body: [{ text: 'ava.hi' }], choices: [{ id: 'bye', effects: [{ kind: 'scene', scene: null }] }] }],
    // Going out is all a message waits for here: no map needed.
    activities: [{ id: 'wait', effects: [pass(1)] }, { id: 'goOut', effects: [{ kind: 'kv', key: 'out', to: true }] }],
    prose: {
      'ava.hi': 'Hi.',
      'ava.hi#bye': 'Bye',
      'msg.hey': 'Hey {{playerFirst}}, was that you on the street?',
      'msg.hey#yes': 'Yes!',
      'msg.hey#no': 'No…',
      'msg.later': 'Coffee tomorrow?',
      'msg.bill': 'The water bill. You owe 12.',
    },
    data: {
      // Ava is the cast's: messages from her are signed with her name.
      cast: { characters: [{ id: 'ava', name: 'Ava', role: 'Neighbour', hue: 200, talk: 'ava.hi', storyline: 'ava' }] },
      messages: {
        messages: [
          { id: 'msg.hey', channel: 'texts', from: 'ava', when: { kv: 'out' }, body: [{ text: 'msg.hey' }], replies: [{ id: 'yes', effects: [{ kind: 'kv', key: 'saidYes', to: true }] }, { id: 'no' }] },
          { id: 'msg.later', channel: 'texts', from: 'ava', when: { kv: 'saidYes' }, body: [{ text: 'msg.later' }] },
          { id: 'msg.bill', channel: 'post', from: 'Water Board', when: period('afternoon'), body: [{ text: 'msg.bill' }] },
        ],
      },
    },
    ...extra,
  }
  const loaded = loadGame([pack], { id: 'msgs', title: 'Msgs', plugins: [clock, cast(), plugin], data: channels })
  expect(loaded.problems).toEqual([])
  return loaded.game
}

const begin = (g: Game): GameState => clock.write({ ...startingState(g, { kv: { playerFirst: 'Sam' } }), sceneId: null }, { day: 1, period: 'morning' })
const shown = (state: GameState, g: Game) => view(state, g).plugins.messages as MessagesView

describe('messages', () => {
  it('arrive the first time their condition holds, and raise a notice tagged with the channel', () => {
    const g = game()
    expect(shown(begin(g), g).unread).toBe(0)
    const state = apply(begin(g), g, { type: 'activity', id: 'goOut' }).state
    const texts = shown(state, g).channels[0]
    expect(texts.threads).toEqual([
      expect.objectContaining({
        id: 'ava',
        name: 'Ava',
        unread: 1,
        messages: [expect.objectContaining({ id: 'msg.hey', text: 'Hey Sam, was that you on the street?', read: false })],
      }),
    ])
    expect(view(state, g).notices.byTag).toEqual({ texts: 1 })
    expect(holds(state, messageArrived('msg.hey'), g)).toBe(true)
  })

  it('offer replies as choices: one, once, with effects that can bring the next message', () => {
    const g = game()
    let state = apply(begin(g), g, { type: 'activity', id: 'goOut' }).state
    expect(shown(state, g).channels[0].threads[0].messages[0].replies.map((reply) => reply.label)).toEqual(['Yes!', 'No…'])
    state = apply(state, g, replyTo('msg.hey', 'yes')).state
    expect(whyNot(state, g, replyTo('msg.hey', 'no'))).toBe('You have already replied.')
    expect(holds(state, messageReplied('msg.hey', 'yes'), g)).toBe(true)
    const thread = shown(state, g).channels[0].threads[0]
    expect(thread.messages.map((message) => [message.id, message.replied])).toEqual([
      ['msg.hey', 'Yes!'],
      ['msg.later', null],
    ])
    expect(thread.unread).toBe(1)
  })

  it('refuse a reply that is not on offer or to a message that has not come', () => {
    const g = game()
    expect(whyNot(begin(g), g, replyTo('msg.hey', 'yes'))).toBe('There is no such message.')
    const state = apply(begin(g), g, { type: 'activity', id: 'goOut' }).state
    expect(whyNot(state, g, replyTo('msg.hey', 'maybe'))).toBe('That is not a reply on offer.')
  })

  it('keep channels apart, count unread for badges, and mark threads read', () => {
    const g = game()
    let state = apply(begin(g), g, { type: 'activity', id: 'goOut' }).state
    state = apply(state, g, { type: 'activity', id: 'wait' }).state
    expect(shown(state, g).channels.map((channel) => [channel.id, channel.unread])).toEqual([
      ['texts', 1],
      ['post', 1],
    ])
    expect(shown(state, g).channels[1].threads[0].name).toBe('Water Board')
    state = apply(state, g, readThread('ava')).state
    expect(shown(state, g).unread).toBe(1)
    state = apply(state, g, readThread()).state
    expect(shown(state, g).unread).toBe(0)
  })

  it('report messages with no channel, no prose, or a bad condition', () => {
    const loaded = loadGame(
      [
        {
          id: 'mod',
          schema: SCHEMA,
          data: { messages: { messages: [{ id: 'm', channel: 'fax', from: 'x', when: { storyline: 'ghost' }, body: [{ text: 'm.none' }], replies: [{ id: 'r' }, { id: 'r' }] }] } },
        },
      ],
      { id: 'g', title: 'g', plugins: [plugin], data: channels },
    )
    expect(loaded.problems).toEqual(
      expect.arrayContaining([
        { pack: 'mod', where: 'messages m', what: 'unknown channel "fax"' },
        { pack: 'mod', where: 'messages m', what: 'unknown storyline "ghost"' },
        { pack: 'mod', where: 'messages m', what: 'no prose for "m.none"' },
        { pack: 'mod', where: 'messages m', what: 'two replies are called "r"' },
        { pack: 'mod', where: 'messages m', what: 'no prose for "m#r"' },
      ]),
    )
  })
})

describe('pictures and videos in a message', () => {
  it('come as beats, in the order written, from markup and from media blocks', () => {
    const g = game({
      prose: {
        'ava.hi': 'Hi.',
        'ava.hi#bye': 'Bye',
        'msg.ducks': 'Look at the ducks!\n\n[[video:ducks|A duck on the pond]]',
      },
      media: { pools: { pond: [{ src: 'pond/morning.jpg', tags: ['morning'] }] } },
      data: {
        cast: { characters: [{ id: 'ava', name: 'Ava', role: 'Neighbour', hue: 200, talk: 'ava.hi', storyline: 'ava' }] },
        messages: {
          messages: [
            { id: 'msg.ducks', channel: 'texts', from: 'ava', when: { kv: 'out' }, body: [{ text: 'msg.ducks' }, { media: { pool: 'pond', tags: ['morning'] } }] },
          ],
        },
      },
    })
    const state = apply(begin(g), g, { type: 'activity', id: 'goOut' }).state
    const message = shown(state, g).channels[0].threads[0].messages[0]
    expect(message.beats).toEqual([
      { kind: 'text', text: 'Look at the ducks!' },
      { kind: 'video', src: 'art/ducks.mp4', alt: 'A duck on the pond', size: 'inline', autoplay: true, loop: true, muted: true, controls: false },
      { kind: 'image', src: 'art/pond/morning.jpg', size: 'inline' },
    ])
  })
})

