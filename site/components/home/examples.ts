// The three example games the homepage's first card shows, each with a few
// lines of its real source, trimmed. Keep them true to the files they name.
import { tokenize, type Token } from './code'

export type Example = {
  id: string
  name: string
  shape: string
  detail: string
  /** The file the lines come from, from the repo's root. */
  path: string
  lines: string[]
  tokens: Token[][]
}

const SOURCE = 'https://github.com/IFLoom/ifloom/blob/main/'

/** A link to an example's file on GitHub. */
export const sourceOf = (example: Example) => SOURCE + example.path

const make = (example: Omit<Example, 'tokens'>): Example => ({ ...example, tokens: example.lines.map(tokenize) })

export const examples: Example[] = [
  make({
    id: 'novel',
    name: 'The Letter',
    shape: 'A linear novel',
    detail: 'Three chapters, no plugins. A chapter is a turn.',
    path: 'examples/novel/src/story/ch1.ts',
    lines: [
      `export const ch1: Content = {`,
      `  // The story opens on the mat.`,
      `  introScene: 'ch1.mat',`,
      `  // No saving until the reader has typed a name.`,
      `  saveable: [{ when: { not: { kv: 'playerName' } },`,
      `    reason: 'Type your name first.' }],`,
      `  inputs: [{ id: 'playerName', label: 'Your name',`,
      `    type: 'text', maxLength: 20 }],`,
      `  scenes: [{`,
      `    id: 'ch1.mat',`,
      `    title: 'Chapter one: the mat',`,
      `    body: [`,
      `      { text: 'On the mat, under the takeaway menus, …' },`,
      `      { text: 'You turn it over, {{playerName}}.',`,
      `        when: { kv: 'playerName' } },`,
      `    ],`,
      `    choices: [`,
      `      { id: 'open', label: 'Open it',`,
      `        effects: [{ stat: 'courage', by: 1 },`,
      `          { turn: true }, { scene: 'ch2.stairs' }] },`,
      `      { id: 'shelf', label: 'Put it on the shelf by the door',`,
      `        effects: [{ turn: true }, { scene: 'ch2.stairs' }] },`,
      `    ],`,
      `  }],`,
      `}`,
    ],
  }),
  make({
    id: 'cafe',
    name: 'The Corner Café',
    shape: 'A management game',
    detail: 'A turn is a week, and the staff are entities with stats of their own.',
    path: 'examples/cafe/src/world/staff.ts',
    lines: [
      `export const staff: Content = {`,
      `  kinds: [{ id: 'staff', label: 'Member of staff', unique: true }],`,
      `  stats: [`,
      `    { id: 'skill', label: 'Skill', of: 'staff', start: 1, max: 10 },`,
      `    { id: 'morale', label: 'Morale', of: 'staff', start: 60 },`,
      `    { id: 'wage', label: 'Wage', of: 'staff', start: 10,`,
      `      format: '£{n}' },`,
      `  ],`,
      `  entities: [{ id: 'ana', of: 'staff', name: 'Ana',`,
      `    stats: { skill: 5, wage: 12 } }],`,
      `}`,
      ``,
      `// world/actions.ts: the button that ends the week`,
      `{`,
      `  id: 'end-week',`,
      `  label: 'Count the till and end the week',`,
      `  effects: [`,
      `    { 'game/takings': true },`,
      `    { 'game/wages': true },`,
      `    // A week's work wears everyone down a little.`,
      `    { each: 'staff', effects: [{ stat: 'morale', by: -8, of: '$' }] },`,
      `    // Anyone at the end of their tether hands in their apron.`,
      `    { each: 'staff', where: { stat: 'morale', of: '$', lt: 20 },`,
      `      effects: [{ remove: '$' }] },`,
      `    { turn: true },`,
      `  ],`,
      `}`,
    ],
  }),
  make({
    id: 'showcase',
    name: 'Small Town',
    shape: 'A life sim',
    detail: 'A calendar, places, a cast with their own days, and a phone.',
    path: 'examples/showcase/src/world/cast.ts',
    lines: [
      `export const people: Content = {`,
      `  storylines: [{ id: 'ava', name: 'Ava' }],`,
      `  entities: [`,
      `    cast.person({`,
      `      id: 'ava',`,
      `      name: 'Ava',`,
      `      fullName: 'Ava Marsh',`,
      `      description: 'Runs the café',`,
      `      image: 'art/character/ava.svg',`,
      `      // The React UI colours her lines with this hue.`,
      `      ui: { hue: 20 },`,
      `      home: 'park',`,
      `      // At the counter through the working day.`,
      `      schedule: [{ location: 'cafe', when: { all: [`,
      `        calendar.weekday(0, 1, 2, 3, 4, 5),`,
      `        calendar.period('morning', 'afternoon')] } }],`,
      `      // By the river, once she is a friend.`,
      `      talk: [`,
      `        { scene: 'ava.river', when: { all: [places.at('park'),`,
      `          { stat: 'friendship', of: '$', gte: 25 }] } },`,
      `        { scene: 'ava.hi' },`,
      `      ],`,
      `      storyline: 'ava',`,
      `      call: { scene: 'ava.call',`,
      `        when: calendar.period('evening', 'night') },`,
      `    }),`,
      `  ],`,
      `}`,
    ],
  }),
]
