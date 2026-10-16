import { llms, loader } from 'fumadocs-core/source'
import { defineDocs } from 'fumadocs-mdx/macro'
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema'
import { basePath, docsRoute } from './shared'

const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: pageSchema,
    postprocess: { includeProcessedMarkdown: true },
  },
  meta: { schema: metaSchema },
})

export const source = loader({
  baseUrl: docsRoute,
  source: docs.toFumadocsSource(),
})

export type Page = ReturnType<typeof source.getPages>[number]

/**
 * The version a page belongs to: `latest` for `content/docs/(latest)/`, or the
 * folder name of a released snapshot, such as `0.1.0`.
 */
export function versionOf(page: Page): string {
  const top = page.path.split('/')[0]
  return top === '(latest)' ? 'latest' : top
}

export const latestPages = () => source.getPages().filter((page) => versionOf(page) === 'latest')

/** Links in text we write out need the base path, which Next adds only to its own links. */
export const withBase = (text: string) => text.replace(/\]\(\/docs\//g, `](${basePath}/docs/`).replace(/\]\(\/docs\)/g, `](${basePath}/docs)`)

export const docsLlms = llms(source, {
  renderPage: async (page) => withBase(`# ${page.data.title} (${page.url})\n\n${await page.data.getText('processed')}`),
})
