import type { PictureView, RunnerSnapshot } from '@ifloom/engine'
// runner and add, as in the vanilla template's src/main.ts.
import { add, runner } from './runner.ts'

/** The scene's layered picture, else its image. */
export function drawPicture(parent: HTMLElement, { view }: RunnerSnapshot): void {
  if (view.scene.picture) drawLayers(parent, view.scene.picture)
  else if (view.scene.image) Object.assign(add(parent, 'img'), { src: view.scene.image, alt: '' })
}

/** Layers stacked bottom first, with each hotspot a button placed by its rect, in percent of the picture. */
function drawLayers(parent: HTMLElement, picture: PictureView): void {
  const box = add(parent, 'div', '', 'picture')
  Object.assign(box.style, { position: 'relative', aspectRatio: picture.aspect ?? 'auto' })
  for (const layer of picture.layers) {
    const shown = add(box, layer.video ? 'video' : 'img')
    Object.assign(shown, { src: layer.src, alt: '' })
    Object.assign(shown.style, { position: 'absolute', inset: '0', width: '100%', height: '100%' })
  }
  for (const hotspot of picture.hotspots) {
    const [left, top, width, height] = hotspot.rect
    const button = add(box, 'button', '', 'hotspot')
    button.setAttribute('aria-label', hotspot.label)
    button.title = hotspot.disabled ?? hotspot.label
    button.disabled = Boolean(hotspot.disabled)
    Object.assign(button.style, { position: 'absolute', left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` })
    button.onclick = () => runner.apply(hotspot.command)
  }
}
