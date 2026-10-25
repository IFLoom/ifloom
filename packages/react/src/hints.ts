/**
 * The React UI's presentation hints: what it reads from the `ui` fields the
 * engine carries to the view as written. The engine gives them no meaning, so
 * they're declared here, by augmenting the engine's hint interfaces, and a
 * game that imports `@ifloom/react` gets them typed.
 *
 * - `ui.transition` on a scene, a place or the game: how a screen comes on and
 *   goes off. On a choice or a room's button: how the screen it leads to comes
 *   in (and, with `out`, how this one goes).
 * - `ui.reveal` on a block: the block waits, then comes in.
 * - `ui.display` on a stat: a number, a bar or pips.
 * - `ui.hue` on an entity or a kind: the colour of their spoken lines.
 * - `ui.dice` on a block: the roll under that key is drawn here, as dice that
 *   tumble and settle before the block comes in.
 * - `ui.timer` on a block: the timer by that id counts down here, after the
 *   block, while it runs.
 * - `ui.tilt` on a block: its picture sits at a slight angle, like a photo
 *   dropped on a table.
 * - `ui.fold` on a section: its beats are drawn as one part that opens and
 *   shuts, under the words given. `fold()` from `@ifloom/engine/flow` writes it.
 *
 * It also declares the inline pieces it draws in prose by default, by
 * augmenting `InlineUi`: `[[ui:modal|words|key|title]]`,
 * `[[ui:image|words|path|alt]]`, and the paper the story shows:
 * `[[ui:mail|body|header|…]]`, `[[ui:prop|words|face]]` and `[[ui:mono|words]]`.
 */
import type { Game, RenderedChoice, Roll, SceneBeat, View } from '@ifloom/engine'

/** The transitions the React UI's styles draw. A game can add its own names in `game.ui.transitionNames`, with CSS of its own. */
export const TRANSITIONS = ['fade', 'slide-up', 'slide-left', 'zoom', 'none'] as const

/** A transition by name: one of `TRANSITIONS`, or one the game adds. */
export type TransitionName = (typeof TRANSITIONS)[number] | (string & {})

/** How something comes on screen (`in`) and goes off it (`out`), over `ms` milliseconds each. A name on its own means both. */
export type Transition = { in?: TransitionName; out?: TransitionName; ms?: number }

/** How a block of prose is revealed: `delay` milliseconds after the reveal before it (or the scene coming on), coming in with `as`. */
export type Reveal = { delay?: number; as?: TransitionName }

/** How the sidebar draws a stat: its number, a bar from `min` to `max`, or pips, one per point. */
export type StatDisplay = 'number' | 'bar' | 'pips'

declare module '@ifloom/engine' {
  interface SceneUi {
    /** How this scene, or this place's room, comes on screen and goes off. The game's `ui.transition` if left out. */
    transition?: Transition | TransitionName
  }
  interface ChoiceUi {
    /** How the screen this leads to comes in, whatever that screen says; with `out`, how this one goes. */
    transition?: Transition | TransitionName
  }
  interface BlockUi {
    /** Reveal this block after the ones before it: `{ delay: 1200, as: 'slide-up' }`. 800 ms and `'fade'` if left out. */
    reveal?: Reveal
    /** Draw the roll the last command made under this kv key here, before this block: `ui: { dice: 'skim' }`. */
    dice?: string
    /** Draw the running timer by this id here, after this block, as a `Countdown`: `ui: { timer: 'phone' }`. */
    timer?: string
    /** Set the block's picture at a slight angle, like a photo dropped on a table: `ui: { tilt: true }`. */
    tilt?: boolean
    /** On a section (`fold()` writes it): draw its beats as one part the player opens and shuts, under these words. */
    fold?: string
  }
  interface StatUi {
    /** How the sidebar draws it. `'number'` if left out; pips suit a range of 20 or less. */
    display?: StatDisplay
  }
  interface EntityUi {
    /** A colour for their spoken lines, as a hue from 0 to 360. */
    hue?: number
  }
  interface InlineUi {
    /** `[[ui:modal|words|key]]`: the words open a dialog showing the prose line `key`, titled `title` if given, else the words. */
    modal: [key: string, title?: string]
    /** `[[ui:image|words|path]]`: the words open the picture at `path` (resolved as `[[img:…]]` resolves it) in the viewer, described by `alt`. */
    image: [path: string, alt?: string]
    /** `[[ui:mail|body|From: Ava|Subject: Hello]]`: a letter or an email, its header lines as written, then the body. A paragraph of its own. */
    mail: string[]
    /** `[[ui:prop|words|sticky]]`: a note in the story's world, by its face (`sticky`, `clip` or `diary`). A paragraph of its own. */
    prop: [face?: 'sticky' | 'clip' | 'diary']
    /** `[[ui:mono|words]]`: words in a typewriter face, such as a sign or a screen. */
    mono: []
  }
  interface GameUi {
    /** How every screen comes and goes when it says nothing itself. `'none'` if left out. */
    transition?: Transition | TransitionName
    /** Transition names beyond `TRANSITIONS`, which the game draws with its own CSS. */
    transitionNames?: string[]
  }
}

/** How long a transition takes when nothing says, in milliseconds. */
export const DEFAULT_TRANSITION_MS = 300

/** How long a reveal waits when it doesn't say, in milliseconds. */
export const DEFAULT_REVEAL_DELAY = 800

/** How long dice tumble before they settle, in milliseconds. The block a `ui.dice` hint is on comes in after it. */
export const DICE_ROLL_MS = 1000

/** The most pips the sidebar draws; a stat with a wider range is drawn as a bar. */
export const MAX_PIPS = 20

/** A transition as a name or a pair, as the pair. */
function asPair(spec: Transition | TransitionName | undefined): Transition {
  if (spec === undefined) return {}
  return typeof spec === 'string' ? { in: spec, out: spec } : spec
}

/** The screen on show, and how it comes in and goes out, as `SceneStage` plays it. */
export type ScreenTransition = { key: string; in: TransitionName; out: TransitionName; ms: number }

/**
 * How the screen in `view` comes and goes: its own `ui.transition` over the
 * game's, with `pressed` (the transition of the choice or button that led
 * here) deciding how it comes in.
 */
export function screenTransition(view: View, game: Game, pressed?: Transition | TransitionName): ScreenTransition {
  const own = asPair(view.scene.ui?.transition)
  const fallback = asPair(game.ui?.transition)
  // A choice's bare name says only how the next screen comes in.
  const lead = typeof pressed === 'string' ? { in: pressed } : (pressed ?? {})
  return {
    key: view.scene.key,
    in: lead.in ?? own.in ?? fallback.in ?? 'none',
    out: own.out ?? fallback.out ?? 'none',
    ms: lead.ms ?? own.ms ?? fallback.ms ?? DEFAULT_TRANSITION_MS,
  }
}

/** How a choice's transition says the screen it leaves goes off: its `out`, if it gives one. */
export function leavingOf(pressed: Transition | TransitionName | undefined): { out?: TransitionName; ms?: number } {
  return typeof pressed === 'object'
    ? { ...(pressed.out !== undefined ? { out: pressed.out } : {}), ...(pressed.ms !== undefined ? { ms: pressed.ms } : {}) }
    : {}
}

/** Every choice and button a view offers: its choices, those its prose holds inline, and the room's buttons. */
export function offeredIn(view: View): RenderedChoice[] {
  const inline = view.scene.beats.flatMap((beat) =>
    (beat.type === 'text' || beat.type === 'say') && beat.spans ? beat.spans.flatMap((span) => (span.type === 'action' ? [span.choice] : [])) : [],
  )
  return [...view.scene.choices, ...inline, ...view.actions]
}

/** A reveal as the React UI plays it: where the prose holds back, and when what follows comes, from the scene coming on. */
export type RevealPoint = { delay: number; as: TransitionName; at: number }

/** A run of a scene's beats, and the reveal that holds it back (null for the first, shown with the scene). */
export type RevealGroup = {
  reveal: RevealPoint | null
  /** The roll whose dice are drawn before this run, which waits for them to settle: a block's `ui.dice` naming one of `rolled`. */
  dice?: Roll
  /** Its beats, each with its index in the scene's beats. */
  beats: { beat: SceneBeat; index: number }[]
}

/** The roll a beat's `ui.dice` names among `rolls`: the last one under that key. */
export function rollFor(beat: SceneBeat, rolls: readonly Roll[]): Roll | undefined {
  const key = beat.ui?.dice
  return typeof key === 'string' ? rolls.findLast((roll) => roll.key === key) : undefined
}

/**
 * A scene's beats in groups: those shown with the scene, then each block with
 * `ui.reveal` and the beats after it. With `rolled`, the rolls being shown
 * as they're made, a block whose `ui.dice` names one of them starts a group
 * too, which waits `DICE_ROLL_MS` for the dice to settle.
 */
export function revealGroups(beats: readonly SceneBeat[], rolled: readonly Roll[] = []): RevealGroup[] {
  const groups: RevealGroup[] = [{ reveal: null, beats: [] }]
  let at = 0
  beats.forEach((beat, index) => {
    const reveal = beat.ui?.reveal
    const dice = rollFor(beat, rolled)
    if (reveal || dice) {
      const wait = reveal ? (typeof reveal.delay === 'number' && reveal.delay >= 0 ? reveal.delay : DEFAULT_REVEAL_DELAY) : 0
      const delay = wait + (dice ? DICE_ROLL_MS : 0)
      at += delay
      groups.push({ reveal: { delay, as: reveal?.as ?? 'fade', at }, ...(dice ? { dice } : {}), beats: [] })
    }
    groups.at(-1)!.beats.push({ beat, index })
  })
  return groups
}

/** When the last reveal in these beats comes, in milliseconds from the scene coming on; 0 with none. `rolled` as for `revealGroups`. */
export function lastReveal(beats: readonly SceneBeat[], rolled: readonly Roll[] = []): number {
  return revealGroups(beats, rolled).reduce((last, group) => Math.max(last, group.reveal?.at ?? 0), 0)
}
