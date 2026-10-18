import { describe, expect, it } from 'vitest'

/**
 * The community plugins page draws its table from
 * `site/content/community-plugins.json` (`remarkCommunityPlugins` in
 * `site/lib/remark.ts`). Entries are added by hand after a plugin is
 * reviewed, so this holds each one to the shape the page reads: a typo here
 * would otherwise show as a broken row on the site.
 */
const FILES = import.meta.glob('../../../../site/content/community-plugins.json', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const PAGES = import.meta.glob('../../../../site/content/docs/**/plugins/community.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const FIELDS = ['name', 'author', 'npm', 'repo', 'description', 'ifloom'] as const

/** An npm package name, scoped or not. */
const NPM = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/
/** One comparator of a semver range: `^0.1.0`, `~1.2`, `>=0.2.0`, `0.1.x`, `1.0.0-beta.1`. */
const COMPARATOR = /^(?:\^|~|>=?|<=?|=)?\d+(?:\.(?:\d+|x|\*)){0,2}(?:-[\w.]+)?$/
/** A semver range: comparators joined by spaces, and sets of them joined by `||`. */
const isRange = (range: string) =>
  range.split('||').every(
    (set) =>
      set.trim() !== '' &&
      set
        .trim()
        .split(/\s+/)
        .every((part) => COMPARATOR.test(part)),
  )

/** What is wrong with the file's contents, as one line each. Empty when it's fine. */
function problemsIn(data: unknown): string[] {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return ['the file is not an object']
  const keys = Object.keys(data)
  if (keys.length !== 1 || keys[0] !== 'plugins') return [`the file has keys ${keys.join(', ') || 'none'}, not just "plugins"`]
  const plugins = (data as { plugins: unknown }).plugins
  if (!Array.isArray(plugins)) return ['"plugins" is not a list']
  const problems: string[] = []
  const seen = new Set<string>()
  plugins.forEach((entry: unknown, at) => {
    const where = `plugins[${at}]`
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      problems.push(`${where} is not an object`)
      return
    }
    const record = entry as Record<string, unknown>
    for (const key of Object.keys(record)) if (!(FIELDS as readonly string[]).includes(key)) problems.push(`${where} has an unknown field "${key}"`)
    for (const field of FIELDS) {
      if (typeof record[field] !== 'string' || !(record[field] as string).trim()) problems.push(`${where} needs "${field}" as text`)
    }
    const { npm, repo, ifloom, description } = record
    if (typeof npm === 'string') {
      if (!NPM.test(npm)) problems.push(`${where}: "${npm}" isn't an npm package name`)
      if (npm.startsWith('@ifloom/')) problems.push(`${where}: "${npm}" is in the @ifloom scope, which is first-party`)
      if (seen.has(npm)) problems.push(`${where}: "${npm}" is listed twice`)
      seen.add(npm)
    }
    if (typeof repo === 'string' && !/^https:\/\/\S+$/.test(repo)) problems.push(`${where}: the repo "${repo}" isn't an https URL`)
    if (typeof ifloom === 'string' && !isRange(ifloom)) problems.push(`${where}: "${ifloom}" isn't a semver range`)
    if (typeof description === 'string' && description.length > 200) problems.push(`${where}: the description is longer than 200 characters`)
  })
  return problems
}

const sample = {
  name: 'Weather',
  author: 'someone',
  npm: 'ifloom-plugin-weather',
  repo: 'https://github.com/someone/ifloom-plugin-weather',
  description: 'Rain, sun and snow that change by the day, with conditions for each.',
  ifloom: '^0.1.0',
}

describe('the community plugins list', () => {
  it('is a file of the shape the page reads', () => {
    const files = Object.values(FILES)
    expect(files).toHaveLength(1)
    expect(problemsIn(JSON.parse(files[0]))).toEqual([])
  })

  it('is on the community page', () => {
    const page = Object.entries(PAGES).find(([path]) => path.includes('/(latest)/'))?.[1] ?? ''
    expect(page).toMatch(/^::community-plugins\[\.\.\/\.\.\/\.\.\/community-plugins\.json\]$/m)
  })

  // The list starts empty, so the checks are tried on entries made up here.
  it('accepts a full entry and the ranges npm writes', () => {
    expect(problemsIn({ plugins: [sample] })).toEqual([])
    for (const ifloom of ['^0.1.0', '~1.2.3', '>=0.2.0 <0.4.0', '0.1.x', '^0.1.0 || ^0.2.0', '1.0.0-beta.1']) {
      expect(problemsIn({ plugins: [{ ...sample, ifloom }] })).toEqual([])
    }
    expect(problemsIn({ plugins: [{ ...sample, npm: '@someone/weather' }] })).toEqual([])
  })

  it('refuses an entry that the page would draw wrong', () => {
    expect(problemsIn([])).toEqual(['the file is not an object'])
    expect(problemsIn({ plugins: [{ ...sample, author: '' }] })).toEqual(['plugins[0] needs "author" as text'])
    expect(problemsIn({ plugins: [{ ...sample, homepage: 'x' }] })).toEqual(['plugins[0] has an unknown field "homepage"'])
    expect(problemsIn({ plugins: [{ ...sample, repo: 'github.com/x' }] })).toEqual(['plugins[0]: the repo "github.com/x" isn\'t an https URL'])
    expect(problemsIn({ plugins: [{ ...sample, ifloom: 'latest' }] })).toEqual(['plugins[0]: "latest" isn\'t a semver range'])
    expect(problemsIn({ plugins: [{ ...sample, npm: 'Weather Plugin' }] })).toEqual(['plugins[0]: "Weather Plugin" isn\'t an npm package name'])
    expect(problemsIn({ plugins: [{ ...sample, npm: '@ifloom/plugin-weather' }] })).toEqual([
      'plugins[0]: "@ifloom/plugin-weather" is in the @ifloom scope, which is first-party',
    ])
    expect(problemsIn({ plugins: [sample, sample] })).toEqual(['plugins[1]: "ifloom-plugin-weather" is listed twice'])
  })
})
