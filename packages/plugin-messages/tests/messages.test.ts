import { describe, expect, it } from 'vitest'
import {
  SCHEMA,
  apply,
  createRunner,
  holds,
  loadGame,
  loadState,
  replay,
  startingState,
  view,
  whyNot,
  type Game,
  type GameState,
  type Pack,
} from '@ifloom/engine'
import { cast } from '@ifloom/plugin-cast'
import { drawMessage, messageArrived, messageReplied, messageSince, messages, readThread, replyTo, type MessagesView } from '../src/index.ts'
import { calendar, pass, period } from '@ifloom/plugin-calendar'

const clock = calendar()

const plugin = messages()
/** The channels, as the base game's content. */
const channels = {
  messages: {
    channels: [
      { id: 'texts', name: 'Messages' },
      { id: 'post', name: 'Post' },
    ],
  },
}

function game(extra: Partial<Pack> = {}): Game {
  const pack: Pack = {
    id: 'town',
    schema: SCHEMA,
    storylines: [{ id: 'ava', name: 'Ava' }],
    scenes: [{ id: 'ava.hi', body: [{ text: 'ava.hi' }], choices: [{ id: 'bye', effects: [{ kind: 'scene', scene: null }] }] }],
    // Going out is all a message waits for here: no map needed.
    activities: [
      { id: 'wait', effects: [pass(1)] },
      { id: 'goOut', effects: [{ kind: 'kv', key: 'out', to: true }] },
    ],
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
          {
            id: 'msg.hey',
            channel: 'texts',
            from: 'ava',
            when: { kv: 'out' },
            body: [{ text: 'msg.hey' }],
            replies: [{ id: 'yes', effects: [{ kind: 'kv', key: 'saidYes', to: true }] }, { id: 'no' }],
          },
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
          data: {
            messages: {
              messages: [{ id: 'm', channel: 'fax', from: 'x', when: { storyline: 'ghost' }, body: [{ text: 'm.none' }], replies: [{ id: 'r' }, { id: 'r' }] }],
            },
          },
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
            {
              id: 'msg.ducks',
              channel: 'texts',
              from: 'ava',
              when: { kv: 'out' },
              body: [{ text: 'msg.ducks' }, { media: { pool: 'pond', tags: ['morning'] } }],
            },
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

describe('pools', () => {
  /** Ava's small talk: two lines drawn from `chat`, neither again within two days; the rain one has a reply. */
  function chatty(): Game {
    const rested = (id: string) => ({ not: messageSince(id, { lt: 2 }) })
    return game({
      activities: [
        { id: 'chat', effects: [drawMessage('chat')] },
        { id: 'wait', effects: [pass(1)] },
      ],
      prose: {
        'ava.hi': 'Hi.',
        'ava.hi#bye': 'Bye',
        'chat.rain': 'Rain later.',
        'chat.rain#ok': 'Noted',
        'chat.beans': 'New beans.',
      },
      data: {
        cast: { characters: [{ id: 'ava', name: 'Ava', role: 'Neighbour', hue: 200, talk: 'ava.hi', storyline: 'ava' }] },
        messages: {
          messages: [
            {
              id: 'chat.rain',
              channel: 'texts',
              from: 'ava',
              drawnFrom: ['chat'],
              when: rested('chat.rain'),
              body: [{ text: 'chat.rain' }],
              replies: [{ id: 'ok' }],
            },
            { id: 'chat.beans', channel: 'texts', from: 'ava', drawnFrom: ['chat'], weight: 2, when: rested('chat.beans'), body: [{ text: 'chat.beans' }] },
          ],
        },
      },
    })
  }
  const chat = { type: 'activity', id: 'chat' } as const
  const keys = (state: GameState, g: Game) => shown(state, g).channels[0].threads.flatMap((thread) => thread.messages.map((message) => message.key))

  it('wait to be drawn, then arrive as a new arrival with a notice, drawn the same way on replay', () => {
    const g = chatty()
    let state = apply(begin(g), g, { type: 'activity', id: 'wait' }).state
    expect(keys(state, g)).toEqual([])
    const runner = createRunner(g, begin(g))
    expect(runner.apply(chat).ok).toBe(true)
    state = runner.state
    const [first] = keys(state, g)
    expect(['chat.rain', 'chat.beans']).toContain(first)
    expect(view(state, g).notices.byTag).toEqual({ texts: 1 })
    expect(holds(state, messageArrived(first), g)).toBe(true)
    expect(shown(state, g).unread).toBe(1)
    expect(replay(g, runner.log())).toEqual({ ok: true, value: runner.state })
  })

  it('come again once their own cooldown has passed, each arrival with its own key, reply and read mark', () => {
    const g = chatty()
    let state = begin(g)
    state = apply(state, g, chat).state
    state = apply(state, g, chat).state
    // Both lines are resting now, so a third draw brings nothing.
    expect([...keys(state, g)].sort()).toEqual(['chat.beans', 'chat.rain'])
    expect(apply(state, g, chat).state.plugins).toEqual(state.plugins)
    // Two days on, both can come again.
    state = clock.write(state, { day: 3, period: 'morning' })
    expect(holds(state, messageSince('chat.rain', { gte: 2 }), g)).toBe(true)
    state = apply(state, g, chat).state
    state = apply(state, g, chat).state
    const all = keys(state, g)
    expect([...all].sort()).toEqual(['chat.beans', 'chat.beans~2', 'chat.rain', 'chat.rain~2'])
    expect(shown(state, g).unread).toBe(4)
    // The second rain's reply is its own: the first is still unanswered.
    const rain = shown(state, g).channels[0].threads[0].messages.filter((message) => message.id === 'chat.rain')
    expect(rain.map((message) => message.replies[0]?.command)).toEqual([
      { type: 'custom', name: 'messages/reply', with: { message: 'chat.rain', reply: 'ok' } },
      { type: 'custom', name: 'messages/reply', with: { message: 'chat.rain~2', reply: 'ok' } },
    ])
    state = apply(state, g, replyTo('chat.rain~2', 'ok')).state
    expect(whyNot(state, g, replyTo('chat.rain~2', 'ok'))).toBe('You have already replied.')
    expect(whyNot(state, g, replyTo('chat.rain', 'ok'))).toBeUndefined()
    expect(holds(state, messageReplied('chat.rain', 'ok'), g)).toBe(true)
    expect(shown(state, g).unread).toBe(3)
  })

  it('load an old save, with one arrival per message by id, as arrivals', () => {
    const g = game()
    const old = apply(begin(g), g, { type: 'activity', id: 'goOut' }).state
    const saved = {
      ...old,
      plugins: { ...old.plugins, messages: { version: 1, state: { arrived: { 'msg.hey': 3 }, replied: { 'msg.hey': 'yes' }, read: { 'msg.hey': true } } } },
    }
    const loaded = loadState(JSON.parse(JSON.stringify(saved)), g)
    if (!loaded.ok) throw new Error(loaded.reason)
    expect(loaded.value.plugins.messages).toEqual({
      version: 2,
      state: { arrived: [{ key: 'msg.hey', message: 'msg.hey', turn: 3, day: 3 }], replied: { 'msg.hey': 'yes' }, read: { 'msg.hey': true } },
    })
    expect(holds(loaded.value, messageReplied('msg.hey', 'yes'), g)).toBe(true)
    expect(shown(loaded.value, g).channels[0].threads[0].messages[0]).toMatchObject({ key: 'msg.hey', replied: 'Yes!', read: true })
  })

  it('report a draw from a pool no message is in, and a weight below 0', () => {
    const loaded = loadGame(
      [
        {
          id: 'mod',
          schema: SCHEMA,
          prose: { m: 'Hi.' },
          activities: [{ id: 'chat', effects: [drawMessage('nobody')] }],
          data: { messages: { messages: [{ id: 'm', channel: 'texts', from: 'x', drawnFrom: ['chat'], weight: -1, body: [{ text: 'm' }] }] } },
        },
      ],
      { id: 'g', title: 'g', plugins: [plugin], data: channels },
    )
    expect(loaded.problems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ what: expect.stringContaining('draws from "nobody", but no message is drawn from it') }),
        { pack: 'mod', where: 'messages m', what: 'weight must be 0 or more' },
      ]),
    )
  })
})
