/** Your flat: home, bed, the wardrobe, Ava's text on the sill, her call, and the rent every Sunday. */
import { text, type Condition, type Content } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { messages } from '@ifloom/plugin-messages'
import { places } from '@ifloom/plugin-places'
import { devices } from '@ifloom/plugin-devices'
import { wardrobe } from '@ifloom/plugin-wardrobe'
import { place } from '../place.ts'

/** Ava's text has come and hasn't been read. */
const textWaiting: Condition = {
  all: [{ 'messages/arrived': { message: 'ava.text' } }, { not: { 'messages/read': { message: 'ava.text' } } }],
}

export const flat: Content = {
  // Ava rings once, an evening at home after you've answered her text. Ten seconds to pick up, or it's a missed call.
  timers: [
    {
      id: 'flat.ring',
      label: 'Ringing',
      ms: 10_000,
      effects: [{ scene: null }, { kv: 'missedAva', to: true }, { notify: 'Missed call: Ava', id: 'missed-call', tag: 'phone' }],
    },
  ],
  scenes: [
    {
      id: 'flat.ring',
      title: 'The phone',
      speaker: 'ava',
      // The React UI draws the timer's countdown under this block, from its `ui.timer` hint.
      body: [{ text: 'Your phone is ringing on the sill. Ava. Answer before it stops.', ui: { timer: 'flat.ring' } }],
      choices: [
        // Answering stops the timer, so the missed call never comes.
        {
          id: 'answer',
          label: 'Answer it',
          effects: [{ timer: 'flat.ring', to: null }, { scene: 'ava.call' }],
        },
        {
          id: 'leave',
          label: 'Let it ring',
          effects: [{ timer: 'flat.ring', to: null }, { scene: null }],
        },
      ],
    },
  ],
  triggers: [
    // The phone rings at home, an evening from the day after you answered Ava's text: the scene opens with its timer running.
    {
      id: 'flat.ring',
      when: { all: [messages.replied('ava.text'), places.at('flat'), calendar.day({ gte: 2 }), calendar.period('evening')] },
      effects: [{ scene: 'flat.ring' }, { timer: 'flat.ring' }],
    },
    // Rent, every Sunday from the first week on: the town's one bill, so money has somewhere to go.
    {
      id: 'rent',
      once: { per: 'turn' },
      when: { all: [calendar.weekday(6), calendar.day({ gte: 6 })] },
      effects: [
        { stat: 'coins', by: -30 },
        { notify: 'Rent paid: 30 coins', id: 'rent', tag: 'money' },
      ],
    },
  ],
  entities: [
    place({
      id: 'flat',
      name: 'Your flat',
      description: 'Home',
      exits: ['high-street'],
      // A place to change: the wardrobe's closet trait gives the flat an "Open the wardrobe" button that opens its panel.
      // The layout also shows what you're wearing, at home only.
      traits: { ...wardrobe.closet({ label: 'Open the wardrobe' }) },
      body: [
        // `[[ui:modal|…]]` is the React UI's: "the radiator knocks" opens Sam's welcome note, the prose `notice.welcome`, in a dialog.
        text(
          "Boxes, mostly. The window looks over the high street, and [[ui:modal|the radiator knocks|notice.welcome|Sam's note]] when it feels like it. {{catName}} has claimed the warm spot on the sill.",
        ),
        // Once Ava's text has come and until it's read, a line with a link that opens the phone: `[[act:read-text|…]]`
        // draws the flat's "Read your messages" action here, in the line.
        text('Your phone buzzes on the sill: a message. [[act:read-text|Check it]].', { when: textWaiting }),
      ],
      actions: [
        { id: 'bed', label: 'Go to bed', command: calendar.sleep() },
        // Drawn inline by `[[act:read-text|…]]` in the line above, so it isn't a button as well.
        { id: 'read-text', label: 'Read your messages', when: textWaiting, command: devices.open('texts') },
      ],
    }),
  ],
}
