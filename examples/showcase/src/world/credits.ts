/** Who made the town, for the credits page. A mod can add a group of its own, or add to one of these by its id. */
import type { Content } from '@ifloom/engine'

export const credits: Content = {
  credits: [
    {
      id: 'team',
      title: 'Made by',
      description: 'Small Town is the IFLoom showcase.',
      credits: [{ name: 'The IFLoom contributors', role: 'Writing, code and art', href: 'https://ifloom.dev/' }],
    },
  ],
}
