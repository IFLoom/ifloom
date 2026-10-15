import { customValue } from './custom.ts'
import type { Game, ProseStore } from './game.ts'
import { count } from './progress.ts'
import type { GameState } from './types.ts'

/**
 * Fill the tokens a line of prose may carry:
 *
 * - `{{name}}` — a variable the game set (a name the player typed is a
 *   variable like any other: `{{playerName}}`);
 * - `{{n:storyline.key}}` — a counter on a storyline;
 * - `{{v:name}}` — one of the game's custom values.
 *
 * A token naming a value the game does not have is left as it is, so the
 * missing name shows on screen instead of vanishing; `validatePack` and the
 * loader report it.
 */
export function fillTokens(text: string, state: GameState, game: Game): string {
  return text
        .replace(/\{\{n:([A-Za-z0-9_-]+)\.([A-Za-z0-9_]+)\}\}/g, (_match, storyline, key) =>
      String(count(state, storyline, key)),
    )
    .replace(/\{\{v:((?:[A-Za-z0-9-]+\/)?[A-Za-z0-9_-]+)\}\}/g, (match, name) => {
      const fn = customValue(game, name)
      return fn ? String(fn(state)) : match
    })
    // Variables last: a value the player typed is shown as typed, never read as a token.
    .replace(/\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}/g, (match, key) => {
      const value = state.flags[key]
      return typeof value === 'string' || typeof value === 'number' ? String(value) : match
    })
}

/**
 * A prose store from lines by key and variants by name: what data scenes read
 * their words from. `line(key, state)` fills the tokens for that save;
 * without a state it returns the line as written.
 */
export function proseStore(
  game: Game,
  lines: Record<string, string>,
  variants: Record<string, string[]> = {},
): ProseStore {
  return {
    line: (key, state) => {
      const text = lines[key]
      if (text === undefined) return undefined
      return state ? fillTokens(text, state, game) : text
    },
    variants: (name) => variants[name] ?? [],
  }
}
