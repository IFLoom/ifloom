/** Interviews: the scene a card in the window opens, where you hire Dev, Fen or nobody. */
import type { Content } from '@ifloom/engine'

export const hiring: Content = {
  scenes: [
    {
      id: 'hiring',
      title: 'Interviews',
      body: [{ text: 'Two people answer the card in the window. Wages are {{v:game/payroll}} a week already.' }],
      choices: [
        {
          id: 'dev',
          label: 'Dev: keen, cheap, still learning',
          effects: [{ create: 'staff', with: { name: 'Dev', stats: { skill: 2, wage: 8, morale: 80 } } }, { scene: null }],
        },
        {
          id: 'fen',
          label: 'Fen: ten years in kitchens, and knows it',
          effects: [{ create: 'staff', with: { name: 'Fen', stats: { skill: 7, wage: 18 } } }, { scene: null }],
        },
        { id: 'nobody', label: 'Not this week', effects: [{ scene: null }] },
      ],
    },
  ],
}
