import type { RunnerSnapshot } from '@ifloom/engine'

/** The scene's picture behind its words: its bottom layer as the story's background, and none for a scene without one. */
export function drawBackground(story: HTMLElement, { view }: RunnerSnapshot): void {
  const layer = view.scene.picture?.layers[0]
  // A video layer can't be a CSS background, so it's left to drawPicture.
  story.style.backgroundImage = layer && !layer.video ? `url("${layer.src}")` : ''
  story.style.backgroundSize = 'cover'
  story.style.backgroundPosition = 'center'
}
