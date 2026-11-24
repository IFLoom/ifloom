import { customValue } from './custom.ts'
import { holds } from './condition.ts'
import { GAME_ID } from './plugin.ts'
import { BARE_NAME, KV_NAME, PLUGIN_NAME, TOKEN, V_NAME, argPattern, bindArgs, phraseArgs, phraseRows } from './features/phrases.ts'
import type { Game, ProseStore } from './game.ts'
import { storylineOf } from './storylines.ts'
import type { GameState } from './types.ts'
import { entityKv, entityText, hasEntity, ownerOf, parseRef, speakerRef } from './entities.ts'
import type { KvValue } from './types.ts'

/**
 * Returns `text` with its `{{…}}` tokens filled for this state. An unset bare name prints nothing, and any other token
 * that names nothing stays as written, so the missing name shows on screen.
 *
 * The tokens are these:
 *
 * - `{{name}}` reads one of the game's phrases (content's `phrases`, with `.` between groups: `{{outfit.verdict}}`),
 *   then a value in `rules.values`, then a kv key such as `{{playerName}}`.
 * - `{{plugin/name}}` reads a plugin's value, with any arguments after the name (`{{messages/unread channel=texts}}`).
 * - `{{kv:key of=storyline:baker}}` reads a key in another kv store.
 * - `{{v:game/name}}` and `{{v:plugin/name}}` are the older way to write a value, and still work.
 *
 * A token can end in `|` and the words shown while it is unset, as in `{{flatmateName|Your flatmate}}`. A token is
 * unset when its kv key is missing or not text or a number, no row of its phrase holds, no one has its value, or its
 * value is `''`. The fallback is shown as written, with no tokens filled. The engine never reads a token's printed
 * words for tokens again, but it fills a phrase's own words when it prints the phrase.
 */
export function fillTokens(state: GameState, game: Game, text: string): string {
  if (!text.includes('{{')) return text
  return text.replace(TOKEN, (match, prefix: string | undefined, name: string, args: string | undefined, fallback: string | undefined) => {
    const value = tokenValue(state, game, prefix, name, args)
    if (value !== undefined && value !== '') return String(value)
    if (fallback !== undefined) return fallback
    if (prefix === undefined && BARE_NAME.test(name)) return ''
    return value === '' ? '' : match
  })
}

/** How deep phrases are being filled inside phrases right now: a phrase that prints itself stops here. */
let filling = 0
const DEEPEST = 20

/** What one token prints, or undefined when it names nothing the game has. */
function tokenValue(state: GameState, game: Game, prefix: string | undefined, name: string, args: string | undefined): string | number | undefined {
  if (prefix === 'kv') {
    if (!KV_NAME.test(name)) return undefined
    const of = tokenArgs(args).of
    const value = readKv(state, game, name, of === undefined ? undefined : String(of))
    return typeof value === 'string' || typeof value === 'number' ? value : undefined
  }
  if (prefix === 'v') return V_NAME.test(name) ? customValue(game, name)?.(state, tokenArgs(args)) : undefined
  if (name.includes('/')) return PLUGIN_NAME.test(name) ? customValue(game, name)?.(state, tokenArgs(args)) : undefined
  if (!BARE_NAME.test(name)) return undefined
  const phrase = phraseText(state, game, name, tokenArgs(args))
  if (phrase !== undefined) return phrase
  const fn = customValue(game, `${GAME_ID}/${name}`)
  if (fn) return fn(state, tokenArgs(args))
  // A kv key: a value the player typed is shown as typed, never read as a token.
  const value = state.kv[name]
  return args?.trim() || !(typeof value === 'string' || typeof value === 'number') ? undefined : value
}

/**
 * Returns a phrase's words for this state, the first of its rows whose `when` holds with its tokens filled, or `''`
 * when none does. Returns undefined when the game has no phrase by that name.
 *
 * `args` are the token's arguments. Each argument the phrase declares replaces `$<arg>` (see `PhraseWithArgs`).
 */
export function phraseText(state: GameState, game: Game, name: string, args: Readonly<Record<string, unknown>> = {}): string | undefined {
  const rows = phraseRows(game, name)
  if (!rows) return undefined
  const declared = phraseArgs(game, name)
  const refs = argRefs(state, game, declared, args)
  const row = rows.find((entry) => holds(state, game, declared.length ? bindArgs(entry.when, declared, (arg) => refs[arg]) : entry.when))
  if (!row) return ''
  const text = declared.length ? argsInTokens(row.text, declared, refs) : row.text
  let filled = text
  if (filling < DEEPEST) {
    filling += 1
    try {
      filled = fillTokens(state, game, text)
    } finally {
      filling -= 1
    }
  }
  // Names go in last, so a name (one the player typed, say) is never read for tokens.
  return declared.length ? argNames(state, game, filled, declared, refs) : filled
}

/**
 * What each declared argument stands for: the entity a value names, read
 * as a spoken line's id is (a bare id as `character:<id>`, else the one entity
 * with that id), or the value as passed. An argument left out is `''`.
 */
function argRefs(state: GameState, game: Game, declared: readonly string[], args: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const arg of declared) {
    const value = Object.hasOwn(args, arg) ? args[arg] : ''
    out[arg] = typeof value === 'string' && value !== '' ? (speakerRef(state, game, value) ?? value) : value
  }
  return out
}

/**
 * A row's words with `$<arg>` put in inside its tokens, before any fallback,
 * as the reference or value (`{{kv:mood of=$who}}`). The rest is left for
 * `argNames`, once the tokens are filled.
 */
function argsInTokens(text: string, declared: readonly string[], refs: Record<string, unknown>): string {
  const pattern = argPattern(declared)
  if (!pattern || !text.includes('$')) return text
  return text.replace(TOKEN, (written: string, ...match: unknown[]) => {
    const bar = match[3] === undefined ? written.length : written.indexOf('|')
    return written.slice(0, bar).replace(pattern, (_m, arg: string) => String(refs[arg])) + written.slice(bar)
  })
}

/** The filled words with each `$<arg>` left in them put in as the entity's name, or the value as passed. */
function argNames(state: GameState, game: Game, text: string, declared: readonly string[], refs: Record<string, unknown>): string {
  const pattern = argPattern(declared)
  if (!pattern || !text.includes('$')) return text
  return text.replace(pattern, (_match, arg: string) => {
    const value = refs[arg]
    return typeof value === 'string' && value.includes(':') && hasEntity(state, game, value) ? entityName(state, game, value) : String(value)
  })
}

/**
 * Returns an entity's name with its tokens filled, the name it was created with or else its definition's. Returns the
 * entity's id when it has neither.
 */
export function entityName(state: GameState, game: Game, ref: string): string {
  return fillTokens(state, game, entityText(state, game, ref, 'name') ?? parseRef(ref)?.id ?? ref)
}

/** Returns an entity's description with its tokens filled, or undefined when it has none. */
export function entityDescription(state: GameState, game: Game, ref: string): string | undefined {
  const description = entityText(state, game, ref, 'description')
  return description === undefined ? undefined : fillTokens(state, game, description)
}

/** A key in the kv store `of` names, as a kv token reads it: the player's, a storyline's, the running minigame's or an entity's. */
function readKv(state: GameState, game: Game, key: string, of: string | undefined): KvValue | undefined {
  if (of === undefined || of === 'player') return state.kv[key]
  if (of === 'minigame') return state.minigame?.kv[key]
  if (of.startsWith('storyline:')) return storylineOf(state, of.slice('storyline:'.length)).kv[key]
  const owner = ownerOf(state, of)
  if (owner === undefined) return state.kv[key]
  return hasEntity(state, game, owner) ? entityKv(state, game, owner)[key] : undefined
}

/** Returns a value token's arguments (`channel=texts count=2`) as an object. Numbers and `true` or `false` are read as such. */
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
 * A member of a variants list, a prose key or a prose key with a weight. A plain key has weight 1, so
 * `{ prose: 'cafe.order/late', weight: 3 }` is drawn three times as often.
 */
export type VariantMember = string | { prose: string; weight?: number }

/** Returns a variants member's prose key. */
export function memberKey(member: VariantMember): string {
  return typeof member === 'string' ? member : member.prose
}

/**
 * Returns the prose store scenes read their words from, built from lines by key and variants lists by name. Its
 * `line(key, state)` fills the tokens for that state, and returns the line unfilled without one.
 */
export function proseStore(game: Game, lines: Record<string, string>, variants: Record<string, readonly VariantMember[]> = {}): ProseStore {
  const keys: Record<string, string[]> = {}
  const weights: Record<string, Record<string, number>> = {}
  for (const [name, members] of Object.entries(variants)) {
    keys[name] = members.map(memberKey)
    for (const member of members) {
      if (typeof member !== 'string' && member.weight !== undefined) (weights[name] ??= {})[member.prose] = member.weight
    }
  }
  return {
    line: (key, state) => {
      const text = lines[key]
      if (text === undefined) return undefined
      return state ? fillTokens(state, game, text) : text
    },
    variants: (name) => keys[name] ?? [],
    keys: () => Object.keys(lines),
    weight: (name, key) => weights[name]?.[key] ?? 1,
  }
}
