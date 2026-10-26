/**
 * @ifloom/plugin-unlocks/react: the unlocks plugin's React UI, for a game drawn
 * with `@ifloom/react`. List `unlocksUi` (or `unlocksUiWith`, for what
 * couldn't be opened and how to restart) in the game's `plugins` to start
 * codes on the runner and put a code box on the settings page, or in the
 * menu without pages; or draw it yourself from `useUnlocks`.
 */
import type { Runner } from '@ifloom/engine'
import { createContext, useContext, useEffect, useState, type ComponentProps, type ReactNode, type SyntheticEvent } from 'react'
import { badgeVariants, buttonVariants, overridable, type Override, type PluginUi, useGame, useKitPart, usePart, useWords } from '@ifloom/react'
import { enterCode, startUnlocks, type Entered, type UnlocksView } from '../index.ts'

/** The unlocks plugin's words, in English. A game rewords any with `ui.<key>` in its strings. */
export const UNLOCKS_WORDS = {
  checkingCode: 'Checking…',
  code: 'Code',
  enterCode: 'Enter a code',
  locked: 'Locked',
  restartForUnlock: 'Restart to add it',
  unlock: 'Unlock',
  unlocked: 'Unlocked',
  unlockedAlready: '{label} was unlocked already.',
  unlockedNow: 'Unlocked: {label}.',
} as const

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

/** What `useUnlocks` returns: the unlocks plugin's view, and entering a code. */
export type UnlocksControls = UnlocksView & {
  /** Whether codes can be entered: codes have started on the runner (the unlocks UI starts them). */
  available: boolean
  /** Try a code with `enterCode`. True if it unlocked something; `entered` says what, or `message` why not. */
  enter: (code: string) => Promise<boolean>
  /** True while a code is being checked, which takes a moment on purpose: the snapshot's `helpers.unlocks.status`. */
  checking: boolean
  /** What the last code unlocked, or null. */
  entered: Entered | null
  /** Why the last code didn't work, or null. */
  message: string | null
  /** Build the game again with what a code just opened: `onChange` from `unlocksUiWith`, when the last code needs it. Undefined otherwise. */
  restart: (() => void) | undefined
  /** What couldn't be opened of the content the profile remembers (a code that has changed since). */
  problems: string[]
}

/** What `unlocksUiWith` takes: what went wrong opening remembered content, and how to start over with new content. */
export type UnlocksUiOptions = {
  /** What `unlockedPacks` said it couldn't open, shown under the code box. */
  problems?: string[]
  /** Build the game again with the content a code has just opened: usually `() => location.reload()`. */
  onChange?: () => void
  /** How codes start on the runner: `startUnlocks` if left out. Returns the way to stop them. */
  start?: (runner: Runner) => () => void
}

/** The unlocks UI's options. Null outside the unlocks UI. */
const Options = createContext<UnlocksUiOptions | null>(null)

/**
 * The unlocks plugin's view and the code box's state, or null in a game
 * without the plugin. Where entering stands comes from the runner's
 * snapshot (`helpers.unlocks`, which `startUnlocks` reports), so it reads the
 * same in every component. Without codes started on the runner (the unlocks
 * UI starts them), `available` is false and the list still shows.
 * `UnlocksPanel` is drawn from it.
 */
export function useUnlocks(): UnlocksControls | null {
  const { view, runner, snapshot } = useGame()
  const options = useContext(Options)
  const shown = view.plugins.unlocks as UnlocksView | undefined
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
  const words = useWords(UNLOCKS_WORDS)
  const unlocks = useUnlocks()
  const [code, setCode] = useState('')
  const section = usePart('unlocks', 'flex flex-col gap-3 text-sm', className)
  const title = useKitPart('heading', 'unlocks-title', 'font-heading font-semibold')
  const form = useKitPart('form', 'unlock-form', 'flex flex-wrap items-center gap-2')
  const input = useKitPart('input', 'unlock-input', 'h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm')
  const submit = usePart('button', buttonVariants({ size: 'sm' }))
  const said = usePart('unlocks-message', 'text-destructive')
  const done = usePart('unlocks-entered', 'text-foreground')
  const restart = usePart('button', `${buttonVariants({ size: 'sm', variant: 'outline' })} self-start`)
  const list = usePart('unlocks-list', 'flex flex-col gap-2')
  const row = useKitPart('card', 'unlock', 'flex flex-col gap-1 rounded-lg border p-2')
  const name = useKitPart('title', 'unlock-name', 'flex flex-wrap items-center gap-2 font-medium')
  const state = useKitPart('badge', 'unlock-state', badgeVariants({ variant: 'secondary' }))
  const text = useKitPart('note', 'unlock-text', 'text-muted-foreground')
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
 * Entering a code, and the game's unlocks with which are unlocked: a box and
 * a button, what the code unlocked or why it didn't, a button to restart
 * when the code opened content the game in play doesn't have yet, and the
 * list. On the settings page, and in the menu without pages, when the game
 * lists the unlocks UI. A thin default on `useUnlocks`.
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
 * The unlocks plugin's React UI with options: what `unlockedPacks` couldn't
 * open, shown under the code box, and `onChange`, which a Restart button
 * calls once a code has opened content the game in play doesn't have yet.
 */
export function unlocksUiWith(options: UnlocksUiOptions = {}): PluginUi {
  return {
    id: 'unlocks',
    words: UNLOCKS_WORDS,
    settings: { label: 'enterCode', component: () => <UnlocksPanel /> },
    provider: codesProvider(options),
  }
}

/**
 * The unlocks plugin's React UI, for `plugins` on `mountGame` or
 * `GameProvider`: codes start on the runner, and the `UnlocksPanel` is on
 * the settings page (with pages on) or behind an Enter a code button in the
 * menu. `unlocksUiWith` takes the problems and a restart.
 */
export const unlocksUi: PluginUi = unlocksUiWith()
