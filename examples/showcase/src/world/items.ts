/** What the player can carry, and the clothes among it that the wardrobe puts on. */
import { SCHEMA, type Pack } from '@ifloom/engine'
import { openJobs } from '@ifloom/plugin-jobs'

export const items: Pack = {
  id: 'world.items',
  schema: SCHEMA,
  items: [
    { id: 'raincoat', name: 'raincoat', desc: 'Yellow, a size too big.', start: 1 },
    { id: 'scarf', name: 'scarf', desc: 'Knitted by someone who loved you.' },
    {
      id: 'sandwich',
      name: 'sandwich',
      desc: 'Cheese and pickle, wrapped in paper.',
      use: { label: 'Eat the sandwich', effects: [{ kind: 'stat', stat: 'energy', by: 25 }] },
    },
    {
      id: 'flapjack',
      name: 'flapjack',
      desc: 'Oats, syrup and a lot of butter.',
      use: { label: 'Eat the flapjack', effects: [{ kind: 'stat', stat: 'energy', by: 10 }] },
    },
    // Reading it opens the job board with only the paper's ads on it: an item opening a panel.
    {
      id: 'paper',
      name: 'newspaper',
      desc: 'Today’s Small Town Gazette. The back page is job ads.',
      start: 1,
      use: { label: 'Read the job ads', effects: [openJobs(['dogs'])] },
    },
  ],
  data: {
    wardrobe: {
      // You arrive in your raincoat.
      slots: [
        { id: 'coat', label: 'Coat', start: 'raincoat' },
        { id: 'neck', label: 'Neck' },
      ],
      clothes: [
        { id: 'raincoat', slot: 'coat' },
        { id: 'scarf', slot: 'neck' },
      ],
    },
  },
}
