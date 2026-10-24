/**
 * The opening of the story: its scenes, the choices in them, and their words
 * in `prose`, kept apart from the scenes so they're easy to edit. Once the
 * words grow long, move `prose` to an `opening.prose.ts` beside this file.
 */
import type { Content } from '@ifloom/engine'

export const opening: Content = {
  // The story opens on this scene.
  introScene: 'start',
  scenes: [
    {
      id: 'start',
      title: 'The door',
      body: [{ text: 'start' }],
      choices: [
        {
          id: 'knock',
          effects: [
            { kind: 'stat', stat: 'courage', by: 1 },
            { kind: 'scene', scene: 'inside' },
          ],
        },
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
