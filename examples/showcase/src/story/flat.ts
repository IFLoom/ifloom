/** Your flat: home, bed, the wardrobe, Ava's text on the sill, and the rent every Sunday. */
import { SCHEMA, type Condition, type Pack } from '@ifloom/engine'
import { day, sleep, weekday } from '@ifloom/plugin-calendar'
import { onlyAt } from '@ifloom/plugin-places'
import { openApp } from '@ifloom/plugin-devices'
import { place } from '../place.ts'

/** Ava's text has come and hasn't been read. */
const textWaiting: Condition = {
  all: [{ custom: 'messages/arrived', with: { message: 'ava.text' } }, { not: { custom: 'messages/read', with: { message: 'ava.text' } } }],
}

export const flat: Pack = {
  id: 'story.flat',
  schema: SCHEMA,
  activities: [{ id: 'openWardrobe', blocked: [onlyAt(['flat'])], effects: [{ kind: 'panel', panel: 'wardrobe' }] }],
  triggers: [
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
    'place.flat':
      'Boxes, mostly. The window looks over the high street, and the radiator knocks when it feels like it. {{v:catName}} has claimed the warm spot on the sill.',
    // `[[act:read-text|…]]` draws the flat's "Read your messages" action here, in the line.
    'place.flat.text': 'Your phone buzzes on the sill: a message. [[act:read-text|Check it]].',
  },
}
