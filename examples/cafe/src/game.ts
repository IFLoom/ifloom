/**
 * The Corner Café: a management game, a week at a time.
 *
 * The shape this shows is the one a management game needs: things the game
 * keeps several of (staff, dishes), each with numbers of its own; people
 * hired and leaving in play; upkeep that runs over all of them each week; and
 * triggers that watch counts. A turn is a week, ended by a button. No places,
 * no characters, no clock: the café is the whole world.
 */
import { SCHEMA, entitiesOf, entityOf, loadGame, startingState, type Custom, type EffectRef, type Game, type GameState, type Pack } from '@ifloom/engine'

/** The sum of one stat over every entity of a kind. */
function total(state: GameState, kind: string, stat: string): number {
  return entitiesOf(state, kind).reduce((sum, ref) => sum + (entityOf(state, ref)?.stats[stat] ?? 0), 0)
}

/** The week's sums: worked out from the state, so they are the game's own code. */
export const custom: Custom = {
  effects: {
    // Each dish sells by its price and quality, and the kitchen's skill decides how many go out.
    takings: (state): EffectRef[] => {
      if (entitiesOf(state, 'staff').length === 0) return []
      const covers = 10 + total(state, 'staff', 'skill') * 2 + Math.floor((state.stats.reputation ?? 0) / 5)
      const perCover = entitiesOf(state, 'dish').reduce((sum, ref) => {
        const dish = entityOf(state, ref)!
        return sum + dish.stats.price * dish.stats.quality
      }, 0)
      return [{ kind: 'stat', stat: 'coins', by: Math.round((covers * perCover) / 10) }]
    },
    wages: (state): EffectRef[] => [{ kind: 'stat', stat: 'coins', by: -total(state, 'staff', 'wage') }],
  },
  values: {
    payroll: (state) => total(state, 'staff', 'wage'),
  },
}

export const corner: Pack = {
  id: 'corner',
  schema: SCHEMA,
  kinds: [
    { id: 'staff', label: 'Member of staff', plural: 'Staff' },
    { id: 'dish', label: 'Dish', plural: 'Menu' },
  ],
  stats: [
    { id: 'coins', label: 'Coins', start: 120, min: -9999, max: 99999, format: '£{n}', spendable: true, lacking: 'Not enough in the till.' },
    // Word gets round in steps: the sidebar shows the level, and a notice says when it goes up.
    { id: 'reputation', label: 'Reputation', start: 20, levels: { at: [40, 70, 90], notice: 'Word gets round: {label} is now level {level}.' } },
    { id: 'skill', label: 'Skill', of: 'staff', start: 1, min: 1, max: 10 },
    { id: 'morale', label: 'Morale', of: 'staff', start: 60 },
    { id: 'wage', label: 'Wage', of: 'staff', start: 10, max: 50, format: '£{n}' },
    { id: 'price', label: 'Price', of: 'dish', start: 4, min: 1, max: 20, format: '£{n}' },
    { id: 'quality', label: 'Quality', of: 'dish', start: 2, min: 1, max: 5 },
  ],
  entities: [
    { id: 'ana', of: 'staff', name: 'Ana', stats: { skill: 5, wage: 12 } },
    { id: 'toast', of: 'dish', name: 'Cheese on toast', stats: { price: 4, quality: 2 } },
    { id: 'soup', of: 'dish', name: 'Soup of the day', stats: { price: 6, quality: 3 } },
  ],
  activities: [
    {
      id: 'endWeek',
      effects: [
        { custom: 'takings' },
        { custom: 'wages' },
        // A week's work wears everyone down a little.
        { kind: 'each', of: 'staff', effects: [{ kind: 'stat', stat: 'morale', by: -8, of: '$' }] },
        // Anyone at the end of their tether hands in their apron.
        { kind: 'each', of: 'staff', where: { stat: 'morale', of: '$', lt: 20 }, effects: [{ kind: 'remove', entity: '$' }] },
        { kind: 'turn' },
      ],
    },
    {
      id: 'staffLunch',
      cost: { stats: { coins: 25 } },
      blocked: [{ when: { not: { count: 'staff' } }, reason: 'There is nobody to feed.' }],
      effects: [{ kind: 'each', of: 'staff', effects: [{ kind: 'stat', stat: 'morale', by: 15, of: '$' }] }],
    },
    {
      id: 'improveSoup',
      cost: { stats: { coins: 40 } },
      blocked: [{ when: { stat: 'quality', of: 'dish:soup', gte: 5 }, reason: 'It could not be better.' }],
      effects: [{ kind: 'stat', stat: 'quality', by: 1, of: 'dish:soup' }],
    },
    {
      id: 'interview',
      blocked: [{ when: { count: 'staff', gte: 4 }, reason: 'There is no room behind the counter.' }],
      effects: [{ kind: 'scene', scene: 'hiring' }],
    },
  ],
  scenes: [
    {
      id: 'opening',
      title: 'The Corner Café',
      body: [{ text: 'opening' }],
      choices: [{ id: 'begin', effects: [{ kind: 'scene', scene: null }] }],
    },
    {
      id: 'hiring',
      title: 'Interviews',
      body: [{ text: 'hiring' }],
      choices: [
        {
          id: 'dev',
          effects: [
            { kind: 'create', of: 'staff', entity: { name: 'Dev', stats: { skill: 2, wage: 8, morale: 80 } } },
            { kind: 'scene', scene: null },
          ],
        },
        {
          id: 'fen',
          effects: [
            { kind: 'create', of: 'staff', entity: { name: 'Fen', stats: { skill: 7, wage: 18 } } },
            { kind: 'scene', scene: null },
          ],
        },
        { id: 'nobody', effects: [{ kind: 'scene', scene: null }] },
      ],
    },
  ],
  triggers: [
    { id: 'overdrawn', once: 'turn', when: { stat: 'coins', lt: 0 }, effects: [{ kind: 'notify', title: 'The bank has written.', tag: 'money' }] },
    { id: 'empty', once: 'turn', when: { count: 'staff', lt: 1 }, effects: [{ kind: 'notify', title: 'Nobody to open up tomorrow.', tag: 'staff' }] },
    // A happy team is a good review: once, the first week two of them are glad to be there.
    {
      id: 'review',
      when: { count: 'staff', where: { stat: 'morale', of: '$', gte: 75 }, gte: 2 },
      effects: [
        { kind: 'stat', stat: 'reputation', by: 10 },
        { kind: 'notify', title: 'A glowing review in the local paper.', tag: 'press' },
      ],
    },
  ],
  prose: {
    opening:
      'The lease is signed, the sign is up, and Ana has already rearranged the mugs. Every week the till is counted, the staff are paid, and you find out what the town thought.',
    'opening#begin': 'Open the doors',
    hiring: 'Two people answer the card in the window. Wages are {{v:payroll}} a week already.',
    'hiring#dev': 'Dev: keen, cheap, still learning',
    'hiring#fen': 'Fen: ten years in kitchens, and knows it',
    'hiring#nobody': 'Not this week',
  },
}

/** The game: the pack over a base with its own sums and the buttons the café always has. */
export function cornerCafe(): { game: Game; problems: string[] } {
  const { game, problems } = loadGame([corner], {
    id: 'corner-cafe',
    title: 'The Corner Café',
    introScene: 'opening',
    custom,
    actions: [
      { id: 'end-week', label: 'Count the till and end the week', command: { type: 'activity', id: 'endWeek' } },
      { id: 'lunch', label: 'Buy the staff lunch', command: { type: 'activity', id: 'staffLunch' } },
      { id: 'soup', label: 'Better ingredients for the soup', command: { type: 'activity', id: 'improveSoup' } },
      { id: 'hire', label: 'Put a card in the window', command: { type: 'activity', id: 'interview' } },
    ],
  })
  return { game, problems: problems.map((problem) => `${problem.pack} · ${problem.where} · ${problem.what}`) }
}

const built = cornerCafe()
export default built

/** Where `ifloom playtest` starts: the doors already open. */
export const start = (game: Game) => ({ ...startingState(game), sceneId: null })
