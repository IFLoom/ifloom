/**
 * The unlocks plugin's React UI, for a game rendered with `@ifloom/react`.
 *
 * List `unlocksUi`, or `unlocksUiWith` for the problems and a restart, in the game's `plugins`. It starts code entry
 * on the runner and puts a code box on the settings page, or in the menu without pages, and a Cheats button in the
 * side column while the player can see a cheat. To render them yourself, read `useUnlocks` and `useCheats`.
 */
import type { GameState, Result, Runner } from '@ifloom/engine'
import { createContext, useContext, useEffect, useState, type ComponentProps, type ReactNode, type SyntheticEvent } from 'react'
import { ChoiceButton, useGame, usePart } from '@ifloom/react'
import { buttonVariants, overridable, type Override, PartDialog, pluginKit, type PluginUi, useKitPart, usePlugin } from '@ifloom/react/kit'
import { enterCode, startUnlocks, unlocks as unlocksPlugin, type CheatView, type Entered, type UnlocksView } from '../index.ts'

/** The unlocks plugin's UI words, in English. A game rewords any of them with `ui.<key>` in its strings. */
export const UNLOCKS_WORDS = {
  /** The note on a cheat the player has used once. */
  cheatUsedOnce: 'Used once',
  /** The note on a cheat the player has used more than once, with `{n}` uses. */
  cheatUsedTimes: 'Used {n} times',
  /** The label of the cheats button and the title of its dialog. */
  cheats: 'Cheats',
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
    CheatPanel: Override<ComponentProps<typeof CheatPanel>>
    CheatsButton: Override<ComponentProps<typeof CheatsButton>>
  }
  interface PartNames {
    'cheat': true
    'cheat-text': true
    'cheat-used': true
    'cheats': true
    'cheats-button': true
    'cheats-group': true
    'cheats-group-title': true
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

/** A group of the cheats panel, a heading and the cheats under it. The cheats with no group form one with a null name. */
export type CheatGroup = {
  /** The group's heading, or null for the cheats with no group. */
  name: string | null
  /** The group's cheats, in the order the game declares them. */
  cheats: CheatView[]
}

/** The cheats from the unlocks plugin's view, grouped, with a way to use one, as `useCheats` returns them. */
export type CheatsControls = {
  /** The cheats the player can see, in the order the game declares them. */
  cheats: CheatView[]
  /** The number of cheat uses in this save, counting every cheat. */
  cheated: number
  /** The cheats grouped by their `group`, the ungrouped ones first, then each group in the order it first appears. */
  groups: CheatGroup[]
  /** Sends the `unlocks/cheat` command for the cheat. A refused use returns the reason its button gives. */
  use: (cheat: string) => Result<GameState>
}

/** The cheats as groups: the ungrouped first, then each group in the order it first appears. */
function grouped(cheats: readonly CheatView[]): CheatGroup[] {
  const groups: CheatGroup[] = []
  for (const cheat of cheats) {
    const found = groups.find((group) => group.name === cheat.group)
    if (found) found.cheats.push(cheat)
    else groups.push({ name: cheat.group, cheats: [cheat] })
  }
  return groups.sort((a, b) => Number(a.name !== null) - Number(b.name !== null))
}

/**
 * Returns the cheats from the unlocks plugin's view, their groups and their command from the running game, or null in
 * a game without the plugin. It re-renders when the view changes. `CheatPanel` renders from it.
 */
export function useCheats(): CheatsControls | null {
  const { view, send } = usePlugin(UNLOCKS)
  if (!view) return null
  return {
    cheats: view.cheats,
    cheated: view.cheated,
    groups: grouped(view.cheats),
    use: (cheat) => send(unlocksPlugin.cheat(cheat)),
  }
}

function CheatPanelImpl({ className }: { className?: string }) {
  const { words } = usePlugin(UNLOCKS)
  const panel = useKitPart('commands', 'cheats', 'gap-4', className)
  const section = usePart('cheats-group', 'flex flex-col gap-2')
  const heading = useKitPart('heading', 'cheats-group-title')
  const card = useKitPart('card', 'cheat', 'gap-1')
  const text = useKitPart('note', 'cheat-text')
  const used = useKitPart('badge', 'cheat-used')
  const shown = useCheats()
  if (!shown?.cheats.length) return null
  return (
    <div {...panel} data-cheats>
      {shown.groups.map((group) => (
        <section key={group.name ?? ''} {...section} data-cheats-group={group.name ?? ''}>
          {group.name ? <h3 {...heading}>{group.name}</h3> : null}
          {group.cheats.map((cheat) => (
            <div key={cheat.id} {...card} data-cheat={cheat.id} data-used={cheat.used ? '' : undefined}>
              <ChoiceButton choice={cheat.button} />
              {cheat.description ? <p {...text}>{cheat.description}</p> : null}
              {cheat.used ? <span {...used}>{cheat.used === 1 ? words('cheatUsedOnce') : words('cheatUsedTimes', { n: cheat.used })}</span> : null}
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}

/**
 * Renders the cheats from `view.plugins.unlocks.cheats` under their groups' headings, each with its button, its
 * description and its use count. A preset styles its `cheats`, `cheats-group`, `cheats-group-title`, `cheat`,
 * `cheat-text` and `cheat-used` parts.
 *
 * A refused cheat's button is disabled with its reason, such as a supporter cheat before the unlock or a `once`
 * cheat after its use. It renders nothing while the player can see no cheat.
 */
export const CheatPanel = overridable('CheatPanel', CheatPanelImpl)

function CheatsButtonImpl({ className }: { className?: string }) {
  const { words } = usePlugin(UNLOCKS)
  const shown = useCheats()
  const [open, setOpen] = useState(false)
  const button = useKitPart('opener', 'cheats-button', '', className)
  // Nothing to open in a game without the plugin, or while every cheat is hidden.
  if (!shown?.cheats.length) return null
  return (
    <>
      <button type="button" {...button} data-cheats-button onClick={() => setOpen(true)}>
        {words('cheats')}
      </button>
      <PartDialog open={open} onClose={() => setOpen(false)} title={words('cheats')}>
        <CheatPanel />
      </PartDialog>
    </>
  )
}

/**
 * Renders the button that opens the `CheatPanel` in a dialog. A preset styles its `cheats-button` part.
 *
 * It renders nothing in a game without the plugin, or while the player can see no cheat.
 */
export const CheatsButton = overridable('CheatsButton', CheatsButtonImpl)

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
    layout: { sidebar: [() => <CheatsButton />] },
    provider: codesProvider(options),
  }
}

/**
 * The unlocks plugin's React UI, for `plugins` on `mountGame` or `GameProvider`. It puts the `UnlocksPanel` on the
 * settings page, and the `CheatsButton` in the sidebar.
 *
 * Without pages, the `UnlocksPanel` is behind a menu button. The `CheatsButton` opens the `CheatPanel`. Each renders
 * nothing while the game has no unlocks, or the player can see no cheat. It also starts code entry on the runner.
 *
 * `unlocksUiWith` returns the same UI with problems and a restart.
 */
export const unlocksUi: PluginUi = unlocksUiWith()
