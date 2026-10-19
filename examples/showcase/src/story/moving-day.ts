/** Moving day: the arrival, the cat's name, the note under the door and settling in. */
import type { Content } from '@ifloom/engine'
import { at } from '@ifloom/plugin-places'

export const movingDay: Content = {
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
  ],
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
        { kind: 'collect', collection: 'notes', entry: { id: 'welcome', title: 'Welcome note', text: 'notice.welcome' } },
      ],
    },
  ],
  data: {
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
      ],
    },
  },
  prose: {
    // `*…*` is italics and `**…**` bold, inside the line.
    intro:
      'The van pulls away and leaves you on the pavement with three boxes, a key and *a cat in a basket*. The flat is above a [[tip:intro.launderette|launderette]]; it smells of **warm cotton**.',
    // The tooltip on "launderette" above.
    'intro.launderette': 'Sam from flat 2 runs it. Service washes, Monday to Saturday.',
    // Revealed after the line above: the scene's block says so with `reveal`.
    'intro.tonight': 'Tomorrow you start learning the town. Tonight you unpack, and the cat needs a name.',
    'intro#unpack': 'Unpack',
    'notice.welcome': 'Welcome to the building! Bins go out Thursday. The radiator knocks; ignore it. — Sam, flat 2',
  },
}
