import type { SceneBeat } from '@ifloom/engine'
import { ignoredKey } from './keys.ts'

/** A `reveal` beat: where a scene's prose holds back, and when what follows shows. */
export type RevealBeat = Extract<SceneBeat, { kind: 'reveal' }>

/** A run of a scene's beats, and the reveal that holds it back (null for the first, shown with the scene). */
export type RevealGroup = {
  reveal: RevealBeat | null
  /** Its beats, each with its index in the scene's beats. */
  beats: { beat: SceneBeat; index: number }[]
}

/** A scene's beats in groups: those shown with the scene, then each reveal and the beats after it. */
export function revealGroups(beats: readonly SceneBeat[]): RevealGroup[] {
  const groups: RevealGroup[] = [{ reveal: null, beats: [] }]
  beats.forEach((beat, index) => {
    if (beat.kind === 'reveal') groups.push({ reveal: beat, beats: [] })
    else groups.at(-1)!.beats.push({ beat, index })
  })
  return groups
}

/** When the last reveal in these beats comes, in milliseconds from the scene coming on; 0 with none. */
export function lastReveal(beats: readonly SceneBeat[]): number {
  return beats.reduce((last, beat) => (beat.kind === 'reveal' ? Math.max(last, beat.at) : last), 0)
}

/**
 * Until stopped, the next key press calls `skip`, to show everything a scene
 * still holds back, and does nothing else: it listens before other shortcuts
 * and swallows the key, so a number key can't pick a choice that isn't shown
 * yet. Typing in a field and keys held with a modifier are left alone. Start
 * it while reveals are pending, and stop it once they're all shown.
 */
export function startRevealSkip(skip: () => void): () => void {
  const onKey = (event: KeyboardEvent) => {
    if (ignoredKey(event)) return
    event.stopImmediatePropagation()
    event.preventDefault()
    skip()
  }
  window.addEventListener('keydown', onKey, { capture: true })
  return () => window.removeEventListener('keydown', onKey, { capture: true })
}
