/**
 * Small Town: the showcase's content, as one pack.
 *
 * Everything here is data — conditions, effects, prose keys — so a mod could
 * ship any of it. The few things that are computed live in `custom.ts`.
 */
import { SCHEMA, type MinigameDef, type MinigameStateDef, type Pack } from '@ifloom/engine'
import { questActive } from '@ifloom/plugin-quests'
import { applyEffect, effectActive } from '@ifloom/plugin-effects'
import { postTo, react } from '@ifloom/plugin-feed'
import { wearing } from '@ifloom/plugin-wardrobe'
import { day, pass, period, sleep, weekday } from '@ifloom/plugin-calendar'
import { at, onlyAt, type LocationDef } from '@ifloom/plugin-places'
import { here, person, talk, type CharacterDef } from '@ifloom/plugin-cast'
import { prose } from './prose.ts'

const place = (location: Omit<LocationDef, 'art' | 'tag' | 'body'> & { tag?: string }): LocationDef => ({
  tag: 'Small Town',
  art: `place/${location.id}`,
  body: [{ text: `place.${location.id}` }],
  ...location,
})

const locations: LocationDef[] = [
  {
    ...place({ id: 'flat', name: 'Your flat', tag: 'Home', kind: 'room', exits: ['high-street'] }),
    actions: [{ id: 'bed', label: 'Go to bed', command: sleep() }],
  },
  {
    ...place({ id: 'high-street', name: 'High Street', kind: 'street', exits: ['flat', 'cafe', 'park', 'office'] }),
    // The street, then a line about the weather, drawn afresh each day.
    body: [{ text: 'place.high-street' }, { variants: 'street.weather' }, { text: 'place.high-street/hint', when: { setting: 'hints' } }],
    actions: [{ id: 'scarf', label: 'Buy a scarf at the market', command: { type: 'activity', id: 'buyScarf' } }],
  },
  {
    ...place({ id: 'cafe', name: 'The Corner Café', tag: 'Café', kind: 'venue', exits: ['high-street'] }),
    // Open in the day; the door says when it opens again.
    locked: [{ when: { not: period('morning', 'afternoon') }, reason: 'Closed. Opens tomorrow morning.' }],
    actions: [
      { id: 'coffee', label: 'Buy a coffee', command: { type: 'activity', id: 'coffee' } },
      { id: 'sandwich', label: 'Buy a sandwich for later', command: { type: 'activity', id: 'buySandwich' } },
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
      { text: 'place.cafe/ava', when: here('ava') },
      { text: 'place.cafe/raincoat', when: wearing('raincoat') },
      { text: 'place.cafe/caffeinated', when: effectActive('caffeinated') },
    ],
  },
  {
    ...place({ id: 'park', name: 'Riverside Park', kind: 'street', exits: ['high-street'] }),
    actions: [
      { id: 'jog', label: 'Go for a jog', command: { type: 'activity', id: 'jog' } },
      { id: 'arrows', label: 'Play quick feet with the kids', command: { type: 'activity', id: 'arrows' } },
    ],
  },
  {
    ...place({ id: 'office', name: 'The Office', tag: 'Work', kind: 'venue', exits: ['high-street'] }),
    // Weekdays only, in the day.
    locked: [
      { when: weekday(5, 6), reason: 'Shut at weekends.' },
      { when: { all: [weekday(4), { not: period('morning', 'afternoon') }] }, reason: 'Closed. Back on Monday.' },
      { when: { not: period('morning', 'afternoon') }, reason: 'Closed. Opens tomorrow morning.' },
    ],
    actions: [{ id: 'work', label: 'Do a shift', command: { type: 'activity', id: 'work' } }],
  },
]

/** The four arrows of quick feet, in the order the `arrow` variable numbers them from 1. */
const ARROWS = ['up', 'down', 'left', 'right'] as const

/** One arrow on screen: 1.5 seconds to press it. The right one scores; a wrong one or the time running out doesn't. */
const showArrow = (arrow: (typeof ARROWS)[number]): MinigameStateDef => ({
  label: `arrows.${arrow}`,
  after: { ms: 1500, go: 'round' },
  on: ARROWS.map((input) => ({ input, go: 'round', ...(input === arrow ? { effects: [{ kind: 'minigameVar' as const, key: 'score', add: 1 }] } : {}) })),
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
            { kind: 'minigameVar', key: 'round', add: 1 },
            { kind: 'minigameVar', key: 'arrow', random: [1, 4] },
          ],
        },
      ],
    },
    pick: { always: ARROWS.map((arrow, index) => ({ when: { minigameVar: 'arrow', gte: index + 1, lte: index + 1 }, go: arrow })) },
    ...Object.fromEntries(ARROWS.map((arrow) => [arrow, showArrow(arrow)])),
    tally: { always: [{ when: { minigameVar: 'score', gte: 3 }, go: 'won' }, { go: 'lost' }] },
    won: { final: { effects: [{ kind: 'stat', key: 'coins', by: 5 }, { kind: 'scene', id: 'park.arrows-won' }] } },
    lost: { final: { effects: [{ kind: 'scene', id: 'park.arrows-lost' }] } },
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
    { id: 'energy', label: 'Energy', start: 80, spendable: true, format: '{n}%', lacking: 'Too tired.' },
    { id: 'charm', label: 'Charm', start: 1, max: 20 },
  ],
  items: [
    { id: 'raincoat', name: 'raincoat', desc: 'Yellow, a size too big.', kind: 'gear' },
    { id: 'scarf', name: 'scarf', desc: 'Knitted by someone who loved you.', kind: 'stuff' },
    {
      id: 'sandwich',
      name: 'sandwich',
      desc: 'Cheese and pickle, wrapped in paper.',
      kind: 'stuff',
      use: { label: 'Eat the sandwich', effects: [{ kind: 'stat', key: 'energy', by: 25 }] },
    },
  ],
  activities: [
    { id: 'wait', effects: [pass(1)] },
    {
      id: 'coffee',
      cost: { stats: { coins: 3 } },
      requires: [onlyAt(['cafe']), { reason: 'One is enough for today.', when: { not: { flag: 'hadCoffee' } } }],
      effects: [
        { kind: 'stat', key: 'energy', by: 15 },
        { kind: 'flag', key: 'hadCoffee', value: true },
        // And a lift that lasts till tomorrow is out: 10 more energy, never written.
        applyEffect('caffeinated'),
      ],
    },
    { id: 'sit', requires: [onlyAt(['cafe'])], effects: [{ kind: 'scene', from: 'cafe', otherwise: 'cafe.quiet' }] },
    { id: 'buySandwich', cost: { stats: { coins: 4 } }, requires: [onlyAt(['cafe'])], effects: [{ kind: 'item', id: 'sandwich', by: 1 }] },
    { id: 'work', cost: { stats: { energy: 30 } }, requires: [onlyAt(['office'])], effects: [pass(2), { kind: 'stat', key: 'coins', by: 20 }] },
    { id: 'jog', cost: { stats: { energy: 15 } }, requires: [onlyAt(['park'])], effects: [pass(1), { kind: 'stat', key: 'charm', by: 1 }] },
    { id: 'arrows', requires: [onlyAt(['park'])], effects: [{ kind: 'minigame', id: 'arrows' }] },
    { id: 'buyScarf', cost: { stats: { coins: 8 } }, requires: [onlyAt(['high-street']), { reason: 'You have one.', when: { not: { has: 'scarf' } } }], effects: [{ kind: 'item', id: 'scarf', by: 1 }] },
    // The camera: one photo of each person, if they're here to take.
    ...(['ava', 'sam'] as const).map((who) => ({
      id: `photo-${who}`,
      requires: [{ reason: 'They aren’t here.', when: here(who) }],
      effects: [
        {
          kind: 'collect' as const,
          to: 'gallery',
          entry: { id: `photo.${who}`, title: who === 'ava' ? 'Ava at work' : 'Sam and the dog', image: `art/photo/${who}.svg` },
        },
      ],
    })),
    {
      id: 'post',
      cost: { stats: { energy: 5 } },
      requires: [
        { reason: 'Take a photo first.', when: { collection: 'gallery' } },
        { reason: 'You have posted today.', when: { not: { flag: 'postedToday' } } },
      ],
      effects: [{ custom: 'postLatest' }, { kind: 'flag', key: 'postedToday', value: true }],
    },
  ],
  scenes: [
    {
      id: 'intro',
      title: 'Moving day',
      body: [{ text: 'intro' }],
      choices: [{ id: 'unpack', effects: [{ kind: 'scene', id: null }, { kind: 'phase', value: 'open' }] }],
    },
    {
      id: 'ava.hi',
      title: 'Ava',
      speaker: 'ava',
      body: [
        { text: 'ava.hi' },
        { variants: 'ava.smalltalk' },
        { text: 'ava.hi/regular', when: { seen: 'ava.hi', gte: 3 } },
      ],
      choices: [
        { id: 'chat', once: { per: 'turn', reason: 'She has a queue.' }, effects: [{ kind: 'stat', key: 'friendship', by: 5, of: person('ava') }] },
        { id: 'compliment', when: { stat: 'charm', gte: 3 }, effects: [{ kind: 'stat', key: 'friendship', by: 10, of: person('ava') }, { kind: 'scene', id: null }] },
        { id: 'bye', effects: [{ kind: 'scene', id: null }] },
      ],
    },
    {
      id: 'ava.call',
      title: 'Ava, on the phone',
      speaker: 'ava',
      body: [{ text: 'ava.call' }],
      choices: [{ id: 'bye', effects: [{ kind: 'stat', key: 'friendship', by: 3, of: person('ava') }, { kind: 'scene', id: null }] }],
    },
    {
      id: 'ava.river',
      title: 'By the river',
      speaker: 'ava',
      body: [{ text: 'ava.river' }],
      choices: [{ id: 'stay', effects: [{ kind: 'stat', key: 'friendship', by: 5, of: person('ava') }, { kind: 'scene', id: null }] }],
    },
    // The café's storylets: scenes drawn from 'cafe' by "Sit a while", by weight, while their when holds.
    {
      id: 'cafe.window',
      title: 'The window seat',
      drawnFrom: ['cafe'],
      weight: 3,
      when: { not: { seen: 'cafe.window', gte: 2 } },
      body: [{ text: 'cafe.window' }],
      choices: [{ id: 'leave', effects: [{ kind: 'scene', id: null }] }],
    },
    {
      id: 'cafe.crossword',
      title: 'Seven down',
      drawnFrom: ['cafe'],
      when: { not: { seen: 'cafe.crossword' } },
      body: [{ text: 'cafe.crossword' }],
      choices: [{ id: 'leave', effects: [{ kind: 'stat', key: 'charm', by: 1 }, { kind: 'scene', id: null }] }],
    },
    {
      id: 'cafe.break',
      title: 'Ava’s break',
      speaker: 'ava',
      drawnFrom: ['cafe'],
      weight: 2,
      when: here('ava'),
      body: [{ text: 'cafe.break' }],
      choices: [{ id: 'leave', effects: [{ kind: 'stat', key: 'friendship', by: 2, of: person('ava') }, { kind: 'scene', id: null }] }],
    },
    // When none of them can happen.
    {
      id: 'cafe.quiet',
      title: 'A quiet table',
      body: [{ text: 'cafe.quiet' }],
      choices: [{ id: 'leave', effects: [{ kind: 'scene', id: null }] }],
    },
    // How quick feet ends.
    {
      id: 'park.arrows-won',
      title: 'Quick feet',
      body: [{ text: 'park.arrows-won' }],
      choices: [{ id: 'leave', effects: [{ kind: 'scene', id: null }] }],
    },
    {
      id: 'park.arrows-lost',
      title: 'Quick feet',
      body: [{ text: 'park.arrows-lost' }],
      choices: [{ id: 'leave', effects: [{ kind: 'scene', id: null }] }],
    },
    {
      id: 'sam.hi',
      title: 'Sam',
      speaker: 'sam',
      body: [{ text: 'sam.hi' }],
      choices: [{ id: 'bye', effects: [{ kind: 'stat', key: 'friendship', by: 5, of: person('sam') }, { kind: 'scene', id: null }] }],
    },
  ],
  minigames: [quickFeet],
  collections: [{ id: 'notes', name: 'Notes' }],
  // On moving day the cat needs a name; the prose says it from then on.
  inputs: [{ id: 'catName', label: 'Name your cat', kind: 'text', maxLength: 16, when: { phase: ['arrival'] } }],
  triggers: [
    // A note under the door the first time the player steps out.
    {
      id: 'welcome',
      when: at('high-street'),
      effects: [
        { kind: 'notify', title: 'A note under your door', text: 'notice.welcome', tag: 'post' },
        { kind: 'collect', to: 'notes', entry: { id: 'welcome', title: 'Welcome note', text: 'notice.welcome' } },
      ],
    },
    // Rent, every Sunday from the first week on: the town's one bill, so money has somewhere to go.
    {
      id: 'rent',
      once: 'turn',
      when: { all: [weekday(6), day({ gte: 6 })] },
      effects: [
        { kind: 'stat', key: 'coins', by: -30 },
        { kind: 'notify', id: 'rent', title: 'Rent paid: 30 coins', tag: 'money' },
      ],
    },
  ],
  prose,
  variants: {
    'ava.smalltalk': ['ava.smalltalk/rain', 'ava.smalltalk/beans', 'ava.smalltalk/river'],
    'street.weather': ['street.weather/drizzle', 'street.weather/sun', 'street.weather/wind'],
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
    achievements: {
      achievements: [
        // A count to watch: coins on hand, out of 100.
        { id: 'nest-egg', title: 'Nest egg', description: 'Have 100 coins at once.', progress: { value: 'coins', target: 100 } },
        // Hidden until it happens.
        { id: 'river', title: 'Dusk by the river', description: 'Spend an evening by the river with Ava.', secret: true, when: { seen: 'ava.river' } },
      ],
    },
    effects: {
      effects: [{ id: 'caffeinated', label: 'Caffeinated', summary: 'A coffee’s worth of get-up-and-go.', turns: 2, modifiers: [{ stat: 'energy', add: 10 }] }],
    },
    wardrobe: { clothes: [{ id: 'raincoat', slot: 'coat' }, { id: 'scarf', slot: 'neck' }] },
    messages: {
      messages: [
        {
          id: 'ava.text',
          channel: 'texts',
          from: 'ava',
          when: { all: [{ seen: 'ava.hi' }, { since: 'ava.hi', gte: 1 }] },
          body: [{ text: 'ava.text' }],
          replies: [{ id: 'yes', effects: [{ kind: 'stat', key: 'friendship', by: 5, of: person('ava') }] }, { id: 'later' }],
        },
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
