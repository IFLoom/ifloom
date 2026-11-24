/**
 * The opening of the story: its scenes, the choices in them and their words,
 * written where they are read. A block of words is `text(…)`, and a choice
 * is `{ id, label, effects }`. To translate the game, a pack's `words` table
 * gives these fields other words: https://ifloom.dev/docs/how-to/translate-your-game
 */
import { text, type Content } from '@ifloom/engine'

export const opening: Content = {
  // The story opens on this scene.
  introScene: 'start',
  scenes: [
    {
      id: 'start',
      title: 'The door',
      body: [text('A door you have never noticed before stands at the end of the hall.')],
      choices: [
        { id: 'knock', label: 'Knock', effects: [{ stat: 'courage', by: 1 }, { scene: 'inside' }] },
        { id: 'wait', label: 'Wait for someone to open it', effects: [{ scene: 'inside' }] },
      ],
    },
    {
      id: 'inside',
      title: 'Inside',
      body: [
        text('It opens onto a quiet room with a kettle just coming to the boil.'),
        // The engine remembers every choice, so a later scene can ask about one.
        text('Someone calls out that they will be with you in a minute.', { when: { chose: 'start#knock' } }),
      ],
      // An ending's way back: `newGame` starts the story over, keeping the player's settings.
      choices: [{ id: 'again', label: 'Start again', command: { type: 'newGame' }, effects: [] }],
    },
  ],
}
