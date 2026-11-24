import { ignoredKey } from './keys.ts'

/**
 * Starts calling `skip` on each key press, and returns a function that stops it. Run it while a UI reveals a scene in
 * steps, and stop it once the scene shows in full.
 *
 * It listens before other shortcuts and stops the key there, so a number key can't choose a choice the player can't
 * see yet. It leaves alone a key typed into a field and a key held with a modifier.
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
