export type BeatSize = 'inline' | 'wide'

export type MailHeader = { key: string; value: string }

export type PropFace = 'sticky' | 'clip' | 'diary'

export type SceneBeat =
  | { kind: 'text'; text: string }
  | { kind: 'mono'; text: string }
  /** A spoken line. `voice` is the track of it read aloud, from `[[voice:id]]` at the end of the line. */
  | { kind: 'say'; who: 'character' | 'player'; text: string; voice?: string }
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
export function mediaParts(path: string, rest: string): {
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
  const parts = rest.split('|').slice(1).map((part) => part.trim())
  const trimmed = path.trim()
  const pool = trimmed.startsWith('@') ? trimmed.slice(1).trim() : undefined
  // After a pool, the first part is always its tags, even when empty: `[[img:@door||A door]]`.
  const tags = pool !== undefined && parts.length ? parts.shift()!.split(',').map((tag) => tag.trim()).filter(Boolean) : []
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
    return [{
      kind: 'video',
      src: artSrc(read.path, 'video'),
      ...(poster ? { poster } : {}),
      ...(read.alt !== undefined ? { alt: read.alt } : {}),
      size,
      ...play,
    }]
  }
  return [{
    kind: 'image',
    src: artSrc(read.path),
    alt: read.alt,
    size,
    ...(read.flags.rot ? { rotate: true } : {}),
  }]
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

function parseBlocks(body: string): SceneBeat[] {
  let lastSay: 'character' | 'player' | null = null
  return body
    .split('\n\n')
    .map((block) => block.trim())
    .filter(Boolean)
    .flatMap((block): SceneBeat[] => {
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
    })
}

export function parseBeats(body: string): SceneBeat[] {
  const beats: SceneBeat[] = []
  const fence = /\[\[(mail|sticky|clip|diary)\]\]([\s\S]*?)\[\[\/\1\]\]/g
  let last = 0
  let match: RegExpExecArray | null
  while ((match = fence.exec(body))) {
    if (match.index > last) {
      beats.push(...parseBlocks(body.slice(last, match.index)))
    }
    const tag = match[1]
    const inner = match[2].trim()
    if (tag === 'mail') {
      const mail = parseMail(inner)
      beats.push({ kind: 'mail', headers: mail.headers, body: mail.body })
    } else {
      beats.push({ kind: 'prop', face: tag as PropFace, text: inner })
    }
    last = match.index + match[0].length
  }
  if (last < body.length) {
    beats.push(...parseBlocks(body.slice(last)))
  }
  return beats
}
