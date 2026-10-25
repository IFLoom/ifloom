/**
 * Ava's arc: meeting her at the café, her calls and texts, the evening by the
 * river, and the friendship quest. Her words are in `ava.prose.ts`.
 */
import { holding, move, give, type Content } from '@ifloom/engine'
import { questActive } from '@ifloom/plugin-quests'
import { day } from '@ifloom/plugin-calendar'
import { character } from '@ifloom/plugin-cast'
import { openJobs } from '@ifloom/plugin-jobs'
import { drawMessage, messageReplied, messageSince, type MessageDef } from '@ifloom/plugin-messages'
import { prose } from './ava.prose.ts'

/**
 * Ava's small talk by text: a pool the `ava.chat` trigger draws one line from
 * each day, once you've answered her first text. A line rests for three days
 * after it comes, so the same one never comes twice within three days.
 */
const smallTalk: MessageDef[] = ['rain', 'beans', 'river', 'ducks'].map((topic) => ({
  id: `ava.chat.${topic}`,
  channel: 'texts',
  from: 'ava',
  drawnFrom: ['ava.chat'],
  when: { not: messageSince(`ava.chat.${topic}`, { lt: 3 }) },
  body: [{ text: `ava.chat.${topic}` }],
  // The beans want an answer, every time she asks.
  ...(topic === 'beans' ? { replies: [{ id: 'taste', effects: [{ stat: 'friendship', by: 2, of: character('ava') }] }] } : {}),
}))

export const ava: Content = {
  // A keepsake is one particular thing, so whoever has it has the only one. Not listed: what you hold is in `view.held`.
  kinds: [{ id: 'keepsake', label: 'Keepsake', unique: true, listed: false }],
  entities: [{ id: 'shell', of: 'keepsake', name: 'A river shell', desc: 'Smooth and grey, from the bank by Ava’s bench.' }],
  scenes: [
    {
      id: 'ava.hi',
      title: 'Ava',
      speaker: 'ava',
      body: [
        { text: 'ava.hi' },
        { variants: 'ava.smalltalk' },
        { text: 'ava.hi.regular', when: { seen: 'ava.hi', gte: 3 } },
        // Things are held: once the shell is Ava's, it sits by her till.
        { text: 'ava.hi.shell', when: { entity: 'keepsake:shell', at: character('ava') } },
      ],
      choices: [
        // Shown while you hold the shell from the river: giving it moves it to her.
        {
          id: 'shell',
          when: holding('keepsake:shell'),
          effects: [move('keepsake:shell', character('ava')), { stat: 'friendship', by: 5, of: character('ava') }],
        },
        { id: 'chat', once: { per: 'turn', reason: 'She has a queue.' }, effects: [{ stat: 'friendship', by: 5, of: character('ava') }] },
        {
          id: 'compliment',
          when: { stat: 'charm', gte: 3 },
          effects: [{ stat: 'friendship', by: 10, of: character('ava') }, { scene: null }],
        },
        // She points you at the job board by the till: the scene closes and the board opens over the room.
        { id: 'work', effects: [{ scene: null }, openJobs()] },
        { id: 'bye', effects: [{ scene: null }] },
      ],
    },
    {
      id: 'ava.call',
      title: 'Ava, on the phone',
      speaker: 'ava',
      body: [{ text: 'ava.call' }],
      choices: [
        {
          id: 'bye',
          effects: [{ stat: 'friendship', by: 3, of: character('ava') }, { scene: null }],
        },
      ],
    },
    {
      id: 'ava.river',
      title: 'By the river',
      ui: { transition: { in: 'fade', out: 'fade', ms: 600 } },
      speaker: 'ava',
      // Her line comes a moment after the ducks: a block of its own, revealed by the React UI.
      body: [{ text: 'ava.river' }, { text: 'ava.river.2', ui: { reveal: { delay: 1500, as: 'slide-up' } } }],
      choices: [
        // A thing to keep: the shell is an entity, and picking it up gives it to you.
        { id: 'shell', when: { not: { entity: 'keepsake:shell', gte: 1 } }, effects: [give('keepsake:shell')] },
        {
          id: 'stay',
          effects: [{ stat: 'friendship', by: 5, of: character('ava') }, { scene: null }],
        },
      ],
    },
  ],
  triggers: [
    // Once a day after you've answered Ava's first text, a line of her small talk from the pool.
    { id: 'ava.chat', once: 'turn', when: messageReplied('ava.text'), effects: [drawMessage('ava.chat')] },
  ],
  variants: {
    'ava.smalltalk': ['ava.smalltalk.rain', 'ava.smalltalk.beans', 'ava.smalltalk.river'],
  },
  data: {
    quests: {
      quests: [
        {
          id: 'friend',
          title: 'A friend in town',
          storyline: 'ava',
          starts: questActive('settle'),
          stages: [
            { id: 'close', hint: 'Spend time with Ava.', done: { stat: 'friendship', of: character('ava'), gte: 25 } },
            // A friendship takes days as well as visits: three since you met, however often you chat.
            {
              id: 'river',
              hint: 'Find Ava by the river some evening.',
              done: { all: [{ since: 'ava.hi', gte: 3 }, { seen: 'ava.river' }] },
            },
          ],
        },
      ],
    },
    achievements: {
      achievements: [
        // Hidden until it happens.
        { id: 'river', title: 'Dusk by the river', description: 'Spend an evening by the river with Ava.', secret: true, when: { seen: 'ava.river' } },
      ],
    },
    messages: {
      messages: [
        {
          id: 'ava.text',
          channel: 'texts',
          from: 'ava',
          when: { all: [{ seen: 'ava.hi' }, { since: 'ava.hi', gte: 1 }] },
          body: [{ text: 'ava.text' }],
          replies: [{ id: 'yes', effects: [{ stat: 'friendship', by: 5, of: character('ava') }] }, { id: 'later' }],
        },
        ...smallTalk,
      ],
    },
    feed: {
      posts: [{ id: 'ava.cake', feed: 'social', from: 'ava', when: day({ gte: 1 }), body: [{ text: 'feed.ava-cake' }], likes: 14 }],
    },
  },
  prose,
}
