import { readdirSync, readFileSync, rmdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { mediaKind, type FileRef } from '@ifloom/engine'
import { checkFiles } from './check.ts'

/**
 * Check a built folder is a game that opens from disk: an `index.html`, and
 * nothing it loads from anywhere but beside it. Given the files the game names
 * (`checkGame(game).files`), also each one that isn't in the folder (or, for a
 * picture, in the page, after `--inline-assets`). Returns what is wrong.
 *
 * That code never fetches at runtime is held by the engine's and UI's own
 * contract tests, on their source: a bundled library mentions `fetch` without
 * ever calling it here, so the built file can't be searched for it.
 */
export function checkBuild(dir: string, files?: readonly FileRef[]): string[] {
  const problems: string[] = []
  let html: string
  try {
    html = readFileSync(join(dir, 'index.html'), 'utf8')
  } catch {
    return [`no index.html in ${dir}`]
  }
  // Scripts and stylesheets: what the game needs to run. A favicon or a link to a page doesn't count.
  const loads = [
    ...[...html.matchAll(/<script\b([^>]*)\bsrc="([^"]+)"/g)].map((match) => ({ url: match[2], module: match[1].includes('type="module"') })),
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
  if (files) problems.push(...checkFiles(files, dir, inlinedAssets(html)))
  return problems
}

/** The files `--inline-assets` put in a page, by path. */
function inlinedAssets(html: string): Set<string> {
  const map = html.match(/<script>window\.__ifloomAssets=([\s\S]*?)<\/script>/)
  if (!map) return new Set()
  try {
    return new Set(Object.keys(JSON.parse(map[1]) as Record<string, string>))
  } catch {
    return new Set()
  }
}

/** Every file in a built folder, with its size, largest first. */
export function buildFiles(dir: string, at = ''): { file: string; bytes: number }[] {
  return readdirSync(join(dir, at))
    .flatMap((name) => {
      const path = join(at, name)
      const full = join(dir, path)
      return statSync(full).isDirectory() ? buildFiles(dir, path) : [{ file: path, bytes: statSync(full).size }]
    })
    .sort((a, b) => b.bytes - a.bytes)
}

/** The pictures' types, for their data URLs. Only pictures go in the page. */
const TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
}

/** Remove a folder's empty folders, and the folder itself if that leaves it empty. */
function pruneEmpty(dir: string): void {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) pruneEmpty(path)
  }
  if (!readdirSync(dir).length) rmdirSync(dir)
}

/**
 * Put every picture in a built folder's `art/` into its `index.html` as a data
 * URL, under its path, and remove it from the folder: one file with the art in
 * it. The React UI's pictures look a path up there first (`assetUrl`). Worth it
 * for a small game; a large one is better left as a folder. Sound in `audio/`
 * and videos (`.mp4`, `.webm`) are never put in: they are too big, and are
 * played from beside the page, so `art/` stays with only the videos in it.
 * Which files are videos is the engine's `mediaKind`.
 * Returns how many files went in, how big the page is now, and how many videos
 * were left beside it.
 */
export function inlineAssets(dir: string, folder = 'art'): { files: number; bytes: number; videos: number } {
  let all: { file: string; bytes: number }[]
  try {
    all = buildFiles(join(dir, folder))
  } catch {
    all = []
  }
  // Videos are too big to put in the page: they stay beside it, as sound does. The engine says which files are videos.
  const files = all.filter((entry) => mediaKind(entry.file) !== 'video')
  const videos = all.length - files.length
  const page = join(dir, 'index.html')
  // Nothing to put in — no art, or a folder already inlined: leave the page as it is.
  if (!files.length) return { files: 0, bytes: statSync(page).size, videos }
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
  for (const { file } of files) rmSync(join(dir, folder, file), { force: true })
  pruneEmpty(join(dir, folder))
  return { files: files.length, bytes: Buffer.byteLength(html), videos }
}
