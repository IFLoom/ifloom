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
 * Fill the tokens a line of prose may carry:
 *
 * - `{{name}}`: a name of the game's own, looked up as a phrase (content's
 *   `phrases`, with `.` between groups: `{{outfit.verdict}}`), then a value
 *   in `rules.values`, then a key in the kv store (a name the player typed is
 *   a key like any other: `{{playerName}}`);
 * - `{{plugin/name}}`: a plugin's value, with any arguments after the name:
 *   `{{messages/unread channel=texts}}`;
 * - `{{kv:key of=storyline:baker}}`: a key in another kv store;
 * - `{{v:game/name}}` and `{{v:plugin/name}}`, the older way to write a
 *   value, which still works.
 *
 * Any of them can end in `|` and words shown while the token is unset:
 * `{{flatmateName|Your flatmate}}`. Unset is a kv key that is unset or not
 * text or a number, a phrase no row of which holds, a value nobody has, or
 * one that gives `''`. The fallback is shown as written, with no tokens in it.
 * Without one, an unset bare name (`{{name}}`) prints nothing, and any other
 * token naming nothing is left as it is, so the missing name shows on
 * screen. Words a token prints are never read for tokens again, but a
 * phrase's own words are filled when it is printed.
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
 * A phrase's words for this state: the first of its rows whose `when` holds,
 * its tokens filled, or `''` when none does. Undefined when the game has no
 * phrase by that full name. `args` are what the token passed: each argument
 * the phrase declares is put in for `$<arg>` (see `PhraseWithArgs`).
 */
export function phraseText(state: GameState, game: Game, name: string, args: Readonly<Record<string, unknown>> = {}): string | undefined {
  const rows = phraseRows(game, name)
  if (!rows) return undefined
  const declared = phraseArgs(game, name)
  const refs = argRefs(state, game, declared, args)
  const row = rows.find((entry) => holds(state, game, declared.length ? bindArgs(entry.when, declared, (arg) => refs[arg]) : entry.when))
  if (!row) return ''
  const text = declared.length ? putArgs(state, game, row.text, declared, refs) : row.text
  if (filling >= DEEPEST) return text
  filling += 1
  try {
    return fillTokens(state, game, text)
  } finally {
    filling -= 1
  }
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
 * A row's words with `$<arg>` put in: inside a token, before its fallback,
 * as the reference or value (`{{kv:mood of=$who}}`); elsewhere as the
 * entity's name, or the value as passed.
 */
function putArgs(state: GameState, game: Game, text: string, declared: readonly string[], refs: Record<string, unknown>): string {
  const pattern = argPattern(declared)
  if (!pattern || !text.includes('$')) return text
  const asRef = (part: string) => part.replace(pattern, (_match, arg: string) => String(refs[arg]))
  const asName = (part: string) =>
    part.replace(pattern, (_match, arg: string) => {
      const value = refs[arg]
      return typeof value === 'string' && value.includes(':') && hasEntity(state, game, value) ? entityName(state, game, value) : String(value)
    })
  let out = ''
  let at = 0
  for (const match of text.matchAll(TOKEN)) {
    const written = match[0]
    const start = match.index
    out += asName(text.slice(at, start))
    const bar = match[4] === undefined ? written.length : written.indexOf('|')
    out += asRef(written.slice(0, bar)) + asName(written.slice(bar))
    at = start + written.length
  }
  return out + asName(text.slice(at))
}

/**
 * An entity's name as the player reads it: the name it was created with, or
 * its declaration's, with prose tokens filled. Its id when it has neither.
 */
export function entityName(state: GameState, game: Game, ref: string): string {
  return fillTokens(state, game, entityText(state, game, ref, 'name') ?? parseRef(ref)?.id ?? ref)
}

/** An entity's description, filled like its name; undefined when it has none. */
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
 * `{ prose: 'cafe.order/late', weight: 3 }` is drawn three times as often as a
 * member of weight 1. A plain key has weight 1.
 */
export type VariantMember = string | { prose: string; weight?: number }

/** A variants member's prose key. */
export function memberKey(member: VariantMember): string {
  return typeof member === 'string' ? member : member.prose
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
