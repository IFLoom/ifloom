/**
 * Splash cards: the cards shown one after another as the game opens, before
 * the gate and the title screen, such as the studio's, the publisher's, the
 * engine's and the game's logo. A game turns them on with `pages`, and gets
 * the "Powered by IFLoom" card unless it says otherwise. `SplashPage` in
 * `pages.tsx` shows them.
 */
import type { ComponentType } from 'react'
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
    <svg {...props} viewBox="0 0 64 64" role="img" aria-label="IFLoom">
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

function PoweredBy() {
  const words = useWords()
  const art = usePart('splash-art', 'mx-auto size-24')
  const text = usePart('splash-text', 'text-center text-lg text-muted-foreground')
  return (
    <>
      <IFLoomMark {...art} />
      <p {...text}>{words('poweredBy')}</p>
    </>
  )
}

/**
 * Returns the "Powered by IFLoom" card, with the IFLoom mark and the words `ui.poweredBy`.
 *
 * A game that lists its own cards puts it among them where it should show, and `overrides` change its timing or
 * transition.
 */
export function poweredByIFLoom(overrides: Partial<Omit<SplashCard, 'id'>> = {}): SplashCard {
  return { id: 'ifloom', component: PoweredBy, ...overrides }
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
