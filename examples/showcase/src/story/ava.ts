/**
 * Ava's arc: meeting her at the café, her calls and texts, the evening by the
 * river, and the friendship quest. Her words are written where they are
 * read; the lines drawn at random, her small talk, are by key in `ava.prose.ts`.
 */
import { choice, decide, give, holding, jump, move, point, say, text, type Content } from '@ifloom/engine'
import { quests } from '@ifloom/plugin-quests'
import { calendar } from '@ifloom/plugin-calendar'
import { cast } from '@ifloom/plugin-cast'
import { jobs } from '@ifloom/plugin-jobs'
import { messages, type MessageDef } from '@ifloom/plugin-messages'
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
  when: { not: messages.since(`ava.chat.${topic}`, { lt: 3 }) },
  body: [{ prose: `ava.chat.${topic}` }],
  // The beans want an answer, every time she asks.
  ...(topic === 'beans'
    ? { replies: [{ id: 'taste', label: 'I’ll come and taste them', effects: [{ stat: 'friendship', by: 2, of: cast.character('ava') }] }] }
    : {}),
}))

export const ava: Content = {
  // A keepsake is one particular thing, so whoever has it has the only one. Not listed: what you hold is in `view.held`.
  kinds: [{ id: 'keepsake', label: 'Keepsake', unique: true, listed: false }],
  entities: [{ id: 'shell', of: 'keepsake', name: 'A river shell', description: 'Smooth and grey, from the bank by Ava’s bench.' }],
  scenes: [
    {
      id: 'ava.hi',
      title: 'Ava',
      speaker: 'ava',
      body: [
        // A paragraph in quotes is a spoken line, so narration goes in a paragraph of its own.
        // `[[ui:image|…]]` is the React UI's: her name opens her photo in the viewer.
        text(`
          [[ui:image|Ava|photo/ava.svg|Ava at the café counter]] looks up from the till and grins.

          "You’re the one above the launderette. Welcome to the worst-kept secret in town: me."
        `),
        // Drawn from the variants by key, a different line each visit.
        { variants: 'ava.smalltalk' },
        { text: 'She has your cup out before you ask.', when: { seen: 'ava.hi', gte: 3 } },
        // Things are held: once the shell is Ava's, it sits by her till.
        { text: 'The river shell sits by the till, holding down the receipts.', when: { entity: 'keepsake:shell', at: cast.character('ava') } },
      ],
      choices: [
        // Shown while you hold the shell from the river: giving it moves it to her.
        {
          id: 'shell',
          label: 'Give her the shell from the river',
          when: holding('keepsake:shell'),
          effects: [move('keepsake:shell', cast.character('ava')), { stat: 'friendship', by: 5, of: cast.character('ava') }],
        },
        {
          id: 'chat',
          label: 'Chat for a minute',
          once: { per: 'turn', reason: 'She has a queue.' },
          effects: [{ stat: 'friendship', by: 5, of: cast.character('ava') }],
        },
        {
          id: 'compliment',
          label: 'Tell her the café is the best thing in town',
          when: { stat: 'charm', gte: 3 },
          effects: [{ stat: 'friendship', by: 10, of: cast.character('ava') }, { scene: null }],
        },
        // She points you at the job board by the till: the scene closes and the board opens over the room.
        { id: 'work', label: 'Ask about weekend work', effects: [{ scene: null }, jobs.open()] },
        { id: 'bye', label: 'Leave her to it', effects: [{ scene: null }] },
      ],
    },
    {
      id: 'ava.call',
      title: 'Ava, on the phone',
      speaker: 'ava',
      body: [{ text: '"Oh, hello! I’m on the bench by the river. Come and find me some evening."' }],
      choices: [
        {
          id: 'bye',
          label: 'Say goodnight',
          effects: [{ stat: 'friendship', by: 3, of: cast.character('ava') }, { scene: null }],
        },
      ],
    },
    // A flowing scene: the evening reads on as you choose, and a question comes back round until you settle.
    {
      id: 'ava.river',
      title: 'By the river',
      ui: { transition: { in: 'fade', out: 'fade', ms: 600 } },
      speaker: 'ava',
      body: [
        { text: 'Ava is on the bench with her shoes off, feeding the ducks the crusts of the day.' },
        // Her line comes a moment after the ducks: a block of its own, revealed by the React UI.
        { text: '"I told you it was the only quiet in town." She shuffles up to make room.', ui: { reveal: { delay: 1500, as: 'slide-up' } } },
        // Each pick but the last jumps back here, so you can do both before you sit.
        point('bench'),
        decide('evening', [
          // A thing to keep: the shell is an entity, and picking it up gives it to you.
          choice('shell', 'Pocket a smooth shell from the bank', {
            when: { not: { entity: 'keepsake:shell', gte: 1 } },
            effects: [give('keepsake:shell'), jump('bench')],
            then: [text(`It's cold, and fits your palm exactly.`)],
          }),
          choice('ducks', 'Ask about the ducks', {
            blocked: [{ when: { chose: 'ava.river#ducks' }, reason: 'You asked.', hide: true }],
            effects: [jump('bench')],
            then: [say('ava', 'They know my name. I never asked theirs.')],
          }),
          choice('stay', 'Sit with her until the light goes', {
            effects: [{ stat: 'friendship', by: 5, of: cast.character('ava') }],
            then: [text(`The water goes orange, then grey. Neither of you says much.`)],
          }),
        ]),
        text(`You walk back along the river together, as far as the bridge.`),
      ],
      choices: [{ id: 'home', label: 'Say goodnight', effects: [{ scene: null }] }],
    },
  ],
  triggers: [
    // Once a day after you've answered Ava's first text, a line of her small talk from the pool.
    { id: 'ava.chat', once: { per: 'turn' }, when: messages.replied('ava.text'), effects: [messages.draw('ava.chat')] },
  ],
  variants: {
    'ava.smalltalk': ['ava.smalltalk.rain', 'ava.smalltalk.beans', 'ava.smalltalk.river'],
  },
  data: {
    quests: {
      quests: [
        {
          id: 'friend',
          name: 'A friend in town',
          storyline: 'ava',
          starts: quests.active('settle'),
          stages: [
            { id: 'close', hint: 'Spend time with Ava.', done: { stat: 'friendship', of: cast.character('ava'), gte: 25 } },
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
        { id: 'river', name: 'Dusk by the river', description: 'Spend an evening by the river with Ava.', secret: true, when: { seen: 'ava.river' } },
      ],
    },
    messages: {
      messages: [
        {
          id: 'ava.text',
          channel: 'texts',
          from: 'ava',
          when: { all: [{ seen: 'ava.hi' }, { since: 'ava.hi', gte: 1 }] },
          body: [{ text: 'Good to meet you yesterday! Coffee’s on me next time 🙂' }],
          replies: [
            { id: 'yes', label: 'Deal!', effects: [{ stat: 'friendship', by: 5, of: cast.character('ava') }] },
            { id: 'later', label: 'Maybe later in the week' },
          ],
        },
        ...smallTalk,
      ],
    },
    feed: {
      posts: [
        {
          id: 'ava.cake',
          feed: 'social',
          from: 'ava',
          when: calendar.day({ gte: 1 }),
          body: [{ text: 'Lemon drizzle today. It will not last until noon.' }],
          likes: 14,
        },
      ],
    },
  },
  prose,
}
