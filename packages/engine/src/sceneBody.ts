import type { RenderedChoice } from './screen.ts'
import type { BlockUi, Ui } from './features/ui.ts'
import type { EntityRef } from './entities.ts'
import { STRINGS } from './strings.ts'

/** How wide an `image` or `video` beat is drawn: `inline` in the column with the words, `wide` across it. */
export type BeatSize = 'inline' | 'wide'

/**
 * A piece of a line of prose that holds inline markup, in order. `text` is
 * words to show as they are. `action` is an inline action, from
 * `[[act:id|words]]`: `text` is the words to draw as its link and `choice` is
 * the choice (or, in a room, the action) it presses, with its availability,
 * reason and price as the list would show them. `tip` is a tooltip, from
 * `[[tip:key|words]]`: `text` is the words shown and `tip` the prose line
 * `key`, filled in for this save.
 */
export type InlineSpan =
  | { type: 'text'; text: string }
  | { type: 'action'; text: string; choice: RenderedChoice }
  | { type: 'tip'; text: string; tip: string }
  /** Words to stress, from `**words**`. `text` is the words alone. */
  | { type: 'bold'; text: string }
  /** Words in italics, from `*words*`. `text` is the words alone. */
  | { type: 'italic'; text: string }
  /**
   * A piece of a UI's own, from `[[ui:name|words|arg|…]]`, such as a popup
   * or a picture to zoom. The engine gives it no meaning and carries it as
   * written: `name` says which of the UI's components draws it, `text` is the
   * words to show (what a screen reader, the backlog and the playtest read),
   * and `args` are the parts after the words, as text, in order. A UI
   * package types its names and arguments by augmenting `InlineUi`.
   */
  | { type: 'ui'; name: string; text: string; args: string[] }

/**
 * One piece of a scene's body, as the UI draws it. Any beat can carry `ui`:
 * the presentation hints of the block it starts, as content wrote them.
 */
export type SceneBeat =
  /**
   * A paragraph. `spans` is there only when it holds inline actions,
   * tooltips, bold or italics: the same words in pieces. `text` always has
   * the words alone, without the markup, for a UI that draws text and
   * nothing else, a screen reader, the backlog and the playtest.
   */
  (
    | { type: 'text'; text: string; spans?: InlineSpan[] }
    /**
     * A spoken line. `who` is `'player'` for the player's own line and
     * `'character'` for anyone else's. `speaker` is the entity whose line it
     * is, when it is written under an id that names one (`@ava: "…"`), and
     * left out otherwise. `name` is who to show it under: the speaker's name
     * as their entity has it, the player's name, or the label a `Name: "…"`
     * line is written under; left out for a bare quote. `voice` is the track
     * of it read aloud, from `[[voice:id]]` at the end of the line. `spans`
     * as a text beat has them.
     */
    | { type: 'say'; who: 'character' | 'player'; speaker?: EntityRef; name?: string; text: string; voice?: string; spans?: InlineSpan[] }
    | { type: 'image'; src: string; alt?: string; size: BeatSize }
    /**
     * A video clip, from `[[video:…]]` or `[[widevideo:…]]`. Like a GIF unless its
     * flags say otherwise: it plays by itself, loops, has no sound and plays inline.
     */
    | {
        type: 'video'
        src: string
        /** A still shown before it plays. */
        poster?: string
        alt?: string
        size: BeatSize
        autoplay: boolean
        loop: boolean
        muted: boolean
        controls: boolean
      }
    /** A sound played once when the scene is shown, from `[[sound:id]]` on a line of its own. Nothing to draw. */
    | { type: 'sound'; track: string }
    /**
     * A pick the player made earlier in this visit of a flowing scene, where
     * the decision was: `label` is the choice's words. What follows is what
     * the pick brought. A UI may draw it, restyle it or leave it out.
     */
    | { type: 'chose'; label: string }
  ) & {
    /** The hints of the block this beat starts, as written; left out with none. See `BlockUi`. */
    ui?: Ui<BlockUi>
    /**
     * The hints of the section this beat sits in (a `{ blocks }` block with
     * `ui`, such as `fold()` writes), on every beat it makes, so a UI can draw
     * the section as one. Left out outside one.
     */
    section?: Ui<BlockUi>
  }

/**
 * Where the game's pictures live, relative to the page.
 *
 * Relative, never rooted at `/`: a built game is a folder that opens from disk
 * or from an itch.io subpath, and a leading slash points at the root of the
 * drive or the host instead of beside `index.html`.
 */
const ART_ROOT = 'art/'

/** Files drawn as video rather than as a picture. An animated `.webp` or `.gif` is a picture. */
const VIDEO = /\.(mp4|webm)$/i

/** Whether a file is a picture or a video, by its extension. */
export function mediaType(src: string): 'image' | 'video' {
  return VIDEO.test(src) ? 'video' : 'image'
}

/**
 * The one place a picture's or a video's path is resolved, from the game's
 * `art/` folder: `'photo/ava.svg'` and `'art/photo/ava.svg'` are both
 * `'art/photo/ava.svg'`. A bare name is a `.jpg`, or an `.mp4` when `type` is
 * `'video'`. A URL (`https:`, `data:`, `//host/…`) is left as it is.
 */
export function artSrc(path: string, type: 'image' | 'video' = 'image'): string {
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(path)) return path
  const trimmed = path.replace(/^\/?art\//, '').replace(/^\//, '')
  if (/\.(jpg|jpeg|png|webp|gif|avif|webm|mp4|svg)$/i.test(trimmed)) {
    return `${ART_ROOT}${trimmed}`
  }
  return `${ART_ROOT}${trimmed}${type === 'video' ? '.mp4' : '.jpg'}`
}

/** A video's flags as markup and data write them. Each one changes a default. */
export type VideoFlags = {
  /** Show the player's controls. It then waits to be started instead of playing by itself. */
  controls?: boolean
  /** Play once instead of looping. */
  once?: boolean
  /** Play with sound instead of muted. */
  sound?: boolean
  /** A still to show before it plays, as a path like any picture's. */
  poster?: string
}

/** How a video plays, worked out from its flags. */
export type VideoView = {
  /** Start playing as soon as it's shown: true unless it has controls. */
  autoplay: boolean
  /** Play it again when it ends. */
  loop: boolean
  /** Without sound: true unless its flags ask for sound. */
  muted: boolean
  /** Show the player's play, pause and volume controls. */
  controls: boolean
  /** A still to show before it plays, through `artSrc`. */
  poster?: string
}

/** The flags on a video, with the defaults filled in: autoplay, loop, muted, no controls. */
export function videoView(flags: VideoFlags): VideoView {
  const controls = Boolean(flags.controls)
  return {
    autoplay: !controls,
    loop: !flags.once,
    muted: !flags.sound,
    controls,
    ...(flags.poster ? { poster: artSrc(flags.poster) } : {}),
  }
}

/** Picture and video markup on a block of its own: `[[img:door|A blue door]]`. */
export const MEDIA_MARKUP = /\[\[(img|wide|video|widevideo):([^\]|]+)((?:\|[^\]|]*)*)\]\]/

const VIDEO_FLAGS = ['controls', 'once', 'sound'] as const

/** Picture or video markup's parts after the path, read. Internal; the checks use it too. */
export function mediaParts(
  path: string,
  rest: string,
): {
  /** The pool, for `@pool`; undefined for a file. */
  pool?: string
  path: string
  tags: string[]
  flags: VideoFlags
  /** The video flags written, by name, for the checks. */
  videoFlags: string[]
  alt?: string
  /** Every part that is not a flag after the first: the checks report them. */
  extraAlts: string[]
  /** `name=value` parts with a name that is not a flag. */
  unknown: string[]
} {
  const parts = rest
    .split('|')
    .slice(1)
    .map((part) => part.trim())
  const trimmed = path.trim()
  const pool = trimmed.startsWith('@') ? trimmed.slice(1).trim() : undefined
  // After a pool, the first part is always its tags, even when empty: `[[img:@door||A door]]`.
  const tags =
    pool !== undefined && parts.length
      ? parts
          .shift()!
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      : []
  const flags: VideoFlags = {}
  const videoFlags: string[] = []
  const alts: string[] = []
  const unknown: string[] = []
  for (const part of parts) {
    if (!part) continue
    if ((VIDEO_FLAGS as readonly string[]).includes(part)) {
      flags[part as (typeof VIDEO_FLAGS)[number]] = true
      videoFlags.push(part)
    } else if (part.startsWith('poster=')) {
      flags.poster = part.slice('poster='.length).trim()
      videoFlags.push('poster')
    } else if (/^[a-z]+=\S*$/i.test(part)) unknown.push(part)
    else alts.push(part)
  }
  return { pool, path: trimmed, tags, flags, videoFlags, alt: alts[0], extraAlts: alts.slice(1), unknown }
}

/** A picture or video beat from markup; nothing for a pool nobody resolved. */
function mediaBeat(tag: string, path: string, rest: string): SceneBeat[] {
  const read = mediaParts(path, rest)
  if (read.pool !== undefined) return []
  const size: BeatSize = tag === 'wide' || tag === 'widevideo' ? 'wide' : 'inline'
  if (tag === 'video' || tag === 'widevideo' || mediaType(read.path) === 'video') {
    const { poster, ...play } = videoView(read.flags)
    return [
      {
        type: 'video',
        src: artSrc(read.path, 'video'),
        ...(poster ? { poster } : {}),
        ...(read.alt !== undefined ? { alt: read.alt } : {}),
        size,
        ...play,
      },
    ]
  }
  return [{ type: 'image', src: artSrc(read.path), alt: read.alt, size }]
}

function quoteOnly(block: string): string | null {
  const wrapped = block.match(/^["\u201c]([\s\S]+)["\u201d]$/)
  if (!wrapped) return null
  return wrapped[1]
}

/**
 * Who a spoken line under `@id` is: the player's own or someone else's, the
 * entity it is when the id names one, and the name to show. Given the id as
 * written. See `lineSpeakers` for the engine's.
 */
export type SpeakerFinder = (id: string) => { who: 'character' | 'player'; speaker?: EntityRef; name: string }

/** The default finder, for beats read with no game: `@you` and `@player` are the player's, under the engine's word for them, and any other id a character's, under the id. */
const byId: SpeakerFinder = (id) => (id === 'you' || id === 'player' ? { who: 'player', name: STRINGS.you } : { who: 'character', name: id })

/**
 * A spoken line under an id: `@ava: "…"`, `@character:ava: "…"`, `@you: "…"`.
 * The id is letters, digits, `-`, `_` and `.`, with a kind and `:` in front if it's a full reference.
 */
const BY_ID = /^@([A-Za-z0-9_-][A-Za-z0-9_.-]*(?::[A-Za-z0-9_-][A-Za-z0-9_.-]*)?):\s*"([\s\S]+)"$/

/** A spoken line under a label as written: `Name: "…"`, the label letters (in any alphabet), spaces, `'` and `-`. */
const NAMED = /^(\p{L}[\p{L}\p{M}' -]*):\s*"([\s\S]+)"$/u

/** The ids spoken lines in `text` are written under, `@ava: "…"`, in order: what the checker looks up. */
export function spokenIds(text: string): string[] {
  return paragraphsOf(text).flatMap((paragraph) => {
    const line = paragraph.replace(/\s*\[\[voice:[^\]]+\]\]$/, '').match(BY_ID)
    return line ? [line[1]] : []
  })
}

/** A block as a spoken line, if it is one: `@id: "…"`, `Name: "…"`, or a bare quote answering the line before. */
function spoken(block: string, lastSay: 'character' | 'player' | null, find: SpeakerFinder): Extract<SceneBeat, { type: 'say' }> | null {
  const byIdLine = block.match(BY_ID)
  if (byIdLine) {
    const found = find(byIdLine[1])
    return { type: 'say', who: found.who, ...(found.speaker !== undefined ? { speaker: found.speaker } : {}), name: found.name, text: byIdLine[2] }
  }
  const named = block.match(NAMED)
  if (named) return { type: 'say', who: 'character', name: named[1].trim(), text: named[2] }
  const quoted = quoteOnly(block)
  if (quoted !== null) return { type: 'say', who: lastSay === 'character' ? 'player' : 'character', text: quoted }
  return null
}

/**
 * Inline actions, tooltips and a UI's inline pieces, as written:
 * `[[act:id]]`, `[[act:id|words]]`, `[[tip:key|words]]` and
 * `[[ui:name|words|arg|…]]`. Groups: the tag, the id, key or name, then
 * everything after the first `|` (for `ui`, the words and the arguments).
 */
export const INLINE_MARKUP = /\[\[(act|tip|ui):([^\]|]*)(?:\|([^\]]*))?\]\]/g

/**
 * A UI piece's name, as `[[ui:name|…]]` writes it: an id (letters, digits,
 * `-` and `_`, in parts joined by `.`), with a plugin's name and `/` in front
 * when a plugin's UI draws it (`shop/price-card`).
 */
export const UI_NAME = /^(?:[A-Za-z0-9_-]+\/)?[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/

/** `[[ui:…]]` read: its name, its words and its arguments, each trimmed. Internal; the checks use it too. */
export function uiParts(name: string, rest: string | undefined): { name: string; text: string | undefined; args: string[] } {
  const parts = rest === undefined ? [] : rest.split('|').map((part) => part.trim())
  return { name: name.trim(), text: parts[0], args: parts.slice(1) }
}

/** A piece of a line, as `inlineMarkup` reads it: words, or an inline action, tooltip, bold or italics as written. */
export type InlinePart =
  | { type: 'text'; text: string }
  /** `[[act:id]]`, with the words to show if it gives them. */
  | { type: 'act'; id: string; text?: string; markup: string }
  /** `[[tip:key|words]]`. */
  | { type: 'tip'; key: string; text: string; markup: string }
  /** `[[ui:name|words|arg|…]]`: `args` are the parts after the words. */
  | { type: 'ui'; name: string; text: string; args: string[]; markup: string }
  /** `**words**`: `text` is the words alone. */
  | { type: 'bold'; text: string; markup: string }
  /** `*words*`: `text` is the words alone. */
  | { type: 'italic'; text: string; markup: string }

type Stars = { stars: number; from: number; to: number; opens: boolean; closes: boolean }
type Token = { chars: string } | Stars

/**
 * Words cut at their `**bold**` and `*italic*`, with `\*` read as a star
 * shown as it is. As in Markdown, a star opens only when a space doesn't
 * follow it and closes only when a space doesn't come before it, so `5 * 3`
 * stays as written. Stars left
 * as written because they open and never close, come three or more in a row
 * or sit inside other styled words are listed in `problems`, for the content
 * checker. Internal; `inlineMarkup` and the checks use it.
 */
export function emphasis(text: string): { parts: InlinePart[]; problems: string[] } {
  const tokens: Token[] = []
  const chars = (more: string) => {
    const last = tokens.at(-1)
    if (last && 'chars' in last) last.chars += more
    else tokens.push({ chars: more })
  }
  for (let at = 0; at < text.length;) {
    if (text[at] === '\\' && text[at + 1] === '*') {
      chars('*')
      at += 2
      continue
    }
    if (text[at] !== '*') {
      chars(text[at])
      at += 1
      continue
    }
    let to = at
    while (text[to] === '*') to += 1
    const before = text[at - 1]
    const after = text[to]
    tokens.push({ stars: to - at, from: at, to, opens: after !== undefined && !/\s/.test(after), closes: before !== undefined && !/\s/.test(before) })
    at = to
  }
  const parts: InlinePart[] = []
  const problems: string[] = []
  const words = (more: string) => {
    const last = parts.at(-1)
    if (last?.type === 'text') last.text += more
    else if (more) parts.push({ type: 'text', text: more })
  }
  const shown = (token: Token) => ('chars' in token ? token.chars : '*'.repeat(token.stars))
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    if ('chars' in token) {
      words(token.chars)
      continue
    }
    if (token.stars > 2) {
      if (token.opens || token.closes) problems.push(`"${shown(token)}" is shown as written: use ** for bold or * for italics, not both`)
      words(shown(token))
      continue
    }
    const close = token.opens ? tokens.findIndex((other, at) => at > index && 'stars' in other && other.stars === token.stars && other.closes) : -1
    if (close < 0) {
      if (token.opens) problems.push(`"${shown(token)}" is not closed, so it is shown as written; close it, or write \\* for a star`)
      words(shown(token))
      continue
    }
    const inside = tokens.slice(index + 1, close)
    if (inside.some((other) => 'stars' in other && (other.opens || other.closes)))
      problems.push("bold and italics don't go inside each other; the inner stars are shown as written")
    const end = tokens[close] as Stars
    const styled = { text: inside.map(shown).join(''), markup: text.slice(token.from, end.to) }
    parts.push(token.stars === 2 ? { type: 'bold', ...styled } : { type: 'italic', ...styled })
    index = close
  }
  return { parts, problems }
}

/**
 * A line of prose cut at its inline markup (`[[act:…]]`, `[[tip:…]]`,
 * `[[ui:…]]`, `**bold**`, `*italic*`), or null when it has none. Markup with
 * no id or key, a tooltip or UI piece with no words, a UI piece whose name
 * isn't an id or with an empty argument, or stars that don't close are left
 * in the words as written, so they show on screen; the content checker
 * reports them. A `\*` is a star shown as it is. Bold and italics inside the
 * words of inline markup, or around it, are not read.
 */
export function inlineMarkup(text: string): InlinePart[] | null {
  if (!text.includes('[[act:') && !text.includes('[[tip:') && !text.includes('[[ui:') && !text.includes('*')) return null
  const cut: InlinePart[] = []
  let last = 0
  const words = (until: number) => {
    if (until > last) cut.push({ type: 'text', text: text.slice(last, until) })
  }
  for (const match of text.matchAll(INLINE_MARKUP)) {
    if (match[1] === 'ui') {
      const piece = uiParts(match[2], match[3])
      if (!UI_NAME.test(piece.name) || !piece.text || piece.args.some((arg) => arg === '')) continue
      words(match.index)
      cut.push({ type: 'ui', name: piece.name, text: piece.text, args: piece.args, markup: match[0] })
      last = match.index + match[0].length
      continue
    }
    const id = match[2].trim()
    const shown = match[3]?.trim()
    const ok = id !== '' && (match[1] === 'act' ? shown !== '' : Boolean(shown))
    if (!ok) continue
    words(match.index)
    if (match[1] === 'act') cut.push({ type: 'act', id, ...(shown !== undefined ? { text: shown } : {}), markup: match[0] })
    else cut.push({ type: 'tip', key: id, text: shown!, markup: match[0] })
    last = match.index + match[0].length
  }
  words(text.length)
  const parts: InlinePart[] = []
  for (const part of cut) {
    for (const piece of part.type === 'text' ? emphasis(part.text).parts : [part]) {
      const prev = parts.at(-1)
      if (piece.type === 'text' && prev?.type === 'text') prev.text += piece.text
      else parts.push(piece)
    }
  }
  if (parts.length === 1 && parts[0].type === 'text' && parts[0].text === text) return null
  return parts
}

/**
 * Text and spoken beats with their bold, italics and UI pieces drawn: `spans`
 * with `bold`, `italic` and `ui` pieces, and `text` with the words alone. For
 * beats that don't go through a scene's view, such as a message's or a
 * post's. Inline actions and tooltips stay in the words as written, because
 * only the view knows the choices and the prose. A beat with none of these is
 * left as it is.
 */
export function styledBeats(beats: readonly SceneBeat[]): SceneBeat[] {
  return beats.map((beat) => {
    if ((beat.type !== 'text' && beat.type !== 'say') || beat.spans) return beat
    const parts = inlineMarkup(beat.text)
    if (!parts) return beat
    const spans: InlineSpan[] = []
    for (const part of parts) {
      const piece: InlineSpan =
        part.type === 'bold' || part.type === 'italic'
          ? { type: part.type, text: part.text }
          : part.type === 'ui'
            ? { type: 'ui', name: part.name, text: part.text, args: part.args }
            : { type: 'text', text: part.type === 'text' ? part.text : part.markup }
      const prev = spans.at(-1)
      if (piece.type === 'text' && prev?.type === 'text') prev.text += piece.text
      else spans.push(piece)
    }
    const text = spans.map((span) => span.text).join('')
    return spans.some((span) => span.type !== 'text') ? { ...beat, text, spans } : { ...beat, text }
  })
}

/** Where `[[ui:…]]` pieces sit in a body, by character: a blank line inside one doesn't end its paragraph. */
function pieceSpans(body: string): [number, number][] {
  const out: [number, number][] = []
  for (const match of body.matchAll(/\[\[ui:[^\]]*\]\]/g)) out.push([match.index, match.index + match[0].length])
  return out
}

/** A body's paragraphs, split at blank lines (but never inside a UI piece), trimmed. Empty ones are left out. */
function paragraphsOf(body: string): string[] {
  const inside = pieceSpans(body)
  const out: string[] = []
  let from = 0
  let at = body.indexOf('\n\n')
  while (at >= 0) {
    if (!inside.some(([start, end]) => at > start && at < end)) {
      out.push(body.slice(from, at))
      from = at + 2
    }
    at = body.indexOf('\n\n', at + 2)
  }
  out.push(body.slice(from))
  return out.map((piece) => piece.trim()).filter(Boolean)
}

/**
 * A piece of a body before it is cut into beats: markup with the hints of
 * the block that wrote it, or a beat already made, such as a spoken line a
 * `say` block wrote. Internal: how a data scene's render hands its body to the screen.
 */
export type BodyPart = { text: string; ui?: Ui<BlockUi>; section?: Ui<BlockUi> } | { beat: SceneBeat }

/** The beats of one paragraph. `last` is who spoke the paragraph before, for a bare quote to answer. */
function beatsOfParagraph(block: string, last: { say: 'character' | 'player' | null }, find: SpeakerFinder): SceneBeat[] {
  const sound = block.match(/^\[\[sound:([^\]]+)\]\]$/)
  if (sound) return [{ type: 'sound', track: sound[1].trim() }]
  // A voice line read aloud: `Ava: "Morning." [[voice:ava.morning]]`. Only on a spoken line.
  const voiced = block.match(/^([\s\S]*?)\s*\[\[voice:([^\]]+)\]\]$/)
  const said = voiced ? spoken(voiced[1], last.say, find) : null
  if (voiced && said) {
    last.say = said.who
    return [{ ...said, voice: voiced[2].trim() }]
  }
  const media = block.match(new RegExp(`^${MEDIA_MARKUP.source}$`))
  if (media) {
    last.say = null
    return mediaBeat(media[1], media[2], media[3])
  }
  const line = spoken(block, last.say, find)
  if (line) {
    last.say = line.who
    return [line]
  }
  last.say = null
  return [{ type: 'text' as const, text: block }]
}

/**
 * The beats of a body's parts, in order: each markup part cut into
 * paragraphs and read, its hints on the first beat it made, and each beat
 * part as it is. A bare quote answers the spoken line before it, across
 * parts. Internal; `parseBeats` reads a whole body this way.
 */
export function beatsOfParts(parts: readonly BodyPart[], find: SpeakerFinder = byId): { beats: SceneBeat[]; starts: number[] } {
  const beats: SceneBeat[] = []
  const starts: number[] = []
  const last = { say: null as 'character' | 'player' | null }
  for (const part of parts) {
    starts.push(beats.length)
    if ('beat' in part) {
      beats.push(part.beat)
      last.say = part.beat.type === 'say' ? part.beat.who : null
      continue
    }
    const made = paragraphsOf(part.text).flatMap((paragraph) => beatsOfParagraph(paragraph, last, find))
    if (part.ui && made.length) made[0] = { ...made[0], ui: part.ui }
    beats.push(...(part.section ? made.map((beat) => ({ ...beat, section: part.section })) : made))
  }
  return { beats, starts }
}

/**
 * A body's beats, in order. `find` says who a line under `@id` is; left out,
 * `@you` and `@player` are the player's.
 */
export function parseBeats(body: string, find?: SpeakerFinder): SceneBeat[] {
  return beatsOfParts([{ text: body }], find).beats
}
