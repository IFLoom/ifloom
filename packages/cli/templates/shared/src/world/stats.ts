/** The stats the whole game keeps. A scene in any area can read or change them. */
import type { Content } from '@ifloom/engine'

export const stats: Content = {
  stats: [{ id: 'courage', label: 'Courage', start: 1, max: 5 }],
}
