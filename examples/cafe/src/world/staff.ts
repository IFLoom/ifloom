/** The staff: a kind of entity, the numbers each of them has, and Ana, there from the start. */
import type { Content } from '@ifloom/engine'

export const staff: Content = {
  kinds: [{ id: 'staff', label: 'Member of staff', plural: 'Staff' }],
  stats: [
    { id: 'skill', label: 'Skill', of: 'staff', start: 1, min: 1, max: 10 },
    { id: 'morale', label: 'Morale', of: 'staff', start: 60 },
    { id: 'wage', label: 'Wage', of: 'staff', start: 10, max: 50, format: '£{n}' },
  ],
  entities: [{ id: 'ana', of: 'staff', name: 'Ana', stats: { skill: 5, wage: 12 } }],
}
