/** The staff: a kind of entity (each one a particular person), the numbers each of them has, and Ana, there from the start. */
import type { Content } from '@ifloom/engine'

export const staff: Content = {
  kinds: [{ id: 'staff', label: 'Member of staff', plural: 'Staff', unique: true }],
  stats: [
    { id: 'skill', label: 'Skill', of: 'staff', start: 1, min: 1, max: 10 },
    { id: 'morale', label: 'Morale', of: 'staff', start: 60 },
    { id: 'wage', label: 'Wage', of: 'staff', start: 10, max: 50, format: '£{n}' },
  ],
  entities: [{ id: 'ana', of: 'staff', name: 'Ana', description: 'Has run the kitchen since the day you opened.', stats: { skill: 5, wage: 12 } }],
}
