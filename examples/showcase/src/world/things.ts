/**
 * What the player can have: things, each an entity. Clothes are each one
 * particular thing, and go straight to the wardrobe when you get one (the
 * game lists the wardrobe first in `receivers`); food and the newspaper
 * stack, and the inventory keeps and uses them. Their prices are the shop's,
 * from their traits. Notes are things too, read in the phone's Notes app;
 * photos are the phone's `photo` kind, made by the camera app in `phone.ts`.
 */
import type { Content } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { inventory } from '@ifloom/plugin-inventory'
import { jobs } from '@ifloom/plugin-jobs'
import { places } from '@ifloom/plugin-places'
import { shop } from '@ifloom/plugin-shop'
import { wardrobe } from '@ifloom/plugin-wardrobe'

export const things: Content = {
  // Not listed with the town's people and visitors: what you have is in the wardrobe and the inventory.
  kinds: [
    { id: 'clothing', label: 'Clothing', unique: true, listed: false },
    { id: 'item', label: 'Thing', plural: 'Things', listed: false },
    { id: 'note', label: 'Note', plural: 'Notes', listed: false },
  ],
  entities: [
    {
      id: 'raincoat',
      of: 'clothing',
      name: 'raincoat',
      description: 'Yellow, a size too big.',
      traits: { ...wardrobe.wearable('coat'), ...wardrobe.owned('player') },
    },
    // Wearing it is a small comfort: its own effects run as you put it on and take it off.
    {
      id: 'scarf',
      of: 'clothing',
      name: 'scarf',
      description: 'Knitted by someone who loved you.',
      traits: { ...wardrobe.wearable('neck', { onWear: [{ kv: 'cosy', to: true }], onTakeOff: [{ kv: 'cosy', to: false }] }) },
    },
    {
      id: 'sandwich',
      of: 'item',
      name: 'sandwich',
      description: 'Cheese and pickle, wrapped in paper.',
      traits: { ...inventory.usable('Eat the sandwich', [{ stat: 'energy', by: 25 }]), ...shop.sellable({ coins: 4 }) },
    },
    {
      id: 'flapjack',
      of: 'item',
      name: 'flapjack',
      description: 'Oats, syrup and a lot of butter.',
      traits: { ...inventory.usable('Eat the flapjack', [{ stat: 'energy', by: 10 }]), ...shop.sellable({ coins: 2 }) },
    },
    // Reading it opens the job board with only the paper's ads on it: a thing opening a panel. It's kept to read again.
    {
      id: 'paper',
      of: 'item',
      name: 'newspaper',
      description: 'Today’s Small Town Gazette. The back page is job ads.',
      traits: { ...inventory.usable('Read the job ads', [jobs.open(['dogs'])], { keep: true }), ...shop.sellable({ coins: 2 }), ...inventory.at('player') },
    },
    // Lying in the flat, out of sight until you've lived there a day: then it turns up once, with a notice, to pick up.
    {
      id: 'postcard',
      of: 'keepsake',
      name: 'A postcard',
      description: 'From the last tenant: “Look after the place. The radiator knocks, but it means well.”',
      traits: {
        ...places.lies('flat', {
          when: calendar.day({ gte: 2 }),
          onFind: [{ notify: 'Something behind the radiator', text: 'A postcard has slipped down behind it.', tag: 'post' }],
        }),
      },
    },
  ],
  data: {
    // The inventory card shows what you carry; notes and photos are in the phone.
    inventory: { kinds: [{ id: 'clothing' }, { id: 'item' }, { id: 'keepsake' }] },
    wardrobe: {
      // You arrive in your raincoat.
      slots: [
        { id: 'coat', label: 'Coat', start: 'clothing:raincoat' },
        { id: 'neck', label: 'Neck' },
      ],
    },
  },
}
