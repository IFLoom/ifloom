import { Scene, useGame } from '@ifloom/react'

// The scene's picture behind its words: its bottom layer as the background of a box round the Scene.
// Put it in your layout's Story in place of Scene. Scene still renders the picture above the words too.
export function SceneBackground() {
  const { view } = useGame()
  const layer = view.scene.picture?.layers[0]
  const backgroundImage = layer && !layer.video ? `url("${layer.src}")` : undefined
  return (
    <div className="scene-background" style={{ backgroundImage, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <Scene />
    </div>
  )
}
