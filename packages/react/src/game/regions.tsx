/**
 * The regions a layout is made of: the page (`Game`), the side column
 * (`Sidebar`, a drawer on phones), the main column (`Story`), what floats over
 * them (`Overlay`), titled `Section`s that fold or open in a dialog, and
 * `When`, which shows its children only while a condition holds.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from 'react'
import { holds, type Condition } from '@ifloom/engine'
import { badgeVariants } from '../components/ui/badge.tsx'
import { buttonVariants } from '../components/ui/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/dialog.tsx'
import { cn } from '../lib/utils.ts'
import { useGame } from './context.tsx'
import { DIALOG_CLASSES, PartDialog } from './dialog.tsx'
import { Icon } from './icon.tsx'
import { overridable, usePart } from './overrides.tsx'
import { useProfile } from './pages.tsx'
import { Clock } from './sidebar.tsx'
import { useWords } from './words.ts'

/** A layout effect in the browser, a plain effect on the server (where it never runs). */
const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/** Where the side column stops being a drawer: Tailwind's `md`. */
const WIDE = '(min-width: 48rem)'

function subscribeWide(listener: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
  const query = window.matchMedia(WIDE)
  query.addEventListener?.('change', listener)
  return () => query.removeEventListener?.('change', listener)
}

/** Whether the window is `md` or wider. True with no `matchMedia` (on the server, in tests). */
function useWide(): boolean {
  return useSyncExternalStore(
    subscribeWide,
    () => typeof window.matchMedia !== 'function' || window.matchMedia(WIDE).matches,
    () => true,
  )
}

/** How a `Sidebar` tells the `Game` it's there. */
const SidebarSlot = createContext<((present: boolean) => void) | null>(null)

export type GameProps = {
  className?: string
  children?: ReactNode
}

function GameImpl({ className, children }: GameProps) {
  const [sidebars, setSidebars] = useState(0)
  const register = useCallback((present: boolean) => setSidebars((count) => count + (present ? 1 : -1)), [])
  const hasSidebar = sidebars > 0
  const page = usePart(
    'page',
    cn(
      'grid min-h-screen content-start gap-(--gap-page) p-4 font-body',
      hasSidebar ? 'md:grid-cols-[var(--width-sidebar)_minmax(0,1fr)] md:p-6' : 'mx-auto w-full max-w-(--width-reading)',
    ),
    className,
  )
  return (
    <SidebarSlot.Provider value={register}>
      <div {...page} data-has-sidebar={hasSidebar ? '' : undefined}>
        {children}
      </div>
    </SidebarSlot.Provider>
  )
}

/**
 * The page: the root of a layout, inside the game's provider. It draws the
 * `page` part, a grid with the side column and the story side by side when it
 * has a `Sidebar` (it then carries `data-has-sidebar`), or one centred column
 * when it doesn't. With `pages` on, `GameShell` and `mountGame` draw it on
 * the `game` page, and the title screen, settings and the rest in its place.
 */
export const Game = overridable('Game', GameImpl)

export type SidebarProps = { className?: string; children?: ReactNode }

function DrawerImpl({ className, children }: SidebarProps) {
  const { view, runner } = useGame()
  const words = useWords()
  const [open, setOpen] = useState(false)
  const content = useRef<HTMLDivElement>(null)
  const bar = usePart('top-bar', 'sticky top-0 z-30 -mx-4 -mt-4 flex items-center gap-3 border-b bg-background px-4 py-2')
  const name = usePart('top-bar-title', 'truncate font-heading font-semibold')
  const button = usePart('drawer-button', buttonVariants({ size: 'sm', variant: 'outline' }))
  const sheet = usePart(
    'drawer',
    'fixed inset-y-0 left-0 z-50 flex w-[min(var(--width-sidebar),calc(100%-3rem))] flex-col overflow-y-auto border-r bg-background font-body text-foreground shadow-lg',
  )
  const overlay = usePart('drawer-overlay', DIALOG_CLASSES.overlay)
  const close = usePart('dialog-close', DIALOG_CLASSES.close)
  const aside = usePart('sidebar', 'flex flex-col gap-4 p-4 pt-12', className)
  // The drawer closes once the player has picked something (the state moved on), unless a
  // dialog it opened is still on top, such as a phone: that stays where the player is.
  useEffect(() => {
    if (!open) return
    let state = runner.state
    return runner.subscribe(() => {
      if (runner.state === state) return
      state = runner.state
      const others = [...document.querySelectorAll('[role="dialog"]')].filter((dialog) => dialog !== content.current)
      if (!others.length) setOpen(false)
    })
  }, [open, runner])
  return (
    <div {...bar}>
      <div className="min-w-0 flex-1">
        <p {...name}>{view.title}</p>
        <Clock />
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <button type="button" {...button} aria-label={words('openSidebar')} aria-expanded={open} onClick={() => setOpen(true)}>
          <Icon name="menu" />
        </button>
        {open ? (
          <DialogContent
            bare
            ref={content}
            {...sheet}
            overlayProps={overlay}
            closeProps={close}
            closeIcon={<Icon name="close" />}
            closeLabel={words('close')}
            // Focus the drawer itself, not its first button, as the UI's other dialogs do.
            onOpenAutoFocus={(event) => {
              event.preventDefault()
              ;(event.currentTarget as HTMLElement | null)?.focus()
            }}
          >
            <DialogTitle className="sr-only">{view.title}</DialogTitle>
            <DialogDescription className="sr-only">{words('openSidebar')}</DialogDescription>
            <aside {...aside} data-sidebar>
              {children}
            </aside>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  )
}

function SidebarImpl({ className, children }: SidebarProps) {
  const register = useContext(SidebarSlot)
  const wide = useWide()
  const aside = usePart('sidebar', 'flex flex-col gap-4', className)
  useBrowserLayoutEffect(() => {
    register?.(true)
    return () => register?.(false)
  }, [register])
  if (!wide) return <DrawerImpl className={className}>{children}</DrawerImpl>
  return (
    <aside {...aside} data-sidebar>
      {children}
    </aside>
  )
}

/**
 * The side column, with what you put in it. Below Tailwind's `md` (48rem) it
 * becomes a drawer: a slim `top-bar` with the game's title, the clock and a
 * `drawer-button` that slides the column in as a `drawer` (a dialog: focus
 * stays in it, and Escape closes it). The drawer closes after the player
 * picks something, unless a dialog it opened is still open.
 */
export const Sidebar = overridable('Sidebar', SidebarImpl)

export type StoryProps = {
  /**
   * Where the reading column sits when the story is wider than `--width-prose`:
   * `'center'` or `'start'`. Left out, the `--margin-prose` token decides, which
   * centres it unless a preset or the game's stylesheet says otherwise.
   */
  align?: 'center' | 'start'
  className?: string
  children?: ReactNode
}

function StoryImpl({ align, className, children }: StoryProps) {
  const main = usePart('story', 'flex min-w-0 flex-col gap-(--gap-page)', className)
  return (
    <main {...main} data-align={align}>
      {children}
    </main>
  )
}

/**
 * The main column, with what you put in it: the scene, then the bottom area
 * (exits, the room's actions, the people here) in the default layout. It
 * fills the width the side column leaves. The scene's title, prose, choices,
 * inputs, exits and the people here keep to `--width-prose`, a reading column
 * centred in the story unless `align` or `--margin-prose` says otherwise;
 * pictures and panels keep the whole width.
 */
export const Story = overridable('Story', StoryImpl)

function OverlayImpl({ className, children }: { className?: string; children?: ReactNode }) {
  const over = usePart(
    'overlay',
    'sticky bottom-4 z-40 order-last col-span-full self-end justify-self-end w-full max-w-full md:w-(--width-notice) empty:hidden',
    className,
  )
  return <div {...over}>{children}</div>
}

/**
 * What floats over the page as it scrolls, and sits after it at the end: the
 * notices, in the default layout. It sticks to the bottom of the window, so
 * nothing is left under it. Nothing in it, it takes no room.
 */
export const Overlay = overridable('Overlay', OverlayImpl)

/**
 * Whether a condition holds now, against the state on show: any condition
 * content can write, `{ 'places/at': { location: 'home' } }` say. It only
 * reads, so saves and replays are as they were.
 *
 * An escape hatch for a layout: the view already says what the player can
 * see, so reach for it only to place a part of your own by a condition the
 * view has no field for, as `Section`'s `when` and `When` do. What the story
 * shows belongs in content, where the engine checks it.
 */
export function useHolds(condition: Condition | undefined): boolean {
  const { runner, snapshot } = useGame()
  return holds(snapshot.state, runner.game, condition)
}

function WhenImpl({ condition, children }: { condition: Condition; children?: ReactNode }) {
  return useHolds(condition) ? <>{children}</> : null
}

/** Its children while `condition` holds, and nothing otherwise. `useHolds` is the same as a hook. */
export const When = overridable('When', WhenImpl)

/** The profile namespace that remembers which sections the player folded. */
const SECTIONS = 'ui:sections'

/** Whether a folding section is open: the player's last choice, kept in the profile when there is one. */
function useSectionOpen(id: string, initial: boolean): [boolean, (open: boolean) => void] {
  const { runner } = useGame()
  const stored = useProfile<Record<string, boolean>>(SECTIONS)
  const [local, setLocal] = useState<boolean | undefined>(undefined)
  const open = local ?? stored?.[id] ?? initial
  const set = useCallback(
    (next: boolean) => {
      setLocal(next)
      void runner.profile?.update<Record<string, boolean>>(SECTIONS, (now) => ({ ...now, [id]: next }))
    },
    [runner, id],
  )
  return [open, set]
}

/** Whether an element drew anything: a section with nothing in it hides itself. */
function useDrewNothing(): [RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement>(null)
  const [empty, setEmpty] = useState(false)
  useBrowserLayoutEffect(() => {
    const now = ref.current ? ref.current.childElementCount === 0 && !ref.current.textContent : empty
    if (now !== empty) setEmpty(now)
  })
  return [ref, empty]
}

export type SectionProps = {
  /** What it's called for the profile: the open or folded state is kept under it. */
  id: string
  title: string
  /** Fold in place with a button on its title. The player's choice is remembered. */
  collapsible?: boolean
  /** Draw a button that opens the children in a dialog, instead of the children. */
  dialog?: boolean
  /** Open at first, for a folding section: true if left out. The player's last choice wins. */
  open?: boolean
  /** Only while this condition holds, such as `{ 'places/at': { location: 'home' } }`. */
  when?: Condition
  /** Something small after the title: a count, a "new". */
  badge?: ReactNode
  className?: string
  children?: ReactNode
}

function SectionImpl({ id, title, collapsible = false, dialog = false, open: initial = true, when, badge, className, children }: SectionProps) {
  const shown = useHolds(when)
  const bodyId = useId()
  const [open, setOpen] = useSectionOpen(id, initial)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [body, empty] = useDrewNothing()
  const section = usePart('section', 'flex flex-col gap-2', className)
  const heading = usePart('section-title', 'font-heading font-semibold')
  // A dialog's button is drawn as a folding section's title is, its chevron pointing out to say it opens.
  const toggle = usePart(
    'section-toggle',
    'flex w-full items-center justify-between gap-2 text-left font-heading font-semibold [&[aria-expanded=false]>svg]:-rotate-90 [&[aria-haspopup]>svg]:-rotate-90 [&>svg]:size-4 [&>svg]:transition-transform',
  )
  const contents = usePart('section-body', 'flex flex-col gap-3')
  const badgePart = usePart('section-badge', badgeVariants({ variant: 'secondary' }))
  if (!shown) return null
  const badgeDrawn = badge === undefined || badge === null || badge === false ? null : <span {...badgePart}>{badge}</span>
  if (dialog) {
    return (
      <section {...section} data-section={id} data-dialog="" hidden={empty || undefined}>
        <button type="button" {...toggle} aria-haspopup="dialog" onClick={() => setDialogOpen(true)}>
          <span {...heading} className={cn(heading.className, 'flex items-center gap-2')}>
            {title}
            {badgeDrawn}
          </span>
          <Icon name="chevron" />
        </button>
        {/* Drawn out of sight while the dialog is shut, so a section with nothing in it can hide. */}
        {dialogOpen ? null : (
          <div ref={body} hidden>
            {children}
          </div>
        )}
        <PartDialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={title}>
          <div {...contents} data-section={id}>
            {children}
          </div>
        </PartDialog>
      </section>
    )
  }
  return (
    <section {...section} data-section={id} data-open={collapsible ? String(open) : undefined} hidden={empty || undefined}>
      {collapsible ? (
        <button type="button" {...toggle} aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen(!open)}>
          <span {...heading} className={cn(heading.className, 'flex items-center gap-2')}>
            {title}
            {badgeDrawn}
          </span>
          <Icon name="chevron" />
        </button>
      ) : (
        <h2 {...heading}>
          {title}
          {badgeDrawn}
        </h2>
      )}
      <div {...contents} id={bodyId} ref={body} hidden={collapsible && !open ? true : undefined}>
        {children}
      </div>
    </section>
  )
}

/**
 * A titled part of a layout, in the side column or the story. It hides itself
 * when its children draw nothing (the plugin isn't there, the list is empty).
 *
 * - `collapsible` folds it in place with a button on its title. Each player's
 *   choice is remembered per `id` in the profile's `ui:sections`.
 * - `dialog` draws its title, with `badge` if given, as a button that opens
 *   the children in a dialog, looking as a folding section's title does
 *   with its chevron pointing out.
 * - `when` shows it only while a condition holds.
 */
export const Section = overridable('Section', SectionImpl)
