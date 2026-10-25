/**
 * The café's own code: the week's sums, worked out from the state. Content
 * calls them by name, `{ 'game/takings': true }` and `{{v:game/payroll}}`.
 */
import { entitiesOf, statValue, type EffectRef, type Game, type GameRules, type GameState } from '@ifloom/engine'

/** The café's calls, declared so content written in code is checked against them. */
declare module '@ifloom/engine' {
  interface EffectCalls {
    'game/takings': true
    'game/wages': true
  }
}

/** The sum of one stat over every entity of a kind. */
function total(state: GameState, game: Game, kind: string, stat: string): number {
  return entitiesOf(state, game, kind).reduce((sum, ref) => sum + statValue(state, game, stat, ref), 0)
}

/** The week's sums: worked out from the state, so they are the game's own code. */
export const rules: GameRules = {
  effects: {
    // Each dish sells by its price and quality, and the kitchen's skill decides how many go out.
    takings: (state, _args, { game }): EffectRef[] => {
      if (entitiesOf(state, game, 'staff').length === 0) return []
      const covers = 10 + total(state, game, 'staff', 'skill') * 2 + Math.floor((state.stats.reputation ?? 0) / 5)
      const perCover = entitiesOf(state, game, 'dish').reduce(
        (sum, ref) => sum + statValue(state, game, 'price', ref) * statValue(state, game, 'quality', ref),
        0,
      )
      return [{ stat: 'coins', by: Math.round((covers * perCover) / 10) }]
    },
    wages: (state, _args, { game }): EffectRef[] => [{ stat: 'coins', by: -total(state, game, 'staff', 'wage') }],
  },
  values: {
    payroll: (state, _args, { game }) => total(state, game, 'staff', 'wage'),
  },
}
