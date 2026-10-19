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
import { defineFeature } from './feature.ts'

/** Hints on a scene, and on a room's stage (a place), for the UI that draws it. Empty here; a UI package augments it. */
export interface SceneUi {}
/** Hints on a choice or a room's button. Empty here; a UI package augments it. */
export interface ChoiceUi {}
/** Hints on a block of a scene's body, carried on the first beat the block makes. Empty here; a UI package augments it. */
export interface BlockUi {}
/** Hints on a kind (for each of its entities) and on an entity, laid over its kind's. Empty here; a UI package augments it. */
export interface EntityUi {}
/** Hints on a stat. Empty here; a UI package augments it. */
export interface StatUi {}
/** Hints for the whole game. Empty here; a UI package augments it. */
export interface GameUi {}

/**
 * The pieces a UI draws inside a line of prose, from `[[ui:name|words|arg|…]]`,
 * by name, each with the arguments it takes after the words as a tuple of
 * text. Empty here; a UI package augments it:
 *
 * ```ts
 * declare module '@ifloom/engine' {
 *   interface InlineUi { modal: [key: string, title?: string] }
 * }
 * ```
 *
 * The engine never reads it: the span it gives the view (`{ kind: 'ui' }`)
 * has `name: string` and `args: string[]`, so a name no UI declared still
 * comes through. It's there for a UI's components to type their arguments.
 */
export interface InlineUi {}

/** The arguments of a UI piece named `N`: what a UI package declared in `InlineUi`, else any text. */
export type InlineUiArgs<N extends string> = N extends keyof InlineUi ? InlineUi[N] : readonly string[]

/**
 * A `ui` field as content writes it: the hints a UI package declared for that
 * place, typed, and any others, which the engine carries all the same.
 */
export type Ui<T> = T & { readonly [hint: string]: unknown }

/** What the ui feature adds, as types. */
export type UiShape = {
  game: {
    /** Hints for the whole game, such as how every screen comes in. Carried as written; the engine gives them no meaning. */
    ui?: Ui<GameUi>
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

/** What is wrong with a `ui` field: it isn't an object, or something in it isn't data. Nothing for one left out. */
export function uiProblems(ui: unknown): string[] {
  if (ui === undefined) return []
  if (!isPlainObject(ui)) return ['ui must be an object of hints']
  return notData(ui, 'ui')
}

/** A view's `ui` field: there when there are hints, left out when there are none. */
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

export const ui = defineFeature<UiShape>({
  name: 'ui',
  check: (game, tools) => tools.check(undefined, 'ui', [{ ui: game.ui }]),
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
