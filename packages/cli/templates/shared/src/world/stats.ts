/** The stats the whole game keeps. A scene in any area can read or change them. */
import { SCHEMA, type Pack } from '@ifloom/engine'

export const stats: Pack = {
  id: 'world.stats',
  schema: SCHEMA,
  stats: [{ id: 'courage', label: 'Courage', start: 1, max: 5 }],
}
