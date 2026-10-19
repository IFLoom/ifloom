/** What the player can change on the settings page. */
import type { Content } from '@ifloom/engine'

export const settings: Content = {
  // What the player can change on the settings page. `hints` is part of the
  // game (the high street reads it); `textSize` only changes how the page looks,
  // and main.tsx puts it on the page root for styles.css.
  settings: [
    { id: 'hints', label: 'Show hints', kind: 'toggle', default: true },
    {
      id: 'textSize',
      label: 'Text size',
      kind: 'choice',
      affects: 'ui',
      options: [
        { value: 'normal', label: 'Normal' },
        { value: 'large', label: 'Large' },
      ],
      default: 'normal',
    },
  ],
}
