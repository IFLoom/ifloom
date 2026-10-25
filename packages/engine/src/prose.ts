import { customValue } from './custom.ts'
import type { Game, ProseStore } from './game.ts'
import { storylineOf } from './storylines.ts'
import type { GameState } from './types.ts'
import { entityKv, entityText, hasEntity, ownerOf, parseRef, type EntityRef } from './entities.ts'
import type { KvValue } from './types.ts'

/**
 * Fill the tokens a line of prose may carry:
 *
 * - `{{name}}` — a key in the kv store (a name the player typed is a
 *   key like any other: `{{playerName}}`);
 * - `{{kv:key of=storyline:storyline}}` — a counter on a storyline;
 * - `{{v:game/name}}` — a value, a plugin's or the game's own (`game/…`), with any
 *   arguments after the name: `{{v:messages/unread channel=texts}}`.
 *
 * A token naming a value the game does not have is left as it is, so the
 * missing name shows on screen instead of vanishing. The content checker
 * doesn't look at tokens.
 */
export function fillTokens(text: string, state: GameState, game: Game): string {
  return (
    text
      .replace(KV_TOKEN, (match, key: string, args: string | undefined) => {
        const of = tokenArgs(args).of
        const value = readKv(state, game, key, of === undefined ? undefined : String(of))
        return typeof value === 'string' || typeof value === 'number' ? String(value) : match
      })
      .replace(VALUE_TOKEN, (match, name, args) => {
        const fn = customValue(game, name)
        return fn ? String(fn(state, tokenArgs(args))) : match
      })
      // kv keys last: a value the player typed is shown as typed, never read as a token.
      .replace(/\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}/g, (match, key) => {
        const value = state.kv[key]
        return typeof value === 'string' || typeof value === 'number' ? String(value) : match
      })
  )
}

/**
 * An entity's name as the player reads it: the name it was created with, or
 * its declaration's, with prose tokens filled. Its id when it has neither.
 */
export function entityName(state: GameState, game: Game, ref: EntityRef): string {
  return fillTokens(entityText(state, game, ref, 'name') ?? parseRef(ref)?.id ?? ref, state, game)
}

/** An entity's description, filled like its name; undefined when it has none. */
export function entityDesc(state: GameState, game: Game, ref: EntityRef): string | undefined {
  const desc = entityText(state, game, ref, 'desc')
  return desc === undefined ? undefined : fillTokens(desc, state, game)
}

/** A value token: `{{v:game/name}}`, or `{{v:game/name key=value …}}` with arguments. */
export const VALUE_TOKEN = /\{\{v:((?:[A-Za-z0-9-]+\/)?[A-Za-z0-9_-]+)((?:\s+[A-Za-z_][A-Za-z0-9_]*=[^\s}]+)*)\s*\}\}/g

/** A kv token, `{{kv:key}}` or `{{kv:key of=storyline:baker}}`: the key, and its arguments. */
export const KV_TOKEN = /\{\{kv:([A-Za-z_][A-Za-z0-9_.:-]*)((?:\s+[A-Za-z_][A-Za-z0-9_]*=[^\s}]+)*)\s*\}\}/g

/** A key in the kv store `of` names, as a kv token reads it: the player's, a storyline's, the running minigame's or an entity's. */
function readKv(state: GameState, game: Game, key: string, of: string | undefined): KvValue | undefined {
  if (of === undefined || of === 'player') return state.kv[key]
  if (of === 'minigame') return state.minigame?.kv[key]
  if (of.startsWith('storyline:')) return storylineOf(state, of.slice('storyline:'.length)).kv[key]
  const owner = ownerOf(state, of)
  if (owner === undefined) return state.kv[key]
  return hasEntity(state, game, owner) ? entityKv(state, game, owner)[key] : undefined
}

/** A value token's arguments, `channel=texts count=2`, as `with`: numbers and true/false read as such. */
export function tokenArgs(text: string | undefined): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {}
  for (const pair of (text ?? '').trim().split(/\s+/).filter(Boolean)) {
    const at = pair.indexOf('=')
    const raw = pair.slice(at + 1)
    out[pair.slice(0, at)] = raw === 'true' ? true : raw === 'false' ? false : raw.trim() !== '' && Number.isFinite(Number(raw)) ? Number(raw) : raw
  }
  return out
}

/**
 * One member of a variants list: a prose key, or a prose key with a weight.
 * `{ text: 'cafe.order/late', weight: 3 }` is drawn three times as often as a
 * member of weight 1. A plain key has weight 1.
 */
export type VariantMember = string | { text: string; weight?: number }

/** A variants member's prose key. */
export function memberKey(member: VariantMember): string {
  return typeof member === 'string' ? member : member.text
}

/**
 * A prose store from lines by key and variants by name: what data scenes read
 * their words from. `line(key, state)` fills the tokens for that save;
 * without a state it returns the line as written.
 */
export function proseStore(game: Game, lines: Record<string, string>, variants: Record<string, readonly VariantMember[]> = {}): ProseStore {
  const keys: Record<string, string[]> = {}
  const weights: Record<string, Record<string, number>> = {}
  for (const [name, members] of Object.entries(variants)) {
    keys[name] = members.map(memberKey)
    for (const member of members) {
      if (typeof member !== 'string' && member.weight !== undefined) (weights[name] ??= {})[member.text] = member.weight
    }
  }
  return {
    line: (key, state) => {
      const text = lines[key]
      if (text === undefined) return undefined
      return state ? fillTokens(text, state, game) : text
    },
    variants: (name) => keys[name] ?? [],
    keys: () => Object.keys(lines),
    weight: (name, key) => weights[name]?.[key] ?? 1,
  }
}
