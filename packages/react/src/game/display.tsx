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

/** Draws its children's pictures even while the pictures setting is off. */
export function KeepPicturesOn({ children }: { children: ReactNode }) {
  return <KeepPictures.Provider value={true}>{children}</KeepPictures.Provider>
}

/**
 * Whether pictures are drawn here: false only while the setting the game names
 * in `ui.settings.images` is off. True outside a game, in a game that names
 * none, and inside a layered picture.
 */
export function usePicturesShown(): boolean {
  const game = useGameIfAny()
  const kept = useContext(KeepPictures)
  const id = game?.runner.game.ui?.settings?.images
  if (kept || !game || !id) return true
  return game.snapshot.settings[id] !== false
}

/**
 * Copies the setting the game names in `ui.settings.textSize` to
 * `data-text-size` on `<html>`, now and whenever it changes, so the page is
 * sized from its root on every page, the title's included. Draws nothing.
 * `GameShell` has one.
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
