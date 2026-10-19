/** The menu: dishes as a kind of entity, each with a price and a quality. */
import type { Content } from '@ifloom/engine'

export const menu: Content = {
  kinds: [{ id: 'dish', label: 'Dish', plural: 'Menu' }],
  stats: [
    { id: 'price', label: 'Price', of: 'dish', start: 4, min: 1, max: 20, format: '£{n}' },
    { id: 'quality', label: 'Quality', of: 'dish', start: 2, min: 1, max: 5 },
  ],
  entities: [
    { id: 'toast', of: 'dish', name: 'Cheese on toast', stats: { price: 4, quality: 2 } },
    { id: 'soup', of: 'dish', name: 'Soup of the day', stats: { price: 6, quality: 3 } },
  ],
}
