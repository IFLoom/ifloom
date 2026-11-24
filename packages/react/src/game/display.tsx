/**
 * The ui settings the React UI honours itself, named by the game's
 * `ui.settings` hint: a text size, copied to `<html data-text-size>` for the
 * styles to size the page by, and a pictures toggle that, while off, leaves
 * the story's pictures and videos out.
 */
import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useGameIfAny } from './context.tsx'

/** Set inside what must stay drawn whatever the pictures setting says: a layered picture, whose hotspots are play. */
const KeepPictures = createContext(false)

/**
 * Renders its children with their pictures shown even while the game's pictures setting is off. A layered picture uses
 * it, since its hotspots are play.
 */
export function KeepPicturesOn({ children }: { children: ReactNode }) {
  return <KeepPictures.Provider value={true}>{children}</KeepPictures.Provider>
}

/**
 * Returns false while the setting the game names in `ui.settings.images` is off, and true otherwise. It's true outside
 * a game, in a game that names no setting and inside `KeepPicturesOn`.
 */
export function usePicturesShown(): boolean {
  const game = useGameIfAny()
  const kept = useContext(KeepPictures)
  const id = game?.runner.game.ui?.settings?.images
  if (kept || !game || !id) return true
  return game.snapshot.settings[id] !== false
}

/**
 * Renders nothing, and copies the setting the game names in `ui.settings.textSize` to `data-text-size` on `<html>`
 * whenever it changes. The styles size every page from there, the title screen's included.
 *
 * `GameShell` renders one.
 */
export function TextSize() {
  const game = useGameIfAny()
  const id = game?.runner.game.ui?.settings?.textSize
  const value = id ? game.snapshot.settings[id] : undefined
  useEffect(() => {
    if (value === undefined || typeof document === 'undefined') return
    const root = document.documentElement
    root.dataset.textSize = String(value)
    return () => {
      delete root.dataset.textSize
    }
  }, [value])
  return null
}
