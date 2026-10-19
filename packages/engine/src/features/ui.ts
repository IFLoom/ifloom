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

export const ui = defineFeature<UiShape>({
  name: 'ui',
  check: (game, tools) => tools.check(undefined, 'ui', [{ ui: game.ui }]),
  resolve: () => ({ ui: (ref) => uiProblems(ref.ui) }),
  // `[[reveal]]` was prose markup once. It is a block's hint now, so one left in prose would be shown as written.
  markup: (_game, text) =>
    /\[\[reveal[\]:|]/.test(text)
      ? [
          "[[reveal]] is no longer markup and would be shown as written; put the paragraph in a block of its own with a ui hint, such as the React UI's ui: { reveal: { delay: 800 } }",
        ]
      : [],
})
