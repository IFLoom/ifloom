/**
 * Keyboard shortcuts for the game, off unless the game turns them on with
 * `keys`: the number keys pick the choices or actions on screen, Escape opens
 * the in-game menu, and a game can add keys of its own. A minigame's keys are
 * the minigame card's, and work whether this is on or not.
 */
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { numberedChoices, startKeys } from '@ifloom/browser'
import type { Command, RenderedChoice } from '@ifloom/engine'
import { useGame } from './context.tsx'
import { useKeysOption } from './overrides.tsx'

/** Settings for the `keys` option, given as an object in place of `true`. */
export type KeyOptions = {
  /**
   * The game's own keys, each mapped by `KeyboardEvent.key` (`'m'`, `'F2'`, `' '`) to the command it sends. They come
   * before the built-in keys, so mapping `'1'` or `'Escape'` replaces that key.
   */
  map?: Record<string, Command>
}

export { dialogOpen, ignoredKey, numberedChoices } from '@ifloom/browser'

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
  const { runner } = useGame()
  const on = option !== false
  const map = typeof option === 'object' ? option.map : undefined
  const menus = useMemo(() => new Set<() => void>(), [])
  const value = useMemo(() => ({ on, menus }), [on, menus])
  useEffect(() => {
    if (!on) return
    return startKeys(runner, {
      map,
      // The newest menu on screen. With none, Escape goes on to the page.
      escape: () => {
        const open = [...menus].at(-1)
        if (!open) return false
        open()
      },
      // The button on screen with that number: what's drawn is what's picked, whatever the layout.
      choices: (key) => {
        const button = document.querySelector<HTMLButtonElement>(`[data-choice-key="${key}"]`)
        if (!button || button.disabled) return false
        button.click()
        return true
      },
      // The minigame card takes a minigame's keys itself.
      minigame: false,
    })
  }, [on, map, menus, runner])
  return <KeysContext.Provider value={value}>{children}</KeysContext.Provider>
}
