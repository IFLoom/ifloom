import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { artSrc, audioSrc, checkGame as checkContent, describeProblem, mediaKind, type Game, type Problem } from '@ifloom/engine'

/** What a game module can export: a game, `{ game, problems }`, or a function that returns either. */
type Exported = Game | { game: Game; problems?: unknown[] } | (() => Game | { game: Game; problems?: unknown[] })

/**
 * The game a module exports, as `default` or `game`, with its content
 * checker's problems. A loaded game comes with them, since `loadGame` ran the
 * checker; a hand-built one is checked here. Either way each is listed once.
 */
export function gameFrom(module: Record<string, unknown>): { game: Game; problems: string[] } {
  let found = (module.default ?? module.game) as Exported | undefined
  if (typeof found === 'function') found = found()
  if (!found) throw new Error('The game module exports no game: export it as `default` or `game`.')
  if ('game' in found && typeof found.game === 'object' && Array.isArray(found.problems)) {
    return { game: found.game, problems: found.problems.map(asText) }
  }
  const game = ('game' in found && typeof found.game === 'object' ? found.game : found) as Game
  return { game, problems: checkContent(game).problems.map(describeProblem) }
}

/** A problem as `describeProblem` words it; anything else as a string. */
function asText(problem: unknown): string {
  return typeof problem === 'object' && problem !== null && 'what' in problem ? describeProblem(problem as Problem) : String(problem)
}

/**
 * Every track in `game.audio` whose file isn't in `dir`, where the page finds
 * it: `audioSrc(src)`, so `public/audio/…` before a build and `dist/audio/…`
 * after one. Playlists name tracks, so only tracks are looked for.
 */
export function checkAudio(game: Game, dir: string): string[] {
  const out: string[] = []
  for (const [id, track] of Object.entries(game.audio?.tracks ?? {})) {
    if ('playlist' in track) continue
    const file = audioSrc(track.src)
    if (!existsSync(join(dir, file))) out.push(`track ${id}: no file ${join(dir, file)}`)
  }
  return out
}

/** Picture and video markup, as the engine reads it: `[[img:path|…]]`, `[[wide:…]]`, `[[video:…]]`, `[[widevideo:…]]`. */
const MARKUP = /\[\[(img|wide|video|widevideo):([^\]|]+)((?:\|[^\]|]*)*)\]\]/g

/** Keys of the game that hold no pictures, or that are looked at on their own. */
const SKIP = new Set(['prose', 'plugins', 'custom', 'rules', 'audio', 'strings', 'media'])

/** A page path as written (`art/photo/ava.svg`), or null for a URL or nothing. */
function pagePath(path: string): string | null {
  if (!path.trim() || /^(?:[a-z]+:|\/\/)/i.test(path)) return null
  return path.replace(/^\.?\//, '')
}

/** The files a stretch of prose's markup names. Pool requests (`@door`) are left to the pool's own files. */
function markupFiles(text: string): string[] {
  const files: string[] = []
  for (const match of text.matchAll(MARKUP)) {
    const path = match[2].trim()
    const parts = match[3].split('|').map((part) => part.trim())
    const poster = parts.find((part) => part.startsWith('poster='))
    if (poster) files.push(artSrc(poster.slice('poster='.length).trim()))
    if (path.startsWith('@')) continue
    files.push(artSrc(path, match[1] === 'video' || match[1] === 'widevideo' || mediaKind(path) === 'video' ? 'video' : 'image'))
  }
  return files
}

/** A media block's or a stage layer's files: its `src` (not a pool's) and its poster. */
function mediaFiles(media: Record<string, unknown>): string[] {
  const files: string[] = []
  if (typeof media.src === 'string') files.push(artSrc(media.src, media.video === true || mediaKind(media.src) === 'video' ? 'video' : 'image'))
  if (typeof media.poster === 'string') files.push(artSrc(media.poster))
  return files
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Every picture and video the game names whose file isn't in `dir`, where the
 * page looks for it: `public/art/…` before a build, `dist/art/…` after one.
 * It looks at the files in `game.media`'s pools, then walks the game's scenes,
 * plugin data (places, messages, posts), collections and the rest for:
 *
 * - `{ media }` blocks and stage layers, through `artSrc`, with their posters;
 * - `image` and `video` fields (a post's, a notice's), as page paths;
 * - picture and video markup in the prose those name, and in any text.
 *
 * Pool requests in markup and data are covered by the pools' own files. A
 * place's `art` is not looked for: the places plugin asks for one, but no UI
 * draws it, so many games have none. Sound is `checkAudio`'s; `checkGame` and
 * `checkBuild` run both. `inlined` lists files that are in the page itself,
 * after `--inline-assets`, which count as there.
 */
export function checkMedia(game: Game, dir: string, inlined: ReadonlySet<string> = new Set()): string[] {
  const out = new Set<string>()
  const need = (where: string, file: string | null) => {
    if (file && !inlined.has(file) && !existsSync(join(dir, file))) out.add(`${where}: no file ${join(dir, file)}`)
  }
  for (const [pool, files] of Object.entries(game.media?.pools ?? {})) {
    for (const file of files) need(`pool ${pool}`, artSrc(file.src, mediaKind(file.src)))
  }
  const prose = game.prose
  const proseSeen = new Set<string>()
  const readProse = (key: string) => {
    if (proseSeen.has(key)) return
    proseSeen.add(key)
    const text = prose?.line(key)
    if (text !== undefined) for (const file of markupFiles(text)) need(`prose ${key}`, file)
  }
  const walk = (value: unknown, where: string, seen: Set<unknown>): void => {
    if (typeof value === 'string') {
      readProse(value)
      for (const file of markupFiles(value)) need(where, file)
      return
    }
    if (typeof value !== 'object' || value === null || seen.has(value)) return
    seen.add(value)
    if (Array.isArray(value)) {
      value.forEach((entry, index) => walk(entry, `${where}[${isRecord(entry) && typeof entry.id === 'string' ? entry.id : index}]`, seen))
      return
    }
    const node = value as Record<string, unknown>
    if (isRecord(node.media)) for (const file of mediaFiles(node.media)) need(`${where}.media`, file)
    if (Array.isArray(node.layers)) {
      node.layers.forEach((layer, index) => {
        if (isRecord(layer)) for (const file of mediaFiles(layer)) need(`${where}.layers[${index}]`, file)
      })
    }
    for (const key of ['image', 'video'] as const) {
      if (typeof node[key] === 'string') need(`${where}.${key}`, pagePath(node[key] as string))
    }
    if (typeof node.variants === 'string') for (const key of prose?.variants(node.variants) ?? []) readProse(key)
    for (const [key, child] of Object.entries(node)) {
      if (typeof child !== 'function') walk(child, where ? `${where}.${key}` : key, seen)
    }
  }
  const seen = new Set<unknown>()
  for (const [key, value] of Object.entries(game)) {
    if (!SKIP.has(key)) walk(value, key, seen)
  }
  return [...out]
}

/**
 * Every file the game names that isn't in `dir`: its sounds (`checkAudio`)
 * and its pictures and videos (`checkMedia`).
 */
export function checkFiles(game: Game, dir: string, inlined?: ReadonlySet<string>): string[] {
  return [...checkAudio(game, dir), ...checkMedia(game, dir, inlined)]
}

/**
 * Everything wrong with a game: the engine's content checker's problems,
 * once, then, given the game's public folder, every sound, picture and video
 * file that isn't in it.
 */
export function checkGame(module: Record<string, unknown>, publicDir?: string): string[] {
  const { game, problems } = gameFrom(module)
  return [...problems, ...(publicDir === undefined ? [] : checkFiles(game, publicDir))]
}
