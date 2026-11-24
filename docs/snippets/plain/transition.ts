import type { RunnerSnapshot, View } from '@ifloom/engine'
import { reducedMotion, transitionOf, withReveals } from '../hints.ts'
// add, as in the vanilla template's src/main.ts.
import { add } from './runner.ts'

/** The view whose scene is on the page, and the wait before the next one comes in. */
let shown: View | null = null
let timer: ReturnType<typeof setTimeout> | undefined

/** The scene's title and words in an <article>, coming in by its transition, each revealed line after its delay. */
function article(view: View, entering: boolean): HTMLElement {
  const scene = document.createElement('article')
  const transition = transitionOf(view)
  scene.style.setProperty('--ms', `${transition.ms}ms`)
  // Rendered again on the same screen, its reveals have played already.
  if (entering && !reducedMotion()) scene.dataset.transitionIn = transition.in
  else scene.dataset.revealed = ''
  // A click shows every line at once.
  scene.onclick = () => (scene.dataset.revealed = '')
  add(scene, 'h2', view.scene.title)
  for (const { beat, reveal } of withReveals(view.scene.beats)) {
    if (beat.type !== 'text' && beat.type !== 'say') continue
    const line = add(scene, 'p', beat.text)
    if (reveal && !reducedMotion()) {
      line.dataset.reveal = reveal.as
      line.style.setProperty('--at', `${reveal.at}ms`)
    }
  }
  return scene
}

/** The scene, in a box that stays on the page. When the screen changes, the old one goes out by its `out`, then the new one comes in. */
export function drawTransition(box: HTMLElement, { view }: RunnerSnapshot): void {
  const before = shown
  shown = view
  clearTimeout(timer)
  const old = box.querySelector<HTMLElement>('article')
  const going = before && transitionOf(before)
  const changed = going !== null && going.key !== view.scene.key
  if (going && changed && old && !reducedMotion() && going.out !== 'none') {
    // The screen before goes out, and can't be pressed or read out meanwhile.
    old.dataset.transitionOut = going.out
    old.style.setProperty('--ms', `${going.ms}ms`)
    old.setAttribute('aria-hidden', 'true')
    old.inert = true
    timer = setTimeout(() => box.replaceChildren(article(view, true)), going.ms)
    return
  }
  box.replaceChildren(article(view, before === null || changed))
}
