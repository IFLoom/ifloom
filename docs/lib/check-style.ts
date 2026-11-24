/**
 * Holds the docs to the voice rules in `.claude/skills/ifloom-docs/SKILL.md` that a script can check.
 *
 * The TSDoc of every export, field and helper the API pages print (the comments `apiComments` in
 * `scripts/api-docs.ts` collects while it writes those pages):
 *
 *   - every one has a description;
 *   - the first sentence opens with none of What, Something, Everything, How, Whether, Is, Who or Where, doesn't end
 *     with `?` and has no colon;
 *   - the summary (the first paragraph) has one colon at most and 35 words at most;
 *   - no comment says "as content declares it", "as content writes it", "as the UI draws it" or "in short".
 *
 * The pages listed in DONE (relative to `docs/content/docs/(latest)/`), outside front matter and code:
 *
 *   - no sentence has two colons or more;
 *   - none says one of the banned phrases above;
 *   - no heading or title is in Title Case (more than one capitalised word, not counting code, acronyms, names like
 *     `SaveDriver` and the proper nouns in PROPER).
 *
 * Text in backticks is left out of every rule, and so are link targets. A colon counts only when a space or the end of
 * the text follows it, so `10:30` and `https://` don't.
 *
 * `docs/snippets/tests/style.test.ts` runs it, and `node docs/lib/check-style.ts [--tsdoc] [--pages] [--files a,b]`
 * prints what it finds: `--tsdoc` the comments, `--pages` the pages in DONE (both when neither is given), and
 * `--files` only the comments declared in files whose path contains one of the given strings, and those pages
 * (checked whether DONE lists them or not).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
export const LATEST = join(ROOT, 'docs/content/docs/(latest)')

/**
 * The pages rewritten to the voice rules, relative to `docs/content/docs/(latest)/`, such as `reference/stats.md`.
 * Each batch of the rewrite adds the pages it finished; the last batch lists every page.
 */
export const DONE: string[] = [
  'reference/index.md',
  'reference/common.md',
  'reference/glossary.md',
  'reference/content.md',
  'reference/game.md',
  'reference/state.md',
  'reference/amounts.md',
  'reference/conditions.md',
  'reference/commands.md',
  'reference/effects.md',
  'reference/actions.md',
  'reference/locks.md',
  'reference/rules.md',
  'reference/custom.md',
  'reference/random.md',
  'reference/rolls.md',
  'reference/scenes.md',
  'reference/flows.md',
  'reference/storylets.md',
  'reference/prose.md',
  'reference/phrases.md',
  'reference/strings.md',
  'reference/words.md',
  'explanation/architecture.md',
  'explanation/design.md',
  'explanation/state-and-commands.md',
  'explanation/turns-and-time.md',
  'explanation/content-and-packs.md',
  'explanation/entities-and-traits.md',
  'explanation/plugins.md',
  'explanation/choosing-a-ui.md',
  'explanation/shapes-of-game.md',
  'how-to/render/start.md',
  'how-to/render/scene.md',
  'how-to/render/stats-and-things.md',
  'how-to/render/pictures-and-sound.md',
  'how-to/render/timers-minigames-panels.md',
  'how-to/render/saves-and-settings.md',
  'how-to/render/world-plugins.md',
  'how-to/render/progress-plugins.md',
  'how-to/render/things-plugins.md',
  'how-to/render/phone-plugins.md',
  'how-to/render/player-tools.md',
]

/** One problem: where it is, the rule it breaks, and the text that breaks it. */
export type StyleProblem = { where: string; rule: string; text: string }

/** The fields this check reads of each comment `apiComments` in `scripts/api-docs.ts` returns. */
type ApiComment = { entry: string; name: string; source: string; text: string }

/** The words a first sentence never opens with. */
const OPENERS = ['What', 'Something', 'Everything', 'How', 'Whether', 'Is', 'Who', 'Where']
/** The phrases no comment or page says. */
const BANNED = ['as content declares it', 'as content writes it', 'as the UI draws it', 'in short']
/** Names a heading may capitalise, longest first so a two-word name goes whole. */
export const PROPER = [
  'Plain JS',
  'Small Town',
  'IFLoom',
  'React',
  'Vue',
  'Svelte',
  'Next',
  'Node',
  'TypeScript',
  'JavaScript',
  'npm',
  'CLI',
  'API',
  'UI',
  'HTML',
  'CSS',
  'Twine',
  'SugarCube',
  'Harlowe',
  "Ren'Py",
  'Ink',
  'Vite',
  'webpack',
  'esbuild',
  'Fumadocs',
]

/** Text with its code spans as `CODE` and each link as its words, so neither counts toward a rule. */
export function plain(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, 'CODE')
    .replace(/`[^`\n]*`/g, 'CODE')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<https?:[^>]*>/g, 'LINK')
    .replace(/https?:\/\/\S+/g, 'LINK')
}

/** The colons in plain text that join words, followed by a space or the end. */
export const colons = (text: string) => (text.match(/:(?=\s|$)/g) ?? []).length

/** Plain text cut into sentences, each ending at `.`, `!` or `?` before a space and a capital, a digit or code. */
export function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+(?=["'([*_]*[A-Z0-9])/)
    .map((each) => each.trim())
    .filter(Boolean)
}

/** The banned phrases plain text says. */
const bannedIn = (text: string) => BANNED.filter((phrase) => new RegExp(`\\b${phrase}\\b`, 'i').test(text))

/** The problems with one TSDoc comment, named by `where`. */
export function checkComment(where: string, text: string): StyleProblem[] {
  const problems: StyleProblem[] = []
  const report = (rule: string, said: string) => problems.push({ where, rule, text: said })
  if (!text.trim()) return [{ where, rule: 'no description', text: '' }]
  const summary = text.split(/\n\s*\n/)[0]
  const words = plain(summary)
  const [first = ''] = sentences(words)
  const opener = /^[^A-Za-z]*([A-Za-z]+)/.exec(first)?.[1] ?? ''
  if (OPENERS.includes(opener)) report(`first sentence opens with "${opener}"`, summary)
  if (/\?["')]*$/.test(first)) report('first sentence is a question', summary)
  if (colons(first)) report('colon in the first sentence', summary)
  else if (colons(words) > 1) report('more than one colon in the summary', summary)
  const count = words.split(/\s+/).filter((word) => /\w/.test(word)).length
  if (count > 35) report(`summary of ${count} words (35 at most)`, summary)
  for (const phrase of bannedIn(plain(text))) report(`says "${phrase}"`, text)
  return problems
}

/** The problems with the TSDoc the API pages print, only those declared in a file whose path contains one of `files`. */
export async function checkTsdoc(files?: string[]): Promise<StyleProblem[]> {
  // Loaded by its URL so that tsc doesn't follow it: the site copies docs/ without scripts/ and typechecks this file.
  const { apiComments } = (await import(pathToFileURL(join(ROOT, 'scripts/api-docs.ts')).href)) as { apiComments: () => ApiComment[] }
  return apiComments()
    .filter((comment) => !files?.length || files.some((file) => comment.source.includes(file)))
    .flatMap((comment) => checkComment(`${comment.entry} ${comment.name} (${comment.source})`, comment.text))
}

/** Whether a heading's words are in Title Case: more than one capitalised word that isn't code, an acronym, an identifier or a proper noun. */
export function titleCase(heading: string): boolean {
  let text = plain(heading).replace(/\bCODE\b/g, ' ')
  for (const name of PROPER) text = text.replace(new RegExp(`(^|[^\\w])${name.replace(/ /g, '\\s+')}(?![\\w])`, 'g'), '$1 ')
  const capitals = text
    .split(/[\s\-/–—]+/)
    .map((word) => word.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, ''))
    .filter((word) => /^[A-Z]/.test(word))
    // An acronym (`HUD`) or an identifier (`SaveDriver`) is a name, not a capitalised word.
    .filter((word) => !/^[A-Z0-9]+s?$/.test(word) || word.length === 1)
    .filter((word) => !/^[A-Z][a-z0-9]*[A-Z]/.test(word))
  return capitals.length > 1
}

/** The problems with one page's Markdown, named by `page`. */
export function checkPage(page: string, source: string): StyleProblem[] {
  const problems: StyleProblem[] = []
  const lines = source.split('\n')
  const report = (line: number, rule: string, text: string) => problems.push({ where: `${page}:${line}`, rule, text: text.trim() })
  let index = 0
  // Front matter: only the title is held to the heading rule.
  if (lines[0] === '---') {
    for (index = 1; index < lines.length && lines[index] !== '---'; index++) {
      const title = /^title:\s*["']?(.*?)["']?\s*$/.exec(lines[index])
      if (title && titleCase(title[1])) report(index + 1, 'title in Title Case', title[1])
    }
    index++
  }
  // A run of prose lines, checked as one text from the line it starts on.
  let run: string[] = []
  let start = 0
  const flush = () => {
    if (run.length) prose(start, run.join(' '))
    run = []
  }
  const prose = (line: number, text: string) => {
    const words = plain(text)
    for (const sentence of sentences(words)) if (colons(sentence) > 1) report(line, 'two colons in a sentence', sentence)
    for (const phrase of bannedIn(words)) report(line, `says "${phrase}"`, text)
  }
  let fence: string | undefined
  let comment = false
  for (; index < lines.length; index++) {
    const line = lines[index]
    const number = index + 1
    if (fence) {
      if (line.trim().startsWith(fence)) fence = undefined
      continue
    }
    const opens = /^\s*(```+|~~~+)/.exec(line)
    if (opens) {
      flush()
      fence = opens[1]
      continue
    }
    if (comment || /^\s*<!--/.test(line)) {
      flush()
      comment = !line.includes('-->')
      continue
    }
    const heading = /^#{1,6}\s+(.*?)\s*#*\s*$/.exec(line)
    if (heading) {
      flush()
      if (titleCase(heading[1])) report(number, 'heading in Title Case', heading[1])
      prose(number, heading[1])
      continue
    }
    if (/^\s*\|/.test(line)) {
      flush()
      if (/^\s*\|[\s|:-]+\|\s*$/.test(line)) continue
      // Each cell on its own, its code spans (which may hold a `|`) taken out first.
      for (const cell of plain(line.replace(/\\\|/g, ' ')).split('|')) if (cell.trim()) prose(number, cell)
      continue
    }
    if (!line.trim() || /^\s*:::/.test(line) || /^\s*<\/?[A-Za-z][^>]*>\s*$/.test(line)) {
      flush()
      continue
    }
    // A list item starts its own text, its bold lead-in (`- **Term**: text`) left out.
    const item = /^(\s*(?:[-*+]|\d+[.)])\s+)(?:\*\*[^*]+\*\*:?\s*)?(.*)$/.exec(line)
    if (item) {
      flush()
      start = number
      run = [item[2]]
      continue
    }
    if (!run.length) start = number
    run.push(line.replace(/^\s*>\s?/, ''))
  }
  flush()
  return problems
}

/** A page's path relative to the latest docs, from one relative to there, to the repo, or absolute. */
function pageOf(file: string): string {
  const absolute = existsSync(file) ? resolve(file) : existsSync(join(ROOT, file)) ? join(ROOT, file) : join(LATEST, file)
  return relative(LATEST, absolute)
}

/** Every Markdown page of the latest docs, relative to there. */
export function allPages(): string[] {
  const pages: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) walk(path)
      else if (/\.mdx?$/.test(entry.name)) pages.push(relative(LATEST, path))
    }
  }
  walk(LATEST)
  return pages.sort()
}

/** The problems with the given pages, relative to the latest docs (DONE when none are given). */
export function checkPages(pages: string[] = DONE): StyleProblem[] {
  return pages.flatMap((page) => {
    const path = join(LATEST, page)
    if (!existsSync(path)) return [{ where: page, rule: 'no such page', text: '' }]
    return checkPage(page, readFileSync(path, 'utf8'))
  })
}

/** Problems as text, grouped by rule with a count for each, and a total. */
export function report(problems: StyleProblem[], label: string): string {
  const byRule = new Map<string, StyleProblem[]>()
  for (const problem of problems) {
    const rule = problem.rule.replace(/"[^"]*"|\d+ words/g, (match) => (match.startsWith('"') ? match : 'N words'))
    byRule.set(rule, [...(byRule.get(rule) ?? []), problem])
  }
  const out: string[] = []
  for (const [rule, these] of [...byRule].sort((a, b) => b[1].length - a[1].length)) {
    out.push(`\n${rule} (${these.length})`)
    for (const problem of these) {
      const text = problem.text.replace(/\s+/g, ' ')
      out.push(`  ${problem.where}${text ? `: ${text.length > 200 ? text.slice(0, 197) + '...' : text}` : ''}`)
    }
  }
  const counts = [...byRule].sort((a, b) => b[1].length - a[1].length).map(([rule, these]) => `  ${these.length}  ${rule}`)
  return [...out, '', `${label}: ${problems.length} problems`, ...counts].join('\n')
}

if (import.meta.main) {
  const args = process.argv.slice(2)
  const at = args.indexOf('--files')
  const files = at >= 0 ? (args[at + 1] ?? '').split(',').filter(Boolean) : undefined
  const both = !args.includes('--tsdoc') && !args.includes('--pages')
  let failed = false
  if (both || args.includes('--tsdoc')) {
    const started = Date.now()
    const problems = await checkTsdoc(files)
    console.log(report(problems, `TSDoc (${Date.now() - started} ms)`))
    failed ||= problems.length > 0
  }
  if (both || args.includes('--pages')) {
    const problems = checkPages(files?.length ? files.filter((file) => /\.mdx?$/.test(file)).map(pageOf) : DONE)
    console.log(report(problems, `Pages (${files?.length ? 'given' : `${DONE.length} in DONE`})`))
    failed ||= problems.length > 0
  }
  process.exitCode = failed ? 1 : 0
}
