import { describe, expect, it } from 'vitest'
import { apply, createRunner, holds, loadGame, replay, startingState, view, whyNot, type Game, type GameState, type Content } from '@ifloom/engine'
import { loadChecked } from '@ifloom/engine/testing'
import { cast } from '@ifloom/plugin-cast'
import { messages, type MessagesView } from '../src/index.ts'
import { calendar } from '@ifloom/plugin-calendar'

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

function game(extra: Partial<Content> = {}): Game {
  const pack: Content = {
    name: 'town',
    storylines: [{ id: 'ava', name: 'Ava' }],
    scenes: [{ id: 'ava.hi', body: [{ prose: 'ava.hi' }], choices: [{ id: 'bye', label: 'Bye', effects: [{ scene: null }] }] }],
    // Going out is all a message waits for here: no map needed.
    actions: [
      { id: 'wait', effects: [calendar.pass(1)] },
      { id: 'goOut', effects: [{ kv: 'out', to: true }] },
    ],
    prose: {
      'ava.hi': 'Hi.',
      'msg.hey': 'Hey {{playerFirst}}, was that you on the street?',
      'msg.later': 'Coffee tomorrow?',
      'msg.bill': 'The water bill. You owe 12.',
    },
    entities: [
      cast.person({
        id: 'ava',
        name: 'Ava',
        description: 'Neighbour',
        image: 'character/ava.svg',
        portrait: 'faces/ava.png',
        ui: { hue: 200 },
        talk: 'ava.hi',
        storyline: 'ava',
      }),
    ],
    data: {
      // Ava is the cast's: messages from her are signed with her name.
      messages: {
        messages: [
          {
            id: 'msg.hey',
            channel: 'texts',
            from: 'ava',
            when: { kv: 'out' },
            body: [{ prose: 'msg.hey' }],
            replies: [
              { id: 'yes', label: 'Yes!', effects: [{ kv: 'saidYes', to: true }] },
              { id: 'no', label: 'No…' },
            ],
          },
          { id: 'msg.later', channel: 'texts', from: 'ava', when: { kv: 'saidYes' }, body: [{ prose: 'msg.later' }] },
          { id: 'msg.bill', channel: 'post', from: 'Water Board', when: calendar.period('afternoon'), body: [{ prose: 'msg.bill' }] },
        ],
      },
    },
    ...extra,
  }
  return loadChecked([{ name: 'base', data: channels }, pack], { id: 'msgs', title: 'Msgs', plugins: [clock, cast(), plugin] })
}

const begin = (g: Game): GameState => clock.write({ ...startingState(g, { kv: { playerFirst: 'Sam' } }), sceneId: null }, { day: 1, period: 'morning' })
const shown = (state: GameState, g: Game) => view(state, g).plugins.messages as MessagesView

describe('messages', () => {
  it('arrive the first time their condition holds, and raise a notice tagged with the channel', () => {
    const g = game()
    expect(shown(begin(g), g).unread).toBe(0)
    const state = apply(begin(g), g, { type: 'action', id: 'goOut' }).state
    const texts = shown(state, g).channels[0]
    expect(texts.threads).toEqual([
      expect.objectContaining({
        id: 'ava',
        name: 'Ava',
        // Her picture, and her face from the cast for the thread's avatar.
        image: 'art/character/ava.svg',
        portrait: 'art/faces/ava.png',
        unread: 1,
        messages: [expect.objectContaining({ id: 'msg.hey', text: 'Hey Sam, was that you on the street?', read: false })],
      }),
    ])
    expect(view(state, g).notices.byTag).toEqual({ texts: 1 })
    expect(holds(state, g, messages.arrived('msg.hey'))).toBe(true)
  })

  it('offer replies as choices: one, once, with effects that can bring the next message', () => {
    const g = game()
    let state = apply(begin(g), g, { type: 'action', id: 'goOut' }).state
    expect(shown(state, g).channels[0].threads[0].messages[0].replies.map((reply) => reply.label)).toEqual(['Yes!', 'No…'])
    state = apply(state, g, messages.reply('msg.hey', 'yes')).state
    expect(whyNot(state, g, messages.reply('msg.hey', 'no'))).toBe('You have already replied.')
    expect(holds(state, g, messages.replied('msg.hey', 'yes'))).toBe(true)
    const thread = shown(state, g).channels[0].threads[0]
    expect(thread.messages.map((message) => [message.id, message.replied])).toEqual([
      ['msg.hey', 'Yes!'],
      ['msg.later', null],
    ])
    expect(thread.unread).toBe(1)
  })

  it('count whole days since a reply was sent, from the day it was sent, not the day the message came', () => {
    const g = game()
    let state = apply(begin(g), g, { type: 'action', id: 'goOut' }).state
    expect(holds(state, g, messages.replied('msg.hey', undefined, { gte: 0 }))).toBe(false)
    state = clock.write(state, { day: 3, period: 'morning' })
    state = apply(state, g, messages.reply('msg.hey', 'yes')).state
    expect(holds(state, g, messages.replied('msg.hey', 'yes', { lt: 1 }))).toBe(true)
    expect(holds(state, g, messages.replied('msg.hey', 'no', { lt: 1 }))).toBe(false)
    state = clock.write(state, { day: 5, period: 'morning' })
    expect(holds(state, g, messages.replied('msg.hey', undefined, { gte: 2 }))).toBe(true)
    expect(holds(state, g, messages.replied('msg.hey', undefined, { gte: 3 }))).toBe(false)
  })

  it('run a message’s effects in the command it arrives in, and tell a read one by messageRead', () => {
    const g = game({
      data: {
        messages: {
          messages: [{ id: 'msg.hey', channel: 'texts', from: 'ava', when: { kv: 'out' }, body: [{ prose: 'msg.hey' }], effects: [{ kv: 'buzzed', by: 1 }] }],
        },
      },
    })
    let state = apply(begin(g), g, { type: 'action', id: 'goOut' }).state
    expect(holds(state, g, messages.arrived('msg.hey'))).toBe(true)
    expect(state.kv.buzzed).toBe(1)
    expect(holds(state, g, messages.messageRead('msg.hey'))).toBe(false)
    state = apply(state, g, messages.read('ava')).state
    expect(holds(state, g, messages.messageRead('msg.hey'))).toBe(true)
    expect(state.kv.buzzed).toBe(1)
  })

  it('refuse a reply that is not on offer or to a message that has not come', () => {
    const g = game()
    expect(whyNot(begin(g), g, messages.reply('msg.hey', 'yes'))).toBe('There is no such message.')
    const state = apply(begin(g), g, { type: 'action', id: 'goOut' }).state
    expect(whyNot(state, g, messages.reply('msg.hey', 'maybe'))).toBe('That is not a reply on offer.')
  })

  it('keep channels apart, count unread for badges, and mark threads read', () => {
    const g = game()
    let state = apply(begin(g), g, { type: 'action', id: 'goOut' }).state
    state = apply(state, g, { type: 'action', id: 'wait' }).state
    expect(shown(state, g).channels.map((channel) => [channel.id, channel.unread])).toEqual([
      ['texts', 1],
      ['post', 1],
    ])
    expect(shown(state, g).channels[1].threads[0].name).toBe('Water Board')
    // Ready buttons: a thread's Mark read, and a channel's Mark all read.
    const thread = shown(state, g).channels[0].threads[0]
    expect(thread.read).toMatchObject({ label: 'Mark read', command: { type: 'custom', name: 'messages/read', with: { id: 'ava' } } })
    state = apply(state, g, thread.read!.command).state
    expect(shown(state, g).unread).toBe(1)
    expect(shown(state, g).channels[0]).toMatchObject({ unread: 0, read: null })
    const post = shown(state, g).channels[1]
    expect(post.read).toMatchObject({ label: 'Mark all read', command: { with: { channel: 'post' } } })
    state = apply(state, g, post.read!.command).state
    expect(shown(state, g).unread).toBe(0)
    expect(shown(state, g).channels[1].threads[0].read).toBeNull()
  })

  it('report messages with no channel, no prose, or a bad condition', () => {
    const loaded = loadGame(
      [
        { name: 'base', data: channels },
        {
          name: 'mod',
          data: {
            messages: {
              messages: [
                { id: 'm', channel: 'fax', from: 'x', when: { storyline: 'ghost' }, body: [{ prose: 'm.none' }], replies: [{ id: 'r' }, { id: 'r' }] },
              ],
            },
          },
        },
      ],
      { id: 'g', title: 'g', plugins: [plugin] },
    )
    expect(loaded.problems).toEqual(
      expect.arrayContaining([
        { pack: 'mod', where: 'messages m', what: 'unknown channel "fax"' },
        { pack: 'mod', where: 'messages m', what: 'unknown storyline "ghost"' },
        { pack: 'mod', where: 'messages m', what: 'no prose for "m.none"' },
        { pack: 'mod', where: 'messages m', what: 'two replies are called "r"' },
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
      entities: [cast.person({ id: 'ava', name: 'Ava', description: 'Neighbour', ui: { hue: 200 }, talk: 'ava.hi', storyline: 'ava' })],
      data: {
        messages: {
          messages: [
            {
              id: 'msg.ducks',
              channel: 'texts',
              from: 'ava',
              when: { kv: 'out' },
              body: [{ prose: 'msg.ducks' }, { media: { pool: 'pond', tags: ['morning'] } }],
            },
          ],
        },
      },
    })
    const state = apply(begin(g), g, { type: 'action', id: 'goOut' }).state
    const message = shown(state, g).channels[0].threads[0].messages[0]
    expect(message.beats).toEqual([
      { type: 'text', text: 'Look at the ducks!' },
      { type: 'video', src: 'art/ducks.mp4', alt: 'A duck on the pond', size: 'inline', autoplay: true, loop: true, muted: true, controls: false },
      { type: 'image', src: 'art/pond/morning.jpg', size: 'inline' },
    ])
  })
})

describe('pools', () => {
  /** Ava's small talk: two lines drawn from `chat`, neither again within two days; the rain one has a reply. */
  function chatty(): Game {
    const rested = (id: string) => ({ not: messages.since(id, { lt: 2 }) })
    return game({
      actions: [
        { id: 'chat', effects: [messages.draw('chat')] },
        { id: 'wait', effects: [calendar.pass(1)] },
      ],
      prose: {
        'ava.hi': 'Hi.',
        'ava.hi#bye': 'Bye',
        'chat.rain': 'Rain later.',
        'chat.beans': 'New beans.',
      },
      entities: [cast.person({ id: 'ava', name: 'Ava', description: 'Neighbour', ui: { hue: 200 }, talk: 'ava.hi', storyline: 'ava' })],
      data: {
        messages: {
          messages: [
            {
              id: 'chat.rain',
              channel: 'texts',
              from: 'ava',
              drawnFrom: ['chat'],
              when: rested('chat.rain'),
              body: [{ prose: 'chat.rain' }],
              replies: [{ id: 'ok', label: 'Noted' }],
            },
            { id: 'chat.beans', channel: 'texts', from: 'ava', drawnFrom: ['chat'], weight: 2, when: rested('chat.beans'), body: [{ prose: 'chat.beans' }] },
          ],
        },
      },
    })
  }
  const chat = { type: 'action', id: 'chat' } as const
  const keys = (state: GameState, g: Game) => shown(state, g).channels[0].threads.flatMap((thread) => thread.messages.map((message) => message.key))

  it('wait to be drawn, then arrive as a new arrival with a notice, drawn the same way on replay', () => {
    const g = chatty()
    let state = apply(begin(g), g, { type: 'action', id: 'wait' }).state
    expect(keys(state, g)).toEqual([])
    const runner = createRunner(g, begin(g))
    expect(runner.apply(chat).ok).toBe(true)
    state = runner.state
    const [first] = keys(state, g)
    expect(['chat.rain', 'chat.beans']).toContain(first)
    expect(view(state, g).notices.byTag).toEqual({ texts: 1 })
    expect(holds(state, g, messages.arrived(first))).toBe(true)
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
    expect(holds(state, g, messages.since('chat.rain', { gte: 2 }))).toBe(true)
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
    state = apply(state, g, messages.reply('chat.rain~2', 'ok')).state
    expect(whyNot(state, g, messages.reply('chat.rain~2', 'ok'))).toBe('You have already replied.')
    expect(whyNot(state, g, messages.reply('chat.rain', 'ok'))).toBeUndefined()
    expect(holds(state, g, messages.replied('chat.rain', 'ok'))).toBe(true)
    expect(shown(state, g).unread).toBe(3)
  })

  it('report a draw from a pool no message is in, and a weight below 0', () => {
    const loaded = loadGame(
      [
        { name: 'base', data: channels },
        {
          name: 'mod',
          prose: { m: 'Hi.' },
          actions: [{ id: 'chat', effects: [messages.draw('nobody')] }],
          data: { messages: { messages: [{ id: 'm', channel: 'texts', from: 'x', drawnFrom: ['chat'], weight: -1, body: [{ prose: 'm' }] }] } },
        },
      ],
      { id: 'g', title: 'g', plugins: [plugin] },
    )
    expect(loaded.problems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ what: expect.stringContaining('draws from "nobody", but no message is drawn from it') }),
        { pack: 'mod', where: 'messages m', what: 'weight must be 0 or more' },
      ]),
    )
  })
})

describe('a burst', () => {
  const tick = (ms: number) => ({ type: 'tick' as const, ms })
  const burst = (typing?: boolean) =>
    game({
      prose: { 'ava.hi': 'Hi.', 'b.1': 'Are you up?', 'b.2': 'The boiler is making that noise again.', 'b.3': 'Never mind, it stopped.' },
      data: {
        messages: {
          messages: [
            { id: 'b.1', channel: 'texts', from: 'ava', when: { kv: 'out' }, body: [{ prose: 'b.1' }] },
            {
              id: 'b.2',
              channel: 'texts',
              from: 'ava',
              when: messages.arrived('b.1'),
              after: { ms: 1500 },
              ...(typing === undefined ? {} : { typing }),
              body: [{ prose: 'b.2' }],
            },
            { id: 'b.3', channel: 'texts', from: 'ava', when: messages.arrived('b.1'), after: { ms: 2000 }, body: [{ prose: 'b.3' }] },
          ],
        },
      },
    })
  const ids = (state: GameState, g: Game) => shown(state, g).channels[0].threads.flatMap((thread) => thread.messages.map((message) => message.id))

  it('arrives one message at a time over ticks, in order, with typing while one waits', () => {
    const g = burst()
    let state = apply(begin(g), g, { type: 'action', id: 'goOut' }).state
    expect(ids(state, g)).toEqual(['b.1'])
    expect(shown(state, g).channels[0].threads[0].typing).toBe(true)
    expect(shown(state, g).waiting).toBe(true)
    expect(view(state, g).timers).toEqual([expect.objectContaining({ id: 'messages.due', left: 1500 })])
    state = apply(state, g, tick(1000)).state
    expect(ids(state, g)).toEqual(['b.1'])
    state = apply(state, g, tick(500)).state
    expect(ids(state, g)).toEqual(['b.1', 'b.2'])
    // The next one starts waiting once this one has come.
    expect(view(state, g).timers).toEqual([expect.objectContaining({ id: 'messages.due', left: 2000 })])
    state = apply(state, g, tick(2000)).state
    expect(ids(state, g)).toEqual(['b.1', 'b.2', 'b.3'])
    expect(shown(state, g).channels[0].threads[0].typing).toBe(false)
    expect(shown(state, g).waiting).toBe(false)
    expect(view(state, g).timers).toEqual([])
  })

  it('shows no typing for a message with typing false', () => {
    const g = burst(false)
    const state = apply(begin(g), g, { type: 'action', id: 'goOut' }).state
    expect(shown(state, g).channels[0].threads[0].typing).toBe(false)
    expect(shown(state, g).waiting).toBe(true)
  })

  it('replays the same', () => {
    const g = burst()
    const runner = createRunner(g, begin(g))
    for (const command of [{ type: 'action' as const, id: 'goOut' }, tick(700), tick(900), tick(5000)]) expect(runner.apply(command).ok).toBe(true)
    expect(ids(runner.state, g)).toEqual(['b.1', 'b.2', 'b.3'])
    expect(replay(g, runner.log())).toEqual({ ok: true, value: runner.state })
  })

  it('raises one notice for the thread, with the newest first line, until it is seen', () => {
    const g = burst()
    let state = apply(begin(g), g, { type: 'action', id: 'goOut' }).state
    expect(state.notices.filter((notice) => !notice.seen)).toEqual([expect.objectContaining({ id: 'messages.b.1', title: 'Ava', text: 'Are you up?' })])
    state = apply(state, g, tick(1500)).state
    expect(state.notices.filter((notice) => !notice.seen)).toEqual([
      expect.objectContaining({ id: 'messages.b.2', text: 'The boiler is making that noise again.', tag: 'texts' }),
    ])
    state = apply(state, g, { type: 'dismiss' }).state
    state = apply(state, g, tick(2000)).state
    expect(state.notices.map((notice) => [notice.id, notice.seen])).toEqual([
      ['messages.b.2', true],
      ['messages.b.3', false],
    ])
  })

  it('reports an after with no length', () => {
    const loaded = loadGame(
      [
        { name: 'base', data: channels },
        {
          name: 'mod',
          prose: { m: 'Hi.' },
          data: { messages: { messages: [{ id: 'm', channel: 'texts', from: 'x', after: { ms: 0 }, body: [{ prose: 'm' }] }] } },
        },
      ],
      { id: 'g', title: 'g', plugins: [plugin] },
    )
    expect(loaded.problems).toEqual([{ pack: 'mod', where: 'messages m', what: 'after needs ms above 0' }])
  })
})
