import type { RenderedChoice } from './screen.ts'
import type { BlockUi, Ui } from './features/ui.ts'
import type { EntityRef } from './entities.ts'
import { STRINGS } from './strings.ts'

/** The width of an `image` or `video` beat, `inline` in the column with the words or `wide` across it. */
export type BeatSize = 'inline' | 'wide'

/**
 * One piece of a paragraph that holds inline markup, in a beat's `spans`, in order. Each piece is told apart by its
 * `type`.
 */
export type InlineSpan =
  /** Words shown unchanged. */
  | { type: 'text'; text: string }
  /**
   * An inline action, from `[[act:id|words]]`. `text` is the words rendered as its link, and `choice` is the choice (or,
   * in the room, the action) it takes, with its availability, reason and price.
   */
  | { type: 'action'; text: string; choice: RenderedChoice }
  /** A tooltip, from `[[tip:key|words]]`. `text` is the words shown, and `tip` is the prose key's line filled for this save. */
  | { type: 'tip'; text: string; tip: string }
  /** Words to stress, from `**words**`. `text` is the words alone. */
  | { type: 'bold'; text: string }
  /** Words in italics, from `*words*`. `text` is the words alone. */
  | { type: 'italic'; text: string }
  /**
   * A UI piece, from `[[ui:name|words|arg|…]]`, such as a popup or a picture to zoom. The engine gives it no meaning.
   *
   * `name` picks the UI's component that renders it, and `text` is the words to show, which a screen reader, the
   * backlog and the playtest read. `args` are the parts after the words, as text, in order. A UI package types its
   * names and arguments by augmenting `InlineUi`.
   */
  | { type: 'ui'; name: string; text: string; args: string[] }

/**
 * One piece of a rendered body, in `view.scene.beats`, told apart by its `type`. Any beat can carry `ui`, the ui hints
 * of the block it starts.
 */
export type SceneBeat =
  /**
   * A paragraph. `text` has the words alone, without markup, and `spans` is set only when it holds inline markup.
   *
   * A UI that renders only text, a screen reader, the backlog and the playtest read `text`. `spans` holds inline
   * actions, tooltips, bold, italics and UI pieces.
   */
  (
    | { type: 'text'; text: string; spans?: InlineSpan[] }
    /**
     * A spoken line. `who` is `'player'` for the player's own line and `'character'` for anyone else's, and `speaker` is
     * the entity when the line's id names one (`@ava: "…"`).
     *
     * `name` is the name to show, the speaker entity's, the player's, or the label of a `Name: "…"` line, and is left out
     * for a bare quote. `voice` is the track of the line read aloud, from `[[voice:id]]` at its end, and `spans` are as
     * a text beat's.
     */
    | { type: 'say'; who: 'character' | 'player'; speaker?: EntityRef; name?: string; text: string; voice?: string; spans?: InlineSpan[] }
    /** A picture, from `[[img:…]]` or `[[wide:…]]`, with `src` through `artSrc`. */
    | { type: 'image'; src: string; alt?: string; size: BeatSize }
    /**
     * A video clip, from `[[video:…]]` or `[[widevideo:…]]`. Unless its flags say otherwise, it plays by itself, loops,
     * has no sound and sits inline, like a GIF.
     */
    | {
        /** The beat's type. */
        type: 'video'
        /** The video's file, through `artSrc`. */
        src: string
        /** The still shown before the video plays. */
        poster?: string
        /** The video's alternative text, for a screen reader. */
        alt?: string
        /** The video's width. */
        size: BeatSize
        /** The video's autoplay mark, true unless it shows controls. */
        autoplay: boolean
        /** The video's loop mark, true unless its flags ask to play once. */
        loop: boolean
        /** The video's muted mark, true unless its flags ask for sound. */
        muted: boolean
        /** The video's controls mark, true when its flags ask for the player's controls. */
        controls: boolean
      }
    /** A sound played once when the scene is shown, from `[[sound:id]]` on a line of its own. A UI renders nothing for it. */
    | { type: 'sound'; track: string }
    /**
     * A past choice in this visit of a flowing scene, where its decision was, with `label` the choice's words. The beats
     * after it are what the choice brought. A UI may render it, restyle it or leave it out.
     */
    | { type: 'chose'; label: string }
  ) & {
    /** The ui hints of the block this beat starts. Left out when it has none. See `BlockUi`. */
    ui?: Ui<BlockUi>
    /**
     * The ui hints of the section this beat sits in, a `{ blocks }` block with `ui` such as `fold()` writes. Left out
     * outside a section.
     *
     * Every beat of the section carries them, so a UI can render the section as one.
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

/** The file extensions rendered as video rather than as a picture. An animated `.webp` or `.gif` is a picture. */
const VIDEO = /\.(mp4|webm)$/i

/** Returns `'video'` for a file with a video extension (`.mp4`, `.webm`), else `'image'`. */
export function mediaType(src: string): 'image' | 'video' {
  return VIDEO.test(src) ? 'video' : 'image'
}

/**
 * Returns a picture's or video's path in the game's `art/` folder, relative to the page. A URL (`https:`, `data:`,
 * `//host/…`) is returned unchanged.
 *
 * `'photo/ava.svg'` and `'art/photo/ava.svg'` both give `'art/photo/ava.svg'`. A name with no extension gets `.jpg`, or
 * `.mp4` when `type` is `'video'`.
 */
export function artSrc(path: string, type: 'image' | 'video' = 'image'): string {
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(path)) return path
  const trimmed = path.replace(/^\/?art\//, '').replace(/^\//, '')
  if (/\.(jpg|jpeg|png|webp|gif|avif|webm|mp4|svg)$/i.test(trimmed)) {
    return `${ART_ROOT}${trimmed}`
  }
  return `${ART_ROOT}${trimmed}${type === 'video' ? '.mp4' : '.jpg'}`
}

/** The flags a video's markup or `{ media }` block can set, each changing one default. */
export type VideoFlags = {
  /** The controls flag, which shows the player's controls, so the video waits to be started instead of playing by itself. */
  controls?: boolean
  /** The once flag, which plays the video once instead of looping. */
  once?: boolean
  /** The sound flag, which plays the video with sound instead of muted. */
  sound?: boolean
  /** The still shown before the video plays, as a path like any picture's. */
  poster?: string
}

/** A video's playback settings as the player sees them, worked out from its `VideoFlags`. */
export type VideoView = {
  /** The video's autoplay mark, which starts it as soon as it is shown. True unless it shows controls. */
  autoplay: boolean
  /** The video's loop mark, which plays it again when it ends. True unless its flags ask to play once. */
  loop: boolean
  /** The video's muted mark. True unless its flags ask for sound. */
  muted: boolean
  /** The video's controls mark, which shows the player's play, pause and volume controls. */
  controls: boolean
  /** The still shown before the video plays, through `artSrc`. */
  poster?: string
}

/** Returns a video's playback settings from its flags. With no flags it autoplays, loops and is muted, with no controls. */
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

/** The pattern of picture and video markup on a line of its own, such as `[[img:door|A blue door]]`. */
export const MEDIA_MARKUP = /\[\[(img|wide|video|widevideo):([^\]|]+)((?:\|[^\]|]*)*)\]\]/

const VIDEO_FLAGS = ['controls', 'once', 'sound'] as const

/** Returns the parts of picture or video markup after the path, read into a pool, tags, flags and alternative text. Internal. */
export function mediaParts(
  path: string,
  rest: string,
): {
  /** The markup's pool, for `@pool`, or undefined for a file. */
  pool?: string
  /** The markup's file path, or the pool's name. */
  path: string
  /** The tags the pool's pick should have. */
  tags: string[]
  /** The markup's video flags. */
  flags: VideoFlags
  /** The video flags written, by name, for the checks. */
  videoFlags: string[]
  /** The markup's alternative text. */
  alt?: string
  /** The parts after the first that are not flags, which the checks report. */
  extraAlts: string[]
  /** The `name=value` parts whose name is not a flag. */
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
 * A function that returns the speaker of a line written under `@id`, given the id. It returns whether the line is the
 * player's, the entity the id names, and the name to show.
 *
 * `lineSpeakers` returns the engine's.
 */
export type SpeakerFinder = (id: string) => { who: 'character' | 'player'; speaker?: EntityRef; name: string }

/** The default finder, for beats read with no game: `@you` and `@player` are the player's, under the engine's word for them, and any other id a character's, under the id. */
const byId: SpeakerFinder = (id) => (id === 'you' || id === 'player' ? { who: 'player', name: STRINGS.you } : { who: 'character', name: id })

/**
 * The pattern of a spoken line under an id, such as `@ava: "…"`, `@character:ava: "…"` or `@you: "…"`.
 * The id is letters, digits, `-`, `_` and `.`, with a kind and `:` in front if it's a full reference.
 */
const BY_ID = /^@([A-Za-z0-9_-][A-Za-z0-9_.-]*(?::[A-Za-z0-9_-][A-Za-z0-9_.-]*)?):\s*"([\s\S]+)"$/

/** A spoken line under a label as written: `Name: "…"`, the label letters (in any alphabet), spaces, `'` and `-`. */
const NAMED = /^(\p{L}[\p{L}\p{M}' -]*):\s*"([\s\S]+)"$/u

/** Returns the ids the spoken lines in `text` are written under (`@ava: "…"`), in order, for the content checker. */
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
 * The pattern of inline actions, tooltips and UI pieces, `[[act:id]]`, `[[act:id|words]]`, `[[tip:key|words]]` and
 * `[[ui:name|words|arg|…]]`. Its groups are the tag, the id, key or name, and the text after the first `|`.
 */
export const INLINE_MARKUP = /\[\[(act|tip|ui):([^\]|]*)(?:\|([^\]]*))?\]\]/g

/**
 * The pattern of a UI piece's name in `[[ui:name|…]]`, an id of letters, digits, `-` and `_` in parts joined by `.`.
 * A plugin's piece has the plugin's name and `/` in front (`shop/price-card`).
 */
export const UI_NAME = /^(?:[A-Za-z0-9_-]+\/)?[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/

/** Returns a `[[ui:…]]` piece's name, words and arguments, each trimmed. Internal. */
export function uiParts(name: string, rest: string | undefined): { name: string; text: string | undefined; args: string[] } {
  const parts = rest === undefined ? [] : rest.split('|').map((part) => part.trim())
  return { name: name.trim(), text: parts[0], args: parts.slice(1) }
}

/**
 * One piece of a line of prose as `inlineMarkup` reads it, told apart by its `type`. Each marked piece keeps its
 * source in `markup`.
 */
export type InlinePart =
  /** Words with no markup. */
  | { type: 'text'; text: string }
  /** An inline action, `[[act:id]]`, with the words to show when it gives them. */
  | { type: 'act'; id: string; text?: string; markup: string }
  /** A tooltip, `[[tip:key|words]]`, with its prose key and words. */
  | { type: 'tip'; key: string; text: string; markup: string }
  /** A UI piece, `[[ui:name|words|arg|…]]`, with `args` the parts after the words. */
  | { type: 'ui'; name: string; text: string; args: string[]; markup: string }
  /** Bold words, `**words**`, with `text` the words alone. */
  | { type: 'bold'; text: string; markup: string }
  /** Italic words, `*words*`, with `text` the words alone. */
  | { type: 'italic'; text: string; markup: string }

type Stars = { stars: number; from: number; to: number; opens: boolean; closes: boolean }
type Token = { chars: string } | Stars

/**
 * Returns words cut at their `**bold**` and `*italic*`, with the problems found for the content checker. Internal.
 *
 * A `\*` is a star shown unchanged. As in Markdown, a star opens only when a space doesn't follow it and closes only
 * when a space doesn't come before it, so `5 * 3` stays as written. Stars that never close, come three or more in a
 * row or sit inside other styled words stay as written and are listed in `problems`.
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
 * Returns a line of prose cut at its inline markup (`[[act:…]]`, `[[tip:…]]`, `[[ui:…]]`, `**bold**`, `*italic*`).
 * Returns null when it has none.
 *
 * Broken markup stays in the words as written, so it shows on screen, and the content checker reports it. Broken
 * markup is markup with no id or key, a tooltip or UI piece with no words, a UI piece whose name isn't an id or that
 * has an empty argument, or stars that don't close. A `\*` is a star shown unchanged, and bold and italics inside or
 * around inline markup are not read.
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
 * Returns text and spoken beats with their bold, italics and UI pieces read into `spans`, and `text` with the words
 * alone. A beat with none of these is returned unchanged.
 *
 * Use it for beats rendered outside a scene's view, such as a message's or a post's. Inline actions and tooltips stay
 * in the words as written, since only the view has the choices and the prose.
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
 * A piece of a rendered body before it is cut into beats, markup with its block's ui hints or a finished beat such as
 * a `say` block's spoken line. Internal.
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
 * Returns the beats of a body's parts in order, with the index each part's beats start at. Internal.
 *
 * Each markup part is cut into paragraphs and read, with its hints on its first beat, and each beat part is kept
 * unchanged. A bare quote answers the spoken line before it, across parts.
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
 * Returns a body's beats, in order. `find` names the speaker of a line under `@id`, and without it `@you` and `@player`
 * are the player's.
 */
export function parseBeats(body: string, find?: SpeakerFinder): SceneBeat[] {
  return beatsOfParts([{ text: body }], find).beats
}
