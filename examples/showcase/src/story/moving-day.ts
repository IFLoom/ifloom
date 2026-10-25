/** Moving day: the arrival, the cat's name, the note under the door and settling in. */
import { give, text, type Content } from '@ifloom/engine'
import { at } from '@ifloom/plugin-places'

/** Sam's note under the door: the notice's words, and the note's, kept in the phone's Notes app. */
const WELCOME = 'Welcome to the building! Bins go out Thursday. The radiator knocks; ignore it. — Sam, flat 2'

export const movingDay: Content = {
  // The game opens on moving day, and only moves through its scene until you unpack.
  introScene: 'intro',
  kv: { phase: 'arrival' },
  locks: [{ id: 'moving-day', when: { kv: 'phase', is: ['arrival'] }, deny: ['*'], except: ['choose', 'input'], reason: 'Unpack first.' }],
  scenes: [
    {
      id: 'intro',
      title: 'Moving day',
      // The React UI's hints: it fades in from the title page, and its second paragraph comes after a pause.
      ui: { transition: { in: 'fade', out: 'fade', ms: 500 } },
      body: [
        // `*…*` is italics and `**…**` bold, inside the line, and the tooltip on "launderette" is the prose `intro.launderette`.
        text(
          'The van pulls away and leaves you on the pavement with three boxes, a key and *a cat in a basket*. The flat is above a [[tip:intro.launderette|launderette]]; it smells of **warm cotton**.',
          // An id names the block for a translation's words table, `scene.intro.text.arrival`, however its words change.
          { id: 'arrival' },
        ),
        // Revealed after the line above, by its `ui.reveal` hint.
        text('Tomorrow you start learning the town. Tonight you unpack, and the cat needs a name.', { id: 'tonight', ui: { reveal: { delay: 1200 } } }),
      ],
      choices: [
        {
          id: 'unpack',
          label: 'Unpack',
          // The flat slides up into view once the boxes are in.
          ui: { transition: { in: 'slide-up', ms: 400 } },
          effects: [{ scene: null }, { kv: 'phase', to: 'open' }],
        },
      ],
    },
  ],
  // Sam's note: the notice says it, and you keep it in the phone's Notes app.
  entities: [{ id: 'welcome', of: 'note', name: 'Welcome note', desc: WELCOME }],
  // On moving day the cat needs a name; the prose says it from then on.
  inputs: [{ id: 'catName', label: 'Name your cat', type: 'text', maxLength: 16, when: { kv: 'phase', is: ['arrival'] } }],
  triggers: [
    // A note under the door the first time the player steps out.
    {
      id: 'welcome',
      when: at('high-street'),
      effects: [{ notify: 'A note under your door', text: WELCOME, tag: 'post' }, give('note:welcome')],
    },
  ],
  data: {
    quests: {
      quests: [
        {
          id: 'settle',
          title: 'Settle in',
          summary: 'New town, new flat. Find your feet.',
          starts: { kv: 'phase', is: ['open'] },
          stages: [
            { id: 'out', hint: 'Step out onto the high street.', done: at('high-street') },
            { id: 'ava', hint: 'Somebody runs the café. Say hello.', done: { seen: 'ava.hi' } },
            { id: 'post', hint: 'Take a photo with someone and post it.', done: { 'feed/posted': { gte: 1 } } },
          ],
        },
      ],
    },
  },
  prose: {
    // The tooltip on "launderette" in the scene, and Sam's note the flat's radiator opens: lines read by key.
    'intro.launderette': 'Sam from flat 2 runs it. Service washes, Monday to Saturday.',
    'notice.welcome': WELCOME,
  },
}
