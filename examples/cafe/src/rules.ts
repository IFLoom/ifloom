/**
 * The café's own code: the week's sums, worked out from the state. Content
 * calls them by name, `{ custom: 'takings' }` and `{{v:payroll}}`.
 */
import { entitiesOf, entityOf, type Custom, type EffectRef, type GameState } from '@ifloom/engine'

/** The sum of one stat over every entity of a kind. */
function total(state: GameState, kind: string, stat: string): number {
  return entitiesOf(state, kind).reduce((sum, ref) => sum + (entityOf(state, ref)?.stats[stat] ?? 0), 0)
}

/** The week's sums: worked out from the state, so they are the game's own code. */
export const custom: Custom = {
  effects: {
    // Each dish sells by its price and quality, and the kitchen's skill decides how many go out.
    takings: (state): EffectRef[] => {
      if (entitiesOf(state, 'staff').length === 0) return []
      const covers = 10 + total(state, 'staff', 'skill') * 2 + Math.floor((state.stats.reputation ?? 0) / 5)
      const perCover = entitiesOf(state, 'dish').reduce((sum, ref) => {
        const dish = entityOf(state, ref)!
        return sum + dish.stats.price * dish.stats.quality
      }, 0)
      return [{ kind: 'stat', stat: 'coins', by: Math.round((covers * perCover) / 10) }]
    },
    wages: (state): EffectRef[] => [{ kind: 'stat', stat: 'coins', by: -total(state, 'staff', 'wage') }],
  },
  values: {
    payroll: (state) => total(state, 'staff', 'wage'),
  },
}
