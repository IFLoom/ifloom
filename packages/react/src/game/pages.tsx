/**
 * The pages around the game: an optional gate, the title screen, settings,
 * loading, credits, the achievements (with that plugin) and any page a game adds. A small state
 * machine: `title` leads to `game`, `load`, `settings`, `credits` or an added
 * page, and the in-game menu leads back to `title`.
 */
import type { KvValue, GameState, SaveMeta, SettingView } from '@ifloom/engine'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ChangeEvent, type ComponentType, type ReactNode } from 'react'
import { buttonVariants } from '../components/ui/button.tsx'
import { useGame } from './context.tsx'
import { overridable, usePart } from './overrides.tsx'
import { Picture } from './picture.tsx'
import { BrokenSlot, useSaves } from './saves.tsx'
import { AchievementsPage } from './achievements.tsx'
import { UnlocksPanel } from './unlocks.tsx'
import { useWords } from './words.ts'

/** A page by name: a built-in one, or the id of one in `PagesOptions.pages`. */
export type Page = 'gate' | 'title' | 'game' | 'load' | 'settings' | 'credits' | 'achievements' | (string & {})

/** A page a game or plugin adds, with the title screen's button for it. */
export type PageDef = {
  /** The title screen's button for it. */
  label: string
  /** What it draws. `usePage().back()` leaves it. */
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

/** What the title screen and the pages around it show. */
export type PagesOptions = {
  /** A line under the title. */
  subtitle?: string
  /** A picture for the title screen, by its path. */
  art?: string
  /** Lines and links for the credits page. No Credits button without them. */
  credits?: Credit[]
  /** A notice shown before the title screen until the player confirms it. */
  gate?: GateOptions
  /** Pages a game or plugin adds, by id. One with the id `achievements` replaces the built-in achievements page. */
  pages?: Record<string, PageDef>
  /**
   * The achievements page and its title-screen button, in a game with the
   * achievements plugin. On unless set false; the `'achievements'` part's
   * button then opens them in a dialog instead.
   */
  achievements?: boolean
}

/** Where the player is among the pages, and how to move. */
export type PageState = {
  /** False when the game was mounted without `pages`: the game is all there is. */
  enabled: boolean
  /** The page showing. */
  page: Page
  /** The page under this one, which `back` returns to; null at the title, the gate or the game. */
  from: Page | null
  /** Show a page. `title`, `game` and `gate` start afresh; any other goes on top of the one showing. */
  go: (page: Page) => void
  /** Return to the page under this one, or the title screen if there is none. */
  back: () => void
  /** The options the pages were set up with. */
  options: PagesOptions
}

const ROOTS: readonly Page[] = ['title', 'game', 'gate']
const NONE: PagesOptions = {}
const PagesContext = createContext<PageState | null>(null)
const OFF: PageState = { enabled: false, page: 'game', from: null, go: () => {}, back: () => {}, options: NONE }

/** Where the player is among the pages. Outside pages (`pages` off), `enabled` is false and the page is always `game`. */
export function usePage(): PageState {
  return useContext(PagesContext) ?? OFF
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

/**
 * A setting's current value, as `runner.settings()` gives it, kept up to date:
 * a play setting's from the game in play, a ui setting's from the profile.
 * Undefined for a setting the game doesn't declare.
 */
export function useSetting(id: string): KvValue | undefined {
  const { runner } = useGame()
  return useSyncExternalStore(runner.subscribe, () => runner.settings()[id])
}

/** Gives the pages below it a place among the pages. `GameShell` uses it when `pages` is on. */
export function PagesProvider({ options = NONE, children }: { options?: PagesOptions; children: ReactNode }) {
  const { runner } = useGame()
  // Null until we know whether the gate was confirmed before.
  const [stack, setStack] = useState<Page[] | null>(options.gate ? null : ['title'])
  const gated = Boolean(options.gate)
  useEffect(() => {
    if (!gated) return
    let live = true
    const profile = runner.profile
    void (async () => {
      const confirmed = profile ? await profile.get('ui:gate') : undefined
      if (live) setStack((now) => now ?? [confirmed ? 'title' : 'gate'])
    })()
    return () => {
      live = false
    }
  }, [gated, runner])
  const go = useCallback((page: Page) => {
    setStack((now) => {
      if (ROOTS.includes(page) || !now) return [page]
      return now.at(-1) === page ? now : [...now, page]
    })
  }, [])
  const back = useCallback(() => setStack((now) => (now && now.length > 1 ? now.slice(0, -1) : ['title'])), [])
  const value = useMemo<PageState | null>(
    () => (stack ? { enabled: true, page: stack.at(-1)!, from: stack.at(-2) ?? null, go, back, options } : null),
    [stack, go, back, options],
  )
  if (!value) return null
  return <PagesContext.Provider value={value}>{children}</PagesContext.Provider>
}

/** The page showing: `game` draws what it's given, every other page its own component. */
export function Pages({ game }: { game: ReactNode }) {
  const { page, options } = usePage()
  switch (page) {
    case 'game':
      return <>{game}</>
    case 'gate':
      return <GatePage />
    case 'title':
      return <TitlePage />
    case 'load':
      return <LoadPage />
    case 'settings':
      return <SettingsPage />
    case 'credits':
      return <CreditsPage />
    default: {
      if (page === 'achievements' && !options.pages?.achievements && options.achievements !== false) return <AchievementsPage />
      const Added = options.pages?.[page]?.component
      return Added ? <Added /> : <TitlePage />
    }
  }
}

/** The newest save, by when it was written. */
function newest(slots: SaveMeta[]): SaveMeta | undefined {
  return slots.reduce<SaveMeta | undefined>((best, meta) => (!best || meta.savedAt > best.savedAt ? meta : best), undefined)
}

/** The attributes for a page's outer section. Internal: every page uses it. */
export function usePageParts(
  className?: string,
  part: 'title-page' | 'gate-page' | 'settings-page' | 'load-page' | 'credits-page' | 'achievements-page' = 'title-page',
) {
  return usePart(part, 'mx-auto flex min-h-screen w-full max-w-(--width-reading) flex-col justify-center gap-6 p-6 font-body', className)
}

/** The page's Back button. Internal. */
export function BackButton() {
  const words = useWords()
  const { back } = usePage()
  const button = usePart('page-back', buttonVariants({ variant: 'outline' }))
  return (
    <button {...button} onClick={back}>
      {words('back')}
    </button>
  )
}

/** A page's heading. Internal. */
export function Heading({ children }: { children: ReactNode }) {
  return <h1 {...usePart('page-heading', 'font-heading text-scene-title font-semibold')}>{children}</h1>
}

function TitlePageImpl({ className }: { className?: string }) {
  const { runner, view, unlocks } = useGame()
  const words = useWords()
  const { go, options } = usePage()
  const saves = useSaves()
  const finished = useProfile('core:finished')
  const section = usePageParts(className)
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
  const fresh = () => runner.newGame()
  const carried = async () => {
    const save = latest && runner.saves ? await runner.saves.read(latest.slot) : null
    const carry: GameState = save?.ok && save.value ? save.value.state : runner.state
    return runner.newGame({ carry })
  }
  const added = Object.entries(options.pages ?? {}).filter(([, page]) => page.showOnTitle !== false)
  const achievements = Boolean(view.plugins.achievements) && options.achievements !== false && !options.pages?.achievements

  return (
    <section {...section} data-page="title">
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
        {view.settings.length || (unlocks && view.plugins.unlocks) ? (
          <button {...button} data-title-button="settings" onClick={() => go('settings')}>
            {words('settings')}
          </button>
        ) : null}
        {achievements ? (
          <button {...button} data-title-button="achievements" onClick={() => go('achievements')}>
            {words('achievements')}
          </button>
        ) : null}
        {added.map(([id, page]) => (
          <button key={id} {...button} data-title-button={id} onClick={() => go(id)}>
            {page.label}
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
 * any), Achievements (with that plugin), the pages a game adds, and Credits
 * (if given).
 */
export const TitlePage = overridable('TitlePage', TitlePageImpl)

function SettingControl({ setting, value, change }: { setting: SettingView; value: KvValue; change: (value: KvValue) => void }) {
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

function SettingsPageImpl({ className }: { className?: string }) {
  const { runner, view, unlocks } = useGame()
  const words = useWords()
  const values = useSyncExternalStore(runner.subscribe, () => runner.settings())
  const [said, setSaid] = useState<string | null>(null)
  const section = usePageParts(className, 'settings-page')
  const list = usePart('settings', 'flex flex-col gap-4')
  const row = usePart('setting', 'flex flex-col gap-2 rounded-lg border p-3')
  const label = usePart('setting-label', 'font-medium')
  const empty = usePart('settings-empty', 'text-muted-foreground')
  const message = usePart('settings-message', 'text-destructive')

  const change = (setting: SettingView, value: KvValue) => {
    const result = runner.setSetting(setting.id, value)
    setSaid(result.ok ? null : result.reason)
  }

  return (
    <section {...section} data-page="settings">
      <Heading>{words('settings')}</Heading>
      {view.settings.length ? (
        <ul {...list}>
          {view.settings.map((setting) => (
            <li key={setting.id} {...row} data-setting={setting.id} data-affects={setting.affects}>
              <label {...label} id={`setting-${setting.id}-label`} htmlFor={`setting-${setting.id}`}>
                {setting.label}
              </label>
              <SettingControl setting={setting} value={values[setting.id] ?? setting.default} change={(value) => change(setting, value)} />
            </li>
          ))}
        </ul>
      ) : unlocks ? null : (
        <p {...empty}>{words('noSettings')}</p>
      )}
      {said ? <p {...message}>{said}</p> : null}
      {unlocks ? <UnlocksPanel /> : null}
      <div>
        <BackButton />
      </div>
    </section>
  )
}

/**
 * The settings page, drawn from `view.settings`: a checkbox for a toggle,
 * radio buttons for a choice, a slider for a range. Each change goes through
 * `runner.setSetting`: a ui setting is written to the profile, and a play
 * setting changes the game in play and is kept in the profile for the next
 * new game. A refusal is shown under the list. With `unlocks` on the
 * provider, the `UnlocksPanel` follows, for entering a code.
 */
export const SettingsPage = overridable('SettingsPage', SettingsPageImpl)

function LoadPageImpl({ className }: { className?: string }) {
  const words = useWords()
  const saves = useSaves()
  const { go } = usePage()
  const section = usePageParts(className, 'load-page')
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
    <section {...section} data-page="load">
      <Heading>{words('load')}</Heading>
      {saves.message ? <p {...said}>{saves.message}</p> : null}
      {sorted.length || saves.broken.length ? (
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
          {saves.broken.map((save) => (
            <BrokenSlot key={save.slot} save={save} onRemove={(slot) => void saves.remove(slot)} />
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

/** The load page: every save, newest first, to load; any that can't be read, to delete; and importing a save file. Needs the runner made with `saves`. */
export const LoadPage = overridable('LoadPage', LoadPageImpl)

function CreditsPageImpl({ className }: { className?: string }) {
  const words = useWords()
  const { options } = usePage()
  const section = usePageParts(className, 'credits-page')
  const list = usePart('credits', 'flex flex-col gap-2')
  const line = usePart('credit', '')
  const link = usePart('credit-link', 'text-primary underline underline-offset-4')
  return (
    <section {...section} data-page="credits">
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

/** The credits page: `PagesOptions.credits`, a line each, links opening in a new tab. */
export const CreditsPage = overridable('CreditsPage', CreditsPageImpl)

function GatePageImpl({ className }: { className?: string }) {
  const { runner } = useGame()
  const { go, options } = usePage()
  const section = usePageParts(className, 'gate-page')
  const heading = usePart('gate-title', 'font-heading text-scene-title font-semibold')
  const text = usePart('gate-text', 'flex flex-col gap-3 leading-prose')
  const buttons = usePart('gate-buttons', 'flex flex-wrap gap-2')
  const confirm = usePart('gate-confirm', buttonVariants({ size: 'lg' }))
  const decline = usePart('gate-decline', buttonVariants({ size: 'lg', variant: 'outline' }))
  const gate = options.gate
  if (!gate) return null
  const paragraphs = gate.text.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean)
  const agree = async () => {
    await runner.profile?.set('ui:gate', { confirmedAt: Date.now() })
    go('title')
  }
  return (
    <section {...section} data-page="gate">
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
 * `PagesOptions.gate`. Confirming is remembered in the profile's `ui:gate`
 * namespace, so it shows once per device. Declining goes to its `href`, or
 * stays.
 */
export const GatePage = overridable('GatePage', GatePageImpl)
