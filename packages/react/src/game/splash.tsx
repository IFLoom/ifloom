/**
 * Splash cards: the cards shown one after another as the game opens, before
 * the gate and the title screen, such as the studio's, the publisher's, the
 * engine's and the game's logo. A game turns them on with `pages`, and gets
 * the "Powered by IFLoom" card unless it says otherwise. `SplashPage` in
 * `pages.tsx` shows them.
 */
import type { ComponentType, CSSProperties } from 'react'
import { buttonVariants } from '../components/ui/button.tsx'
import { cn } from '../lib/utils.ts'
import { useGame } from './context.tsx'
import { useMotion } from './motion.tsx'
import type { Transition, TransitionName } from '../hints.ts'
import { usePart } from './overrides.tsx'
import { useWords } from './words.ts'

/** One splash card, shown for `ms` between its transitions in and out. It shows `art`, `title` and `text`, or its own `component`. */
export type SplashCard = {
  /** The card's id, which its element carries as `data-splash-card`. */
  id: string
  /** The path of the card's picture, such as a logo. */
  art?: string
  /** The card's heading, such as the studio's name. */
  title?: string
  /** A line under the heading. */
  text?: string
  /** A component that renders the whole card in place of `art`, `title` and `text`, such as an animated logo. */
  component?: ComponentType
  /** The card's hold, in milliseconds between coming in and going out. 2000 if left out. */
  ms?: number
  /** The card's transitions in and out, a name or `{ in, out, ms }`. A fade of 600 milliseconds each way if left out. */
  transition?: Transition | TransitionName
}

/** The splash cards a game shows as it opens, in `PagesOptions.splash`. */
export type SplashOptions = {
  /** The cards, in the order they show. Leave out `poweredByIFLoom()` to leave out its card. */
  cards: SplashCard[]
  /** False to make the player watch every card. A click, Enter or Space skips one, and Escape skips them all, if left out. */
  skippable?: boolean
}

/** How long a card holds when it doesn't say. */
export const SPLASH_MS = 2000
/** How long a card's transitions take each way when it doesn't say. */
export const SPLASH_TRANSITION_MS = 600

/** Returns a card's transitions in and out and their length, with the defaults filled in. */
export function splashTransition(card: SplashCard): { in: TransitionName; out: TransitionName; ms: number } {
  const given = typeof card.transition === 'string' ? { in: card.transition } : (card.transition ?? {})
  const name = given.in ?? 'fade'
  return { in: name, out: given.out ?? name, ms: given.ms ?? SPLASH_TRANSITION_MS }
}

/** The IFLoom mark, drawn for the "Powered by IFLoom" card. */
export function IFLoomMark(props: { className?: string; 'data-part'?: string }) {
  return (
    <svg {...props} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="ifloom-mark-ember" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffc27a" />
          <stop offset="0.55" stopColor="#ff8a3d" />
          <stop offset="1" stopColor="#f0642a" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="#050505" />
      <g fill="url(#ifloom-mark-ember)">
        <rect x="15" y="14" width="8" height="36" rx="2" />
        <rect x="29" y="14" width="8" height="36" rx="2" />
        <rect x="29" y="14" width="21" height="8" rx="2" />
        <rect x="29" y="28" width="16" height="7" rx="2" />
      </g>
    </svg>
  )
}

/** The ember gradient of the IFLoom mark, for the wordmark's letters. */
const EMBER = 'bg-linear-to-br from-[#ffc27a] via-[#ff8a3d] to-[#f0642a] bg-clip-text text-transparent'

/**
 * The IFLoom card's link to the site, tagged so the site's analytics can count visits from games' splash cards. The
 * game's id goes in `utm_content`; it's the developer's id for the game, never anything about the player.
 */
export function ifloomSiteUrl(gameId: string): string {
  const url = new URL('https://ifloom.dev/')
  url.searchParams.set('utm_source', 'ifloom-game')
  url.searchParams.set('utm_medium', 'splash')
  url.searchParams.set('utm_campaign', 'powered-by-ifloom')
  if (gameId) url.searchParams.set('utm_content', gameId)
  return url.toString()
}

/** A style that starts a rising line `ms` after the card comes in. */
const riseAt = (ms: number) => ({ '--ifloom-rise-at': `${ms}ms` }) as CSSProperties

function PoweredBy() {
  const words = useWords()
  const motion = useMotion()
  const { runner } = useGame()
  const art = usePart('splash-art', 'relative mx-auto size-28')
  const text = usePart('splash-text', 'text-center text-sm font-medium tracking-[0.3em] text-muted-foreground uppercase')
  const title = usePart('splash-title', cn('text-center font-heading text-5xl font-bold tracking-tight', EMBER))
  const link = usePart('splash-link', cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'rounded-full'))
  return (
    <div data-ifloom-splash={motion ? 'motion' : 'still'} className="flex flex-col items-center gap-3">
      <div {...art}>
        <div data-ifloom-halo="" aria-hidden="true" className="absolute -inset-6 rounded-full bg-[#ff8a3d]/40 blur-2xl" />
        <div data-ifloom-mark="" className="relative size-full overflow-hidden rounded-[22%] shadow-xl shadow-[#f0642a]/30">
          <IFLoomMark className="size-full" />
          <div
            data-ifloom-shine=""
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-1/3 -translate-x-[150%] bg-linear-to-r from-transparent via-white/50 to-transparent"
          />
        </div>
      </div>
      <p {...text} data-ifloom-rise="" style={riseAt(350)}>
        {words('poweredBy')}
      </p>
      <p {...title} data-ifloom-rise="" style={riseAt(500)}>
        IFLoom
      </p>
      <div data-ifloom-rise="" style={riseAt(800)}>
        <a {...link} href={ifloomSiteUrl(runner.game.id)} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
          {words('visitIfloom')} ↗
        </a>
      </div>
    </div>
  )
}

/**
 * Returns the "Powered by IFLoom" card, with the IFLoom mark, the words `ui.poweredBy`, the IFLoom name and a link to
 * ifloom.dev labelled `ui.visitIfloom`. It holds for 3000 milliseconds.
 *
 * A game that lists its own cards puts it among them where it should show, and `overrides` change its timing or
 * transition.
 */
export function poweredByIFLoom(overrides: Partial<Omit<SplashCard, 'id'>> = {}): SplashCard {
  return { id: 'ifloom', component: PoweredBy, ms: 3000, ...overrides }
}

const DEFAULT_CARDS: readonly SplashCard[] = [poweredByIFLoom()]

/**
 * Returns the splash cards a game's `splash` option shows: the "Powered by IFLoom" card alone when it's left out, none
 * for `false`, and otherwise the cards it lists.
 */
export function splashCards(splash: false | SplashOptions | undefined): readonly SplashCard[] {
  if (splash === false) return []
  return splash ? splash.cards : DEFAULT_CARDS
}
