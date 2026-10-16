import { llms, loader } from 'fumadocs-core/source'
import { defineDocs } from 'fumadocs-mdx/macro'
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema'
import { appName, basePath, description, docsRoute } from './shared.ts'

const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: pageSchema,
    postprocess: { includeProcessedMarkdown: true },
    // From git, so CI checks out the whole history.
    lastModified: true,
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
export const withBase = (text: string) => text.replace(/\]\((\/docs[/#)])/g, `](${basePath}$1`)

export const docsLlms = llms(source, {
  renderPage: async (page) => withBase(`# ${page.data.title} (${basePath}${page.url})\n\n${await page.data.getText('processed')}`),
})

/** llms.txt: every page of the latest docs, with a link and its description. Released versions are left out. */
export function llmsIndex(): string {
  const latest = source.getPageTree().children.find((node) => node.type === 'folder' && node.$ref?.folder === '(latest)')
  if (latest?.type !== 'folder') throw new Error('No content/docs/(latest) folder.')
  const sections = latest.children.map((node) => docsLlms.indexNode(node))
  return withBase([`# ${appName}`, '', `> ${description}`, '', ...sections].join('\n'))
}

/** llms-full.txt: every page of the latest docs in one file. */
export async function llmsFull(): Promise<string> {
  const pages = await Promise.all(latestPages().map((page) => docsLlms.page(page)))
  return pages.join('\n\n')
}
