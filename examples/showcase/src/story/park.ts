/** Riverside Park: jogging, quick feet with the kids, the day's visitors and dog walking. */
import { SCHEMA, type MinigameDef, type MinigameStateDef, type Pack } from '@ifloom/engine'
import { generate } from '@ifloom/plugin-generators'
import { pass } from '@ifloom/plugin-calendar'
import { at, onlyAt } from '@ifloom/plugin-places'
import { place } from '../place.ts'

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

export const park: Pack = {
  id: 'story.park',
  schema: SCHEMA,
  activities: [
    { id: 'jog', cost: { stats: { energy: 15 } }, blocked: [onlyAt(['park'])], effects: [pass(1), { kind: 'stat', stat: 'charm', by: 1 }] },
    { id: 'arrows', blocked: [onlyAt(['park'])], effects: [{ kind: 'minigame', minigame: 'arrows' }] },
  ],
  scenes: [
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
  ],
  minigames: [quickFeet],
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
  ],
  data: {
    places: {
      locations: [
        {
          ...place({ id: 'park', name: 'Riverside Park', tags: ['outdoors'], exits: ['high-street'] }),
          // The river, then a line while the day's visitors are about.
          body: [{ text: 'place.park' }, { text: 'place.park.visitors', when: { count: 'visitor', gte: 1 } }],
          actions: [
            { id: 'jog', label: 'Go for a jog', command: { type: 'activity', id: 'jog' } },
            { id: 'arrows', label: 'Play quick feet with the kids', command: { type: 'activity', id: 'arrows' } },
          ],
        },
      ],
    },
    jobs: {
      jobs: [
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
  },
  prose: {
    'place.park': 'The river is slow and brown and full of ducks with opinions.',
    'place.park.visitors': 'A few people are out along the path today, walking off their lunch.',
    'arrows.up': 'The girl with the whistle points at the sky. Up!',
    'arrows.down': 'She points at her shoes. Down!',
    'arrows.left': 'She points at the river. Left!',
    'arrows.right': 'She points at the swings. Right!',
    'park.arrows-won': 'The kids count it up on their fingers and agree, grudgingly, that you win. Five coins change hands from a jam jar.',
    'park.arrows-won#leave': 'Bow',
    'park.arrows-lost': '"Too slow!" They are already picking a new grown-up to beat.',
    'park.arrows-lost#leave': 'Retire with dignity',
  },
}
