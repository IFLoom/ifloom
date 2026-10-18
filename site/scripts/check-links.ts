// Fails on a link in the docs that points at no page, or at no heading on a
// page. Run by `npm run docs:links`, and before every `npm run docs:build`.
import { register } from 'fumadocs-mdx/node'
import { type FileObject, printErrors, scanURLs, validateFiles } from 'next-validate-link'

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
console.log(`Checked the links on ${files.length} pages.`)
