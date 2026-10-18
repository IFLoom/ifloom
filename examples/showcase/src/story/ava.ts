/**
 * Ava's arc: meeting her at the café, her calls and texts, the evening by the
 * river, and the friendship quest. Her words are in `ava.prose.ts`.
 */
import { SCHEMA, type Pack } from '@ifloom/engine'
import { questActive } from '@ifloom/plugin-quests'
import { day } from '@ifloom/plugin-calendar'
import { person } from '@ifloom/plugin-cast'
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
  ...(topic === 'beans' ? { replies: [{ id: 'taste', effects: [{ kind: 'stat' as const, stat: 'friendship', by: 2, of: person('ava') }] }] } : {}),
}))

export const ava: Pack = {
  id: 'story.ava',
  schema: SCHEMA,
  scenes: [
    {
      id: 'ava.hi',
      title: 'Ava',
      speaker: 'ava',
      body: [{ text: 'ava.hi' }, { variants: 'ava.smalltalk' }, { text: 'ava.hi.regular', when: { seen: 'ava.hi', gte: 3 } }],
      choices: [
        { id: 'chat', once: { per: 'turn', reason: 'She has a queue.' }, effects: [{ kind: 'stat', stat: 'friendship', by: 5, of: person('ava') }] },
        {
          id: 'compliment',
          when: { stat: 'charm', gte: 3 },
          effects: [
            { kind: 'stat', stat: 'friendship', by: 10, of: person('ava') },
            { kind: 'scene', scene: null },
          ],
        },
        // She points you at the job board by the till: the scene closes and the board opens over the room.
        { id: 'work', effects: [{ kind: 'scene', scene: null }, openJobs()] },
        { id: 'bye', effects: [{ kind: 'scene', scene: null }] },
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
          effects: [
            { kind: 'stat', stat: 'friendship', by: 3, of: person('ava') },
            { kind: 'scene', scene: null },
          ],
        },
      ],
    },
    {
      id: 'ava.river',
      title: 'By the river',
      transition: { in: 'fade', out: 'fade', ms: 600 },
      speaker: 'ava',
      body: [{ text: 'ava.river' }],
      choices: [
        {
          id: 'stay',
          effects: [
            { kind: 'stat', stat: 'friendship', by: 5, of: person('ava') },
            { kind: 'scene', scene: null },
          ],
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
            { id: 'close', hint: 'Spend time with Ava.', done: { stat: 'friendship', of: person('ava'), gte: 25 } },
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
          replies: [{ id: 'yes', effects: [{ kind: 'stat', stat: 'friendship', by: 5, of: person('ava') }] }, { id: 'later' }],
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
