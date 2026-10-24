import { loadGame, type Loaded, type Content } from '../../src/loader.ts'
import type { GameRules } from '../../src/game.ts'
import { fixture, townProse } from './town.ts'

/**
 * A café counter as data: a scene with prose, a line drawn from variants, a
 * choice that only lands once a day, and one condition of its own: everything a
 * data scene needs, loaded the way a game loads, with no runtime written by
 * hand.
 */
export const cafe: Content = {
  name: 'cafe',
  scenes: [
    {
      id: 'cafe.counter',
      title: 'The counter',
      body: [{ text: 'cafe.counter' }, { variants: 'cafe.weather' }, { text: 'cafe.counter/regular', when: { 'game/isRegular': true } }],
      choices: [
        {
          id: 'chat',
          once: { per: 'turn', reason: 'She has heard enough from you today.' },
          effects: [{ kind: 'stat', stat: 'luck', by: 1 }],
        },
        { id: 'leave', effects: [{ kind: 'scene', scene: null }] },
      ],
    },
  ],
  prose: {
    'cafe.counter': 'Rosa wipes the counter. "Morning, {{playerFirst}}."',
    'cafe.counter/regular': 'She has your cup out before you ask.',
    'cafe.counter#chat': 'Talk about the weather',
    'cafe.counter#leave': 'Leave',
    'cafe.weather/rain': 'Rain on the window.',
    'cafe.weather/sun': 'Sun on the tables.',
    'cafe.weather/fog': 'Fog in the street.',
  },
  variants: {
    'cafe.weather': ['cafe.weather/rain', 'cafe.weather/sun', 'cafe.weather/fog'],
  },
}

/** The café's own code: one condition, called as `game/isRegular`. */
export const cafeRules: GameRules = {
  conditions: { isRegular: (state) => (state.seen['cafe.counter']?.n ?? 0) >= 3 },
}

/** The town with the café loaded over it. */
export function withCafe(): Loaded {
  const town = fixture()
  const { scenes, storylines, activities, stats, introScene, startPhase, actions, ...rest } = town
  const townPack: Content = {
    name: 'town',
    scenes,
    storylines,
    activities,
    stats,
    introScene,
    startPhase,
    actions,
    prose: townProse,
  }
  const { id, title, rules } = rest
  return loadGame([townPack, cafe], { id, title, rules: { ...rules, ...cafeRules } })
}
