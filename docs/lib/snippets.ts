/**
 * Code a page includes from a file, so what the docs show is code that's
 * type-checked and run. A page writes, on a line of its own:
 *
 *   ::include[../../../../snippets/plain/shop.ts]{meta='tab="Plain JS" tab-group="framework"'}
 *   ::include[../../../../snippets/react/hud.tsx#gauge]
 *
 * fumadocs-mdx's `remarkInclude` turns each into a code block, its language
 * from the file's extension (or `lang`), with `meta` as the block's meta, so
 * consecutive includes with `tab` make one group of tabs. The path is relative
 * to the page. `#name` takes only the lines between `// #region name` and
 * `// #endregion` (`<!-- #region name -->` in a .vue template).
 *
 * The link check (`scripts/check-links.ts`) fails on an include whose file or
 * region isn't there, and `framework-tabs.test.ts` reads includes as the code
 * blocks they become. The snippets live in `docs/snippets/`.
 *
 * Nothing here reads a file, so the engine's tests can use it too: callers
 * resolve `path` against the page (`new URL(path, pageUrl)`) and read it.
 */

/** One `::include[…]` line of a page. */
export type Include = {
  /** Its line in the page, from 1. */
  line: number
  /** The path as written, relative to the page. */
  path: string
  /** The region after `#`, or null for the whole file. */
  region: string | null
  /** The code block's language: `lang`, or the file's extension. */
  lang: string
  /** The code block's meta, such as `tab="React" tab-group="framework"`. */
  meta: string
  /** A Markdown file with no `lang`, which comes in as part of the page rather than as code. */
  markdown: boolean
}

const INCLUDE = /^::include\[([^\]]+)\](?:\{(.*)\})?\s*$/

function attribute(attributes: string, name: string): string | null {
  const match = new RegExp(`(?:^|\\s)${name}=(?:'([^']*)'|"([^"]*)"|(\\S+))`).exec(attributes)
  return match ? (match[1] ?? match[2] ?? match[3]) : null
}

/** The includes in a page's Markdown, outside code blocks. */
export function includesOf(source: string): Include[] {
  const found: Include[] = []
  let fenced = false
  source.split('\n').forEach((text, index) => {
    if (/^ {0,3}`{3,}/.test(text)) fenced = !fenced
    const match = fenced ? null : INCLUDE.exec(text)
    if (!match) return
    const at = match[1].lastIndexOf('#')
    const path = at === -1 ? match[1] : match[1].slice(0, at)
    const attributes = match[2] ?? ''
    const lang = attribute(attributes, 'lang')
    found.push({
      line: index + 1,
      path,
      region: at === -1 ? null : match[1].slice(at + 1),
      lang: lang ?? /\.([^./]+)$/.exec(path)?.[1] ?? '',
      meta: attribute(attributes, 'meta') ?? '',
      markdown: lang === null && /\.mdx?$/.test(path),
    })
  })
  return found
}

const START = [/^\s*\/\/\s*#?region\s+(.+?)\s*$/, /^\s*<!--\s*#?region\s+(.+?)\s*-->/]
const END = [/^\s*\/\/\s*#?endregion\b/, /^\s*<!--\s*#?endregion\b/]

/** The lines between a region's markers, without them and dedented, or null when the file has no such region. */
export function regionOf(source: string, name: string): string | null {
  const lines = source.split('\n')
  const start = lines.findIndex((line) => START.some((marker) => marker.exec(line)?.[1] === name))
  if (start === -1) return null
  const end = lines.findIndex((line, index) => index > start && END.some((marker) => marker.test(line)))
  if (end === -1) return null
  const inside = lines.slice(start + 1, end)
  const indent = Math.min(...inside.filter((line) => line.trim()).map((line) => /^\s*/.exec(line)![0].length))
  return inside.map((line) => line.slice(Number.isFinite(indent) ? indent : 0)).join('\n')
}

/** The code an include shows, from its file's text (`undefined` when there's no such file), or why it shows nothing. */
export function codeOf(include: Include, source: string | undefined): { ok: true; code: string } | { ok: false; reason: string } {
  if (source === undefined) return { ok: false, reason: `no file ${include.path}` }
  if (include.region === null) return { ok: true, code: source.replace(/\r?\n$/, '') }
  const code = regionOf(source, include.region)
  return code === null ? { ok: false, reason: `no region "${include.region}" in ${include.path}` } : { ok: true, code }
}
