/** Your flat: home, bed, the wardrobe, Ava's text on the sill, her call, and the rent every Sunday. */
import type { Condition, Content } from '@ifloom/engine'
import { day, period, sleep, weekday } from '@ifloom/plugin-calendar'
import { messageReplied } from '@ifloom/plugin-messages'
import { at, onlyAt } from '@ifloom/plugin-places'
import { openApp } from '@ifloom/plugin-devices'
import { place } from '../place.ts'

/** Ava's text has come and hasn't been read. */
const textWaiting: Condition = {
  all: [{ custom: 'messages/arrived', with: { message: 'ava.text' } }, { not: { custom: 'messages/read', with: { message: 'ava.text' } } }],
}

export const flat: Content = {
  // Ava rings once, an evening at home after you've answered her text. Ten seconds to pick up, or it's a missed call.
  timers: [
    {
      id: 'flat.ring',
      label: 'Ringing',
      ms: 10_000,
      effects: [
        { kind: 'scene', scene: null },
        { kind: 'kv', key: 'missedAva', to: true },
        { kind: 'notify', id: 'missed-call', title: 'Missed call: Ava', tag: 'phone' },
      ],
    },
  ],
  scenes: [
    {
      id: 'flat.ring',
      title: 'The phone',
      speaker: 'ava',
      // The React UI draws the timer's countdown under this block, from its `ui.timer` hint.
      body: [{ text: 'flat.ring', ui: { timer: 'flat.ring' } }],
      choices: [
        // Answering stops the timer, so the missed call never comes.
        {
          id: 'answer',
          effects: [
            { kind: 'timer', timer: 'flat.ring', to: null },
            { kind: 'scene', scene: 'ava.call' },
          ],
        },
        {
          id: 'leave',
          effects: [
            { kind: 'timer', timer: 'flat.ring', to: null },
            { kind: 'scene', scene: null },
          ],
        },
      ],
    },
  ],
  activities: [{ id: 'openWardrobe', blocked: [onlyAt(['flat'])], effects: [{ kind: 'panel', panel: 'wardrobe' }] }],
  triggers: [
    // The phone rings at home, an evening from the day after you answered Ava's text: the scene opens with its timer running.
    {
      id: 'flat.ring',
      when: { all: [messageReplied('ava.text'), at('flat'), day({ gte: 2 }), period('evening')] },
      effects: [
        { kind: 'scene', scene: 'flat.ring' },
        { kind: 'timer', timer: 'flat.ring' },
      ],
    },
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
  data: {
    places: {
      locations: [
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
      ],
    },
  },
  prose: {
    // `[[ui:modal|…]]` is the React UI's: "the radiator knocks" opens Sam's welcome note in a dialog.
    'place.flat':
      "Boxes, mostly. The window looks over the high street, and [[ui:modal|the radiator knocks|notice.welcome|Sam's note]] when it feels like it. {{v:catName}} has claimed the warm spot on the sill.",
    // `[[act:read-text|…]]` draws the flat's "Read your messages" action here, in the line.
    'place.flat.text': 'Your phone buzzes on the sill: a message. [[act:read-text|Check it]].',
    'flat.ring': 'Your phone is ringing on the sill. Ava. Answer before it stops.',
    'flat.ring#answer': 'Answer it',
    'flat.ring#leave': 'Let it ring',
  },
}
