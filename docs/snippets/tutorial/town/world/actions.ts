// src/world/actions.ts
import type { Content } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'

export const actions: Content = {
  actions: [
    { id: 'wait', label: 'Wait a while', effects: [calendar.pass(1)] },
    { id: 'bed', label: 'Go to bed', command: calendar.sleep() },
  ],
}
