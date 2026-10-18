/**
 * Your game. It's plain data: scenes, the choices in them, a stat, and the
 * words, kept apart from the scenes in `prose` so they're easy to edit.
 *
 * The docs: https://ifloom.dev/docs/ (or `site/content/docs/` in the IFLoom checkout).
 */
import { SCHEMA, loadGame, type Pack } from '@ifloom/engine'

const story: Pack = {
  id: 'story',
  schema: SCHEMA,
  stats: [{ id: 'courage', label: 'Courage', start: 1, max: 5 }],
  // What the player can change on the settings page. A condition reads a
  // setting like a kv key: `when: { setting: 'hints' }`.
  // settings: [{ id: 'hints', label: 'Show hints', kind: 'toggle', default: true }],
  scenes: [
    {
      id: 'start',
      title: 'The door',
      body: [{ text: 'start' }],
      choices: [
        { id: 'knock', effects: [{ kind: 'stat', stat: 'courage', by: 1 }, { kind: 'scene', scene: 'inside' }] },
        { id: 'wait', effects: [{ kind: 'scene', scene: 'inside' }] },
      ],
    },
    {
      id: 'inside',
      title: 'Inside',
      // The engine remembers every choice, so a later scene can ask about one.
      body: [{ text: 'inside' }, { text: 'inside.knocked', when: { chose: 'start#knock' } }],
      // An ending's way back: `newGame` starts the story over, keeping the player's settings.
      choices: [{ id: 'again', command: { type: 'newGame' }, effects: [] }],
    },
  ],
  prose: {
    start: 'A door you have never noticed before stands at the end of the hall.',
    'start#knock': 'Knock',
    'start#wait': 'Wait for someone to open it',
    inside: 'It opens onto a quiet room with a kettle just coming to the boil.',
    'inside.knocked': 'Someone calls out that they will be with you in a minute.',
    'inside#again': 'Start again',
  },
}

/** The game, and anything the loader found wrong with it. `ifloom check` reads this. */
export default loadGame([story], { id: '{{name}}', title: '{{title}}', introScene: 'start' })
