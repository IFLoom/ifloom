/** Interviews: the scene a card in the window opens, where you hire Dev, Fen or nobody. */
import type { Content } from '@ifloom/engine'

export const hiring: Content = {
  scenes: [
    {
      id: 'hiring',
      title: 'Interviews',
      body: [{ text: 'hiring' }],
      choices: [
        {
          id: 'dev',
          effects: [
            { kind: 'create', of: 'staff', entity: { name: 'Dev', stats: { skill: 2, wage: 8, morale: 80 } } },
            { kind: 'scene', scene: null },
          ],
        },
        {
          id: 'fen',
          effects: [
            { kind: 'create', of: 'staff', entity: { name: 'Fen', stats: { skill: 7, wage: 18 } } },
            { kind: 'scene', scene: null },
          ],
        },
        { id: 'nobody', effects: [{ kind: 'scene', scene: null }] },
      ],
    },
  ],
  prose: {
    hiring: 'Two people answer the card in the window. Wages are {{v:game/payroll}} a week already.',
    'hiring#dev': 'Dev: keen, cheap, still learning',
    'hiring#fen': 'Fen: ten years in kitchens, and knows it',
    'hiring#nobody': 'Not this week',
  },
}
