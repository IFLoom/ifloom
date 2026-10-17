import type { CommandRef, MinigameView, RenderedChoice, Runner, View } from '@ifloom/engine'

/**
 * Whether a key press should be left alone by shortcuts: the player typing
 * in a field, a key held with a modifier, or one something else already
 * handled.
 */
export function ignoredKey(event: KeyboardEvent): boolean {
  if (event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return true
  const target = event.target as { isContentEditable?: boolean; closest?: (selector: string) => unknown } | null
  if (target?.isContentEditable) return true
  return Boolean(target?.closest?.('input, textarea, select, [contenteditable="true"]'))
}

/** Whether a dialog is open in the page. Its own keys come first, and Escape is its own. */
export function dialogOpen(): boolean {
  return typeof document !== 'undefined' && document.querySelector('[role="dialog"], [role="alertdialog"]') !== null
}

/** The choices the number keys pick, in order: the open scene's, else the room's buttons. Key 1 is the first. */
export function numberedChoices(view: View): RenderedChoice[] {
  return view.scene.choices.length ? view.scene.choices : view.actions
}

/** The keys a minigame input gets when the minigame gives it none. */
const DEFAULT_KEYS: Readonly<Record<string, readonly string[]>> = {
  up: ['ArrowUp'],
  down: ['ArrowDown'],
  left: ['ArrowLeft'],
  right: ['ArrowRight'],
  space: [' '],
}

/**
 * The minigame input a key presses, by `KeyboardEvent.key`, whether or not it
 * does anything now: the minigame's own `keys`, else the arrow keys and space
 * for `up`, `down`, `left`, `right` and `space`, else the input's own name
 * when it's one letter. One-letter keys match either case.
 */
export function minigameInput(minigame: MinigameView, key: string): string | undefined {
  const fold = (entry: string) => (entry.length === 1 ? entry.toLowerCase() : entry)
  const pressed = fold(key)
  for (const input of new Set([...minigame.inputs, ...Object.keys(minigame.keys)])) {
    const keys = minigame.keys[input] ?? DEFAULT_KEYS[input] ?? (input.length === 1 ? [input] : [])
    if (keys.some((entry) => fold(entry) === pressed)) return input
  }
  return undefined
}

/**
 * Presses the minigame's inputs from the keyboard while one is being played,
 * as `minigameInput` maps them. A key that belongs to an input is kept from
 * doing anything else, such as scrolling the page, even while that input does
 * nothing. It listens before other shortcuts, so a minigame's keys win.
 * Returns the way to stop.
 */
export function startMinigameKeys(runner: Runner): () => void {
  const onKey = (event: KeyboardEvent) => {
    const minigame = runner.view().minigame
    if (!minigame || event.repeat || ignoredKey(event) || dialogOpen()) return
    const input = minigameInput(minigame, event.key)
    if (input === undefined) return
    event.preventDefault()
    if (minigame.inputs.includes(input)) runner.apply({ type: 'minigame', input })
  }
  window.addEventListener('keydown', onKey, { capture: true })
  return () => window.removeEventListener('keydown', onKey, { capture: true })
}

/** What `startKeys` listens for. */
export type KeysOptions = {
  /**
   * The number keys 1 to 9 pick the choices on screen, in `numberedChoices`
   * order, skipping a greyed-out one. On unless false. A function picks
   * instead, given the key's number, and returns whether it did, such as a
   * UI that clicks the button it drew with that number.
   */
  choices?: boolean | ((key: number) => boolean)
  /**
   * What Escape does, such as opening the game's menu. Nothing if left out.
   * Return `false` when it did nothing, such as with no menu on screen, and
   * the key goes on to the page as if it weren't there.
   */
  escape?: () => boolean | void
  /**
   * Keys of the game's own, by `KeyboardEvent.key` (`'m'`, `'F2'`, `' '`): the
   * command each sends. They come before the built-in keys, so mapping `'1'`
   * or `'Escape'` replaces what that key does.
   */
  map?: Record<string, CommandRef>
  /** A minigame's inputs from the keyboard too, with `startMinigameKeys`. On unless false. */
  minigame?: boolean
}

/**
 * The game's keyboard shortcuts: the game's own keys, Escape, the number keys
 * for the choices on screen, and a minigame's inputs. Keys the player types
 * into a field, keys held with a modifier, and keys while a dialog is open
 * are left alone. Returns the way to stop.
 */
export function startKeys(runner: Runner, options: KeysOptions = {}): () => void {
  const { choices = true, escape, map, minigame = true } = options
  const onKey = (event: KeyboardEvent) => {
    if (ignoredKey(event) || dialogOpen()) return
    const own = map && Object.hasOwn(map, event.key) ? map[event.key] : undefined
    if (own) {
      event.preventDefault()
      runner.apply(own)
      return
    }
    if (event.key === 'Escape') {
      if (escape && escape() !== false) event.preventDefault()
      return
    }
    if (!choices || !/^[1-9]$/.test(event.key)) return
    const key = Number(event.key)
    if (typeof choices === 'function') {
      if (choices(key)) event.preventDefault()
      return
    }
    const choice = numberedChoices(runner.view())[key - 1]
    if (!choice || choice.disabled) return
    event.preventDefault()
    runner.apply(choice.command)
  }
  window.addEventListener('keydown', onKey)
  const stopMinigame = minigame ? startMinigameKeys(runner) : undefined
  return () => {
    window.removeEventListener('keydown', onKey)
    stopMinigame?.()
  }
}
