/**
 * Presentation hints: a `ui` field on scenes, choices, blocks, kinds,
 * entities, stats, actions and the game, carried to the view as written and
 * given no meaning here. How a scene comes on screen, how a paragraph is
 * revealed, whether a stat is a bar, what colour someone's lines are: a UI
 * package decides those and names its own hints. The engine owns what changes
 * the state, the rules and replay; a UI owns how things look and move.
 *
 * A UI package types its hints by augmenting the interface for where they're
 * written, as a plugin types its traits:
 *
 * ```ts
 * declare module '@ifloom/engine' {
 *   interface SceneUi { transition?: 'fade' | 'slide-up' }
 * }
 * ```
 *
 * The only check is that a hint is data: an object of values a save or a JSON
 * file could hold, with no functions in it.
 */
import { INLINE_MARKUP, UI_NAME, uiParts } from '../sceneBody.ts'
import { byKey, defineFeature, mergedByKey } from './feature.ts'

/**
 * The ui hints a scene or a room scene takes in its `ui`, for the UI that renders it. The engine declares none, and
 * a UI package augments this interface with its own.
 */
export interface SceneUi {}
/** The ui hints a choice or an action takes in its `ui`. The engine declares none, and a UI package augments this interface with its own. */
export interface ChoiceUi {}
/**
 * The ui hints a block of a scene's body takes in its `ui`, carried on the first beat the block makes. The engine
 * declares none, and a UI package augments this interface with its own.
 */
export interface BlockUi {}
/**
 * The ui hints a kind takes for each of its entities, and an entity takes over its kind's. The engine declares none,
 * and a UI package augments this interface with its own.
 */
export interface EntityUi {}
/** The ui hints a stat takes in its `ui`. The engine declares none, and a UI package augments this interface with its own. */
export interface StatUi {}
/** The ui hints the whole game takes in its `ui`. The engine declares none, and a UI package augments this interface with its own. */
export interface GameUi {}

/**
 * The UI pieces a UI renders inside a line of prose from `[[ui:name|words|arg|…]]`, by name. Each name maps to the
 * arguments it takes after the words, as a tuple of text.
 *
 * The engine declares none, and a UI package augments this interface with its own:
 *
 * ```ts
 * declare module '@ifloom/engine' {
 *   interface InlineUi { modal: [key: string, title?: string] }
 * }
 * ```
 *
 * The engine never reads it. The view's `{ type: 'ui' }` span has `name: string` and `args: string[]`, so a name no
 * UI declared still comes through, and this interface only types a UI's components.
 */
export interface InlineUi {}

/**
 * The target a `ui` field is written on, which a UI package's checker reads.
 *
 * It's a scene or room scene (`scene`), a choice or action (`choice`), a block or section (`block`), a stat, a kind or
 * entity (`entity`), or the game.
 */
export type UiTarget = 'scene' | 'choice' | 'block' | 'stat' | 'entity' | 'game'

/** The arguments of the UI piece named `N`, as a UI package declared them in {@link InlineUi}. Any text when no package declared `N`. */
export type InlineUiArgs<N extends string> = N extends keyof InlineUi ? InlineUi[N] : readonly string[]

/**
 * A `ui` field of ui hints, typed by the hints a UI package declared for that target. It also takes undeclared hints,
 * which the engine carries all the same.
 */
export type Ui<T> = T & { readonly [hint: string]: unknown }

/** The ui feature's content key and reference, as types. */
export type UiShape = {
  game: {
    /** The game's ui hints, such as how every screen comes in. The engine carries them to the view as written and gives them no meaning. */
    ui?: Ui<GameUi>
  }
  pack: {
    /** The pack's ui hints for the whole game, merged hint by hint. A later pack's hint replaces an earlier one's, and the rest stay. */
    ui?: Ui<GameUi>
  }
  lists: 'ui'
  references: {
    /** A reference to a `ui` field, which must be data, with the target it's written on and that target's id when it has one. */
    ui: { ui: unknown; on: UiTarget; id?: string }
  }
}

/** Is it a plain object, as a hint is written? */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value) as unknown
  return proto === Object.prototype || proto === null
}

/** Where in a hint something isn't data, as `ui.a.b`. */
function notData(value: unknown, path: string): string[] {
  if (typeof value === 'function') return [`${path} is a function; ui hints are data`]
  if (typeof value === 'symbol' || typeof value === 'bigint') return [`${path} is a ${typeof value}; ui hints are data`]
  if (Array.isArray(value)) return value.flatMap((inner, index) => notData(inner, `${path}[${index}]`))
  if (typeof value === 'object' && value !== null) {
    if (!isPlainObject(value)) return [`${path} is not plain data; ui hints are objects, arrays, text, numbers and true/false`]
    return Object.entries(value).flatMap(([key, inner]) => notData(inner, `${path}.${key}`))
  }
  return []
}

/** Returns the problems with a `ui` field, when it isn't an object or holds something that isn't data. Empty for a field left out. */
export function uiProblems(ui: unknown): string[] {
  if (ui === undefined) return []
  if (!isPlainObject(ui)) return ['ui must be an object of hints']
  return notData(ui, 'ui')
}

/** Returns a view's `ui` field to spread into it, `{ ui }` when there are hints and an empty object when there are none. */
export function withUi<T>(ui: T | undefined): { ui: T } | Record<never, never> {
  return ui === undefined ? {} : { ui }
}

/**
 * What is wrong with the `[[ui:…]]` markup in a line of prose: no name, a
 * name that isn't an id, no words, an empty argument, markup that isn't
 * closed, or markup in a `> ` line, where it is shown as written. What the
 * name means is a UI's to check.
 */
function inlineUiProblems(text: string): string[] {
  if (!text.includes('[[ui')) return []
  const out: string[] = []
  let written = 0
  for (const match of text.matchAll(INLINE_MARKUP)) {
    if (match[1] !== 'ui') continue
    written += 1
    const { name, text: words, args } = uiParts(match[2], match[3])
    if (!name) out.push('[[ui]] needs a name: [[ui:name|words]]')
    else if (!UI_NAME.test(name))
      out.push(`[[ui:${name}]]: a name is letters, digits, "-" and "_", in parts joined by ".", with a plugin's name and "/" in front for a plugin's`)
    else if (!words) out.push(`[[ui:${name}]] needs the words to show: [[ui:${name}|words]]`)
    else if (args.some((arg) => arg === '')) out.push(`[[ui:${name}|${words}|…]] has an empty argument; leave out the extra "|"`)
  }
  const opened = (text.match(/\[\[ui\b/g) ?? []).length
  if (opened > written) out.push('[[ui:…]] is not closed with "]]", or is missing its ":"')
  for (const block of text.split('\n\n')) {
    if (block.trim().startsWith('> ') && block.includes('[[ui:')) out.push('[[ui]] is shown as written in a "> " line; use it in narration or a spoken line')
  }
  return out
}

/** The ui feature, which merges the game's ui hints and checks that every `ui` field is data. */
export const ui = defineFeature<UiShape>({
  name: 'ui',
  pack: mergedByKey<UiShape['game'], UiShape['pack'], unknown>(
    'ui',
    (pack) => pack.ui,
    (game, hints) => {
      game.ui = hints as Ui<GameUi>
    },
  ),
  content: { ui: { declares: byKey('ui hint'), words: null } },
  lists: ['ui'],
  check: (game, tools) => tools.check({ list: 'ui' }, 'ui', [{ ui: game.ui, on: 'game' }]),
  resolve: () => ({ ui: (ref) => uiProblems(ref.ui) }),
  // `[[reveal]]` was prose markup once. It is a block's hint now, so one left in prose would be shown as written.
  markup: (_game, text) => [
    ...(/\[\[reveal[\]:|]/.test(text)
      ? [
          "[[reveal]] is no longer markup and would be shown as written; put the paragraph in a block of its own with a ui hint, such as the React UI's ui: { reveal: { delay: 800 } }",
        ]
      : []),
    ...inlineUiProblems(text),
  ],
})
