import type { Game, SceneCtx } from './game.ts'
import { storylineOf } from './storylines.ts'
import type { GameState } from './types.ts'

/** What a hand-built scene's `render` is handed besides the state. */
export function sceneContext(state: GameState, _game: Game): SceneCtx {
  return {
    flag: (key) => state.flags[key],
    storylineFlag: (storylineId, key) => storylineOf(state, storylineId).flags[key],
  }
}
