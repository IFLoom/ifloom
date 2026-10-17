import type { Game, SceneCtx } from './game.ts'
import { storylineOf } from './storylines.ts'
import type { GameState } from './types.ts'

/** What a hand-built scene's `render` is handed besides the state. `picks` is where a render's new pool picks go, when given. */
export function sceneContext(state: GameState, _game: Game, picks?: Record<string, string>): SceneCtx {
  const ctx: SceneCtx = {
    kv: (key) => state.kv[key],
    storylineKv: (storylineId, key) => storylineOf(state, storylineId).kv[key],
  }
  if (picks) ctx.picks = picks
  return ctx
}
