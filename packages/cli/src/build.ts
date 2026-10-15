import { readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import type { Game } from '@ifloom/engine'
import { checkAudio } from './check.ts'

/**
 * Check a built folder is a game that opens from disk: an `index.html`, and
 * nothing it loads from anywhere but beside it. Given the game, also every
 * sound file it lists that isn't in the folder. Returns what is wrong.
 *
 * That code never fetches at runtime is held by the engine's and UI's own
 * contract tests, on their source: a bundled library mentions `fetch` without
 * ever calling it here, so the built file can't be searched for it.
 */
export function checkBuild(dir: string, game?: Game): string[] {
  const problems: string[] = []
  let html: string
  try {
    html = readFileSync(join(dir, 'index.html'), 'utf8')
  } catch {
    return [`no index.html in ${dir}`]
  }
  // Scripts and stylesheets: what the game needs to run. A favicon or a link to a page doesn't count.
  const loads = [
    ...[...html.matchAll(/<script\b([^>]*)\bsrc="([^"]+)"/g)].map((match) => ({ url: match[2], module: /type="module"/.test(match[1]) })),
    ...[...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*\bhref="([^"]+)"|<link\b[^>]*\bhref="([^"]+)"[^>]*rel="stylesheet"/g)].map((match) => ({
      url: match[1] ?? match[2],
      module: false,
    })),
  ]
  for (const { url, module } of loads) {
    if (/^(?:[a-z]+:)?\/\//i.test(url) || url.startsWith('/')) problems.push(`index.html loads ${url}, which is not beside it`)
    // A browser refuses a module script from a file beside a page opened from disk.
    else if (module) problems.push(`index.html loads the module script ${url}, which won't load from disk; build as one file`)
  }
  if (game) problems.push(...checkAudio(game, dir))
  return problems
}

/** Every file in a built folder, with its size, largest first. */
export function buildFiles(dir: string, at = ''): { file: string; bytes: number }[] {
  return readdirSync(join(dir, at)).flatMap((name) => {
    const path = join(at, name)
    const full = join(dir, path)
    return statSync(full).isDirectory() ? buildFiles(dir, path) : [{ file: path, bytes: statSync(full).size }]
  }).sort((a, b) => b.bytes - a.bytes)
}

const TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
}

/**
 * Put every file in a built folder's `art/` into its `index.html` as a data
 * URL, under its path, and remove the folder: one file with everything in it.
 * The React UI's pictures look a path up there first (`assetUrl`). Worth it for
 * a small game; a large one is better left as a folder. Sound in `audio/` is
 * never put in: it is too big, and the player plays it from beside the page.
 * Returns how many files went in and how big the page is now.
 */
export function inlineAssets(dir: string, folder = 'art'): { files: number; bytes: number } {
  let files: { file: string; bytes: number }[]
  try {
    files = buildFiles(join(dir, folder))
  } catch {
    files = []
  }
  const page = join(dir, 'index.html')
  // Nothing to put in — no art, or a folder already inlined: leave the page as it is.
  if (!files.length) return { files: 0, bytes: statSync(page).size }
  const map: Record<string, string> = {}
  for (const { file } of files) {
    const type = TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream'
    map[`${folder}/${file.split('\\').join('/')}`] = `data:${type};base64,${readFileSync(join(dir, folder, file)).toString('base64')}`
  }
  // Before any other script, so the map is there when the game first draws.
  const script = `<script>window.__ifloomAssets=${JSON.stringify(map).replace(/</g, '\\u003c')}</script>`
  // A second run replaces the first one's map rather than adding another.
  const html = readFileSync(page, 'utf8')
    .replace(/<script>window\.__ifloomAssets=[\s\S]*?<\/script>/, '')
    .replace(/<head>/i, (head) => `${head}${script}`)
  writeFileSync(page, html)
  rmSync(join(dir, folder), { recursive: true, force: true })
  return { files: files.length, bytes: Buffer.byteLength(html) }
}
