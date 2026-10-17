/**
 * Keyboard shortcuts for the game, off unless the game turns them on with
 * `keys`: the number keys pick the choices or actions on screen, Escape opens
 * the in-game menu, and a game can add keys of its own. A minigame's keys are
 * the minigame card's, and work whether this is on or not.
 */
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import type { Command, RenderedChoice, View } from '@ifloom/engine'
import { useGame } from './context.tsx'
import { useKeysOption } from './overrides.tsx'

/** What `keys` turns on, when it's an object rather than `true`. */
export type KeyOptions = {
  /**
   * Keys of the game's own, by `KeyboardEvent.key` (`'m'`, `'F2'`, `' '`): the
   * command each sends. They come before the built-in keys, so mapping `'1'`
   * or `'Escape'` replaces what that key does.
   */
  map?: Record<string, Command>
}

/** Whether a key press is the player typing, or held with a modifier: hotkeys leave those alone. */
export function ignoredKey(event: KeyboardEvent): boolean {
  if (event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return true
  const target = event.target
  if (target instanceof HTMLElement) {
    if (target.isContentEditable || target.closest('input, textarea, select, [contenteditable="true"]')) return true
  }
  return false
}

/** Whether a dialog is open: its own keys come first, and Escape is its own. */
export function dialogOpen(): boolean {
  return document.querySelector('[role="dialog"], [role="alertdialog"]') !== null
}

/** The choices the number keys pick, in order: the open scene's, else the room's buttons. */
export function numberedChoices(view: View): RenderedChoice[] {
  return view.scene.choices.length ? view.scene.choices : view.actions
}

type KeysContextValue = {
  /** Whether the hotkeys are on. */
  on: boolean
  /** The menus that Escape can open, the latest last. */
  menus: Set<() => void>
}

const KeysContext = createContext<KeysContextValue>({ on: false, menus: new Set() })

/** The number key for a choice, 1 to 9, when hotkeys are on and the choice is numbered; otherwise null. */
export function useChoiceKey(choice: RenderedChoice): number | null {
  const { on } = useContext(KeysContext)
  const { view } = useGame()
  if (!on) return null
  const index = numberedChoices(view).indexOf(choice)
  return index >= 0 && index < 9 ? index + 1 : null
}

/** Let Escape open this menu while it's on screen; `null` while there's nothing to open. `GameMenu` uses it. */
export function useMenuKey(open: (() => void) | null): void {
  const { menus } = useContext(KeysContext)
  const latest = useRef(open)
  latest.current = open
  const has = open !== null
  useEffect(() => {
    if (!has) return
    const entry = () => latest.current?.()
    menus.add(entry)
    return () => void menus.delete(entry)
  }, [menus, has])
}

/** Listens for the game's hotkeys while `keys` is on. `GameProvider` puts it round the game. */
export function KeysProvider({ children }: { children: ReactNode }) {
  const option = useKeysOption()
  const { send } = useGame()
  const on = option !== false
  const map = typeof option === 'object' ? option.map : undefined
  const menus = useMemo(() => new Set<() => void>(), [])
  const value = useMemo(() => ({ on, menus }), [on, menus])
  useEffect(() => {
    if (!on) return
    const onKey = (event: KeyboardEvent) => {
      if (ignoredKey(event) || dialogOpen()) return
      const own = map && Object.hasOwn(map, event.key) ? map[event.key] : undefined
      if (own) {
        event.preventDefault()
        send(own)
        return
      }
      if (event.key === 'Escape') {
        const open = [...menus].at(-1)
        if (open) {
          event.preventDefault()
          open()
        }
        return
      }
      if (/^[1-9]$/.test(event.key)) {
        // The button on screen with that number: what's drawn is what's picked, whatever the layout.
        const button = document.querySelector<HTMLButtonElement>(`[data-choice-key="${event.key}"]`)
        if (button && !button.disabled) {
          event.preventDefault()
          button.click()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [on, map, menus, send])
  return <KeysContext.Provider value={value}>{children}</KeysContext.Provider>
}
