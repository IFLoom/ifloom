/**
 * The pages around the game: an optional gate, the title screen, settings,
 * loading, credits, and any page a game or a plugin UI adds. A small state
 * machine: `title` leads to `game`, `load`, `settings`, `credits` or an added
 * page, and the in-game menu leads back to `title`.
 */
import type { KvValue, GameState, SaveMeta, SettingView } from '@ifloom/engine'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ChangeEvent, type ComponentType, type ReactNode } from 'react'
import { buttonVariants } from '../components/ui/button.tsx'
import { useGame } from './context.tsx'
import { overridable, usePart, type PartKey } from './overrides.tsx'
import { Picture } from './picture.tsx'
import { BrokenSlot, useSaves } from './saves.tsx'
import { ModManager } from './mods.tsx'
import { usePluginUis } from './plugins.tsx'
import { uiSay, useWords } from './words.ts'

/** The name of a page, either a built-in one or the id of one a game or a plugin UI adds. */
export type Page = 'gate' | 'title' | 'game' | 'load' | 'settings' | 'credits' | (string & {})

/** A page a game adds in `PagesOptions.pages`, with its button on the title screen. A plugin UI adds one as a `PluginPage`. */
export type PageDef = {
  /** The label of the page's button on the title screen. */
  label: string
  /** The component that renders the page. `usePage().back()` leaves it. */
  component: ComponentType
  /** True to show a button for the page on the title screen. True if left out. */
  showOnTitle?: boolean
}

/** One line of the credits page, as text or as a link with its label. */
export type Credit = string | { label: string; href: string }

/** A notice the player confirms once before the title screen, in `PagesOptions.gate`. The game writes every word of it. */
export type GateOptions = {
  /** The gate's heading. */
  title: string
  /** The gate's text, split into paragraphs on blank lines. */
  text: string
  /** The label of the button that confirms and goes on to the title screen. */
  confirm: string
  /** The button that declines, with its label. It goes to `href` if given, and otherwise the gate stays. */
  decline?: { label: string; href?: string }
}

/** Settings for the title screen and the pages around the game, the `pages` option. Each is optional. */
export type PagesOptions = {
  /** The line under the title on the title screen. */
  subtitle?: string
  /** The path of the title screen's picture. */
  art?: string
  /** The credits page's lines and links. The title screen has no Credits button without them. */
  credits?: Credit[]
  /** The notice shown before the title screen until the player confirms it. */
  gate?: GateOptions
  /** The pages the game adds, by id. One with the id of a page a plugin UI adds, such as `achievements`, replaces it. */
  pages?: Record<string, PageDef>
}

/** The page the player is on among the pages around the game, with the functions that move between them. */
export type PageState = {
  /** True while pages are on. It's false when the game mounted without `pages`, and then the page is always `game`. */
  enabled: boolean
  /** The page showing. */
  page: Page
  /** The page under this one, which `back` returns to. It's null at the title screen, the gate and the game. */
  from: Page | null
  /** Shows a page. `title`, `game` and `gate` start afresh, and any other goes on top of the one showing. */
  go: (page: Page) => void
  /** Returns to the page under this one, or to the title screen when there is none. */
  back: () => void
  /** The options the pages were set up with. */
  options: PagesOptions
  /** Every page added to the built-in ones, by id, the plugin UIs' (such as `achievements`) with the game's own `pages` over them. */
  added: Readonly<Record<string, PageDef>>
}

const ROOTS: readonly Page[] = ['title', 'game', 'gate']
const NONE: PagesOptions = {}
const PagesContext = createContext<PageState | null>(null)
const OFF: PageState = { enabled: false, page: 'game', from: null, go: () => {}, back: () => {}, options: NONE, added: NONE as Record<string, PageDef> }

/** The pages the plugin UIs add, with their labels worded, and the game's own `pages` over them. */
function useAddedPages(options: PagesOptions): Record<string, PageDef> {
  const { runner } = useGame()
  const plugins = usePluginUis()
  return useMemo(() => {
    const fromPlugins = plugins.flatMap((ui) =>
      Object.entries(ui.pages ?? {}).map(([id, page]): [string, PageDef] => [id, { ...page, label: uiSay(runner.game, page.label, {}, ui.words ?? {}) }]),
    )
    return { ...Object.fromEntries(fromPlugins), ...options.pages }
  }, [plugins, runner, options.pages])
}

/**
 * Returns the page the player is on and the functions that move between pages. With `pages` off, `enabled` is false and
 * the page is always `game`.
 */
export function usePage(): PageState {
  return useContext(PagesContext) ?? OFF
}

/**
 * Returns the value the profile holds in a namespace, and re-renders when it changes. It's undefined without a profile
 * or before the first read.
 */
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
 * Returns a setting's value from the runner's snapshot, and re-renders when it changes. It's undefined for a setting
 * the game doesn't declare.
 *
 * A play setting's value comes from the game in play, and a UI setting's from the profile.
 */
export function useSetting(id: string): KvValue | undefined {
  return useGame().snapshot.settings[id]
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
  const added = useAddedPages(options)
  const value = useMemo<PageState | null>(
    () => (stack ? { enabled: true, page: stack.at(-1)!, from: stack.at(-2) ?? null, go, back, options, added } : null),
    [stack, go, back, options, added],
  )
  if (!value) return null
  return <PagesContext.Provider value={value}>{children}</PagesContext.Provider>
}

const NO_PAGES: PagesOptions = {}

/**
 * Renders its children, the game, or with `pages` on, the pages around it, with the game on the `game` page only. It
 * renders inside a `GameProvider`.
 *
 * A layout's `Game` region renders one, so a layout of your own needn't.
 */
export function WithPages({ pages, children }: { pages?: boolean | PagesOptions; children: ReactNode }) {
  if (!pages) return <>{children}</>
  return (
    <PagesProvider options={pages === true ? NO_PAGES : pages}>
      <Pages game={children} />
    </PagesProvider>
  )
}

/** The page showing: `game` draws what it's given, every other page its own component. */
export function Pages({ game }: { game: ReactNode }) {
  const { page, added } = usePage()
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
      const Added = added[page]?.component
      return Added ? <Added /> : <TitlePage />
    }
  }
}

/** The newest save, by when it was written. */
function newest(slots: SaveMeta[]): SaveMeta | undefined {
  return slots.reduce<SaveMeta | undefined>((best, meta) => (!best || meta.savedAt > best.savedAt ? meta : best), undefined)
}

/**
 * Returns the attributes for a page's outer section, centred and as wide as `--width-reading`, as every built-in page
 * has. `part` names the part, `title-page` by default.
 */
export function usePageParts(className?: string, part: PartKey = 'title-page') {
  return usePart(part, 'mx-auto flex min-h-screen w-full max-w-(--width-reading) flex-col justify-center gap-6 p-6 font-body', className)
}

/** Renders a page's Back button, the `page-back` part, which calls `usePage().back()`. */
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

/** Renders a page's heading, the `page-heading` part, as the built-in pages have. A page a plugin or a game adds uses it too. */
export function PageHeading({ children }: { children: ReactNode }) {
  return <h1 {...usePart('page-heading', 'font-heading text-scene-title font-semibold')}>{children}</h1>
}

function TitlePageImpl({ className }: { className?: string }) {
  const { runner, view, mods } = useGame()
  const words = useWords()
  const { go, options, added: pages } = usePage()
  const plugins = usePluginUis()
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
  const added = Object.entries(pages).filter(([, page]) => page.showOnTitle !== false)

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
        {view.settings.length || plugins.some((ui) => ui.settings) || mods ? (
          <button {...button} data-title-button="settings" onClick={() => go('settings')}>
            {words('settings')}
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
 * Renders the title screen, with the game's title, the subtitle and art when given, and a button for each page. Its
 * root is the `title-page` part.
 *
 * The buttons are Continue (the newest save), New game, New Game+ (once the game is finished, if it carries anything
 * over), Load, Settings (if the game has any), each added page with `showOnTitle`, and Credits (if given).
 */
export const TitlePage = overridable('TitlePage', TitlePageImpl)

function SettingControl({ setting, value, change }: { setting: SettingView; value: KvValue; change: (value: KvValue) => void }) {
  const control = usePart('setting-control', 'flex flex-wrap items-center gap-3')
  const shown = usePart('setting-value', 'min-w-8 text-sm text-muted-foreground tabular-nums')
  const id = `setting-${setting.id}`
  if (setting.type === 'toggle') {
    return (
      <span {...control}>
        <input id={id} type="checkbox" checked={value === true} onChange={(event) => change(event.target.checked)} />
      </span>
    )
  }
  if (setting.type === 'range') {
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
  const { runner, view, mods, snapshot } = useGame()
  const words = useWords()
  const settings = usePluginUis().flatMap((ui) => (ui.settings ? [{ id: ui.id, Draw: ui.settings.component }] : []))
  const values = snapshot.settings
  const [said, setSaid] = useState<string | null>(null)
  const section = usePageParts(className, 'settings-page')
  const list = usePart('settings', 'flex flex-col gap-4')
  const row = usePart('setting', 'flex flex-col gap-2 rounded-lg border p-3')
  const label = usePart('setting-label', 'font-medium')
  const empty = usePart('settings-empty', 'text-muted-foreground')
  const message = usePart('settings-message', 'text-destructive')
  const modsSection = usePart('settings-mods', 'flex flex-col gap-3')
  const modsTitle = usePart('mods-title', 'font-heading font-semibold')
  const modsHint = usePart('mods-hint', 'text-sm text-muted-foreground')

  const change = (setting: SettingView, value: KvValue) => {
    const result = runner.setSetting(setting.id, value)
    setSaid(result.ok ? null : result.reason)
  }

  return (
    <section {...section} data-page="settings">
      <PageHeading>{words('settings')}</PageHeading>
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
      ) : settings.length || mods ? null : (
        <p {...empty}>{words('noSettings')}</p>
      )}
      {said ? <p {...message}>{said}</p> : null}
      {settings.map(({ id, Draw }) => (
        <Draw key={id} />
      ))}
      {mods ? (
        <section {...modsSection} data-settings-mods aria-labelledby="settings-mods-title">
          <h3 {...modsTitle} id="settings-mods-title">
            {words('mods')}
          </h3>
          <p {...modsHint}>{words('modsHint')}</p>
          <ModManager />
        </section>
      ) : null}
      <div>
        <BackButton />
      </div>
    </section>
  )
}

/**
 * Renders the settings page from `view.settings`, with a checkbox for a toggle, radio buttons for a choice and a slider
 * for a range. Its root is the `settings-page` part.
 *
 * Each change goes through `runner.setSetting`, which writes a UI setting to the profile, and changes a play setting in
 * the game in play and keeps it in the profile for the next new game. A refusal shows under the list. Each plugin UI's
 * `settings` follow, such as the unlocks plugin's code box, and with `mods` on, a Mods section with the `ModManager`.
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
      <PageHeading>{words('load')}</PageHeading>
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

/**
 * Renders the load page, which lists every save newest first to load, any that can't be read to delete, and a button to
 * import a save file. It needs a runner made with `saves`.
 */
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
      <PageHeading>{words('credits')}</PageHeading>
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

/** Renders the credits page from `PagesOptions.credits`, a line each. Its links open in a new tab. */
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
  const paragraphs = gate.text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
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
 * Renders the gate from `PagesOptions.gate`, a notice the player confirms before the title screen. The profile's
 * `ui:gate` namespace remembers the confirmation, so the gate shows once per device.
 *
 * Declining goes to the decline button's `href`, or leaves the gate where it is.
 */
export const GatePage = overridable('GatePage', GatePageImpl)
