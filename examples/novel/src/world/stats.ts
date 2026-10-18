/** What the reader carries through every chapter: their courage. */
import { SCHEMA, type Pack } from '@ifloom/engine'

export const stats: Pack = {
  id: 'world.stats',
  schema: SCHEMA,
  stats: [{ id: 'courage', label: 'Courage', start: 1, max: 5 }],
}
