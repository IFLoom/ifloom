import type { CommandRef, MinigameView, RenderedChoice, Runner, View } from '@ifloom/engine'

/**
 * Returns true for a key press that shortcuts should leave alone. That is a key typed into a field, a key held with
 * Ctrl, Alt, Meta or Shift, or one another handler has already prevented.
 */
export function ignoredKey(event: KeyboardEvent): boolean {
  if (event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return true
  const target = event.target as { isContentEditable?: boolean; closest?: (selector: string) => unknown } | null
  if (target?.isContentEditable) return true
  return Boolean(target?.closest?.('input, textarea, select, [contenteditable="true"]'))
}

/**
 * Returns true while the page shows a dialog, an open `<dialog>` or an element with the `dialog` or `alertdialog` role.
 * Shortcuts stand aside while it's open, so the dialog's own keys and Escape reach it.
 */
export function dialogOpen(): boolean {
  return typeof document !== 'undefined' && document.querySelector('dialog[open], [role="dialog"], [role="alertdialog"]') !== null
}

/**
 * Returns the choices the number keys choose, in order. They're the open scene's choices, else the room's actions, and
 * key 1 is the first.
 */
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
 * Returns the id of the minigame input that a key presses, by `KeyboardEvent.key`, or `undefined` for none. It returns
 * the id even when the input does nothing now.
 *
 * It reads the minigame's own `keys` first. Without them, the arrow keys and space press the inputs `up`, `down`,
 * `left`, `right` and `space`, and an input with a one-letter id is pressed by that letter. One-letter keys match
 * either case.
 */
export function minigameInput(minigame: MinigameView, key: string): string | undefined {
  const fold = (entry: string) => (entry.length === 1 ? entry.toLowerCase() : entry)
  const pressed = fold(key)
  for (const input of new Set([...minigame.inputs.map((entry) => entry.id), ...Object.keys(minigame.keys)])) {
    const keys = minigame.keys[input] ?? DEFAULT_KEYS[input] ?? (input.length === 1 ? [input] : [])
    if (keys.some((entry) => fold(entry) === pressed)) return input
  }
  return undefined
}

/**
 * Starts sending the running minigame's inputs from the keyboard, and returns a function that stops it. It maps keys
 * with `minigameInput` and listens before other shortcuts, so a minigame's keys win.
 *
 * A key that maps to an input never does anything else, such as scrolling the page, even while that input does
 * nothing.
 */
export function startMinigameKeys(runner: Runner): () => void {
  const onKey = (event: KeyboardEvent) => {
    const minigame = runner.view().minigame
    if (!minigame || event.repeat || ignoredKey(event) || dialogOpen()) return
    const input = minigameInput(minigame, event.key)
    if (input === undefined) return
    event.preventDefault()
    if (minigame.inputs.some((entry) => entry.id === input)) runner.apply({ type: 'minigame', input })
  }
  window.addEventListener('keydown', onKey, { capture: true })
  return () => window.removeEventListener('keydown', onKey, { capture: true })
}

/** Settings for `startKeys`. Each is optional, and the number keys and a minigame's keys are on if left out. */
export type KeysOptions = {
  /**
   * The number keys' handling. By default keys 1 to 9 choose the choices on screen, in `numberedChoices` order, and a
   * disabled one does nothing. `false` turns them off.
   *
   * A function chooses in their place. It gets the key's number and returns true when it handled the key, such as a UI
   * that clicks the button it rendered with that number.
   */
  choices?: boolean | ((key: number) => boolean)
  /**
   * The function Escape calls, such as one that opens the game's menu. Escape does nothing if left out.
   *
   * Return `false` when it did nothing, such as with no menu on screen, and the key goes on to the page untouched.
   */
  escape?: () => boolean | void
  /**
   * The game's own keys, each mapped by `KeyboardEvent.key` (`'m'`, `'F2'`, `' '`) to the command it sends. They come
   * before the built-in keys, so mapping `'1'` or `'Escape'` replaces that key.
   */
  map?: Record<string, CommandRef>
  /** True to start `startMinigameKeys` too, so the keyboard sends a minigame's inputs. On unless false. */
  minigame?: boolean
}

/**
 * Starts the game's keyboard shortcuts, and returns a function that stops them. They cover the game's own keys, Escape,
 * the number keys for the choices on screen and a minigame's inputs.
 *
 * They leave alone a key typed into a field, a key held with a modifier and any key while a dialog is open.
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
