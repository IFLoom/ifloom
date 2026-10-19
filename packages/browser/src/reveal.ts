import { ignoredKey } from './keys.ts'

/**
 * Until stopped, the next key press calls `skip`, to show everything a scene
 * still holds back, and does nothing else: it listens before other shortcuts
 * and swallows the key, so a number key can't pick a choice that isn't shown
 * yet. Typing in a field and keys held with a modifier are left alone. Start
 * it while a UI holds something back, such as prose it reveals in steps, and
 * stop it once everything is shown.
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
