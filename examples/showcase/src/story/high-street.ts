/** The high street: the way to everywhere, the weather, and the market's scarves. */
import { give, holding, type Content } from '@ifloom/engine'
import { onlyAt } from '@ifloom/plugin-places'
import { place } from '../place.ts'

export const highStreet: Content = {
  activities: [
    {
      id: 'buyScarf',
      cost: { stats: { coins: 8 } },
      blocked: [onlyAt(['high-street']), { when: holding('clothing:scarf'), reason: 'You have one.' }],
      effects: [give('clothing:scarf')],
    },
  ],
  variants: {
    'street.weather': ['street.weather.drizzle', 'street.weather.sun', 'street.weather.wind'],
  },
  data: {
    places: {
      locations: [
        {
          ...place({ id: 'high-street', name: 'High Street', tags: ['outdoors'], exits: ['flat', 'cafe', 'park', 'office'] }),
          // The street, then a line about the weather, drawn afresh each day.
          body: [{ text: 'place.high-street' }, { variants: 'street.weather' }, { text: 'place.high-street.hint', when: { setting: 'hints' } }],
          actions: [{ id: 'scarf', label: 'Buy a scarf at the market', command: { type: 'activity', id: 'buyScarf' } }],
        },
      ],
    },
  },
  prose: {
    'place.high-street': 'A bakery, a launderette, a bus stop with a bench nobody sits on. The café on the corner has its door propped open.',
    'place.high-street.hint': 'Hint: the café is open in the day, and whoever runs it likes a chat.',
    'street.weather.drizzle': 'A fine drizzle that never quite becomes rain.',
    'street.weather.sun': 'Sun on the shopfronts; someone has put a chair out on the pavement.',
    'street.weather.wind': 'Wind down the street, rattling the bakery sign.',
  },
}
