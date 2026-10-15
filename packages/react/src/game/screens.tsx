/**
 * The screens around the game: an optional gate, the title screen, settings,
 * loading, credits and any screen a game or plugin adds. A small state
 * machine: `title` leads to `game`, `load`, `settings`, `credits` or an added
 * screen, and the in-game menu leads back to `title`.
 */
import type { FlagValue, GameState, SaveMeta, SettingView } from '@ifloom/engine'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ChangeEvent, type ComponentType, type ReactNode } from 'react'
import { buttonVariants } from '../components/ui/button.tsx'
import { useGame } from './context.tsx'
import { overridable, usePart } from './overrides.tsx'
import { Picture } from './picture.tsx'
import { useSaves } from './saves.tsx'
import { useWords } from './words.ts'

/** A screen by name: a built-in one, or the id of one in `ScreensOptions.screens`. */
export type Screen = 'gate' | 'title' | 'game' | 'load' | 'settings' | 'credits' | (string & {})

/** A screen a game or plugin adds, with the title screen's button for it. */
export type ScreenDef = {
  /** The title screen's button for it. */
  label: string
  /** What it draws. `useScreen().back()` leaves it. */
  component: ComponentType
  /** Whether the title screen offers it. On unless set false. */
  showOnTitle?: boolean
}

/** A line of the credits, or a link. */
export type Credit = string | { label: string; href: string }

/** A notice the player confirms once before the title screen. Every word of it is the game's. */
export type GateOptions = {
  title: string
  /** Paragraphs, split on blank lines. */
  text: string
  /** The button that moves on. */
  confirm: string
  /** A button that doesn't: it goes to `href` if given, otherwise it stays. */
  decline?: { label: string; href?: string }
}

/** What the title screen and the screens around it show. */
export type ScreensOptions = {
  /** A line under the title. */
  subtitle?: string
  /** A picture for the title screen, by its path. */
  art?: string
  /** Lines and links for the credits screen. No Credits button without them. */
  credits?: Credit[]
  /** A notice shown before the title screen until the player confirms it. */
  gate?: GateOptions
  /** Screens a game or plugin adds, by id. */
  screens?: Record<string, ScreenDef>
}

/** Where the player is among the screens, and how to move. */
export type ScreenState = {
  /** False when the game was mounted without `screens`: the game is all there is. */
  enabled: boolean
  /** The screen showing. */
  screen: Screen
  /** The screen under this one, which `back` returns to; null at the title, the gate or the game. */
  from: Screen | null
  /** Show a screen. `title`, `game` and `gate` start afresh; any other goes on top of the one showing. */
  go: (screen: Screen) => void
  /** Return to the screen under this one, or the title screen if there is none. */
  back: () => void
  /** The options the screens were set up with. */
  options: ScreensOptions
}

const ROOTS: readonly Screen[] = ['title', 'game', 'gate']
const NONE: ScreensOptions = {}
const ScreensContext = createContext<ScreenState | null>(null)
const OFF: ScreenState = { enabled: false, screen: 'game', from: null, go: () => {}, back: () => {}, options: NONE }

/** Where the player is among the screens. Outside screens (`screens` off), `enabled` is false and the screen is always `game`. */
export function useScreen(): ScreenState {
  return useContext(ScreensContext) ?? OFF
}

/** What the profile holds in a namespace, kept up to date as it changes. Undefined without a profile or before the first read. */
export function useProfile<T = unknown>(namespace: string): T | undefined {
  const { runner } = useGame()
  const profile = runner.profile
  const [value, setValue] = useState<T | undefined>(undefined)
  useEffect(() => {
    if (!profile) return
    let live = true
    const stop = profile.subscribe((changed, next) => {
      if (live && changed === namespace) setValue(next as T | undefined)
    })
    void profile.get<T>(namespace).then((stored) => {
      if (live) setValue(stored)
    })
    return () => {
      live = false
      stop()
    }
  }, [profile, namespace])
  return value
}

/** Whether a stored value still suits a setting, which may have changed since it was stored. */
function suits(setting: SettingView, value: unknown): value is FlagValue {
  if (setting.kind === 'toggle') return typeof value === 'boolean'
  if (setting.kind === 'choice') return (setting.options ?? []).some((option) => option.value === value)
  return typeof value === 'number' && value >= (setting.min ?? -Infinity) && value <= (setting.max ?? Infinity)
}

/**
 * A setting's current value. A play setting's comes from the game state (the
 * view); a ui setting's from the profile, live as it changes. Undefined for a
 * setting the game doesn't declare.
 */
export function useSetting(id: string): FlagValue | undefined {
  const { view } = useGame()
  const stored = useProfile<Record<string, unknown>>('settings')
  const setting = view.settings.find((entry) => entry.id === id)
  if (!setting) return undefined
  if (setting.affects === 'play') return setting.value ?? setting.default
  const value = stored?.[id]
  return suits(setting, value) ? value : setting.default
}

/** Gives the screens below it a place among the screens. `GameShell` uses it when `screens` is on. */
export function ScreensProvider({ options = NONE, children }: { options?: ScreensOptions; children: ReactNode }) {
  const { runner } = useGame()
  // Null until we know whether the gate was confirmed before.
  const [stack, setStack] = useState<Screen[] | null>(options.gate ? null : ['title'])
  const gated = Boolean(options.gate)
  useEffect(() => {
    if (!gated) return
    let live = true
    const profile = runner.profile
    void (async () => {
      const confirmed = profile ? await profile.get('gate') : undefined
      if (live) setStack((now) => now ?? [confirmed ? 'title' : 'gate'])
    })()
    return () => {
      live = false
    }
  }, [gated, runner])
  const go = useCallback((screen: Screen) => {
    setStack((now) => {
      if (ROOTS.includes(screen) || !now) return [screen]
      return now.at(-1) === screen ? now : [...now, screen]
    })
  }, [])
  const back = useCallback(() => setStack((now) => (now && now.length > 1 ? now.slice(0, -1) : ['title'])), [])
  const value = useMemo<ScreenState | null>(
    () => (stack ? { enabled: true, screen: stack.at(-1)!, from: stack.at(-2) ?? null, go, back, options } : null),
    [stack, go, back, options],
  )
  if (!value) return null
  return <ScreensContext.Provider value={value}>{children}</ScreensContext.Provider>
}

/** The screen showing: `game` draws what it's given, every other screen its own component. */
export function Screens({ game }: { game: ReactNode }) {
  const { screen, options } = useScreen()
  switch (screen) {
    case 'game':
      return <>{game}</>
    case 'gate':
      return <GateScreen />
    case 'title':
      return <TitleScreen />
    case 'load':
      return <LoadScreen />
    case 'settings':
      return <SettingsScreen />
    case 'credits':
      return <CreditsScreen />
    default: {
      const Added = options.screens?.[screen]?.component
      return Added ? <Added /> : <TitleScreen />
    }
  }
}

/** The newest save, by when it was written. */
function newest(slots: SaveMeta[]): SaveMeta | undefined {
  return slots.reduce<SaveMeta | undefined>((best, meta) => (!best || meta.savedAt > best.savedAt ? meta : best), undefined)
}

function useScreenParts(className?: string, part: 'title-screen' | 'gate-screen' | 'settings-screen' | 'load-screen' | 'credits-screen' = 'title-screen') {
  return usePart(part, 'mx-auto flex min-h-screen w-full max-w-(--width-reading) flex-col justify-center gap-6 p-6 font-body', className)
}

function BackButton() {
  const words = useWords()
  const { back } = useScreen()
  const button = usePart('screen-back', buttonVariants({ variant: 'outline' }))
  return (
    <button {...button} onClick={back}>
      {words('back')}
    </button>
  )
}

function Heading({ children }: { children: ReactNode }) {
  return <h1 {...usePart('screen-heading', 'font-heading text-scene-title font-semibold')}>{children}</h1>
}

function TitleScreenImpl({ className }: { className?: string }) {
  const { runner, view } = useGame()
  const words = useWords()
  const { go, options } = useScreen()
  const saves = useSaves()
  const finished = useProfile('finished')
  const section = useScreenParts(className)
  const art = usePart('title-art', 'mx-auto max-h-80 w-full rounded-lg object-cover')
  const name = usePart('title-name', 'text-center font-heading text-5xl font-semibold tracking-tight')
  const subtitle = usePart('title-subtitle', 'text-center text-lg text-muted-foreground')
  const nav = usePart('title-buttons', 'mx-auto flex w-full max-w-xs flex-col gap-2')
  const first = usePart('title-button', buttonVariants({ size: 'lg' }))
  const button = usePart('title-button', buttonVariants({ size: 'lg', variant: 'outline' }))
  const latest = newest(saves.slots)

  const play = async (start: () => Promise<unknown>) => {
    await start()
    go('game')
  }
  // Without a profile there are no stored settings, so a new game keeps the ones in play now.
  const fresh = () => runner.newGame(runner.profile ? {} : { settings: runner.state.settings })
  const carried = async () => {
    const save = latest && runner.saves ? await runner.saves.read(latest.slot) : null
    const carry: GameState = save && typeof save !== 'string' ? save.state : runner.state
    return runner.newGame({ carry })
  }
  const added = Object.entries(options.screens ?? {}).filter(([, screen]) => screen.showOnTitle !== false)

  return (
    <section {...section} data-screen="title">
      {options.art ? <Picture src={options.art} alt="" {...art} /> : null}
      <div className="flex flex-col gap-2">
        <h1 {...name}>{view.title}</h1>
        {options.subtitle ? <p {...subtitle}>{options.subtitle}</p> : null}
      </div>
      <nav {...nav}>
        {latest ? (
          <button {...first} data-title-button="continue" onClick={() => void play(() => saves.load(latest.slot))}>
            {words('continue')}
          </button>
        ) : null}
        <button {...(latest ? button : first)} data-title-button="new" onClick={() => void play(fresh)}>
          {words('newGame')}
        </button>
        {runner.game.carryOver && finished ? (
          <button {...button} data-title-button="new-game-plus" onClick={() => void play(carried)}>
            {words('newGamePlus')}
          </button>
        ) : null}
        {saves.available ? (
          <button {...button} data-title-button="load" onClick={() => go('load')}>
            {words('load')}
          </button>
        ) : null}
        {view.settings.length ? (
          <button {...button} data-title-button="settings" onClick={() => go('settings')}>
            {words('settings')}
          </button>
        ) : null}
        {added.map(([id, screen]) => (
          <button key={id} {...button} data-title-button={id} onClick={() => go(id)}>
            {screen.label}
          </button>
        ))}
        {options.credits?.length ? (
          <button {...button} data-title-button="credits" onClick={() => go('credits')}>
            {words('credits')}
          </button>
        ) : null}
      </nav>
    </section>
  )
}

/**
 * The title screen: the game's title, the subtitle and art if given, and the
 * buttons Continue (the newest save), New game, New Game+ (once the game has
 * been finished, if it carries anything over), Load, Settings (if the game has
 * any), the screens a game or plugin adds, and Credits (if given).
 */
export const TitleScreen = overridable('TitleScreen', TitleScreenImpl)

function SettingControl({ setting, value, change }: { setting: SettingView; value: FlagValue; change: (value: FlagValue) => void }) {
  const control = usePart('setting-control', 'flex flex-wrap items-center gap-3')
  const shown = usePart('setting-value', 'min-w-8 text-sm text-muted-foreground tabular-nums')
  const id = `setting-${setting.id}`
  if (setting.kind === 'toggle') {
    return (
      <span {...control}>
        <input id={id} type="checkbox" checked={value === true} onChange={(event) => change(event.target.checked)} />
      </span>
    )
  }
  if (setting.kind === 'range') {
    return (
      <span {...control}>
        <input
          id={id}
          type="range"
          min={setting.min}
          max={setting.max}
          step={setting.step ?? 'any'}
          value={Number(value)}
          onChange={(event: ChangeEvent<HTMLInputElement>) => change(Number(event.target.value))}
        />
        <output {...shown} htmlFor={id}>
          {String(value)}
        </output>
      </span>
    )
  }
  return (
    <span {...control} role="radiogroup" aria-labelledby={`${id}-label`}>
      {(setting.options ?? []).map((option) => (
        <label key={option.value} className="inline-flex items-center gap-1.5">
          <input type="radio" name={id} value={option.value} checked={value === option.value} onChange={() => change(option.value)} />
          {option.label}
        </label>
      ))}
    </span>
  )
}

function SettingsScreenImpl({ className }: { className?: string }) {
  const { runner, view, send } = useGame()
  const words = useWords()
  const { from } = useScreen()
  const stored = useProfile<Record<string, unknown>>('settings')
  const section = useScreenParts(className, 'settings-screen')
  const list = usePart('settings', 'flex flex-col gap-4')
  const row = usePart('setting', 'flex flex-col gap-2 rounded-lg border p-3')
  const label = usePart('setting-label', 'font-medium')
  const empty = usePart('settings-empty', 'text-muted-foreground')
  // Optimistic values, shown until the profile says what it stored.
  const [changed, setChanged] = useState<Record<string, FlagValue>>({})
  // Opened from a game in play, a play setting changes that game; from the title screen, the next one.
  const inGame = from === 'game'

  const valueOf = (setting: SettingView): FlagValue => {
    if (setting.affects === 'play' && inGame) return setting.value ?? setting.default
    if (setting.id in changed) return changed[setting.id]
    const value = stored?.[setting.id]
    return suits(setting, value) ? value : setting.default
  }
  const change = (setting: SettingView, value: FlagValue) => {
    if (setting.affects === 'ui') {
      if (!runner.profile) return
      if (runner.setUiSetting(setting.id, value)) return
    } else if (inGame || !runner.profile) {
      // No profile to keep it in: change the game in play, and New game keeps it.
      send({ type: 'setting', id: setting.id, value })
      if (inGame) return
    } else {
      void runner.profile.update<Record<string, unknown>>('settings', (now) => ({ ...now, [setting.id]: value }))
    }
    setChanged((now) => ({ ...now, [setting.id]: value }))
  }

  return (
    <section {...section} data-screen="settings">
      <Heading>{words('settings')}</Heading>
      {view.settings.length ? (
        <ul {...list}>
          {view.settings.map((setting) => (
            <li key={setting.id} {...row} data-setting={setting.id} data-affects={setting.affects}>
              <label {...label} id={`setting-${setting.id}-label`} htmlFor={`setting-${setting.id}`}>
                {setting.label}
              </label>
              <SettingControl setting={setting} value={valueOf(setting)} change={(value) => change(setting, value)} />
            </li>
          ))}
        </ul>
      ) : (
        <p {...empty}>{words('noSettings')}</p>
      )}
      <div>
        <BackButton />
      </div>
    </section>
  )
}

/**
 * The settings screen, drawn from `view.settings`: a checkbox for a toggle,
 * radio buttons for a choice, a slider for a range. A ui setting is written to
 * the profile. A play setting changes the game in play when the screen was
 * opened from the game; from the title screen it's written to the profile, so
 * the next new game starts with it.
 */
export const SettingsScreen = overridable('SettingsScreen', SettingsScreenImpl)

function LoadScreenImpl({ className }: { className?: string }) {
  const words = useWords()
  const saves = useSaves()
  const { go } = useScreen()
  const section = useScreenParts(className, 'load-screen')
  const list = usePart('saves', 'flex flex-col gap-2 text-sm')
  const slot = usePart('save-slot', 'flex flex-wrap items-center gap-2 rounded-lg border p-2')
  const name = usePart('save-name', 'font-medium')
  const details = usePart('save-details', 'text-xs text-muted-foreground')
  const loadButton = usePart('button', buttonVariants({ size: 'sm' }))
  const fileButton = usePart('file-button', 'inline-flex cursor-pointer items-center rounded-md border px-3 text-xs')
  const said = usePart('saves-message', 'text-destructive')
  const empty = usePart('saves-empty', 'text-muted-foreground')
  const sorted = [...saves.slots].sort((a, b) => b.savedAt - a.savedAt)

  const load = async (slotId: string) => {
    if (await saves.load(slotId)) go('game')
  }
  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && (await saves.importFile(file))) go('game')
  }

  return (
    <section {...section} data-screen="load">
      <Heading>{words('load')}</Heading>
      {saves.message ? <p {...said}>{saves.message}</p> : null}
      {sorted.length ? (
        <ul {...list}>
          {sorted.map((meta) => (
            <li key={meta.slot} {...slot} data-save-slot={meta.slot}>
              <div className="flex-1">
                <p {...name}>{meta.name}</p>
                <p {...details}>{new Date(meta.savedAt).toLocaleString()}</p>
              </div>
              <button {...loadButton} onClick={() => void load(meta.slot)}>
                {words('load')}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p {...empty}>{words('noSaves')}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <BackButton />
        <label {...fileButton}>
          {words('importSave')}
          <input type="file" accept="application/json,.json" className="sr-only" onChange={importFile} />
        </label>
      </div>
    </section>
  )
}

/** The load screen: every save, newest first, to load; and importing a save file. Needs the runner made with `saves`. */
export const LoadScreen = overridable('LoadScreen', LoadScreenImpl)

function CreditsScreenImpl({ className }: { className?: string }) {
  const words = useWords()
  const { options } = useScreen()
  const section = useScreenParts(className, 'credits-screen')
  const list = usePart('credits', 'flex flex-col gap-2')
  const line = usePart('credit', '')
  const link = usePart('credit-link', 'text-primary underline underline-offset-4')
  return (
    <section {...section} data-screen="credits">
      <Heading>{words('credits')}</Heading>
      <ul {...list}>
        {(options.credits ?? []).map((credit, index) => (
          <li key={index} {...line}>
            {typeof credit === 'string' ? (
              credit
            ) : (
              <a {...link} href={credit.href} target="_blank" rel="noreferrer">
                {credit.label}
              </a>
            )}
          </li>
        ))}
      </ul>
      <div>
        <BackButton />
      </div>
    </section>
  )
}

/** The credits screen: `ScreensOptions.credits`, a line each, links opening in a new tab. */
export const CreditsScreen = overridable('CreditsScreen', CreditsScreenImpl)

function GateScreenImpl({ className }: { className?: string }) {
  const { runner } = useGame()
  const { go, options } = useScreen()
  const section = useScreenParts(className, 'gate-screen')
  const heading = usePart('gate-title', 'font-heading text-scene-title font-semibold')
  const text = usePart('gate-text', 'flex flex-col gap-3 leading-prose')
  const buttons = usePart('gate-buttons', 'flex flex-wrap gap-2')
  const confirm = usePart('gate-confirm', buttonVariants({ size: 'lg' }))
  const decline = usePart('gate-decline', buttonVariants({ size: 'lg', variant: 'outline' }))
  const gate = options.gate
  if (!gate) return null
  const paragraphs = gate.text.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean)
  const agree = async () => {
    await runner.profile?.set('gate', { confirmedAt: Date.now() })
    go('title')
  }
  return (
    <section {...section} data-screen="gate">
      <h1 {...heading}>{gate.title}</h1>
      <div {...text}>
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
      <div {...buttons}>
        <button {...confirm} onClick={() => void agree()}>
          {gate.confirm}
        </button>
        {gate.decline ? (
          gate.decline.href ? (
            <a {...decline} href={gate.decline.href}>
              {gate.decline.label}
            </a>
          ) : (
            <button {...decline} onClick={() => {}}>
              {gate.decline.label}
            </button>
          )
        ) : null}
      </div>
    </section>
  )
}

/**
 * A notice the player confirms before the title screen, from
 * `ScreensOptions.gate`. Confirming is remembered in the profile's `gate`
 * namespace, so it shows once per device. Declining goes to its `href`, or
 * stays.
 */
export const GateScreen = overridable('GateScreen', GateScreenImpl)
