import { LayeredPicture, Picture, useGame } from '@ifloom/react'

// Scene renders the scene's picture above its words. To put it somewhere else, render it from the view yourself:
// LayeredPicture stacks the layers and places each hotspot as a button.
export function ScenePicture() {
  const { view } = useGame()
  if (view.scene.picture) return <LayeredPicture picture={view.scene.picture} />
  return view.scene.image ? <Picture src={view.scene.image} alt="" /> : null
}
