import type { Scene } from '../../src/game.ts'
import type { DataScene } from '../../src/scene.ts'

/**
 * A scene already baked, the form the engine runs: for the tests that count
 * a scene's renders or make one throw. Content can't write one; the engine
 * passes it through as it is.
 */
export function baked(scene: Scene): DataScene {
  return scene as unknown as DataScene
}
