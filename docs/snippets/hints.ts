/**
 * src/hints.ts: reads the React UI's `transition` and `reveal` hints for a UI of your own. The Plain JS and Vue
 * snippets import it as `../hints.ts`; in a game it sits beside them.
 */
import type { SceneBeat, View } from '@ifloom/engine'

/** The screen in a view, and how it comes in and goes out, from its scene's `ui.transition`. */
export function transitionOf(view: View): { key: string; in: string; out: string; ms: number } {
  const spec = view.scene.ui?.transition
  const pair: { in?: string; out?: string; ms?: number } = typeof spec === 'string' ? { in: spec, out: spec } : (spec ?? {})
  return { key: view.scene.key, in: pair.in ?? 'none', out: pair.out ?? 'none', ms: pair.ms ?? 300 }
}

/** The beats to render, each with the reveal it waits for (how and when), or null for those shown with the scene. */
export function withReveals(beats: readonly SceneBeat[]): { beat: SceneBeat; reveal: { as: string; at: number } | null }[] {
  let at = 0
  let reveal: { as: string; at: number } | null = null
  return beats.map((beat) => {
    const hint = beat.ui?.reveal
    if (hint) {
      at += hint.delay ?? 800
      reveal = { as: hint.as ?? 'fade', at }
    }
    return { beat, reveal }
  })
}

/** True when the player asks for less motion. There's no matchMedia outside a browser, such as in tests. */
export const reducedMotion = (): boolean => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
