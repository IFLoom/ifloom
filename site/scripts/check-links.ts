// Fails on a link in the docs that points at no page, or at no heading on a
// page, and on an `::include` whose file or region isn't there. Run by
// `npm run docs:links`, and before every `npm run docs:build`.
import { register } from 'fumadocs-mdx/node'
import { type FileObject, printErrors, scanURLs, validateFiles } from 'next-validate-link'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { codeOf, includesOf } from '../lib/snippets.ts'

register()
const { source } = await import('../lib/source.ts')

type Page = (typeof source)['$inferPage']

const headings = (page: Page) => page.data.toc.map((item) => item.url.slice(1))

const scanned = await scanURLs({
  preset: 'next',
  populate: {
    'docs/[[...slug]]': source.getPages().map((page) => ({ value: { slug: page.slugs }, hashes: headings(page) })),
  },
})

const files = await Promise.all(
  source.getPages().map(async (page): Promise<FileObject> => ({
    path: page.absolutePath ?? page.path,
    // The checker skips links to a heading on the same page, so give them the page's URL.
    content: (await page.data.getText('raw')).replace(/\]\(#/g, `](${page.url}#`),
    url: page.url,
    data: page.data,
  })),
)

printErrors(await validateFiles(files, { scanned, checkRelativePaths: 'as-url' }), true)

// Each included snippet must be there, so a page never shows an empty block.
const missing = files.flatMap((file) =>
  includesOf(file.content).flatMap((include) => {
    const at = fileURLToPath(new URL(include.path, pathToFileURL(file.path)))
    const code = codeOf(include, existsSync(at) ? readFileSync(at, 'utf8') : undefined)
    return code.ok ? [] : [`${file.path}:${include.line}: ${code.reason}`]
  }),
)
if (missing.length) {
  console.error(`Includes that show nothing:\n${missing.join('\n')}`)
  process.exit(1)
}
console.log(`Checked the links and includes on ${files.length} pages.`)
