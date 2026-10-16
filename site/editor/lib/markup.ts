/**
 * The prose markup helper: each kind of markup from a few fields, as the
 * engine's `parseBeats` reads it. See the docs' Prose and markup page.
 */
import { parseBeats, type SceneBeat } from '@ifloom/engine'

export const MARKUP_KINDS = ['img', 'wide', 'video', 'sound', 'voice', 'speaker', 'mono', 'pool'] as const
export type MarkupKind = (typeof MARKUP_KINDS)[number]

export const MARKUP_LABELS: Record<MarkupKind, string> = {
  img: 'Picture',
  wide: 'Wide picture',
  video: 'Video',
  sound: 'Sound',
  voice: 'Voice line',
  speaker: 'Speaker line',
  mono: 'Thought (mono)',
  pool: 'Pool picture',
}

/** The fields each kind asks for, in order, with a sample value. */
export const MARKUP_FIELDS: Record<MarkupKind, { name: string; label: string; sample: string }[]> = {
  img: [
    { name: 'path', label: 'Path', sample: 'place/market' },
    { name: 'alt', label: 'Alt text', sample: 'The market square' },
  ],
  wide: [
    { name: 'path', label: 'Path', sample: 'scene/market-morning' },
    { name: 'alt', label: 'Alt text', sample: 'The market at seven' },
  ],
  video: [
    { name: 'path', label: 'Path', sample: 'clips/kettle.mp4' },
    { name: 'alt', label: 'Alt text', sample: 'The kettle coming to the boil' },
  ],
  sound: [{ name: 'track', label: 'Track id', sample: 'knock' }],
  voice: [
    { name: 'name', label: 'Speaker', sample: 'Ava' },
    { name: 'text', label: 'Line', sample: 'New beans this week.' },
    { name: 'track', label: 'Voice track id', sample: 'ava.beans' },
  ],
  speaker: [
    { name: 'name', label: 'Speaker (You for the player)', sample: 'Ava' },
    { name: 'text', label: 'Line', sample: 'Anything else?' },
  ],
  mono: [{ name: 'text', label: 'Thought', sample: 'You should have brought an umbrella.' }],
  pool: [
    { name: 'pool', label: 'Pool id', sample: 'door' },
    { name: 'tags', label: 'Tags, comma separated', sample: 'red,night' },
  ],
}

/** Alt text can't hold `|` or `]`, which the markup uses itself. */
const clean = (text: string) => text.replace(/[|\]]/g, '').trim()

/** The markup for one kind, from its fields. Each is a paragraph of its own. */
export function markup(kind: MarkupKind, fields: Record<string, string>): string {
  const f = (name: string) => (fields[name] ?? '').trim()
  const withAlt = (tag: string, path: string) => (f('alt') ? `[[${tag}:${path}|${clean(f('alt'))}]]` : `[[${tag}:${path}]]`)
  switch (kind) {
    case 'img':
      return withAlt('img', f('path'))
    case 'wide':
      return withAlt('wide', f('path'))
    case 'video':
      return withAlt('video', f('path'))
    case 'sound':
      return `[[sound:${f('track')}]]`
    case 'voice':
      return `${f('name') || 'Ava'}: "${f('text')}" [[voice:${f('track')}]]`
    case 'speaker':
      return `${f('name') || 'Ava'}: "${f('text')}"`
    case 'mono':
      return `> ${f('text')}`
    case 'pool':
      return f('tags') ? `[[img:@${f('pool')}|${f('tags').replace(/\s+/g, '')}]]` : `[[img:@${f('pool')}]]`
  }
}

/** The sample markup for a kind, for the toolbar. */
export function sampleMarkup(kind: MarkupKind): string {
  return markup(kind, Object.fromEntries(MARKUP_FIELDS[kind].map((field) => [field.name, field.sample])))
}

/** Text with a paragraph put in at a cursor position, with blank lines around it. */
export function insertParagraph(text: string, at: number, paragraph: string): { text: string; cursor: number } {
  const before = text.slice(0, at).replace(/\s+$/, '')
  const after = text.slice(at).replace(/^\s+/, '')
  const head = before ? `${before}\n\n` : ''
  const next = `${head}${paragraph}${after ? `\n\n${after}` : ''}`
  return { text: next, cursor: head.length + paragraph.length }
}

const POOL_MARK = '__pool__'
const POOL = /\[\[(img|wide):@([^|\]]+)(?:\|([^\]]*))?\]\]/g

/**
 * The beats a prose text draws, for the editor's rendered view. A pool picture
 * is picked only when a game runs, so here it's an image whose `src` names the
 * pool (`pool:door`) and whose alt text is the tags asked for.
 */
export function proseBeats(text: string): SceneBeat[] {
  const marked = text.replace(POOL, (_, size: string, pool: string, tags?: string) => `[[${size}:${POOL_MARK}${pool}|${tags ? `tags ${tags}` : 'any tags'}]]`)
  return parseBeats(marked).map((beat) => (beat.kind === 'image' && beat.src.includes(POOL_MARK) ? { ...beat, src: `pool:${beat.src.split(POOL_MARK)[1].replace(/\.jpg$/, '')}` } : beat))
}
