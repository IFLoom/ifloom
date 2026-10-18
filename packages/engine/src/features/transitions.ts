/**
 * Transitions: how a scene or a room comes on screen and goes off it, and how
 * a scene's prose can be revealed a step at a time. Data only, as audio and
 * media are (ADR 0004): the engine names the transition in the view and the UI
 * draws it, or doesn't.
 *
 * A scene, a plugin's stage (a place) and the game as a whole can declare one,
 * and a `transition` effect says how the next screen arrives, for one command.
 * The view's `transition` describes the screen on show: a key that changes
 * when the screen does, and how it comes in and goes out.
 */
import { defineFeature } from './feature.ts'

/** The transitions every UI is asked to know. A game may name more in `game.transitions.names`. */
export const TRANSITIONS = ['fade', 'slide-up', 'slide-left', 'zoom', 'none'] as const

/**
 * A transition, by name: one of `TRANSITIONS`, or a name the game declares in
 * `game.transitions.names` for its UI to draw with its own CSS.
 */
export type TransitionName = (typeof TRANSITIONS)[number] | (string & {})

/**
 * How something comes on screen (`in`) and goes off it (`out`), over `ms`
 * milliseconds each. A name on its own means both ways: `'fade'`.
 */
export type Transition = { in?: TransitionName; out?: TransitionName; ms?: number }

/** How long a transition takes when nothing says, in milliseconds. */
export const DEFAULT_TRANSITION_MS = 300

/** The transition of the screen on show, as the view has it. */
export type TransitionView = {
  /**
   * Which screen this is: `scene:<id>`, `minigame:<id>`, or `room:<stage id>`
   * (`room` with no stage). A UI plays a transition when it changes, and only then.
   */
  key: string
  /** How this screen comes on. `'none'` when nothing says. */
  in: TransitionName
  /** How this screen goes off when the next one replaces it. `'none'` when nothing says. */
  out: TransitionName
  /** How long each takes, in milliseconds. */
  ms: number
}

/**
 * How a block of prose is revealed after the blocks before it: after `delay`
 * milliseconds (from the reveal before, or from the scene coming on), drawn
 * with the transition `as`. Written as `[[reveal:800|fade]]` in prose.
 */
export type Reveal = { delay?: number; as?: TransitionName }

/** Fields a scene and a plugin's stage can carry. */
export type TransitionFields = {
  /** How it comes on screen and goes off. The game's `transitions.default` if left out. */
  transition?: Transition | TransitionName
}

/** What the transitions feature adds, as types. */
export type TransitionsShape = {
  state: {
    /**
     * How the screen after the last command arrives, as a `transition`
     * effect set it, or null. It lasts one command: the next one clears it.
     */
    transition: { to: TransitionName; ms?: number } | null
  }
  effects: {
    /** The screen this command leaves on comes in with `to`, over `ms`: `{ kind: 'transition', to: 'fade' }`. */
    transition: { kind: 'transition'; to: TransitionName; ms?: number }
  }
  game: {
    /**
     * Transitions for the whole game: `default` for every scene and room that
     * declares none, and `names` beyond the built-in ones (`TRANSITIONS`), which
     * the UI draws with CSS of the game's own.
     */
    transitions?: { default?: Transition | TransitionName; names?: string[] }
  }
  view: {
    /** The screen on show, and how it comes in and goes out. See `TransitionView`. */
    transition: TransitionView
  }
}

/** A transition as a name or a pair, as the pair. */
function asPair(spec: Transition | TransitionName | undefined): Transition {
  if (spec === undefined) return {}
  return typeof spec === 'string' ? { in: spec, out: spec } : spec
}

/**
 * The transition of one screen: the screen's own (`declared`), over the game's
 * default, with the last command's `transition` effect, if any, deciding how
 * it comes in. Internal; `screen` calls it.
 */
export function transitionView(
  key: string,
  declared: Transition | TransitionName | undefined,
  game: { transitions?: { default?: Transition | TransitionName } },
  override: { to: TransitionName; ms?: number } | null | undefined,
): TransitionView {
  const own = asPair(declared)
  const fallback = asPair(game.transitions?.default)
  return {
    key,
    in: override?.to ?? own.in ?? fallback.in ?? 'none',
    out: own.out ?? fallback.out ?? 'none',
    ms: override?.ms ?? own.ms ?? fallback.ms ?? DEFAULT_TRANSITION_MS,
  }
}

/** The names a transition uses. */
function namesIn(spec: Transition | TransitionName | undefined): string[] {
  const pair = asPair(spec)
  return [pair.in, pair.out].filter((name): name is string => name !== undefined)
}

/** What is wrong with the names and length of a transition, against the names a game knows. */
function problemsOf(spec: Transition | TransitionName | undefined, known: ReadonlySet<string>): string[] {
  const out = [...new Set(namesIn(spec))].filter((name) => !known.has(name)).map((name) => `unknown transition "${name}"`)
  const ms = typeof spec === 'object' ? spec.ms : undefined
  if (ms !== undefined && !(typeof ms === 'number' && ms >= 0)) out.push("a transition's ms must be 0 or more")
  return out
}

/** The transition names a game knows: the built-in ones and its own. */
function knownNames(game: { transitions?: { names?: string[] } }): Set<string> {
  return new Set<string>([...TRANSITIONS, ...(game.transitions?.names ?? [])])
}

/** `[[reveal]]` markup as written, on a block of its own: its delay and its name. */
export const REVEAL_MARKUP = /\[\[reveal(?::([^\]|]*))?(?:\|([^\]]*))?\]\]/g

/** A reveal as the markup that writes it, so a block's `reveal` and markup become the same beat. */
export function revealMarkup(reveal: Reveal): string {
  const delay = reveal.delay !== undefined ? `:${reveal.delay}` : ''
  const as = reveal.as !== undefined ? `|${reveal.as}` : ''
  return `[[reveal${delay}${as}]]`
}

export const transitions = defineFeature<TransitionsShape>({
  name: 'transitions',
  state: {
    transition: { start: () => null, load: () => null },
  },
  effects: {
    transition: {
      apply: (state, effect) => ({ ...state, transition: { to: effect.to, ...(effect.ms !== undefined ? { ms: effect.ms } : {}) } }),
      references: (effect) => [{ transition: { in: effect.to, ms: effect.ms } }],
    },
  },
  check: (game, tools) => {
    tools.check(undefined, 'transitions', [{ transition: game.transitions?.default }])
    for (const name of game.transitions?.names ?? []) {
      if (!/^[a-z0-9-]+$/.test(name)) tools.problem(undefined, 'transitions', `transition name "${name}" is not lower-case letters, digits and "-"`)
    }
  },
  resolve: (game) => {
    const known = knownNames(game)
    return {
      transition: (ref) => problemsOf(ref.transition, known),
      reveal: (ref) => [
        ...problemsOf(ref.reveal.as, known),
        ...(ref.reveal.delay !== undefined && !(Number.isInteger(ref.reveal.delay) && ref.reveal.delay >= 0)
          ? ["a reveal's delay must be whole milliseconds, 0 or more"]
          : []),
      ],
    }
  },
  markup: (game, text) => {
    const known = knownNames(game)
    const out: string[] = []
    for (const match of text.matchAll(REVEAL_MARKUP)) {
      const delay = match[1]?.trim()
      if (delay !== undefined && delay !== '' && !/^\d+$/.test(delay)) out.push(`[[reveal]] has a delay of "${delay}"; it is whole milliseconds`)
      const name = match[2]?.trim()
      if (name && !known.has(name)) out.push(`unknown transition "${name}"`)
    }
    // On a line of its own, as `[[sound:…]]` is: anywhere else it is shown as written.
    const blocks = text.split('\n\n').map((block) => block.trim())
    if (blocks.some((block) => block.includes('[[reveal') && !/^\[\[reveal[^\]]*\]\]$/.test(block))) {
      out.push('[[reveal]] goes on a line of its own, with a blank line before and after')
    }
    return out
  },
  view: (_state, _game, shown) => ({ transition: shown.transition }),
  // A transition effect lasts one command: one the command didn't set is cleared. After the plugins, so theirs count too.
  afterCommand: {
    at: 'afterPlugins',
    run: (before, after) => (after.transition !== null && after.transition === before.transition ? { ...after, transition: null } : after),
  },
})
