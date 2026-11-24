/**
 * `checkUiHints`: what's wrong with a game's `ui` hints for the React UI. The
 * engine only checks that hints are data; the names and values are this UI's,
 * so this is where a typo such as `ui: { transiton: 'fade' }` is caught. Call
 * it in a test, beside `checkGame`.
 *
 * It's built from the declarations: each hint in `UI_HINTS` (and a plugin
 * UI's `hints`), each inline piece in `INLINE_PIECES`. The engine's
 * `uiInContent` finds every `ui` field and line of words, so nothing here
 * walks the content.
 */
import { inlineMarkup, uiInContent, type Game, type UiTarget } from '@ifloom/engine'
import type { InlineComponents } from './game/context.tsx'
import { INLINE_PIECES } from './game/inline.tsx'
import type { PluginUi } from './game/plugins.tsx'
import { TRANSITIONS, UI_HINTS, type HintCheckContext, type UiHint } from './hints.ts'

/** What `checkUiHints` takes besides the game. */
export type CheckUiOptions = {
  /** The plugin UIs the game draws with (the same list it gives `mountGame`): their `hints` and `inline` pieces are known. */
  plugins?: readonly PluginUi[]
  /** The game's own inline pieces (the same object you give `mountGame` or the `GameProvider`). */
  inline?: InlineComponents
  /** Hints and inline names that aren't reported (`['mood']`, say, for another UI's). */
  allow?: readonly string[]
}

/** How a place is named in a problem: a block's where is its scene's, so it says it's a block. */
const placeOf = (on: UiTarget, where: string) => (on === 'game' ? 'game' : on === 'block' ? `${where} block` : where)

/**
 * Each problem with the React UI's hints in a game, as `where: what`: a hint
 * this UI doesn't read on that place (a typo, or another UI's), and each
 * value a hint's declaration in `UI_HINTS` finds wrong, such as a transition
 * the game doesn't have, a `timer` that isn't one of the game's timers, pips
 * on a stat with a range over 20, or a `hue` outside 0 to 360.
 *
 * It also reads the prose, and the words blocks write in place, for inline
 * pieces, `[[ui:name|…]]`: a name that is neither built in (`INLINE_PIECES`),
 * nor a plugin UI's, nor one of the game's own `inline` components, which
 * would show only its words; and each built-in piece its check finds wrong,
 * such as a `modal` with no prose key. A game's own component of a built-in
 * name reads its arguments its own way, so it isn't checked.
 *
 * Empty when all is well.
 */
export function checkUiHints(game: Game, options: CheckUiOptions = {}): string[] {
  const out: string[] = []
  const allowed = new Set(options.allow ?? [])
  const plugins = options.plugins ?? []
  const hints: readonly UiHint[] = [...UI_HINTS, ...plugins.flatMap((plugin) => plugin.hints ?? [])]
  const transitions = new Set<string>([...TRANSITIONS, ...(Array.isArray(game.ui?.transitionNames) ? game.ui.transitionNames : [])])
  const found = uiInContent(game)

  for (const field of found.fields) {
    if (typeof field.ui !== 'object' || field.ui === null) continue
    const where = placeOf(field.on, field.where)
    const cx: HintCheckContext = { game, on: field.on, ...(field.id !== undefined ? { id: field.id } : {}), transitions }
    for (const [name, value] of Object.entries(field.ui)) {
      if (allowed.has(name)) continue
      const hint = hints.find((entry) => entry.name === name && entry.on.includes(field.on))
      if (!hint) {
        out.push(`${where}: ui.${name} is not a hint the React UI reads${hints.some((entry) => entry.name === name) ? ` on a ${field.on}` : ''}`)
        continue
      }
      if (value === undefined) continue
      const problems = hint.check?.(value, cx) ?? []
      for (const problem of typeof problems === 'string' ? [problems] : problems) out.push(`${where}: ${problem}`)
    }
  }

  const own = { ...Object.assign({}, ...plugins.map((plugin) => plugin.inline ?? {})), ...options.inline } as InlineComponents
  for (const line of found.lines) {
    for (const part of inlineMarkup(line.text) ?? []) {
      if (part.type !== 'ui') continue
      const where = `${line.where}: [[ui:${part.name}|${part.text}]]`
      const piece = INLINE_PIECES.find((entry) => entry.name === part.name)
      if (own[part.name]) continue
      if (!piece) {
        if (!allowed.has(part.name)) out.push(`${where} is not an inline piece the React UI draws, so it shows only its words; add it to inline`)
        continue
      }
      for (const problem of piece.check?.({ text: part.text, args: part.args }, game) ?? []) out.push(`${where} ${problem}`)
    }
  }
  return out
}
