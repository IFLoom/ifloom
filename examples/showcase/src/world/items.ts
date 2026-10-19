/**
 * What the player can carry: things, each an entity. Clothes are each one
 * particular thing, worn by the wardrobe; food and the newspaper stack, and
 * the inventory uses them. Their prices are the shop's, from their traits.
 */
import type { Content } from '@ifloom/engine'
import { usable } from '@ifloom/plugin-inventory'
import { openJobs } from '@ifloom/plugin-jobs'
import { sellable } from '@ifloom/plugin-shop'
import { wearable } from '@ifloom/plugin-wardrobe'

export const items: Content = {
  // Not listed with the town's people and visitors: what you hold is in `view.held`.
  kinds: [
    { id: 'clothing', label: 'Clothing', unique: true, listed: false },
    { id: 'item', label: 'Thing', plural: 'Things', listed: false },
  ],
  entities: [
    { id: 'raincoat', of: 'clothing', name: 'raincoat', desc: 'Yellow, a size too big.', at: 'player', traits: { ...wearable('coat') } },
    { id: 'scarf', of: 'clothing', name: 'scarf', desc: 'Knitted by someone who loved you.', traits: { ...wearable('neck') } },
    {
      id: 'sandwich',
      of: 'item',
      name: 'sandwich',
      desc: 'Cheese and pickle, wrapped in paper.',
      traits: { ...usable('Eat the sandwich', [{ kind: 'stat', stat: 'energy', by: 25 }]), ...sellable({ coins: 4 }) },
    },
    {
      id: 'flapjack',
      of: 'item',
      name: 'flapjack',
      desc: 'Oats, syrup and a lot of butter.',
      traits: { ...usable('Eat the flapjack', [{ kind: 'stat', stat: 'energy', by: 10 }]), ...sellable({ coins: 2 }) },
    },
    // Reading it opens the job board with only the paper's ads on it: a thing opening a panel. It's kept to read again.
    {
      id: 'paper',
      of: 'item',
      name: 'newspaper',
      desc: 'Today’s Small Town Gazette. The back page is job ads.',
      at: 'player',
      traits: { ...usable('Read the job ads', [openJobs(['dogs'])], { keep: true }), ...sellable({ coins: 2 }) },
    },
  ],
  data: {
    wardrobe: {
      // You arrive in your raincoat.
      slots: [
        { id: 'coat', label: 'Coat', start: 'clothing:raincoat' },
        { id: 'neck', label: 'Neck' },
      ],
    },
  },
}
