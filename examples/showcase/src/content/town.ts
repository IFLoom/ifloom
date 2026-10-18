/**
 * Small Town: the showcase's content, as one pack.
 *
 * Everything here is data — conditions, effects, prose keys — so a mod could
 * ship any of it. The few things that are computed live in `custom.ts`.
 */
import { SCHEMA, type Condition, type MinigameDef, type MinigameStateDef, type Pack } from '@ifloom/engine'
import { questActive } from '@ifloom/plugin-quests'
import { applyStatus, statusActive } from '@ifloom/plugin-statuses'
import { generate } from '@ifloom/plugin-generators'
import { postTo, react } from '@ifloom/plugin-feed'
import { wearing } from '@ifloom/plugin-wardrobe'
import { day, pass, period, sleep, weekday } from '@ifloom/plugin-calendar'
import { at, onlyAt, type LocationDef } from '@ifloom/plugin-places'
import { here, person, talk, type CharacterDef } from '@ifloom/plugin-cast'
import { openApp } from '@ifloom/plugin-devices'
import { hasUnlock } from '@ifloom/plugin-unlocks'
import { openShop } from '@ifloom/plugin-shop'
import { openJobs } from '@ifloom/plugin-jobs'
import { drawMessage, messageReplied, messageSince, type MessageDef } from '@ifloom/plugin-messages'
import { prose } from './prose.ts'

const place = (location: Omit<LocationDef, 'art' | 'tag' | 'body'> & { tag?: string }): LocationDef => ({
  tag: 'Small Town',
  art: `place/${location.id}`,
  body: [{ text: `place.${location.id}` }],
  ...location,
})

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

/** Ava's text has come and hasn't been read. */
const textWaiting: Condition = {
  all: [{ custom: 'messages/arrived', with: { message: 'ava.text' } }, { not: { custom: 'messages/read', with: { message: 'ava.text' } } }],
}

const locations: LocationDef[] = [
  {
    ...place({ id: 'flat', name: 'Your flat', tag: 'Home', exits: ['high-street'] }),
    // Once Ava's text has come and until it's read, the room's prose holds a link that opens the phone.
    body: [{ text: 'place.flat' }, { text: 'place.flat.text', when: textWaiting }],
    actions: [
      { id: 'bed', label: 'Go to bed', command: sleep() },
      // The wardrobe opens in a panel by its name; the layout also shows what you're wearing only at home.
      { id: 'wardrobe', label: 'Open the wardrobe', command: { type: 'activity', id: 'openWardrobe' } },
      // Drawn inline by `[[act:read-text|…]]` in the line above, so it isn't a button as well.
      { id: 'read-text', label: 'Read your messages', when: textWaiting, command: openApp('texts') },
    ],
  },
  {
    ...place({ id: 'high-street', name: 'High Street', tags: ['outdoors'], exits: ['flat', 'cafe', 'park', 'office'] }),
    // The street, then a line about the weather, drawn afresh each day.
    body: [{ text: 'place.high-street' }, { variants: 'street.weather' }, { text: 'place.high-street.hint', when: { setting: 'hints' } }],
    actions: [{ id: 'scarf', label: 'Buy a scarf at the market', command: { type: 'activity', id: 'buyScarf' } }],
  },
  {
    ...place({ id: 'cafe', name: 'The Corner Café', tag: 'Café', exits: ['high-street'] }),
    // Open in the day; the door says when it opens again.
    blocked: [{ when: { not: period('morning', 'afternoon') }, reason: 'Closed. Opens tomorrow morning.' }],
    actions: [
      { id: 'coffee', label: 'Buy a coffee', command: { type: 'activity', id: 'coffee' } },
      // The counter, the shop plugin's vendor, opens in a panel: nothing about a shop is drawn by itself.
      { id: 'counter', label: 'Go to the counter', command: { type: 'activity', id: 'counter' } },
      // A sandwich as a plain activity: a cost, a place and an item, with no plugin. Always 4 coins, never sold out.
      { id: 'buy-sandwich', label: 'Buy a sandwich', command: { type: 'activity', id: 'buySandwich' } },
      // Something small happens while you sit: one of the café's storylets, drawn at random.
      { id: 'sit', label: 'Sit a while', command: { type: 'activity', id: 'sit' } },
    ],
    // A picture of the counter while Ava is on shift, with a hotspot on her that talks to her.
    stage: {
      aspect: '16/10',
      layers: [{ id: 'counter', src: 'photo/ava.svg', when: here('ava') }],
      hotspots: [{ id: 'ava', rect: [36, 22, 28, 44], label: 'Talk to Ava', command: talk('ava'), layer: 'counter' }],
    },
    body: [
      { text: 'place.cafe' },
      { text: 'place.cafe.ava', when: here('ava') },
      { text: 'place.cafe.raincoat', when: wearing('raincoat') },
      { text: 'place.cafe.caffeinated', when: statusActive('caffeinated') },
    ],
  },
  {
    ...place({ id: 'park', name: 'Riverside Park', tags: ['outdoors'], exits: ['high-street'] }),
    // The river, then a line while the day's visitors are about.
    body: [{ text: 'place.park' }, { text: 'place.park.visitors', when: { count: 'visitor', gte: 1 } }],
    actions: [
      { id: 'jog', label: 'Go for a jog', command: { type: 'activity', id: 'jog' } },
      { id: 'arrows', label: 'Play quick feet with the kids', command: { type: 'activity', id: 'arrows' } },
    ],
  },
  {
    ...place({ id: 'office', name: 'The Office', tag: 'Work', exits: ['high-street'] }),
    // Weekdays only, in the day.
    blocked: [
      { when: weekday(5, 6), reason: 'Shut at weekends.' },
      { when: { all: [weekday(4), { not: period('morning', 'afternoon') }] }, reason: 'Closed. Back on Monday.' },
      { when: { not: period('morning', 'afternoon') }, reason: 'Closed. Opens tomorrow morning.' },
    ],
    actions: [{ id: 'work', label: 'Do a shift', command: { type: 'activity', id: 'work' } }],
  },
]

/** The four arrows of quick feet, in the order the minigame's `arrow` variable numbers them from 1. */
const ARROWS = ['up', 'down', 'left', 'right'] as const

/** One arrow on screen: 1.5 seconds to press it. The right one scores; a wrong one or the time running out doesn't. */
const showArrow = (arrow: (typeof ARROWS)[number]): MinigameStateDef => ({
  label: `arrows.${arrow}`,
  after: { ms: 1500, go: 'round' },
  on: ARROWS.map((input) => ({ input, go: 'round', ...(input === arrow ? { effects: [{ kind: 'minigameVar' as const, key: 'score', by: 1 }] } : {}) })),
})

/**
 * Quick feet, at the park: five rounds, each a random arrow to press in time.
 * Three or more right wins a few coins from the kids' pot.
 */
const quickFeet: MinigameDef = {
  id: 'arrows',
  label: 'Quick feet',
  start: 'round',
  vars: { round: 0, arrow: 0, score: 0 },
  keys: { up: ['ArrowUp', 'w'], down: ['ArrowDown', 's'], left: ['ArrowLeft', 'a'], right: ['ArrowRight', 'd'] },
  states: {
    // A new round draws an arrow, or after the fifth, the score is counted.
    round: {
      always: [
        { when: { minigameVar: 'round', gte: 5 }, go: 'tally' },
        {
          go: 'pick',
          effects: [
            { kind: 'minigameVar', key: 'round', by: 1 },
            { kind: 'minigameVar', key: 'arrow', random: [1, 4] },
          ],
        },
      ],
    },
    pick: { always: ARROWS.map((arrow, index) => ({ when: { minigameVar: 'arrow', gte: index + 1, lte: index + 1 }, go: arrow })) },
    ...Object.fromEntries(ARROWS.map((arrow) => [arrow, showArrow(arrow)])),
    tally: { always: [{ when: { minigameVar: 'score', gte: 3 }, go: 'won' }, { go: 'lost' }] },
    won: {
      final: {
        effects: [
          { kind: 'stat', stat: 'coins', by: 5 },
          { kind: 'scene', scene: 'park.arrows-won' },
        ],
      },
    },
    lost: { final: { effects: [{ kind: 'scene', scene: 'park.arrows-lost' }] } },
  },
}

const they = { they: 'she', them: 'her', their: 'her', theirs: 'hers' }

const characters: CharacterDef[] = [
  {
    id: 'ava',
    name: 'Ava',
    fullName: 'Ava Marsh',
    role: 'Runs the café',
    pronouns: they,
    hue: 20,
    portrait: 'art/character/ava.svg',
    home: 'park',
    // At the counter through the working day; by the river in the evening.
    schedule: [{ location: 'cafe', when: { all: [weekday(0, 1, 2, 3, 4, 5), period('morning', 'afternoon')] } }],
    // By the river, once she is a friend, a different conversation from Ava at the till.
    talk: [{ scene: 'ava.river', when: { all: [at('park'), { stat: 'friendship', of: '$', gte: 25 }] } }, { scene: 'ava.hi' }],
    storyline: 'ava',
    call: { scene: 'ava.call', when: period('evening', 'night'), busy: 'She’s busy at the counter. Try her this evening.' },
  },
  {
    id: 'sam',
    name: 'Sam',
    role: 'Neighbour',
    pronouns: { they: 'they', them: 'them', their: 'their', theirs: 'theirs' },
    hue: 200,
    portrait: 'art/character/sam.svg',
    home: 'park',
    schedule: [{ location: 'high-street', when: period('morning') }],
    talk: 'sam.hi',
    storyline: 'sam',
  },
]

export const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  // What the player can change on the settings page. `hints` is part of the
  // game (the high street reads it); `textSize` only changes how the page looks,
  // and main.tsx puts it on the page root for styles.css.
  settings: [
    { id: 'hints', label: 'Show hints', kind: 'toggle', default: true },
    {
      id: 'textSize',
      label: 'Text size',
      kind: 'choice',
      affects: 'ui',
      options: [
        { value: 'normal', label: 'Normal' },
        { value: 'large', label: 'Large' },
      ],
      default: 'normal',
    },
  ],
  storylines: [
    { id: 'ava', name: 'Ava' },
    { id: 'sam', name: 'Sam' },
  ],
  stats: [
    // Each person's: the cast's characters are entities of the kind `character`.
    { id: 'friendship', label: 'Friendship', of: 'character' },
    { id: 'coins', label: 'Coins', start: 12, max: 999, spendable: true, format: '{n} coins', lacking: 'You need {n} coins.' },
    { id: 'energy', label: 'Energy', start: 80, spendable: true, format: '{n}%', lacking: 'Too tired.', round: 'round' },
    { id: 'charm', label: 'Charm', start: 1, max: 20 },
  ],
  items: [
    { id: 'raincoat', name: 'raincoat', desc: 'Yellow, a size too big.', start: 1 },
    { id: 'scarf', name: 'scarf', desc: 'Knitted by someone who loved you.' },
    {
      id: 'sandwich',
      name: 'sandwich',
      desc: 'Cheese and pickle, wrapped in paper.',
      use: { label: 'Eat the sandwich', effects: [{ kind: 'stat', stat: 'energy', by: 25 }] },
    },
    {
      id: 'flapjack',
      name: 'flapjack',
      desc: 'Oats, syrup and a lot of butter.',
      use: { label: 'Eat the flapjack', effects: [{ kind: 'stat', stat: 'energy', by: 10 }] },
    },
    // Reading it opens the job board with only the paper's ads on it: an item opening a panel.
    {
      id: 'paper',
      name: 'newspaper',
      desc: 'Today’s Small Town Gazette. The back page is job ads.',
      start: 1,
      use: { label: 'Read the job ads', effects: [openJobs(['dogs'])] },
    },
  ],
  activities: [
    { id: 'wait', effects: [pass(1)] },
    {
      id: 'coffee',
      cost: { stats: { coins: 3 } },
      blocked: [onlyAt(['cafe']), { when: { kv: 'hadCoffee' }, reason: 'One is enough for today.' }],
      effects: [
        { kind: 'stat', stat: 'energy', by: 15 },
        { kind: 'kv', key: 'hadCoffee', to: true },
        // And a lift that lasts till tomorrow is out: 10 more energy, never written.
        applyStatus('caffeinated'),
      ],
    },
    { id: 'buySandwich', cost: { stats: { coins: 4 } }, blocked: [onlyAt(['cafe'])], effects: [{ kind: 'item', item: 'sandwich', by: 1 }] },
    { id: 'counter', blocked: [onlyAt(['cafe'])], effects: [openShop('counter')] },
    { id: 'openWardrobe', blocked: [onlyAt(['flat'])], effects: [{ kind: 'panel', panel: 'wardrobe' }] },
    { id: 'sit', blocked: [onlyAt(['cafe'])], effects: [{ kind: 'scene', from: 'cafe', otherwise: 'cafe.quiet' }] },
    { id: 'work', cost: { stats: { energy: 30 } }, blocked: [onlyAt(['office'])], effects: [pass(2), { kind: 'stat', stat: 'coins', by: 20 }] },
    { id: 'jog', cost: { stats: { energy: 15 } }, blocked: [onlyAt(['park'])], effects: [pass(1), { kind: 'stat', stat: 'charm', by: 1 }] },
    { id: 'arrows', blocked: [onlyAt(['park'])], effects: [{ kind: 'minigame', minigame: 'arrows' }] },
    {
      id: 'buyScarf',
      cost: { stats: { coins: 8 } },
      blocked: [onlyAt(['high-street']), { when: { item: 'scarf' }, reason: 'You have one.' }],
      effects: [{ kind: 'item', item: 'scarf', by: 1 }],
    },
    // The camera: one photo of each person, if they're here to take.
    ...(['ava', 'sam'] as const).map((who) => ({
      id: `photo-${who}`,
      blocked: [{ when: { not: here(who) }, reason: 'They aren’t here.' }],
      effects: [
        {
          kind: 'collect' as const,
          collection: 'gallery',
          entry: { id: `photo.${who}`, title: who === 'ava' ? 'Ava at work' : 'Sam and the dog', image: `art/photo/${who}.svg` },
        },
      ],
    })),
    {
      id: 'post',
      cost: { stats: { energy: 5 } },
      blocked: [
        { when: { not: { collection: 'gallery' } }, reason: 'Take a photo first.' },
        { when: { kv: 'postedToday' }, reason: 'You have posted today.' },
      ],
      effects: [{ custom: 'postLatest' }, { kind: 'kv', key: 'postedToday', to: true }],
    },
  ],
  scenes: [
    {
      id: 'intro',
      title: 'Moving day',
      // Fades in from the title page; its second paragraph comes after a pause.
      transition: { in: 'fade', out: 'fade', ms: 500 },
      body: [{ text: 'intro' }, { text: 'intro.tonight', reveal: { delay: 1200 } }],
      // The flat slides up into view once the boxes are in.
      choices: [
        {
          id: 'unpack',
          effects: [
            { kind: 'scene', scene: null },
            { kind: 'phase', to: 'open' },
            { kind: 'transition', to: 'slide-up', ms: 400 },
          ],
        },
      ],
    },
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
    // The café's storylets: scenes drawn from 'cafe' by "Sit a while", by weight, while their when holds.
    {
      id: 'cafe.window',
      title: 'The window seat',
      drawnFrom: ['cafe'],
      weight: 3,
      when: { not: { seen: 'cafe.window', gte: 2 } },
      body: [{ text: 'cafe.window' }],
      choices: [{ id: 'leave', effects: [{ kind: 'scene', scene: null }] }],
    },
    {
      id: 'cafe.crossword',
      title: 'Seven down',
      drawnFrom: ['cafe'],
      when: { not: { seen: 'cafe.crossword' } },
      body: [{ text: 'cafe.crossword' }],
      choices: [
        {
          id: 'leave',
          effects: [
            { kind: 'stat', stat: 'charm', by: 1 },
            { kind: 'scene', scene: null },
          ],
        },
      ],
    },
    {
      id: 'cafe.break',
      title: 'Ava’s break',
      speaker: 'ava',
      drawnFrom: ['cafe'],
      weight: 2,
      when: here('ava'),
      body: [{ text: 'cafe.break' }],
      choices: [
        {
          id: 'leave',
          effects: [
            { kind: 'stat', stat: 'friendship', by: 2, of: person('ava') },
            { kind: 'scene', scene: null },
          ],
        },
      ],
    },
    // When none of them can happen.
    {
      id: 'cafe.quiet',
      title: 'A quiet table',
      body: [{ text: 'cafe.quiet' }],
      choices: [{ id: 'leave', effects: [{ kind: 'scene', scene: null }] }],
    },
    // How quick feet ends.
    {
      id: 'park.arrows-won',
      title: 'Quick feet',
      body: [{ text: 'park.arrows-won' }],
      choices: [{ id: 'leave', effects: [{ kind: 'scene', scene: null }] }],
    },
    {
      id: 'park.arrows-lost',
      title: 'Quick feet',
      body: [{ text: 'park.arrows-lost' }],
      choices: [{ id: 'leave', effects: [{ kind: 'scene', scene: null }] }],
    },
    {
      id: 'sam.hi',
      title: 'Sam',
      speaker: 'sam',
      body: [{ text: 'sam.hi' }],
      choices: [
        {
          id: 'bye',
          effects: [
            { kind: 'stat', stat: 'friendship', by: 5, of: person('sam') },
            { kind: 'scene', scene: null },
          ],
        },
      ],
    },
  ],
  minigames: [quickFeet],
  collections: [{ id: 'notes', name: 'Notes' }],
  // On moving day the cat needs a name; the prose says it from then on.
  inputs: [{ id: 'catName', label: 'Name your cat', kind: 'text', maxLength: 16, when: { phase: ['arrival'] } }],
  // People out in the park, made fresh each day by the generators plugin.
  kinds: [{ id: 'visitor', label: 'Visitor', plural: 'Visitors' }],
  triggers: [
    // The first time each day the player is in the park: yesterday's visitors go home and two new ones come.
    {
      id: 'visitors',
      once: 'turn',
      when: at('park'),
      effects: [{ kind: 'each', of: 'visitor', effects: [{ kind: 'remove', entity: '$' }] }, generate('visitor', 2)],
    },
    // A note under the door the first time the player steps out.
    {
      id: 'welcome',
      when: at('high-street'),
      effects: [
        { kind: 'notify', title: 'A note under your door', text: 'notice.welcome', tag: 'post' },
        { kind: 'collect', collection: 'notes', entry: { id: 'welcome', title: 'Welcome note', text: 'notice.welcome' } },
      ],
    },
    // Once a day after you've answered Ava's first text, a line of her small talk from the pool.
    { id: 'ava.chat', once: 'turn', when: messageReplied('ava.text'), effects: [drawMessage('ava.chat')] },
    // Rent, every Sunday from the first week on: the town's one bill, so money has somewhere to go.
    {
      id: 'rent',
      once: 'turn',
      when: { all: [weekday(6), day({ gte: 6 })] },
      effects: [
        { kind: 'stat', stat: 'coins', by: -30 },
        { kind: 'notify', id: 'rent', title: 'Rent paid: 30 coins', tag: 'money' },
      ],
    },
  ],
  prose,
  variants: {
    'ava.smalltalk': ['ava.smalltalk.rain', 'ava.smalltalk.beans', 'ava.smalltalk.river'],
    'street.weather': ['street.weather.drizzle', 'street.weather.sun', 'street.weather.wind'],
  },
  data: {
    places: { locations },
    cast: { characters },
    quests: {
      quests: [
        {
          id: 'settle',
          title: 'Settle in',
          summary: 'New town, new flat. Find your feet.',
          starts: { phase: ['open'] },
          stages: [
            { id: 'out', hint: 'Step out onto the high street.', done: at('high-street') },
            { id: 'ava', hint: 'Somebody runs the café. Say hello.', done: { seen: 'ava.hi' } },
            { id: 'post', hint: 'Take a photo with someone and post it.', done: { custom: 'feed/posted', with: { gte: 1 } } },
          ],
        },
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
    jobs: {
      jobs: [
        {
          id: 'weekend',
          title: 'Weekend help',
          description: 'Saturday mornings behind the counter at the Corner Café.',
          blocked: [{ when: { not: { stat: 'friendship', of: person('ava'), gte: 10 } }, reason: 'Ava doesn’t know you well enough yet.' }],
          at: ['cafe'],
          // Saturdays (day 5 of the calendar's week), starting in the morning; the shift takes it.
          days: [5],
          hours: ['morning'],
          shift: { cost: { energy: 25 }, passes: 1 },
          ranks: [
            { id: 'help', title: 'Weekend help', pay: { coins: 12 } },
            { id: 'barista', title: 'Barista', pay: { coins: 16 }, requires: { shifts: 3 } },
          ],
          // Miss two Saturdays and Ava finds someone else.
          fire: { missed: 2 },
        },
        {
          id: 'dogs',
          title: 'Dog walker',
          description: 'An hour round the park with somebody’s spaniel, on weekday evenings. In the Gazette’s ads.',
          at: ['park'],
          days: [0, 1, 2, 3, 4],
          hours: ['evening'],
          shift: { cost: { energy: 15 }, passes: 1 },
          ranks: [{ id: 'walker', title: 'Dog walker', pay: { coins: 6 } }],
        },
      ],
    },
    generators: {
      pools: [
        { id: 'first-names', values: ['Ruth', 'Omar', 'Lena', 'Theo', 'Priya', 'Jonah', 'Maud', 'Kit'] },
        // Most come alone; plenty bring a dog; now and then, a pushchair.
        {
          id: 'company',
          values: [
            { value: 'alone', weight: 5 },
            { value: 'a dog', weight: 4 },
            { value: 'a pushchair', weight: 1 },
          ],
        },
      ],
      templates: [{ id: 'visitor', of: 'visitor', name: { pool: 'first-names' }, kv: { with: { pool: 'company' }, laps: { between: [1, 3] } } }],
    },
    shop: {
      vendors: [
        {
          id: 'counter',
          name: 'The counter',
          at: ['cafe'],
          hours: ['morning', 'afternoon'],
          // Ava will take an unopened sandwich back for half.
          buysBack: 0.5,
          // One thing on the board is half price each day.
          discounts: { off: 0.5 },
          goods: [
            { item: 'sandwich', price: { coins: 4 } },
            // Two a day, baked each morning.
            { item: 'flapjack', price: { coins: 2 }, stock: 2, restock: 'day' },
            { item: 'paper', price: { coins: 2 } },
          ],
        },
      ],
    },
    achievements: {
      achievements: [
        // A count to watch: coins on hand, out of 100.
        { id: 'nest-egg', title: 'Nest egg', description: 'Have 100 coins at once.', progress: { value: 'coins', target: 100 } },
        // Hidden until it happens.
        { id: 'river', title: 'Dusk by the river', description: 'Spend an evening by the river with Ava.', secret: true, when: { seen: 'ava.river' } },
      ],
    },
    cheats: {
      cheats: [
        // Free for everyone.
        { id: 'coins', label: '+20 coins', description: 'A little help with the rent.', effects: [{ kind: 'stat', stat: 'coins', by: 20 }] },
        // For supporters: refused until the supporter code has been entered (the unlocks plugin's `unlocks/has`).
        {
          id: 'energy',
          label: 'Full energy',
          description: 'As if you had slept.',
          group: 'Supporters',
          blocked: [{ when: { not: hasUnlock('supporter') }, reason: 'For supporters.' }],
          effects: [{ kind: 'stat', stat: 'energy', to: 100 }],
        },
      ],
    },
    unlocks: {
      unlocks: [
        // The code's hash, from `ifloom unlock-hash supporter`; the code is in .env, never here.
        // It opens the cheat above and src/unlocks/supporter.ts, a scene in the café.
        {
          id: 'supporter',
          label: 'Supporter edition',
          description: 'A thank-you scene in the café, and the Full energy cheat.',
          hash: '7b141ff9f5210e0e3064dd089920697c712fa1b31ff56c2e42737dcd71bbed5f',
        },
      ],
    },
    statuses: {
      statuses: [
        { id: 'caffeinated', label: 'Caffeinated', summary: 'A coffee’s worth of get-up-and-go.', turns: 2, modifiers: [{ stat: 'energy', add: 10 }] },
      ],
    },
    wardrobe: {
      // You arrive in your raincoat.
      slots: [
        { id: 'coat', label: 'Coat', start: 'raincoat' },
        { id: 'neck', label: 'Neck' },
      ],
      clothes: [
        { id: 'raincoat', slot: 'coat' },
        { id: 'scarf', slot: 'neck' },
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
      posts: [
        { id: 'ava.cake', feed: 'social', from: 'ava', when: day({ gte: 1 }), body: [{ text: 'feed.ava-cake' }], likes: 14 },
        { id: 'sam.river', feed: 'social', from: 'sam', when: day({ gte: 2 }), body: [{ text: 'feed.sam-river' }], likes: 3 },
      ],
    },
  },
}

/** Re-exported for `custom.ts`: the helpers that post and react. */
export { postTo, react }
