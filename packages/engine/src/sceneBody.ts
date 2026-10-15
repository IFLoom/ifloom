export type BeatSize = 'inline' | 'wide'

export type MailHeader = { key: string; value: string }

export type PropFace = 'sticky' | 'clip' | 'diary'

export type SceneBeat =
  | { kind: 'text'; text: string }
  | { kind: 'mono'; text: string }
  /** A spoken line. `voice` is the track of it read aloud, from `[[voice:id]]` at the end of the line. */
  | { kind: 'say'; who: 'character' | 'player'; text: string; voice?: string }
  | { kind: 'image'; src: string; alt?: string; size: BeatSize; rotate?: boolean }
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

/** The one place a picture's path is resolved. A bare name is a `.jpg`. */
export function artSrc(path: string): string {
  const trimmed = path.replace(/^\/?art\//, '').replace(/^\//, '')
  if (/\.(jpg|jpeg|png|webp|gif|webm|mp4|svg)$/i.test(trimmed)) {
    return `${ART_ROOT}${trimmed}`
  }
  return `${ART_ROOT}${trimmed}.jpg`
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
    .map((block): SceneBeat => {
      const sound = block.match(/^\[\[sound:([^\]]+)\]\]$/)
      if (sound) return { kind: 'sound', track: sound[1].trim() }
      // A voice line read aloud: `Ava: "Morning." [[voice:ava.morning]]`. Only on a spoken line.
      const voiced = block.match(/^([\s\S]*?)\s*\[\[voice:([^\]]+)\]\]$/)
      const said = voiced ? spoken(voiced[1], lastSay) : null
      if (voiced && said) {
        lastSay = said.who
        return { ...said, voice: voiced[2].trim() }
      }
      const image = block.match(/^\[\[(img|wide):([^\]|]+)((?:\|[^\]|]*)*)\]\]$/)
      if (image) {
        lastSay = null
        // After the path: `|rot` turns it, anything else is the alt text.
        const parts = image[3].split('|').slice(1).map((part) => part.trim())
        const rotate = parts.includes('rot')
        const alt = parts.find((part) => part && part !== 'rot')
        return {
          kind: 'image' as const,
          src: artSrc(image[2].trim()),
          alt,
          size: image[1] === 'wide' ? ('wide' as const) : ('inline' as const),
          ...(rotate ? { rotate: true } : {}),
        }
      }
      if (block.startsWith('> ')) {
        lastSay = null
        return { kind: 'mono' as const, text: block.slice(2) }
      }
      const line = spoken(block, lastSay)
      if (line) {
        lastSay = line.who
        return line
      }
      lastSay = null
      return { kind: 'text' as const, text: block }
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
