/** What the player can change on the settings page. */
import type { Content } from '@ifloom/engine'

export const settings: Content = {
  // What the player can change on the settings page. `hints` is part of the
  // game (the high street reads it); `textSize` only changes how the page looks,
  // and the React UI sizes the page by it, as `ui.settings` below says.
  settings: [
    { id: 'hints', label: 'Show hints', type: 'toggle', default: true },
    {
      id: 'textSize',
      label: 'Text size',
      type: 'choice',
      affects: 'ui',
      options: [
        { value: 'normal', label: 'Normal' },
        { value: 'large', label: 'Large' },
      ],
      default: 'normal',
    },
  ],
  // The React UI copies `textSize` to <html data-text-size>, which its styles size the page by.
  ui: { settings: { textSize: 'textSize' } },
}
