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
 *   shuts, under the words given. `fold()` from `@ifloom/engine` writes it.
 *
 * It also declares the inline pieces it draws in prose by default, by
 * augmenting `InlineUi`: `[[ui:modal|words|key|title]]`,
 * `[[ui:image|words|path|alt]]`, and the paper the story shows:
 * `[[ui:mail|body|header|…]]`, `[[ui:prop|words|face]]` and `[[ui:mono|words]]`.
 *
 * Each hint is declared once more as data, in `UI_HINTS`: where content
 * writes it and what a good value is. `checkUiHints` is built from those.
 */
import type { Game, UiTarget } from '@ifloom/engine'

/**
 * The names of the transitions the React UI's styles play. A game adds its own names in `ui.transitionNames` on the
 * game, with CSS of its own.
 */
export const TRANSITIONS = ['fade', 'slide-up', 'slide-left', 'zoom', 'none'] as const

/** The name of a transition, one of `TRANSITIONS` or one the game adds. */
export type TransitionName = (typeof TRANSITIONS)[number] | (string & {})

/** A pair of transitions for a screen coming in and going out, the value of a `ui.transition` hint. A name on its own sets `in`. */
export type Transition = {
  /** The transition the new screen comes in with. */
  in?: TransitionName
  /** The transition the screen before goes out with. */
  out?: TransitionName
  /** The length of each transition, in milliseconds. 300 if left out. */
  ms?: number
}

/** The value of a block's `ui.reveal` hint, which holds the block back and then brings it in. */
export type Reveal = {
  /** The wait after the reveal before, or after the scene comes on, in milliseconds. 800 if left out. */
  delay?: number
  /** The transition the block comes in with. `'fade'` if left out. */
  as?: TransitionName
}

/** The value of a stat's `ui.display` hint, which renders it as its number, a bar from `min` to `max`, or pips, one per point. */
export type StatDisplay = 'number' | 'bar' | 'pips'

declare module '@ifloom/engine' {
  interface SceneUi {
    /** The transitions this scene, or this location's room, comes on screen and goes off with. The game's `ui.transition` if left out. */
    transition?: Transition | TransitionName
  }
  interface ChoiceUi {
    /** The transition the screen this leads to comes in with, over that screen's own. With `out`, it also sets how this screen goes. */
    transition?: Transition | TransitionName
  }
  interface BlockUi {
    /** The reveal that holds this block back until after the ones before it, such as `{ delay: 1200, as: 'slide-up' }`. */
    reveal?: Reveal
    /** The kv key of a roll the last command made, rendered as dice before this block, such as `ui: { dice: 'skim' }`. */
    dice?: string
    /** The id of a timer rendered as a `Countdown` after this block while it runs, such as `ui: { timer: 'phone' }`. */
    timer?: string
    /** True to set the block's picture at a slight angle, like a photo dropped on a table, such as `ui: { tilt: true }`. */
    tilt?: boolean
    /**
     * The words a fold opens by. On a section, written by `fold()`, it renders the section's beats as one part the
     * player opens and shuts.
     */
    fold?: string
  }
  interface StatUi {
    /** The way the sidebar renders the stat. `'number'` if left out, and pips need a range of 20 or less. */
    display?: StatDisplay
  }
  interface EntityUi {
    /** The colour of the entity's spoken lines, as a hue from 0 to 360. */
    hue?: number
  }
  interface InlineUi {
    /**
     * The arguments of `[[ui:modal|words|key|title]]`, whose words open a dialog with the prose key's line. The
     * dialog's title is `title`, else the words.
     */
    modal: [key: string, title?: string]
    /**
     * The arguments of `[[ui:image|words|path|alt]]`, whose words open the picture at `path` in the viewer. `path`
     * resolves as `[[img:…]]` does.
     */
    image: [path: string, alt?: string]
    /**
     * The header lines of `[[ui:mail|body|From: Ava|Subject: Hello]]`, a letter or an email in a paragraph of its own.
     * The body follows the header.
     */
    mail: string[]
    /**
     * The face of `[[ui:prop|words|sticky]]`, a note in the story's world in a paragraph of its own. The face is
     * `sticky`, `clip` or `diary`.
     */
    prop: [face?: 'sticky' | 'clip' | 'diary']
    /** The arguments of `[[ui:mono|words]]`, which takes none. It sets the words in a typewriter face, such as a sign or a screen. */
    mono: []
  }
  interface GameUi {
    /** The transitions every screen comes and goes with when it sets none itself. `'none'` if left out. */
    transition?: Transition | TransitionName
    /** The game's transition names beyond `TRANSITIONS`, which its own CSS plays. */
    transitionNames?: string[]
    /**
     * The ids of the game's UI settings that the React UI acts on itself. `textSize` names a choice setting that sizes
     * the page (`small`, `normal`, `large` or `larger`).
     *
     * `images` names a toggle setting that leaves the story's pictures and videos out while it's off.
     */
    settings?: { textSize?: string; images?: string }
  }
}

/**
 * The text sizes the React UI's styles size the page for, the values of the `ui.settings.textSize` setting. Another
 * value needs CSS of the game's own.
 */
export const TEXT_SIZES = ['small', 'normal', 'large', 'larger'] as const

/** How long a transition takes when nothing says, in milliseconds. */
export const DEFAULT_TRANSITION_MS = 300

/** How long a reveal waits when it doesn't say, in milliseconds. */
export const DEFAULT_REVEAL_DELAY = 800

/** How long dice tumble before they settle, in milliseconds. The block a `ui.dice` hint is on comes in after it. */
export const DICE_ROLL_MS = 1000

/** The most pips the sidebar draws; a stat with a wider range is drawn as a bar. */
export const MAX_PIPS = 20

/** The context a {@link UiHint}'s check receives, with the game, the target the hint is on and the game's transition names. */
export type HintCheckContext = {
  /** The loaded game, for a hint that names something in it. */
  game: Game
  /** The sort of target the hint is on, such as a scene, a choice, a block, a stat, an entity or the game. */
  on: UiTarget
  /** The target's id, such as a stat's, a scene's or a choice's id, or a kind's or an entity's reference. */
  id?: string
  /** The transition names the game has, `TRANSITIONS` with the game's own `ui.transitionNames`. */
  transitions: ReadonlySet<string>
}

/**
 * A `ui` hint a UI reads, declared once with its name, its targets and a check of its value. `checkUiHints` reports a
 * hint that no declaration names for its target, and runs each declaration's check.
 *
 * A plugin UI declares its own in `PluginUi.hints`.
 */
export type UiHint = {
  /** The hint's key under `ui`. */
  name: string
  /** The sorts of target content can write the hint on. */
  on: readonly UiTarget[]
  /**
   * Returns the problems with a value, or nothing when it's fine. Word each problem to follow the place it's reported
   * at, such as `ui.timer "kettle" is not a timer the game has`.
   */
  check?: (value: unknown, cx: HintCheckContext) => string | readonly string[] | undefined
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/** A transition, by name or `{ in, out, ms }`: each name one the game has, `ms` 0 or more. */
function checkTransition(spec: unknown, { transitions }: HintCheckContext): string[] {
  const pair = typeof spec === 'string' ? { in: spec } : spec
  if (!isRecord(pair)) return ['ui.transition is a name or { in, out, ms }']
  const out: string[] = []
  for (const side of ['in', 'out'] as const) {
    const name = pair[side]
    if (name !== undefined && (typeof name !== 'string' || !transitions.has(name)))
      out.push(`ui.transition ${side} "${String(name)}" is not a transition the game has`)
  }
  if (pair.ms !== undefined && !(typeof pair.ms === 'number' && pair.ms >= 0)) out.push('ui.transition ms must be 0 or more')
  return out
}

/** The game's `ui.settings`: each names a ui setting of the right type, and a text size's options are sizes the styles draw. */
function checkSettings(settings: unknown, { game }: HintCheckContext): string[] {
  if (!isRecord(settings)) return ["ui.settings is { textSize?, images? }, each a setting's id"]
  const out: string[] = []
  for (const key of Object.keys(settings))
    if (key !== 'textSize' && key !== 'images') out.push(`ui.settings.${key} is not a setting the React UI honours; it has textSize and images`)
  const declared = (key: string, type: 'choice' | 'toggle') => {
    const id = settings[key]
    if (id === undefined) return undefined
    const setting = (game.settings ?? []).find((entry) => entry.id === id)
    if (!setting || setting.type !== type || setting.affects !== 'ui') {
      out.push(`ui.settings.${key} "${String(id)}" is not a ui ${type} setting the game has`)
      return undefined
    }
    return setting
  }
  const size = declared('textSize', 'choice')
  if (size?.type === 'choice')
    for (const option of size.options)
      if (!(TEXT_SIZES as readonly unknown[]).includes(option.value))
        out.push(`ui.settings.textSize option "${String(option.value)}" is not a size the styles draw (${TEXT_SIZES.join(', ')}); size it with CSS of your own`)
  declared('images', 'toggle')
  return out
}

/** A stat's range, when both bounds are numbers in content. A bound worked out in play isn't known until then. */
function statRange(game: Game, id: string | undefined): number | undefined {
  const stat = (game.stats ?? []).find((entry) => entry.id === id)
  if (!stat) return undefined
  const max = stat.max ?? 100
  const min = stat.min ?? 0
  return typeof max === 'number' && typeof min === 'number' ? max - min : undefined
}

/** The hints the React UI reads, each declared once. */
export const UI_HINTS: readonly UiHint[] = [
  { name: 'transition', on: ['scene', 'choice', 'game'], check: checkTransition },
  {
    name: 'reveal',
    on: ['block'],
    check: (reveal, { transitions }) => {
      if (!isRecord(reveal)) return 'ui.reveal is { delay, as }'
      const out: string[] = []
      if (reveal.delay !== undefined && !(Number.isInteger(reveal.delay) && (reveal.delay as number) >= 0))
        out.push('ui.reveal delay must be whole milliseconds, 0 or more')
      if (reveal.as !== undefined && (typeof reveal.as !== 'string' || !transitions.has(reveal.as)))
        out.push(`ui.reveal as "${String(reveal.as)}" is not a transition the game has`)
      return out
    },
  },
  {
    name: 'dice',
    on: ['block'],
    check: (dice) => (typeof dice === 'string' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(dice) ? undefined : "ui.dice names a roll's key: letters, digits and _"),
  },
  {
    name: 'timer',
    on: ['block'],
    check: (timer, { game }) =>
      typeof timer === 'string' && (game.timers ?? []).some((entry) => entry.id === timer)
        ? undefined
        : `ui.timer "${String(timer)}" is not a timer the game has`,
  },
  { name: 'tilt', on: ['block'], check: (tilt) => (typeof tilt === 'boolean' ? undefined : 'ui.tilt is true or false') },
  { name: 'fold', on: ['block'], check: (fold) => (typeof fold === 'string' && fold.trim() ? undefined : 'ui.fold is the words the fold is opened by') },
  {
    name: 'display',
    on: ['stat'],
    check: (display, { game, id }) => {
      if (display !== 'number' && display !== 'bar' && display !== 'pips') return "ui.display is 'number', 'bar' or 'pips'"
      const range = statRange(game, id)
      return display === 'pips' && range !== undefined && range > MAX_PIPS
        ? `ui.display pips needs a range of ${MAX_PIPS} or less; this one is ${range}`
        : undefined
    },
  },
  {
    name: 'hue',
    on: ['entity'],
    check: (hue) => (typeof hue === 'number' && hue >= 0 && hue <= 360 ? undefined : 'ui.hue is a number from 0 to 360'),
  },
  {
    name: 'transitionNames',
    on: ['game'],
    check: (list) =>
      Array.isArray(list) && list.every((name) => typeof name === 'string' && /^[a-z0-9-]+$/.test(name))
        ? undefined
        : 'ui.transitionNames lists names of lower-case letters, digits and "-"',
  },
  { name: 'settings', on: ['game'], check: checkSettings },
]
