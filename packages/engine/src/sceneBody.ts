import type { RenderedChoice } from './screen.ts'
import type { BlockUi, Ui } from './features/ui.ts'

export type BeatSize = 'inline' | 'wide'

export type MailHeader = { key: string; value: string }

export type PropFace = 'sticky' | 'clip' | 'diary'

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
  | { kind: 'text'; text: string }
  | { kind: 'action'; text: string; choice: RenderedChoice }
  | { kind: 'tip'; text: string; tip: string }
  /** Words to stress, from `**words**`. `text` is the words alone. */
  | { kind: 'bold'; text: string }
  /** Words in italics, from `*words*`. `text` is the words alone. */
  | { kind: 'italic'; text: string }
  /**
   * A piece of a UI's own, from `[[ui:name|words|arg|…]]`, such as a popup
   * or a picture to zoom. The engine gives it no meaning and carries it as
   * written: `name` says which of the UI's components draws it, `text` is the
   * words to show (what a screen reader, the backlog and the playtest read),
   * and `args` are the parts after the words, as text, in order. A UI
   * package types its names and arguments by augmenting `InlineUi`.
   */
  | { kind: 'ui'; name: string; text: string; args: string[] }

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
    | { kind: 'text'; text: string; spans?: InlineSpan[] }
    | { kind: 'mono'; text: string }
    /** A spoken line. `voice` is the track of it read aloud, from `[[voice:id]]` at the end of the line. `spans` as a text beat has them. */
    | { kind: 'say'; who: 'character' | 'player'; text: string; voice?: string; spans?: InlineSpan[] }
    | { kind: 'image'; src: string; alt?: string; size: BeatSize; rotate?: boolean }
    /**
     * A video clip, from `[[video:…]]` or `[[widevideo:…]]`. Like a GIF unless its
     * flags say otherwise: it plays by itself, loops, has no sound and plays inline.
     */
    | {
        kind: 'video'
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
    | { kind: 'mail'; headers: MailHeader[]; body: string }
    | { kind: 'prop'; face: PropFace; text: string }
    /** A sound played once when the scene is shown, from `[[sound:id]]` on a line of its own. Nothing to draw. */
    | { kind: 'sound'; track: string }
  ) & {
    /** The hints of the block this beat starts, as written; left out with none. See `BlockUi`. */
    ui?: Ui<BlockUi>
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
export function mediaKind(src: string): 'image' | 'video' {
  return VIDEO.test(src) ? 'video' : 'image'
}

/**
 * The one place a picture's or a video's path is resolved. A bare name is a
 * `.jpg`, or an `.mp4` when `kind` is `'video'`.
 */
export function artSrc(path: string, kind: 'image' | 'video' = 'image'): string {
  const trimmed = path.replace(/^\/?art\//, '').replace(/^\//, '')
  if (/\.(jpg|jpeg|png|webp|gif|avif|webm|mp4|svg)$/i.test(trimmed)) {
    return `${ART_ROOT}${trimmed}`
  }
  return `${ART_ROOT}${trimmed}${kind === 'video' ? '.mp4' : '.jpg'}`
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
  autoplay: boolean
  loop: boolean
  muted: boolean
  controls: boolean
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
  flags: VideoFlags & { rot?: boolean }
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
  const flags: VideoFlags & { rot?: boolean } = {}
  const videoFlags: string[] = []
  const alts: string[] = []
  const unknown: string[] = []
  for (const part of parts) {
    if (!part) continue
    if ((VIDEO_FLAGS as readonly string[]).includes(part)) {
      flags[part as (typeof VIDEO_FLAGS)[number]] = true
      videoFlags.push(part)
    } else if (part === 'rot') flags.rot = true
    else if (part.startsWith('poster=')) {
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
  if (tag === 'video' || tag === 'widevideo' || mediaKind(read.path) === 'video') {
    const { poster, ...play } = videoView(read.flags)
    return [
      {
        kind: 'video',
        src: artSrc(read.path, 'video'),
        ...(poster ? { poster } : {}),
        ...(read.alt !== undefined ? { alt: read.alt } : {}),
        size,
        ...play,
      },
    ]
  }
  return [
    {
      kind: 'image',
      src: artSrc(read.path),
      alt: read.alt,
      size,
      ...(read.flags.rot ? { rotate: true } : {}),
    },
  ]
}

function quoteOnly(block: string): string | null {
  const wrapped = block.match(/^["\u201c]([\s\S]+)["\u201d]$/)
  if (!wrapped) return null
  return wrapped[1]
}

const MAIL_HEADER = /^(From|To|Cc|Bcc|Subject|Date):\s*(.*)$/i

export function parseMail(text: string): {
  headers: MailHeader[]
  body: string
} {
  const lines = text.trim().split('\n')
  const headers: MailHeader[] = []
  let i = 0
  while (i < lines.length) {
    const match = lines[i].match(MAIL_HEADER)
    if (!match) break
    headers.push({ key: match[1], value: match[2].trim() })
    i += 1
  }
  if (lines[i] === '') i += 1
  return { headers, body: lines.slice(i).join('\n').trim() }
}

/** A block as a spoken line, if it is one: `Name: "…"`, or a bare quote answering the line before. */
function spoken(block: string, lastSay: 'character' | 'player' | null): Extract<SceneBeat, { kind: 'say' }> | null {
  const named = block.match(/^([A-Za-z][A-Za-z' -]*):\s*"([\s\S]+)"$/)
  if (named) return { kind: 'say', who: named[1] === 'You' ? 'player' : 'character', text: named[2] }
  const quoted = quoteOnly(block)
  if (quoted !== null) return { kind: 'say', who: lastSay === 'character' ? 'player' : 'character', text: quoted }
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
  | { kind: 'text'; text: string }
  /** `[[act:id]]`, with the words to show if it gives them. */
  | { kind: 'act'; id: string; text?: string; markup: string }
  /** `[[tip:key|words]]`. */
  | { kind: 'tip'; key: string; text: string; markup: string }
  /** `[[ui:name|words|arg|…]]`: `args` are the parts after the words. */
  | { kind: 'ui'; name: string; text: string; args: string[]; markup: string }
  /** `**words**`: `text` is the words alone. */
  | { kind: 'bold'; text: string; markup: string }
  /** `*words*`: `text` is the words alone. */
  | { kind: 'italic'; text: string; markup: string }

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
    if (last?.kind === 'text') last.text += more
    else if (more) parts.push({ kind: 'text', text: more })
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
    parts.push(token.stars === 2 ? { kind: 'bold', ...styled } : { kind: 'italic', ...styled })
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
    if (until > last) cut.push({ kind: 'text', text: text.slice(last, until) })
  }
  for (const match of text.matchAll(INLINE_MARKUP)) {
    if (match[1] === 'ui') {
      const piece = uiParts(match[2], match[3])
      if (!UI_NAME.test(piece.name) || !piece.text || piece.args.some((arg) => arg === '')) continue
      words(match.index)
      cut.push({ kind: 'ui', name: piece.name, text: piece.text, args: piece.args, markup: match[0] })
      last = match.index + match[0].length
      continue
    }
    const id = match[2].trim()
    const shown = match[3]?.trim()
    const ok = id !== '' && (match[1] === 'act' ? shown !== '' : Boolean(shown))
    if (!ok) continue
    words(match.index)
    if (match[1] === 'act') cut.push({ kind: 'act', id, ...(shown !== undefined ? { text: shown } : {}), markup: match[0] })
    else cut.push({ kind: 'tip', key: id, text: shown!, markup: match[0] })
    last = match.index + match[0].length
  }
  words(text.length)
  const parts: InlinePart[] = []
  for (const part of cut) {
    for (const piece of part.kind === 'text' ? emphasis(part.text).parts : [part]) {
      const prev = parts.at(-1)
      if (piece.kind === 'text' && prev?.kind === 'text') prev.text += piece.text
      else parts.push(piece)
    }
  }
  if (parts.length === 1 && parts[0].kind === 'text' && parts[0].text === text) return null
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
    if ((beat.kind !== 'text' && beat.kind !== 'say') || beat.spans) return beat
    const parts = inlineMarkup(beat.text)
    if (!parts) return beat
    const spans: InlineSpan[] = []
    for (const part of parts) {
      const piece: InlineSpan =
        part.kind === 'bold' || part.kind === 'italic'
          ? { kind: part.kind, text: part.text }
          : part.kind === 'ui'
            ? { kind: 'ui', name: part.name, text: part.text, args: part.args }
            : { kind: 'text', text: part.kind === 'text' ? part.text : part.markup }
      const prev = spans.at(-1)
      if (piece.kind === 'text' && prev?.kind === 'text') prev.text += piece.text
      else spans.push(piece)
    }
    const text = spans.map((span) => span.text).join('')
    return spans.some((span) => span.kind !== 'text') ? { ...beat, text, spans } : { ...beat, text }
  })
}

/** A body's blocks, split at blank lines, trimmed, each with where it starts in the body. Empty ones are left out. */
function blocksOf(body: string, base: number): { block: string; from: number }[] {
  const out: { block: string; from: number }[] = []
  let from = 0
  for (const piece of body.split('\n\n')) {
    const block = piece.trim()
    if (block) out.push({ block, from: base + from })
    from += piece.length + 2
  }
  return out
}

/** Beats with where in the body each came from, so a block's hints can find its first. */
type Placed = { beat: SceneBeat; from: number }

function parseBlocks(body: string, base: number): Placed[] {
  let lastSay: 'character' | 'player' | null = null
  return blocksOf(body, base).flatMap(({ block, from }) => beatsOfBlock(block).map((beat) => ({ beat, from })))

  function beatsOfBlock(block: string): SceneBeat[] {
    const sound = block.match(/^\[\[sound:([^\]]+)\]\]$/)
    if (sound) return [{ kind: 'sound', track: sound[1].trim() }]
    // A voice line read aloud: `Ava: "Morning." [[voice:ava.morning]]`. Only on a spoken line.
    const voiced = block.match(/^([\s\S]*?)\s*\[\[voice:([^\]]+)\]\]$/)
    const said = voiced ? spoken(voiced[1], lastSay) : null
    if (voiced && said) {
      lastSay = said.who
      return [{ ...said, voice: voiced[2].trim() }]
    }
    const media = block.match(new RegExp(`^${MEDIA_MARKUP.source}$`))
    if (media) {
      lastSay = null
      return mediaBeat(media[1], media[2], media[3])
    }
    if (block.startsWith('> ')) {
      lastSay = null
      return [{ kind: 'mono' as const, text: block.slice(2) }]
    }
    const line = spoken(block, lastSay)
    if (line) {
      lastSay = line.who
      return [line]
    }
    lastSay = null
    return [{ kind: 'text' as const, text: block }]
  }
}

/**
 * A body's beats, in order. `hints` puts each block's `ui` on the first beat
 * that block made: `at` is where the block starts in `body`, by character, as
 * a data scene's render gives it in `SceneView.blockUi`.
 */
export function parseBeats(body: string, hints?: readonly { at: number; ui: Ui<BlockUi> }[]): SceneBeat[] {
  const placed: Placed[] = []
  const fence = /\[\[(mail|sticky|clip|diary)\]\]([\s\S]*?)\[\[\/\1\]\]/g
  let last = 0
  let match: RegExpExecArray | null
  while ((match = fence.exec(body))) {
    if (match.index > last) {
      placed.push(...parseBlocks(body.slice(last, match.index), last))
    }
    const tag = match[1]
    const inner = match[2].trim()
    if (tag === 'mail') {
      const mail = parseMail(inner)
      placed.push({ beat: { kind: 'mail', headers: mail.headers, body: mail.body }, from: match.index })
    } else {
      placed.push({ beat: { kind: 'prop', face: tag as PropFace, text: inner }, from: match.index })
    }
    last = match.index + match[0].length
  }
  if (last < body.length) {
    placed.push(...parseBlocks(body.slice(last), last))
  }
  // Each hint goes on the first beat its block made, if it made one before the next hinted block starts.
  const sorted = [...(hints ?? [])].sort((a, b) => a.at - b.at)
  sorted.forEach((hint, index) => {
    const until = sorted[index + 1]?.at ?? Infinity
    const first = placed.find((entry) => entry.from >= hint.at && entry.from < until)
    if (first) first.beat = { ...first.beat, ui: hint.ui }
  })
  return placed.map((entry) => entry.beat)
}
