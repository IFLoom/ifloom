import type { Entered, UnlocksView } from '@ifloom/plugin-unlocks'
import { useState, type SyntheticEvent } from 'react'
import { badgeVariants } from '../components/ui/badge.tsx'
import { buttonVariants } from '../components/ui/button.tsx'
import { useGame } from './context.tsx'
import { overridable, usePart } from './overrides.tsx'
import { useWords } from './words.ts'

/** What `useUnlocks` returns: the unlocks plugin's view, and entering a code. */
export type UnlocksControls = UnlocksView & {
  /** Whether codes can be entered: the provider was given `unlocks`, and they've started. */
  available: boolean
  /** Try a code. True if it unlocked something; `message` says what, or why not. */
  enter: (code: string) => Promise<boolean>
  /** True while a code is being checked, which takes a moment on purpose. */
  checking: boolean
  /** What the last code unlocked, or null. */
  entered: Entered | null
  /** Why the last code didn't work, or null. */
  message: string | null
  /** Build the game again with what a code just opened: the provider's `onChange`, when the last code needs it. Undefined otherwise. */
  restart: (() => void) | undefined
  /** What couldn't be opened of the content the profile remembers (a code that has changed since). */
  problems: string[]
}

/**
 * The unlocks plugin's view and the code box's state, or null in a game
 * without the plugin. Entering needs `unlocks` on the provider; without it
 * `available` is false and the list still shows. `UnlocksPanel` is drawn
 * from it.
 */
export function useUnlocks(): UnlocksControls | null {
  const { view, unlocks } = useGame()
  const [checking, setChecking] = useState(false)
  const [entered, setEntered] = useState<Entered | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const shown = view.plugins.unlocks as UnlocksView | undefined
  if (!shown) return null
  const codes = unlocks?.codes ?? null
  return {
    ...shown,
    available: Boolean(codes),
    checking,
    entered,
    message,
    problems: unlocks?.problems ?? [],
    restart: entered?.restart ? unlocks?.onChange : undefined,
    async enter(code) {
      if (!codes) return false
      setChecking(true)
      try {
        const result = await codes.enter(code)
        setEntered(result.ok ? result.value : null)
        setMessage(result.ok ? null : result.reason)
        return result.ok
      } finally {
        setChecking(false)
      }
    },
  }
}

function UnlocksPanelImpl({ className }: { className?: string }) {
  const words = useWords()
  const unlocks = useUnlocks()
  const [code, setCode] = useState('')
  const section = usePart('unlocks', 'flex flex-col gap-3 text-sm', className)
  const title = usePart('unlocks-title', 'font-heading font-semibold')
  const form = usePart('unlock-form', 'flex flex-wrap items-center gap-2')
  const input = usePart('unlock-input', 'h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm')
  const submit = usePart('button', buttonVariants({ size: 'sm' }))
  const said = usePart('unlocks-message', 'text-destructive')
  const done = usePart('unlocks-entered', 'text-foreground')
  const restart = usePart('button', `${buttonVariants({ size: 'sm', variant: 'outline' })} self-start`)
  const list = usePart('unlocks-list', 'flex flex-col gap-2')
  const row = usePart('unlock', 'flex flex-col gap-1 rounded-lg border p-2')
  const name = usePart('unlock-name', 'flex flex-wrap items-center gap-2 font-medium')
  const state = usePart('unlock-state', badgeVariants({ variant: 'secondary' }))
  const text = usePart('unlock-text', 'text-muted-foreground')
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
          {entered.already ? words('unlockedAlready', { label: entered.label }) : words('unlockedNow', { label: entered.label })}
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
              {unlock.label}
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
 * list. On the settings page, and in the menu without pages, when the
 * provider has `unlocks`. A thin default on `useUnlocks`.
 */
export const UnlocksPanel = overridable('UnlocksPanel', UnlocksPanelImpl)
