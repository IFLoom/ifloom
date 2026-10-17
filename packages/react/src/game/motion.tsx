/**
 * Scene transitions and prose reveals, drawn with CSS from the view's names
 * (`view.transition` and the scene's `reveal` beats). The engine only names
 * them; the keyframes are in `theme.css`, keyed by `data-transition-in`,
 * `data-transition-out` and `data-reveal`, so a theme or a game's own CSS can
 * redraw any of them, or add its own names.
 *
 * Nothing is hidden for good: a revealed line is in the page from the start
 * (only its opacity waits), so a screen reader reads it, and a click on the
 * scene or a key press shows everything at once. With the `motion` option off,
 * or the player's system asking for reduced motion, it all shows at once.
 */
import { Component, createRef, useEffect, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
import { startRevealSkip } from '@ifloom/browser'
import { useMotionOption } from './overrides.tsx'

const REDUCED = '(prefers-reduced-motion: reduce)'

function subscribeReduced(listener: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
  const query = window.matchMedia(REDUCED)
  query.addEventListener('change', listener)
  return () => query.removeEventListener('change', listener)
}

function reducedNow(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(REDUCED).matches
}

/** Whether the player's system asks for reduced motion. Follows the setting as it changes. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReduced, reducedNow, () => false)
}

/** Whether to play transitions and reveals: the `motion` option, unless the player asks for reduced motion. */
export function useMotion(): boolean {
  const option = useMotionOption()
  const reduced = useReducedMotion()
  return option && !reduced
}

type FrameProps = {
  /** `view.transition.key`: the copy is kept, and the delay set, when it changes. */
  transitionKey: string
  /** How the screen on show leaves when the next one replaces it, and how long that takes. */
  out: string
  ms: number
  motion: boolean
  attrs: { 'data-part': string; className: string }
  children: ReactNode
}

type Leaving = { html: string; out: string; ms: number }

/**
 * Holds the scene while it changes. When `transitionKey` changes, it shows a
 * copy of the scene that was there for `ms` (its HTML, inert and hidden from
 * screen readers, with `data-leaving` and `data-transition-out`), then the
 * new scene, which comes in by its own `data-transition-in`. So one goes out,
 * then the other comes in, and the page below doesn't jump under the copy.
 *
 * A class, so the copy can be taken in `render`, while the page still shows
 * the old scene and before React replaces it.
 */
export class SceneFrame extends Component<FrameProps> {
  private readonly ref = createRef<HTMLDivElement>()
  private timer: ReturnType<typeof setTimeout> | undefined
  /** The screen on show, and how it goes out. */
  private shown: { key: string; out: string; ms: number } | null = null
  /** The copy of the screen before, while it goes. */
  private leaving: Leaving | null = null

  /** The scene on the page now, as HTML to look at and nothing more: no number key finds its buttons, and no id is in the page twice. */
  private copy(): string | null {
    const scene = this.ref.current?.querySelector(':scope > [data-part="scene"]')
    if (!scene) return null
    const copy = scene.cloneNode(true) as Element
    for (const element of copy.querySelectorAll('[data-choice-key], [id]')) {
      element.removeAttribute('data-choice-key')
      element.removeAttribute('id')
    }
    return copy.outerHTML
  }

  componentDidMount(): void {
    this.startLeaving()
  }

  componentDidUpdate(): void {
    this.startLeaving()
  }

  componentWillUnmount(): void {
    clearTimeout(this.timer)
  }

  /** Once a copy is on the page, take it away after its `ms`. */
  private startLeaving(): void {
    if (!this.leaving || this.timer !== undefined) return
    this.timer = setTimeout(() => {
      this.timer = undefined
      this.leaving = null
      this.forceUpdate()
    }, this.leaving.ms)
  }

  render() {
    const { transitionKey, out, ms, motion, attrs, children } = this.props
    const before = this.shown
    if (before && before.key !== transitionKey && !this.leaving && motion && before.out !== 'none' && before.ms > 0) {
      const html = this.copy()
      if (html) this.leaving = { html, out: before.out, ms: before.ms }
    }
    this.shown = { key: transitionKey, out, ms }
    if (!motion && this.leaving) {
      clearTimeout(this.timer)
      this.timer = undefined
      this.leaving = null
    }
    const leaving = this.leaving
    const style = { '--ifloom-transition-ms': `${leaving ? leaving.ms : ms}ms` } as CSSProperties
    return (
      <div ref={this.ref} {...attrs} style={style} data-motion={motion ? undefined : 'off'}>
        {leaving ? (
          <div data-leaving="" data-transition-out={leaving.out} aria-hidden="true" inert dangerouslySetInnerHTML={{ __html: leaving.html }} />
        ) : (
          children
        )}
      </div>
    )
  }
}

export { lastReveal, revealGroups } from '@ifloom/browser'

/**
 * Show everything at once on the first key press while reveals are pending,
 * and keep that key from doing anything else, so a number key can't pick a
 * choice that isn't shown yet.
 */
export function useSkipKey(pending: boolean, skip: () => void): void {
  useEffect(() => (pending ? startRevealSkip(skip) : undefined), [pending, skip])
}

/** The style that times a reveal: `--ifloom-reveal-at`, from the scene coming on. */
export function revealStyle(at: number): CSSProperties {
  return { '--ifloom-reveal-at': `${at}ms` } as CSSProperties
}
