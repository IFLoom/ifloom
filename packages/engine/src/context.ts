import type { Game, SceneCtx } from './game.ts'
import { storylineOf } from './storylines.ts'
import type { GameState } from './types.ts'

/** What a hand-built scene's `render` is handed besides the state. `picks` is where a render's new pool picks go, when given. */
export function sceneContext(state: GameState, _game: Game, picks?: Record<string, string>): SceneCtx {
  const ctx: SceneCtx = {
    kv: (key, of) => (of?.startsWith('storyline:') ? storylineOf(state, of.slice('storyline:'.length)).kv[key] : state.kv[key]),
  }
  if (picks) ctx.picks = picks
  return ctx
}
