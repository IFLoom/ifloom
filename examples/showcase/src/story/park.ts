/** Riverside Park: jogging, quick feet with the kids, skimming stones, the ducks, the day's visitors and dog walking. */
import type { Block, Condition, MinigameDef, MinigameStateDef, Content } from '@ifloom/engine'
import { generators } from '@ifloom/plugin-generators'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { place } from '../place.ts'

/** The four arrows of quick feet, in the order the minigame's `arrow` variable numbers them from 1. */
const ARROWS = ['up', 'down', 'left', 'right'] as const

/** What the girl with the whistle does for each arrow. */
const POINTS: Record<(typeof ARROWS)[number], string> = {
  up: 'The girl with the whistle points at the sky. Up!',
  down: 'She points at her shoes. Down!',
  left: 'She points at the river. Left!',
  right: 'She points at the swings. Right!',
}

/** One arrow on screen: 1.5 seconds to press it. The right one scores; a wrong one or the time running out doesn't. */
const showArrow = (arrow: (typeof ARROWS)[number]): MinigameStateDef => ({
  label: POINTS[arrow],
  after: { ms: 1500, go: 'round' },
  on: ARROWS.map((input) => ({ input, go: 'round', ...(input === arrow ? { effects: [{ kv: 'score', of: 'minigame', by: 1 }] } : {}) })),
})

/**
 * Quick feet, at the park: five rounds, each a random arrow to press in time.
 * Three or more right wins a few coins from the kids' pot.
 */
const quickFeet: MinigameDef = {
  id: 'arrows',
  label: 'Quick feet',
  start: 'round',
  kv: { round: 0, arrow: 0, score: 0 },
  keys: { up: ['ArrowUp', 'w'], down: ['ArrowDown', 's'], left: ['ArrowLeft', 'a'], right: ['ArrowRight', 'd'] },
  states: {
    // A new round draws an arrow, or after the fifth, the score is counted.
    round: {
      always: [
        { when: { kv: 'round', of: 'minigame', gte: 5 }, go: 'tally' },
        {
          go: 'pick',
          effects: [
            { kv: 'round', of: 'minigame', by: 1 },
            { kv: 'arrow', of: 'minigame', random: [1, 4] },
          ],
        },
      ],
    },
    pick: { always: ARROWS.map((arrow, index) => ({ when: { kv: 'arrow', of: 'minigame', gte: index + 1, lte: index + 1 }, go: arrow })) },
    ...Object.fromEntries(ARROWS.map((arrow) => [arrow, showArrow(arrow)])),
    tally: { always: [{ when: { kv: 'score', of: 'minigame', gte: 3 }, go: 'won' }, { go: 'lost' }] },
    won: {
      final: {
        effects: [{ stat: 'coins', by: 5 }, { scene: 'park.arrows-won' }],
      },
    },
    lost: { final: { effects: [{ scene: 'park.arrows-lost' }] } },
  },
}

/**
 * How a skimmed stone went, under the dice: drawn only the turn you skim
 * (`skimmed` resets each day), by the latest roll under `skim`. The React UI
 * draws the dice before the line that shows (`ui.dice`), and holds the line
 * back until they settle.
 */
const skimmed = (when: Condition, text: string): Block => ({ text, when: { all: [{ kv: 'skimmed' }, when] }, ui: { dice: 'skim' } })

export const park: Content = {
  // One skimmed stone a day: each new day resets it.
  resets: { skimmed: false },
  scenes: [
    // How quick feet ends.
    {
      id: 'park.arrows-won',
      title: 'Quick feet',
      body: [{ text: 'The kids count it up on their fingers and agree, grudgingly, that you win. Five coins change hands from a jam jar.' }],
      choices: [{ id: 'leave', label: 'Bow', effects: [{ scene: null }] }],
    },
    {
      id: 'park.arrows-lost',
      title: 'Quick feet',
      body: [{ text: '"Too slow!" They are already picking a new grown-up to beat.' }],
      choices: [{ id: 'leave', label: 'Retire with dignity', effects: [{ scene: null }] }],
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
      when: places.at('park'),
      effects: [{ each: 'visitor', effects: [{ remove: '$' }] }, generators.generate('visitor', 2)],
    },
    // And the ducks come to see what you brought: a roll no line of prose hints, so the React UI shows it over the scene.
    { id: 'ducks', once: 'turn', when: places.at('park'), effects: [{ roll: 'ducks', dice: '1d6+2' }] },
  ],
  entities: [
    place({
      id: 'park',
      name: 'Riverside Park',
      tags: ['outdoors'],
      exits: ['high-street'],
      // The river, the ducks, a line while the day's visitors are about, then the stones, with how today's skim went.
      body: [
        // Read by key from the prose, so a mod can rewrite the river: the example mod's fog does.
        { prose: 'place.park' },
        // `{{ducks}}` is the total the trigger's roll put in the kv store.
        { text: '{{ducks}} of them paddle over at once, in case you brought bread.', when: { roll: 'ducks' } },
        { text: 'A few people are out along the path today, walking off their lunch.', when: { count: 'visitor', gte: 1 } },
        { text: 'Flat stones lie along the water’s edge. [[act:skim|Try to skim a stone]].' },
        skimmed({ roll: 'skim', critical: 'max' }, 'Skip after skip, clean to the far bank. An old man on the bench gives you a slow round of applause.'),
        skimmed(
          { roll: 'skim', passed: true, critical: false },
          'The stone skips once, twice, again, and sinks most of the way across. The ducks look impressed despite themselves.',
        ),
        skimmed({ roll: 'skim', passed: false }, 'Plop. It goes straight in, and the ducks look delighted.'),
      ],
      actions: [
        { id: 'jog', label: 'Go for a jog', cost: { stats: { energy: 15 } }, effects: [calendar.pass(1), { stat: 'charm', by: 1 }] },
        { id: 'arrows', label: 'Play quick feet with the kids', effects: [{ minigame: 'arrows' }] },
        // Two dice against 8: the total goes in the kv store as `skim`, and the roll is kept for `{ roll: 'skim' }`.
        // Drawn inline by `[[act:skim|…]]` in the stones line, so it isn't a button as well.
        {
          id: 'skim',
          label: 'Skim a stone',
          effects: [
            { kv: 'skimmed', to: true },
            { roll: 'skim', dice: '2d6', against: 8 },
          ],
        },
      ],
    }),
  ],
  data: {
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
  },
}
