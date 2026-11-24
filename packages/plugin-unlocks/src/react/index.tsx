/**
 * The unlocks plugin's React UI, for a game rendered with `@ifloom/react`.
 *
 * List `unlocksUi`, or `unlocksUiWith` for the problems and a restart, in the game's `plugins`. It starts code entry
 * on the runner and puts a code box on the settings page, or in the menu without pages. To render it yourself, read
 * `useUnlocks`.
 */
import type { Runner } from '@ifloom/engine'
import { createContext, useContext, useEffect, useState, type ComponentProps, type ReactNode, type SyntheticEvent } from 'react'
import { useGame, usePart } from '@ifloom/react'
import { buttonVariants, overridable, type Override, pluginKit, type PluginUi, useKitPart, usePlugin } from '@ifloom/react/kit'
import { enterCode, startUnlocks, type Entered, type UnlocksView } from '../index.ts'

/** The unlocks plugin's UI words, in English. A game rewords any of them with `ui.<key>` in its strings. */
export const UNLOCKS_WORDS = {
  /** The label of the unlock button while a code is checked. */
  checkingCode: 'Checking…',
  /** The placeholder and the screen readers' label of the code box. */
  code: 'Code',
  /** The heading over the code box, and the label of the menu button that opens it without pages. */
  enterCode: 'Enter a code',
  /** The state of an unlock the player hasn't opened. */
  locked: 'Locked',
  /** The label of the button that restarts the game to add the packs a code opened. */
  restartForUnlock: 'Restart to add it',
  /** The label of the button that checks the code. */
  unlock: 'Unlock',
  /** The state of an unlock the player has opened. */
  unlocked: 'Unlocked',
  /** The message for a code that opened an unlock the player had already, with its `{label}`. */
  unlockedAlready: '{label} was unlocked already.',
  /** The message for a code that has just opened an unlock, with its `{label}`. */
  unlockedNow: 'Unlocked: {label}.',
} as const

/** The unlocks plugin's UI, declared once: its id and its words, for `usePlugin` and `unlocksUi`. */
const UNLOCKS = pluginKit('unlocks', UNLOCKS_WORDS)

declare module '@ifloom/react' {
  interface OverridableComponents {
    UnlocksPanel: Override<ComponentProps<typeof UnlocksPanel>>
  }
  interface PartNames {
    'unlock': true
    'unlock-form': true
    'unlock-input': true
    'unlock-name': true
    'unlock-problem': true
    'unlock-state': true
    'unlock-text': true
    'unlocks': true
    'unlocks-entered': true
    'unlocks-list': true
    'unlocks-message': true
    'unlocks-title': true
  }
}

/** The unlocks plugin's view with the code box's state and a function that enters a code, as `useUnlocks` returns it. */
export type UnlocksControls = UnlocksView & {
  /** True when code entry has started on the runner, which the unlocks UI does. */
  available: boolean
  /** Checks a code with `enterCode` and resolves true when it opened an unlock. `entered` then names it, or `message` gives the reason it didn't. */
  enter: (code: string) => Promise<boolean>
  /** True while a code is checked, slowly on purpose, from the snapshot's `helpers.unlocks.status`. */
  checking: boolean
  /** The unlock the last code opened, or null. */
  entered: Entered | null
  /** The reason the last code didn't work, or null. */
  message: string | null
  /**
   * The function that builds the game again with the packs a code just opened, `onChange` from `unlocksUiWith`. It is
   * undefined unless the last code needs it.
   */
  restart: (() => void) | undefined
  /** The problems opening the packs the profile remembers, such as a code that has changed since. */
  problems: string[]
}

/** Settings for `unlocksUiWith`. Without them, the UI shows no problems and offers no restart. */
export type UnlocksUiOptions = {
  /** The `problems` from `unlockedPacks`, shown under the code box. */
  problems?: string[]
  /** The function that builds the game again with the packs a code has just opened, such as `() => location.reload()`. */
  onChange?: () => void
  /** The function that starts code entry on the runner and returns the function that stops it. `startUnlocks` if left out. */
  start?: (runner: Runner) => () => void
}

/** The unlocks UI's options. Null outside the unlocks UI. */
const Options = createContext<UnlocksUiOptions | null>(null)

/**
 * Returns the unlocks plugin's view and the code box's state from the running game, or null in a game without the
 * plugin. It re-renders when the view or the snapshot's `helpers.unlocks` changes.
 *
 * Before code entry has started on the runner, `available` is false and the list of unlocks still shows.
 */
export function useUnlocks(): UnlocksControls | null {
  const { runner, snapshot } = useGame()
  const shown = usePlugin(UNLOCKS).view
  const options = useContext(Options)
  if (!shown) return null
  const status = snapshot.helpers.unlocks
  const entered = status?.entered ?? null
  return {
    ...shown,
    available: Boolean(status),
    checking: status?.status === 'checking',
    entered,
    message: status?.reason ?? null,
    problems: options?.problems ?? [],
    restart: entered?.restart ? options?.onChange : undefined,
    async enter(code) {
      const result = await enterCode(runner, code)
      return result.ok
    },
  }
}

function UnlocksPanelImpl({ className }: { className?: string }) {
  const { words } = usePlugin(UNLOCKS)
  const unlocks = useUnlocks()
  const [code, setCode] = useState('')
  const section = usePart('unlocks', 'flex flex-col gap-3 text-sm', className)
  const title = useKitPart('heading', 'unlocks-title')
  const form = useKitPart('form', 'unlock-form')
  const input = useKitPart('input', 'unlock-input')
  const submit = usePart('button', buttonVariants({ size: 'sm' }))
  const said = usePart('unlocks-message', 'text-destructive')
  const done = usePart('unlocks-entered', 'text-foreground')
  const restart = usePart('button', `${buttonVariants({ size: 'sm', variant: 'outline' })} self-start`)
  const list = usePart('unlocks-list', 'flex flex-col gap-2')
  const row = useKitPart('card', 'unlock')
  const name = useKitPart('title', 'unlock-name')
  const state = useKitPart('badge', 'unlock-state')
  const text = useKitPart('note', 'unlock-text')
  const problem = usePart('unlock-problem', 'text-xs text-destructive')
  if (!unlocks?.total) return null
  const send = async (event: SyntheticEvent) => {
    event.preventDefault()
    if (await unlocks.enter(code)) setCode('')
  }
  const entered = unlocks.entered
  return (
    <section {...section} data-unlocks>
      <h3 {...title}>{words('enterCode')}</h3>
      {unlocks.available ? (
        <form {...form} onSubmit={(event) => void send(event)}>
          <input
            {...input}
            type="text"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            aria-label={words('code')}
            placeholder={words('code')}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
          />
          <button {...submit} type="submit" disabled={unlocks.checking || !code.trim()}>
            {unlocks.checking ? words('checkingCode') : words('unlock')}
          </button>
        </form>
      ) : null}
      {unlocks.message ? (
        <p {...said} role="alert">
          {unlocks.message}
        </p>
      ) : null}
      {entered ? (
        <p {...done} role="status">
          {entered.already ? words('unlockedAlready', { label: entered.name }) : words('unlockedNow', { label: entered.name })}
        </p>
      ) : null}
      {unlocks.restart ? (
        <button {...restart} type="button" onClick={unlocks.restart}>
          {words('restartForUnlock')}
        </button>
      ) : null}
      {unlocks.problems.map((each) => (
        <p key={each} {...problem}>
          {each}
        </p>
      ))}
      <ul {...list}>
        {unlocks.unlocks.map((unlock) => (
          <li key={unlock.id} {...row} data-unlock={unlock.id} data-unlocked={unlock.unlocked ? '' : undefined}>
            <p {...name}>
              {unlock.name}
              <span {...state}>{unlock.unlocked ? words('unlocked') : words('locked')}</span>
            </p>
            {unlock.description ? <p {...text}>{unlock.description}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * Renders the code box and the list of unlocks from `view.plugins.unlocks`. It shows the unlock a code opened, or why
 * the code failed.
 *
 * A restart button shows when the code opened packs the game in play doesn't have yet.
 *
 * The unlocks UI puts it on the settings page, or in the menu without pages. A preset can style the parts `unlocks`,
 * `unlocks-title`, `unlock-form`, `unlock-input`, `unlocks-message`, `unlocks-entered`, `unlock-problem`,
 * `unlocks-list`, `unlock`, `unlock-name`, `unlock-state` and `unlock-text`.
 */
export const UnlocksPanel = overridable('UnlocksPanel', UnlocksPanelImpl)

/** Starts the codes on the runner once it's drawn, and stops them when it goes: from then on, every new game and loaded save gets the unlocks the profile remembers. */
function codesProvider(options: UnlocksUiOptions) {
  const start = options.start ?? ((runner: Runner) => startUnlocks(runner))
  return function UnlocksProvider({ children }: { children: ReactNode }) {
    const { runner } = useGame()
    useEffect(() => start(runner), [runner])
    return <Options.Provider value={options}>{children}</Options.Provider>
  }
}

/**
 * Returns the unlocks plugin's React UI with settings. It shows the `problems` from `unlockedPacks` under the code box.
 *
 * Its restart button calls `onChange` once a code has opened packs the game in play doesn't have yet.
 */
export function unlocksUiWith(options: UnlocksUiOptions = {}): PluginUi {
  return {
    ...UNLOCKS,
    settings: { label: 'enterCode', component: () => <UnlocksPanel /> },
    provider: codesProvider(options),
  }
}

/**
 * The unlocks plugin's React UI, for `plugins` on `mountGame` or `GameProvider`. It renders the `UnlocksPanel` on the
 * settings page, or behind a menu button without pages.
 *
 * It also starts code entry on the runner.
 *
 * `unlocksUiWith` returns the same UI with problems and a restart.
 */
export const unlocksUi: PluginUi = unlocksUiWith()
